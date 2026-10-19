---
title: 'synth: MidiSynth, the Null backend and the AudioSource seam'
type: 'feature'
ticket: 11
created: '2026-10-18'
status: done
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
- `AudioSource` and an ordered registry follow audio-media.md#audio-source-seam: `detect` chooses, the extension only orders ties, a duplicate id throws, `open` never throws (a throw becomes `source.failed`).
- `VoiceMachine` implements audio-media.md#voice-state-machine over the protocol v1 message and event types. Bus and master volume go to an optional `BusControl` that the 6.12 mixer implements. The cue player is not part of this ticket.
- `NullMidiSynth` reads the Standard MIDI File tempo map for the length (round half up to 60 Hz ticks); the `audio.wav` Null source reads linear-PCM length. Both render silence with exact position, loop, end, volume and fade.
- A bank set by `setBank` is treated as ready; asynchronous bank loading (`bank.invalid`, `bank.unavailable`) arrives with the real backend in 6.12.

## Acceptance
The public surface is a small barrel; every message and event is a plain-data record with fixed keys.

## Verification
Unit tests; `typecheck`, `lint`, `graph`.
