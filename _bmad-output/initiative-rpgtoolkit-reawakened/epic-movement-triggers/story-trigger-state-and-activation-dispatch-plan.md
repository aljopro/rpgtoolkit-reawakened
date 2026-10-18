---
title: 'Trigger state and activation dispatch'
type: 'feature'
ticket: 8
created: '2026-10-18'
status: 'built'
baseline_revision: 'd53cdd804d5f93525c2aa4e444bc848e75f550a5'
risk: 'high'
context:
  - 'docs/spec/engine/movement-and-collision.md#e-40'
  - 'docs/spec/engine/movement-and-collision.md#e-44'
  - 'docs/spec/formats/board.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-movement-triggers/discovery/inception-proposal.md'
---

## Intent
Implement deterministic board/item activation and trigger lifecycle in the triggers section.

## Boundaries
Own trigger state, candidate selection, conditions, repeat/armed state, gone suppression and trigger-phase program starts. Do not own VM frames or battle resolution.

## Key Decisions
Filter layer and condition before selection; items precede regions; use compact item indices and approved board order; set-after occurs only after successful completion; trigger-owned movement is silent.

## Acceptance
Fixtures prove step/key/repeat, item precedence/frontness, layer matching, conditions, stop movement, gone scope, run-once and re-arm behavior.

## Verification
Trigger phase tests, blocking-program integration, catalogue checks and snapshot/reset coverage.
 
## Implementation

- `packages/core/src/triggers/model.ts` owns schema v2 (`fired`, repeat distance, gone/deactivate scopes, active blocking thread, and silent movement state); `save/snapshot.ts` migrates the former empty placeholder and normalises pre-v2 movement completion fields.
- `packages/core/src/triggers/runtime.ts` owns the `triggers` phase and reset registration. It filters layer, visibility/loading, geometry, condition, suppression and run-once state before selecting items (frontness, distance, compact runtime index) and then the last qualifying region in stored order. Programs start through `startThread` as the single blocking thread.
- `packages/core/src/sprites/movement.ts` records the fixed-tick completion and distance needed by repeat-distance dispatch. The engine effect bus routes `gone` and `deactivateat` to the trigger owner.

## Acceptance case table

| Case | Core assertion |
| --- | --- |
| Step-on once per entry and re-arm | `fired` blocks an in-area repeat and is deleted when the actor leaves; the next step-on starts the program again. |
| Repeat distance | A repeat candidate accumulates completed movement distance and starts only at its configured threshold. |
| Key press versus step-on | New input key sequence dispatches key candidates; a key event does not dispatch step-only candidates. |
| Layer matching | Candidate geometry on another layer is excluded. |
| Layer-one player fires | A player on layer one matches a layer-one candidate. |
| Last region in board order | Among qualifying regions the final stored board index wins. |
| Item precedence/frontness/nearest/index | Items beat regions; frontness, squared fixed-point distance, then compact index determine the item. |
| Condition failure fall-through | A failed condition is removed before selection and does not consume a candidate. |
| Run-once condition before set-after | Condition is checked against pre-run globals; final variable is written only after the blocking thread completes. |
| Aborted program does not set | No final assignment is made until the blocking thread reaches `finished`. |
| Stop movement | Item activation clears player movement; a stop region clears movement. |
| Gone scope | `gone` suppresses only the active key until board leave/reset. |
| Silent trigger movement | Trigger-owned movement is held behind `silentUntilIdle`, preventing retrigger while it drains. |
| Hidden loading item | Invisible item actors are not candidates and cannot start multitask threads. |

Unruled detail: **Proposed ruling (pending owner review):** repeat counters use the fixed-point Euclidean distance of each completed movement target and are reset when the repeat trigger starts. Evidence: R-50's fixed-tick movement completion and the board repeat-distance field; rejected alternative: wall-clock elapsed distance, which is nondeterministic and does not survive snapshots.

## Verification record

 
The deliberate G5 hash drift is the save-schema addition (v2 trigger state plus movement completion fields), not a renderer change. Re-recorded program hashes are: `sample-start-demo=60b9d135ecc2665c`, `sample-system-demo=c70da0e285468911`, `sample-sys-test-demo=c70da0e285468911`, `sample-win-demo=d1a2feea4d6699d3`, `sample-oldman-demo=148143e8efdad422`, `sample-man-demo=91341281743ee68f`, `sample-man-wander-demo=1eda27c040030408`, `sample-start-basic=4aead264e9d81fc0`, `sample-system-basic=c70da0e285468911`, and `sample-wander-basic=249a5a6f76a4cb12`. The demo closing checkpoints changed at ticks 30/60/90/120/600 to `92f8e6bfa54c0fd0`/`8054d17ab201596f`/`ae21fde99bccf982`/`4e134d6c1224c168`/`2ec19e22449707d0`; draw and pixel hashes were unchanged.
The core acceptance tests are in `packages/core/test/triggers.test.ts`; snapshot/reset coverage is included alongside dispatch coverage. Renderer draw and pixel outputs remained unchanged.
