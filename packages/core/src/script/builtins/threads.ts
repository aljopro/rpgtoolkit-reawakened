/**
 * The E-93 thread operations and `multiRun` (ticket 3.9; THR-1, THR-2, E-33).
 *
 * A command never touches another thread (AD-8): it validates its arguments,
 * computes the call's value from the read-only view, and reports a
 * `vm.control` effect that the VM applies to the thread table. The effect
 * actions are `thread`, `threadKill`, `threadSleep`, `threadWake`,
 * `threadTell`, `multiRun` and `move`; the VM owns their meaning
 * (`script/vm.ts`).
 *
 * - `thread(file, persist, [&id])` starts a thread. A `persist` thread is
 *   `persistent`, any other is a `board` thread; both are script-owned. The
 *   text is compiled as inline code; loading a `.prg` file by name is the
 *   loader's (entry 8).
 * - `killThread(id)`, `getThreadId([&id])`, `threadWake(id)`.
 * - `threadSleep(id, seconds)` converts seconds with THR-1's exact formula
 *   (`core/time`'s `secondsToTicks`); `0` is the indefinite sleep. A negative,
 *   non-finite or too-large duration is a `builtin.bad-arg` error and no wait
 *   is entered.
 * - `threadSleepRemaining(id, [&seconds])` reports `(end - now) / 60`, or `0`
 *   for an indefinite or absent sleep.
 * - `tellThread(id, code)` queues the code on the target thread (THR-2); the
 *   caller is not interrupted and the call's value is `0`, because the code
 *   has not run yet.
 * - `sourceHandle([&h])` / `targetHandle([&h])` read the calling thread's own
 *   pair (THR-2): the handle text, or `0` when the slot is `null`.
 * - `multiRun()` toggles collecting: the first call begins it and the next
 *   call ends it, yielding one `movement` wait for every move started in
 *   between (E-33, AD-26).
 */

import type { Value } from "../../ports/value.ts";
import { MAX_TICK, secondsToTicks, TICKS_PER_SECOND } from "../../time/time.ts";
import type { BuiltinSpec, ParamSpec } from "../builtins.ts";
import { ScriptError } from "../errors.ts";
import type { CommandView } from "../plugin.ts";
import { findThread, nextThreadId, type Thread } from "../state.ts";
import { toNumberValue, toStringValue, truthy } from "../values.ts";

function param(name: string, optional = false, byRef = false): ParamSpec {
  return { name, optional, byRef, variadic: false };
}

function threadIdArg(value: Value, name: string): number {
  const id = toNumberValue(value);
  if (!Number.isInteger(id) || id < 1) {
    throw new ScriptError("builtin.bad-arg", `${name}: "${toStringValue(value)}" is not a thread id`);
  }
  return id;
}

function stateOf(view: CommandView, name: string) {
  if (view.state === undefined) {
    throw new ScriptError("thread.no-state", `${name}: the thread table is not reachable`);
  }
  return view.state.vm;
}

function threadOf(view: CommandView, value: Value, name: string): Thread {
  const id = threadIdArg(value, name);
  const thread = findThread(stateOf(view, name), id);
  if (thread === undefined) {
    throw new ScriptError("thread.unknown", `${name}: no thread ${id} is registered`);
  }
  return thread;
}

