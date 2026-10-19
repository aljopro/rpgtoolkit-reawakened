---
title: 'VM runtime execution of dynamic function handles and step budget'
type: 'feature'
ticket: 4
created: '2026-10-18'
status: built
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'high'
context:
  - 'code - packages/core/src/script/vm.ts'
  - 'ports - packages/core/src/ports/value.ts'
---

## Intent
Execute indirect function calls within the VM's deterministic step-machine loop.

## Boundaries
VM execution loop and function dispatch. Environment table reassignments are handled in entry 5.

## Key Decisions
Function handles resolve to either a BuiltinSpec or a Program entry point. Invocations step the VM frame stack identically to standard calls. 18.4 also owns capture resolution: 18.3 lowers every lambda with `captures: []`, so 18.4 must work out which enclosing variables a lambda uses, allocate their cells in `vm.cells`, and fill `captures` (ADR 0004 decision 8).

## Acceptance
Indirect calls pass arguments, return values, yield waits, and respect preemption budgets.

## Verification
Step-by-step VM unit tests and preemption budget verification tests.
