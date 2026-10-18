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
Length is computed in integer ticks with the rounding rule of entry 6.1; a file whose length cannot be read returns a `FormatError` and the caller plays silence; what `mediaWait` and `mediaLength` do for an unreadable length is ruled in entry 6.1, not here.

## Acceptance
A decoder per format registers through the existing `decoders` array; an `AudioInfo` is `{ lengthTicks, loopStartTick, needsBank }` with every key present and `null` for absence (AD-14); the corpus table is committed.

## Verification
Unit tests over authored bytes and the corpus; the plain-data check; `typecheck`, `lint`, `graph`.
