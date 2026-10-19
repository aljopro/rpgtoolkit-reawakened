---
type: discovery
title: "Spike result: a stock ATB tick and cancelable emits against STEP_BUDGET"
date: 2026-10-19
ticket: 2
baseline_revision: 962afc7e
---

# Spike result (entry 19.2): does an RPGCode ATB tick with events fit STEP_BUDGET?

**Verdict: GO, with two design conditions. NO-GO for the naive shape.**

* **Go:** a stock ATB battle written in RPGCode, with per-hit events and parked cancelable emits, fits `STEP_BUDGET = 1000` per thread per tick, and a save at every step of a parked dispatch restores to the same state at every step. The owner's queued (asynchronous) emitter rule raises no G1 state-machine issue that this model can show.
* **No-go (naive shape):** *one* battle thread that steps all four fighters and runs every listener inline does **not** fit when two or more fighters act on the same tick. With no events at all, the worst tick (all four act) already needs 1389 steps. With three listeners per event it needs 2267.
* **Condition 1 — the battle is not one thread.** Run each fighter on its own thread (the budget is per thread, THR-3), or have the core own the charge accumulator so an idle tick costs the script nothing. One thread per fighter with three inline listeners peaks at 565 steps, 435 under the cap.
* **Condition 2 — a cancelable emit costs its emitter about two ticks.** The emitter parks, the dispatcher runs the listeners on the next tick, the emitter resumes the tick after. Measured 1.97 ticks per emit. Epic 20 must plan its battle timing for that, and entry 19.11 should decide whether to remove it (see Recommendations).

Epic 20 does not need a different architecture. It needs per-fighter threads or a core tick accumulator, and a decision on cancelable-emit latency.

## Method

The benchmark is `packages/core/test/step-budget-spike.test.ts`; `pnpm test` runs it. `STEP_SPIKE_REPORT=1 node --test packages/core/test/step-budget-spike.test.ts` prints the tables below. It is deterministic (seed 7, no wall clock): two runs give the same canonical state and the same per-tick step counts, and the test asserts both.

It drives the real VM, phase by phase, in the order `advanceScriptTick` uses (waits, threads, time, garbage collection), and records what `stepThread` returns for every thread every tick. Two budgets are used: **demand** (budget 1,000,000, nothing preempted, so the number is what the code needs) and **real** (`STEP_BUDGET`, counting preemptions). One *step* is one VM instruction, the unit THR-3 counts.

**What is modelled, and from what.**

* Fighters: 2 players and 2 enemies. Ada (hp 30, fp 6, dp 4) and Slime (hp 12, fp 3, dp 1) from `docs/spec/examples/listings/hero.tem.txt` and `slime.ene.txt`. Charge `+3` per tick; act at 75 (players) and 123 (enemies) per E-72. Players act automatically (the menu wait is excluded, which makes this a pessimistic count of actions). Starting charges are random (`random()`, seeded) in the typical run; in the burst run every fighter starts 3 under its threshold.
* The ATB tick: charge, act when charged, statuses applied when a fighter acts (E-75, two statuses per fighter: one costs 1 HP per round, one heals 1), pick a target, damage = fp + `random(3)` − dp (min 1, E-74), then events. Each action emits a cancelable `damage` event (a listener shield halves it, a cancel listener can cancel it, a log listener records it), then a plain `hit` event and, on a fall, a plain `fallen` event.
* "Objects and emitters" are modelled with what exists today: fighters are flat arrays in globals (`hp[0]`, `ch[1]`), an event is the globals `evD` and `evCancel`, a listener is a lambda in a global array (`lis[type*16+k]`, a `CallableValue` from Epic 18, so plain data), the listener table is a hand-rolled list walked in registration order, `emit` is a lambda. No production emitter, object runtime or engine phase was added.
* Plain queued emit: the emitter appends `{type, a, b, d}` to a queue in globals and carries on; a dispatcher thread drains it each tick.
* Parked cancelable emit: the emitter appends a plain-data entry (arguments and its thread id), wakes the dispatcher thread and parks itself with an indefinite `threadsleep`; the dispatcher runs the listeners in registration order, stores the result in a per-thread slot, wakes the owner and goes on to the next entry. This is the `event.dispatch` wait of EMIT-5 built from the 18.x wait kinds that exist.

