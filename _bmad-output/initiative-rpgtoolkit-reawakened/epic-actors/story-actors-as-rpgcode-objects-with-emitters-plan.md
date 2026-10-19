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

Lane B (script bindings), runs beside lane A after 3. Object handles are views over the owner's records, not copies.

## Boundaries

Binding layer plus the virtual-variable write path for legacy stat aliases (`script/virtuals.ts`); rules are entry 5, events emitted by actors are entry 9.

## Key Decisions

1. Exact RPGCode method names follow Assumption A-2 (emitter) and are listed in the plan.

## Acceptance

1. Read/write through owner; methods; emitter.
2. `virtuals.ts` gains a write path; `HP!`/`Level!`-style `.tem` globals read and write the actor stat live; `kill()` on an alias resets to the .tem default.

## Verification

Unit tests; catalogue and command-docs gates.
