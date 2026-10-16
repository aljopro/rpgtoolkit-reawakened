---
title: 'Classes, objects and operator dispatch'
type: 'feature'
ticket: 6
created: '2026-10-16'
status: done
baseline_revision: '5a7ad22679581abdda690a0232f1f1e2208af3dc'
route: 'full'
route_source: 'pinned'
risk: 'high'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/spec/engine/rpgcode-modules-and-objects.md', '{project-root}/docs/spec/engine/rpgcode-errors-and-threads.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless the human renegotiates">

## Intent

**Problem:** The frontend and VM have no class metadata, object values, method bodies, inheritance, access checks, operator dispatch, or lifetime handling, so `system.prg`'s `CArray` cannot run. `VmState.objects` is still a placeholder and `Value` cannot carry an object.

**Approach:** Extend the unified AST/Step IR and compiled `Program` with class, member, method, constructor/destructor, operator, base and access metadata; represent live instances in the saveable VM object table and route construction, member access, method calls, operators, release and collection through one deterministic object runtime. This remains **one build**, not the optional two-part cut: inheritance/access and lifetime are coupled to dispatch and the object table, and all 17 criteria must be proven together.

## Boundaries & Constraints

**Always:** Follow OOP-1…OOP-9 in `docs/spec/engine/rpgcode-modules-and-objects.md`; keep G1 explicit stepping and `AssertPlainData`, G2/G3 purity/determinism, and AD-7/AD-8 lookup and by-reference rules. Allocation uses the smallest handle greater than table size; collection walks handles in ascending order, never calls destructors, and preserves cycles. `release()` calls only the object's own destructor before freeing; `kill` only removes a name. Existing non-class programs, diagnostics, goldens and snapshot hashes stay unchanged except for the populated `objects` table.

**Never:** Base-constructor or base-destructor chaining, copy construction, `protected`, conversion/`->`/ternary operator dispatch, classes across `#include`/`file.` (entry 8), catchable handlers (entry 7), threads (entry 9), or host/opaque object instances in state.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Declarations | Inline/in-class and out-of-class methods, `struct`, member arrays | All metadata loads; `class` defaults private, `struct` public | `protected` is a located load error |
| Construction/assignment | Base + derived; unset, scalar and object LHS; `operator=` present/absent | Only named constructor runs; ordinary assignment aliases the handle; `operator=` keeps LHS handle | Unknown/abstract class is invalid-object error |
| Handles/lifetime | Holes, `release`, `kill`, unreachable objects, mutual references | 1/2/3 allocation rule; own destructor only; deterministic end-tick collection; cycles survive | Freed/unknown handle is stable located runtime error |
| Dispatch | Unary/binary/compound/index/equality methods and missing methods | First operand and exact arity choose method; `==`/`~=` compare handles only as fallback; index writes preserve references | Missing non-fallback operator and bad access are located runtime errors |
| Lookup/access | `:name`, parameter, member, local/global; own class then ancestors; public/private contexts | Ruled name and transitive base order; actual class dispatch; same-class private access works | Inaccessible member/method is runtime error |
| Snapshot | Live objects, member links, mid-method, next allocation | Canonical restore and subsequent handle allocation match uninterrupted run | No class/handle data is lost |

</frozen-after-approval>

## Code Map

- `packages/core/src/ports/value.ts` — widen `Value` with a tagged plain-data `ObjectValue` (`{ kind: "object", handle, className }`); equality uses `handle`, while the table is authoritative and validates the class tag.
- `packages/core/src/script/ast.ts`, `parse.ts`, `lex.ts`, `lower.ts`, `ops.ts`, `program.ts` — add class/struct declarations, labels, methods, `this`, `->`, construction and operator/member lvalues; compile class metadata and method bodies outside `VmState` with source positions.
- `packages/core/src/script/state.ts`, `vm.ts`, `registry.ts`, `errors.ts` — replace `objects: never[]` with deterministic `ObjectRecord[]` (`handle`, `className`, `program`, plain member values); implement construction, method lookup, access, operator/index dispatch, assignment semantics, release and end-tick/program-end collection.
- `packages/core/src/script/index.ts`, `packages/core/test/fixtures/plain-data/good.ts`, `packages/core/test/fixtures/save/*.json` — export and pin the new plain-data contracts; compiler/state schema fixtures cover restore.
- `packages/core/test/script-frontend.test.ts`, `script-vm.test.ts`, `script-state.test.ts`, plus new `script-objects.test.ts` — retain existing pins and cover all matrix rows and criteria 1–17; use `canon`/`hashState` for snapshot checks. Do not touch `golden/`.

