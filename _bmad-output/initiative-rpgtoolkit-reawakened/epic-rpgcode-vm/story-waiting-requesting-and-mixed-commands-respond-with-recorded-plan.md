---
title: 'Waiting, requesting and mixed commands respond with recorded effects'
type: 'feature'
ticket: 22
created: '2026-10-16'
status: built
baseline_revision: 'a66b186c4825f1894dab5ced23465c5e49fd6e67'
route: 'full'
route_source: 'pinned'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: []
review_loop_iteration: 0
context:
  - 'docs/guardrails.md'
  - 'docs/adr/0004-script-ast-step-ir-and-plugins.md'
  - 'docs/spec/engine/rpgcode-errors-and-threads.md'
  - 'docs/spec/engine/rpgcode-functions.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/command-effect-catalogue.json'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Ticket 3.21 makes only the non-blocking catalogue names respond. The remaining 101 names still resolve as unknown commands, so waits, host requests, thread/flow operations and mixed commands cannot be replayed or audited.

**Approach:** Add one catalogue responder plugin through the existing `PluginDefinition.commands` seam. It declares the 101 9.11 names with catalogue parameter metadata, emits named plain-data waits or AD-17 requests, delegates thread/flow operations to existing VM control effects, and records every mixed section/wait/request part in the effect log. Existing real core commands remain authoritative.

## Boundaries & Constraints

**Always:** G1 plain-data state and explicit step-machine execution; G3 injected fixed ticks; AD-8 command results; AD-9 one resolver with deterministic payloads; AD-17 requests and named continuations; preserve snapshot/hash compatibility and existing thread machinery. The 101-name set is the catalogue's non-stub 9.11 rows, excluding six later docs/spec additions.

**Never:** Host I/O, timers, promises, closures or generators in core; direct state mutation from command handlers; generic stubs that silently return for waits/requests/flow; override the existing core implementations of thread, sleep, end, or pure built-ins; change goldens without a deliberate behavior change.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Named wait | Any wait row with valid args | Thread parks with its catalogue wait kind; effect record includes the wait and resumes when injected resolver returns | Unknown resolver kind raises `wait.unknown-kind`; malformed args raise `arity.mismatch` |
| Mixed wait | `wav`, `push`, `prompt`, `dirSav` | Section effects and wait are recorded in stable command/section order; no other thread runs while global wait is active | Invalid duration/metadata is a located `builtin.bad-arg` |
| Request | Each `openFile*` command | AD-17 request record has monotonic reqId and parks caller until recorded reply | Duplicate/unknown replies use existing `request.*` errors |
| Spawn/flow | `run`, `rpgCode`, `branch`, `change`, `done`, `stop` | Existing VM control/thread machinery changes execution; control effect is also auditable | Invalid target/label is a located runtime error |
| Snapshot | Snapshot any named wait or request mid-flight | Restore gives identical canonical state/hash and resumes after the same resolver/reply | Invalid snapshot shape follows existing restore errors |

</frozen-after-approval>

## Code Map

- `packages/core/src/ports/wait.ts`, `script/waits.ts` — extend the discriminated wait contract and resolver registry for the catalogue's named waits while retaining VM-owned sleep/key/movement/request behavior.
- `packages/core/src/script/plugin.ts`, `script/vm.ts` — carry wait/request metadata through `CommandResult`, record wait/request/control and mixed parts as `EffectRecord`s, and preserve global-block semantics.
- `packages/core/src/script/catalogue-responders.ts` — new catalogue-backed `PluginDefinition` for the 101 names, with generated parameter metadata and minimal pure handlers.
- `packages/core/src/script/index.ts`, `script/state.ts` — export the responder plugin and keep all added wait data plain and serializable.
- `packages/core/test/script-catalogue-responders.test.ts`, `script-vm.test.ts` — catalogue-wide resolution, wait/request resume, mixed ordering, flow/thread behavior, resolver errors and snapshot/hash replay.

## Tasks & Acceptance

**Execution:**
- [ ] Extend wait and effect dispatch contracts for named waits/requests without host dependencies.
- [ ] Implement/register the 101 responder commands, excluding commands already owned by core, with section effects, waits, requests and VM control effects.
- [ ] Add deterministic catalogue-wide tests covering every row, resume/reply, mixed ordering, errors and restore.
- [ ] Update exports and document implementation notes; keep catalogue and snapshots compatible.

**Acceptance Criteria:**
- Given every 101 non-stub 9.11 name, when called with valid catalogue arguments, then it resolves through the same plugin seam and either yields its named wait, emits its AD-17 request, uses VM thread/flow machinery, or records all mixed parts.
- Given a test-double resolver or request reply, when the waiting program resumes, then its return/output values and effect records are deterministic.
- Given a mid-wait snapshot, when restored and replayed with the same resolver/reply, then canonical state and hash match uninterrupted execution.
- Given invalid arity, duplicate reply, unknown wait kind, bad duration or target, when executed, then the documented located runtime error is raised without partially recording invalid state.

## Implementation Notes
Implemented:

- Added `CATALOGUE_RESPONDERS_PLUGIN` for the 94 non-core rows in the 101-name 9.11 set; the seven existing core-owned names remain authoritative. `CATALOGUE_PLUGIN` combines the responder and safe-stub layers for the default runner manifest.
- Added saveable named waits (`render.msgbox`, `input.mouse`, `menu.screen`, `audio.sfx`, and `video`), deterministic resolver injection through `advanceScriptTick`, and by-reference wake values.
- VM wait dispatch now records a `wait` effect with the plain wait payload; request records retain monotonic request ids and existing reply semantics.
- Added catalogue-wide, request, mixed movement, resolver resume, obsolete-command, and snapshot/hash tests.

Proposed ruling (pending owner review): catalogue-owned named waits carry `global: true`, a stable command `id`, plain argument `payload`, and ordered `resumeRefs`; evidence is AD-9's single resolver plus the existing global-block rule in `docs/spec/engine/rpgcode-errors-and-threads.md#threads`. Rejected alternative: host-only opaque wait payloads, which cannot be snapshotted or deterministically replayed.

## Verification Notes

- `pnpm typecheck` passed.
- `pnpm test:strict` passed: 853 tests, 0 skipped.
- `pnpm lint`, `pnpm golden`, `pnpm graph`, `pnpm graph:test`, `pnpm licence`, `pnpm licence:test`, `pnpm provenance`, and `pnpm provenance:test` passed.

## Plan Change Log

## Review Triage Log

## Verification

**Commands:**
- `pnpm typecheck` — expected: zero errors.
- `node --test packages/core/test/script-catalogue-responders.test.ts packages/core/test/script-vm.test.ts` — expected: all responder, wait, request and restore tests pass with no skips.
- `pnpm test:strict` — expected: no skipped tests.
- `pnpm lint && pnpm graph && pnpm provenance && pnpm licence && pnpm golden` — expected: all gates pass and goldens remain unchanged.
