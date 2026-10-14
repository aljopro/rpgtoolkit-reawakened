/**
 * Time is the tick counter (AD-2, AD-10; format-spec §9.15).
 *
 * `TimeState` is the `time` section of `GameState`: one integer, the tick the
 * phases read. `runTimePhase` is the `time` phase action — it increments the
 * counter once per tick, at the end of the phase list. `createClockPort` binds
 * G3.1's injected clock to that counter (AD-2: "the injected clock **is** the
 * tick counter supplied through `advance`").
 *
 * `core/time` is the sole owner of seconds↔ticks conversion (AD-2):
 * `secondsToTicks`, `fpsToTicks` and `frameAt` arrive with entry 13's
 * `delay`/`getTickCount`. The provisional `sleep(ticks)` built-in takes whole
 * ticks, so the rounding formula `max(1, floor(seconds * 60 + 0.5))`
 * (§9.15 THR-1) is not needed yet.
 */

import type { ClockPort } from "../ports/time.ts";

/** The `time` section: the tick counter, incremented once per tick (AD-2). */
export type TimeState = { tick: number };

/** A fresh `time` section at tick 0, before the first tick runs. */
export function createTimeState(): TimeState {
  return { tick: 0 };
}

/**
 * The `time` phase action: advance the tick counter by one. The waits and
 * threads phases of a tick read the counter before this runs, so a `sleep`
 * entered at tick `T` stores `until = T + ticks`.
 */
export function runTimePhase(state: TimeState): void {
  state.tick += 1;
}

/** Bind the injected clock to the live counter (AD-2, G3.1). */
export function createClockPort(state: TimeState): ClockPort {
  return { tick: () => state.tick };
}
