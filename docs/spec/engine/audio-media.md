# Audio media: deterministic tracks, time, cues and waits

This page is the normative Reawakened contract for the core audio model. It is
implementation-neutral: `core` describes the game state and the decisions that
a runner must replay, while `synth` and a runner provide decoding and sound
output. The page is the docs-first checkpoint for Epic 6.1 and 6.2; every
rule marked **Proposed ruling (pending owner review)** must be approved before
the implementation entries start.

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
  priority: integer,                  // stealing priority, default 0
  volume: integer,                    // voice script volume, 0..100
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
<a id="media-command-family"></a>
## P3/P6/P7 — standard media commands, voices and layers

<!-- OWNER: 6.2/P3 -->
**Proposed ruling (pending owner review; P3; standard command family).** In
plain terms, these commands give an author named players for music, effects,
dialogue and ambience. A command either changes one of those players or waits
for one to finish; it never asks the speaker what happened. Precisely, every
command below is a synchronous RPGCode built-in. A `void` command returns
`null`; a query returns the value shown; an optional `&ret` or `&voice` writes
that same value to the caller's variable. A diagnostic is located at the
argument, makes no state or cue change, and returns the command's documented
failure value.

Track names are non-empty ASCII strings of 1–32 characters matching
`[A-Za-z0-9_.-]+`. Core canonicalizes only ASCII letters to lower case; it
does not use locale-sensitive case folding. The five built-in tracks are
created in this order: `music`, `sfx`, `ambience`, `voice`, `ui`. Unknown
tracks are an error; `mediaPlay` never silently creates a misspelled track.
There are at most 16 named tracks, including the five built-ins. `mediaTrack`
is the only creation/configuration command.

| Command and signature | Return and deterministic behavior |
|---|---|
| `void mediaTrack(string name[, int voices = 1])` | Creates `name` with the requested voice count, or changes an existing track's configured count. `voices` is a positive integer. Reducing below a live voice index is a diagnostic and leaves the track unchanged. |
| `void mediaLoad(string track, string file)` | Resolves `file` and loads its metadata onto the named track without starting it. The track becomes `stopped`, retains the file, and emits `media.load`; an unknown file is a located diagnostic and does not clear a prior file. |
| `void mediaPlay(string file[, string track = "music"[, int flags = default[, int priority = 0[, string syncTrack = ""[, int &voice]]]]])` | Starts or reuses one voice. `&voice` receives the selected zero-based voice index. `default` is `tkMD_LOOP` on `music` and `tkMD_ONCE` on every other track. `tkMD_WAIT` parks this thread until that voice finishes; loop plus wait is a diagnostic. |
| `void mediaStop([string track = "music"[, int voice = 0]])` | Stops and rewinds the selected voice, retaining its file and flags. A stop ends a wait for that voice at the next waits phase. |
| `void mediaPause([string track = "music"[, int voice = 0]])` | Pauses the selected playing voice at its integer position. Its wait and fade clock are suspended. Pausing an already paused or stopped voice is a no-op. |
| `void mediaResume([string track = "music"[, int voice = 0]])` | Resumes a paused voice from its saved position. Resuming a playing or stopped voice is a no-op. |
| `void mediaSeek(string track, number seconds[, int voice = 0])` | Converts a finite non-negative `seconds` value to ticks with `max(0, floor(seconds * 60 + 0.5))`. A known one-shot clamps to its length; a known loop wraps modulo its length. Unknown length is a diagnostic. |
| `void mediaLoop(string track, bool on[, int voice = 0])` | Changes the loop flag in place without restarting. `on=false` lets the current pass finish; `on=true` creates pass boundaries after the current position. |
| `void mediaFade(string track, int percent, number seconds[, int voice = 0])` | Clamps no values silently: `percent` must be 0..100 and `seconds` finite and non-negative. It linearly ramps the selected voice's script volume over the converted duration. A zero-duration fade is an immediate set. With no voice argument, it ramps the track volume setting. |
| `void mediaWait([string track = "sfx"[, int voice = 0]])` | Parks until the selected finite one-shot finishes, or until its current loop pass ends when it is looping. An unknown, stopped, replaced, or unknown-length voice does not park; it returns a located diagnostic or the normal stopped result as specified below. |
| `void mediaVolume(string track, int percent[, int voice])` | Sets the track's integer script volume (0..100), or a selected voice's volume when `voice` is present, without restarting. |

