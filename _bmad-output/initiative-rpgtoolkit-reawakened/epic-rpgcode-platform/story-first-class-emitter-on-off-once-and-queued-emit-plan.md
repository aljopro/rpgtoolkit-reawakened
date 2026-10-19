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

1. Exact RPGCode API names follow Assumption A-2 until the owner confirms them.

## Acceptance

1. Registration-order delivery, off, once, no recursion.
2. One owned state section, plain JSON.

## Verification

Unit tests; hash equality across restore; golden for phase order.
