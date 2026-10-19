---
title: 'Headless null-audio cue goldens and the offline MIDI render test'
type: 'feature'
ticket: 16
created: '2026-10-18'
status: built
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
Done-when item 1 asks for battle cues and item 2 for a browser test; neither can be shown here (no battle runtime, no browser harness), so this epic proves the hand-off with a synthetic battle-music effect and the render path offline, and hands both to epics 7 and 9 (confirmed in entry 6.3).

## Acceptance
Cue goldens cover board music and the battle hand-off rules (Q8, Q9) through a synthetic effect; the render test uses the bundled bank; real battle cues are epic 7's to add.

## Verification
Golden and golden:bun; the render test; closing regression check.
