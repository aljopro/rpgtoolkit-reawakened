---
title: 'VM runtime execution of dynamic function handles and step budget'
type: 'feature'
ticket: 4
created: '2026-10-18'
status: 'draft'
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
Function handles resolve to either a BuiltinSpec or a Program entry point. Invocations step the VM frame stack identically to standard calls.

## Acceptance
Indirect calls pass arguments, return values, yield waits, and respect preemption budgets.

## Verification
Step-by-step VM unit tests and preemption budget verification tests.