The one-argument `mediaVolume` query is an overload:
`int mediaVolume(string track[, int voice[, int &ret]])` returns the track
volume when `voice` is omitted, or the selected voice volume when it is
present, and optionally writes it to `ret`. The setter and query are
distinguished by the presence of the `percent` argument. Effective script
gain is the deterministic integer product of track and voice volumes,
rounded half-up to a percentage; both settings start at 100.


The matching query built-ins are:

| Query | Return |
|---|---|
| `int mediaState(string track[, int voice = 0[, int &ret]])` | `tkMD_STOPPED`, `tkMD_PLAYING` or `tkMD_PAUSED`. A track query with no explicit voice is the aggregate: playing if any voice plays, paused if active voices are all paused, otherwise stopped. |
| `int mediaFlags(string track[, int voice = 0[, int &ret]])` | The selected voice's current flag bitmask; stopped tracks retain their last flags. |
| `bool mediaPlaying(string track[, int voice = 0[, bool &ret]])` | True exactly when the selected voice is playing. |
| `string mediaFile(string track[, int voice = 0[, string &ret]])` | The selected or last file, or `""` when no file has been loaded. |
| `number mediaPosition(string track[, int voice = 0[, number &ret]])` | Current position in seconds, computed from integer ticks as `positionTicks / 60`; no device float is read. |
| `number mediaLength(string trackOrFile[, number &ret])` | Length in seconds from asset metadata. An unknown length returns `0` and emits a diagnostic only when used by a wait or seek. |
| `string[] mediaTracks([string[] &ret])` | Track names in built-in order followed by creation order, canonicalized as stored. |
| `int getVolume([int &ret])` | Script master volume, 0..100; it is the query counterpart of `setvolume`. |

An invalid query returns the type's zero value (`0`, `false` or `""`) and
diagnoses the call. Query results are from core state and asset metadata, so
a runner cannot make two runs disagree. `mediaPlay` returns no handle by
value: `&voice` is the stable integer slot index, while `cueId` distinguishes
a current occupant from a stale handle after replacement.

The `tkMD_` constants are compile-time integer constants. Flags are
bitwise-orable; state values are mutually exclusive and are not flags:

| Constant | Value | Meaning |
|---|---:|---|
| `tkMD_ONCE` | 0 | Finish at the first asset boundary. |
| `tkMD_LOOP` | 1 | Continue at every asset boundary. |
| `tkMD_WAIT` | 2 | Park the calling thread until this voice's wait condition is met. |
| `tkMD_RESTART` | 4 | Restart a same-file voice from tick zero instead of applying the same-file carry-on rule. |
| `tkMD_STOPPED` | 0 | Query state: no active voice. |
| `tkMD_PLAYING` | 1 | Query state: at least one selected voice is playing. |
| `tkMD_PAUSED` | 2 | Query state: the selected active voice is paused. |

**Errors and no-op rules.** The stable diagnostics are
`media.invalid-track-name`, `media.track-limit`, `media.voice-count`,
`media.voice-cap`, `media.unknown-track`, `media.unknown-voice`,
`media.asset-missing`, `media.asset-length`, `media.invalid-time`,
`media.invalid-volume`, `media.wait-loop`, and `media.sync-source`.
They are located at the offending argument. Invalid names, counts, flags,
times, volumes, missing assets and unknown handles make no mutation and emit
no cue. A requested track configuration cannot make the sum of configured
voice slots exceed 32. The initial master and every track volume are 100.

