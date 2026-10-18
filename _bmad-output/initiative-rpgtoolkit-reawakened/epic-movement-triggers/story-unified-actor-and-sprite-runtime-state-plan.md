---
title: 'Unified actor and sprite runtime state'
type: 'feature'
ticket: 3
created: '2026-10-18'
status: 'built'
baseline_revision: 'd53cdd804d5f93525c2aa4e444bc848e75f550a5'
risk: 'high'
route: 'full'
route_source: 'pinned'
context:
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-10, AD-32'
  - 'docs/spec/engine/movement-and-collision.md#e-20'
  - 'docs/spec/engine/movement-and-collision.md#e-21'
  - 'docs/spec/engine/movement-and-collision.md#r-50'
  - 'docs/spec/engine/movement-and-collision.md#r-51'
  - 'docs/spec/engine/movement-and-collision.md#r-52'
  - 'docs/spec/engine/movement-and-collision.md#r-53'
  - 'docs/spec/engine/movement-and-collision.md#r-54'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/epic-board-rendering.md'
---

## Intent
Turn hydrated character/item data into one plain-data Unified Actor runtime and supply the engine's sprite-facing ports.

## Boundaries
Own `sprites`, actor runtime state, selected player, queues/waypoints, SpriteDraw production, CameraTarget and PlayerPresencePort. Do not own board geometry, compositor sorting, party roster operations or save blobs.

## Key Decisions
Use compact runtime item indices; preserve actor hulls and animation references; schema-version the section; keep prior positions presentation-only.

## Acceptance
Board hydration creates deterministic players/items, snapshot/restore preserves state, draw IDs obey Epic 4's order, camera/player-presence ports read the same actors, and startup/reset seams use the published ports.

## Implementation

### Code map

- `packages/core/src/sprites/model.ts` defines schema v2 plain-data actors, transform/facing/visual state, collision and activation bases, movement queues, waypoint links, selected-player identity, and compact item handles.
- `packages/core/src/sprites/runtime.ts` hydrates players/items from the world board, compacts sparse item slots, applies loading visibility, starts/stops item-owned multitask threads, produces player-before-item `SpriteDraw` records, and implements `CameraTarget`, `PlayerPresencePort`, and reset seams.
- `packages/core/src/sprites/index.ts`, `packages/core/src/index.ts`, and `packages/core/src/save/sections.ts` publish the runtime without a second state model.
- `packages/core/src/save/state.ts` and `packages/core/src/save/snapshot.ts` use schema v2 and migrate the previous placeholder section before validating/restoring state.
- `packages/core/src/engine/engine.ts` consumes runtime draws and ports and resets sprite state through the engine lifecycle seam.
- `packages/core/test/sprites-runtime.test.ts` covers deterministic hydration, compact handles, item thread ownership, draw ordering, and snapshot hash round-trip.

### Implementation notes

The runtime preserves the specification's actor defaults: rectangular collision and activation bases for orthogonal boards, deterministic facing/visual defaults, and board-item loading visibility. Item actor indices are compacted after filtering empty slots; handles are allocated in compact order. Item multitask threads use the existing VM item-owner convention (`item:<source>`) so hide/remove operations stop only their owner thread. Runtime draw IDs are stable category-local indices with players emitted before items, matching the Epic 4 compositor contract. The save migration accepts the prior empty `sprites` placeholder and writes schema v2. Because `createGameState` now materializes the schema-v2 section instead of `{}`, state hashes intentionally changed; fetched-corpus expectations and committed golden/closing records were regenerated.

## Verification

Unit and integration tests cover hydration, selected-player lookup, state hash, migration/restore and SpriteDraw/CameraTarget contract behavior. Executed checks are recorded with the implementation result: typecheck, lint, the strict fixture-backed test suite, golden render checks, dependency graph, licence, provenance, and catalogue checks.
