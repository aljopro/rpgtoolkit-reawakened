---
title: 'Audio state section, track engine and cue emission'
type: 'feature'
ticket: 6
created: '2026-10-18'
status: done
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'high'
context:
  - 'docs/guardrails.md'
  - 'packages/core/src/ports/audio.ts'
  - 'packages/core/src/save/sections.ts'
  - 'docs/spec/engine/audio-media.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-10, AD-16'
---

## Intent
Make the core know what is playing, on which track, for how long, and say so in cues.

## Boundaries
Owns the `audio` section type including the voice and fade fields, the `core/audio` barrel and cue emission. Voice allocation, stealing, fades and synced starts are entry 6.7 and do not change the section type. No built-in commands (6.8, 6.9).

## Key Decisions
Core is the only clock (proposed in entry 6.1; build to the approved ruling); `audio.ended` never moves script time. Playback state is saved; volumes are settings. Stopped tracks keep their file so later board entry, battle end or video end can restart it (Q10). The video-restart scene is entry 6.10's; this entry only provides the restart hook.

## Acceptance
Per-tick state and cues match the oracle; the old `AudioCueKind` is replaced and every producer, validator and port fixture that named it is migrated; settings never enter the state hash.

## Verification
Real-core tests of every named scene; batching-invariant state hash; snapshot and restore; golden, corpus and closing hash changes explained and pinned deliberately (G5).

## Scope

The `audio` section at schema v2 (`AudioStateV2`: tracks, voices, fade fields, `cueId`, the script SoundFont, script volume settings), the track engine and cue emission in `core/audio`, the applier on the `audio` effect bus, the board-music path, the `music` virtual, the settings-free state hash, snapshot migration and shape check, and the engine wiring of the `audio.wav` and `audio.midi` decoders. Voice fades and synced starts are entry 6.7's: the fade fields exist and pause, resume and a game load carry them, but no code starts a fade. The `media*` and `soundFont` built-ins and the `audio.track` wait registration are entries 6.8 and 6.9's: the oracle driver of the tests plays their part (name resolution, millisecond conversion, legacy aliases) and calls the runtime's transport methods. `mediaLoad` and its `media.load` cue are left to 6.8 (6.2 says the track "becomes stopped" without saying what happens to a playing voice).

## Code Map

- `docs/spec/engine/audio-media.md` — its own commit first (G7): `voiceCount`, voice `loop` and `pausedTick`, sparse `trackVolumes` with a track fade, and the numbered pin list at `#audio-core-pins` (apply tick, same-file only while playing, the held FIFO for an unfetched length, finish, pause shifts, the settings-free hash, game load and snapshot restore, the effect-record layout, the pass-wait index).
- `packages/core/src/audio/model.ts` — the section types, `createAudioSection`, `voicePosition`, `voicePass`, `findTrack`, `musicFile`, the `tkMD_` flag values and the limits.
- `packages/core/src/audio/runtime.ts` — `createAudioRuntime`: effect application (`music.play`, `sfx.play`, `soundfont.set`), the held FIFO, start registration, the `audio` phase, `mediaTrack`, play with the single-voice replace and the multi-voice allocate and steal, stop, pause, resume, seek, loop, the three volumes, wait creation and polling, and the game load.
- `packages/core/src/audio/save.ts` — the saved projection (`{ tick, cueId, soundFont, tracks }`, never the settings) and the copy helpers.
- `packages/core/src/audio/info.ts` — decoder assembly (`AUDIO_PLUGIN` first, then the plugins) and header dispatch to an `AudioInfo`.
- `packages/core/src/ports/audio.ts` — `AudioCueKind` and `AudioCue` replaced by the ten generic kinds and the twelve-key cue.
- `packages/core/src/save/` — `SCHEMA_VERSIONS.audio` 2, `createGameState`, `migrateAudio` (the empty placeholder becomes a fresh section), `validateAudioShape`, `hashGameState`.
- `packages/core/src/engine/engine.ts` — registers the runtime on the bus before `init.effectAppliers`, asks for audio bytes as the new `audio` request kind and drops them after decoding, runs `audio.phase()` first in the `audio` phase, fills `TickReport.audioCues`, hashes with `hashGameState`, leaves `state.audio` alone in `reset()`, posts `music.play` for every board arrival (`null` for an empty or missing name, no diagnostic) and `sfx.play` with source `frame`, takes `defaultSoundFont`.
- `packages/core/src/script/virtuals.ts` — `music` reads the music track's file.
- `packages/runner-harness/` — the null audio sink, the test double's cue, the script host's hash.
- Tests: `audio-scenes.test.ts` with `audio-oracle.ts` (eight oracle scenes, 44 cases, tick by tick, plus the `music` virtual each tick), `audio-runtime.test.ts` (limits, steal order, pause and seek shifts, pass waits, the held FIFO, the pre-registration queue, game load), `audio-restore.test.ts` (snapshot restart, the hash, the save projection), `audio-engine.test.ts` (board music, the stall on the blocking request, unsupported and missing files, batching, animation sound, reset), `save-migration.test.ts` (v1 placeholder, shape refusals).

## Implementation notes

- **Where the oracle and the spec were silent** the build follows the 6.4 `P-n` proposals and records them in the spec's pin list: the state fields the oracle's rows need, the apply tick of a drained or held effect, same-file only while playing (a paused voice is replaced), the steal order, a one-voice track replacing its occupant with stop then play, and a paused voice at a game load (restored paused, clocks shifted, re-emitted as play then pause).
- **The blocking asset request.** A play whose file length is not known holds that effect and every later `audio` effect in post order, requests the bytes, and applies them when the reply is consumed; the world stalls as for a board's tiles. The decoded length is remembered per engine, the bytes are not, and a reply with no bytes is an unknown length plus `asset.missing`, never a failure of the boot.
- **Snapshot restore.** An engine start over a restored state emits `soundfont.set` and nothing else, and takes one cue id; later cues and rows equal an uninterrupted run's apart from that one id, and the state hash is equal once the ids are set aside (`audio-restore.test.ts`). The game-load path re-emits the playing voices.
- **Golden, corpus and closing changes (G5).** Every state hash changes because the `audio` section is no longer the empty placeholder. The ten corpus program hashes were checked: hashing each final state with the placeholder put back gives the previous value exactly. The closing hashes change for a second reason, also deliberate: board music is now applied rather than left in the engine's pending queue (and `engine.musicAsset` is gone), and the engine asks for the music files, so request ids move. Frames and PNGs are unchanged. `golden/scripts/golden.json`, `golden/regression/closing.json` and the pins in `corpus.test.ts` were re-recorded.
- **Removed.** `engine.musicAsset`, the engine's own same-file check, the silent early returns and the missing-music diagnostic of `postBoardMusic`, and the old `music.*`, `sfx.*` and `volume.set` cue kinds with every producer and fixture that named them.

## How it is verified

`node --test packages/core/test/audio-scenes.test.ts packages/core/test/audio-runtime.test.ts packages/core/test/audio-restore.test.ts packages/core/test/audio-engine.test.ts packages/core/test/save-migration.test.ts`, and the repository gates (`pnpm install`, `fixtures:fetch`, `typecheck`, `lint`, `test:strict`, `golden`, `golden:bun`, `graph`, `licence`, `provenance`, `catalogue:check`, `command-docs:check`, `oracle:check`).
