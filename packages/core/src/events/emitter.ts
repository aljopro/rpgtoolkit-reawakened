/**
 * The emitter operations over the `events` section (EMIT-2, EMIT-4, EMIT-14;
 * docs/spec/engine/rpgcode-modules-and-objects.md#emit-14): add a listener,
 * remove one or all of a type, and queue an event. Every function is a plain
 * function over plain data (G1): no clock, no randomness, no closure in state.
 *
 * Delivery is `dispatch.ts`'s; this file never runs a listener.
 */

import type { ObjectValue, Value } from "../ports/value.ts";
import { CALLABLE_NOT_CALLABLE, OBJECT_INVALID, ScriptError } from "../script/errors.ts";
import { createObject, findObject, isDictionary, writeMember } from "../script/objects.ts";
import type { ObjectRecord, VmState } from "../script/state.ts";
import { isCallableValue } from "../script/values.ts";
import type { CallableValue } from "../ports/value.ts";
import { emitterHandle, objectEmitter, type EventsSection } from "./model.ts";

/** The emitter methods every object has (EMIT-2): the names, folded as the lexer folds them. */
const EMITTER_METHODS: Record<string, true> = { on: true, once: true, off: true, emit: true };

/** Whether `name` is one of the host-provided emitter methods of every object (OOP-12, EMIT-2). */
export function isEmitterMethod(name: string): boolean {
  return Object.hasOwn(EMITTER_METHODS, name);
}

/** Whether two callables are the same listener for `off` (EMIT-4): same `def`, `captures` and receiver. */
export function callablesEqual(left: CallableValue, right: CallableValue): boolean {
  if (left.def !== right.def || left.receiver !== right.receiver || left.captures.length !== right.captures.length) return false;
  return left.captures.every((id, index) => id === right.captures[index]);
}

function badArg(op: string, message: string): ScriptError {
  return new ScriptError("builtin.bad-arg", `${op}: ${message}`);
}

function isObjectValue(value: Value | undefined): value is ObjectValue {
  return typeof value === "object" && value !== null && "kind" in value && value.kind === "object";
}

/** The live object `value` names, or the catchable `object.invalid` (EMIT-14). */
function liveEmitter(vm: VmState, op: string, value: Value | undefined): ObjectRecord {
  const record = isObjectValue(value) ? findObject(vm, value.handle) : undefined;
  if (record === undefined) throw new ScriptError(OBJECT_INVALID, `${op}: the emitter is not a live object`);
  return record;
}

function eventType(op: string, value: Value | undefined): string {
  if (typeof value !== "string") throw badArg(op, "the event type must be a string");
  return value;
}

function listenerCallable(op: string, value: Value | undefined): CallableValue {
  if (!isCallableValue(value)) throw new ScriptError(CALLABLE_NOT_CALLABLE, `${op}: the listener must be a callable`);
  return value;
}

/**
 * Apply one emitter command (EMIT-14). `op` is `on`, `once`, `off` or `emit`;
 * `emitter` is the object it is applied to and `rest` its other arguments in
 * order: the type, then the callable (`on`, `once`, `off`) or the detail (`emit`).
 * The method form and the free-function form both land here.
 */
export function applyEmitterOp(
  vm: VmState,
  events: EventsSection,
  op: string,
  emitter: Value | undefined,
  rest: readonly Value[],
): void {
  const record = liveEmitter(vm, op, emitter);
  const key = objectEmitter(record.handle);
  const type = eventType(op, rest[0]);
  if (op === "on" || op === "once") {
    addListener(events, key, type, listenerCallable(op, rest[1]), op === "once");
    return;
  }
  if (op === "off") {
    removeListeners(events, key, type, rest.length > 1 ? listenerCallable(op, rest[1]) : undefined);
    return;
  }
  if (op === "emit") {
    queueEvent(vm, events, record, type, rest.length > 1 ? detailRecord(vm, op, rest[1]) : undefined);
    return;
  }
  throw badArg(op, "is not an emitter command");
}

