---
title: "Legacy classes on the dictionary runtime"
type: 'feature'
ticket: 5
created: '2026-10-19'
status: done
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

**Never:** New syntax; a second object table or representation; a schema bump or a migration shim for the old class-instance shape; changes to the order of the OOP-6 lookup tiers (environment-table precedence) or to the OOP-9 access identity; changes to lifetime or receiver semantics (`release()`, receiver binding); DeepSeek workers.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Instance shape | `class Leaf : Mid : Base` with fixed and growable arrays | Members are the declared fields (own class, then ancestors, nearest wins); `keys` lists them once each | n/a |
| Dispatch | `this + o` in a method `A` defines, object of `C : A` overriding `operator+` | C's operator runs | no operator: `object.invalid` |
| Call | `a.get()`, `a->get()`, `a.release()`, `a.cb()` on a class instance | Same call; a callable field is called with the object as receiver | non-callable: `callable.not-callable`; private: `object.inaccessible-member`; missing: `object.invalid` |
| Implicit lookups | Inside `Base::run()`, bare `step()` and a bare field only `Kid` declares, on a `Kid` object | The override runs and the field is the member, as `this->step()` does | unknown name: `unknown.command` |
| Dot qualifier | `eng.get()` inside a method where `eng` is a field | Same `eng` as `eng->get()`: field first, then local, then global | include fallback only when no object is found |
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

Classes already lived in `vm.objects` (19.3 reused the table), so the cutover is the representation and the code paths, not a second table. Decisions: instances seed every declared field including ancestors' (reads were already `0`); a growable `var m[]` has `arraySize` `null` and stays one member; dot calls on class instances now dispatch like `->`; operators on a released handle fall back to handle comparison; no schema bump (old class records are refused with a path-naming `restore.shape`). Deviations found and fixed against the OOP-8 "actual class" rule: `this + x` in an inherited method used the defining class's operator; a bare `step()` and a bare field name in a base method used the defining class's symbols; `eng.get()` did not see a field `eng`; `kill(obj->field)` did nothing on instances; a kept garbage cycle freed the receiver of a callable it held. `frameObjectClass` (record's class) finds symbols; `Frame.objectClass` (the class that defined the running method) still decides access.

The object pass runs on `cells.eachLiveRoot`, which builds no path strings, and returns at once on an empty handle table.

## Plan Change Log

- 2026-10-19 — Director triage of the review of `0a2e1826` renegotiated the frozen scope: the implicit bare-call and bare-field lookups inside a method (F2) and the dot-call qualifier (F8) belong to this story's object-first dispatch, not to a deferred OOP-6 change; the lookup-tier order and the access identity stay. The `Never` line and the I/O matrix above were amended to match; the spec rows were written first (`0c0a8cec`).

## Review Triage Log

Independent review of `0a2e1826` (code identical to `16fd1163`): pass with findings, no blocker.

