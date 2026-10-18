---
title: 'Axial, diagonal and vector pathfinding'
type: 'feature'
ticket: 5
created: '2026-10-18'
status: 'draft'
baseline_revision: 'd53cdd804d5f93525c2aa4e444bc848e75f550a5'
risk: 'high'
context:
  - 'docs/spec/engine/movement-and-collision.md#e-34'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-25'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-movement-triggers/discovery/movement-readiness.md'
---

## Intent
Provide one deterministic pathfinding contract for keyboard/mouse/script movement.

## Boundaries
Own pure axial, diagonal and vector search, occupancy, limits, tie order, cache invalidation and path-following diversion around a blocking sprite (R-51, falling back to entry 4's freeze/stop). Do not own queue stepping, trigger dispatch or runner input adapters.

## Key Decisions
Use actor collision geometry; cap at 1000 expansions; approach blocked/unreachable goals; invalidate on board/vector edits; use explicit total order for all ties.

## Acceptance
Each authored path scene has the declared path or nearest approach, equal-cost ties are stable, cap behavior is observable, the sprite-blocking diversion case diverts or falls back as ruled, and cache flush/edit/board-change results match.

## Verification
Focused pathfinding tests plus repeated-run and cache-invalidation replay checks.
