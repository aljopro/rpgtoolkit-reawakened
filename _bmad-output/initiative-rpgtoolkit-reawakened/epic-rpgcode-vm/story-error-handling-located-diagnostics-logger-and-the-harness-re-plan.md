---
title: 'Error handling, located diagnostics, Logger and the harness report change'
type: 'feature'
ticket: '3.7'
created: '2026-10-16'
status: 'draft'
baseline_revision: '5a7ad22679581abdda690a0232f1f1e2208af3dc'
route: 'full'
route_source: 'auto'
risk: 'medium'
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/spec/engine/rpgcode-errors-and-threads.md', '{project-root}/docs/spec/engine/rpgcode-language.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/epic-rpgcode-vm.md']
---

## Questions for the owner

- Approve the stable 3.6 failure codes proposed below: `object.invalid`, `object.abstract-class`, and `object.inaccessible-member`. They are all catchable runtime errors; the alternative (one undifferentiated `object.invalid` code) was rejected because callers and located diagnostics need to distinguish abstract construction and access denial.

<frozen-after-approval reason="human-owned intent — do not modify unless the human renegotiates">

## Intent

**Problem:** The VM currently lets `ScriptError` escape its step loop, has no per-function error-handler state or error-handler syntax, does not turn failures into located host diagnostics, and only has the minimal `warn`/`error` Logger port. The runner-harness driver still rejects non-empty requests and diagnostics, a deferred entry-1.9 finding. Entry 3.6 will raise invalid-object, abstract-class and inaccessible-member failures, so this entry must provide the catchable failure classes and stable codes it consumes.

**Approach:** Make error handling a state-machine operation over `Frame.errorHandler`: lower both modern handler built-ins and legacy `on error` forms into explicit VM operations, catch one failed operation at the current frame, preserve a one-use resume point, and continue or jump according to the active handler without crossing a function boundary. Normalize every catchable `ScriptError` to its instruction location, append a plain `{ code, file, line, message }` diagnostic, and log through an expanded core Logger port without console access. Let the harness observe and accept report requests/diagnostics instead of treating them as impossible.

## Boundaries & Constraints

**Always:** Follow G1's explicit step-machine and plain-data state rules; `Frame.errorHandler` must include handler mode, label/resume location and whether a handler is active. Keep `core` free of DOM, Node, I/O, timers and `console` (G2/G3/AD-24). Use the source position on the failing Step IR operation, falling back to the error's position only when needed. Keep runtime errors catchable and non-fatal: no handler reports and advances to the next VM step; a label handler clears partial operands before jumping; a resume-next handler skips according to the spec. Keep a handler on its function frame until return, never catch a callee failure in the caller, and make `resumeNext()` legal only while handling an error. `debug(false)` suppresses interpreter Logger messages but does not suppress the Reawakened host diagnostic required by AD-24. Preserve `TickReport`'s existing diagnostic shape and make the harness's report observer the non-stateful route for requests/diagnostics. Update all affected callers and tests in one clean cutover.

