---
title: "registerPlugin as a layer over the environment table"
type: 'feature'
ticket: 8
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "high"
context:
  - "spec - docs/spec/engine/rpgcode-modules-and-objects.md (MOD-4)"
  - "adr - docs/adr/0004, decision 8 and the 18.5 and 18.7 amendments"
  - "code - packages/core/src/script/builtins/, registry.ts"
---

## Intent

`registerPlugin` is sugar: it computes the interception and the saved `original` for the author. The 18.7 fixtures remain valid.

## Boundaries

Commands only; events are entries 10 to 12.

## Key Decisions

1. Lifecycle: registration runs at package start-up; saves carry the layers as values (18.7) so a restore does not need start-up to repeat.

## Acceptance

1. Onion order, `next`, waits, save/restore, removal.
2. Catalogue and command-docs rows exist.

## Verification

Unit tests, the existing middleware golden unchanged, a new package golden.
