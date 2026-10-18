---
title: 'Media control built-ins and the track wait'
type: 'feature'
ticket: 8
created: '2026-10-18'
status: 'draft'
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'high'
context:
  - 'docs/guardrails.md'
  - 'packages/core/src/ports/wait.ts'
  - 'packages/core/src/script/catalogue-responders.ts'
  - 'docs/spec/engine/rpgcode-functions.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-8, AD-9'
---

## Intent
Give authors the control half of the standard media commands, with a wait that survives saves.

## Boundaries
Owns the control pack module, the `mediaVolume` registration (both forms), the audio read view and the `audio.track` wait registration. Query commands and legacy mapping are entry 6.9; video is entry 6.10.

## Key Decisions
Wait payload stores the absolute end tick and the track and voice; the wait ends on finish or stop; a pause suspends it (owner).

## Acceptance
Every name assigned here has a real responder, effect, wait and help text; no duplicate wait path remains for `audio.sfx`.

## Verification
Script fixtures through the real VM; restore mid-wait; catalogue and command-docs gates.