## Results

Steps per thread per tick, from the benchmark (typical = 300 ticks of a seeded battle, 38 actions; worst = the burst where all four fighters act on the same tick). `L` is listeners per event type. Headroom is `1000 − worst peak`; negative means the tick cannot finish inside one engine tick and is **preempted** at the budget, not failed (THR-3), so its remaining work lands on the next tick and the battle runs late.

| Config | Typical peak | Worst tick (4 act) | Headroom | Preempted (real budget) / ticks to finish 4 actions |
|---|---|---|---|---|
| A0 one thread, no emits | 534 | 1389 | −389 | 1 / 2 |
| A1 one thread, L=0 (emit call only) | 534 | 1389 | −389 | 1 / 2 |
| A2 one thread, L=3 inline | 753 | 2267 | −1267 | 2 / 3 |
| A3 one thread, L=3 inline, no statuses | 659 | 1891 | −891 | 1 / 2 |
| A4 one thread, L=3, 4 statuses adjusting speed every tick | 1295 | 3091 | −2091 | 3 / 4 |
| A5 one thread, L=8 inline | 1125 | 3371 | −2371 | 3 / 4 |
| A6 one thread, L=16 inline | 1686 | 4760 | −3760 | 4 / 5 |
| B1 one thread, L=3, plain emits queued (dispatcher thread) | 647 (dispatcher 168) | 1843 (dispatcher 632) | −843 | 1 / 2 |
| B2 one thread, L=8, plain emits queued | 824 (dispatcher 363) | 2468 (dispatcher 1062) | −1468 | 2 / 3 |
| C1 one thread, L=3, parked cancelable + queued plain | 439 (dispatcher 190) | 350 (dispatcher 190) | **650** | 0 / 8 |
| C2 one thread, L=8, parked cancelable + queued plain | 439 (dispatcher 372) | 372 (dispatcher 372) | **628** | 0 / 8 |
| D0 per-fighter threads, no emits | 346 | 342 | **658** | 0 / 1 |
| D1 per-fighter threads, L=3 inline | 565 | 565 | **435** | 0 / 1 |
| D2 per-fighter threads, L=8 inline | 937 | 937 | **63** | 0 / 1 |
| D3 per-fighter threads, L=3 parked + queued | 360 (dispatcher 360) | 707 (dispatcher 707) | **293** | 0 / 3 |
| D4 per-fighter threads, L=8 parked + queued | 713 (dispatcher 713) | 1392 (dispatcher 1392) | −392 | 1 / 4 |
| E1 mortal fighters (stock HP, `fallen` fires), one thread, L=3 parked + queued | 439 (dispatcher 311) | 350 (dispatcher 190) | **650** | 0 / 8 |

**Reading the C rows.** The parked rows look cheap only because the battle thread is parked most of the time: it loses about two ticks per action (C1: 63 lost thread-ticks over 32 actions, 1.97 each; D3: 72 over 36, 2.0). The four burst actions take 8 ticks on one thread (each parks in turn) and 3 on four threads (the dispatcher drains all four entries in one tick). The steps are not saved, they are spread over more ticks.

**The cost of the pieces** (measured on the same VM, one call each, minus the trailing sleep):

| Operation | Steps |
|---|---|
| `x = 1` | 4 |
| `hits[a] = hits[a] + 1` | 10 |
| call a 3-argument lambda with an empty body | 6 |
| call a 3-argument lambda whose body is `hits[a] = hits[a] + 1` | 16 |
| `local(a)` (one name per call) | 5 |
| `random(3)` | 5 |
| `threadwake(1)` | 3 |
| one empty `for` iteration | 12 |
| an empty listener loop (`for` + `nl[t]` test, zero listeners) | 19 |
| one listener through the loop (`pf = lis[t*16+pk]; pf(a,b,d)` + the 16-step body above) | 39 |
| an idle fighter step (charge it, test the threshold) | 40 |
| an idle tick of four fighters on one thread | 244 |
| one action with two statuses, no listeners (D0) | about 342 |

