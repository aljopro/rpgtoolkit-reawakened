---
title: 'Unified environment table and global symbol reassignment'
type: 'feature'
ticket: 5
created: '2026-10-18'
status: 'draft'
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'high'
context:
  - 'code - packages/core/src/script/registry.ts'
  - 'code - packages/core/src/script/builtins.ts'
---

## Intent
Collapse the 4-tier lookup pipeline into an environment table supporting dynamic interception.

## Boundaries
Script environment and symbol resolution. Does not alter save file persistence format (entry 6).

## Key Decisions
The global scope maintains a symbol-to-handle map initialized with built-in commands. Reassigning a symbol updates the map for that scope.

## Acceptance
Custom wrappers can intercept, wrap, and chain to original engine commands cleanly.

## Verification
End-to-end symbol reassignment and legacy redirect compatibility tests.