function detailRecord(vm: VmState, op: string, value: Value | undefined): ObjectRecord {
  const record = isObjectValue(value) ? findObject(vm, value.handle) : undefined;
  if (record === undefined || !isDictionary(record)) throw badArg(op, "the detail must be a dictionary");
  return record;
}

/** Append a listener to the one table, so registration order is the order of the table (EMIT-4). */
function addListener(events: EventsSection, emitter: string, type: string, callable: CallableValue, once: boolean): void {
  events.listeners.push({ id: events.nextListener, emitter, type, once, callable });
  events.nextListener += 1;
}

/**
 * Remove the first listener of `emitter` and `type` whose callable equals `fn`,
 * or every listener of that type when `fn` is absent (EMIT-4). A call that
 * matches nothing does nothing.
 */
function removeListeners(events: EventsSection, emitter: string, type: string, fn: CallableValue | undefined): void {
  if (fn === undefined) {
    events.listeners = events.listeners.filter((listener) => listener.emitter !== emitter || listener.type !== type);
    return;
  }
  const at = events.listeners.findIndex(
    (listener) => listener.emitter === emitter && listener.type === type && callablesEqual(listener.callable, fn),
  );
  if (at >= 0) events.listeners.splice(at, 1);
}

/**
 * Make the event object now and append it to the queue (EMIT-3, EMIT-6, EMIT-14):
 * a dictionary with `type`, `target`, `detail`, `cancelable` and `canceled`, where
 * `detail` is a new dictionary holding a copy of `detail` made at this moment (an
 * empty one when none was given). Nothing runs.
 */
function queueEvent(
  vm: VmState,
  events: EventsSection,
  emitter: ObjectRecord,
  type: string,
  detail: ObjectRecord | undefined,
): void {
  const copy = createObject(vm, null);
  if (detail !== undefined) {
    for (const name of detail.keys) writeMember(copy, name, detail.members[name]!);
  }
  const event = createObject(vm, null);
  writeMember(event, "type", type);
  writeMember(event, "target", { kind: "object", handle: emitter.handle, className: emitter.className });
  writeMember(event, "detail", { kind: "object", handle: copy.handle, className: copy.className });
  writeMember(event, "cancelable", 0);
  writeMember(event, "canceled", 0);
  events.queue.push({ emitter: objectEmitter(emitter.handle), event: event.handle });
}

/** Drop every listener of a freed object (EMIT-14, "A freed emitter"). */
export function forgetEmitter(events: EventsSection, handle: number): void {
  const key = objectEmitter(handle);
  if (events.listeners.some((listener) => listener.emitter === key)) {
    events.listeners = events.listeners.filter((listener) => listener.emitter !== key);
  }
}

/**
 * Drop the listeners of every emitter the handle table no longer holds; returns
 * how many went. Run after the end-of-tick collection (R-34), before any new
 * object can take a freed handle.
 */
export function pruneDeadEmitters(events: EventsSection, vm: Pick<VmState, "objects">): number {
  if (events.listeners.length === 0) return 0;
  const live = new Set(vm.objects.map((record) => record.handle));
  const kept = events.listeners.filter((listener) => {
    const handle = emitterHandle(listener.emitter);
    return handle === null || live.has(handle);
  });
  const removed = events.listeners.length - kept.length;
  if (removed > 0) events.listeners = kept;
  return removed;
}

/**
 * The script values the section keeps alive: every listener's callable (the
 * cells and receiver it names), and the event object of every queued or
 * in-progress event (EMIT-14). They are extra roots of the end-of-tick pass.
 */
export function eventRoots(events: EventsSection): Value[] {
  const roots: Value[] = [];
  for (const listener of events.listeners) roots.push(listener.callable);
  for (const queued of events.queue) roots.push({ kind: "object", handle: queued.event, className: "" });
  if (events.dispatch !== null) roots.push({ kind: "object", handle: events.dispatch.event, className: "" });
  return roots;
}
