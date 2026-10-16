/**
 * The script step machine (G1; AD-8/AD-9/AD-26; format-spec §9.15 THR-3).
 *
 * Dispatches the full StepOp instruction set, function call frames with
 * overloading by arity, by-reference parameter aliasing, `return &lvalue`,
 * truthiness and operator semantics per SEM-3, control effects for FUN-7
 * unwinding, and source positions on every error.
 *
 * docs/adr/0004; format-spec §9.15 (THR-3) and §9.16 (SEM-3/SEM-4/SEM-5/SEM-6).
 */

import { pow } from "../fmath/index.ts";
import type { Logger } from "../ports/logger.ts";
import type { PlainData } from "../ports/plain-data.ts";
import type { RefId, Value, VarScope } from "../ports/value.ts";
import type { Wait, WaitPoll, WaitResult, WaitView } from "../ports/wait.ts";
import { createRngPort } from "../rng/xoshiro.ts";
import type { GameState } from "../save/state.ts";
import { createClockPort, runTimePhase } from "../time/time.ts";
import { CORE_PLUGIN, type Arg, type BuiltinSpec } from "./builtins.ts";
import { CATALOGUE_STUBS_PLUGIN } from "./catalogue-stubs.ts";
import { recordEffect } from "./effects.ts";
import { ScriptError } from "./errors.ts";
import type { SourcePos } from "./ops.ts";
import type { CommandView, PluginDefinition } from "./plugin.ts";
import { compileProgram, type Program, type ProgramRef } from "./program.ts";
import {
  assembleCommands,
  createCommandLookup,
  resolveCall,
  type CommandLookup,
} from "./registry.ts";
import {
  globalRef,
  localRef,
  type Frame,
  type LocalSlot,
  type Thread,
  type VmState,
} from "./state.ts";
import {
  compareEqual,
  compareRelational,
  indexKey,
  toInt32,
  toNumberValue,
  toStringValue,
  truthy,
} from "./values.ts";

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
  readonly programs: ProgramMemo;
};

const DISCARD_LOGGER: Logger = { warn: () => {}, error: () => {} };

function programMemoKey(ref: ProgramRef): string {
  return ref.kind === "inline"
    ? `inline\u0000${ref.compiler}\u0000${ref.text}`
    : `file\u0000${ref.path}\u0000${ref.sourceHash}\u0000${ref.compiler}`;
}

export function createScriptServices(
  state: GameState,
  plugins: readonly PluginDefinition[] = [],
  logger: Logger = DISCARD_LOGGER,
): ScriptServices {
  const view: CommandView = {
    rng: createRngPort(state.rng),
    clock: createClockPort(state.time),
  };
  const registry = assembleCommands([CORE_PLUGIN, CATALOGUE_STUBS_PLUGIN, ...plugins], logger);
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
  return { view, commands, programs };
}

export function pollSleep(view: WaitView, wait: Wait): WaitResult | null {
  return view.tick >= wait.until ? { value: null } : null;
}

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

export function runThreadsPhase(vm: VmState, services: ScriptServices, budget: number): void {
  const ready = vm.threads.filter((thread) => thread.status === "ready");
  ready.sort((left, right) => left.id - right.id);
  for (const thread of ready) {
    runThread(thread, vm, services, budget);
  }
}

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

function refName(ref: RefId): string {
  const sep = ref.indexOf(":");
  return sep >= 0 ? ref.slice(sep + 1) : ref;
}

