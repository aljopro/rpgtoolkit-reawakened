---
title: 'Independent audio timeline oracle and authored audio fixtures'
type: 'feature'
ticket: 4
created: '2026-10-18'
status: built
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'medium'
context:
  - 'docs/guardrails.md'
  - 'docs/spec/engine/audio-media.md'
  - 'tools/fixtures/movement/index.mjs'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-audio-synth/discovery/audio-exploration.md'
---

## Intent
Give the audio core an independent check of its tick maths, the way the movement and rendering oracles do.

## Boundaries
Authored fixtures and a core-independent checker only. No legacy GPL source, no imports from `packages/core`, no state or cue hashes (consumers assert those). No real SoundFont rendering.

## Key Decisions
Expected facts are hand-worked from the rulings, not read back from the core. Lengths are given in ticks and seconds so the rounding rule is exercised. Corpus files are used only as fetched-at-test-time length checks.

## Acceptance
Fixtures cover every named scene; each case has a stable name and per-tick expected facts; every authored audio file has a hand-worked length; later entries cite scene names, not paths.

## Verification
Generator check mode reproduces committed fixtures; static scan proves no `packages/core` dependency; later references resolve to the names above.

## Scope

The producer is limited to authored JSON audio scenes, a core-independent reference timeline, authored WAV and MIDI files with hand-worked lengths, deterministic generation and checking, and fixture-tool tests. It does not implement the audio applier, decoders or the runner, does not alter any state or cue contract, and copies no corpus file. The fifteen scene names are the stable downstream contract (entries 6.5 to 6.10 and 6.16 cite scene names and case names, never paths): `board-music-boot`, `animation-frame-sfx`, `track-transport`, `loop-and-end-ticks`, `same-file-rules`, `voices-and-stealing`, `fades`, `synced-start`, `late-start-catch-up`, `media-wait-suspend`, `settings-versus-save`, `soundfont-setting`, `battle-music-handoff`, `legacy-parity-ledger` and `video-restarts-music`.

## Evidence and rejected alternatives

Every scene names the `docs/spec/engine/audio-media.md` anchors it follows: the time model P2 (`audio-time-model`), lifecycle and effect mapping (`audio-lifecycle`, `board-effect-mapping`), cues (`audio-cue-contract`), waits (`audio-track-wait`), voices and layers (`media-command-family`, `audio-layer-rulings`), the legacy mapping and parity ledger (`legacy-audio-command-mapping`), save, load and reset (`audio-save-load`), the platform rules F4 (`audio-wav-midi-length`), R-59, the cue player, SoundFont (`soundfont-commands`, `soundfont-cue`), battle (`battle-music-synthetic`) and video (`video-request`, `video-wait-hold`, `video-music`, `video-headless`). The corpus facts are the 66 WAV and the MIDI files of the fetched games; three WAV are ADPCM (`Caoquest`).

Rejected: importing `packages/core` to generate expected facts, because a consumer could then pass by sharing behaviour with its oracle. Rejected: state or cue hashes, which are the consuming entries' contract. Rejected: committing corpus WAV or MIDI files as fixtures, because G5 and G6 want authored or fetched inputs; the authored files are written from the public layouts and the F4 rule, and corpus lengths are pinned by SHA-256 and measured at test time only. Rejected: deriving the authored lengths from the bytes, which would let the generator confirm itself; each length and its arithmetic is written by hand in `files.mjs`, and `--check` parses the bytes with the independent reader to prove both agree.

## Code Map

