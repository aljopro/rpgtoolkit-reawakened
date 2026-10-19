---
title: "Receiver auto-binding, this and bindThis"
type: 'feature'
ticket: 4
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "high"
context:
  - "spec - docs/spec/engine/rpgcode-modules-and-objects.md (OOP-11)"
  - "adr - docs/adr/0004-script-ast-step-ir-and-plugins.md, decision 8"
  - "code - packages/core/src/script/values.ts (CallableValue), vm.ts, builtins/"
---

## Intent

Build `OP_GET_MEMBER_BOUND` (ADR 0004 decision 8: member access auto-binds the receiver) and make the `receiver` field that 18.6 only validates for shape do real work, and decide what keeps a receiver's object alive (18.6 left this to this entry; the 19.1 ruling states the rule).

## Boundaries

Receivers and `bindThis` only. The implicit-this method step of legacy classes keeps its place (18.5 flagged it); aligning it is entry 5's decision at most.

## Key Decisions

1. `OP_GET_MEMBER_BOUND` is a real step-IR opcode, emitted by the compiler for `.` and `->` member reads of callables; it is not simulated by a later pass.
2. A callable keeps its receiver alive as a root in the collection pass.

## Acceptance

1. `OP_GET_MEMBER_BOUND` exists in the step IR and is the path for `.` and `->` reads (asserted by an IR test); auto-binding behaves per the ruling.
2. `bindThis` rebinding and error cases (non-callable, non-object receiver) are catchable located errors.
3. `pnpm catalogue:check` and `pnpm command-docs:check` pass with the new built-in.

## Verification

Unit and golden tests; catalogue and command-docs gates.
