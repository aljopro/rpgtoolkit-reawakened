---
title: 'Replay, snapshot, reset and downstream contract sweep'
type: 'feature'
ticket: 12
created: '2026-10-18'
status: done
baseline_revision: '8fabab911dd9905ac4235e3a97e22fe7cb879b9f'
route: 'full'
route_source: 'pinned'
risk: 'high'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context:
  - '/Users/jensen/projects/rpgtoolkit-reawakened/docs/guardrails.md'
  - '/Users/jensen/projects/rpgtoolkit-reawakened/_bmad-output/initiative-rpgtoolkit-reawakened/epic-movement-triggers/discovery/movement-readiness.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 5 has individually tested movement, triggers, input, encounters and animation, but it lacks one closing proof that recorded inputs, snapshots, reset ownership, phase order and downstream data contracts remain compatible together.

**Approach:** Add a closing integration test over the authored movement corpus and reachable demo NPC handoff cases. Reuse canonical hashes, snapshot/restore, existing registration seams and catalogue tooling; document the final handoff shapes without adding movement behavior or a second loop.

## Boundaries & Constraints

**Always:** Use fixed ticks, canonical state/draw hashes, the existing sequence-number input claim protocol, AD-26 phase order, and the Epic 3 VM budget. Keep test oracles independent from `packages/core` where they are authored fixtures. Any contract change is docs-first and any hash pin is deliberate and explained.

**Never:** Do not open or copy `../rpgtoolkit`; do not add a second actor, key-consumption, trigger, cache, reset or VM-budget implementation; do not implement battle resolution, menus/saves, runners or tooling owned by downstream epics.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Same replay, different batching | Fixed stamped inputs; one-tick, fixed-batch and whole-run advances | Every checkpoint has equal state and draw hashes, consumed inputs and explicit outcome facts | Fail with scene/case/tick and first differing hash |
| Restore during movement wait | Snapshot with active queue and waiting thread; continue with same inputs | Fresh and restored runs have equal later state/draw hashes and handoff effects | Fail at first divergent tick; preserve the movement-wait boundary in diagnostics |
| Cache flush | Identical path replay with cache reuse versus explicit invalidation | Positions, events, state hashes and draw hashes are equal | Fail if a cache policy changes observable behavior |
| Reset and lifecycle switch | Dirty sprites, triggers, input and registered extension state; invoke reset/mainFile seam | Owned sections are clean in rank order; RNG and fixed clock policy is preserved; quit emits once | Assert section-specific residue and duplicate registration |

</frozen-after-approval>

## Code Map

- `packages/core/test/movement.test.ts`, `pathfinding.test.ts`, `triggers.test.ts`, `random-encounter.test.ts` -- existing fixture consumers and movement/cache/trigger/battle assertions; extend only where a closing hash or restore invariant is missing.
- `packages/core/test/engine.test.ts` and `packages/core/src/engine/engine.ts` -- fixed AD-26 phases, registration hooks, reset lifecycle, request seam and state hashes.
- `packages/core/src/canon/{canon,log}.ts`, `packages/core/src/save/snapshot.ts` -- canonical input logs, state/draw hashing and complete state migration/restore.
- `packages/core/src/sprites/runtime.ts`, `packages/core/src/sprites/movement.ts`, `packages/core/src/input/registration.ts`, `packages/core/src/triggers/runtime.ts` -- sprite/trigger/input phase and reset registration owners.
- `packages/core/src/script/{packs/movement.ts,catalogue-responders.ts,command-docs.ts}` and `tools/{catalogue,command-docs}` -- ownership and documentation projection checks; generated stubs remain generated.
- `packages/core/test/fixtures/movement/{manifest,demo-npc-pathfinding,demo-npc-battle-trigger,movement-waits}.json` -- authored cases and pinned reachable corpus facts; no hashes are added to the independent oracle.
- `_bmad-output/initiative-rpgtoolkit-reawakened/epic-movement-triggers/epic-movement-triggers.md` -- final battle, menu/save, web replay, tooling and Epic 4 button-slot handoff record.

## Tasks & Acceptance