**Author help text (simple first).** `mediaTrack` gives a name to a player
and reserves its overlap slots; it returns nothing and fails rather than
silently making a typo. `mediaLoad` prepares a file without starting it.
`mediaPlay` starts music or a sound and can tell the script which voice slot
it received. `mediaStop`, `mediaPause` and `mediaResume` control that slot.
`mediaSeek` jumps to a time in seconds, `mediaLoop` changes whether the next
boundary repeats, and `mediaWait` lets a script wait for completion.
`mediaFade` changes loudness smoothly and `mediaVolume` changes it directly.
The query commands report the same track data the engine will replay.

For exact behavior, all times are converted to 60-Hz ticks with half-up
rounding; state changes are applied in the current thread's order and
observed by the waits phase before later threads. `mediaPlay` waits only with
`tkMD_WAIT`; `mediaWait` waits only for a finite voice or its next loop pass.
For example:

```rpgcode
mediaTrack("effects", 8)
mediaPlay("click.wav", "effects", tkMD_ONCE, 1, "", &voice)
mediaFade("music", 30, 0.5)
mediaWait("effects", voice)
```

The example creates eight slots, allocates the lowest free `effects` slot,
ramps `music` to 30% over 30 ticks, then parks until the click's finite
one-shot ends. It does not wait on the fade. A script can layer a stinger
without a special command:

```rpgcode
mediaPlay("stinger.mid", "ui", tkMD_ONCE)
mediaFade("music", 25, 0.25)
```

The two commands apply in source order in the same tick. A later track
controller may use that same fade rule for ducking; this ticket adds no
automatic duck.

**Evidence.** P3 in
`_bmad-output/initiative-rpgtoolkit-reawakened/epic-audio-synth/discovery/audio-exploration.md`
requires exact signatures, a creation command, name validation and
documentation-only deprecation; F-08 and F-14 record the current catalogue
wait and obsolete hazards. AD-1 requires structured-cloneable results,
AD-8/AD-9 require by-reference outputs and named waits, and the existing
`rpgcode-language.md` constants establish the `tk*` naming convention.

**Rejected alternative.** Letting a typo create a track, making every legacy
name runtime-obsolete, returning device handles, or allowing command
failures to partially mutate state would make old games noisy or make a
save/replay depend on the host. The `deprecated` command-docs tag with
`replacedBy` is documentation-only; the catalogue `obsolete` field and the
word `obsolete` in a spec-table row remain reserved for commands that really
raise `builtin.obsolete`.

<!-- OWNER: 6.2/P6 -->
**Proposed ruling (pending owner review; P6; voices and allocation).** A
voice handle is the pair `(track, index)` exposed to RPGCode as the integer
`index` in `&voice`; core additionally checks the current `cueId`, so a
handle from an earlier occupant cannot control a replacement. The configured
voice counts are:

| Track | Default voices | Legacy significance |
|---|---:|---|
| `music` | 1 | Background music single slot. |
| `sfx` | 1 | Legacy sound-effect single slot. |
| `ambience` | 4 | Overlapping environmental loops. |
| `voice` | 2 | Dialogue overlap. |
| `ui` | 4 | Menu and cursor sounds. |

`mediaTrack` may change these counts, and may create up to 16 named tracks,
but the sum of configured slots is at most 32. A new multi-voice track starts
with all voices stopped. With no explicit voice, `mediaPlay` takes the lowest
free index. When none is free, it steals exactly one active voice by lowest
`priority`, then oldest `startTick`, then lowest index. Paused voices remain
active for allocation. An explicit voice always addresses that slot and
replaces its occupant; it never invokes the stealing tie-breaker.

On a single-voice track, a same-file `mediaPlay` while playing carries on
without a cue, except with `tkMD_RESTART`, which stops then starts at zero.
This keeps `music`'s legacy carry-on behavior and `sfx`'s legacy same-file
ignore behavior: both are one-voice tracks, and `sfx` calls without
`tkMD_RESTART` are ignored when the same file is already playing. On a
multi-voice track, each play takes a free slot; the same file may overlap.
Every replacement or steal emits `media.stop` before `media.play` and wakes
the displaced voice's wait in the next waits phase.

