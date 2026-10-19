---
title: 'Video built-ins and the video wait'
type: 'feature'
ticket: 10
created: '2026-10-18'
status: done
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'medium'
context:
  - 'docs/guardrails.md'
  - 'docs/spec/engine/display-input-audio.md'
  - 'docs/provenance/facts-round-8.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-5, AD-9, AD-14'
---

## Intent
Let a script play a cutscene video that blocks the game, then bring the music back.

## Boundaries
The request, the wait and the music interaction. Transcoding AVI on import is a tool for the editor and asset epics; the player or runner decodes the imported copy (epic 9).

## Key Decisions
Playback cannot be skipped (Q16). The video wait and the track wait are separate kinds.

## Acceptance
Request shape, wait payload and music rules are plain data and replay-safe.

## Verification
Real-VM script fixtures; restore mid-wait; catalogue and command-docs gates for the two names.
