/**
 * Waits: one wake contract (AD-9; docs/spec/engine/rpgcode-errors-and-threads.md#threads THR-1, R-32).
 *
 * A blocked thread holds a `Wait` — plain data in `Thread.wait` — until the
 * one `WaitPoll` resolves it. Every kind carries its own payload, never a
 * closure or a timer (AD-9: "a wait uses no closure and no timer"):
 *
 * - `sleep` stores the absolute end tick `T + ticks`; `until: null` is the
 *   indefinite sleep (`threadSleep(id, 0)`) that only `threadWake` ends.
 *   `resumesCall` says whether the woken thread is waiting on its own call,
 *   which then contributes the wake value to its operands. A sleep imposed on
 *   another thread from outside leaves the stack alone.
 * - `input.key` waits for a key; the input owner stores the key name into
 *   `key`, and the poll then resolves.
 * - `movement` waits for the coupled movement of several sprites: one wait
 *   holds every move that `multiRun` collected, each with its absolute end tick.
- `request` waits for a host reply (AD-5). The host stores the reply into
  `reply`; a tick `deadline` bounds the wait inside the deterministic tick
  clock (a wall-clock timeout stays the host's). `then` is the named
  continuation that runs with the reply prepended (ADR 0004 decision 7).
- `blob` is the file-I/O-owned request wait (AD-9/AD-17). It has the same
  reply shape as `request`, but is separately registered so file operations can
  be extended without claiming the generic request kind.
 *
 * `global` marks a blocking command (R-32): while one waits, every other
 * script thread, movement and frame update stands still. A cooperative wait
 * (`global: false`) parks only its own thread.
 *
 * `WaitView` is the small read-only view a poll sees — the tick counter the
 * `time` phase advances. `WaitResult` carries the value the woken call
 * contributes and whether it succeeded. `WaitPoll` is the resolver signature
 * AD-9 rules the only one; `createWaitPoll` builds it from per-kind resolvers
 * and refuses a duplicate kind.
 */

import type { PlainData } from "./plain-data.ts";
import type { Value } from "./value.ts";

/** One sprite's move inside a `movement` wait: it ends at absolute tick `until`. */
export type WaitMove = { sprite: string; until: number };

/** The reply the host (or a replay) gives a request (AD-5). */
export type WaitReply = { ok: boolean; value: Value };

/** A request's continuation: a named command and plain-data arguments, never a closure. */
export type WaitContinuation = { command: string; args: PlainData[] };

/** A sleep wait, in whole ticks (THR-1). */
export type SleepWait = {
  kind: "sleep";
  global: boolean;
  until: number | null;
  resumesCall: boolean;
};

/** A named plugin-owned wait. Its payload and output references are saveable data. */
export type NamedWaitKind = "render.msgbox" | "input.mouse" | "menu.screen" | "audio.sfx" | "video";

export type NamedWait = {
  kind: NamedWaitKind;
  global: boolean;
  /** Stable command name, useful to a resolver and to replay diagnostics. */
  id: string;
  payload: PlainData[];
  /** References receive the resolver's returned value, in declaration order. */
  resumeRefs: string[];
};

/** A wait for a key; `key` is `null` until the input owner supplies it. */
export type InputKeyWait = { kind: "input.key"; global: boolean; key: string | null; resumeRefs?: string[] };

/** A wait for coupled sprite movement (`multiRun`, E-33). */
export type MovementWait = { kind: "movement"; global: boolean; moves: WaitMove[] };

/** A wait for a host reply (AD-5), located at the call that made it. */
export type RequestWait = {
  kind: "request";
  global: boolean;
  reqId: number;
  deadline: number | null;
  reply: WaitReply | null;
  then: WaitContinuation | null;
  file: string;
  line: number;
};

/** A sandboxed file/blob request wait (AD-9, AD-17). */
export type BlobWait = {
  kind: "blob";
  global: boolean;
  reqId: number;
  deadline: number | null;
  reply: WaitReply | null;
  then: WaitContinuation | null;
  file: string;
  line: number;
};

/** Every wait kind the VM registry knows (AD-9). */
export type Wait = SleepWait | InputKeyWait | MovementWait | RequestWait | BlobWait | NamedWait;

/** The wait kind names, namespaced where an owner part owns the kind. */
export type WaitKind = Wait["kind"];

/** What a poll may read of the world while deciding: the current tick. */
export type WaitView = { readonly tick: number };

/** The value a resolved wait contributes to its call, and whether it succeeded (AD-8's `done`). */
export type WaitResult = { readonly value: Value; readonly ok: boolean };

/** The one resolver signature: `null` means "not yet" (AD-9). */
export type WaitPoll = (view: WaitView, wait: Wait) => WaitResult | null;

/** One kind's resolver, registered into the single `WaitPoll`. */
export type WaitKindResolver = {
  readonly kind: string;
  readonly poll: WaitPoll;
};