| Finding | Verdict | Action |
|---|---|---|
| F1 docs: `kill(obj["field"])` and `obj["k"]` on a class instance | valid | `kill` row, KILL-1 and EXP-7 now say `dict["k"]` is the member and a class instance's `obj[i]` keeps OOP-7 |
| F2 bare call / bare field use the defining class | valid (also on base) | fixed: `frameObjectClass` in `load`, member-array `index` and the implicit call; test `a bare call and a bare field name…` fails on base (`1 !== 2`) |
| F3 explicit `release()` of a callable's receiver dangles it | valid, pre-existing, not a GC bug | not changed (lifetime/receiver semantics are not this ticket). Evidence on this head and on base `8d4868a5`: `k.cb = bindThis(() => this.n, r); r->release()` then save/restore gives `restore.callable-receiver`. The R-34 sentence now promises only that collection never frees a receiver a kept object's callable names, and states the limit |
| F4 per-tick collector cost | valid | empty-table early return; `eachLiveRoot` builds no path strings |
| F5 'deliberate re-record' claim | valid | reworded: no golden holds a live class instance, none re-recorded |
| F6 'exactly these fields' / undocumented handle rule | valid | reworded to 'these fields'; positive distinct handles documented; no stricter reject policy added |
| F7 private-field identity | pre-existing, out of scope | unchanged and pinned by a test. Evidence (same on base): in `Base`, a bare `secret` on a `Kid` object reads it, `this->secret` raises `object.inaccessible-member`, because the field check compares the running method's class with the object's class, not with the field's declaring class (methods compare with the method's definer). Owner question for the access policy; no follow-up promised here |
| F8 `eng.get()` does not see a field `eng` | valid | fixed: the qualifier is found by `peekName` (field, then local, then global); test `the dot-call qualifier…` fails on base (`dot` 0 with `include.missing`) |
| F9 (review of `9414aa71`) a field only the object's class declares shadowed a parameter of an ancestor's method (`run(x)` returned the field; `&x`, closure, qualifier and index variants too); the same-class param-vs-field departure from OOP-6 | valid regression plus a pre-existing departure | fixed at the root: the lowerer flags a bare name that is a parameter of the function it lowers (`load.param`, `index.baseParam`, `call.fileParam`, only when true, no op added or moved, no compiler bump) and `isImplicitField` skips the field tier for it, giving OOP-6's order (explicit global, parameter, field of the object's class, local or global). `findObject` tries `objects[handle - 1]` before the scan. Tests `a parameter of an inherited method shadows…` and `…same name in the class that declares both…` |

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

**Recorded evidence (2026-10-19):**
- Independent final review of PR #296: **APPROVE, no findings**, bound `f420a2d191a6ffa8efcf44b087e5ff580019cf9c`; code reviewed clean at `894616ee` (the parameter, by-reference, closure, qualifier and index cases match OOP-6), `f420a2d1` adds only the two closure-claim doc narrowings it asked for.
- GitHub Actions run `39304706474` on `f420a2d1`: all 9 jobs passed (typecheck, lint, unit, golden, golden-bun, graph, licence, provenance, `gate`). PR #296 merged normally to `main` as `ecc0bc84097cceeb42e6778072cf7d089c60554f`; no admin bypass, no rebase.
- Local exact-worktree gates on `4cb99b49` (code identical to `f420a2d1` apart from one deleted incidental IR test and doc text): install and `fixtures:fetch`; typecheck, lint, `test:strict` **1498/1498 with 0 skipped**, golden, golden:bun, graph, licence, provenance, catalogue:check, command-docs:check, oracle:check all exit 0; no golden diff.
- Failing-before proof: `script-class-objects.test.ts` on base `8d4868a5` failed on every deviation fixed here (`100 !== 7` for `this + o`, `1 !== 2` for a bare `step()`, dot-qualifier `0` with `include.missing`, `2 !== 3` objects in the receiver-cycle case, `0 !== 1` for the by-reference slot, `3 !== 0` after `kill(a->x)`); all pass on head. The parameter cases (`run(x)` returning `0` or the field) were verified failing at `9414aa71` by the reviewer.
- Authored runtime smoke (class and dictionary mix, a `sleep`, JSON save and restore mid-run, `kill`, `release`, a garbage cycle holding a bound callable): `total=100 again=100 healed=110 peeked=7 d="tonic/50"` on original and restored runs, hashes equal at the wait and at the end, no diagnostics, final save loads; the same program on base failed each `p.method()` dot call with `include.missing` (`total=0`) and kept the released object alive.

**Pre-existing limits, found here and not changed (identical on base `8d4868a5`):**
- An explicit `release()` of a callable's receiver leaves that callable dangling: a call is `object.invalid` and a save holding it is refused as `restore.callable-receiver` (F3).
- OOP-9 private-field identity: a base method's `this->secret` on a derived object is refused while a bare `secret` reads it (F7); owner question for the access policy.
- A parameter a receiver-bound closure captures does not shadow a field of its receiver, and inside any closure the `file.name()` qualifier is never captured (FUN-8), so `eng.get()` and `eng->get()` can differ there.
- A member holding an object and indexed by a bare name inside a method does not dispatch that object's `operator[]` (found while reading the index path; not touched).
