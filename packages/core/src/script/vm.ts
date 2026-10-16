/**
 * The script step machine (G1; AD-8/AD-9/AD-26; format-spec §9.15 THR-3).
 *
 * `advanceScriptTick` runs one whole tick in AD-26's order for the tracer's
 * slice — `waits`, then `threads`, then `time`. The waits phase polls every
 * waiting thread in ascending id and wakes it (pushing the resolved value);
 * the threads phase runs each ready thread for at most `STEP_BUDGET` VM steps;
 * the time phase increments the tick counter, so a `sleep` entered at tick `T`
 * stores `until = T + ticks` and wakes in the tick whose counter reaches it.
 *
 * `STEP_BUDGET` is the number of VM steps (one `StepOp` each, §9.15 THR-3) a
 * thread may run in one tick. Its name is deliberate: it counts the VM's own
 * instruction unit, not ticks. A thread preempted at the budget keeps its state
 * and continues next tick; a waiting thread spends no budget.
 *
 * Epic 4 owns the phase list and the loop: `createEngine` will call
 * `runWaitsPhase`/`runThreadsPhase` in its own order with the registry from
 * entry 3. The `call` dispatch is that entry's: it resolves the name through
 * AD-8's four tiers, builds the read-only view, runs the winning layer's
 * handler with the layer below as `next`, drains the reported effects to the
 * sink and writes a by-reference `out` back through the frame.
 *
 * docs/adr/0004 (decisions 2 and 6); format-spec §9.15 (THR-3) and §9.16
 * (SEM-4/SEM-6).
 */

import type { RefId, VarScope, Value } from "../ports/value.ts";
import type { Logger } from "../ports/logger.ts";
import type { Wait, WaitPoll, WaitResult, WaitView } from "../ports/wait.ts";
import { createRngPort } from "../rng/xoshiro.ts";
import type { GameState } from "../save/state.ts";
import { createClockPort, runTimePhase } from "../time/time.ts";
import { CORE_PLUGIN, type Arg, type BuiltinSpec } from "./builtins.ts";
import { ScriptError } from "./errors.ts";
import type { CommandEffect, CommandView, PluginDefinition } from "./plugin.ts";
import { compileProgram, type Program, type ProgramRef } from "./program.ts";
import { assembleCommands, createCommandLookup, type CommandLookup } from "./registry.ts";
import { globalRef, localRef, type Frame, type Thread, type VmState } from "./state.ts";

/** The provisional per-thread, per-tick VM-step budget (§9.15 THR-3). */
export const STEP_BUDGET = 1000;

/** What one tick left the script threads doing. */
export type ScriptStatus = "running" | "waiting" | "finished";

/** Compiled programs are rebuilt from their ref and memoised outside state. */
type ProgramMemo = { get(ref: ProgramRef): Program };

/** Everything the script phases need that is not state. */
export type ScriptServices = {
  readonly view: CommandView;
  readonly commands: CommandLookup;
  readonly effects: (effect: CommandEffect) => void;
  readonly programs: ProgramMemo;
};

/**
 * The default logger: AD-24 wants every warning to have a destination, and a
 * caller that has no sink yet gets this discarding one. Entry 7 adds the real
 * sinks and wires them through the host.
 */
const DISCARD_LOGGER: Logger = { warn: () => {}, error: () => {} };

function programMemoKey(ref: ProgramRef): string {
  return ref.kind === "inline"
    ? `inline\u0000${ref.compiler}\u0000${ref.text}`
    : `file\u0000${ref.path}\u0000${ref.sourceHash}\u0000${ref.compiler}`;
}

/**
 * Bind the ports, the assembled command registry and the program memo to a game
 * state. `plugins` is the ordered list of layers above the built-in `core` pack,
 * which is always layer 0 (ADR 0004 decision 6: it can be wrapped, not removed);
 * `effects` receives every command's reported effects (decision U1) and
 * `logger` receives the registry's warnings (AD-24). Resolving the manifest into
 * the `core` pinning proper is entry 25's.
 */
export function createScriptServices(
  state: GameState,
  plugins: readonly PluginDefinition[] = [],
  logger: Logger = DISCARD_LOGGER,
  effects: (effect: CommandEffect) => void = () => {},
): ScriptServices {
  const view: CommandView = {
    rng: createRngPort(state.rng),
    clock: createClockPort(state.time),
  };
  const registry = assembleCommands([CORE_PLUGIN, ...plugins], logger);
  const commands = createCommandLookup({ builtin: (name) => registry.get(name) });
  const cache = new Map<string, Program>();
  const programs: ProgramMemo = {
    get(ref) {
      const key = programMemoKey(ref);
      const hit = cache.get(key);
      if (hit !== undefined) return hit;
      const compiled = compileProgram(ref);
      cache.set(key, compiled);
      return compiled;
    },
  };
  return { view, commands, effects, programs };
}

