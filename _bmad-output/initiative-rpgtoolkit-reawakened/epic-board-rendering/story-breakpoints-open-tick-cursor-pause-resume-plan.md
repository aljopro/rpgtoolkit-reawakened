---
title: 'Breakpoints: the open-tick cursor, pause and resume'
type: feature
ticket: 30
created: '2026-10-17'
status: done
baseline_revision: '1c6a7510'
route: full
route_source: pinned
review: quick
review_source: pinned
---

## Intent

Implement the AD-1 breakpoint seam on the merged 4.19 fixed-tick engine. A source breakpoint pauses before its instruction while preserving the open tick in the engine save section; continue completes that tick and reports one completed tick, while step executes exactly one VM instruction and pauses again.

## Evidence and rulings

**Proposed ruling (pending owner review):** breakpoints match the compiled source position (`<inline>` for inline programs) and stop before the matching instruction. The cursor stores sorted ready thread ids, its current index/thread, total instructions used and a same-line suppression marker so continuing does not immediately re-hit the same source line. The rejected alternative is a pre-instruction VM hook, which the epic ruling explicitly excludes; or storing only an instruction pointer, which cannot reproduce ready-thread scheduling.

The cursor is plain data under `GameState.engine`, and completed ticks alone increment `time.tick`/`ticksRun`. The stop/resume hash and never-hit-equals-none checks cover the ticket table's acceptance rows.

## Implementation

- Add `OpenTickCursor` to the engine section as an optional backward-compatible field; retain the section schema version because existing snapshots migrate and validate optional engine fields.
- Add a `ResumeMode` port parameter for `advance` and execute the threads phase through `stepThread(..., 1)` when a breakpoint or step mode is active.
- Preserve the remaining phase list after the cursor drains; leave inputs, waits, movement and time untouched while stopped.
- Add engine tests for pause location, resume hash, never-hit hash equality and one-instruction step behavior.
