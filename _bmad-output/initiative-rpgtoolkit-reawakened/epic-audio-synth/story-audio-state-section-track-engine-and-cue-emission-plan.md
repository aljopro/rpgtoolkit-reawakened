---
title: 'Audio state section, track engine and cue emission'
type: 'feature'
ticket: 6
created: '2026-10-18'
status: 'draft'
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
Core is the only clock; `audio.ended` never moves script time. Playback state is saved; volumes are settings held by the host. Stopped tracks keep their file so later board entry, battle end or video end can restart it (Q10).

## Acceptance
Per-tick state and cues match the oracle; the old `AudioCueKind` is replaced and every producer, validator and port fixture that named it is migrated; settings never enter the state hash.

## Verification
Real-core tests of every named scene; batching-invariant state hash; snapshot and restore; golden, corpus and closing hash changes explained and pinned deliberately (G5).
