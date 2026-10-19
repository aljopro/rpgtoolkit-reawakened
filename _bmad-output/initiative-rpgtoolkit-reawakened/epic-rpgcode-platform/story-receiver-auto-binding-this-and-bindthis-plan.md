---
title: "Receiver auto-binding, this and bindThis"
type: 'feature'
ticket: 4
created: '2026-10-19'
status: done
baseline_revision: 'd5564edfe11da102e931151de74c34e47ee3ab8e'
route: 'full'
route_source: 'auto'
risk: "high"
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context:
  - "docs/guardrails.md"
  - "docs/spec/engine/rpgcode-modules-and-objects.md"
  - "docs/adr/0004-script-ast-step-ir-and-plugins.md"
  - "docs/adr/0009-compatibility-layer-not-the-model.md"
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Callable records already carry a nullable receiver, but the compiler emits an unbound member read, invocation does not install `this`, collection ignores receiver edges, and no `bindThis` command exists. Consequently dictionary methods cannot be safely torn off, called through `d.fn()`, saved/restored, or kept alive by their callable alone.

**Approach:** Add a real `OP_GET_MEMBER_BOUND` step for dot/arrow reads, binding only receiver-less callables; make callable invocation install the receiver frame context; add `bindThis(fn, obj)` as a new documented core builtin; and include callable receiver handles in reachability and restore validation.

## Boundaries & Constraints

**Always:** Preserve non-null receivers through member reads; standalone lambdas expose `this = null`; all runtime failures are catchable `ScriptError`s with source positions; dictionary member calls dispatch callable values; state remains plain JSON and legacy implicit-method dispatch remains unchanged.

**Never:** Do not realign legacy classes (ticket 19.5), add namespace/package dispatch (19.7), mutate the original callable in `bindThis`, or introduce a second object/runtime representation.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Dictionary method | `d={n:2, f:()=>this.n}; d.f()` | Returns 2; direct call and tear-off retain receiver | No error |
| Rebind | `g=bindThis(d.f, e)` | New handle has `receiver=e`; `d.f` is unchanged | No error |
| Standalone | `f=()=>this` | `this` is null/unset per value rules | No error |
| Invalid bind | `bindThis(1, d)` or `bindThis(f, 1)` | Statement fails at call source line | Catchable located `callable.not-callable` / `object.invalid` |
| Collection/restore | Only a reachable callable names object receiver | Receiver object survives collection and restored handle reproduces it | Malformed/unknown handle remains typed |

</frozen-after-approval>

## Code Map

- `packages/core/src/script/ops.ts` -- add the explicit bound-member step variant and stack effect.
- `packages/core/src/script/lower.ts` -- emit the bound step for member reads and retain direct method-call lowering for legacy methods.
- `packages/core/src/script/vm.ts` -- execute bound reads, dictionary callable method calls, install callable receivers in frames, implement `bindThis`, and include receiver edges in object reachability.
- `packages/core/src/script/cells.ts` and `packages/core/src/script/restore-check.ts` -- walk receiver-bearing callables for collection and program-aware restore checks.
- `packages/core/src/script/builtins/pure.ts`, `builtins.ts`, `docs/spec/engine/rpgcode-functions.md`, and catalogue metadata -- register and document `bindThis`.
- `packages/core/test/` -- IR, runtime, error, GC, save/restore, and authored dictionary smoke coverage; reuse existing `makeState`/`advanceOrFail` helpers.

## Tasks & Acceptance

**Execution:**
- [x] Add `get_member_bound`/`OP_GET_MEMBER_BOUND` stack semantics and compiler emission for `.`/`->` reads.
- [x] Bind callable values without overwriting existing receivers; dispatch dictionary `d.fn()` through the callable path.
- [x] Apply receiver context to callable frames so `this` reads the object, and add the pure-data `bindThis` command with validation.
- [x] Treat receiver handles as object roots and preserve them through save/restore validation.
- [x] Register docs/catalogue metadata and add focused tests plus an authored VM smoke fixture.

**Acceptance Criteria:**
- Given a dictionary callable member, when read through dot/arrow or called directly, then the IR contains `OP_GET_MEMBER_BOUND` for reads and invocation returns with the correct receiver.
- Given a tear-off or explicit rebind, when called, then the original receiver is retained unless `bindThis` creates a new handle.
- Given a standalone lambda, when it reads `this`, then it observes null/unset; invalid bind arguments produce located catchable errors.
- Given a callable is the sole reachable reference to its receiver, when collection and JSON restore run, then the object and receiver field remain valid.
- Given the new builtin is registered, when catalogue and command-doc checks run, then both pass.

## Implementation Notes
Implemented the explicit bound-member op and receiver-aware invocation in the VM. Dictionary direct calls and bracket reads use the same callable path; callable receiver handles are traversed as object roots, and restored receivers are checked against the object table. `bindThis` is a pure-data core command with OOP-11 documentation.

Verification completed in the isolated worktree: install and fixture fetch succeeded; typecheck, lint, strict tests, both golden runners, graph, licence, provenance, catalogue, command-docs, and oracle checks passed. The authored VM smoke returned direct=4, rebound=9, original=4 and retained two objects.

## Plan Change Log

- 2026-10-19 — Closed via PR #294, merged to `main` at `89a4f293865e11f6d4ac185d08c65274c5f0f2b5`. Status set to `done` with `tickets.py mark`.

## Review Triage Log

- 2026-10-19 — Independent review of PR #294 at head `6145b09960d92c10c2504d99ce91906f29ed0312`: **APPROVE, no findings**.

## Design Notes

`methodCall` remains the legacy class path; its VM branch must recognize dictionary records and forward the stored callable to `performCallable`, preserving source locations. Bound member reads return a copied callable record, so all state remains serializable and no host closure is introduced. Receiver roots are discovered from every reachable callable, including nested captures and object members.

## Verification

**Commands:**
- `pnpm install`, `pnpm fixtures:fetch`
- `pnpm typecheck`, `pnpm lint`, `pnpm test:strict`
- `pnpm golden`, `pnpm golden:bun`, `pnpm graph`, `pnpm licence`, `pnpm provenance`
- `pnpm catalogue:check`, `pnpm command-docs:check`, `pnpm oracle:check`

**Manual checks:**
- Compile and run an authored dictionary/method program through the real VM; inspect returned values, emitted IR, receiver retention after collection, and canonical JSON restore.

**Recorded evidence (2026-10-19):**
- Independent review of PR #294 at head `6145b09960d92c10c2504d99ce91906f29ed0312`: APPROVE, no findings.
- Independent runtime smoke: a suspended receiver's `frameObjectHandle` 1 survives GC and JSON restore, returning 7; a `waitreply` callable with `objectsAfterCollect` 1 restores its result 7; a stale receiver restore reports `restore.callable-receiver`; object and file collision handles are `[1, 2]`; public export codes are preserved.
- GitHub Actions run `39292913962` passed all 9 jobs, including `gate`.
- Local exact-worktree gates passed: typecheck, lint, strict tests 1472/1472 with 0 skipped, golden, golden:bun, graph, licence, provenance, catalogue:check, command-docs:check, oracle:check. No golden diffs.
- PR #294 merged normally to `main` as `89a4f293865e11f6d4ac185d08c65274c5f0f2b5`; no admin bypass or rebase.
