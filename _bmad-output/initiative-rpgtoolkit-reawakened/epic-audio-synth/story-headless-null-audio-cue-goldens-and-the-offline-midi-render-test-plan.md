---
title: 'Headless null-audio cue goldens and the offline MIDI render test'
type: 'feature'
ticket: 16
created: '2026-10-18'
status: 'draft'
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'medium'
context:
  - 'docs/guardrails.md'
  - 'docs/spec/engine/audio-media.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-audio-synth/discovery/audio-exploration.md'
---

## Intent
Prove the cues and the render path work headlessly, deterministically and on both runtimes.

## Boundaries
Null-audio goldens and an offline render test. No Web Audio and no browser test.

## Key Decisions
Done-when item 2 of the envelope asks for a browser test; none can run until epic 9 supplies a browser runner, so this epic proves the same path offline and hands the browser test over (to confirm).

## Acceptance
Cue goldens cover board music, battle hand-off and video; the render test uses the bundled bank.

## Verification
Golden and golden:bun; the render test; closing regression check.
