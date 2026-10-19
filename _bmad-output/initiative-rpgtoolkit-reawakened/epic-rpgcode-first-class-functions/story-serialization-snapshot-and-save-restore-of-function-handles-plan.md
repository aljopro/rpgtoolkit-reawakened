---
title: 'Serialization, snapshot, and save/restore of function handles'
type: 'feature'
ticket: 6
created: '2026-10-18'
status: done
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'high'
context:
  - 'code - packages/core/src/save/sections/vm.ts'
  - 'code - packages/core/src/save/state.ts'
---

## Intent
Ensure all first-class function state and symbol reassignments survive save/load deterministically.

## Boundaries
Serialization, deserialization, and schema migration for VM state.

## Key Decisions
Function handles serialize as plain numeric/string table keys. Function tables are restored deterministically from program assets.

## Acceptance
Full snapshot and restore round-trips pass with 100% hash equality.

## Verification
Snapshot fuzzing, save/load round-trip tests, and canonical hash checks.