**Never:** Catch load-time syntax errors; make top-level `setErrorHandler`/`setResumeNextHandler` valid; let a caller's handler catch a nested function failure; store an `Error` object, closure or host sink in saveable state; call `console` from core; add domain object semantics owned by 3.6; implement thread scheduling owned by 3.9; change the golden intentionally; open `../rpgtoolkit` (G7).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Label handler | A function executes `setErrorHandler(:failed)` / `on error goto :failed`, then a failing operation | The failure emits one located diagnostic, partial operands are discarded, and control jumps to the same function's label; handler remains active | Missing or out-of-function label is a catchable runtime error reported at the handler statement |
| Resume-next handler | A function executes `setResumeNextHandler()` / `on error resume next`, then a failing operation | The failure emits one diagnostic, is swallowed, and execution advances to the next VM step; a failed call contributes unset | Handler state remains active until function return |
| `resumeNext()` | Handler label calls `resumeNext()` once | Execution continues after the remembered failing statement and the remembered point is consumed | Calling outside a handler, twice for one failure, or at top level is a catchable runtime error |
| Nested call | A callee fails while the caller has a handler | The callee's handler handles it; otherwise the callee reports and advances; the caller's handler never receives it | One diagnostic at the callee operation; no caller jump |
| Top-level handler attempt | Top-level code calls a handler setter | No handler is installed | The setter itself is a catchable runtime error with its own location |
| Unhandled failure | No active handler in a function or top-level frame | VM continues at the next VM step; the runtime does not stop the thread | One diagnostic, unless the error is a load-time error (which remains load-reported and non-catchable) |
| Debug messages | `debug(false)` followed by interpreter error/warning; then `debug(true)` | Handler behavior and host diagnostics are unchanged; Logger records are suppressed while off and resume while on | Non-interpreter failures remain logged |
| Debugger record | `debugger("text")` | A plain-data Logger record reaches the configured sink with source location and stable code | No console call or host dependency |
| 3.6 object failures | Freed/unknown handle, abstract class, private/inaccessible member | Catchable runtime errors with `object.invalid`, `object.abstract-class`, or `object.inaccessible-member`; unset result where the failure table requires it | Diagnostic includes exact file and line; these codes are the contract consumed by 3.6 |
| Failure-table classes | Wrong script/builtin arity or argument, typed class mismatch, modulo by zero, obsolete/builtin failure | Existing stable `ScriptError` codes are classified as catchable and routed through the same handler/diagnostic path; modulo zero has no value | Ordinary numeric division by zero, sparse missing array and conversion mismatch keep their specified non-error behavior |
| Logger levels and sinks | Records at debug/info/warn/error; one or more collecting sinks | Records stay plain data, preserve level/code/message/data, and reach every configured sink in order | No sink is required inside core; an absent sink is a no-op |
| Harness report | A driver step returns non-empty `requests` and/or `diagnostics` | `runLog` accepts the report and invokes its report observer; existing state/draw records and golden shape remain stable | Driver no longer throws solely for these fields; malformed step invariants still throw |

</frozen-after-approval>

## Code Map

- `packages/core/src/script/errors.ts` — extend the existing `ScriptError` channel with the catchable failure-code/category table, location normalization and diagnostic conversion; include the 3.6 object codes.
- `packages/core/src/script/state.ts` — define the serializable `Frame.errorHandler` modes (`none`, `label`, `resumeNext`) plus active/resume bookkeeping; add the debug-message setting only if required by the settled state contract and migrate its default.
- `packages/core/src/script/ast.ts`, `parse.ts`, `lower.ts`, `ops.ts` and `lex.ts` — parse/lower legacy `on error goto :label` and `on error resume next`, and carry explicit handler operations with `SourcePos`; keep modern `setErrorHandler`, `setResumeNextHandler` and `resumeNext` as language-level calls with the same runtime semantics.
- `packages/core/src/script/vm.ts` — catch errors around one Step IR operation, classify and locate them, route to the current frame only, emit diagnostics/logger records, implement handler transitions and `resumeNext`, and preserve unset/next-step behavior.
- `packages/core/src/script/builtins.ts`, `plugin.ts` and `registry.ts` — register the debug toggle and debugger command through the existing command contract; expose only injected Logger/diagnostic sinks, never host APIs.
- `packages/core/src/ports/logger.ts`, `ports/index.ts` — expand the minimal Logger to `debug`, `info`, `warn`, `error` plain-data records and define the ordered sink/level adapter used by core; update all current warn/error callers.
- `packages/core/src/ports/engine.ts` — reuse the existing `Diagnostic`/`TickReport` contract; add only the VM-to-report drain/typing needed to make every runtime failure visible to the engine.
- `packages/core/test/script-errors.test.ts`, `script-vm.test.ts`, `script-state.test.ts` and registry/logger tests — table-driven handler, failure-class, location, logger and snapshot coverage.
- `packages/runner-harness/src/driver.ts` and `packages/runner-harness/test/driver.test.ts` — accept non-empty report requests/diagnostics through a callback/collector while retaining consumed-input, step-count and loading/paused validation.
- `_bmad-output/initiative-rpgtoolkit-reawakened/deferred-work.md` — move the resolved entry-1.9 driver finding to the resolved evidence section.

## Tasks & Acceptance

**Execution:**

- [ ] Confirm the three 3.6 stable object codes in the checkpoint; record the failure-class table in `errors.ts` tests and the plan's implementation notes before coding.
- [ ] Extend the plain-data Logger port and migrate registry/VM callers; add collecting sinks and tests for level ordering and no-console core behavior.
- [ ] Add handler state and explicit handler operations to the AST/lowering/Step IR; parse both legacy `on error` forms and wire modern handler calls.
- [ ] Implement per-operation error capture, location normalization, diagnostic emission, debug filtering, label/resume transitions and function-frame boundaries in the VM; preserve all failure-table distinctions.
- [ ] Add the debug/debugger built-ins and update script service construction so Logger and diagnostic collection are injected ports.
- [ ] Update the harness driver and tests to accept, observe and preserve non-empty requests/diagnostics; resolve the deferred finding.
- [ ] Add all matrix tests, including synthetic bad programs, nested calls, 3.6 object failure codes, snapshot/restore of active handler state and harness report acceptance.

