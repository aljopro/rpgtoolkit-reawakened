---
title: 'Runner audio protocol schema and conformance vectors'
type: 'feature'
ticket: 15
created: '2026-10-18'
status: done
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'medium'
context:
  - 'docs/guardrails.md'
  - 'docs/spec/engine/audio-media.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-audio-synth/discovery/audio-exploration.md'
---

## Intent
Let a runner in any language prove it speaks the same audio protocol.

## Boundaries
Schema, vectors and the TypeScript reference binding only. No runner implementation (epic 9) and no non-TypeScript code.

## Key Decisions
A runner may choose output API, buffers and threading; it may not change cue meaning or invent or drop an `ended` it owes.

## Acceptance
Vectors are plain files; the schema is the single source for message shape.

## Verification
Vector replay and consistency tests; check mode.