The state extension is plain data: each `AudioVoiceState` carries
`priority: integer` (default 0), and a voice's `cueId` remains its identity.
Allocation, stop-before-play ordering, and the ascending-index query order
are part of core state, never runner policy.

**Evidence.** P6 records the recommended `&voice` handle, single-voice
same-file exception, proposed built-in counts, owner decision for the 32
voice cap, and deterministic stealing candidates. Q3/Q5 in round 8 and
M2/M4 in round 9 establish the legacy single-slot and same-file defaults.
AD-10/G1 require plain saveable state; AD-16 requires voice-indexed cues.

**Rejected alternative.** A runner-owned voice pool, oldest-only stealing,
or silently increasing a track on an unknown name would produce different
cue histories across devices and hide author errors. Treating paused voices
as free would cut off a sound merely because its script is temporarily held.

<a id="audio-layer-rulings"></a>
<!-- OWNER: 6.2/P7 -->
**Proposed ruling (pending owner review; P7; fades, sync and ducking
reservation).** A fade is linear in fixed ticks. If its start volume is
`A`, target is `B`, duration is `D > 0`, and `d` ticks have elapsed, the
volume is the nearest integer to
`A + (B - A) * d / D`, with half values rounded upward; `d` is clamped to
`0..D`. Starting a new fade first evaluates the old fade at the current
tick, then replaces it from that integer. A paused voice freezes both
position and fade elapsed time. At `D`, the target is exact. Fading to zero
leaves a playing voice alive and silent; only `mediaStop` ends it.

`mediaPlay`'s `syncTrack` argument names an existing track whose primary
voice is active. At the play tick, the new voice's starting position is the
source's current integer position modulo the destination asset length, and
its `startTick` is chosen to preserve that position. A paused source supplies
its held position but the new voice starts playing. Unknown tracks, inactive
sources or unknown lengths diagnose without starting the new voice. Unequal
lengths are therefore deterministic, but stems stay musically aligned only
when their lengths and loop points agree. For example, a source at tick 137
with position 17 and a 10-tick destination starts at position 7; it does not
round or query the device.

The late-sound threshold is 15 ticks (250 ms at 60 Hz). A runner MAY suppress
rendering of a late, finite, non-looping non-music voice when
`receiveTick - cue.tick >= 15`; it MUST still consume the cue and core keeps
the voice timeline. Music and looping voices catch up by modulo position
instead of being dropped. This is a presentation optimization, not a second
end or wait rule.

Ducking is reserved, not implemented by this ticket. Authors can reproduce a
duck manually with `mediaFade("music", 30, 0.1)` while a stinger plays on
another track. A future `mediaDuck` controller MUST compose the same
per-track fade descriptors and cue ordering; it MUST NOT add runner-owned
mix state or change the `media.fade` meaning. No automatic ducking,
duck-group field or hidden side effect exists in this contract.

**Evidence.** P7 recommends integer linear fades, frozen pause clocks,
modulo sync for unequal lengths, and a fade-based ducking reservation.
P2 fixes integer tick positions and late-start catch-up; AD-2/AD-26/G3 fix
the 60 Hz order; AD-14/AD-16 keep fades as data cues.

**Rejected alternative.** Per-tick fade cues flood the deterministic cue
stream; a fade-to-zero implicit stop prevents stem re-entry; rejecting
unequal sync lengths makes valid authored layers needlessly fragile; and
letting the runner drop late audio or own ducking changes only some
replays. A runner MAY suppress the specified late SFX presentation, but it
cannot alter core state.
<a id="legacy-audio-command-mapping"></a>
### Legacy command mapping and documentation marker

<!-- OWNER: 6.2/P3-legacy -->
**Proposed ruling (pending owner review; P3; quiet legacy aliases).** Old
audio names remain callable so existing games do not change behavior. The
command-docs record for each mapped old name is
`{ deprecated: true, replacedBy: "<standard name>" }`; it is not the
catalogue `obsolete` field. The latter would raise `builtin.obsolete` and
skip the statement. The catalogue and Audio-table rows are deliberately
owned by entries 6.8 and 6.9; this table is the normative mapping those
entries must encode:

