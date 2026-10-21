---
title: "Actor, board and game events: fallen, status, leveledUp, enter and leave"
type: 'feature'
ticket: 9
created: '2026-10-19'
status: in-progress
baseline_revision: '4c58aa82c36362e424d90ebb098e99496afc519b'
risk: "medium"
context:
  - "spec - docs/spec/engine/actors.md; emitter section (19.1)"
  - "code - packages/core/src/actors/, packages/core/src/world/"
  - "plan - epic-movement-triggers 5.9 (board edges and transitions)"
---

## Intent

Uses the event bus delivered by Epic 19 and the actor transitions delivered by
20.6. Actors, boards, and the game are separate built-in emitter keys. This
entry connects committed actor transitions to actor events, registers and
unregisters board emitters at board lifetime boundaries, and adds the
engine-phase `beforeEnter` cancelable dispatch without parking the engine.

Actors are registered by 20.4. Core interpretation remains in 20.6 and
package behaviour registration remains in 20.7; this entry owns event
production, board lifecycle, and the engine-phase cancelable seam.

## Boundaries

The implementation MUST use the existing queued event bus for non-cancelable
events and must not duplicate listener tables or invoke listeners through a
synchronous side door. `beforeDamage` remains a battle-thread
`emitCancelable`; this entry only preserves the standard event surface and
does not implement battle rules. TypeScript/native listeners remain ordinary
bus listeners.

### Package and battle prerequisites

This worktree has no stock actor package runtime or package behaviour source,
so the package-owned `stock-rpg.fallen` game bridge remains an explicit
prerequisite rather than a core implementation claim. Likewise, no battle
runtime is present here to send the `beforeDamage` event. The normative
boundary is preserved: core does not add damage resolution or a substitute
engine listener; the stock battle RPGCode thread must later call
`emitCancelable("beforeDamage", ...)` and prove that a listener can change the
damage before the battle applies it.

### Owner decision required before closure

Issue #474 remains open until the owner chooses one of these paths:

1. defer or split the stock actor bridge and battle-thread damage acceptance
   into the package/runtime tickets that provide those implementations; or
2. add the stock actor package and stock battle runtime as explicit
   prerequisites and deliver them before closing this ticket.

This core/board work does not claim either missing acceptance and must not
close or merge #474 on its behalf.

## Key Decisions

1. Actor rule results remain plain transition records. The owner service
   dispatches each committed transition on the actor emitter in result order;
   callers cannot bypass event production through stats aliases, host writes,
   equipment, status, or experience operations.
2. `fallen` and `revived` detail contain `cause` and actor-id-or-null `source`;
   `statusChanged` carries the exact status transition fields; `leveledUp`
   carries level, experience, and applied stat deltas.
3. The core actor owner emits `fallen` only on the actor emitter. The
   stock-RPG package bridge listens to that actor event and emits the
   namespaced `stock-rpg.fallen` event on the shared `game` emitter. Core
   does not emit package-owned game events.
4. A board emitter is registered before its board is observable. Departure
   queues `left` first and defers emitter retirement until that event has
   passed through the shared bus; stale work for the board is discarded, then
   listeners and the emitter root are removed.
5. `beforeEnter` runs in the edges phase with a bounded, synchronous
   engine-phase dispatcher. It runs listeners in registration order, rejects a
   listener that waits as a located runtime diagnostic, and cancellation
   clears the pending exit without parking the engine.

## Acceptance

1. Core actor transitions emit the normative events once per committed
   transition, including isolation between actor emitters. The stock-RPG
   package's namespaced game bridge is a separate package prerequisite, not
   core behavior.
2. Board arrival emits one cancelable `beforeEnter`; cancellation leaves the
   source board/position unchanged. Successful transitions emit one `entered`
   and one `left`, and board unload removes listeners.
3. A damage-taken `beforeDamage` remains a script-thread cancelable event.

## Verification

Consumer tests MUST drive actor owner operations, host/alias writes, real edge
arrival, board unload/reload, listener isolation, and engine-phase cancellation.
Tests MUST assert event details (including nested plain records), one-shot
transitions, registration order, source-board `left` delivery before deferred
retirement, native boolean conversion, and that waiting or over-budget engine
listeners are diagnosed rather than stalling the tick. The stock-RPG
namespaced game bridge and battle-thread `beforeDamage` consumer are not
claimed by this core ticket because neither runtime is present in this
repository; both package implementations are explicit prerequisites for the
remaining game-level and damage acceptance criteria.

