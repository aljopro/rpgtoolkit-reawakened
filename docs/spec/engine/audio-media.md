# Audio media: deterministic tracks, time, cues and waits

This page is the normative Reawakened contract for the core audio model. It is
implementation-neutral: `core` describes the game state and the decisions that
a runner must replay, while `synth` and a runner provide decoding and sound
output. The page is a docs-first checkpoint for Epic 6.1; the rulings marked
**Proposed ruling (pending owner review)** are the material in the 6.1 pull
request and must be approved before the implementation entries start.

## What an author sees

An author plays a file on a named track. The built-in tracks are `music`,
`sfx`, `ambience`, `voice` and `ui`; later command work may add an author-named
track. Music normally loops, a sound effect normally plays once, and a track
can be stopped, paused, resumed, sought or faded. A script can wait for a
finite sound to finish. Pausing holds the sound and also holds that wait;
stopping or replacing it ends the wait.

The game, not the speakers, owns the clock. Therefore a wait finishes on the
same simulation tick on every runner, even when a decoder is slow or a headless
runner has no audio device. The runner receives cues and may render silence,
but it does not decide game state. A save carries playback, while the player's
mix and script volume settings are not changed by loading a save.

The technical rules below state exact field names, integer units, ordering and
failure behavior.

## Scope and terms

* A **tick** is one fixed simulation step. Reawakened runs at 60 ticks per
  second ([AD-2], [AD-26]). `time.tick` is the integer at the start of the
  phase list; the `time` phase increments it after `audio`.
* An **asset length** is metadata supplied to core as a positive whole number
  of ticks. Core never reads a file or asks a device for its duration.
* A **pass** is one traversal of a finite asset. A looping voice has a new pass
  at each length boundary; a one-shot voice finishes at its first boundary.
* A **track** is a named, ordered container of voices. Its name is the stable
  identity used in state, cues and waits. The five built-in names are created
  in the order listed above. Author-created track-name validation and voice
  counts are owned by Epic 6.2, but they use this same state shape and cue
  contract.
* A **voice** is one playback slot inside a track. A single-voice track keeps
  the legacy one-slot behavior; multi-voice allocation and stealing are
  specified by Epic 6.2, not by a second core audio model.
* `AssetKey` is the case-folded, package-relative key used by the asset
  resolver. A missing or empty board music request carries no `AssetKey`.

<a id="audio-state"></a>
## P1 — audio state, track lifecycle and settings

<!-- OWNER: 6.1/P1 -->
**Proposed ruling (pending owner review; P1; state schema v2).** In plain
terms, a save remembers what each track was doing, but it never changes the
player's mix. Technically, the runtime `GameState.audio` section is this plain
JSON shape (the arrays are ordered; no map iteration order is observable):

```text
AudioStateV2 = {
  schema: 2,
  cueId: integer,                    // next unused cue id, starts at 1
  tracks: AudioTrackState[],         // built-ins first, then creation order
  settings: {
    masterVolume: integer,           // script volume, 0..100
    trackVolumes: [{ name, volume }] // script volume, 0..100, name order
  }
}

AudioTrackState = {
  name: string,
  state: "stopped" | "playing" | "paused",
  flags: integer,
  file: AssetKey | null,             // last/current file; stop retains it
  positionTicks: integer,             // primary voice position
  lengthTicks: integer | null,
  voices: AudioVoiceState[],          // ascending voice index
  fade: AudioFadeState | null
}

AudioVoiceState = {
  index: integer,
  state: "playing" | "paused",
  file: AssetKey,
  cueId: integer,
  startTick: integer,
  positionTicks: integer,
  lengthTicks: integer | null,
  endTick: integer | null,
  fade: AudioFadeState | null
}

AudioFadeState = {
  fromVolume: integer,
  targetVolume: integer,
  startTick: integer,
  durationTicks: integer
}
```

The `file`, `positionTicks`, `lengthTicks` and `fade` fields on a track are the
primary (voice 0) view. They are retained even when `voices` is empty after a
stop, so `music` can report the last selected file. A track with no primary
voice has `positionTicks: 0`, `lengthTicks: null` and `fade: null`. A track's
state is `playing` when at least one voice is playing, `paused` when its active
voices are paused, and `stopped` when it has no active voice. The state is
canonicalized before it is hashed or saved; voices are sorted by ascending
`index`.

