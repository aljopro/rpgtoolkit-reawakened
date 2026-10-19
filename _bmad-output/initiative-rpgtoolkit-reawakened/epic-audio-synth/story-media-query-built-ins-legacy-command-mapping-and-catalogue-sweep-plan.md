---
title: 'Media query built-ins, legacy command mapping and catalogue sweep'
type: 'feature'
ticket: 9
created: '2026-10-18'
status: built
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'medium'
context:
  - 'docs/guardrails.md'
  - 'docs/spec/engine/rpgcode-functions.md'
  - 'packages/core/src/script/legacy-plugins.ts'
  - 'docs/provenance/facts-round-8.md'
---

## Intent
Make every old audio command keep working, as a thin mapping onto the standard family, and give authors the read commands.

## Boundaries
Owns the query pack module, `sound` (spec row: obsolete raises error), and the legacy mapping for the names above. The other legacy audio commands use the documentation-only `deprecated` tag (owner). Does not touch video (6.10), `mediaVolume`, `mediaplay` or `mediastop` (entry 6.8).

## Key Decisions
Legacy behaviour comes from the parity ledger of entry 6.2. The plugin commands' legacy meaning is unchecked: unanswered ones are recorded as not reproduced with a diagnostic, not guessed.

## Acceptance
One implementation path for audio effects: a legacy name and its standard equivalent produce identical effects and cues; the Audio table and catalogue agree.

## Verification
Parity scene per tick; corpus equivalence check over the programs using legacy audio commands; catalogue and command-docs gates.
