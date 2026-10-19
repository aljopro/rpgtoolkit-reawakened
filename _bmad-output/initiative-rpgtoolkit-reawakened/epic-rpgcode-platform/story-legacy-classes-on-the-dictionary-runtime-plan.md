---
title: "Legacy classes on the dictionary runtime"
type: 'feature'
ticket: 5
created: '2026-10-19'
status: in-review
baseline_revision: '8d4868a5a8f32a25e19dccb80ccc88d24e548c3b'
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
  - "docs/adr/0009-compatibility-layer-not-the-model.md"
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Dictionary objects (19.3) and legacy `class` instances already share the handle table, but they are still two representations: `ObjectRecord.keys` exists only on dictionaries, the VM has a separate dictionary path and class path for member read, call, `kill` and collection, and a class's identity is read from three places (the record, the object value, the running frame).

**Approach:** One record shape for every object (class tag, program, members, required `keys`), one member read/write, one call path, one collection pass, and class identity taken from the record for dispatch while the frame keeps the defining class for access (OOP-9). Clean cutover: no shim, no migration of the old saved shape (ADR 0009); legacy 3.1 behaviour is the oracle.

## Boundaries & Constraints

**Always:** Preserve every OOP-1 to OOP-9 behaviour: only the named constructor runs, own-class-only destructor, the OOP-8 ancestor walk, access labels, `operator` dispatch, `return &` references and member arrays, handle numbering. State stays plain JSON (G1); no clock, randomness or unordered iteration (G3). `Frame.objectClass` stays the access (definer) context and is not merged into dispatch. Docs first (G7 rule 4).

**Never:** New syntax; a second object table or representation; a schema bump or a migration shim for the old class-instance shape; changes to OOP-6 name resolution or the implicit-`this` method precedence; DeepSeek workers.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Instance shape | `class Leaf : Mid : Base` with fixed and growable arrays | Members are the declared fields (own class, then ancestors, nearest wins); `keys` lists them once each | n/a |
| Dispatch | `this + o` in a method `A` defines, object of `C : A` overriding `operator+` | C's operator runs | no operator: `object.invalid` |
| Call | `a.get()`, `a->get()`, `a.release()`, `a.cb()` on a class instance | Same call; a callable field is called with the object as receiver | non-callable: `callable.not-callable`; private: `object.inaccessible-member`; missing: `object.invalid` |
| `kill` | `kill(a->x)` on an instance | Key removed, field stays declared, re-enters last | n/a |
| Collection | Kept garbage cycle holding `q.f`; by-reference slot into a member | Receiver and referenced object survive; the save loads | `restore.callable-receiver` never raised for a kept holder |
| Save shape | Old class record (no `keys`), class with null `program`, dictionary with a `program`, duplicate handle | Load refused, path named | `restore.shape` |
| Class gone | Instance restored, running program no longer declares its class | Load succeeds; first method call fails, data stays | catchable `object.invalid` |

</frozen-after-approval>

## Code Map

- `packages/core/src/script/state.ts` -- `ObjectRecord` with required `keys`.
- `packages/core/src/script/objects.ts` -- the one object model: `createObject`, `instantiate`, `checkMemberAccess`, member read/write/remove, `objectKeys`, `objectRef`/`parseObjectRef`.
- `packages/core/src/script/classes.ts` -- new: OOP-8 walk, `findMethod`, `findMember`, `declaredMembers` (moved out of `vm.ts`).
- `packages/core/src/script/vm.ts` -- merged `member`/`get_member_bound`; `liveObject` + `invokeMember` behind `methodCall` and the file-qualified dot call; `construct` uses `instantiate`; operators and `this` take the record's class; `kill` of any field; `collectObjects` on `cells.eachLiveRoot`.
- `packages/core/src/script/cells.ts` -- `eachLiveRoot` (the roots without object members).
- `packages/core/src/save/snapshot.ts` -- `validateVmObjects` validates the one shape.
- `docs/spec/engine/rpgcode-modules-and-objects.md`, `rpgcode-language.md` -- OOP-10/11, R-34, restore.shape.
- Not touched: `Frame` (no new optional fields), `ObjectValue`, lowering, OOP-6 lookups.

## Tasks & Acceptance

**Execution:**
- [x] Docs first: stored shape, instance fields, two class identities, call path, `kill`, R-34 roots (own commit).
- [x] One `ObjectRecord` shape, validated on load; class model moved to `classes.ts`.
- [x] One member/call/kill/collection path in the VM; dispatch by record class, access by frame class.
- [x] Object roots: frame `this`, operand and slot references, receivers of callables in kept objects.
- [x] Tests: `script-class-objects.test.ts`; obsolete two-shape tests deleted.

**Acceptance Criteria:**
- Given any existing class test or legacy golden, when run, then it passes with no state-hash diff (the corpus class program ends with no live object).
- Given a class instance and a dictionary, when saved mid-wait and restored, then hashes are equal and both finish identically.
- Given the failing-before scenarios above, when run on the base, then they fail; on this head they pass.

## Implementation Notes

Classes already lived in `vm.objects` (19.3 reused the table), so the cutover is the representation and the code paths, not a second table. Decisions: instances seed every declared field including ancestors' (reads were already `0`); a growable `var m[]` has `arraySize` `null` and stays one member; dot calls on class instances now dispatch like `->`; operators on a released handle fall back to handle comparison; no schema bump (old class records are refused with a path-naming `restore.shape`). Deviations found and fixed against the OOP-8 "actual class" rule: `this + x` in an inherited method used the defining class's operator; `kill(obj->field)` did nothing on instances; a kept garbage cycle freed the receiver of a callable it held.

## Plan Change Log

## Review Triage Log

## Design Notes

Two class identities, two jobs: the record's `className` decides dispatch (methods, operators, abstract); the frame's `objectClass` (the class that defined the running method) decides access. Rejected: keeping the class name in the object value (it gave `this` the defining class) and a second optional-`keys` shape.

## Verification

**Commands:**
- `pnpm install`, `pnpm fixtures:fetch`
- `pnpm typecheck`, `pnpm lint`, `pnpm test:strict`
- `pnpm golden`, `pnpm golden:bun`, `pnpm graph`, `pnpm licence`, `pnpm provenance`
- `pnpm catalogue:check`, `pnpm command-docs:check`, `pnpm oracle:check`

**Manual checks:**
- Authored class-and-dictionary program through the real VM: a wait, a JSON save and restore, then the end-of-tick pass; compare values and hashes.
