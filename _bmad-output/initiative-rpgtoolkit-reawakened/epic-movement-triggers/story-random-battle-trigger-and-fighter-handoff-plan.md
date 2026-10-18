---
title: 'Random battle trigger and fighter handoff'
type: 'feature'
ticket: 11
created: '2026-10-18'
status: 'draft'
baseline_revision: 'd53cdd804d5f93525c2aa4e444bc848e75f550a5'
risk: 'medium'
context:
  - 'docs/spec/engine/movement-and-collision.md'
  - 'docs/spec/engine/plugins-and-battle.md#random-encounters'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-battle/epic-battle.md'
---

## Intent
Define and emit the movement-owned random-encounter boundary for Epic 7.

## Boundaries
Own encounter eligibility, sampling point, RNG order and plain-data fighter/board context. Do not implement battle rules, charge bars, damage, statuses or UI.

## Key Decisions
Check after activation, at most once per tile moved, use the shared RNG and stable actor/enemy references, and post a handoff the battle epic can consume without movement imports.

## Acceptance
A fixture proves eligibility/order/frequency and stable fighter references/context across replay.

## Verification
Random encounter tests, RNG/state-hash checks and an isolated battle-consumer contract test.
