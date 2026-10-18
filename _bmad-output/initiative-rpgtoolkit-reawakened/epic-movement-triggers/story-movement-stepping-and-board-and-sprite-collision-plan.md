---
title: 'Movement stepping and board and sprite collision'
type: 'feature'
ticket: 4
created: '2026-10-18'
status: 'draft'
baseline_revision: 'd53cdd804d5f93525c2aa4e444bc848e75f550a5'
risk: 'high'
context:
  - 'docs/spec/engine/movement-and-collision.md#e-22'
  - 'docs/spec/engine/movement-and-collision.md#e-26'
  - 'docs/spec/engine/movement-and-collision.md#e-27'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-movement-triggers/discovery/inception-proposal.md'
---

## Intent
Advance actors through deterministic queues and resolve board/sprite collisions under the approved movement rulings.

## Boundaries
Own movement-phase registration, queue stepping, speed conversion, collision response and actor movement state. Do not implement pathfinding search, trigger dispatch, input bindings or compositor ordering.

## Key Decisions
All time comes from `core/time`; geometry is deterministic and total-ordered; direct sprite collision (winner/loser, frozen, wait/stop) and wall sliding follow approved R-51/R-54 rules; path-following diversion belongs to entry 5; movement posts plain-data effects/events.

## Acceptance
Fixture cases prove tile/pixel steps, queue clear/append, solids, stairs, under, slide, direct sprite blocking, frozen/done/waiting states and no host timing dependence.

## Verification
Run focused movement fixtures, cross-engine/hash checks where configured, movement-wait integration and guardrail lint.
