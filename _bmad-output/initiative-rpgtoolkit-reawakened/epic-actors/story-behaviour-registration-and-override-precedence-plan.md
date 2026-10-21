---
title: "Behaviour registration and override precedence"
type: 'feature'
ticket: 7
created: '2026-10-19'
status: 'built'
baseline_revision: 'ce05dd4d34d9c0f0fa998cb7d8614ab89d17a47a'
route: 'full'
route_source: 'pinned'
review: 'approve'
review_source: 'independent post-fix reviewer'
lenses_ran: ['implementation', 'migration', 'boundary-validation', 'regression-baselines']
review_loop_iteration: 2
risk: "high"
context:
  - "spec - docs/spec/engine/actors.md"
  - "code - packages/core/src/script/ (registerPlugin from 19.8)"
  - "code - packages/core/src/actors/"
---

## Intent

A behaviour is a separate package-start-up registration, not a `registerPlugin` key: resolved package definitions are registered through `runPackageStartup` beside the 19.8 layers and rebuilt by the 19.16 loader at every boot/reset/restore. The resulting session registry is injected into the actor owner service, so actor operations resolve behaviour hooks before applying core rules.

## Boundaries

Registration, resolution, and the actor-owner operation seam only; core rule implementations, saving, and generic object hydration are entry 8 or later.
## Contract reconciliation

The pre-build plan and ticket verification text used `stock_rpg.hero`, but the normative package grammar is lower-case hyphenated (`stock-rpg.hero`). The ticket also named a `damage-taken` behaviour override, while the closed core hook list contains only `levelUp`, `revive`, `statusChanged`, `equipmentChanged`, and `statsChanged`; `beforeDamage` and damage resolution belong to the battle RPGCode thread. This plan and `tickets.toml` now use the normative name and five-hook list. No core damage hook or extra registry hook will be implemented.

## Key Decisions

1. Behaviour names use the package grammar `namespace.name` (for example `stock-rpg.hero`); an actor stores only the name.
2. The hook list is closed and defined by core: the five hooks are `levelUp`, `revive`, `statusChanged`, `equipmentChanged`, and `statsChanged`. Unknown hook names, malformed names, wrong package namespaces and duplicates diagnose and register nothing; packages may still emit custom events.
3. Resolution is behaviour hook first, core default second; no behaviour or an unknown name uses the default and emits one located diagnostic for the unknown name.

## Acceptance

1. Override and default paths; namespacing.
2. Package startup registers static plugin behaviour definitions before actor operations; `ActorService` resolves the actor's hooks and supplies them to the core operation rules.

## Verification

Unit tests with two test packages and consumer-visible actor operation usage. The core behaviour test registers `stock-rpg.hero` through `runPackageStartup`, calls `services.actors.awardExperience`, and verifies the hook override changes the committed actor result.

## Review Triage Log

- `high` / `patch`: the initial registry was not connected to package definitions or actor host resolution; package behaviour overrides could not reach actor operations. Added session registration from resolved plugin behaviour definitions, passed registry resolution into the actor owner service, and routed actor operations and virtual/host writes through that service while preserving the five-hook boundary.
- `fixed`: the earlier review question about wiring hooks into rule operations was valid against the acceptance claim that an actor uses its overrides. `ActorService` now owns the operation calls (`updateStats`, `advanceStatus`, `applyEquipment`, `awardExperience`) and injects the resolved hooks; the consumer test exercises `awardExperience`.
