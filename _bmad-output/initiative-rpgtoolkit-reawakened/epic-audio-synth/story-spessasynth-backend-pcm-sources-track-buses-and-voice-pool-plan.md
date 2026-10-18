---
title: 'SpessaSynth backend, PCM sources, track buses and voice pool'
type: 'feature'
ticket: 12
created: '2026-10-18'
status: 'draft'
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'high'
context:
  - 'docs/guardrails.md'
  - 'packages/synth/package.json'
  - 'docs/architecture-options.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-30'
---

## Intent
Make the synth actually render sound from MIDI and PCM, mixed per track.

## Boundaries
Rendering to PCM only. No Web Audio output, no browser test, no bundled SoundFont (entries 6.13, 6.16, epic 9).

## Key Decisions
Source length must agree with core `AudioInfo`; a disagreement is a conformance failure. The dependency's licence field is verified against its installed metadata, not assumed (G6).

## Acceptance
Rendering is deterministic for the same input; mixer and pool behaviour follow the core rules of entry 6.7.

## Verification
Unit and conformance tests; licence gate; `typecheck`, `lint`, `graph`.
