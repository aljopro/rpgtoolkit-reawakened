---
title: "Actor model inventory: every stat and state, its source, type, writer and rule owner"
type: 'feature'
ticket: 2
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "high"
context:
  - "spec - docs/spec/formats/character.md, enemy.md, item.md, battle-data.md (status .ste)"
  - "code - packages/core/src/formats/ (the .tem, .ene, .itm, .ste, .spc readers) and packages/core/src/sprites/ (5.3)"
  - "spec - docs/spec/engine/plugins-and-battle.md (E-72 to E-78, E-85, the PLAYER_*, ENE_* codes)"
  - "plan - _bmad-output/initiative-rpgtoolkit-reawakened/epic-movement-triggers/story-unified-actor-and-sprite-runtime-state-plan.md"
---

## Intent

The one table every later entry reads (entries 3, 5, 6, 7, 8, 10 and Epic 7). Lives at `docs/spec/engine/actors.md#act-inventory`; columns: name, source field, type, writer (core / battle script / any script), rule (core-rule / battle-rule), evidence. Distinguishes data (saved) from derived values (never saved) and from battle-only temporaries (charge, action choice) that Epic 7 keeps in its own battle object.

## Boundaries

Documentation only; reads the readers' field lists, writes no code. Hitl because the writer/rule columns are design choices with long consequences.

## Key Decisions

1. Charge, speed-derived rates and damage inputs are battle rules; HP, fallen, status counters, equipment bonuses and level-up data are core rules.
2. Per-field judgement calls are marked OWNER in the table.

## Acceptance

1. Complete, no-duplicate table.
2. Each row names its builder entry (3, 5, 6, 7, 8 or 10) or Epic 7.

## Verification

A script-free check: a doc test or review that every reader field appears in the table; owner approval.
