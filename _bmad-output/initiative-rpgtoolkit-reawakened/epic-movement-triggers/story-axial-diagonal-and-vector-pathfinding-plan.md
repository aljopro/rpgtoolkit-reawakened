---
title: 'Axial, diagonal and vector pathfinding'
type: 'feature'
ticket: 5
created: '2026-10-18'
status: 'built'
baseline_revision: 'a3c1a027'
route: 'full'
route_source: 'pinned'
risk: 'high'
context:
  - 'docs/spec/engine/movement-and-collision.md#e-34'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-25'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-movement-triggers/discovery/movement-readiness.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The unified actor runtime can step and collide but cannot turn a point target into a deterministic path around board vectors and blocking sprites.

**Approach:** Add a pure pathfinding owner with axial and diagonal grid A*, vector visibility-graph search, explicit geometry and total-order ties, then feed its routes into the existing FIFO movement state. Add one R-51 local diversion attempt before the existing 120-tick wait/freeze fallback.

## Boundaries & Constraints

**Always:** Use actor collision geometry, fixed board pixels, 1000 node expansions, nearest-free goals, stable tie order, board/vector cache invalidation, and JSON-safe movement state. Keep core host-free and reuse the unified sprites model.

**Never:** Add a second actor model, queue scheduler, trigger path, renderer dependency, host geometry, or retries beyond one diversion attempt for a blocked path step.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Grid route | Free board, mode 1 or 2 | Stable route of tile-centre points; final point is exact goal | Empty result only when no expanded node exists |
| Blocked goal | Goal overlaps vector/sprite | Route ends at nearest free point with coordinate tie order | `goalAdjusted` records replacement |
| Cap | Search exceeds 1000 expansions | Route approaches best expanded node; `capped` is true | Never expands node 1001 |
| Vector route | Mode 3 with inflated solid vectors | Visibility graph follows valid obstacle corners | Empty route when start/goal has no valid node |
| Sprite diversion | Path step meets blocker | One local route attempt; otherwise existing 120-tick wait then stop/freeze | No repeated diversion for same blocked step |

</frozen-after-approval>

## Code Map

- `packages/core/src/sprites/pathfinding.ts` -- pure pathfinding, fixed-point collision/sweep geometry, cache and result contract.
- `packages/core/src/sprites/movement.ts` -- existing actor phase, queue stepping and R-51 wait/stop branch; consume one diversion before collision resolution.
- `packages/core/src/sprites/runtime.ts` -- existing FIFO enqueue seam; expose path enqueue helper without a second actor model.
- `packages/core/src/world/effects.ts` -- board vector edit effects; invalidate path cache after immutable board replacement.
- `packages/core/src/sprites/index.ts`, `packages/core/src/index.ts` -- public exports.
- `packages/core/test/movement.test.ts`, `packages/core/test/pathfinding.test.ts` -- authored path scenes, per-tick outcomes, ties, cap, cache and snapshot/batching checks.
- `packages/core/test/fixtures/movement/{pathfinding-axial-diagonal-vector,collision-sprite-blocking,movement-tile-pixel}.json` -- authored cases; deferred point-path and diversion cases become exercised here.

## Tasks & Acceptance

- [x] `packages/core/src/sprites/pathfinding.ts` -- implement modes 1/2/3, occupancy, nearest-free fallback, cap, total-order ties, cache and invalidation.
- [x] `packages/core/src/sprites/movement.ts` -- divert one blocked path step and preserve 120-tick wait/stop fallback.
- [x] `packages/core/src/sprites/runtime.ts` -- enqueue path results into the existing FIFO.
- [x] `packages/core/src/world/effects.ts` -- flush cache on vector edits.
- [x] `packages/core/test/pathfinding.test.ts`, `packages/core/test/movement.test.ts` -- drive every authored case and assert per-tick facts, repeated-run hashes and snapshot restore.

**Acceptance Criteria:**
- Given each authored pathfinding scene, when its recorded commands run, then every expected route, expansion count, cap flag, goal adjustment, position and tie order matches.
- Given a board/vector edit, when the same query repeats, then the first unchanged query is a cache hit and the edited query is a miss with the new route.
- Given a blocker on a path, when one diversion is possible, then the route diverts without collision; when none is possible, then it waits 120 ticks and applies the existing stop/freeze result.
- Given different tick batching or a mid-run snapshot restore, when the route continues, then state hashes and outcomes are identical.

## Implementation Notes

- Built against baseline `a3c1a027` using the unified actor FIFO. Modes 1 and 2 use deterministic pixel-grid A*; mode 3 uses the fixed-point visibility graph. All searches enforce actor geometry, nearest-free goals, stable tie order, and `PATH_EXPANSION_CAP = 1000`.
- R-51 diversion runs once per blocked path step, then waits 120 ticks. An unroutable wait expires by clearing the queue and applying the existing freeze fallback; successful diversion routes retain a one-tick completion boundary required by the authored blocker scene.
- Cache keys include board/vector fingerprints and actor/sprite geometry; vector effects and scene transitions explicitly invalidate the cache. Tests cover miss/hit/edit invalidation and JSON snapshot replay.

## Design Notes

The authored oracle establishes the proposed tile-centre convention (x = cell × 32 + 16, y = cell × 32 + 31) and fixed-point polygon semantics. Core mirrors the documented behavior without importing fixture tooling. Cache keys include board/vector identity and actor/sprite geometry; explicit invalidation is also called by vector effects.

## Verification

**Commands:**
- `pnpm typecheck` -- expected: success.
- `pnpm lint` -- expected: success.
- `pnpm test --filter core` -- expected: success.
