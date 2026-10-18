---
title: 'Lowering and IR bytecode instructions for dynamic invocation'
type: 'feature'
ticket: 3
created: '2026-10-18'
status: built
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'medium'
context:
  - 'code - packages/core/src/script/lower.ts'
  - 'code - packages/core/src/script/ir.ts'
---

## Intent
Emit bytecode instructions capable of performing indirect calls through function handles.

## Boundaries
AST lowering and IR opcode definitions only. Does not modify the VM execution loop.

## Key Decisions
Introduce load_fn and call_indirect IR opcodes with explicit operand indices and argument counts.

## Acceptance
Bytecode generation produces deterministic IR for all dynamic call patterns.

## Verification
Unit tests verifying bytecode output and structural snapshot equality.
