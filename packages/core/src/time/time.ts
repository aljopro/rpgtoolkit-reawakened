/**
 * Time is the tick counter (AD-2, AD-10; docs/spec/engine/rpgcode-errors-and-threads.md#threads).
 *
 * `TimeState` is the `time` section of `GameState`: one integer, the tick the
 * phases read. `runTimePhase` is the `time` phase action — it increments the
 * counter once per tick, at the end of the phase list. `createClockPort` binds
 * G3.1's injected clock to that counter (AD-2: "the injected clock **is** the
 * tick counter supplied through `advance`").
 *
 * `core/time` is the sole owner of seconds↔ticks conversion (AD-2):
 * `secondsToTicks` (THR-1's `max(1, floor(seconds * 60 + 0.5))`, used by
 * `threadSleep`; entry 13's `delay` reuses it) lives here, and `fpsToTicks` and
 * `frameAt` arrive with the entries that use them. The blocking `sleep(ticks)`
 * built-in takes whole ticks, so it needs no conversion.
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

/** The largest tick count a tick or an end tick may hold: the exact-integer limit of a double. */
export const MAX_TICK = 9007199254740991;

/** The fixed simulation rate (AD-2): 60 ticks a second. */
export const TICKS_PER_SECOND = 60;

/**
 * THR-1's seconds-to-ticks conversion: `max(1, floor(seconds * 60 + 0.5))`,
 * using a double multiply and `Math.floor`/`Math.max` only. A duration of
 * exactly `0` (or `-0`) is the indefinite sleep and gives `0`. A negative or
 * non-finite duration, or a tick count above `MAX_TICK`, gives `null` and the
 * caller raises the catchable error.
 */
export function secondsToTicks(seconds: number): number | null {
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  if (seconds === 0) return 0;
  const ticks = Math.max(1, Math.floor(seconds * TICKS_PER_SECOND + 0.5));
  return ticks > MAX_TICK ? null : ticks;
}
