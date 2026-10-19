---
title: 'Core audio rulings: tracks, time, cues and waits'
type: 'feature'
ticket: 1
created: '2026-10-18'
status: 'built'
baseline_revision: '38e899fd'
risk: 'high'
context:
  - 'CLAUDE.md'
  - 'docs/guardrails.md'
  - 'docs/spec/engine/audio-media.md'
  - 'docs/spec/engine/display-input-audio.md'
  - 'docs/provenance/facts-round-8.md'
  - 'docs/provenance/facts-round-9.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-9, AD-10, AD-14, AD-16, AD-26'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-audio-synth/discovery/audio-readiness.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-audio-synth/discovery/audio-exploration.md'
---

## Intent

Fix the deterministic core audio contract before implementation: what a named
track and voice are, what is saved, who owns time, what a cue says and when an
audio wait wakes. The page is human-facing first and gives exact ticks,
ordering and null behavior second.

## Boundaries

Docs and spine amendments only. No TypeScript, decoders, synth backends,
SoundFont policy, built-ins, runner protocol schema, fixtures, goldens or
catalogue rows. Epic 6.2 owns command/voice-allocation details; 6.3 owns
platform/source/video policy. This entry establishes the shared shape they
must use.

## Normative rulings recorded

All rulings remain **Proposed ruling (pending owner review)** at this HITL
checkpoint:

1. **P1 — state and lifecycle:** `GameState.audio` schema v2 has ordered
   tracks, voices, lifecycle, positions, lengths, fades and a monotonic
   `cueId`; built-in tracks are `music`, `sfx`, `ambience`, `voice`, `ui`.
   Script-volume settings are runtime replay state but are omitted from saves
   and untouched by `reset()`/`load()`; the player's mix stays runner-side.
   Saves carry playback and re-emit it; music restarts at zero on load and
   non-music tracks resume their saved position. `reset()` leaves audio alone.
2. **P2 — time:** fixed 60 Hz core ticks and half-up seconds conversion;
   `endTick = startTick + lengthTicks`; late runners catch up from cue `tick`;
   `audio.ended` is advisory and cannot wake waits or move position. Null
   audio emits no authoritative end reply.
3. **P4 — cues and boundary:** generic per-track `media.*` cue kinds with a
   single `media.fade` descriptor, all fixed keys with `null` for unused
   fields; cue IDs and effect order are core-owned. Epic 4 keeps
   `music.play`/`sfx.play` effects and the audio applier owns same-file,
   replacement and silence decisions. `music` reads the music track's file.
4. **P5 — waits:** `audio.track` replaces `audio.sfx`; waits use plain data,
   finish at the core end tick, suspend while paused and wake after stop or
   replacement at the next waits phase. Unknown length/track and loop+wait
   diagnostics never park a thread.

## Evidence and rejected alternatives

`audio-media.md` carries an OWNER marker, evidence and rejected alternative for
each P1, P2, P4 and P5 choice. Its parity ledger records Q3, Q5, Q8–Q13, Q19
and M1–M4 once. The supporting evidence is F-01–F-08 and F-10 in
`audio-readiness.md`, §13/P1/P2/P4/P5 in `audio-exploration.md`, AD-9/AD-14/
AD-16/AD-26, and facts rounds 8 and 9. The explicit alternatives rejected are
runner-owned timing, old `music.*`/`sfx.*` cue names, one global music/SFX
slot, volume in saves, no saved playback, wake-on-pause and reuse of the
unregistered `audio.sfx` wait.

## Changed artifacts

* `docs/spec/engine/audio-media.md` — new normative audio page and stable
  anchors for later entries.
* `docs/spec/engine/display-input-audio.md` — links E-16/E-100/E-101/E-103
  to the page and closes R-59 without adopting the legacy routing bug.
* `architecture-rpgtoolkit-reawakened.md` — AD-9, AD-10, AD-14 and AD-16
  amendments, each pointing to the normative page and preserving the affected
  producer/validator/port/virtual-variable/fixture seams.
* this plan — global ticket ref `6.1`, status `built`, and the checkpoint
  record.

## Verification

Run the repository's docs and project gates after the docs are complete:
`pnpm install`, `pnpm fixtures:fetch`, `pnpm typecheck`, `pnpm lint`,
`pnpm test:strict`, `pnpm golden`, `pnpm golden:bun`, `pnpm graph`,
`pnpm licence`, `pnpm provenance`, `pnpm catalogue:check`,
`pnpm command-docs:check`, and `pnpm oracle:check`. No implementation or
golden files are expected to change; any gate that assumes the pre-audio
port/cue shape is a real follow-up contract issue, not a reason to weaken this
page.

## HITL checkpoint

The plan is built and the docs are ready for owner review. The implementation
entries remain blocked until the owner approves or changes the four pending
rules above.