So a listener costs about **36 to 39 steps** end to end, of which only 16 are the listener's own call and tiny body; about 23 are the hand-rolled loop bookkeeping and the table lookup. An action with zero listeners costs about 342 steps, so **two actions in one tick already cost 684, three cost 1026**. A single thread that runs the whole battle fits a tick only when at most two fighters act and listeners are few.

## Headroom against STEP_BUDGET

* **A thread running one fighter** has 435 to 658 steps spare with up to three inline listeners per event, 63 with eight. The typical idle step is 40.
* **A thread running the whole battle** has about 756 spare on an idle tick (244 used) and runs out when more than one fighter acts, **even with no events**. Idle cost alone is a quarter of the budget.
* **A dispatcher thread** draining plain events costs 168 steps typical and 632 in the burst at L=3; at L=8 it reaches 1062 in the burst, over the cap. Its overrun is harmless: the dispatcher is preempted and finishes next tick (events are delivered a tick late), and it never blocks the fighters.
* **Deterministic fit is the wrong target for the burst.** The burst is rare for the stock constants (players act every 25 ticks, enemies every 41). The sound design makes the burst safe rather than impossible, which per-fighter threads and a bounded dispatcher both do.

## How the real features change the numbers

These are estimates, labelled as such. They are derived from the measured component costs above, not from a built feature. [INFERENCE]

* **Host-provided emitter methods (OOP-12), core-owned dispatcher.** A plain `emit` that is one engine command (push `{type, detail}` on the queue) costs a handful of steps instead of about 12 to 20 for the script `emitP`, and the listener loop and table lookup move into TypeScript. Per listener the cost falls from about 39 to about 16 plus a frame push, roughly 2.4 times cheaper. That would put eight listeners at about 130 steps per event, not 313.
* **Dictionary objects (OOP-10) and bound members (OOP-11).** The event becomes one object handle instead of globals; each field read or write is a member access that the model currently pays as a global access (a few steps). Expect each listener to cost the same or slightly more; a `this`-bound method call adds the receiver push. Net effect on the measured per-listener cost is small compared with the loop saving above.
* **Parked dispatch as a first-class wait.** The `event.dispatch` wait is polled by the wait registry (AD-9) instead of emulated with `threadsleep`/`threadwake` plus an entry queue. It saves the `threadwake`, `threadsleep` and bookkeeping steps (about 30 per emit) and, if the dispatch runs in an `events` phase between threads and time, the resume still lands next tick unless the thread phase is run a second time (see Recommendations).
* **Atomic enqueue-and-park.** In the model the enqueue, the wake and the park are separate steps, so a preemption between them (the emitter is at its budget) could wake a thread that has not parked yet. The built wait must make it one operation (see Risks).

## G1 and the queued (asynchronous) emitter rule