- `tools/fixtures/audio/sim.mjs` — the reference timeline: tracks, voices, the audio applier (effects and commands), cue emission, the `audio.track` and video waits, fades, sync, save, load, and the cue-player arithmetic. Integer maths only; no host or core imports. It throws on any path the rulings leave open so a scene cannot lean on an unruled behaviour.
- `tools/fixtures/audio/length.mjs` — the independent WAV and MIDI length readers (rule F4) used by the authored-file check and the corpus pins.
- `tools/fixtures/audio/files.mjs` — seventeen authored files (nine WAV: PCM 8 and 16-bit, mono and stereo, a half tick, the one-tick minimum, MS-ADPCM with and without a fact chunk, IMA-ADPCM mono and stereo; eight MIDI: type 0 and 1, tempo changes, a tempo-only file, an empty file, an XG file with bank select and a GS file) with hand-worked lengths.
- `tools/fixtures/audio/common.mjs`, `scenes-a.mjs`, `scenes-b.mjs`, `scenes-c.mjs` — setups, effect and command helpers and the fifteen named scenes with their cases.
- `tools/fixtures/audio/index.mjs` — scene manifest, proposed-ruling registry, corpus pins, authored-file check and static workspace-import scan.
- `tools/fixtures/author/generate.mjs` — writes and checks the audio fixtures beside the movement and format fixtures.
- `packages/core/test/fixtures/audio/*.json` and `files/*` — committed generated data: one fact row per tick, no hashes; `manifest.json` lists scenes, cases, files and proposed rulings.
- `tools/fixtures/test/audio.test.mjs` — generator check, determinism, import scan, corpus, manifest and hand-worked assertions per scene; registered in `fixtures:test`.

## Row and case format

Each case holds `setup` (asset lengths in ticks, optional authored file, default SoundFont, registration tick), a recorded `script` of effect records (`music.play`, `sfx.play`, `soundfont.set`), script commands and engine inputs (`save`, `load`, `reset`, `video.ended`), the `ticks` run and `expect`, one row per tick: `t`, the track states (`tr`: state, flags, file, position, length and the voices with cue id, priority, volume, start, position, end tick, loop and fade), settings (`bus`, `master`), the script bank (`sf`), the cues emitted that tick (every `AudioCue` with all twelve keys, ids included) and facts (`ev`: wait, wake, finished, steal, same-file, diag, legacy and video facts). Cases of `late-start-catch-up` also carry `runner` expectations (the cue player's start position, drop or fade for a given ready tick). The `legacy-parity-ledger` scene also carries the ledger: every round 8 and round 9 fact once, with its kind and the case that shows it, or why it is a runner or platform rule.

## Implementation notes and proposed rulings

Wherever the spec is silent the oracle chooses and records the choice as **Proposed ruling (pending owner review)** `P-n` in `index.mjs` and `manifest.json`; each scene lists the ones it relies on. Highlights for review:

- P-1/P-2/P-3: a row is the state after the `audio` phase; a cue's tick is the tick the applier applied it (queued effects take the registration tick); a finished one-shot is removed and emits `media.stop` at its end tick, after the waits phase has already woken its waiter.
- P-4: a paused voice keeps its stale start and end ticks; resume shifts them and any running fade start by the paused span.
- P-5/P-6/P-7: loop is per voice; a track's flags are voice 0's loop bit; fades clear at `d = D`; a zero-duration fade is a `media.fade` cue with duration 0; a voice-less `mediaFade` is a bus fade; cue fields per kind.
- P-8: a one-shot wait reads the voice's current end tick, a pass wait wakes when the pass index grows, and a missing voice wakes at the next waits phase.
- P-9: load takes the larger cue counter; a resumed non-music cue carries tick = load tick minus the saved position with position 0; music carries the load tick. A saved fade, a paused voice at load and a parked wait at load are outside the oracle.
- P-10 to P-18: same-file outcomes, legacy names, the video hold, stealing, unsupported files, whole-millisecond scripts, the late-runner order, the diagnostic choices and which settings a row lists.

## How it is verified

`pnpm fixtures:author:check` (also run by `oracle:check`) reproduces every committed audio fixture and scans for a core import; `node --test tools/fixtures/test/audio.test.mjs` (in `pnpm fixtures:test`) asserts the hand-worked facts, the authored lengths, the ledger and the corpus pins when fetched.
