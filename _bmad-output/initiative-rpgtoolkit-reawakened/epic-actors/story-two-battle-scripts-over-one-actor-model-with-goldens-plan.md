---
title: "Two battle scripts over one actor model, with goldens"
type: 'feature'
ticket: 13
created: '2026-10-19'
status: 'built'
baseline_revision: '660fc2f2'
risk: "high"
context:
  - "fixtures - packages/core/test/fixtures/authored/battle-scripts/"
  - "golden - golden/actors/battle-scripts.json"
  - "spec - docs/spec/engine/actors.md#store-and-action-boundary"
---

## Intent

Closing end-to-end proof of the actor boundary: a Zelda-style battle script (health in hearts of
four) and an FF-style battle script (four-digit health, rolled damage) run over the same actor
model. Each script sends the cancelable `beforeDamage` event from its own battle thread, parks for
the listeners' one tick, and then applies the surviving damage and the reward through its package's
commands. The two games differ only in the behaviour their package registers in
`behaviourStartup`; the commands, the core rules and the actor model are the same.

## Boundaries

Fixtures, the package-command view of the actor operations, and goldens; not the stock battle
(Epic 7).

## Key Decisions

1. Two pinned scripts use one actor model; their fallen, damage-taken and level-up differences come
   only from `registerBehaviour` in package start-up. `beforeDamage` is sent by the battle thread,
   not from a listener, and the one-tick cancelable resume is included in the timing.
2. The scripts apply damage and award experience through package commands, so a package command
   receives the owner-held actor operations (`readActor`, `updateStats`, `advanceStatus`,
   `applyEquipment`, `awardExperience`) in its command view. That was the missing seam: the raw
   actor section is not hook-aware, and a direct patch would skip both the behaviour hooks and the
   transitions. The rule is recorded in
   [actors.md](../../../../docs/spec/engine/actors.md#store-and-action-boundary).

## Acceptance

1. Two pinned scripts.
2. Zero legacy diffs.

## Verification

`packages/core/test/battle-scripts.test.ts` asserts, for both scripts: the behaviour-only
difference (hearts versus armour and their level-up deltas, with the no-behaviour core run as the
control), a snapshot at every tick that restores to the same hash, replay determinism against
`golden/actors/battle-scripts.json`, and that only the FF script moves with the seed. `pnpm test`,
`pnpm golden` and the legacy dump goldens stay unchanged.