The spike model keeps every piece of the dispatch in plain JSON in `vm`: the queue (`qT/qA/qB/qD`, head and tail), the parked-dispatch entries (`cA/cB/cD/cO`, head and tail), the listener table (`CallableValue` records), the cursor (the dispatcher thread's frames: which entry, which listener index) and the parked emitters (indefinite sleep waits). Nothing is a closure, generator or promise.

Check, run by the benchmark: four fighters acting together, every thread given **one step per tick** (so every tick boundary is a step boundary, including between two listeners of one dispatch and while emitters are parked), the whole state saved with `snapshot`, restored with `restoreGameState` into fresh services, and continued, at **every step for 1500 steps**. The restored run equals an uninterrupted run **at every step** (the canonical state string is compared at each one, not only at the end). The run included steps where an emitter was parked with its entry still queued, and steps where the dispatcher was inside a listener call. It also covers EMIT-5 and EMIT-6: a cancelable emit hands the emitter the event as mutated by the shield listener (HP drops by the halved value the log listener recorded), and with a listener that cancels every hit no HP changes while a listener registered after the canceling one still runs and the emitter sees the cancel.

**Conclusion: no G1 state-machine issue is shown. EMIT-10 and the AD-32 amendment stand as written.** What this does not show: the real `events` section, the dispatch cursor as a dedicated section rather than the dispatcher thread's frames, TypeScript listeners (EMIT-7) and the engine-phase dispatch of EMIT-11. Those are entry 19.10 to 19.12's own checks.

## Risks

1. **A preempted emitter.** If the emitter is preempted after the entry is queued and the dispatcher is woken but before it parks, the wake finds a ready thread and does nothing, and the thread then parks for good (the 18.x deadlock check would then report a deadlock at the end of the tick). The built wait must enqueue and park in one operation.
2. **Two-tick latency per cancelable emit.** Measured 1.97 ticks per emit with the existing wake order (a thread woken during the threads phase runs the following tick, and the dispatcher cannot resume the emitter in the tick it ran). For a stock battle at 60 ticks per second that is 33 ms per hit and is serial for one thread (8 ticks for a burst of four on one thread).
3. **One-thread battle scripts.** A single battle thread overruns in any tick where two fighters act, with no events at all. The overrun is not an error (preemption, then the battle runs a tick late), but timing becomes irregular and the ATB bar can visibly stutter.
4. **Dispatcher overrun.** An unbounded dispatcher at L=8 can exceed the cap in a burst; it is preempted and resumes, so events are delayed a tick, never lost, but the delay is observable. Bound it by design, not by luck.
5. **Case-insensitive variable names.** `cHead` is stored as `chead`; the benchmark's own first save check failed on that. Irrelevant to the design, relevant to anyone inspecting `vm.globals` in tests.
6. **`local()` takes one name per call** (five steps each), so a lambda with four locals pays 20 steps before it works. Entry 19.4's `this` binding and any stock script using locals should account for it.

## Recommendations (entries 19.10 to 19.12 refinement, Epic 20)

1. **Epic 20 (battle):** run each fighter on its own thread, or move the charge accumulator into the core (a core-owned tick that charges and tests the threshold, and calls into script only when a fighter acts). Both fit; the second makes an idle tick free for the script (the 244-step idle cost goes to zero) and is the safer default if players may add many fighters. Do **not** write the stock battle as one script thread that steps all fighters.
2. **Entry 19.10 (first-class emitter, queued emit):** make the dispatcher core-owned (TypeScript pushing listener frames), not a script loop; that removes about 23 of the 39 steps per listener. Deliver in a named `events` phase as EMIT-3 proposes. Bound the dispatch per tick (a step budget for the dispatcher, resume next tick) so eight or more listeners never starve other threads.
3. **Entry 19.11 (cancelable emit):** keep the owner's parked plain-JSON `event.dispatch` wait. Make enqueue-and-park one operation. Decide on latency: either accept two ticks and tell Epic 20, or have the dispatch run in the same engine tick that the emitter parked by running the `events` phase between threads and the next wait poll (one tick) or by running the listeners as frames pushed on the emitting thread itself, the `tellThread` queue mechanism, which would need no park and cost zero ticks [INFERENCE: not built or measured here]. The second is not what EMIT-5 rules today (park on a wait); revisit EMIT-5 only if the owner wants zero-tick cancelable emits.
4. **Entry 19.12 (game emitter, registration seam):** fire the `error` event as a plain queued emit; it costs the emitter a handful of steps and never blocks.
5. **Budget policy for the sizing rule:** document in the spec that a script thread has 1000 steps per tick, an action with no listeners costs about 340 steps and a listener about 40 today (about 16 once the core owns the dispatcher), so a stock battle sizes its listener counts and fighters per thread with those numbers. The numbers move with the compiler; the benchmark is the regression guard.

## What this spike does not establish

* The real emitter, object runtime and receiver binding are not built; the numbers above are a model on arrays and globals. The estimates under "How the real features change the numbers" are inference until entries 19.3 to 19.12 land and the benchmark is re-run against them (entry 19.11's verification already requires step cost to match this measurement within its stated headroom: 63 steps at L=8 per-fighter inline, 435 at L=3).
* Players waiting on the menu (a menu wait is a park, not budget; the model has them act automatically, which is the heavier case).
* A TypeScript plugin that listens through the bus (EMIT-7) and engine-phase dispatch (EMIT-11).
* Wall-clock time: only VM steps are measured (G3, no clock in `core`).