| Legacy name | Standard call and disposition |
|---|---|
| `midiplay(file)`, `playmidi(file)`, `mediaplay(file)` | `mediaPlay(file, "music", tkMD_LOOP)`; `mediaplay` is extended, not deprecated. |
| `mediastop()`, `mediarest()`, `midirest()` | `mediaStop("music")`; `mediastop` is extended, not deprecated. |
| `wav(file)`, `mp3(file)` | `mediaPlay(file, "sfx", tkMD_ONCE)`; mark each `deprecated`. |
| `wavstop()` | `mediaStop("sfx")`; mark `deprecated`. |
| `mp3pause(file)` | `mediaPlay(file, "sfx", tkMD_ONCE | tkMD_WAIT)`; mark `deprecated`. The file argument is required. |
| `setvolume(percent)` | `mediaVolume("music", percent)` is not an equivalent because it would change only one track; retain `setvolume` as the master-volume setter and pair it with `getVolume`. |

The aliases retain their legacy defaults (case-insensitive Media-folder
lookup, music looping, one-shot SFX). `mp3pause` follows 3.1.0 and waits;
the final-version non-waiting behavior is treated as a regression under the
P8 version rule. The three legacy plugin stubs
`fademidiin`, `fademidiout` and `setmidivolume` have no owner-relayed
meaning in rounds 8/9. They remain callable but are marked
`deprecated: true` without a `replacedBy` value until that separate fact is
extracted; a guessed fade mapping is forbidden.

**Evidence.** F-08/F-14 identify the catalogue mismatch and the
documentation-only `deprecated` mechanism. Q1/Q2 establish `mp3pause`'s
argument and wait and the `wav`/`mp3` defaults; Q12 establishes the master
volume range. The archive census in the exploration shows the mapped names
are used by real programs.

**Rejected alternative.** Marking a callable alias with `obsolete: true`,
emitting runtime warnings for all 536 `wav` call sites, or inventing
semantics for the three unverified plugin stubs would either break old games
or turn an absence of evidence into a false compatibility claim.



## Legacy parity ledger for the core model

The following facts are recorded once here because they change the state,
cue or wait contract. Command aliases, voice stealing, fade curves and full
format policy are owned by Epic 6.2/6.3; they must preserve these rows.

