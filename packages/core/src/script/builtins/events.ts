/**
 * The free-function form of the emitter methods (EMIT-2, EMIT-14, EMIT-16, EMIT-17;
 * entries 19.10 and 19.11): `on`, `once`, `off`, `emit` and `emitCancelable` with the
 * emitter first, and `cancelEvent(event)`. `emitter.on(type, fn)`, `event.cancel()`
 * and the rest are the same operation, run by the VM without a command lookup.
 *
 * A command never touches state (AD-8): each reports a `vm.control` effect whose
 * action `emitter` the VM applies to the `events` section and the handle table
 * (`events/emitter.ts`). Nothing here runs a listener; delivery is the engine's
 * `events` phase (`events/dispatch.ts`).
 */

import type { BuiltinSpec, ParamSpec } from "../builtins.ts";
import { CALLABLE_NOT_CALLABLE } from "../errors.ts";

function param(name: string, optional = false): ParamSpec {
  return { name, optional, byRef: false, variadic: false };
}

const GROUPS = ["reawakened-additions-not-part-of-the-282-legacy-catalogue", "core-runtime"] as const;

const BAD_EMITTER = { code: "object.invalid", when: "The emitter is not a live object." } as const;
const BAD_TYPE = { code: "builtin.bad-arg", when: "The event type is not a string." } as const;
const NOT_CALLABLE = { code: CALLABLE_NOT_CALLABLE, when: "The listener is not a callable." } as const;

/** One emitter command: it names its operation and forwards its arguments to the VM. */
function emitterCommand(
  name: "on" | "once" | "off" | "emit" | "emitcancelable" | "cancelevent",
  params: readonly ParamSpec[],
  doc: NonNullable<BuiltinSpec["doc"]>,
): BuiltinSpec {
  const op = name === "cancelevent" ? "cancel" : name;
  return {
    name,
    aliases: [],
    params,
    doc,
    call: (_view, args) => ({
      value: 0,
      effects: [{ kind: "vm.control", args: ["emitter", op, ...args.map((arg) => arg.value)] }],
    }),
  };
}

export const EVENT_SPECS: readonly BuiltinSpec[] = [
  emitterCommand("on", [param("emitter"), param("type"), param("fn")], {
    summary: "Add a listener for an event type to an object.",
    behaviour: "Require a live object, a string event type and a callable, then append the callable to the end of the listener table for that object and type; the same callable added twice is two listeners. A listener runs later, in registration order, with the event object as its one argument, when an event of that type is delivered to the object; the call never waits and returns 0.",
    groups: [...GROUPS],
    returns: { summary: "Always 0." },
    throws: [BAD_EMITTER, BAD_TYPE, NOT_CALLABLE],
    see: ["docs/spec/engine/rpgcode-modules-and-objects.md#emit-14"],
    waits: { kind: "never", summary: "Never waits." },
  }),
  emitterCommand("once", [param("emitter"), param("type"), param("fn")], {
    summary: "Add a listener for an event type to an object that runs at most one time.",
    behaviour: "Require a live object, a string event type and a callable, then append a listener that is removed from the table just before it first runs, so it runs once at most; removing it with off before it fires prevents it from running. The call never waits and returns 0.",
    groups: [...GROUPS],
    returns: { summary: "Always 0." },
    throws: [BAD_EMITTER, BAD_TYPE, NOT_CALLABLE],
    see: ["docs/spec/engine/rpgcode-modules-and-objects.md#emit-14"],
    waits: { kind: "never", summary: "Never waits." },
  }),
  emitterCommand("off", [param("emitter"), param("type"), param("fn", true)], {
    summary: "Remove one listener, or every listener, of an event type from an object.",
    behaviour: "With a callable, remove the first listener of that object and type whose callable has the same definition, captures and receiver; without one, remove every listener of that type. A call that matches nothing does nothing. A listener removed while an event of its type is being delivered is skipped if it has not yet run for that event. The call never waits and returns 0.",
    groups: [...GROUPS],
    returns: { summary: "Always 0." },
    throws: [BAD_EMITTER, BAD_TYPE, NOT_CALLABLE],
    see: ["docs/spec/engine/rpgcode-modules-and-objects.md#emit-14"],
    waits: { kind: "never", summary: "Never waits." },
  }),
  emitterCommand("emit", [param("emitter"), param("type"), param("detail", true)], {
    summary: "Queue an event on an object and carry on; its listeners run later.",
    behaviour: "Require a live object, a string event type and, when given, a dictionary of detail. Make the event object now, with a copy of the detail taken at this moment, and append it to the event queue; no listener runs inside the call. The events phase of the same tick, or of the next when the call is made by a later phase, runs the listeners in registration order. The call never waits and returns 0.",
    groups: [...GROUPS],
    returns: { summary: "Always 0." },
    throws: [BAD_EMITTER, BAD_TYPE, { code: "builtin.bad-arg", when: "The detail is given and is not a dictionary." }],
    see: ["docs/spec/engine/rpgcode-modules-and-objects.md#emit-14"],
    waits: { kind: "never", summary: "Never waits." },
  }),
  emitterCommand("emitcancelable", [param("emitter"), param("type"), param("detail", true)], {
    summary: "Send an event and wait until every listener has run; the value is the event, which a listener may have changed or cancelled.",
    behaviour: "Require a live object, a string event type and, when given, a dictionary of detail. Make the event object now, with a copy of the detail taken at this moment and cancelable set to 1, append it to the event queue and park the calling thread on an event.dispatch wait in the same step. The events phase delivers it in queue order to the listeners in registration order; a cancel does not stop later listeners. The thread resumes at the start of the tick after the last listener finished, and the call's value is the event object, in which the script reads canceled and any field a listener changed. Only the calling thread waits. A listener's own thread may not call it (emit.reentrant).",
    groups: [...GROUPS],
    returns: { summary: "The event object (a dictionary with type, target, detail, cancelable, canceled and cancel)." },
    throws: [
      BAD_EMITTER,
      BAD_TYPE,
      { code: "builtin.bad-arg", when: "The detail is given and is not a dictionary." },
      { code: "emit.reentrant", when: "The call is made on the thread that is running a listener of the event being delivered." },
    ],
    see: ["docs/spec/engine/rpgcode-modules-and-objects.md#emit-16"],
    waits: { kind: "until-event", summary: "Waits, on this thread only, until the event has been delivered to every listener." },
  }),
  emitterCommand("cancelevent", [param("event")], {
    summary: "Cancel the cancelable event a listener is handling.",
    behaviour: "Require a live event object that is cancelable and is the event being delivered now, and set its canceled field to 1; cancelling twice is the same as once. Later listeners still run and see canceled set. The call never waits and returns 0.",
    groups: [...GROUPS],
    returns: { summary: "Always 0." },
    throws: [
      { code: "builtin.bad-arg", when: "The argument is not an event object." },
      { code: "event.not-cancelable", when: "The event was sent with emit, not emitCancelable." },
      { code: "event.not-dispatching", when: "The event is not the one being delivered now." },
    ],
    see: ["docs/spec/engine/rpgcode-modules-and-objects.md#emit-17"],
    waits: { kind: "never", summary: "Never waits." },
  }),
];
