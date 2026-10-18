---
title: 'Independent audio timeline oracle and authored audio fixtures'
type: 'feature'
ticket: 4
created: '2026-10-18'
status: 'draft'
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
