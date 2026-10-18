---
title: 'AudioInfo decoders for WAV and MIDI'
type: 'feature'
ticket: 5
created: '2026-10-18'
status: 'draft'
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'medium'
context:
  - 'docs/guardrails.md'
  - 'packages/core/src/formats/registry/decoder.ts'
  - 'docs/spec/engine/audio-media.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-31'
---

## Intent
Give core a pure, deterministic way to know how long an audio asset is, because track end ticks depend on it.

## Boundaries
Length, loop and bank-need only. No sample decoding for playback (entry 6.12), no MP3/OGG decoder (transcoded on import, entry 6.3), no tracker format.

## Key Decisions
Length is computed in integer ticks with the rounding rule of entry 6.1; a MIDI file with an unreadable tempo map is a diagnostic with length 0, which makes `mediaWait` a diagnostic too.

## Acceptance
A decoder per format registers through the existing `decoders` array; an `AudioInfo` is `{ lengthTicks, loopStartTick, needsBank }` with every key present and `null` for absence (AD-14); the corpus table is committed.

## Verification
Unit tests over authored bytes and the corpus; the plain-data check; `typecheck`, `lint`, `graph`.
