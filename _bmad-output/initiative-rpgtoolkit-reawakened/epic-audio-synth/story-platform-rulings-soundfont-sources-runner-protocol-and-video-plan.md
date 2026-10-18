---
title: 'Platform rulings: SoundFont policy, sources, runner protocol and video'
type: 'feature'
ticket: 3
created: '2026-10-18'
status: 'draft'
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'high'
context:
  - 'docs/guardrails.md'
  - 'docs/spec/engine/display-input-audio.md'
  - 'docs/architecture-options.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-16, AD-30, AD-31'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-audio-synth/discovery/audio-exploration.md'
---

## Intent
Rule the audio platform: formats, banks, the runner-facing protocol and the video policy.

## Boundaries
Docs only. Does not rule core track state (entry 6.1) or the command surface (entry 6.2). Does not build the Web Audio output (epic 9).

## Key Decisions
Synths are pluggable behind `MidiSynth`; the SoundFont is configuration with runner, author and player layers; a language-neutral runner protocol with data-driven vectors (owner direction); MP3/OGG transcode on import (conservative default, section 9). Library licences and browser support quoted in the exploration are unverified until checked (G6).

## Acceptance
Every inherited decision is ruled or deferred by name; the protocol page lists messages in (`load`, `play`, `pause`, `resume`, `stop`, `seek`, `fade`, `setVolume`, `setBank`) and events out (`ready`, `ended`, `error`) with fixed keys; the Path B bank has a provenance checklist entry 6.13 can verify.

## Verification
Provenance, licence and link/anchor checks; independent validation; a person approves the plan checkpoint.