/** Poll a sleep wait: resolved exactly when the tick reaches `until` (§9.15). */
export function pollSleep(view: WaitView, wait: Wait): WaitResult | null {
  return view.tick >= wait.until ? { value: null } : null;
}

/**
 * The waits phase: poll every waiting thread in ascending id and wake it,
 * pushing the resolved value onto the frame whose call yielded (AD-9). `poll`
 * defaults to the one provisional kind (`sleep`); entry 9 replaces it with the
 * per-kind registry.
 */
export function runWaitsPhase(
  vm: VmState,
  view: WaitView,
  poll: WaitPoll = pollSleep,
): void {
  const due = vm.threads.filter((thread) => thread.status === "waiting" && thread.wait !== null);
  due.sort((left, right) => left.id - right.id);
  for (const thread of due) {
    const wait = thread.wait;
    if (wait === null) continue;
    const result = poll(view, wait);
    if (result === null) continue;
    thread.status = "ready";
    thread.wait = null;
    const frame = thread.frames[thread.frames.length - 1];
    if (frame === undefined) {
      thread.status = "finished";
      continue;
    }
    frame.operands.push({ value: result.value, ref: null });
  }
}

/**
 * The threads phase: run every ready thread, preempting at the budget. Threads
 * run in ascending id order (§9.15 THR-1), regardless of their order in
 * `vm.threads`.
 */
export function runThreadsPhase(vm: VmState, services: ScriptServices, budget: number): void {
  const ready = vm.threads.filter((thread) => thread.status === "ready");
  ready.sort((left, right) => left.id - right.id);
  for (const thread of ready) {
    runThread(thread, vm, services, budget);
  }
}

/**
 * Advance one whole tick in AD-26's order for the tracer's slice and report
 * what the threads are doing.
 */
export function advanceScriptTick(
  state: GameState,
  services: ScriptServices,
  budget: number = STEP_BUDGET,
): ScriptStatus {
  runWaitsPhase(state.vm, state.time);
  runThreadsPhase(state.vm, services, budget);
  runTimePhase(state.time);
  return scriptStatus(state.vm);
}

function scriptStatus(vm: VmState): ScriptStatus {
  let running = false;
  let waiting = false;
  for (const thread of vm.threads) {
    if (thread.status === "ready") running = true;
    else if (thread.status === "waiting") waiting = true;
  }
  if (running) return "running";
  if (waiting) return "waiting";
  return "finished";
}

function runThread(thread: Thread, vm: VmState, services: ScriptServices, budget: number): void {
  let steps = 0;
  while (thread.status === "ready" && steps < budget) {
    const frame = thread.frames[thread.frames.length - 1];
    if (frame === undefined) {
      thread.status = "finished";
      return;
    }
    const program = services.programs.get(frame.program);
    const op = program.ops[frame.ip];
    if (op === undefined) {
      thread.status = "finished";
      return;
    }
    steps += 1;

    switch (op.op) {
      case "push":
        frame.operands.push({ value: op.value, ref: null });
        frame.ip += 1;
        break;
      case "load":
        frame.operands.push(loadArg(vm, frame, op.name));
        frame.ip += 1;
        break;
      case "store":
        storeVar(vm, frame, op.name);
        frame.ip += 1;
        break;
      case "pop":
        frame.operands.pop();
        frame.ip += 1;
        break;
      case "call": {
        const args = takeArgs(frame, op.argc);
        const resolved = services.commands.get(op.name);
        if (resolved === undefined) {
          throw new ScriptError("unknown.command", `no built-in named "${op.name}"`);
        }
        checkArity(resolved.spec, args, op.name);
        const result = resolved.spec.call(services.view, args, resolved.next);
        frame.ip += 1;
        if (result.request !== undefined) {
          // Decision U3: a request is accepted by the contract and refused here
          // until entry 9 handles it, rather than dropped silently.
          throw new ScriptError(
            "command.request-unsupported",
            `"${op.name}" asked the host for something the VM cannot answer yet (entry 9)`,
          );
        }
        for (const effect of result.effects ?? []) services.effects(effect);
        if (result.wait !== undefined) {
          thread.wait = result.wait;
          thread.status = "waiting";
          return;
        }
        applyOut(vm, frame, resolved.spec, args, result.out ?? [], op.name);
        frame.operands.push({ value: result.value, ref: null });
        break;
      }
      case "return":
        thread.status = "finished";
        return;
    }
  }
}

