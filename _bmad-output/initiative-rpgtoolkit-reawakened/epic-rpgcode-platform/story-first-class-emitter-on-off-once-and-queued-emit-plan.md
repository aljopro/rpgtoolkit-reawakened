---
title: "First-class emitter: on, off, once and queued emit"
type: 'feature'
ticket: 10
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "high"
context:
  - "spec - emitter section written by 19.1"
  - "spine - AD-10 (one owner per section), AD-26 (phase list), AD-32 (event bus)"
  - "code - packages/core/src/engine/engine.ts, packages/core/src/script/effects.ts"
  - "spike - epic-rpgcode-platform/discovery/step-budget-spike.md (19.2)"
---

## Intent

Lane D (events). The owner of the new `events` section and its phase registration is this entry; entries 11 and 12 extend it in order. Any shared barrel (`index.ts`, phase list, `GameState` sections) is reconciled by 19.15.

## Boundaries

Queued emit only; cancelable emit is 11; built-in emitters and the TypeScript bus are 12. Product sentence: 'Every object in RPGCode can emit and listen to events.'

## Key Decisions

1. API names are approved (owner, 2026-10-19): `on`, `off`, `once`, `emit`, `emitCancelable`.

## Acceptance

1. Registration-order delivery, no recursion.
2. Listener removal: `off(type, fn)`; removing a `once` listener before it fires; removing all listeners for a type; a listener removed during dispatch follows one deterministic rule (skipped if it has not run yet); a listener added during dispatch does not run in that dispatch; `once` fires exactly once.
3. One owned state section, plain JSON.

## Verification

Unit tests for every add/remove case above; hash equality across restore; golden for phase order.
