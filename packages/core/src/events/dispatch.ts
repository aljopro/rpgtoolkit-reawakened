/**
 * The `events` phase: delivery of queued events (AD-26; EMIT-3, EMIT-10, EMIT-14;
 * docs/spec/engine/rpgcode-modules-and-objects.md#emit-14).
 *
 * The dispatcher is core-owned, not a script loop (discovery/step-budget-spike.md,
 * recommendation 2). It takes the oldest queued event, fixes the list of
 * listeners at that moment, and runs the listeners of the list in order, each on
 * a new `persistent` world-owned thread whose one statement calls the listener
 * with the event. Everything it needs between two steps is the `events` section
 * (the cursor), so a save taken between any two listeners restores and finishes
 * as the unsaved run does (G1).
 *
 * The listeners started in one phase share one `STEP_BUDGET`. A listener the
 * budget interrupts, or that waits, carries on in the following `threads` phases
 * like any thread and the dispatcher waits for it, so delivery order never
 * changes. No delivery happens while a blocking command waits (R-32).
 */

import { COMPILER_VERSION } from "../script/program.ts";
import { findObject, readMember } from "../script/objects.ts";
import { findBlockingThread, findThread, killThread, localRef, refreshBlock, startThread, type Thread } from "../script/state.ts";
import { collectGarbage, STEP_BUDGET, stepThread, type ScriptServices } from "../script/vm.ts";
import type { CallableValue } from "../ports/value.ts";
import type { GameState } from "../save/state.ts";
import { eventRoots, pruneDeadEmitters } from "./emitter.ts";
import type { DispatchCursor, QueuedEvent } from "./model.ts";

/** The one statement of a listener's thread, and the two locals it reads. */
const LISTENER_NAME = "__listener";
const EVENT_NAME = "__event";
const LISTENER_PROGRAM = `${LISTENER_NAME}(${EVENT_NAME})`;

/** Fix the list of listeners for `next` as of now (EMIT-4): its emitter's, of its type, in table order. */
function beginDispatch(state: GameState, next: QueuedEvent): DispatchCursor | null {
  const event = findObject(state.vm, next.event);
  if (event === undefined) return null;
  const type = readMember(event, "type");
  const order = state.events.listeners
    .filter((listener) => listener.emitter === next.emitter && listener.type === type)
    .map((listener) => listener.id);
  return { emitter: next.emitter, event: next.event, order, index: 0, thread: null };
}

/** Start the thread that calls `callable` with the event object (EMIT-14). */
function startListenerThread(state: GameState, callable: CallableValue, event: number): Thread {
  const thread = startThread(state.vm, {
    ref: { kind: "inline", text: LISTENER_PROGRAM, compiler: COMPILER_VERSION },
    kind: "persistent",
    owner: "world",
  });
  const locals = thread.frames[0]!.locals;
  locals[LISTENER_NAME] = { value: callable, ref: localRef(LISTENER_NAME) };
  locals[EVENT_NAME] = { value: { kind: "object", handle: event, className: "" }, ref: localRef(EVENT_NAME) };
  return thread;
}

/**
 * Run the `events` phase (EMIT-14): deliver queued events, oldest first, until
 * the queue is empty, the shared step budget is spent, a listener is still
 * running or a blocking command waits.
 */
export function runEventsPhase(state: GameState, services: ScriptServices, budget: number = STEP_BUDGET): void {
  const { vm, events } = state;
  let remaining = budget;
  for (;;) {
    if (findBlockingThread(vm) !== null) return;
    const cursor = events.dispatch;
    if (cursor === null) {
      const next = events.queue.shift();
      if (next === undefined) return;
      events.dispatch = beginDispatch(state, next);
      continue;
    }
    if (cursor.thread !== null) {
      const running = findThread(vm, cursor.thread);
      if (running !== undefined && running.status !== "finished") return;
      if (running !== undefined) killThread(vm, running.id);
      cursor.thread = null;
      cursor.index += 1;
      continue;
    }
    if (cursor.index >= cursor.order.length) {
      events.dispatch = null;
      continue;
    }
    if (remaining <= 0) return;
    const at = events.listeners.findIndex((listener) => listener.id === cursor.order[cursor.index]);
    if (at < 0) {
      cursor.index += 1;
      continue;
    }
    const listener = events.listeners[at]!;
    if (listener.once) events.listeners.splice(at, 1);
    const thread = startListenerThread(state, listener.callable, cursor.event);
    cursor.thread = thread.id;
    remaining -= stepThread(thread, vm, services, remaining);
    refreshBlock(vm, services.view.clock.tick());
  }
}

/**
 * The end-of-tick pass with the emitter's roots (R-34, EMIT-14, EMIT-16): the listener
 * table and the queued events keep their callables' cells and receivers and their
 * event objects alive, as does a thread parked on a cancelable emit, and the
 * listeners of an emitter the pass freed go with it.
 */
export function collectStateGarbage(state: GameState): void {
  collectGarbage(state.vm, eventRoots(state.events, state.vm));
  if (pruneDeadEmitters(state.events, state.vm) > 0) collectGarbage(state.vm, eventRoots(state.events, state.vm));
}
