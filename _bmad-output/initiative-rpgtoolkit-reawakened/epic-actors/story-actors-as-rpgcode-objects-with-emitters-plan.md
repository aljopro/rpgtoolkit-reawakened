---
title: "Actors as RPGCode objects with emitters"
type: 'feature'
ticket: 4
created: '2026-10-19'
status: draft
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
