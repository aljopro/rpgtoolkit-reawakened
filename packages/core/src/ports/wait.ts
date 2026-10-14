/**
 * Waits: one wake contract (AD-9; format-spec §9.15 THR-1).
 *
 * A blocked thread holds a `Wait` — plain data in `Thread.wait` — until its
 * owner's `poll` resolves it. The tracer implements exactly one kind, `sleep`,
 * whose payload is the absolute end tick `T + ticks`: the poll is then
 * `view.tick >= wait.until` with nothing else in state (AD-9's "the payload is
 * `PlainData`" and "a wait uses no closure and no timer"). The union grows one
 * variant per owning epic.
 *
 * `WaitView` is the small read-only view a poll sees — the tick counter the
 * `time` phase advances. `WaitResult` carries the value the woken call
 * contributes; it is pushed onto the thread's operands. `WaitPoll` is the
 * resolver signature AD-9 rules the only one.
 */

import type { Value } from "./value.ts";

/** A sleep wait, in whole ticks: wake at absolute tick `until` (§9.15 THR-1). */
export type Wait = { readonly kind: "sleep"; readonly until: number };

/** What a poll may read of the world while deciding: the current tick. */
export type WaitView = { readonly tick: number };

/** The value a resolved wait contributes to its call (AD-8's `done`). */
export type WaitResult = { readonly value: Value };

/** The one resolver signature: `null` means "not yet" (AD-9). */
export type WaitPoll = (view: WaitView, wait: Wait) => WaitResult | null;
