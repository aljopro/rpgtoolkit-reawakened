---
title: "Epic 8 end-to-end acceptance"
type: 'feature'
ticket: 14
created: '2026-10-22'
risk: "high"
context:
  - "spec - docs/spec/engine/plugins-and-battle.md#e-80 to E-87, E-123"
  - "spec - docs/spec/formats/save-game.md"
  - "initiative - CAP-5, CAP-9, CAP-10, CAP-11"
---

## Intent

Run a complete player-authored game scenario through menu, party, inventory, dialogue, battle and save/load with the real integrated owners.

## Boundaries

Acceptance and end-to-end fixtures only; no new runtime behavior. The preceding stories own unit and component tests.

## Acceptance

A headless play-through covers every E-80–87 and E-123 behavior, all CAP-10 flows, a mid-script save/load with equal canonical hashes and later behavior under the entry 1 ruling, completed and interrupted dialogue with actor-isolated `talked`, and Epic 7's real battle item consumption through Epic 8's inventory operation.

## Verification

Execute the fixture under the project's deterministic runner and compare committed golden state/draw/event output; run the specific battle, dialogue and restore scenarios against their integrated package/startup paths, not test doubles.

## Implementation map

Run only after the refactor sweep. Link each assertion to an E-xx or CAP id and preserve existing unrelated golden baselines.
