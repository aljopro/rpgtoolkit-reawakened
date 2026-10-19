---
title: "Cancelable emit: parked dispatch, cancel and event mutation"
type: 'feature'
ticket: 11
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "high"
context:
  - "spec - emitter section written by 19.1"
  - "spine - AD-9 (wait kinds are owner-namespaced)"
  - "code - packages/core/src/script/waits.ts"
  - "spike - epic-rpgcode-platform/discovery/step-budget-spike.md"
---

## Intent

A new wait kind registered through the AD-9 wake contract; parked frames stay plain JSON (G1).

## Boundaries

Dispatch semantics only.

## Key Decisions

1. The event object is a dictionary (entry 3); `cancel()` is a method bound to it.

## Acceptance

1. Order, cancel, mutation, save mid-dispatch, no synchronous side door.

## Verification

Unit tests with save at every tick; goldens.
