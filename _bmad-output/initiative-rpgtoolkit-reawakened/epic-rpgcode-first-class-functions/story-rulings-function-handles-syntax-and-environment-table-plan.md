---
title: 'Rulings: Function handles, address-of syntax, invocation, and environment table'
type: 'feature'
ticket: 1
created: '2026-10-18'
status: 'draft'
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'high'
context:
  - 'spec - docs/spec/engine/rpgcode-language.md (FUN-1, FUN-5, R-35)'
  - 'spine - _bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-7, AD-8'
  - 'idea - _bmad-output/initiative-rpgtoolkit-reawakened/nice-to-have.md, 'First-class function handles and pure-RPGCode plugin architecture''
---

## Intent
Rule the syntax, type system extension, and resolution semantics for first-class function handles before implementing compiler and VM changes.

## Boundaries
Documentation and specification only. No TypeScript compiler or VM code changes.

## Key Decisions
Function handles are plain JSON data ({ kind: 'function', id: number }). Address-of uses &name. Calling syntax f(args) applies to variables holding function handles. Global symbol reassignments override active bindings.

## Acceptance
The language spec, modules spec, and ADR-0004 clearly document function handles, dynamic calls, and the environment table with worked examples.

## Verification
Specification review and link/anchor verification; a person approves the plan checkpoint.