`cueId` is a counter, not a currently playing handle: emitting a cue takes the
current value and increments it. It is never reused, including after a stop,
load or snapshot restore. A runner's device handle is not in this state.

**Evidence.** AD-10 requires one plain-data state tree and AD-16 puts the
monotonic counter in `GameState.audio`; `packages/core/src/save/sections.ts`
currently declares `audio` as the later-epic placeholder. The fixed phase order
is AD-26. The five built-in names and author-track direction are the owner
direction recorded in
`_bmad-output/initiative-rpgtoolkit-reawakened/epic-audio-synth/epic-audio-synth.md`
§ Notes and `discovery/audio-exploration.md` §13.

**Rejected alternative.** Keeping one `audio.music` string and one global SFX
slot (the current placeholder-era shape) cannot represent pause, playback
position, a second track or a saveable voice. Keeping a `Map` of tracks would
break the plain-JSON and explicit-order requirements of G1/G3. Making the
runner's device handle part of the section would make snapshots host-specific.

<!-- OWNER: 6.1/P1-settings -->
**Proposed ruling (pending owner review; P1; settings split).** In plain terms,
there are two volume layers. A script controls the deterministic game volume;
the player controls a private mix on the runner. Technically, `settings` in
`GameState.audio` contains the script master and per-track volumes, clamped to
integer percentages 0..100. It is runtime state for replay and snapshots but
is excluded from the game-save projection and is not written by `reset()` or
`load()`. The player mix (master, per-track gains, mute and output-device
choice) never enters core state or a cue. A runner multiplies it after
applying the script volume. `media.volume` cues therefore carry the script
volume only.

**Evidence.** Owner-relayed Q12 and Q13 in
`docs/provenance/facts-round-8.md` say volume is clamped 0..100, not saved and
not reset. The owner superseded Epic 6 assumption A-3 with “volumes are
settings” in the Epic 6 envelope (2026-10-18). AD-14/G3 require replay-safe
state rather than device timing.

**Rejected alternative.** Putting all volume in the save makes loading one
game unexpectedly change what the player hears in another. Keeping script
volume only in the runner removes script read-back and makes replay depend on a
host preference. Saving the player mix would leak a host concern into core.

<a id="audio-lifecycle"></a>
### Track lifecycle

<!-- OWNER: 6.1/P1-lifecycle -->
**Proposed ruling (pending owner review; P1; lifecycle and loop state).** A
`media.play` transition is evaluated by the audio applier at the effect's
posted tick. `playing` advances from `startTick`; `paused` retains its current
position and freezes both its pass clock and fade clock; `stopped` has no active
voice. A stop retains the track's `file` and flags, so a later play can restart
that file. A replacement on one voice is ordered as stop then play. A board
request with an empty or missing asset stops the current music and clears the
music track's `file`; it is silence, not a runtime error. A same-file request
on a playing single-voice music track carries on unless an explicit restart
flag is present. A same-file request on a playing single-voice `sfx` track is
ignored; a different SFX replaces it. These are core decisions and are not
left to the output device.

A looping voice has no terminal end; its pass boundary is
`startTick + lengthTicks`, then each subsequent multiple of `lengthTicks`. A
one-shot voice is finished at its first end tick and emits the corresponding
stop/finished transition once. A fade changes volume only and never stops a
track implicitly; an explicit stop is required to end a silent stem. Fade
ramp representation and voice-allocation details remain extensible under the
same state fields and cue kinds in Epic 6.2.

**Evidence.** Q3, Q5, Q6, Q7 and Q10 in `facts-round-8.md` establish the
single-slot replacement, same-file, missing-file and stop-retains-name rules.
M1–M4 in `facts-round-9.md` establish looping and the one-shot SFX default.
The fixed-tick and phase rules are AD-2 and AD-26. The effect dispatch rule is
`docs/spec/engine/rpgcode-runtime.md#reawakened-effect-dispatch`.