## Review triage

The fresh review re-baseline against `fbc2116728754797798bc60b7146c58526b5f1fb`
found these live findings:

| Finding | Route |
| --- | --- |
| `readMember` folded dictionary keys and violated LEX-10 string-key case | fixed in `script/objects.ts`; added object-boundary regressions in `script-dictionary-objects.test.ts` |
| Core emitted the package-owned `stock-rpg.fallen` game event | fixed by removing core game emission; stock package bridge remains an explicit prerequisite because no stock package runtime exists in this repository |
| Board and engine event lifecycle edges | fixed and covered by consumer tests: listener order, source immutability on cancellation, deferred left delivery/retirement |
| Native nested detail and boolean conversion | fixed in `events/native.ts`; consumer details assert nested records and booleans |
| Snapshot validation for `events.retiring` | fixed in `save/snapshot.ts` with malformed-snapshot regression coverage |

The baseline `fbc2116` already produced the deterministic demo closing hashes
`e8a2a7b1b135edab`, `c53f5d15aade14bb`, and `2a1aeccb2d3c1c3f`, while its
checked-in expectation still contained the older values. The expectation was
updated only for those existing checkpoints; no new scenario or behavior was
recorded. The actor/event roots are intentional state from the normative
actor-emitter surface, and the updated baseline preserves the unchanged draw
and pixel hashes.

The same pre-existing baseline drift affects the Basic, Caoquest,
ChimeranEmpire, and FinalDestiny closing records: their current deterministic
state hashes are unchanged by this worktree relative to clean `fbc2116`, but
their checked-in expectations predate the actor/event roots. Recording those
existing checkpoints is justified by the same deliberate actor-emitter state
surface; no new fixture, frame, draw, or pixel baseline is introduced.

## Code Review

### 2026-10-20

**Code review complete.** 2 decision-needed, 0 patch, 0 defer, 5 rejected.

- [ ] [Review][Decision] Stock actor game bridge is not delivered by this worktree — `packages/` contains no stock actor package implementation or `stock-rpg.fallen` producer. `packages/core/src/actors/object.ts` now emits only actor-scoped `fallen`, which is correct ownership, but #474's quest-listener acceptance remains unmet until a stock package `behaviourStartup` bridge emits `stock-rpg.fallen` on `game`. Owner must defer/split this acceptance or provide that package prerequisite.
- [ ] [Review][Decision] Battle-thread `beforeDamage` consumer is not delivered by this worktree — the core contains no battle runtime that sends `emitCancelable("beforeDamage", ...)` and proves listener damage mutation. The normative `actors.md` boundary assigns this to the battle package, so this is an acceptance prerequisite, not a core implementation defect. Owner must defer/split it or provide the battle runtime before closing #474.
- [x] [Review][Patch] Nested native detail keys could lose the string key `__proto__` [packages/core/src/events/native.ts:90-99] — fixed with own-property-safe recursive `Object.defineProperty` construction; `packages/core/test/events-game.test.ts:158-172` now proves the nested key survives without prototype mutation.
- [x] [Review][Patch] Consumer verification initially lacked the complete actor payload contract [packages/core/test/actors.test.ts:338-419] — fixed with source, one-shot count, status expiry/source, revived source/count, and leveled-up experience/applied assertions.
- [x] [Review][Patch] Board lifecycle verification initially lacked an unload/reload fresh-registration assertion [packages/core/test/engine-edges.test.ts:106-125] — fixed with an unload→re-register same-key consumer regression proving stale queued events and listeners do not leak and fresh events still deliver.

**Resolved evidence:** the LEX-10 key-case regression is fixed: `readMember` now performs own-key lookup only (`packages/core/src/script/objects.ts:128-136`), and the focused dictionary suite passes 35/35 with `"Foo"`/`"foo"` separated. Malformed `events.retiring` snapshots are rejected as `ScriptError` `restore.shape` (`the snapshot's events.retiring must be an array`) by `packages/core/src/save/snapshot.ts:570-580`, with regression coverage in `packages/core/test/save-migration.test.ts:209-224`; the prior `TypeError: retiring is not iterable` is no longer reachable through restore validation. Final focused typecheck plus actor/events/edge suites pass 46/46, including normal nested records, actor IDs, deferred `left`, cancellation clearing, waiting/over-budget diagnostics, and unload→re-register listener isolation.

