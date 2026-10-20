---
title: "Per-package VM step counters"
type: feature
ticket: 13
created: '2026-10-19'
status: done
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "medium"
context:
  - "code - packages/core/src/script/vm.ts (step loop), state.ts"
  - "spec - docs/spec/engine/rpgcode-errors-and-threads.md (THR-3)"
  - "tooling - epic-rpgcode-tooling (debug adapter reads these later)"
---

## Intent

Lane A files again (vm.ts step loop); after 11 so the emitter's dispatch cost is attributed. The mixed two-package run in its verify uses two small authored test packages created inside this entry's own tests, not the 19.14 fixtures.

## Boundaries

Data and a read API. No UI, no limits, no enforcement.

## Key Decisions

1. Whether counters are part of the state hash is a 19.1 judgement call (see Assumption A-5).

## Acceptance

1. Attribution by package of the running definition, including callables owned by a package.

## Verification

Unit tests; hash equality across restore.
