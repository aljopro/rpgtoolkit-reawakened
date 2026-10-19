---
title: 'Pure-RPGCode middleware plugin fixtures and legacy golden verification'
type: 'feature'
ticket: 7
created: '2026-10-18'
status: built
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'high'
context:
  - 'fixtures - packages/core/test/fixtures/'
  - 'golden - golden/scenes/'
---

## Intent
Prove the pure-RPGCode plugin architecture end-to-end and guarantee zero legacy regressions.

## Boundaries
Integration tests, authored test fixtures, and golden regression verification.

## Key Decisions
Authored test plugins demonstrate real-world interception patterns (audio, movement, dialogue).

## Acceptance
All 18 epics in the initiative pass verification; all legacy test suites pass without modification.

## Verification
pnpm test:strict, pnpm golden, pnpm golden:bun, and closing regression suite.