**Verification note:** implementer-reported full gates on the final frozen tree passed (strict 1700/1700, typecheck, lint, build, golden, golden:bun/closing 8/8, graph 8/8, licence 35/35, provenance 56/56 and catalogue); no PNG changes. This review independently reran typecheck plus the final 46 actor/events/edge tests, all passing. The two decision findings remain acceptance blockers; all code and verification patch findings are resolved.

### Rejected

- `false`: the live dictionary key-case regression is not present after the exact-key fix and focused regression tests.
- `false`: malformed `events.retiring` is validated before restore and produces `restore.shape`, not a dispatch-time iterable crash.
- `false`: actor-vs-sprite board detail ownership is not reproduced in the frozen tree; board producers use actor-store IDs (`actorid`) and `readEvent` exposes `actorId`.
- `false`: waiting and over-budget engine listener paths are not unverified; both have focused tests asserting located diagnostics.
- `false`: source-board position/pending-exit cancellation and deferred `left` retirement are covered by the real edge consumer test.

### Follow-up after frozen review

- [x] Recursive native detail conversion now defines each own property safely,
  including nested `__proto__`, without changing the result object's prototype;
  `events-game.test.ts` covers the native listener boundary and prototype
  pollution guard.
- [x] Actor event consumers now assert one-shot fallen delivery, null source
  conversion, status source and expiry, and revived cause/source/count.
- [x] Board lifecycle consumers now assert exact one-shot counts and complete
  actor/board `left` payloads, while retaining cancellation immutability and
  deferred emitter retirement assertions.
- [ ] The stock-RPG game bridge and battle-thread `beforeDamage` consumer remain
  owner decision blockers. This ticket does not close #474 until the owner
  defers/splits those package/runtime requirements or supplies their
  prerequisites.

## Final review disposition after the final freeze

### 2026-10-20 — exact frozen tree

The final review re-baselined the exact frozen worktree at `fbc2116728754797798bc60b7146c58526b5f1fb` on `feat/20-9-actor-events`, against `4c58aa82c36362e424d90ebb098e99496afc519b`. The tree has 18 modified paths (`+572/-98`), no staged or untracked files, and no implementation edits occurred during this review. The implementer's reported final gates are accepted as evidence: strict 1700 with no skips, typecheck, lint, build, golden and golden:bun (closing 8/8), graph (8/8), licence (35/35), provenance (56/56), catalogue, diff-check, and focused actor/events/edge coverage (46/46). This review did not rerun those gates.

The previously actionable findings are resolved in the exact tree:

- [x] Native recursive detail materialization now uses own-property-safe definitions, so a nested own `__proto__` key survives without prototype mutation; the adversarial test covers it.
- [x] Actor transition consumers assert the actor-scoped payloads, source/null conversion at the RPGCode boundary, one-shot fallen/revived delivery, status fields, and leveled-up experience/applied values.
- [x] Board lifecycle coverage asserts cancellation immutability, deferred source `left` delivery and retirement, actor/board `left` counts and payloads, and fresh registration after unload. The stale actor-vs-sprite and edge-lens reports are not reproduced by this tree.
- [x] Exact string-key lookup and malformed `events.retiring` snapshot validation remain fixed.

One current patch finding remains:

- [ ] **[Review][Patch] Native `readEvent` loses boolean/null detail types.** `packages/core/src/events/emitter.ts:nativeField` stores native `boolean` values as VM `1`/`0` and `null` as VM `0`; `packages/core/src/events/native.ts:plainValue` then returns those numbers unchanged because `Value` has no boolean/null representation or type metadata. Consequently a native listener reading actor `statusChanged` receives `expired: 0|1` rather than the documented boolean and a null `source` as `0` rather than `null`. `EventView.detail` is typed as `PlainData`, and `docs/spec/engine/actors.md` declares `expired` boolean and actor `source` nullable. The new actor assertions exercise the RPGCode boundary, where numeric truth values are expected, but no native actor-transition assertion demonstrates this contract. Preserve the native detail types (or record and apply an explicit event-detail schema) and add a native actor-event regression before treating the full cross-runtime event contract as approved.

