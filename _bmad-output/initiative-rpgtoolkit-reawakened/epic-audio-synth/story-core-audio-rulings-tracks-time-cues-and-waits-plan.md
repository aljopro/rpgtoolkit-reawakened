---
title: 'Core audio rulings: tracks, time, cues and waits'
type: 'feature'
ticket: 1
created: '2026-10-18'
status: 'draft'
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'high'
context:
  - 'docs/guardrails.md'
  - 'docs/spec/engine/display-input-audio.md'
  - 'docs/provenance/facts-round-8.md'
  - 'docs/provenance/facts-round-9.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-9, AD-14, AD-16'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-audio-synth/discovery/audio-exploration.md'
---

## Intent
Fix the core audio rules before any code: what a track is, what is saved, who owns time, what a cue says and when a wait wakes.

## Boundaries
Docs only. No TypeScript, fixtures or goldens. Does not rule commands, voices or layering (entry 6.2) or SoundFont, runner and video policy (entry 6.3).

## Key Decisions
Volumes are settings, not saved state (owner, 2026-10-18). Core is the only clock for script-visible audio time; `audio.ended` is advisory. Cues are generic per-track kinds (owner, option A). A paused track is still active, so a wait suspends on pause and ends on finish or stop (owner).

## Acceptance
Every P1, P2, P4 and P5 row has an OWNER marker, evidence, a rejected alternative, a deterministic rule and a stable anchor that later entries cite; the Epic 4 effect-record mapping and the legacy facts that touch the model (Q5, Q9 to Q11) are stated once.

## Verification
Provenance, catalogue and link/anchor checks; independent ticket-store validation; a person approves the plan checkpoint before any implementation entry becomes ready-for-dev.
