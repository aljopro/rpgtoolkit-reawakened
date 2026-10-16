---
title: 'Threads and waits: kinds, sleep, wake, tellThread, multiRun, tick budget'
type: 'feature'
ticket: 9
created: '2026-10-16'
status: ready-for-dev
baseline_revision: '5a7ad22679581abdda690a0232f1f1e2208af3dc'
route: 'full'
route_source: 'pinned'
risk: 'high'
context: ['docs/guardrails.md', 'docs/spec/engine/rpgcode-errors-and-threads.md', 'docs/spec/engine/rpgcode-language.md', 'docs/spec/engine/rpgcode-functions.md', 'docs/spec/engine/main-loop-and-startup.md', 'docs/spec/engine/plugins-and-battle.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The VM currently has one provisional tick-based `sleep`, a per-thread wait model withdrawn by R-32, no E-93 thread operations, and `request` results are rejected. `STEP_BUDGET` is still provisional, so scripts cannot reproduce thread lifecycle, replayable request replies, `multiRun`, or deterministic preemption.

**Approach:** Extend the plain-data thread and wait contracts, implement E-93 operations through the existing command/effect registry, and rework the waits/threads phases around deterministic ascending-id polling. Add a VM-visible global-block status for R-32, AD-5 request/`then` reply handling, deadlock/timeout diagnostics, and a fixed budget API (default retained at 1000 after stress coverage; no frame-rate formula).

## Boundaries & Constraints

**Always:** G1/G3 plain JSON state, explicit instruction steps, injected fixed ticks, no timers or host APIs; AD-9 `poll(view, wait)` is the only wake resolver and duplicate kinds fail; THR-1's exact seconds formula and indefinite zero sleep, THR-2 per-thread source/target and queued `tellThread`, THR-3 ascending wake order and budget; R-32 freezes all script/movement/frame updates for a blocking command while rendering remains the host's concern; R-33 forbids unsigned fps arithmetic. The THR-1 to THR-3 doc-first rulings are already present in `docs/spec/engine/rpgcode-errors-and-threads.md` (and its linked language/runtime pages), so this plan starts at code.

**Never:** Add generators, promises, timers, wall-clock request timeouts, or stateful closures; implement `core/engine`, open-tick cursor, pause state, renderer redraw, movement ownership, or host sinks; revive per-thread blocking semantics; inspect `../rpgtoolkit`; change goldens without a deliberate behavior explanation.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Thread lifecycle | `thread(file, persist)` plus board/item context | Correct kind, owner, persistence, source/target, id and saved registration; finished threads remain until killed/board/item cleanup | Duplicate blocking thread or invalid target is a located runtime error |
| Sleep/wake | `threadSleep(id, seconds)` with positive, sub-tick, `0`, negative, NaN, or infinity | `max(1,floor(seconds*60+0.5))` absolute end tick; zero is indefinite; wake/remaining are deterministic and same-tick wakes use ascending id | Invalid duration/id is catchable; no wait is entered |
| Tell and movement | `tellThread(id, code)`; `multiRun` over two sprites | Inline code is queued for the target's next turn/context and budget; movement starts are collected into one `movement` wait | Caller is never interrupted; duplicate wait kind is rejected |
| Blocking/request | Blocking command or AD-5 request with `then`, success/failure reply | Global block pauses all script/world phases; reply prepends ordinary input to continuation; host owns wall-clock timeout | Tick timeout resumes with error result and located diagnostic; deadlock names every stuck thread/wait |
| Budget and restore | Never-yielding loop; snapshot during sleep/request | Exactly budget VM instructions per thread per tick, resumes next tick; restored state/replay hash is identical | Preemption is not an error; malformed/mismatched state follows existing restore policy |

</frozen-after-approval>

## Code Map

- `packages/core/src/script/state.ts` — extend `Thread`/`VmState` with persistence, queued inline work, global-block/request and diagnostic metadata; keep `AssertPlainData`, id allocation and finished-thread registration.
- `packages/core/src/ports/wait.ts` — replace the sleep-only union with namespaced `input.key`, `sleep`, `movement` and registry/poll types; retain payload-only plain data and explicit absence.
- `packages/core/src/script/builtins.ts`, `plugin.ts`, `catalogue-stubs.ts` — register E-93 commands and `multiRun`; use `vm.control`/thread effects and the existing `request`/`then` contract, removing real-command stubs.
- `packages/core/src/script/vm.ts` — rework `runWaitsPhase`, `runThreadsPhase`, `advanceScriptTick`, and `runThread`; apply thread effects, queued `tellThread`, global blocking, request replies/timeouts, deadlock checks, and the fixed budget while preserving ascending-id order.
- `packages/core/src/time/time.ts`, `script/index.ts` — reuse deterministic tick/seconds conversion and export the phase handlers, registry and lifecycle surface for epic 4's engine registration; do not add an engine loop.
- `packages/core/src/save/state.ts`, `save/snapshot.ts`, `packages/core/test/fixtures/save/` — bump the VM schema and add a migration for the new plain-data fields.
- `packages/core/test/script-vm.test.ts`, `script-state.test.ts`, `script-catalogue.test.ts`, and a new `script-threads.test.ts` — cover lifecycle, waits, request/reply, R-32, `multiRun`, budget, deadlock and snapshot/replay; update plain-data fixtures as needed.

## Tasks & Acceptance

**Execution:**
- [ ] Extend wait/state/save contracts and migration; preserve canonical absent-vs-null fields and snapshot compatibility.
- [ ] Implement/register thread operations, inline queueing, context handling, movement test-double, request continuations and diagnostic effects.
- [ ] Rework VM phases and budget; expose instruction-granular resumable stepping without taking ownership of engine pause/cursor state.
- [ ] Add the synthetic deterministic thread program and fixture-backed tests for every matrix row.

**Acceptance Criteria:**
- Given board, persistent and item threads, when the synthetic program runs, then sleep/wake, `tellThread`, source/target and kill/lifecycle behavior match E-93/E-95 and restore identically mid-wait.
- Given a blocking command, when it waits, then no script, movement or frame-update phase advances until its completion, while the host may redraw.
- Given a request and recorded success/failure reply, when replayed at its recorded tick, then `then` runs with the reply prepended; a tick timeout yields an error result/located diagnostic and host wall-clock timeout remains external.
- Given a never-yielding loop or two mutually parked threads, when the tick runs, then budget preemption is resumable and deadlock fails headless with both ids and waits.
- Given `multiRun` over two sprites and a registered wait kind, when the movement phase runs, then one coupled movement wait is used and duplicate registration fails.
- Given any VM snapshot or replay, when restored/run again, then canonical state and per-tick hashes are identical.

## Implementation Notes

## Plan Change Log

## Review Triage Log

## Design Notes

R-32 requires distinguishing a cooperative per-thread wait from a globally blocking command: the VM should expose the latter as a plain-data phase status rather than letting other thread phases run. `runWaitsPhase` still polls cooperative waits in ascending id, and a newly resolved wait runs in the same tick. Request continuations and `tellThread` remain data (`command`, arguments, inline source, and source position), never callbacks. The default budget stays a fixed 1000 only as the tested tuning point; callers may inject a smaller budget for deterministic unit tests, but no fps-derived value is introduced.

## Verification

**Commands:**
- `node --test packages/core/test/script-threads.test.ts packages/core/test/script-vm.test.ts packages/core/test/script-state.test.ts packages/core/test/script-catalogue.test.ts` — expected: all thread, wait, request, budget and migration tests pass with no skips.
- `pnpm typecheck` — expected: `AssertPlainData<GameState>` and public exports compile.
- `pnpm test` — expected: all workspace tests pass, including snapshot/replay coverage.
- `pnpm lint && pnpm graph && pnpm provenance && pnpm licence && pnpm golden` — expected: clean, unchanged goldens and no forbidden host/legacy dependencies.

</frozen-after-approval>