Legacy virtual-alias coverage is not a second #474 acceptance blocker. The runtime path does pass the actor event sink into `createDefaultVirtuals` through `createScriptServices`; the dedicated alias acceptance belongs to 20.7, while 20.9's acceptance is the actor/board event surface. A direct sinkless alias unit test does not prove the runtime route, so a runtime alias-event assertion is useful follow-up verification, but its absence is not a reason to reject #474's core event implementation.

Two owner-decision blockers remain unchanged and prevent issue completion:

- [ ] **[Review][Decision] Stock actor package bridge:** no stock actor package runtime is present to register `behaviourStartup`, listen on `actor:<id>` for `fallen`, and re-emit `stock-rpg.fallen` on `game`. Core correctly does not substitute this package-owned event.
- [ ] **[Review][Decision] Battle `beforeDamage`:** no battle runtime is present to send the script-thread `emitCancelable("beforeDamage", ...)` event and prove listener-driven damage mutation. Core correctly does not invent a battle implementation.

The reachable core/board implementation therefore merits **scoped approval of the implemented portion**, subject to fixing the native detail typing finding. It does **not** merit approval as a complete #474 delivery: the native contract patch and the two explicitly owner-owned package/runtime prerequisites remain, and #474 MUST stay open until the owner defers/splits those acceptance items or supplies their runtimes. Reports that only restate the stale edge-lens claims above are rejected on the exact frozen tree.

### 2026-10-20 — native metadata re-review

The latest explicit freeze adds `EventsSection.nativeDetails` to preserve native
boolean and `null` values across the legacy VM representation. The focused
typecheck and actor/events/edge/save/dictionary suites pass 94/94, and the
reported full gates remain green. The two owner decision blockers are unchanged:
the stock-RPG `stock-rpg.fallen` bridge and battle-thread `beforeDamage` runtime
are absent.

- [ ] **[Review][Patch] Persisted native detail metadata is not shape-validated.**
  `events.nativeDetails` is serialized state (`packages/core/src/events/model.ts:60-80`)
  and `readEvent` assumes each event entry is a non-null detail record
  (`packages/core/src/events/native.ts:118-125`), but
  `validateEventsShape` does not inspect the field (`packages/core/src/save/snapshot.ts:525-597`).
  Reproduction: queue a native event, set
  `raw.events.nativeDetails[String(eventHandle)] = null`, restore the snapshot,
  then call `readEvent`; restore succeeds and `readEvent` throws
  `TypeError: Cannot convert undefined or null to object`. Add one validator at
  the JSON boundary for the optional map, event-handle keys, and recursive
  `PlainData` values, plus a malformed-snapshot regression. This is a patch
  finding, separate from the two owner acceptance blockers.

The previous native boolean/`null` contract finding is resolved by the metadata
copy and native actor consumer assertions; normal metadata cleanup on delivery,
stale unregister/deferred retirement, and missing-event dispatch paths is covered
by the focused suite.

The ticket remains not approvable as complete until the metadata validation patch
and the two owner decisions are resolved.

- [ ] **[Review][Patch] Engine cancelable wait/budget rejection leaks native detail metadata.** `runEngineCancelableEvent` clears `events.dispatch` after `runEventsPhase` returns with a waiting or over-budget listener, but does not call `forgetNativeDetail` for the rejected event. The event object can then be collected while its `events.nativeDetails[eventHandle]` entry remains in saved state; a reused handle can subsequently expose stale metadata to a later native event. Cleanup must happen on every rejected engine-event path, with a regression covering wait and budget rejection plus sidecar emptiness or handle reuse.

The core/board slice remains scoped rather than complete: the ordinary native bool/null contract is fixed, but the metadata validation and rejected-engine-event cleanup findings remain. The stock actor `behaviourStartup` bridge for `stock-rpg.fallen` and the battle `beforeDamage` runtime remain explicit owner blockers; #474 MUST stay open and MUST NOT be called complete or merged pending those fixes and owner decisions.

### 2026-10-20 — final sidecar-fix re-review

The latest explicit freeze is the exact same HEAD and branch with 18 modified paths (`+845/-104`), no staged or untracked files, and a clean diff check (the branch is reported ahead 1/behind 1 versus `origin/main`). The implementer-reported focused 96/96 and full gates (strict 1702/1702, typecheck, lint, build, golden+Bun closing 8/8, graph, licence, provenance and catalogue) are accepted as evidence; this review inspected the changed code and tests but did not rerun them.