**Rejected alternative.** Letting the runner choose replacement or loop
behavior would make two devices produce different cue histories. Treating a
fade to zero as an implicit stop prevents layered tracks from being brought
back by a later resume and is not needed by the existing cue set. A separate
`musicAsset` authority in `engine` duplicates this lifecycle and misses a
`mediaStop` followed by a board entry.

<a id="audio-save-load"></a>
### Save, snapshot and reset

<!-- OWNER: 6.1/P1-persistence -->
**Proposed ruling (pending owner review; P1; persistence).** The Reawakened
save projection includes `AudioStateV2.tracks` and `cueId`, including active
voice positions, flags, pause state and fade descriptors. It excludes
`AudioStateV2.settings`, all player-mix fields and all runner handles. A
snapshot is a full core-state snapshot and therefore includes `settings`; it
is not a device snapshot.

Loading merges the saved playback state into the existing settings. Active
music restarts from position zero at the load tick, preserving its loop flag;
this makes the board's music restart deterministically after load. Active
non-music voices resume at the saved `positionTicks` (a new `startTick` is
chosen so that the position is unchanged), while paused and stopped states
remain paused and stopped. A saved one-shot whose position is at or beyond its
length is restored stopped. On restore, core re-emits cues in track order and
voice-index order, allocating fresh monotonic cue ids; the music cue has the
load tick as its due tick, while a resumed non-music cue carries the past due
tick needed for catch-up. No runner state is trusted from a save.

`reset()` leaves the whole audio section untouched, including active music and
settings. Normal board-entry effects may then be applied; the same-file rule
prevents an unnecessary restart.

This is a deliberate Reawakened departure from the legacy save fact that saves
stored no audio. It preserves useful ambience/voice playback while retaining
legacy music restart behavior and the owner-directed volume settings split.

