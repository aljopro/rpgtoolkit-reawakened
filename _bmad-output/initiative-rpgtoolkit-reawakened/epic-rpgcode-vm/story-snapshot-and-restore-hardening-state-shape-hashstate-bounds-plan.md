---
title: 'Snapshot and restore hardening: state shape, hashState, bounds, mismatch policy'
type: 'feature'
ticket: 11
created: '2026-10-16'
status: 'built'
baseline_revision: '536f33051b503ed5da72c2ce1a55ef8ab0402ce2'
route: 'full'
route_source: 'pinned'
risk: 'high'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context: ['docs/guardrails.md', 'docs/spec/formats/save-game.md', 'docs/spec/engine/rpgcode-modules-and-objects.md', 'packages/core/src/save/snapshot.ts', 'packages/core/src/script/vm.ts', 'packages/runner-harness/src/script-host.ts']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Snapshots currently canonicalise without a deterministic depth bound or efficient dense-array validation, restore accepts malformed state beyond section presence, and source changes throw `restore.source-changed` instead of following the documented restart policy. The VM-backed host already computes hashes, but snapshot/restore hardening must make those hashes and limits reliable for every synthetic program.

**Approach:** Harden `canon` with a fixed, documented nesting limit and allocation-light array checks, validate restored state shape before returning it, and make restored file-backed threads restart from source when compiler/source hashes no longer match. Add state-hash and deep-value tests across core and harness without changing goldens.

## Boundaries & Constraints

**Always:** G1 plain-data state and explicit step-machine execution; G3 deterministic errors and hashing; snapshot remains canonical RFC 8785 JSON; restore accepts only the current compiler/schema shape or documented migrations; restart must discard stale frames and start the affected thread at source, not resume old instruction offsets; cite `docs/spec/formats/save-game.md#layout-minor-4` and AD-7.

**Never:** read or copy `../rpgtoolkit`; add asynchronous or host access to core; alter golden fixtures; silently ignore malformed state, source absence, or unrelated runtime errors; change legacy save binary layout.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Round-trip | Any synthetic VM state, including partial operands and modules | `canon(restoreGameState(snapshot(state)))` and `hashState` are identical | Shape errors name `restore.shape` |
| Deep value | Script-created nesting beyond the supported bound | Fails before host stack overflow with the same documented `TypeError` on every runner | Stable depth-limit error |
| Source changed | Restored file `ProgramRef.sourceHash` differs from loader bytes | Thread restarts at source with fresh frame, preserving thread identity and state ownership | Emits/records `restore.source-changed` policy only; missing source remains `program.missing` |
| Compiler mismatch | Snapshot compiler differs | Refused before VM payload is used | `restore.compiler-mismatch` |

</frozen-after-approval>

## Code Map

- `packages/core/src/canon/canon.ts` -- canonical serializer and `hashState`; add explicit depth and allocation-conscious dense-array checks.
- `packages/core/src/save/snapshot.ts` -- JSON parsing, migrations and section checks; validate complete current state shape and bounded plain data.
- `packages/core/src/script/program.ts` -- source-hash guard for file programs; preserve mismatch signal for the VM restart path.
- `packages/core/src/script/vm.ts` -- compile restored frames, restart file-backed threads on source/compiler mismatch, and keep deterministic state transitions.
- `packages/core/src/script/state.ts` -- ensure restart can rebuild a thread's root frame without losing id/kind/owner metadata.
- `packages/runner-harness/src/script-host.ts` -- retain `hashState` on every advance report and restore with the same loader/plugin context.
- `packages/core/test/{canon,script-state,script-vm}.test.ts`, `packages/runner-harness/test/script-host.test.ts` -- round-trip, bound, mismatch and per-advance hash coverage.

## Tasks & Acceptance

- [x] Harden canonicalisation and restore validation with fixed depth/shape limits; preserve existing migrations and error codes.
- [x] Implement source/compiler mismatch restart for restored file threads; ensure inline programs and ordinary runtime failures retain current behavior.
- [x] Keep `advance` reports state-hashed and add regression tests for every matrix row and all synthetic program shapes.


**Acceptance Criteria:**
- Given every committed synthetic program, when a random-step snapshot is restored into a fresh VM, then final and per-tick state hashes match exactly.
- Given a value deeper than the supported nesting limit, when canonicalised or snapshotted, then every runner returns the same documented error rather than `RangeError`.
- Given a restored file thread whose source hash or compiler differs, when the VM advances, then it starts from current source with a fresh frame and no stale instruction pointer.
- Given unchanged goldens, when all project gates run, then no golden file changes and strict tests have zero skips.

## Implementation Notes


## Plan Change Log


## Review Triage Log


## Design Notes

A restart keeps the saved thread's `id`, `kind`, `owner`, `source`, `target`, queues and wait metadata, but replaces stale execution frames with one fresh root frame compiled from the current `ProgramRef`; this matches the saved-game specification's allowance to restart saved threads when serialized instruction positions cannot be mapped.

**Proposed ruling (pending owner review):** canonical state values are limited to
`CANON_MAX_DEPTH = 256` container levels, with a deterministic `TypeError` before
host recursion can overflow. This keeps the bound far below the approximately
3,900-level stack failure observed in the ticket context and applies equally to
`snapshot`, `hashState` and draw-list hashing through `canon`. The rejected
alternative is an unbounded serializer, which leaves runner behaviour dependent
on JavaScript engine stack limits.

## Verification

**Commands:**
- `pnpm typecheck` -- expected: all project references and test fixtures compile.
- `pnpm lint` -- expected: guardrails and provenance checks pass.
- `pnpm test:strict` -- expected: all tests pass with zero skips, including snapshot, mismatch and bounds regressions.
- `pnpm golden` -- expected: existing golden files remain unchanged.
- `pnpm graph && pnpm provenance && pnpm licence` -- expected: all gates pass.