- [x] The rejected engine-event path now calls `forgetNativeDetail` before clearing its dispatch cursor. The new wait and budget regressions assert metadata removal, garbage collection, event-handle reuse and fresh metadata, closing the prior cleanup finding.
- [x] `validateEventsShape` now validates `nativeDetails` handles and recursively validates finite numbers, booleans, strings, nulls, arrays and records; the malformed sidecar regression rejects a null entry at the restore boundary. The prior runtime shape-validation finding is closed.
- [x] The native bool/null sidecar behavior, nested own-property safety, actor payloads, lifecycle cleanup/isolation, exact-key behavior and retiring validation remain intact in this final tree.

One documentation follow-up remains: EMIT-15 in `docs/spec/engine/rpgcode-modules-and-objects.md` still enumerates the saved `events` shape without the now-persisted optional `nativeDetails` map. The runtime sidecar is correctly saved so a mid-dispatch restore can preserve native plain-data types, but the spec should document its optional shape and restore/lifetime rule. This is a documentation consistency item, not a substitute for either owner prerequisite.

The stock actor `behaviourStartup` bridge for `stock-rpg.fallen` and the battle runtime sending script-thread `beforeDamage` remain absent. The core/board implementation and the two sidecar fixes are suitable for scoped approval, but #474 MUST remain open and MUST NOT be called complete, merged or closed until the documentation is reconciled and the owner explicitly supplies or defers/splits those package/runtime requirements.

### 2026-10-21 — restore and rejected-engine cleanup fixes

The two patch findings from the native metadata re-review are addressed in
the current worktree:

- [x] `validateEventsShape` now validates the optional
  `events.nativeDetails` map, positive live event handles, non-null detail
  records, and recursive finite `PlainData` values. The save-migration
  regression proves that a `null` detail entry is rejected as
  `restore.shape` before `readEvent` can run.
- [x] `runEngineCancelableEvent` now forgets the rejected event's native
  detail sidecar before clearing `events.dispatch`. The engine-edge regression
  covers both wait-forbidden and over-budget rejection, asserts sidecar
  removal, collects the rejected event, and proves a reused handle receives
  fresh metadata rather than stale detail.

The stock actor `behaviourStartup` bridge for `stock-rpg.fallen` and the
battle-thread `beforeDamage` runtime remain explicit owner blockers. #474
MUST stay open and MUST NOT be called complete, merged, or closed pending
those owner decisions.

### 2026-10-21 — independent final re-review

The post-validator frozen tree was independently re-baselined at
`fbc2116728754797798bc60b7146c58526b5f1fb`: 18 modified paths, `+845/-104`,
no staged or untracked files, and clean `git diff --check`. Typecheck plus the
actor/events/edge/save/dictionary suites passed **96/96**. The malformed
`events.nativeDetails[<event>] = null` reproduction now fails at restore with
located `restore.shape` (`the snapshot's events.nativeDetails.3 must be an
object`), and the rejected engine-event sidecar cleanup tests pass. No patch
findings remain. The stock-RPG game bridge and battle `beforeDamage` runtime
remain the two owner decision blockers, so #474 is not approved or complete.

The full gate chain also passed: strict **1702/1702** with no skips, workspace
typecheck, lint, build, golden, Bun golden plus closing **8/8**, dependency
graph, licence, provenance, catalogue, and `git diff --check`.
### 2026-10-21 — EMIT-15 saved-events contract reconciliation

The normative EMIT-15 contract now documents the optional
`events.nativeDetails` sidecar: native-only plain-data details keyed by live
event handle, native boolean/`null` preservation and script `Value` behavior,
restore-shape validation, and cleanup for delivery, discard, emitter
unregistration, and rejected engine cancelable events. EMIT-16 now explicitly
refers to this optional schema-v1 sidecar rather than implying a second saved
shape.

The contract-shape impact audit covered snapshot/canon serialization,
restore/migration validation, state hashing, JSON round-trips, save/restore
replay tests, and committed golden/replay fixtures. No native-details-specific
pinned hash, golden, or replay fixture exists, so no fixture regeneration was
required. Focused tests passed 96/96; the full gate chain passed strict
1702/1702 with no skips and all required workspace checks. The stock actor
game bridge and battle-thread `beforeDamage` runtime remain owner blockers;
#474 remains open and is not complete.
