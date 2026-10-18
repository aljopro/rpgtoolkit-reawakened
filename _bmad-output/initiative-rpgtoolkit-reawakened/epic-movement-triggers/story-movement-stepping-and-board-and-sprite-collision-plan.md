---
title: 'Movement stepping and board and sprite collision'
type: 'feature'
ticket: 4
created: '2026-10-18'
status: 'built'
route: 'full'
route_source: 'pinned'
baseline_revision: '97333859'
risk: 'high'
context:
  - 'docs/spec/engine/movement-and-collision.md#e-22'
  - 'docs/spec/engine/movement-and-collision.md#e-26'
  - 'docs/spec/engine/movement-and-collision.md#e-27'
  - 'docs/spec/engine/movement-and-collision.md#r-50'
  - 'docs/spec/engine/movement-and-collision.md#r-51'
  - 'docs/spec/engine/movement-and-collision.md#r-54'
---

## Intent
Advance actors through deterministic queues and resolve board/sprite collisions under the approved movement rulings.

## Boundaries
Own movement-phase registration, queue stepping, speed conversion, collision response and actor movement state. Do not implement pathfinding search, trigger dispatch, input bindings or compositor ordering.

## Key Decisions
All time comes from `core/time`; geometry is fixed-point and total-ordered; direct sprite collision freezes the loser for 120 ticks; path-following collision waits and stops after the documented default timeout, while diversion remains entry 5.5. Movement state is saved inside the existing unified actor model, not a second runtime model.

## Code Map
- `packages/core/src/sprites/model.ts`: extends the unified actor with resumable active-step, cadence, pending-edge and under-vector state while retaining the sprites section schema for additive compatibility.
- `packages/core/src/sprites/movement.ts`: owns R-50 cadence conversion, direction/waypoint queue stepping, fixed-point polygon/vector collision, R-54 one-turn wall sliding, stairs/under transitions, R-51 direct collision total order, freeze/thaw and plain movement event records. `movementPhaseRegistration` supplies the AD-26 movement registration.
- `packages/core/src/sprites/index.ts`: publishes the movement owner beside the existing actor runtime.
- `packages/core/src/save/state.ts` and `packages/core/src/save/snapshot.ts`: preserve the existing schema contract; movement normalisation supplies defaults for older actor records so mid-step restore is deterministic.
- `packages/core/test/movement.test.ts`: drives the real core through cadence, solid collision, sprite freeze and snapshot/restore cases.
- Reuse the existing `SpritesSection`, `SpriteQueue`, `WorldBoard` and engine `phaseRegistrations`; do not add a parallel actor model or host timing API.

## Proposed ruling (pending owner review)
- **P-5/P-16 boundary:** waypoint/path actors wait for a blocker and stop after 120 ticks; they do not perform diversion here. Evidence: R-51 explicitly assigns diversion to entry 5.5 while item 4 documents the 120-tick fallback. Rejected alternative: silently adding a pathfinder to this entry, which would duplicate entry 5.5 and make ownership/order ambiguous.
- **tile-game-speed-clamps-to-one-tick:** Core disagreed at the queued-step boundary (it advanced the next target one tick early); R-50 item 4 requires the first advance on the move-start tick and the fixture's P-1 cadence ruling requires the queued step's cadence slot, so core cadence changed from `ticksPerAdvance - 2` to `ticksPerAdvance - 1`. The fixture remained unchanged.
- **queue-clear-and-append:** Core left the active step running after `tkMV_CLEAR_QUEUE`; E-22 says clear drops the queue before appending, so core now clears the active move and starts the replacement command immediately. The fixture remained unchanged.
- **tile-solid-blocks:** Core emitted `blocked` but then applied the blocked position because the solid-vector branch did not return; E-26 requires a solid to block the step, so core now returns after the blocked event. The fixture remained unchanged.
- **pixel-glancing-slide:** Core could not identify a closed vector edge when the vector edge lay inside the swept collision base; R-54 requires an edge-based slide, so core now considers closed-vector closing edges and overlapping edges. The fixture remained unchanged.
- **pixel-glancing-slide facing (pending owner review):** The fixture shows the one-turn slide as `S` for the slide tick but restores the original `SE` facing when the subsequent step blocks. R-54 specifies candidate order and step facing but does not explicitly state post-slide blocked-facing persistence; core preserves the original active-step facing for the subsequent block. This is a proposed ruling pending owner review.

## Implementation
1. Store the active target, start point, cadence and collision wait in the existing actor section.
2. Convert speed and game speed with integer R-50 arithmetic; advance 4 board pixels at each cadence slot, with first advance on the starting tick.
3. Test actor bases against ordered board vectors and same-layer sprite bases. Apply solids, stairs, under transitions, player edge records and one deterministic R-54 slide candidate order.
4. Resolve sprite collisions by stationary/player/speed/drawId total order; freeze losers through tick `collisionTick + 120`, leaving queues and positions unchanged.
5. Export movement registration and focused tests; normalise pre-movement actor records without introducing a second schema version.

## Acceptance
Fixture-facing movement contracts are covered by real-core tests for every in-scope case in the three authored movement scenes, asserting every recorded tick and expected event. The four diversion/path cases remain deferred to entry 5.5. Equal cases use drawId order; no wall-clock or host API is used.

## Verification
Executed: `pnpm typecheck`, `pnpm lint`, `pnpm fixtures:fetch`, `pnpm test:strict`, `pnpm fixtures:author:check`, `pnpm fixtures:test`, `pnpm golden`, `pnpm golden:bun`, `pnpm graph`, `pnpm licence`, `pnpm provenance`, `pnpm catalogue:check`, and `pnpm command-docs:check`. All passed; no golden files changed. `packages/core/test/movement.test.ts` iterates every case and asserts every per-tick actor row plus expected events, skipping only `point-path-straight-line`, `diversion-around-blocker`, `no-route-waits-then-continues`, and `no-route-wait-expires-and-stops`, all owned by entry 5.5.
