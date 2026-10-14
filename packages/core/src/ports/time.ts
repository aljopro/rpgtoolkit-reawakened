/**
 * The injected clock (G3.1, AD-2).
 *
 * AD-2 rules that the injected clock **is** the tick counter supplied through
 * `advance`, so `tick()` returns `GameState.time.tick` and nothing else. A
 * built-in reads it through a `ClockPort`; only `core/time`'s `runTimePhase`
 * mutates the counter. No wall clock reaches `core`.
 */

/** The tick counter, as a port (G3.1, AD-2). */
export type ClockPort = { tick(): number };
