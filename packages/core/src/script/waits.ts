/**
 * The wait registry: per-kind resolvers folded into AD-9's one `WaitPoll`
 * (docs/spec/engine/rpgcode-errors-and-threads.md#threads THR-1; R-32).
 *
 * AD-9 rules `poll(view, wait)` the only wake resolver. Each kind contributes
 * one resolver and `createWaitPoll` dispatches on `wait.kind`; a kind
 * registered twice is refused (`wait.duplicate-kind`), and a wait whose kind
 * nobody registered fails loudly (`wait.unknown-kind`) rather than sleeping
 * forever. Owner epics add their kinds (`menu.screen` and the like) by
 * building their own poll over `WAIT_KIND_RESOLVERS` plus theirs.
 *
 * Every resolver is pure over the wait payload and the tick: no closure, no
 * timer, nothing outside state.
 */

import type { Wait, WaitKindResolver, WaitPoll, WaitResult, WaitView } from "../ports/wait.ts";
import { ScriptError } from "./errors.ts";

/** The text a request that ran out its tick deadline resumes with. */
export const REQUEST_TIMEOUT_TEXT = "the request timed out";

const DONE: WaitResult = { value: null, ok: true };

/** `sleep`: due at `until`; `until: null` is indefinite and only a wake ends it. */
export function pollSleep(view: WaitView, wait: Wait): WaitResult | null {
  if (wait.kind !== "sleep" || wait.until === null) return null;
  return view.tick >= wait.until ? DONE : null;
}

/** `input.key`: resolved once the input owner has stored the key. */
export function pollInputKey(_view: WaitView, wait: Wait): WaitResult | null {
  if (wait.kind !== "input.key" || wait.key === null) return null;
  return { value: wait.key, ok: true };
}

/** `movement`: resolved when every collected move has reached its end tick. */
export function pollMovement(view: WaitView, wait: Wait): WaitResult | null {
  if (wait.kind !== "movement") return null;
  for (const move of wait.moves) {
    if (view.tick < move.until) return null;
  }
  return DONE;
}

/** `request`: resolved by the stored reply, else by the tick deadline (an error result). */
export function pollRequest(view: WaitView, wait: Wait): WaitResult | null {
  if (wait.kind !== "request") return null;
  if (wait.reply !== null) return { value: wait.reply.value, ok: wait.reply.ok };
  if (wait.deadline !== null && view.tick >= wait.deadline) {
    return { value: REQUEST_TIMEOUT_TEXT, ok: false };
  }
  return null;
}

/** The kinds the VM itself owns: `sleep`, `input.key`, `movement` and `request`. */
export const WAIT_KIND_RESOLVERS: readonly WaitKindResolver[] = [
  { kind: "sleep", poll: pollSleep },
  { kind: "input.key", poll: pollInputKey },
  { kind: "movement", poll: pollMovement },
  { kind: "request", poll: pollRequest },
];

/**
 * Fold per-kind resolvers into the one `WaitPoll` (AD-9). Throws
 * `wait.duplicate-kind` when two resolvers claim a kind.
 */
export function createWaitPoll(resolvers: readonly WaitKindResolver[]): WaitPoll {
  const byKind = new Map<string, WaitPoll>();
  for (const resolver of resolvers) {
    if (byKind.has(resolver.kind)) {
      throw new ScriptError(
        "wait.duplicate-kind",
        `the wait kind "${resolver.kind}" is registered twice (AD-9)`,
      );
    }
    byKind.set(resolver.kind, resolver.poll);
  }
  return (view, wait) => {
    const resolve = byKind.get(wait.kind);
    if (resolve === undefined) {
      throw new ScriptError("wait.unknown-kind", `no resolver is registered for wait kind "${wait.kind}"`);
    }
    return resolve(view, wait);
  };
}

/** The default poll: the VM-owned kinds only. */
export const defaultWaitPoll: WaitPoll = createWaitPoll(WAIT_KIND_RESOLVERS);

/** A short plain description of a wait, for diagnostics (deadlock reports). */
export function describeWait(wait: Wait): string {
  switch (wait.kind) {
    case "sleep":
      return wait.until === null ? "sleep(indefinite)" : `sleep(until tick ${wait.until})`;
    case "input.key":
      return "input.key";
    case "movement":
      return `movement(${wait.moves.length} move(s))`;
    case "request":
      return `request(reqId ${wait.reqId})`;
  }
}
