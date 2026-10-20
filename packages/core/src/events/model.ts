/**
 * The `events` section (AD-10; EMIT-10, EMIT-15; docs/spec/engine/rpgcode-modules-and-objects.md#emit-14).
 *
 * Everything the first-class emitter holds between two steps is here, as plain
 * JSON (G1): the one listener table in registration order, the queue of events
 * waiting for delivery, and the dispatch cursor of the delivery in progress. A
 * listener is a callable record, never a closure, so a save taken at any step
 * (between two listeners of one dispatch included) restores and finishes exactly
 * as the unsaved run does.
 *
 * Owner: entry 19.10. Entries 19.11 (cancelable emit) and 19.12 (the game
 * emitter, the registration seam of built-in emitters) extend it.
 */

import type { CallableValue } from "../ports/value.ts";

/** The saved version of the `events` section (AD-23); the section appeared at 1. */
export const EVENTS_SCHEMA_VERSION = 1;

/**
 * One registered listener. `emitter` is the key of the emitter it listens on
 * (`object:<handle>`, or the key of a built-in emitter, EMIT-20); `id` is distinct
 * and never reused; `once` marks a listener removed just before it first runs (EMIT-4).
 */
export type ListenerRecord = {
  id: number;
  emitter: string;
  type: string;
  once: boolean;
  callable: CallableValue;
};

/** One event waiting for delivery: the emitter's key and the handle of the event object (EMIT-6). */
export type QueuedEvent = {
  emitter: string;
  event: number;
};

/**
 * The delivery in progress (EMIT-10, EMIT-14): the event being delivered, the ids
 * of the listeners that were in the table when it was taken (fixed for the whole
 * delivery), the position in that list of the listener in progress and the id of
 * the thread running it, or `null` when none is running.
 */
export type DispatchCursor = {
  emitter: string;
  event: number;
  order: number[];
  index: number;
  thread: number | null;
};

/** The key of the game emitter (EMIT-19, EMIT-20). */
export const GAME_EMITTER = "game";

/** One TypeScript listener a package declares (EMIT-21): an emitter key, an event type and one of the package's commands. */
export type NativeListener = {
  readonly emitter: string;
  readonly type: string;
  readonly command: string;
};

/** The `events` section. */
export type EventsSection = {
  /** The id the next registered listener takes; it never goes down. */
  nextListener: number;
  /** Every listener of every emitter, in registration order. */
  listeners: ListenerRecord[];
  /** The events waiting for delivery, oldest first. */
  queue: QueuedEvent[];
  /** The delivery in progress, or `null` between deliveries. */
  dispatch: DispatchCursor | null;
  /**
   * The built-in emitters a section owner registered (EMIT-20): key to the handle of
   * the object that stands for it. Absent until the first registration, like `cells`
   * in the `vm` section, so a state that never registered one keeps the shape it had.
   */
  emitters?: { [key: string]: number };
};

/** A fresh `events` section: no listener, nothing queued, nothing in progress. */
export function createEventsSection(): EventsSection {
  return { nextListener: 1, listeners: [], queue: [], dispatch: null };
}

/** The emitter key of the object with `handle`. */
export function objectEmitter(handle: number): string {
  return `object:${handle}`;
}

/** The object handle an emitter key names, or `null` when the key names no object. */
export function emitterHandle(emitter: string): number | null {
  if (!emitter.startsWith("object:")) return null;
  const handle = Number(emitter.slice(7));
  return Number.isSafeInteger(handle) && handle >= 1 ? handle : null;
}
