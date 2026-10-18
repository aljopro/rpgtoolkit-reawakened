---
title: 'synth: MidiSynth, the Null backend and the AudioSource seam'
type: 'feature'
ticket: 11
created: '2026-10-18'
status: 'draft'
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'medium'
context:
  - 'docs/guardrails.md'
  - 'packages/synth/src/index.ts'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-30, AD-31'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-audio-synth/discovery/audio-exploration.md'
---

## Intent
Create the pluggable synth shape so real backends and future formats plug in without touching core.

## Boundaries
Interfaces, the Null backend and the registry only. No SpessaSynth, no SoundFont, no Web Audio.

## Key Decisions
Synths and sources are runner-side and hold no game decision; a missing source is a diagnostic and silence, never a state change.

## Acceptance
The public surface is a small barrel; every message and event is a plain-data record with fixed keys.

## Verification
Unit tests; `typecheck`, `lint`, `graph`.