/**
 * Read a variable by name: frame locals first, then globals, unset → 0. Only an
 * own property counts, so an unset name that collides with an inherited
 * `Object.prototype` member (`constructor`, `__proto__`, `toString`, …) still
 * reads as 0 (§9.16 SEM-5).
 */
function loadArg(vm: VmState, frame: Frame, name: string): Arg {
  if (Object.hasOwn(frame.locals, name)) {
    const value = frame.locals[name];
    return { value: value === undefined ? 0 : value, ref: localRef(name) };
  }
  if (Object.hasOwn(vm.globals, name)) {
    const value = vm.globals[name];
    return { value: value === undefined ? 0 : value, ref: globalRef(name) };
  }
  return { value: 0, ref: globalRef(name) };
}

/**
 * Write an own enumerable data property, so a variable named `__proto__` (or
 * `constructor`) is an ordinary variable rather than the inherited prototype
 * setter (§9.3/§9.16 SEM-4).
 */
function setOwn(record: { [name: string]: Value }, name: string, value: Value): void {
  Object.defineProperty(record, name, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

/**
 * Assign the operand-stack top to a variable, leaving the value in place
 * (§9.4 makes an assignment yield a value; the trailing `pop` discards it). A
 * `null` result — `end`'s `value`, or a woken `sleep` — stores as the number
 * `0`, because no op stores `null` (ports/value.ts).
 */
function storeVar(vm: VmState, frame: Frame, name: string): void {
  const top = frame.operands[frame.operands.length - 1];
  if (top === undefined) {
    throw new ScriptError("vm.stack-underflow", `store "${name}": the operand stack is empty`);
  }
  const value = top.value === null ? 0 : top.value;
  if (Object.hasOwn(frame.locals, name)) setOwn(frame.locals, name, value);
  else setOwn(vm.globals, name, value);
}

/** Pop `argc` bound arguments in source order (the last pushed is on top). */
function takeArgs(frame: Frame, argc: number): Arg[] {
  const args: Arg[] = [];
  for (let index = 0; index < argc; index++) {
    const arg = frame.operands.pop();
    if (arg === undefined) {
      throw new ScriptError("vm.stack-underflow", "call: the operand stack is missing arguments");
    }
    args.push(arg);
  }
  args.reverse();
  return args;
}

function checkArity(spec: BuiltinSpec, args: readonly Arg[], name: string): void {
  const variadic = spec.params.some((param) => param.variadic);
  const required = spec.params.filter((param) => !param.optional && !param.variadic).length;
  const maximum = variadic ? Infinity : spec.params.length;
  if (args.length < required || args.length > maximum) {
    const expected = required === maximum ? `${required}` : `${required} to ${maximum}`;
    throw new ScriptError(
      "arity.mismatch",
      `"${name}" takes ${expected} argument(s), got ${args.length}`,
    );
  }
}

/** Write a built-in's `out` back to its by-reference arguments, in order. */
function applyOut(
  vm: VmState,
  frame: Frame,
  spec: BuiltinSpec,
  args: readonly Arg[],
  out: readonly (readonly [number, Value])[],
  name: string,
): void {
  for (const [index, value] of out) {
    const param = spec.params[index];
    const arg = args[index];
    if (param === undefined || !param.byRef || arg === undefined || arg.ref === null) {
      throw new ScriptError(
        "builtin.out-not-by-ref",
        `"${name}" returned an output for argument ${index}, which is not a by-reference variable`,
      );
    }
    writeRef(vm, frame, arg.ref, value);
  }
}

/**
 * Write `value` through a `RefId` into the scope it names (SEM-6). A `null`
 * output stores as the number `0`, because no op stores `null`
 * (ports/value.ts), matching `store`.
 */
function writeRef(vm: VmState, frame: Frame, ref: RefId, value: Value): void {
  const stored = value === null ? 0 : value;
  const separator = ref.indexOf(":");
  const scope = ref.slice(0, separator) as VarScope;
  const name = ref.slice(separator + 1);
  if (scope === "local") setOwn(frame.locals, name, stored);
  else setOwn(vm.globals, name, stored);
}
