---
title: "Actors as RPGCode objects with emitters"
type: 'feature'
ticket: 4
created: '2026-10-19'
status: in-progress
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "high"
context:
  - "spec - docs/spec/engine/actors.md"
  - "spec - docs/spec/engine/rpgcode-modules-and-objects.md (OOP-10, OOP-11)"
  - "code - packages/core/src/script/builtins/"
---

## Intent

Lane B (script bindings), runs beside lane A after 3. Object handles are views over the owner's records, not copies; the stable actor id remains the data identity.

## Boundaries

Binding layer plus the virtual-variable write path for legacy stat aliases (`script/virtuals.ts`); actors hydrate through the generic OOP-12 host-type method table, and the object returned by `registerEmitter(vm, events, "actor:<id>")` is the actor's script object. Rules are entry 5, events emitted by actors are entry 9.

## Key Decisions

1. Exact RPGCode method names are `on`, `off`, `once`, `emit` and `emitCancelable`; the actor object is the emitter registered under `actor:<id>`, and `emitterKeyOf` maps its handle back to that key.
2. `ObjectRecord` carries an optional host type name only for host-provided objects; methods are session hydration, never saved callables, and a saved data field wins over a hydrated method.
3. The write path raises `kill.system-owned` for protected names and `assign.read-only` for read-only virtuals and `threads[i]`; writable actor aliases write through without breaking the link.

## Acceptance

1. Read/write through owner; methods; emitter effect reaches `actor:<id>`.
2. `virtuals.ts` gains a write path; aliases remain live; protected kills and read-only assignments are catchable and located; no callable is in actor data.

## Verification

Unit tests; catalogue and command-docs gates.

## Code Map

- `packages/core/src/actors/model.ts` and `port.ts` -- plain actor records and the owner-backed stats seam; extend with a view/service port without storing runtime methods.
- `packages/core/src/script/state.ts`, `objects.ts`, and `vm.ts` -- saved `ObjectRecord` shape, member access, virtual references, host method resolution, assignment and `kill` dispatch.
- `packages/core/src/script/virtuals.ts` -- engine virtual reads; add owner-backed writes and protected/read-only classification.
- `packages/core/src/events/emitter.ts` -- actor emitter registration, emitter-key lookup, and shared event operations.
- `packages/core/test/actors.test.ts` and script object/virtual/error tests -- permanent behavior coverage.

## Tasks & Acceptance

**Execution:**
- [ ] Add generic host type/session method hydration and actor owner-backed object views.
- [ ] Add virtual write-through references and protected-name/read-only error enforcement.
- [ ] Register actor objects under `actor:<id>` and test owner linkage, method dispatch, errors and saved data shape.

**Acceptance Criteria:**
- Given an actor owner record, when RPGCode reads/writes its object or aliases, then reads reflect the owner and writes commit through it without a copy.
- Given an actor object, when emitter methods or hydrated host methods are called, then the actor's registered emitter key and owner service receive the operation.
- Given protected/read-only names or an absent host type, when script code attempts the operation, then a located catchable `kill.system-owned`, `assign.read-only`, or OOP-12 method-call error is raised and data is unchanged.

## Implementation Notes