export const THREAD_SPECS: readonly BuiltinSpec[] = [
  {
    name: "thread",
    aliases: [],
    params: [param("file"), param("persist"), param("ret", true, true)],
    call: (view, args) => {
      const id = nextThreadId(stateOf(view, "thread"));
      const persist = truthy(args[1]?.value ?? 0);
      const effects = [
        {
          kind: "vm.control" as const,
          args: ["thread", toStringValue(args[0]?.value ?? ""), persist],
        },
      ];
      return args.length > 2
        ? { value: id, effects, out: [[2, id]] }
        : { value: id, effects };
    },
  },
  {
    name: "killthread",
    aliases: [],
    params: [param("id")],
    call: (view, args) => {
      const thread = threadOf(view, args[0]?.value ?? 0, "killThread");
      return { value: null, effects: [{ kind: "vm.control", args: ["threadKill", thread.id] }] };
    },
  },
  {
    name: "getthreadid",
    aliases: [],
    params: [param("ret", true, true)],
    call: (view, args) => {
      const id = view.thread ?? 0;
      return args.length > 0 ? { value: id, out: [[0, id]] } : { value: id };
    },
  },
  {
    name: "threadsleep",
    aliases: [],
    params: [param("id"), param("seconds")],
    call: (view, args) => {
      const thread = threadOf(view, args[0]?.value ?? 0, "threadSleep");
      const seconds = toNumberValue(args[1]?.value ?? 0);
      const ticks = secondsToTicks(seconds);
      if (ticks === null) {
        throw new ScriptError(
          "builtin.bad-arg",
          `threadSleep: ${seconds} is not a valid duration (a negative, infinite, NaN or over-large number of seconds)`,
        );
      }
      let until: number | null = null;
      if (ticks > 0) {
        if (view.packageStartup === true) throw new ScriptError("package.startup-unfinished", "a package start-up program waits; start-up programs must not wait");
        const end = view.clock.tick() + ticks;
        if (end > MAX_TICK) {
          throw new ScriptError("builtin.bad-arg", "threadSleep: the end tick would exceed 2^53 - 1");
        }
        until = end;
      }
      return {
        value: null,
        effects: [{ kind: "vm.control", args: ["threadSleep", thread.id, until] }],
      };
    },
  },
  {
    name: "threadwake",
    aliases: [],
    params: [param("id")],
    call: (view, args) => {
      const thread = threadOf(view, args[0]?.value ?? 0, "threadWake");
      return { value: null, effects: [{ kind: "vm.control", args: ["threadWake", thread.id] }] };
    },
  },
  {
    name: "threadsleepremaining",
    aliases: [],
    params: [param("id"), param("ret", true, true)],
    call: (view, args) => {
      const thread = threadOf(view, args[0]?.value ?? 0, "threadSleepRemaining");
      const wait = thread.wait;
      const remaining =
        thread.status === "waiting" && wait !== null && wait.kind === "sleep" && wait.until !== null
          ? (wait.until - view.clock.tick()) / TICKS_PER_SECOND
          : 0;
      return args.length > 1 ? { value: remaining, out: [[1, remaining]] } : { value: remaining };
    },
  },
  {
    name: "tellthread",
    aliases: [],
    params: [param("id"), param("code")],
    call: (view, args) => {
      const thread = threadOf(view, args[0]?.value ?? 0, "tellThread");
      return {
        value: 0,
        effects: [
          {
            kind: "vm.control",
            args: ["threadTell", thread.id, toStringValue(args[1]?.value ?? "")],
          },
        ],
      };
    },
  },
  {
    name: "sourcehandle",
    aliases: [],
    params: [param("ret", true, true)],
    call: (view, args) => {
      const handle = handleOf(view, "source");
      return args.length > 0 ? { value: handle, out: [[0, handle]] } : { value: handle };
    },
  },
  {
    name: "targethandle",
    aliases: [],
    params: [param("ret", true, true)],
    call: (view, args) => {
      const handle = handleOf(view, "target");
      return args.length > 0 ? { value: handle, out: [[0, handle]] } : { value: handle };
    },
  },
  {
    name: "multirun",
    aliases: [],
    params: [],
    call: () => ({ value: 0, effects: [{ kind: "vm.control", args: ["multiRun"] }] }),
  },
];

/** The calling thread's `source` or `target` slot as a handle: the text, or `0` when `null`. */
function handleOf(view: CommandView, slot: "source" | "target"): Value {
  const id = view.thread;
  if (id === undefined || view.state === undefined) return 0;
  const thread = findThread(view.state.vm, id);
  return thread?.[slot] ?? 0;
}
