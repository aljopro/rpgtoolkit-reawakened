---
title: "Spike: stock ATB tick and cancelable emits against STEP_BUDGET"
type: 'feature'
ticket: 2
created: '2026-10-19'
status: done
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "high"
context:
  - "spec - docs/spec/engine/plugins-and-battle.md#e-72 to E-75"
  - "spec - docs/spec/engine/rpgcode-errors-and-threads.md (THR-3, the budget)"
  - "code - packages/core/src/script/vm.ts (STEP_BUDGET)"
  - "code - packages/core/src/engine/engine.ts (runThreadsPhase)"
  - "data - docs/spec/examples/game/ (character and enemy examples for the fighter values)"
---

## Intent

Answer the one question the whole stock-battle design rests on: does an ATB tick written in RPGCode, with statuses and events, fit the per-thread step budget and the fixed tick, once cancelable emits park and resume threads? The owner ruled the answer must exist before Epic 20's design is fixed; if it does not fit, Epic 20 changes (for example a core-owned tick accumulator, a per-package budget or batched emits).

## Boundaries

Measures with what exists after Epic 18 (callables, cells, waits) and a minimal in-script model of the emitter. Adds no production emitter and no object runtime. The benchmark fixture and the written result are the deliverables.

## Key Decisions

1. The fighter values come from the docs/spec example data and the E-72 constants (+3 per tick, act at 75 for players and 123 for enemies), not from invented numbers.
2. A cancelable emit is measured as: the emitter thread parks, each listener is a call_indirect, the thread wakes when the last listener returned, in the same tick when it fits.
3. The result is a go/no-go with numbers, committed under epic discovery/, not a chat statement.

## Acceptance

1. The benchmark runs headless and deterministically; two runs give the same hash.
2. The result file lists every measured configuration with steps per tick and the headroom against 1000.
3. A no-go lists the exact design changes for Epic 19 emitter entries and Epic 20.

## Verification

`pnpm test` runs the benchmark; the owner reads discovery/step-budget-spike.md.

## Result

Go with two conditions; the naive one-thread battle is no-go. Full numbers, method, headroom, risks and recommendations: [discovery/step-budget-spike.md](discovery/step-budget-spike.md). The benchmark is `packages/core/test/step-budget-spike.test.ts` (kept: it is the regression guard entries 19.10 to 19.12 re-run against the real emitter). Headlines: a fighter on its own thread peaks at 565 steps with three inline listeners (435 spare); one thread running all four fighters needs 1389 steps in the all-act tick with no events at all; a cancelable emit parks its emitter about two ticks (1.97 measured); a save at every step of a parked dispatch restores to the same state at every step (no G1 issue shown for the queued rule).