**Acceptance Criteria:**

- Given a synthetic bad program with a source file and line, when an operation fails, then its handler runs or the VM continues according to the spec and a `TickReport` diagnostic contains exactly `{ code, file, line, message }`.
- Given a function with `setResumeNextHandler` or legacy `on error resume next`, when a statement fails, then execution continues after the failing statement and `resumeNext` behavior is correct across a snapshot/restore.
- Given a nested function failure and a handler in the caller only, when the callee fails, then the caller's handler is not invoked and the callee reports/continues per ERR-1.
- Given invalid handle, abstract-class and inaccessible-member failures from 3.6, when each is raised, then it is catchable with stable codes `object.invalid`, `object.abstract-class` and `object.inaccessible-member`, and its file/line is reported.
- Given `debugger(msg)` and each Logger level, when commands run, then plain records reach the configured sink and no `console` call exists in `packages/core`.
- Given a harness step with non-empty requests or diagnostics, when `runLog` executes, then it accepts the report and exposes it to the observer without changing existing golden state/draw records; malformed reports still fail.
- Given the full core/harness test suite and golden job, when run, then all pass without an intentional golden change.

## Implementation Notes

- **Failure-class proposal for 3.6:** `object.invalid` covers freed handles and unknown classes; `object.abstract-class` covers construction of an abstract class and remains in the failure-table invalid-object family; `object.inaccessible-member` covers private or otherwise inaccessible members/methods. Each is a catchable runtime `ScriptError`, not a load-time error or ordinary conversion mismatch. A single generic code was rejected because stable diagnostics and tests need to distinguish these rows while retaining one handler path.
- **Diagnostic ownership:** the VM collects plain diagnostics on the injected script service/report channel; the engine drains that channel into `TickReport.diagnostics`. Logger records are a separate human/debug channel. A runtime error is therefore both RPGCode-visible and host-visible as AD-24 requires.
- **Harness compatibility:** `runLog` keeps its existing `{ step, state, draw }` golden records and uses an optional observer/collector for report fields, avoiding a golden schema change while making requests and diagnostics available to callers.
- **Checkpoint:** `plan_checkpoint = true`; implementation, verification and status transition wait for owner approval and the stable-code ruling.

## Plan Change Log

- 2026-10-16 — initial plan, derived from epic Done #4, ticket 3.7 description/verify, ERR-1/ERR-2 and the failure table in `docs/spec/engine/rpgcode-errors-and-threads.md`, AD-24, and the deferred entry-1.9 harness finding.

## Review Triage Log

No review has run; this is the plan-checkpoint draft.

## Design Notes

The implementation order is errors/Logger contract first, then parser/lowering and frame state, then VM routing and built-ins, then harness acceptance and the full matrix. The existing `ScriptError` throw sites remain the failure producers; this entry centralizes catch/report behavior rather than converting every producer into a separate result type. The handler state is plain data and is serialized with the frame so a saved mid-handler execution resumes deterministically. Runtime failures from 3.6 must use the proposed codes exactly; 3.7 owns catchability and diagnostics, while 3.6 owns object resolution and access checks.

## Verification

**Commands:**

- `pnpm typecheck && pnpm test && pnpm lint && pnpm graph && pnpm provenance && pnpm licence` — expected: all pass.
- `pnpm fixtures:fetch && pnpm test:strict && pnpm golden` — expected: pass with no intentional golden change and no tracked golden diff.
- `grep -rn "console\." packages/core/src` — expected: no matches.
- `grep -rn "object\.invalid\|object\.abstract-class\|object\.inaccessible-member" packages/core packages/runner-harness` — expected: all three codes are defined and exercised by tests.

**Manual checks:**

- Compare each failure row against `docs/spec/engine/rpgcode-errors-and-threads.md#error-handling`, including the distinction between catchable modulo-by-zero and non-error numeric division by zero.
- Run the synthetic program through a handler and an unhandled failure, and inspect both the handler continuation and the exact file/line diagnostic.