function setOwnValue(record: { [name: string]: Value }, name: string, value: Value): void {
  Object.defineProperty(record, name, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

function setOwnSlot(record: { [name: string]: LocalSlot }, name: string, slot: LocalSlot): void {
  Object.defineProperty(record, name, {
    value: slot,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

function lookupLabel(program: Program, ip: number, name: string): number | undefined {
  for (const fnList of Object.values(program.functions)) {
    for (const fn of fnList) {
      if (ip >= fn.entry && ip < fn.end) {
        return fn.labels[name];
      }
    }
  }
  return program.labels[name];
}

function readRef(vm: VmState, thread: Thread, frameIndex: number, ref: RefId): Value {
  const separator = ref.indexOf(":");
  const scope = ref.slice(0, separator);
  const name = ref.slice(separator + 1);
  if (scope === "global") {
    return vm.globals[name] ?? 0;
  }
  for (let i = frameIndex; i >= 0; i--) {
    const f = thread.frames[i];
    if (f && Object.hasOwn(f.locals, name)) {
      const s = f.locals[name]!;
      if (s.ref === localRef(name)) return s.value ?? 0;
      return readRef(vm, thread, i, s.ref);
    }
  }
  return 0;
}

function writeRef(
  vm: VmState,
  thread: Thread,
  frameIndex: number,
  ref: RefId,
  value: Value,
): void {
  const stored = value === null ? 0 : value;
  const separator = ref.indexOf(":");
  const scope = ref.slice(0, separator);
  const name = ref.slice(separator + 1);
  if (scope === "global") {
    setOwnValue(vm.globals, name, stored);
    return;
  }
  for (let i = frameIndex; i >= 0; i--) {
    const f = thread.frames[i];
    if (f && Object.hasOwn(f.locals, name)) {
      const s = f.locals[name]!;
      if (s.ref === localRef(name)) {
        s.value = stored;
        return;
      }
      writeRef(vm, thread, i, s.ref, stored);
      return;
    }
  }
  const currentFrame = thread.frames[frameIndex];
  if (currentFrame) {
    setOwnSlot(currentFrame.locals, name, { value: stored, ref: localRef(name) });
  }
}

function loadArg(
  vm: VmState,
  thread: Thread,
  frameIndex: number,
  name: string,
  scope?: VarScope,
): Arg {
  if (scope === "global") {
    if (!Object.hasOwn(vm.globals, name)) {
      setOwnValue(vm.globals, name, 0);
    }
    return { value: vm.globals[name] ?? 0, ref: globalRef(name) };
  }

  const frame = thread.frames[frameIndex]!;
  if (Object.hasOwn(frame.locals, name)) {
    const slot = frame.locals[name]!;
    if (slot.ref === localRef(name)) {
      return { value: slot.value ?? 0, ref: slot.ref };
    }
    const val = readRef(vm, thread, frameIndex, slot.ref);
    return { value: val, ref: slot.ref };
  }

  if (Object.hasOwn(vm.globals, name)) {
    return { value: vm.globals[name] ?? 0, ref: globalRef(name) };
  }

  // SEM-4/SEM-5: Read creates the variable as global (unset -> 0)
  setOwnValue(vm.globals, name, 0);
  return { value: 0, ref: globalRef(name) };
}

function takeArgs(frame: Frame, argc: number, pos: SourcePos): Arg[] {
  const args: Arg[] = [];
  for (let index = 0; index < argc; index++) {
    const arg = frame.operands.pop();
    if (arg === undefined) {
      throw new ScriptError("vm.stack-underflow", "call: the operand stack is missing arguments", pos);
    }
    args.push(arg);
  }
  args.reverse();
  return args;
}

function checkArity(
  spec: BuiltinSpec,
  args: readonly Arg[],
  name: string,
  pos: SourcePos,
): void {
  const variadic = spec.params.some((param) => param.variadic);
  const required = spec.params.filter((param) => !param.optional && !param.variadic).length;
  const maximum = variadic ? Infinity : spec.params.length;
  if (args.length < required || args.length > maximum) {
    const expected = required === maximum ? `${required}` : `${required} to ${maximum}`;
    throw new ScriptError(
      "arity.mismatch",
      `"${name}" takes ${expected} argument(s), got ${args.length}`,
      pos,
    );
  }
}

function applyOut(
  vm: VmState,
  thread: Thread,
  frameIndex: number,
  spec: BuiltinSpec,
  args: readonly Arg[],
  out: readonly (readonly [number, Value])[],
  name: string,
  pos: SourcePos,
): void {
  for (const [index, value] of out) {
    const param = spec.params[index];
    const arg = args[index];
    if (param === undefined || !param.byRef || arg === undefined || arg.ref === null) {
      throw new ScriptError(
        "builtin.out-not-by-ref",
        `"${name}" returned an output for argument ${index}, which is not a by-reference variable`,
        pos,
      );
    }
    writeRef(vm, thread, frameIndex, arg.ref, value);
  }
}

function runThread(thread: Thread, vm: VmState, services: ScriptServices, budget: number): void {
  let steps = 0;
  while (thread.status === "ready" && steps < budget) {
    const frameIndex = thread.frames.length - 1;
    const frame = thread.frames[frameIndex];
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

      case "name":
        frame.operands.push({ value: op.name, ref: null });
        frame.ip += 1;
        break;

      case "load":
        frame.operands.push(loadArg(vm, thread, frameIndex, op.name, op.scope));
        frame.ip += 1;
        break;

      case "declRef":
        if (op.scope === "local") {
          if (!Object.hasOwn(frame.locals, op.name)) {
            setOwnSlot(frame.locals, op.name, { value: 0, ref: localRef(op.name) });
          }
          const slot = frame.locals[op.name]!;
          frame.operands.push({ value: slot.value ?? 0, ref: slot.ref });
        } else {
          if (!Object.hasOwn(vm.globals, op.name)) {
            setOwnValue(vm.globals, op.name, 0);
          }
          frame.operands.push({ value: vm.globals[op.name] ?? 0, ref: globalRef(op.name) });
        }
        frame.ip += 1;
        break;

      case "storeRef": {
        const valueArg = frame.operands.pop();
        const refArg = frame.operands.pop();
        if (!valueArg || !refArg) {
          throw new ScriptError("vm.stack-underflow", "storeRef: operand stack underflow", op.pos);
        }
        if (refArg.ref === null) {
          throw new ScriptError("vm.bad-lvalue", "cannot assign to a non-reference value", op.pos);
        }
        const stored = valueArg.value === null ? 0 : valueArg.value;
        writeRef(vm, thread, frameIndex, refArg.ref, stored);
        frame.operands.push({ value: stored, ref: null });
        frame.ip += 1;
        break;
      }

      case "index": {
        const keyArg = frame.operands.pop();
        const baseArg = frame.operands.pop();
        if (!keyArg || !baseArg) {
          throw new ScriptError("vm.stack-underflow", "index: operand stack underflow", op.pos);
        }
        const keyValue =
          keyArg.ref !== null && typeof keyArg.value === "number"
            ? (keyArg.value | 0)
            : keyArg.value;
        const keyText = indexKey(keyValue);
        const baseName = baseArg.ref !== null ? refName(baseArg.ref) : toStringValue(baseArg.value);
        const fullName = `${baseName}[${keyText}]`;

        let scope: VarScope | null = null;
        if (baseArg.ref !== null) {
          scope = baseArg.ref.startsWith("global:") ? "global" : "local";
        }
        const elementArg = loadArg(vm, thread, frameIndex, fullName, scope ?? undefined);
        frame.operands.push(elementArg);
        frame.ip += 1;
        break;
      }

      case "dup": {
        const top = frame.operands[frame.operands.length - 1];
        if (!top) {
          throw new ScriptError("vm.stack-underflow", "dup: operand stack underflow", op.pos);
        }
        frame.operands.push({ value: top.value, ref: top.ref });
        frame.ip += 1;
        break;
      }

      case "pop":
        frame.operands.pop();
        frame.ip += 1;
        break;

      case "unop": {
        const operand = frame.operands.pop();
        if (!operand) {
          throw new ScriptError("vm.stack-underflow", "unop: operand stack underflow", op.pos);
        }
        const v =
          operand.ref !== null && typeof operand.value === "number"
            ? (operand.value | 0)
            : operand.value;
        let resultValue: Value;
        switch (op.operator) {
          case "-":
            resultValue = -toNumberValue(v);
            break;
          case "+":
            resultValue = toNumberValue(v);
            break;
          case "!":
            resultValue = truthy(operand.value) ? 0 : 1;
            break;
          case "~":
            resultValue = ~toInt32(v);
            break;
          default:
            throw new ScriptError("vm.bad-operand", `unsupported unary operator: ${op.operator}`, op.pos);
        }
        frame.operands.push({ value: resultValue, ref: null });
        frame.ip += 1;
        break;
      }

      case "binop": {
        const rightArg = frame.operands.pop();
        const leftArg = frame.operands.pop();
        if (!leftArg || !rightArg) {
          throw new ScriptError("vm.stack-underflow", "binop: operand stack underflow", op.pos);
        }
        const lVal =
          leftArg.ref !== null && typeof leftArg.value === "number"
            ? (leftArg.value | 0)
            : leftArg.value;
        const rVal =
          rightArg.ref !== null && typeof rightArg.value === "number"
            ? (rightArg.value | 0)
            : rightArg.value;
        let resultValue: Value;

        switch (op.operator) {
          case "+":
            if (typeof leftArg.value === "string" || typeof rightArg.value === "string") {
              resultValue = toStringValue(leftArg.value) + toStringValue(rightArg.value);
            } else {
              resultValue = toNumberValue(lVal) + toNumberValue(rVal);
            }
            break;
          case "-":
            resultValue = toNumberValue(lVal) - toNumberValue(rVal);
            break;
          case "*":
            resultValue = toNumberValue(lVal) * toNumberValue(rVal);
            break;
          case "/":
            resultValue = toNumberValue(lVal) / toNumberValue(rVal);
            break;
          case "%": {
            const divisor = toInt32(rVal);
            if (divisor === 0) {
              throw new ScriptError("vm.modulo-by-zero", "modulo by zero", op.pos);
            }
            resultValue = toInt32(lVal) % divisor;
            break;
          }
          case "^":
            resultValue = pow(toNumberValue(lVal), toNumberValue(rVal));
            break;
          case "<<":
            resultValue = toInt32(lVal) << (toInt32(rVal) & 31);
            break;
          case ">>":
            resultValue = toInt32(lVal) >> (toInt32(rVal) & 31);
            break;
          case "<":
          case "<=":
          case ">":
          case ">=":
            resultValue = compareRelational(op.operator, lVal, rVal);
            break;
          case "==":
            resultValue = compareEqual(leftArg.value, rightArg.value);
            break;
          case "~=":
          case "!=":
            resultValue = compareEqual(leftArg.value, rightArg.value) === 1 ? 0 : 1;
            break;
          case "&":
            resultValue = toInt32(lVal) & toInt32(rVal);
            break;
          case "`":
            resultValue = toInt32(lVal) ^ toInt32(rVal);
            break;
          case "|":
            resultValue = toInt32(lVal) | toInt32(rVal);
            break;
          case "&&":
            resultValue = truthy(leftArg.value) && truthy(rightArg.value) ? 1 : 0;
            break;
          case "||":
            resultValue = truthy(leftArg.value) || truthy(rightArg.value) ? 1 : 0;
            break;
        }

        frame.operands.push({ value: resultValue, ref: null });
        frame.ip += 1;
        break;
      }

      case "select": {
        const elseArg = frame.operands.pop();
        const thenArg = frame.operands.pop();
        const condArg = frame.operands.pop();
        if (!condArg || !thenArg || !elseArg) {
          throw new ScriptError("vm.stack-underflow", "select: operand stack underflow", op.pos);
        }
        const chosen = truthy(condArg.value) ? thenArg : elseArg;
        frame.operands.push({ value: chosen.value, ref: chosen.ref });
        frame.ip += 1;
        break;
      }

      case "jump":
        frame.ip = op.target;
        break;

      case "jumpIfFalse": {
        const cond = frame.operands.pop();
        if (!cond) {
          throw new ScriptError("vm.stack-underflow", "jumpIfFalse: operand stack underflow", op.pos);
        }
        if (!truthy(cond.value)) {
          frame.ip = op.target;
        } else {
          frame.ip += 1;
        }
        break;
      }

      case "call": {
        const args = takeArgs(frame, op.argc, op.pos);
        const resolved = resolveCall(op.name, op.argc, program, services.commands);
        if (resolved === undefined) {
          throw new ScriptError(
            "unknown.command",
            `no built-in or function named "${op.name}"`,
            op.pos,
          );
        }

        if (resolved.kind === "function") {
          frame.ip += 1;
          const target = resolved.target;
          const locals: { [name: string]: LocalSlot } = {};
          for (let i = 0; i < target.params.length; i++) {
            const param = target.params[i]!;
            const arg = args[i];
            if (param.byRef && arg && arg.ref !== null) {
              setOwnSlot(locals, param.name, { value: arg.value, ref: arg.ref });
            } else {
              const v = arg ? (arg.value === null ? 0 : arg.value) : 0;
              setOwnSlot(locals, param.name, { value: v, ref: localRef(param.name) });
            }
          }
          thread.frames.push({
            program: target.program,
            ip: target.entry,
            locals,
            operands: [],
            errorHandler: null,
            autoLocal: false,
          });
          break;
        }

        checkArity(resolved.command.spec, args, op.name, op.pos);
        const result = resolved.command.spec.call(services.view, args, resolved.command.next);
        frame.ip += 1;

        if (result.request !== undefined) {
          throw new ScriptError(
            "command.request-unsupported",
            `"${op.name}" asked the host for something the VM cannot answer yet (entry 9)`,
            op.pos,
          );
        }

        let controlApplied = false;
        for (const effect of result.effects ?? []) {
          if (effect.kind === "vm.control") {
            const action = effect.args?.[0];
            if (action === "end") {
              thread.frames = [];
              thread.status = "finished";
              thread.wait = null;
              return;
            }
            if (action === "run") {
              const newRef = effect.args?.[1] as ProgramRef;
              thread.frames = [
                {
                  program: newRef,
                  ip: 0,
                  locals: {},
                  operands: [],
                  errorHandler: null,
                  autoLocal: false,
                },
              ];
              thread.status = "ready";
              thread.wait = null;
              return;
            }
            if (action === "jump") {
              const labelName = effect.args?.[1] as string;
              const targetIp = lookupLabel(program, frame.ip, labelName);
              if (targetIp === undefined) {
                throw new ScriptError(
                  "vm.unknown-label",
                  `label \`:${labelName}\` not found in current function scope`,
                  op.pos,
                );
              }
              frame.ip = targetIp;
              controlApplied = true;
            }
          } else {
            const section = effect.section;
            const out: { [index: string]: PlainData } = {};
            for (const [index, value] of result.out ?? []) {
              out[String(index)] = typeof value === "number" && value === 0 ? 0 : value;
            }
            recordEffect(vm, {
              tick: services.view.clock.tick(),
              thread: thread.id,
              name: op.name,
              kind: effect.kind,
              args:
                effect.args !== undefined
                  ? [...effect.args]
                  : args.map((arg) =>
                      typeof arg.value === "number" && arg.value === 0 ? 0 : arg.value,
                    ),
              out,
              result: result.value,
              patch: section === undefined ? null : { section, path: [], op: "merge", value: null },
              wait: null,
              request: null,
            });
          }
        }

        if (controlApplied) break;

        if (result.wait !== undefined) {
          thread.wait = result.wait;
          thread.status = "waiting";
          return;
        }

        applyOut(
          vm,
          thread,
          frameIndex,
          resolved.command.spec,
          args,
          result.out ?? [],
          op.name,
          op.pos,
        );
        frame.operands.push({ value: result.value, ref: null });
        break;
      }

      case "return": {
        const returnArg = frame.operands.pop() ?? { value: 0, ref: null };
        thread.frames.pop();
        if (thread.frames.length === 0) {
          thread.status = "finished";
          return;
        }
        const callerFrame = thread.frames[thread.frames.length - 1]!;
        callerFrame.operands.push(returnArg);
        break;
      }
    }
  }
}
