---
title: 'Board edges and transitions'
type: 'feature'
ticket: 9
created: '2026-10-18'
status: done
route: 'full'
route_source: 'pinned'
baseline_revision: 'd53cdd804d5f93525c2aa4e444bc848e75f550a5'
risk: 'high'
context:
  - 'docs/spec/engine/movement-and-collision.md#e-19'
  - 'docs/spec/engine/movement-and-collision.md#e-28'
  - 'docs/spec/engine/movement-and-collision.md#e-47'
  - 'docs/spec/engine/movement-and-collision.md#e-48'
  - 'docs/spec/engine/movement-and-collision.md#r-53'
  - 'docs/spec/engine/main-loop-and-startup.md#reawakened-board-entry'
---

## Intent
Complete edge/link movement and board-entry lifecycle over Epic 4's boot and `send` seams.

## Boundaries
Own the `edges` phase, no-link blocking, board and `.prg` links, R-53 arrival alignment/refusal, board-entry lifecycle, destination trigger deactivation, camera/music/path-cache handoff and old-board thread cleanup. Do not own save loading, battle resolution, audio synthesis, runners or editor behavior.

## Code Map
- `packages/core/src/engine/engine.ts`: owns the engine's built-in `edges` phase. It resolves pending player exits, test-loads linked boards, rejects invalid/solid arrivals without replacing the source board, runs program links, clears path caches, resets destination trigger state, posts placement/camera/music effects, stops old board/item threads and starts destination threads/enter programs.
- `packages/core/src/sprites/movement.ts`: exports the existing fixed-point solid-vector collision test for destination arrival and completes an edge exit as a blocked movement step while retaining its pending direction for the edges phase.
- `packages/core/src/sprites/runtime.ts`, `packages/core/src/triggers/model.ts`, `packages/core/src/script/state.ts`: existing lifecycle and state seams reused; no second actor, trigger or thread model is introduced.
- `packages/core/test/fixtures/movement/{edges-board-link-program,board-entry-thread-lifecycle}.json`: authored oracle cases and per-tick facts consumed by fixture checks.
- `packages/core/test/engine-edges.test.ts`: drives all six edge fixture cases through the real core `edges` phase and checks one-tick versus batched advancement.

## Design
The movement phase records `pendingExit`; the built-in edges phase handles it after movement and before triggers. Empty links clear the pending exit and leave the player in place. `.prg` links start a blocking file program without changing boards. Board links resolve and load the destination before any source-board mutation, calculate the opposite-edge innermost coordinate, clamp the continuous along-edge coordinate, and reject if no valid range or a destination solid vector blocks the collision base. Successful arrivals use the existing board-entry sequence, including persistent-thread preservation, board/item-thread shutdown, trigger reload/deactivation, camera realignment, music effect and path-cache invalidation. `send` continues through the existing between-tick transition path.

## Proposed ruling (pending owner review)
- **P-11 (unverified default):** destination board items are owned by the existing sprite runtime hydration seam; this entry stops every old visible item's multitask thread but does not invent actor-file loading inside the engine. Evidence: AD-32 and `SpriteRuntime.hydrate` already own actor hydration; rejected alternative: a second engine-local item loader that would duplicate the runtime and require host asset policy.

## Acceptance case table
| Case | Core assertion |
| --- | --- |
| `no-link-edge-is-solid` | Player remains on source board; pending edge clears and no destination lifecycle runs. |
| `board-link-arrives-opposite-edge` | Destination arrives at continuous opposite edge, trigger under arrival is deactivated, and entry runs. |
| `arrival-clamps-along-edge` | Along-edge coordinate is clamped to the destination collision-safe range without grid snapping. |
| `blocked-arrival-is-refused` | Solid destination rejects arrival; source board, position and remaining queue stay intact; no old/new threads change. |
| `program-link-runs-program` | `.prg` edge link runs a blocking program and does not load a board. |
| `west-edge-arrives-east-edge` | West exit mirrors to the destination's east innermost coordinate. |
| `send-from-blocking-thread` | Send swaps between ticks, stops old board/item threads, preserves persistent threads, starts destination threads then enter, and resumes caller. |
| `send-from-board-thread` | Board caller dies with the old board and destination enter becomes blocking when no blocker survives. |
| `second-send-replaces-first` | Later send in the same tick replaces the earlier request. |

## Verification
Run the complete repository gate set: typecheck, lint, fetched strict tests, authored-fixture check/test, golden (Node and Bun), graph, licence, provenance, catalogue and command-doc checks. `golden/regression/closing.json` was deliberately re-recorded: board-entry trigger reload now preserves the destination `deactivateat` marker through the first triggers phase (the previous implementation reset it immediately), so state hashes changed for the scripted board-entry corpus at later checkpoints; draw and pixel hashes did not change.