**Evidence.** AD-16 says core records playback and re-emits it after load;
AD-10/G1 require saveable plain state. Q9–Q13 in `facts-round-8.md` cover the
battle restart, stop retention, save/reset and volume behavior. The save page
([formats/save-game.md#layout-minor-4](../formats/save-game.md#layout-minor-4))
allows a Reawakened save format rather than requiring the legacy binary layout.

**Rejected alternative.** Saving no audio and rebuilding only board music
matches Q11 but loses a saved stinger, ambience or voice and contradicts
AD-16. Resuming music at its saved position makes load behavior device- and
board-history-dependent; restarting every non-music track needlessly discards
state that the track model already records.

## P2 — fixed time and end authority

<a id="audio-time-model"></a>
<!-- OWNER: 6.1/P2 -->
**Proposed ruling (pending owner review; P2; core-owned timeline).** In plain
terms, the core decides when a file ends. A runner that starts late catches up
to the same position; a speaker cannot make a script wait longer or shorter.
Technically:

1. Core advances only on the fixed 60 Hz tick. A finite decoder reports a
   positive duration in seconds or an integer length; conversion of a positive
   seconds value uses the existing `core/time` rule
   `max(1, floor(seconds * 60 + 0.5))`. A non-finite, negative or unavailable
   duration is `lengthTicks: null` and is not waitable. A zero-byte/zero-length
   playable asset is invalid rather than an indefinitely waitable track.
2. A voice that begins at tick `S` with length `L` has
   `endTick = S + L`. While playing, its position is
   `min(max(0, tick - S), L)` for one-shot media and
   `(max(0, tick - S) mod L)` for looping media. Paused voices keep the last
   position; resume sets a new `startTick` so the position is continuous.
3. At the waits phase of `endTick`, a finite one-shot is logically finished
   and its `audio.track` wait can wake. The later `audio` phase emits any
   required stop cue and records the finished transition. This phase ordering
   is intentional: a stop posted in the threads phase at tick `T` changes the
   track immediately, and its waiter is observed in the next waits phase at
   `T + 1`, because waits precedes threads in AD-26.
4. A looping track has a pass boundary at every `S + nL`. A pass wait uses
   the next boundary; ordinary looping playback does not finish.
5. A cue's required `tick` is the tick at which core applied the transition.
   If the runner receives it at a later simulation tick `R`, it starts at
   `max(0, R - tick)` ticks into the asset. A looping asset wraps this offset;
   a one-shot whose offset is at least `lengthTicks` is not started. Late
   playback therefore cannot alter core state.
6. `mediaPosition` and `mediaLength` (owned by Epic 6.2) expose integer ticks
   to core queries; any seconds presentation is a pure conversion from these
   ticks and never a device-reported float.

`audio.ended { cueId }` remains a valid AD-14 input for diagnostics and runner
voice cleanup, but it is advisory. Core ignores an early, late or unknown
reply when deciding end ticks, waits, positions or cue order. An unknown
`cueId` is ignored. A headless/null runner does not need to emit it.

**Evidence.** AD-2/G3 and `packages/core/src/time/time.ts` define the 60 Hz
clock and half-up seconds conversion. The previous AD-14/AD-9 wording let a
headless runner emit `audio.ended` after parsed duration; the conflict is
recorded as F-06 in `discovery/audio-readiness.md`. AD-14's replay log and
AD-26's phase order make the core timeline necessary for deterministic waits.

**Rejected alternative.** Letting the physical audio device or an
`audio.ended` reply wake a script makes latency and browser scheduling part of
save/replay behavior. Emitting volume/position cues every tick would flood the
cue stream without changing the authoritative state; one transition cue plus
an integer due tick is sufficient.

<a id="audio-headless"></a>
### Null and headless behavior

<!-- OWNER: 6.1/P2-headless -->
**Proposed ruling (pending owner review; P2; null backend).** Core emits the
same cue stream whether a runner has a synthesizer or not. A null/headless
backend consumes cues, produces no PCM and never feeds an authoritative end
reply. It may record cue fields and diagnostics for golden tests. An absent or
unsupported source yields silence plus a diagnostic; it does not change the
core timeline except for the explicitly ruled missing-board-music stop. An
unknown length is allowed to remain audible to a capable runner but a wait on
it is a located diagnostic and returns without parking a thread.

**Evidence.** G2 forbids host/audio I/O in core; G4/G5 require replayable
headless behavior. The Epic 6 envelope assigns null audio and cue goldens to
later entries 6.6 and 6.16, and `discovery/audio-exploration.md` §6 says
unknown sources are diagnostic plus silence, never a state change.

**Rejected alternative.** Suppressing cues when audio is unavailable would
make headless and browser state hashes differ. Making a null backend invent
`audio.ended` would restore the very device-timing dependency this ruling
removes.

## P4 — cues, order and the core/synth seam

<a id="audio-cue-contract"></a>
<!-- OWNER: 6.1/P4 -->
**Proposed ruling (pending owner review; P4; generic per-track cues).** In
plain terms, cues say what a named track should do; they do not contain a
runner handle or a callback. Technically, the core port becomes this generic
set (the later 6.3 ruling may add a platform kind such as `soundfont.set` in
a docs-only amendment):

```text
AudioCueKind =
  "media.load" | "media.play" | "media.stop" | "media.pause" |
  "media.resume" | "media.seek" | "media.volume" | "media.fade" |
  "media.flags"

AudioCue = {
  cueId: integer,
  tick: integer,
  kind: AudioCueKind,
  track: string | null,
  voice: integer | null,
  asset: AssetKey | null,
  loop: boolean | null,
  flags: integer | null,
  positionTicks: integer | null,
  volume: integer | null,
  targetVolume: integer | null,
  durationTicks: integer | null
}
```

Every key is present. `null` means that a kind does not use that field; an
omitted key or `undefined` is not a valid cue. `media.play` carries `track`,
`voice`, `asset`, loop/flags, starting position and the script volume;
`media.stop`, `pause`, `resume`, `seek`, `volume` and `flags` carry the
corresponding track/voice and field. `media.fade` is one transition cue with
`volume` as the start, `targetVolume`, `tick` as `startTick` and
`durationTicks`; runners interpolate it while core keeps the descriptor. No
per-tick volume cue is emitted.

Cue IDs are allocated at the moment the audio applier accepts the transition.
Within a tick, effects are applied in post order. A board-entry replacement
emits `media.stop` before `media.play`; a restore emits tracks in canonical
track order and voices in ascending index. The `tick` is the due tick for
late-start catch-up, not a wall-clock timestamp.

**Evidence.** Owner direction D-5 and `discovery/audio-exploration.md` §13
choose generic per-track kinds; P4 in that discovery explicitly recommends a
single fade cue. AD-14 requires fixed port keys and AD-16 currently defines the
old closed vocabulary. The existing port is
`packages/core/src/ports/audio.ts`; its exhaustive fixture is
`packages/core/test/fixtures/ports/good.ts`.

**Rejected alternative.** Retaining `music.*` and `sfx.*` plus a new track
field duplicates every future verb and makes the names lie for author-created
tracks. Sending a volume cue every tick is larger and less robust than a pure
fade descriptor. Letting a runner assign cue IDs or retain a game decision
would break load/replay.

<a id="board-effect-mapping"></a>
### Effect records and cue order

<!-- OWNER: 6.1/P4-effects -->
**Proposed ruling (pending owner review; P4; Epic 4 handoff).** Epic 4 keeps
its effect vocabulary. `music.play` and `sfx.play` are effect records, not
`AudioCueKind` values. The audio applier maps them to `music` and `sfx` and
then emits generic cues. The applier, not `engine.musicAsset`, decides
same-file carry-on, replacement, missing-file silence and restart.

The affected producers and validators are fixed for the later implementation:

| Producer/consumer | Required 6.x change | Ordering or validation |
|---|---|---|
| `packages/core/src/engine/engine.ts::postBoardMusic` | post one `music.play` effect for every board arrival, carrying the resolved `AssetKey` or `null` for an empty/missing request; remove the `state.engine.musicAsset` same-file early return | the applier owns Q5–Q7 and Q10; a null board request stops and clears music |
| `packages/core/src/engine/engine.ts::runAnimationPhase` | keep posting one-shot `sfx.play` records for visible `.anm` frame sounds | animation phase order, then frame index, then effect post order |
| Epic 7 battle producer | post a `music.play` effect with source `battle`; no second cue vocabulary | battle hand-off is a later consumer of this track rule |
| script/audio applier | post effects through `postEffect("audio", effect)` | synchronous applier order; VM audit remains bounded |
| `packages/core/src/engine/effects.ts` | retain the bounded per-section pending queue | FIFO drain when `audio` registers; dropped records are diagnosed |
| `packages/core/src/ports/audio.ts` | replace `AudioCueKind` and `AudioCue` with this page's generic shape | exhaustive runner switch; all fields required/null |
| `packages/core/src/validate/input-event.ts` | keep `audio.ended { cueId }` validation | advisory only; no wait wake or position mutation |
| `packages/core/src/script/virtuals.ts::createDefaultVirtuals` | read `music` from the `music` track's `file` | battle track is visible; `mediaStop` retains the name |
| `packages/core/src/save/sections.ts` and save fixtures | replace `Record<string, never>` with `AudioStateV2`; migrate schema v1 placeholder | settings omitted from save; playback re-emits |
| `packages/core/test/fixtures/ports/good.ts` | update the exhaustive cue fixture | no old `music.*`/`sfx.*` cue kinds remain |

A board producer may resolve the requested Media-folder name before posting,
but it must post a null asset for empty/missing music so the applier owns the
stop/silence decision. The old producer diagnostic for “missing music” is not
an audio-state decision; Q6 requires silence without an error. Animation frame
resolution remains the animation producer's asset request and emits no cue
until the asset is available.

Effects posted before the applier is registered remain in the bounded queue
and drain in FIFO order. A cue receives its ID only when drained/applied, so
cue IDs follow effect order rather than registration timing.

**Evidence.** E-16 and the Reawakened effect rule in
`docs/spec/engine/display-input-audio.md`; the Epic 4 handoff in
`_bmad-output/.../epic-board-rendering/tickets.toml` entries 4.20 and 4.23;
F-01/F-02 in `discovery/audio-readiness.md`; AD-10/AD-16 and
`docs/spec/engine/rpgcode-runtime.md#reawakened-effect-dispatch`.

**Rejected alternative.** Renaming the Epic 4 effects would force a migration
of two producers without fixing the actual ownership bug. Keeping the board
producer's `musicAsset` comparison would suppress the restart after
`mediaStop`; dropping empty/missing records would prevent the applier from
implementing the documented silence rule. Draining pending effects in a map or
runner order would lose the documented FIFO ordering.

<a id="audio-synth-seam"></a>
### Core to synth boundary

<!-- OWNER: 6.1/P4-seam -->
**Proposed ruling (pending owner review; P4; package boundary).** Core owns
`AudioStateV2`, asset keys and lengths, lifecycle transitions, integer time,
wait polling, cue IDs and cue order. Core never decodes bytes, opens an audio
device or calls a timer. The runner supplies asset bytes and deterministic
`AudioInfo` metadata through the existing asset/decoder seams; `synth` turns
cues into PCM or device commands behind a small `AudioSource`/`MidiSynth`
interface. `synth` owns no `GameState`, cue counter, wait resolver or gameplay
rule. A null implementation consumes the same cue contract.

The runner may report `audio.ended { cueId }` for cleanup or diagnostics, but
must not report a position or choose a wake tick. A late runner uses the cue's
`tick` and length metadata to seek forward. This keeps the boundary usable by
non-TypeScript runners and leaves the core independent of Web Audio, MIDI,
SoundFont and decoder implementations; entries 6.3 and 6.11 define those
platform details.

**Evidence.** G2/G3; AD-14, AD-16 and AD-30/AD-31; the empty `packages/synth`
scaffold and the `AssetDecoder<T>` registry identified by F-05/F-07 in
`discovery/audio-readiness.md`.

**Rejected alternative.** Putting a MIDI/WAV decoder or Web Audio object in
core breaks G2 and makes duration/replay depend on a host. Making synth own
track state would duplicate save/load and make `audio.track` waits impossible
to replay without the device.

## P5 — audio waits

<a id="audio-track-wait"></a>
<!-- OWNER: 6.1/P5 -->
**Proposed ruling (pending owner review; P5; `audio.track` wait).** In plain
terms, a script can wait for a track or voice to finish, but a paused sound
holds that wait. Technically the unresolved `audio.sfx` kind is replaced by
this plain-data payload:

```text
Wait = {
  kind: "audio.track",
  global: false,
  id: "mediaWait",
  payload: [{ track: string, voice: integer | null,
              cueId: integer, endTick: integer | null,
              pass: boolean }],
  resumeRefs: []
}
```

The implementation may use the repository's positional `NamedWait.payload`
array, but the decoded object above is the normative shape and contains no
closure, timer, device handle or `Promise`. `cueId` identifies the voice that
was playing when the wait was created; a replacement cannot accidentally wake
an old wait for a new voice. `pass: true` means the next finite pass boundary
rather than terminal completion.

The resolver runs in the AD-26 `waits` phase, once per waiting thread in
ascending thread id. Its deterministic table is:

| Track/voice condition at the current tick | Result |
|---|---|
| playing finite one-shot and `tick < endTick` | remain parked |
| playing finite one-shot and `tick >= endTick` | wake with the normal wait result |
| playing loop and `pass` true at next pass boundary | wake |
| playing loop and `pass` false | a direct `mediaWait` is diagnosed; it cannot wait forever |
| paused, with the same `cueId` | remain parked; resume continues the same wait |
| stopped or replaced, with the same `cueId` | wake at the first waits phase after the stop/replacement effect |
| unknown track, voice or `cueId` | located diagnostic; do not park |
| `lengthTicks: null` | located diagnostic; do not park |

`mediaPlay` with a combined loop-and-wait flag is a diagnostic at the call;
`mediaWait` on an already looping track may request its current pass only.
Those command signatures and diagnostics are owned by Epic 6.2, but no command
may recreate `audio.sfx`.

**Evidence.** AD-9 requires one named wait registry, plain-data payloads and
ascending-thread polling. `packages/core/src/ports/wait.ts` currently lists
`audio.sfx`; `script/waits.ts` and the generic catalogue responder are the
live seams identified by F-04. Owner direction D-3 says pause suspends and the
wait ends on finish or stop. The fixed end formula and phase ordering are
[audio-time-model](#audio-time-model) and AD-26.

**Rejected alternative.** Waking on pause makes a script continue while the
sound is held. Polling a runner `audio.ended` set makes wait timing
non-replayable. Reusing `audio.sfx` hides track/voice identity and leaves
legacy catalogue calls parked on an unregistered resolver.

## Legacy parity ledger for the core model

The following facts are recorded once here because they change the state,
cue or wait contract. Command aliases, voice stealing, fade curves and full
format policy are owned by Epic 6.2/6.3; they must preserve these rows.

| Evidence | 3.1 fact | Reawakened disposition |
|---|---|---|
| Q3 | one SFX slot; a different file replaces it and the same playing name is ignored | keep for the built-in `sfx` one-voice track |
| Q5 | same music name carries on while playing and restarts if stopped | keep; applier owns the comparison |
| Q8 | battle with no music is silent; board music stops for a fight | keep as the battle effect hand-off; no fallback track |
| Q9 | pre-fight music restarts from the beginning after battle | keep; battle producer uses the same `music` track and later entry 6.2 owns the hand-off effect |
| Q10 | `mediaStop` retains the name and later board/battle/video events restart it | keep; stopped track retains `file` |
| Q11 | legacy saves store no audio; load plays board music; reset does not stop music | deliberately depart for saved playback/re-emission; keep reset behavior and restart music from zero on load |
| Q12/Q13 | volume clamps 0..100, is not saved and reset does not change it | keep; split script setting from runner player mix |
| Q19 | `music` shows the battle track and is not empty after `mediaStop` | keep; read `tracks[name="music"].file` |
| M1/M3 | music, board and battle music loop | keep as the music default |
| M4 | SFX never loop | keep as the SFX default |

<!-- OWNER: 6.1/P8-core-ledger -->
**Proposed ruling (pending owner review; parity/version rule).** Where the
3.1.0 release and final legacy version differ, the normative baseline is
3.1.0 unless the later behavior is a clear deliberate fix. A later regression
is not silently adopted. This is the version rule in
`discovery/audio-exploration.md` §13 and is why the Q11 save departure is
explicit rather than accidental.

**Evidence.** ADR 0007 makes `docs/spec/` the Toolkit 3.1 normative source;
rounds 8 and 9 are owner-relayed facts with no independent confidence claim.

**Rejected alternative.** Choosing whichever final-version behavior happens
to be easiest would turn an extraction/version difference into an undocumented
compatibility change.

## Affected seams and later ownership

This checkpoint changes contracts, not code. Later entries must update the
following without introducing a second model:

* `packages/core/src/save/sections.ts` and save-state migrations own the v2
  section and settings-excluding save projection.
* `packages/core/src/ports/audio.ts`, its port fixture and the runner
  exhaustive switch own the generic cue type.
* `packages/core/src/ports/wait.ts`, `script/waits.ts` and catalogue responders
  own `audio.track`; `audio.sfx` is removed.
* `packages/core/src/engine/engine.ts` and `engine/effects.ts` own effect
  production/queue wiring; `core/audio` owns the applier.
* `packages/core/src/script/virtuals.ts` reads `music` from the music track.
* The independent audio timeline oracle and null-audio goldens cite the
  anchors on this page; they do not import core to generate expected facts.
* Epic 6.2 may add command/voice/fade details and Epic 6.3 may extend the cue
  union for SoundFont and runner policy, but neither may change the core clock,
  save/settings split, cue ordering or `audio.track` wake contract without a
  new ruling.

## References

* [AD-2, AD-9, AD-10, AD-14, AD-16 and AD-26](../../../_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md)
* [Display, input and audio — E-16, E-100–E-104](display-input-audio.md)
* [RPGCode runtime effect dispatch](rpgcode-runtime.md#reawakened-effect-dispatch)
* [Save-game format and Reawakened save rule](../formats/save-game.md#layout-minor-4)
* `docs/provenance/facts-round-8.md` Q3, Q5–Q16, Q19
* `docs/provenance/facts-round-9.md` M1–M4
* `_bmad-output/initiative-rpgtoolkit-reawakened/epic-audio-synth/discovery/audio-readiness.md` F-01–F-08, F-10
* `_bmad-output/initiative-rpgtoolkit-reawakened/epic-audio-synth/discovery/audio-exploration.md` §13, P1, P2, P4 and P5