**Execution:**
- [x] Add closing replay tests that drive owned fixture cases through the real movement/trigger/encounter seams, compare one-tick and batched state/draw hashes, include both demo NPC cases, cache flushes and movement-wait restore.
- [x] Add section-by-section phase/reset registration assertions, including reset and main-file lifecycle seams, duplicate key-consumption prevention, and the landed Epic 3 budget's movement-wait ordering.
- [x] Add explicit catalogue owner resolution coverage for movement/trigger/input names and retain the existing catalogue/docs generators as the source of truth.
- [x] Reconcile the Epic 5 envelope and relevant spec references with battle, menu/save, web runner/input replay, tooling, and Epic 4 button-slot handoffs.
- [x] Remove only obsolete test doubles/comments exposed by the closing sweep; preserve public barrels and avoid unrelated refactors.

**Acceptance Criteria:**
- Given any owned authored scene or reachable demo NPC case, when its fixed input log is replayed under each supported batching policy, then per-checkpoint state/draw hashes and explicit outcomes match.
- Given an active movement wait and queued path, when state is restored and replay continues, then the restored run matches fresh behavior through completion and encounter handoff.
- Given normal versus flushed path caches, when the same inputs run, then no observable state, draw, trigger or battle result differs.
- Given the AD-26 registrations and reset seam, when reset and main-file lifecycle operations run, then sprites, triggers, input and registered extensions reset exactly once in stable rank order and RNG/time policy is preserved.
- Given every Epic 5 movement/trigger/input catalogue name, when the assembled plugins resolve it, then one real owner responds and no duplicate key-consumption path exists; `catalogue:check` and `command-docs:check` remain green.
- Given the Epic 3 budget contract, when movement waits execute, then waits observe completion in the documented phase order without Epic 5 defining a second budget.
- Given downstream consumers, when they inspect the documented handoffs, then battle, menu/save, web replay, tooling, and Epic 4 button slots agree with exported plain-data shapes.

The closing integration coverage lives in `packages/core/test/epic5-closing.test.ts`. It replays `demo-npc-pathfinding` and `demo-npc-battle-trigger` at one-tick and batched cadence, explicitly flushes the pathfinding cache, restores snapshots at multiple ticks, and compares canonical state/draw hashes. No golden hash changed; the new hashes are runtime assertions and do not replace the independent fixture oracle.

`inputResetRegistration` now gives the input owner the same rank-ordered reset seam as sprites and triggers. The test verifies section cleanup, preserved RNG/time policy, AD-26 phase order, and the existing Epic 3 `STEP_BUDGET` value; it does not introduce a second VM budget.

Catalogue ownership is checked against the assembled catalogue and real responder pack for the movement-facing names. Every assembled command has a callable owner, and duplicate names are rejected. Existing `catalogue:check` and `command-docs:check` remain authoritative.

No unruled behavior change was required; therefore no “Proposed ruling (pending owner review)” block or docs-first amendment was opened.

## Plan Change Log

## Review Triage Log

## Design Notes

The independent fixture producer deliberately contains outcome facts but no state/draw hashes. The closing tests consume those facts and pin hashes only for the actual core replay, so a fixture-oracle change cannot make the implementation pass by sharing code.

## Verification

**Commands:**
- `pnpm typecheck` -- expected: all workspaces and test types compile.
- `pnpm lint` -- expected: dependency and ESLint guardrails pass.
- `pnpm fixtures:fetch && pnpm test:strict` -- expected: fetched corpus and strict tests pass.
- `pnpm fixtures:author:check && pnpm fixtures:test` -- expected: authored bytes, provenance and fixture checks pass.
- `pnpm golden && pnpm golden:bun` -- expected: Node/Bun golden outputs match.
- `pnpm graph && pnpm licence && pnpm provenance` -- expected: architecture, licence and clean-room gates pass.
- `pnpm catalogue:check && pnpm command-docs:check` -- expected: generated ownership and docs projections are current.

**Observed:** All commands above passed on the built worktree. `pnpm closing` also passed (8/8 closing baselines; batching 600/30/7 identical), and `git diff --check` reported no whitespace errors. No golden files changed.