## Tasks & Acceptance

**Execution:**
- [ ] `architecture-rpgtoolkit-reawakened.md` AD-7 and `packages/core/src/ports/value.ts` — record the object-value/table contract first; reject opaque handles, stable-hash identity and embedded object snapshots. The chosen representation is tagged plain data with numeric handle plus class name; object records carry the owning `ProgramRef`, members and deterministic order, and canonical hashing supplies stable identity of state, not object identity.
- [ ] `lex.ts`, `ast.ts`, `parse.ts` — parse class/struct declarations, in/out-of-class methods, member arrays, access labels, bases, pure methods and all accepted object syntax; reject `protected` with location.
- [ ] `ops.ts`, `lower.ts`, `program.ts` — lower object construction, `this`, member/index lvalues and calls while retaining linear stepping and method arity metadata.
- [ ] `state.ts`, `vm.ts`, `registry.ts`, `errors.ts` — implement the object table, dispatch/lookup/inheritance/access rules, handle allocation, assignment/index references, release and deterministic collector; add stable failure codes and source positions.
- [ ] `script-objects.test.ts` and existing state/plain-data tests — test criteria 1–17, including `CArray`, cycle retention, freed handles, canonical snapshot/restore and unchanged non-class behavior.

**Acceptance Criteria:**
- Given the 17 scenarios in the leaf ticket, when the authored programs run, then every declaration, constructor/assignment/index/operator/name/inheritance/abstract/access/lifetime/error behavior matches OOP-1…OOP-9 and criteria 1–16.
- Given unchanged `system.prg`, when `CArray` constructs, resizes, clones, reads/writes, assigns and releases, then its own code's results and destructor/lifetime behavior match criterion 17.
- Given a mid-method snapshot with linked objects, when restored and stepped beside an uninterrupted VM, then each canonical state hash and next handle are identical, and `AssertPlainData` passes.

## Implementation Notes

**Ruled (Jensen, 2026-10-16).** Failure codes, shared with entry 3.7, which makes them catchable: `object.invalid` (freed handle, unknown class, non-object receiver), `object.abstract-class` (constructing an abstract class), `object.inaccessible-member` (private access from outside the class). Until 3.7 lands they are thrown as `ScriptError` with these codes.

## Plan Change Log

## Review Triage Log

## Design Notes

`ObjectValue` is deliberately not a stable hash: hashes are derived from canonical state and cannot be dereferenced. It is not an embedded snapshot: copying one must alias the live table entry. The tag and class name make ordinary assignment retain both handle and type; `ObjectRecord.program` lets restore rebuild method resolution without putting compiled code in state. Members use plain records/array-element keys, and all table searches have explicit numeric ordering. This is one build because splitting before object dispatch is proven would create incompatible intermediate state contracts.

## Verification

**Commands:**
- `pnpm typecheck && pnpm test && pnpm lint && pnpm graph && pnpm provenance && pnpm licence` -- expected: all pass.
- `pnpm fixtures:fetch && pnpm test:strict && pnpm golden` -- expected: pass with no golden edits.
- `grep -rn "objects: never\[\]" packages/core packages/runner-harness` -- expected: no match.

**Manual checks:**
- Read the object-value/table amendment beside AD-7 and the OOP-1…OOP-9 spec; confirm no opaque handle, hash-as-identity or embedded snapshot remains.