| Evidence | Owner-relayed 3.1 fact | Reawakened deterministic disposition |
|---|---|---|
| Q1 | `mp3pause` takes a file; 3.1.0 waits while music keeps playing; final does not wait; no command pauses music | Follow 3.1.0: `mp3pause(file)` maps to SFX `tkMD_ONCE \| tkMD_WAIT`; `mediaPause` is a new track command, not a legacy music pause. |
| Q2 | `wav` never waits; `mp3` aliases it | Keep: both map to non-waiting SFX `mediaPlay`. |
| Q3 | One SFX slot replaces a different file and ignores the same playing name | Keep on the one-voice `sfx` track. |
| Q4 | `wavStop` stops the script/default-menu/default-battle SFX slot, not music or animation-frame sounds | Keep its `sfx` mapping; frame sounds retain their separate producer/player path. |
| Q5 | Same music name is case-insensitive; it carries on while playing and restarts when stopped | Keep in the `music` applier; explicit `tkMD_RESTART` is the new override. |
| Q6 | Missing music stops old music first, then gives silent no-error result | Keep: a null/missing board request stops and clears `music` without a runtime error. |
| Q7 | Board entry compares against music loaded now; empty means silence; final blocks replay after failed/empty name | Follow 3.1.0 under the version rule: compare current track, empty means stop, and do not adopt the final-version replay restriction. |
| Q8 | Battle stops board music; a fight without music has no fallback | Keep: battle hand-off uses `music` and no fallback track. |
| Q9 | Pre-fight music restarts from the beginning; in-fight music changes are lost; game-over restores pre-fight music | Keep as the battle hand-off contract; battle owns the saved pre-fight file and posts a restart. |
| Q10 | `mediaStop` retains the name; board, battle or video later restarts it | Keep: stop rewinds but retains `file`. |
| Q11 | Legacy saves store no audio; load plays board music; reset does not stop music | Deliberately depart for Reawakened playback save/re-emission; retain reset behavior and restart music from zero on load. |
| Q12 | Volume clamps 0..100, starts 100, is not remembered; 3.1.0 zero is quiet-but-audible and battle starts full; final has no audible effect | Follow 3.1.0: script volumes are integer settings, initial 100, not save/reset fields; final no-op volume is treated as a regression. |
| Q13 | Volume is not saved and reset does not change it | Keep in the script-settings/player-mix split. |
| Q14 | Frame sounds have a separate player, separate from `setVolume` and `wavStop`; frame-0 trigger depends on an unavailable breakdown | Keep the separation. **Unresolved:** frame-0 per-case timing remains unruled until the missing owner fact is supplied. |
| Q15 | Focus loss pauses the game; the engine does not touch audio; Windows/libraries decide audibility | Keep: core stops advancing, while runner focus policy cannot change cue meaning. |
| Q16 | Video stops music and freezes everything; cannot be skipped; afterwards music restarts from zero even if stopped | Keep; video owns the freeze and posts a music restart on completion. |
| Q17 | 3.1.0 played all listed formats and looped music; final played only MIDI | Follow 3.1.0; format availability and import policy are owned by 6.3, not by this command contract. |
| Q18 | Files are under Media; subfolders allowed; no extension added; case-insensitive; PAK does not unpack frame sounds or check videos | Keep path resolution and case folding; package/import handling remains a 6.3 platform rule. |
| Q19 | `music` shows battle music and is non-empty after `mediaStop` | Keep: the virtual reads the canonical `music` file retained by stop. |
| M1 | Music always loops in both versions and had no once argument | Keep `tkMD_LOOP` as the music default; `tkMD_ONCE` is a Reawakened addition. |
| M2 | Replaying an already-playing track carries on | Keep as the same-file rule unless `tkMD_RESTART` is explicit. |
| M3 | Board and battle music use the same repeat setting | Keep: both use looping `music`. |
| M4 | `wav`, `mp3` and `mp3pause` never loop | Keep: all legacy SFX mappings force `tkMD_ONCE`. |

<!-- OWNER: 6.2/P8 -->
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
* Entry **6.8** owns the command catalogue/responder rows, including the
  `deprecated`/`replacedBy` marker and diagnostics; entry **6.9** owns the
  Audio table and command-docs projection. Both must preserve the signatures,
  defaults, aliases and legacy mappings on this page.
* The independent audio timeline oracle and null-audio goldens cite the
  anchors on this page; they do not import core to generate expected facts.
* Entry 6.3 owns format availability, import metadata, runner protocol and
  source policy. It may not change the core clock, save/settings split, cue
  ordering, voice cap, fade maths or `audio.track` wake contract without a
  new ruling.

## References

* [AD-2, AD-9, AD-10, AD-14, AD-16 and AD-26](../../../_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md)
* [Display, input and audio — E-16, E-100–E-104](display-input-audio.md)
* [RPGCode runtime effect dispatch](rpgcode-runtime.md#reawakened-effect-dispatch)
* [Save-game format and Reawakened save rule](../formats/save-game.md#layout-minor-4)
* `docs/provenance/facts-round-8.md` Q1–Q19
* `docs/provenance/facts-round-9.md` M1–M4
* `_bmad-output/initiative-rpgtoolkit-reawakened/epic-audio-synth/discovery/audio-readiness.md` F-01–F-14
* `_bmad-output/initiative-rpgtoolkit-reawakened/epic-audio-synth/discovery/audio-exploration.md` §13, P1–P8
