---
title: 'Voices, voice stealing, fades and synced starts'
type: 'feature'
ticket: 7
created: '2026-10-18'
status: done
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'high'
context:
  - 'docs/guardrails.md'
  - 'docs/spec/engine/audio-media.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-16, AD-25'
---

## Intent
Let more than one sound play on a track, keep them in step, and fade them, all from core state.

## Boundaries
Voice, fade and sync behaviour only. Does not change the `audio` section type (owned by entry 6.6) or add commands (6.8).

## Key Decisions
Stealing is a pure function of core state, never of the audio device. A fade started over a running fade replaces it from the current value.

## Acceptance
Deterministic per-tick results for stealing ties, fade rounding, pause during a fade and sync with unequal lengths; every rule has a worked example in the spec page.

## Verification
Real-core scene tests; fuzz for voice allocation order; batching and snapshot invariance.
