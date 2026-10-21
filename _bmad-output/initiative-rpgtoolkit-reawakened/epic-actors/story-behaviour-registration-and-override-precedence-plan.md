---
title: "Behaviour registration and override precedence"
type: 'feature'
ticket: 7
created: '2026-10-19'
status: ready-for-dev
baseline_revision: 'ce05dd4d34d9c0f0fa998cb7d8614ab89d17a47a'
risk: "high"
context:
  - "spec - docs/spec/engine/actors.md"
  - "code - packages/core/src/script/ (registerPlugin from 19.8)"
  - "code - packages/core/src/actors/"
---

## Intent

A behaviour is a separate package-start-up registration, not a `registerPlugin` key: `registerBehaviour(name, hooks)` stores session data beside the 19.8 layers and is rebuilt by the 19.16 loader at every boot/reset/restore.

## Boundaries

Registration and resolution only; saving and generic object hydration are entry 8.
## Contract reconciliation

The pre-build plan and ticket verification text used `stock_rpg.hero`, but the normative package grammar is lower-case hyphenated (`stock-rpg.hero`). The ticket also named a `damage-taken` behaviour override, while the closed core hook list contains only `levelUp`, `revive`, `statusChanged`, `equipmentChanged`, and `statsChanged`; `beforeDamage` and damage resolution belong to the battle RPGCode thread. This plan and `tickets.toml` now use the normative name and five-hook list. No core damage hook or extra registry hook will be implemented.

## Key Decisions

1. Behaviour names use the package grammar `namespace.name` (for example `stock-rpg.hero`); an actor stores only the name.
2. The hook list is closed and defined by core: the five hooks are `levelUp`, `revive`, `statusChanged`, `equipmentChanged`, and `statsChanged`. Unknown hook names, malformed names, wrong package namespaces and duplicates diagnose and register nothing; packages may still emit custom events.
3. Resolution is behaviour hook first, core default second; no behaviour or an unknown name uses the default and emits one located diagnostic for the unknown name.

## Acceptance

1. Override and default paths; namespacing.

## Verification

Unit tests with two test packages.
