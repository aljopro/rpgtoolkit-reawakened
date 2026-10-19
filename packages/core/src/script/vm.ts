/**
 * The script step machine (G1; AD-8/AD-9/AD-26; docs/spec/engine/rpgcode-errors-and-threads.md#threads THR-3).
 *
 * Dispatches the full StepOp instruction set, function call frames with
 * overloading by arity, by-reference parameter aliasing, `return &lvalue`,
 * truthiness and operator semantics per SEM-3, control effects for FUN-7
 * unwinding, and source positions on every error.
 *
 * docs/adr/0004; docs/spec/engine/rpgcode-errors-and-threads.md#threads (THR-3) (SEM-3/SEM-4/SEM-5/SEM-6).
 */

import { pow } from "../fmath/index.ts";
import type { Diagnostic } from "../ports/engine.ts";
import type { Logger } from "../ports/logger.ts";
import type { PlainData } from "../ports/plain-data.ts";
import type { CallableValue, ObjectValue, RefId, Value, VarScope } from "../ports/value.ts";
import type { Wait, WaitPoll, WaitReply, WaitView } from "../ports/wait.ts";
import { createRngPort } from "../rng/xoshiro.ts";
import type { GameState, SectionKey } from "../save/state.ts";
import { createClockPort, MAX_TICK, runTimePhase } from "../time/time.ts";
import type { Arg, BuiltinSpec } from "./builtins.ts";
import { createDefaultVirtuals, type VirtualVariablePort } from "./virtuals.ts";
import { recordDiagnostic, recordEffect, type EffectRecord } from "./effects.ts";
import {
  CALLABLE_ARITY,
  CALLABLE_NOT_CALLABLE,
  CALLABLE_UNKNOWN_DEF,
  failureClass,
  HANDLER_NOT_HANDLING,
  HANDLER_TOP_LEVEL,
  HANDLER_UNKNOWN_LABEL,
  INCLUDE_CYCLE,
  locateError,
  ScriptError,
  toDiagnostic,
} from "./errors.ts";
import { NULL_LOGGER } from "./logging.ts";
import { ENGINE_DEFAULT_MANIFEST } from "./manifest.ts";
import { createProgramCache, type ProgramCache } from "./cache.ts";
import { runModuleCommand } from "./modules.ts";
import { MODULE_COMMANDS } from "./parse.ts";
import type { SourcePos, StepOp } from "./ops.ts";
import type { CommandResult, CommandView, ResolvedPlugin } from "./plugin.ts";
import {
  COMPILER_VERSION,
  fileProgramRef,
  withRedirects,
  type ProgramLoader,
  type FunctionInfo,
  type Program,
  type ProgramRef,
  type StatementRange,
} from "./program.ts";
import { resolveProgram } from "./loader.ts";
import {
  assembleCommands,
  bindingOf,
  createCommandLookup,
  resolveCall,
  type CallResolution,
  type CommandLookup,
} from "./registry.ts";
import {
  cellRef,
  findBlockingThread,
  findThread,
  globalRef,
  killThread,
  localRef,
  refreshBlock,
  startThread,
  type Frame,
  type LocalSlot,
  type Thread,
  type VmState,
} from "./state.ts";
import { defaultWaitPoll, describeWait } from "./waits.ts";
import {
  compareEqual,
  compareRelational,
  foldAscii,
  indexKey,
  isCallableValue,
  toInt32,
  toNumberValue,
  toStringValue,
  truthy,
} from "./values.ts";

/**
 * The per-thread, per-tick VM-step budget (docs/spec/engine/rpgcode-errors-and-threads.md THR-3, R-33).
 * A fixed number, not a frame-rate formula: 1000 is the tuning point the
 * stress tests exercise, and callers may pass a smaller budget to a phase.
 */
export const STEP_BUDGET = 1000;

/** What one tick left the script threads doing. */
export type ScriptStatus = "running" | "waiting" | "finished";

/**
 * Everything the script phases need that is not state. `logger` is the human
 * debug channel (AD-24); `diagnostics` collects the located host diagnostics
 * of every runtime failure until the engine drains them into a `TickReport`.
 */
export type ScriptServices = {
  readonly view: CommandView;
  readonly commands: CommandLookup;
  readonly programs: ProgramCache;
  /** Where file programs and includes load from; absent when the host serves none (G2). */
  readonly loader?: ProgramLoader;
  readonly virtuals: VirtualVariablePort;
  readonly logger: Logger;
  readonly diagnostics: Diagnostic[];
  /** Manifest options remain host/service data and never enter VM state. */
  readonly pluginOptions: ReadonlyMap<string, PlainData>;
  /** Engine-owned synchronous effect dispatch hook. */
  readonly postEffect?: (section: SectionKey, effect: EffectRecord) => void;
};

/** Take every diagnostic collected since the last drain, oldest first. */
export function drainDiagnostics(services: ScriptServices): Diagnostic[] {
  return services.diagnostics.splice(0, services.diagnostics.length);
}

/** The cache key is owned by `programKey`, which includes dialect and module metadata. */
export function createScriptServices(
  state: GameState,
  plugins: readonly ResolvedPlugin[] = [],
  logger: Logger = NULL_LOGGER,
  virtuals?: VirtualVariablePort,
  loaderOrGameId?: ProgramLoader | string,
  explicitGameId = "default",
  postEffect?: (section: SectionKey, effect: EffectRecord) => void,
): ScriptServices {
  const loader = typeof loaderOrGameId === "string" ? undefined : loaderOrGameId;
  const gameId = typeof loaderOrGameId === "string" ? loaderOrGameId : explicitGameId;
  const view: CommandView = {
    rng: createRngPort(state.rng),
    clock: createClockPort(state.time),
    state,
    gameId,
  };
  const virt = virtuals ?? createDefaultVirtuals(state);
  const registry = assembleCommands(plugins, logger);
  const pluginOptions = new Map<string, PlainData>();
  for (const plugin of plugins) {
    if (plugin.options !== undefined) pluginOptions.set(plugin.definition.id, plugin.options);
  }
  // The engine's own packs are the built-in tier (R-35); every other plugin is an extension.
  const builtinPacks = new Set(ENGINE_DEFAULT_MANIFEST.map((entry) => entry.id));
  const commands = createCommandLookup({
    builtin: (name) =>
      registry.layerPlugins(name).some((id) => builtinPacks.has(id)) ? registry.get(name) : undefined,
    extension: (name) => registry.get(name),
  });
  const diagnostics: Diagnostic[] = [];
  // Load-time notices (clashes, shadowed built-ins, include cycles) are raised once, when a program
  // compiles: each is a located warn record, and a cycle is also a located host diagnostic (MOD-3).
  const programs = createProgramCache(
    {
      ...(loader === undefined ? {} : { loader }),
      isBuiltin: (name) => commands.builtin(name) !== undefined,
    },
    (notices) => {
      for (const notice of notices) {
        if (notice.code === INCLUDE_CYCLE) {
          diagnostics.push({
            code: notice.code,
            file: notice.file,
            line: notice.line,
            message: notice.message,
          });
        }
        logger.warn({
          level: "warn",
          code: notice.code,
          message: notice.message,
          data: { file: notice.file, line: notice.line, notice: notice.data },
        });
      }
    },
  );
  return {
    view,
    commands,
    programs,
    virtuals: virt,
    logger,
    diagnostics,
    pluginOptions,
    ...(loader === undefined ? {} : { loader }),
    ...(postEffect === undefined ? {} : { postEffect }),
  };
}

/**
 * The waits phase (AD-9, AD-26; THR-1, THR-3, R-32). Waiting threads are
 * polled in ascending id, so threads due on the same tick resume in that order
 * and a thread that wakes runs in this tick's threads phase. While a blocking
 * command waits (R-32) only that command's wait is polled; the cooperative
 * waits of the other threads are polled once it resolves, in the same phase.
 * `poll` is AD-9's one resolver; it defaults to the VM-owned kinds.
 */
export function runWaitsPhase(
  vm: VmState,
  view: WaitView,
  poll: WaitPoll = defaultWaitPoll,
  claim?: (seq: number) => void,
): void {
  const waiting = vm.threads.filter((thread) => thread.status === "waiting" && thread.wait !== null);
  waiting.sort((left, right) => left.id - right.id);
  const blocker = findBlockingThread(vm);
  if (blocker !== null) {
    resolveWait(vm, view, poll, blocker, claim);
    if (blocker.status === "waiting") {
      refreshBlock(vm, view.tick);
      return;
    }
  }
  for (const thread of waiting) {
    if (thread !== blocker) resolveWait(vm, view, poll, thread, claim);
  }
  refreshBlock(vm, view.tick);
}

/** Poll one thread's wait; on a result, make the thread ready and hand it the wake value. */
function resolveWait(vm: VmState, view: WaitView, poll: WaitPoll, thread: Thread, claim?: (seq: number) => void): void {
  const wait = thread.wait;
  if (wait === null) return;
  if (wait.kind === "input.key" && wait.parkSeq === undefined) wait.parkSeq = view.input?.nextSeq ?? 0;
  const result = poll(view, wait);
  if (result === null) return;
  if (result.claim !== undefined) claim?.(result.claim);
  thread.status = "ready";
  thread.wait = null;
  const frame = thread.frames[thread.frames.length - 1];
  if (frame === undefined) {
    thread.status = "finished";
    return;
  }
  if (wait.kind === "request" || wait.kind === "blob") {
    if (!result.ok) {
      recordDiagnostic(vm, view.tick, thread.id, "request.failed", wait.file, wait.line, toStringValue(result.value));
    }
    if (wait.then !== null) {
      thread.pending = {
        command: wait.then.command,
        args: [result.ok ? 1 : 0, result.value, ...wait.then.args],
        file: wait.file,
        line: wait.line,
      };
      return;
    }
    frame.operands.push({ value: result.ok ? result.value : 0, ref: null });
    return;
  }
  if ("resumeRefs" in wait && wait.resumeRefs !== undefined) {
    const topIndex = thread.frames.length - 1;
    for (const ref of wait.resumeRefs) writeRef(vm, thread, topIndex, ref as RefId, result.value);
  }
  if (wait.kind === "sleep" && !wait.resumesCall) return;
  frame.operands.push({ value: result.value, ref: null });
}


/**
 * Deliver a request's reply, or a recorded one on replay (AD-5). The reply is
 * stored in the request's wait; the next waits phase resolves it. Throws
 * `request.unknown` when no thread waits on `reqId` and `request.duplicate-reply`
 * when a reply is already stored.
 */
export function replyToRequest(vm: VmState, reqId: number, reply: WaitReply): void {
  for (const thread of vm.threads) {
    const wait = thread.wait;
    if (thread.status !== "waiting" || wait === null || (wait.kind !== "request" && wait.kind !== "blob")) continue;
    if (wait.reqId !== reqId) continue;
    if (wait.reply !== null) {
      throw new ScriptError("request.duplicate-reply", `request ${reqId} already has a reply`);
    }
    wait.reply = { ok: reply.ok, value: reply.value };
    return;
  }
  throw new ScriptError("request.unknown", `no thread waits on request ${reqId}`);
}

/**
 * The threads phase (AD-26; THR-3, R-32). Ready threads take their turn in
 * ascending id, each for at most `budget` VM steps; a thread that reaches the
 * budget keeps its state and continues next tick. Nothing runs while a
 * blocking command waits (R-32), and a thread that enters one stops the rest
 * of the phase. Threads started or woken during the phase take their first
 * turn next tick.
 */
export function runThreadsPhase(vm: VmState, services: ScriptServices, budget: number): void {
  if (!Number.isInteger(budget) || budget < 1) {
    throw new ScriptError("vm.bad-budget", `the step budget must be a positive whole number, got ${budget}`);
  }
  const ready = vm.threads.filter((thread) => thread.status === "ready");
  ready.sort((left, right) => left.id - right.id);
  for (const thread of ready) {
    if (findBlockingThread(vm) !== null) break;
    if (thread.status !== "ready") continue;
    stepThread(thread, vm, services, budget);
    refreshBlock(vm, services.view.clock.tick());
  }
  refreshBlock(vm, services.view.clock.tick());
}

/**
 * The end-of-tick pass (R-34): the last step of every tick, after the `time`
 * phase, run by `advanceScriptTick` and by the engine's `time` phase alike.
 */
export function collectGarbage(vm: VmState): void {
  collectObjects(vm);
}

function collectObjects(vm: VmState): void {
  const roots: number[] = [];
  const visit = (value: Value): void => {
    if (isObjectValue(value)) roots.push(value.handle);
  };
  for (const value of Object.values(vm.globals)) visit(value);
  for (const value of Object.values(vm.cells ?? {})) visit(value);
  for (const thread of vm.threads) {
    for (const frame of thread.frames) {
      for (const slot of Object.values(frame.locals)) visit(slot.value);
      for (const arg of frame.operands) visit(arg.value);
    }
  }
  const incoming: { [handle: string]: number } = {};
  for (const record of vm.objects) {
    for (const value of Object.values(record.members)) {
      if (isObjectValue(value)) incoming[String(value.handle)] = (incoming[String(value.handle)] ?? 0) + 1;
    }
  }
  const rootSet: { [handle: string]: true } = {};
  for (const handle of roots) rootSet[String(handle)] = true;
  vm.objects = vm.objects.filter(
    (record) => rootSet[String(record.handle)] === true || (incoming[String(record.handle)] ?? 0) > 0,
  );
}

export function advanceScriptTick(
  state: GameState,
  services: ScriptServices,
  budget: number = STEP_BUDGET,
  poll: WaitPoll = defaultWaitPoll,
): ScriptStatus {
  runWaitsPhase(state.vm, state.time, poll);
  runThreadsPhase(state.vm, services, budget);
  assertNoDeadlock(state.vm, services);
  runTimePhase(state.time);
  collectGarbage(state.vm);
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

/** `file:line` of the call a thread is parked at, or the program's name when it has none. */
function threadLocation(thread: Thread, services: ScriptServices): SourcePos | null {
  const frame = thread.frames[thread.frames.length - 1];
  if (frame === undefined) return null;
  const program = services.programs.get(frame.program);
  return program.ops[frame.ip - 1]?.pos ?? program.ops[frame.ip]?.pos ?? null;
}

/**
 * Fail headless when nothing can ever run again: no thread is ready and every
 * live thread is parked in an indefinite sleep, which only another running
 * thread's `threadWake` could end (THR-1). The error names every stuck thread
 * with its wait and location. Any other wait (`input.key`, a request, timed
 * sleeps) can still be resolved from outside, so it is not a deadlock.
 */
function assertNoDeadlock(vm: VmState, services: ScriptServices): void {
  const stuck: Thread[] = [];
  for (const thread of vm.threads) {
    if (thread.status === "finished") continue;
    const wait = thread.wait;
    if (thread.status !== "waiting" || wait === null || wait.kind !== "sleep" || wait.until !== null) return;
    stuck.push(thread);
  }
  if (stuck.length === 0) return;
  stuck.sort((left, right) => left.id - right.id);
  const parts = stuck.map((thread) => {
    const pos = threadLocation(thread, services);
    const where = pos === null ? "" : ` at ${pos.file}:${pos.line}`;
    return `thread ${thread.id} waits on ${thread.wait === null ? "nothing" : describeWait(thread.wait)}${where}`;
  });
  throw new ScriptError(
    "vm.deadlock",
    `deadlock at tick ${services.view.clock.tick()}: ${parts.join("; ")}`,
    threadLocation(stuck[0]!, services),
  );
}

function refName(ref: RefId): string {
  const sep = ref.indexOf(":");
  return sep >= 0 ? ref.slice(sep + 1) : ref;
}
function isObjectValue(value: Value | undefined): value is ObjectValue {
  return typeof value === "object" && value !== null && "kind" in value && value.kind === "object";
}

function objectRef(handle: number, name: string): RefId {
  return `object:${handle}:${name}` as RefId;
}

function parseObjectRef(ref: RefId): { handle: number; name: string } | null {
  if (!ref.startsWith("object:")) return null;
  const separator = ref.indexOf(":", 7);
  if (separator < 0) return null;
  const handle = Number(ref.slice(7, separator));
  if (!Number.isInteger(handle)) return null;
  return { handle, name: ref.slice(separator + 1) };
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

/** The function or method whose op range holds `ip`, or `undefined` for top-level code. */
function enclosingFunction(program: Program, ip: number): FunctionInfo | undefined {
  for (const fnList of Object.values(program.functions)) {
    for (const fn of fnList) {
      if (ip >= fn.entry && ip < fn.end) return fn;
    }
  }
  for (const cls of Object.values(program.classes)) {
    for (const fnList of Object.values(cls.methods)) {
      for (const fn of fnList) {
        if (ip >= fn.entry && ip < fn.end) return fn;
      }
    }
  }
  return undefined;
}

/**
 * Resolve a handler label inside the function holding `ip` only (ERR-1: a
 * handler can never jump into another function).
 */
function handlerLabel(program: Program, ip: number, name: string): number | undefined {
  const fn = enclosingFunction(program, ip);
  return fn !== undefined && Object.hasOwn(fn.labels, name) ? fn.labels[name] : undefined;
}

/** The op index just after the innermost statement holding `ip` (ERR-1 `resumeNext`). */
function statementEnd(program: Program, ip: number): number {
  let best: StatementRange | undefined;
  for (const range of program.statements) {
    if (ip < range.start || ip >= range.end) continue;
    if (best === undefined || range.end - range.start < best.end - best.start) best = range;
  }
  return best === undefined ? ip + 1 : best.end;
}

/** How many operands an op consumes and how many values it leaves (net of ops that duplicate). */
function stackEffect(op: StepOp): { readonly pops: number; readonly pushes: number } {
  switch (op.op) {
    case "push":
    case "name":
    case "load":
    case "declRef":
    case "load_fn":
    case "dup":
      return { pops: 0, pushes: 1 };
    case "storeRef":
    case "index":
    case "compound":
    case "binop":
      return { pops: 2, pushes: 1 };
    case "member":
    case "unop":
      return { pops: 1, pushes: 1 };
    case "select":
      return { pops: 3, pushes: 1 };
    case "methodCall":
      return { pops: op.argc + 1, pushes: 1 };
    case "call_indirect":
      return { pops: op.argc + 1, pushes: 1 };
    case "construct":
    case "call":
      return { pops: op.argc, pushes: 1 };
    case "pop":
    case "jumpIfFalse":
      return { pops: 1, pushes: 0 };
    case "jump":
    case "return":
      return { pops: 0, pushes: 0 };
  }
}

/**
 * Record one catchable runtime failure: always as a located host diagnostic,
 * and as an `error` Logger record unless `debug(false)` has silenced the
 * interpreter's own messages (ERR-2). An `internal` fault is never silenced.
 */
function reportFailure(vm: VmState, services: ScriptServices, error: ScriptError): void {
  services.diagnostics.push(toDiagnostic(error));
  const family = failureClass(error.code);
  if (vm.messagesOff === true && family !== "internal") return;
  services.logger.error({
    level: "error",
    code: error.code,
    message: error.message,
    data: { file: error.pos?.file ?? "", line: error.pos?.line ?? 0, class: family },
  });
}

/**
 * Route one failed operation at its own frame (ERR-1/ERR-2). The failure is
 * located at the op, reported, then either the frame's label handler takes
 * over (operands dropped, resume point remembered) or the thread continues at
 * the next VM step with the failed op contributing the unset value. Never
 * touches another frame, so a caller's handler cannot catch a callee failure.
 */
function handleFailure(
  vm: VmState,
  services: ScriptServices,
  program: Program,
  frame: Frame,
  op: StepOp,
  opIp: number,
  depth: number,
  error: ScriptError,
): void {
  const located = locateError(error, op.pos);
  reportFailure(vm, services, located);
  const handler = frame.errorHandler;
  if (handler !== null && handler.mode === "label") {
    const target = handler.label === null ? undefined : handlerLabel(program, opIp, handler.label);
    if (target !== undefined) {
      frame.operands.length = 0;
      handler.active = true;
      handler.resume = statementEnd(program, opIp);
      frame.ip = target;
      return;
    }
    // ERR-1: the handler is cleared only when its label cannot be found; the error is reported.
    frame.errorHandler = null;
  }
  const effect = stackEffect(op);
  const target = Math.max(0, depth - effect.pops) + effect.pushes;
  if (frame.operands.length > target) frame.operands.length = target;
  while (frame.operands.length < target) frame.operands.push({ value: 0, ref: null });
  frame.ip = opIp + 1;
}

/** Install or replace the calling frame's handler, keeping any in-flight resume point (ERR-1). */
function installHandler(
  program: Program,
  frame: Frame,
  frameIndex: number,
  opIp: number,
  pos: SourcePos,
  label: string | null,
): void {
  if (frameIndex === 0) {
    throw new ScriptError(
      HANDLER_TOP_LEVEL,
      "an error handler can be set inside a function only",
      pos,
    );
  }
  if (label !== null && handlerLabel(program, opIp, label) === undefined) {
    throw new ScriptError(
      HANDLER_UNKNOWN_LABEL,
      `handler label \`:${label}\` not found in the current function`,
      pos,
    );
  }
  const previous = frame.errorHandler;
  frame.errorHandler = {
    mode: label === null ? "resumeNext" : "label",
    label,
    active: previous?.active ?? false,
    resume: previous?.resume ?? null,
  };
}

/** `resumeNext()`: continue after the failing statement, consuming the remembered point once (ERR-1). */
function resumeAfterFailure(frame: Frame, frameIndex: number, pos: SourcePos): void {
  const handler = frame.errorHandler;
  if (frameIndex === 0 || handler === null || handler.resume === null) {
    throw new ScriptError(
      HANDLER_NOT_HANDLING,
      "resumeNext() is legal only inside a function while its error handler is handling an error",
      pos,
    );
  }
  frame.operands.length = 0;
  frame.ip = handler.resume;
  handler.resume = null;
  handler.active = false;
}

function readRef(vm: VmState, thread: Thread, frameIndex: number, ref: RefId): Value {
  const separator = ref.indexOf(":");
  const scope = ref.slice(0, separator);
  const name = ref.slice(separator + 1);
  // A closure cell belongs to the callable value that captured the name, not to
  // any frame: every call of the closure reads and writes this one slot (FUN-8).
  if (scope === "cell") {
    return vm.cells?.[name] ?? 0;
  }
  if (scope === "object") {
    const object = parseObjectRef(ref);
    const record = object === null ? undefined : vm.objects.find((item) => item.handle === object.handle);
    return record?.members[object?.name ?? name] ?? 0;
  }
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
  if (scope === "cell") {
    setOwnValue((vm.cells ??= {}), name, stored);
    return;
  }
  if (scope === "object") {
    const object = parseObjectRef(ref);
    const record = object === null ? undefined : vm.objects.find((item) => item.handle === object.handle);
    if (record !== undefined && object !== null) record.members[object.name] = stored;
    return;
  }
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

function deleteVariable(vm: VmState, thread: Thread, frameIndex: number, target: string): void {
  const isWholeArray = !target.includes("[");
  const prefix = `${target}[`;

  for (let i = frameIndex; i >= 0; i--) {
    const f = thread.frames[i];
    if (f) {
      const slot = f.locals[target];
      // A captured name is bound to a cell, which has no "unset" state: `kill`
      // empties the cell and keeps the binding, so the closure's next read
      // still reaches its own storage instead of creating a global (FUN-8).
      if (slot !== undefined && slot.ref.startsWith("cell:")) {
        setOwnValue((vm.cells ??= {}), slot.ref.slice(5), 0);
      } else {
        delete f.locals[target];
      }
      if (isWholeArray) {
        for (const key of Object.keys(f.locals)) {
          if (key.startsWith(prefix)) {
            delete f.locals[key];
          }
        }
      }
    }
  }

  delete vm.globals[target];
  if (isWholeArray) {
    for (const key of Object.keys(vm.globals)) {
      if (key.startsWith(prefix)) {
        delete vm.globals[key];
      }
    }
  }
}

function loadArg(
  vm: VmState,
  thread: Thread,
  frameIndex: number,
  name: string,
  scope?: VarScope,
  virtuals?: VirtualVariablePort,
): Arg {
  if (scope === "global") {
    if (Object.hasOwn(vm.globals, name)) {
      return { value: vm.globals[name] ?? 0, ref: globalRef(name) };
    }
    const virt = virtuals?.read(name);
    if (virt !== undefined) {
      return { value: virt, ref: globalRef(name) };
    }
    setOwnValue(vm.globals, name, 0);
    return { value: 0, ref: globalRef(name) };
  }

  const frame = thread.frames[frameIndex]!;
  if (scope === "local") {
    if (!Object.hasOwn(frame.locals, name)) {
      setOwnSlot(frame.locals, name, { value: 0, ref: localRef(name) });
    }
    const slot = frame.locals[name]!;
    if (slot.ref === localRef(name)) {
      return { value: slot.value ?? 0, ref: slot.ref };
    }
    const val = readRef(vm, thread, frameIndex, slot.ref);
    return { value: val, ref: slot.ref };
  }

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

  const virtVal = virtuals?.read(name);
  if (virtVal !== undefined) {
    return { value: virtVal, ref: globalRef(name) };
  }

  if (frame.autoLocal) {
    setOwnSlot(frame.locals, name, { value: 0, ref: localRef(name) });
    return { value: 0, ref: localRef(name) };
  }

  // SEM-4/SEM-5: Read creates the variable as global (unset -> 0)
  setOwnValue(vm.globals, name, 0);
  return { value: 0, ref: globalRef(name) };
}

/**
 * The callable the running scope holds under `name`, or `undefined` when the
 * name holds anything else or nothing — entry 1 of the environment table
 * (FUN-8; entries 18.4 and 18.5). The scope is the variable a read of `name`
 * reaches: a local of the running frame (a parameter, a declared local or a
 * captured name), else the global. A local that holds a non-callable hides a
 * callable global of the same name, as it hides it for a read, and the caller's
 * locals are never consulted. A lookup that finds no variable is not a call
 * and, unlike a read of an unset variable, never defines a global, so an
 * unmatched call keeps the legacy `unknown.command` failure.
 */
function heldCallable(
  vm: VmState,
  thread: Thread,
  frameIndex: number,
  name: string,
): CallableValue | undefined {
  const frame = thread.frames[frameIndex]!;
  if (Object.hasOwn(frame.locals, name)) {
    const value = readRef(vm, thread, frameIndex, frame.locals[name]!.ref);
    return isCallableValue(value) ? value : undefined;
  }
  const global = Object.hasOwn(vm.globals, name) ? vm.globals[name] : undefined;
  return isCallableValue(global) ? global : undefined;
}

/** The call name of the VM-owned `bindingOf` command (FUN-8; entry 18.5), as the lexer folds it. */
const BINDING_OF = "bindingof";

/**
 * `bindingOf(name)` (FUN-8; entry 18.5): the callable a call of `name` would run
 * from the running scope right now. The name is a string and is folded like any
 * name (LEX-10); a script function counts when any compiled program defines
 * one. It changes no variable and does not wait, so it is not a command of the
 * registry: it needs the running frame and the compiled programs, which a
 * command never sees.
 */
function bindingOfCall(
  vm: VmState,
  thread: Thread,
  frameIndex: number,
  services: ScriptServices,
  program: Program,
  args: readonly Arg[],
  pos: SourcePos,
): CallableValue {
  if (args.length !== 1) {
    throw new ScriptError("arity.mismatch", `"bindingOf" takes 1 argument(s), got ${args.length}`, pos);
  }
  const given = args[0]!.value;
  if (typeof given !== "string") {
    throw new ScriptError("builtin.bad-arg", `"bindingOf" takes the name as a string`, pos);
  }
  const name = foldAscii(given);
  const handle = bindingOf(
    name,
    services.commands,
    heldCallable(vm, thread, frameIndex, name),
    (candidate) => findDefinition(services, program, candidate)?.infos.some((info) => info.entry >= 0) ?? false,
  );
  if (handle === undefined) {
    throw new ScriptError("unknown.command", `no built-in or function named "${name}"`, pos);
  }
  return handle;
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

function classInfo(program: Program, name: string) {
  return program.classes[name];
}

function classWalk(program: Program, name: string, seen: string[] = []): string[] {
  if (seen.includes(name)) return seen;
  seen.push(name);
  const info = classInfo(program, name);
  if (info !== undefined) {
    for (const base of info.bases) classWalk(program, base, seen);
  }
  return seen;
}

function findMethod(program: Program, className: string, name: string, argc: number) {
  for (const current of classWalk(program, className)) {
    const list = classInfo(program, current)?.methods[name];
    const method = list?.find((candidate) => candidate.params.length === argc);
    if (method !== undefined) return method;
  }
  return undefined;
}

function findMember(program: Program, className: string, name: string) {
  for (const current of classWalk(program, className)) {
    const member = classInfo(program, current)?.members.find((candidate) => candidate.name === name);
    if (member !== undefined) return member;
  }
  return undefined;
}

function bindMethodLocals(
  method: { readonly params: readonly { readonly name: string; readonly byRef: boolean }[] },
  args: readonly Arg[],
): { [name: string]: LocalSlot } {
  const locals: { [name: string]: LocalSlot } = {};
  for (let index = 0; index < method.params.length; index += 1) {
    const parameter = method.params[index]!;
    const arg = args[index];
    if (parameter.byRef && arg?.ref !== null && arg !== undefined) {
      setOwnSlot(locals, parameter.name, { value: arg.value, ref: arg.ref });
    } else {
      setOwnSlot(locals, parameter.name, { value: arg?.value ?? 0, ref: localRef(parameter.name) });
    }
  }
  return locals;
}
/** Whether the thread keeps running after a call or must stop its turn here. */
type CallOutcome = "continue" | "yield";

/** The recorded form of a call's arguments: values only, with `-0` normalised (AD-14). */
function argValues(args: readonly Arg[]): PlainData[] {
  return args.map((arg) => (typeof arg.value === "number" && arg.value === 0 ? 0 : arg.value));
}

/** A fresh host-request wait; file/blob requests use AD-9's dedicated `blob` kind. */
function requestWait(
  reqId: number,
  deadline: number | null,
  then: CommandResult["then"],
  pos: SourcePos,
  requestKind?: string,
): Wait {
  const kind = requestKind === "loadBlob" || requestKind === "saveBlob" ? "blob" : "request";
  return {
    kind,
    global: true,
    reqId,
    deadline,
    reply: null,
    then: then === undefined ? null : { command: then.command, args: [...then.args] },
    file: pos.file,
    line: pos.line,
  };
}

/** The thread `id` names, for an operation that needs it to be running code (`threadSleep`, `tellThread`). */
function liveTarget(vm: VmState, id: number, what: string, pos: SourcePos): Thread {
  const target = findThread(vm, id);
  if (target === undefined) {
    throw new ScriptError("thread.unknown", `${what}: no thread ${id} is registered`, pos);
  }
  if (target.status === "finished") {
    throw new ScriptError("thread.finished", `${what}: thread ${id} has finished`, pos);
  }
  return target;
}

/**
 * The compiled definition `def` names: the running program first, then every
 * other compiled program in cache order (FUN-8; entry 18.4). A def is unique to
 * the unit that was lowered (`main.prg#lambda_1`), so the first program that
 * defines it owns it, and a handle made in one program is callable from another
 * — a lambda stored in a global and called by a `run()` program, for example.
 * `infos` holds one entry per parameter count, as `Program.functions` does.
 */
function findDefinition(
  services: ScriptServices,
  program: Program,
  def: string,
): { readonly program: Program; readonly infos: readonly FunctionInfo[] } | undefined {
  const local = program.functions[def];
  if (local !== undefined) return { program, infos: local };
  const owner = services.programs.find(def);
  const infos = owner === undefined ? undefined : owner.functions[def];
  return owner === undefined || infos === undefined ? undefined : { program: owner, infos };
}

/**
 * Dispatch one indirect call (FUN-8; ADR 0004 decision 8; entries 18.4 and
 * 18.5). A handle runs the binding it names through the environment table's
 * lower entries only — an engine command first (R-35), then a compiled
 * definition, then a command a plugin claims — and never asks the running scope
 * for a symbol, so a handle `bindingOf` made keeps running the binding it named
 * after the name has been reassigned, and a wrapper that calls it cannot
 * recurse into itself. A script function or lambda definition pushes a new
 * frame exactly as a direct call pushes one, bound to the program that defines
 * it; a command name runs that command, so a handle can hold either kind. A
 * lambda frame binds its captured names to the cells named in `value.captures`
 * first, then its parameters as usual: a capture is never a parameter, because
 * lowering leaves parameters out of the capture list.
 *
 * The same thread and the same frame stack carry the call, so a wait inside the
 * callee parks the caller, `end()` unwinds it, returns come back to the caller's
 * operand stack, and each instruction spends one step of the same budget: an
 * indirect call is a direct call with the definition chosen at run time.
 */
function performCallable(
  thread: Thread,
  vm: VmState,
  services: ScriptServices,
  program: Program,
  frame: Frame,
  frameIndex: number,
  value: CallableValue,
  args: Arg[],
  pos: SourcePos,
): CallOutcome {
  const builtin = services.commands.builtin(value.def);
  if (builtin !== undefined) {
    return dispatchResolved(
      thread, vm, services, program, frame, frameIndex, value.def,
      { kind: "command", command: builtin }, args, pos, true,
    );
  }
  const found = findDefinition(services, program, value.def);
  if (found === undefined) {
    const extension = services.commands.extension(value.def);
    if (extension === undefined) {
      throw new ScriptError(
        CALLABLE_UNKNOWN_DEF,
        `the callable's definition "${value.def}" is in no compiled program`,
        pos,
      );
    }
    return dispatchResolved(
      thread, vm, services, program, frame, frameIndex, value.def,
      { kind: "command", command: extension }, args, pos, true,
    );
  }

  const info = found.infos.find((entry) => entry.entry >= 0 && entry.params.length === args.length);
  if (info === undefined) {
    const takes = found.infos.filter((entry) => entry.entry >= 0).map((entry) => entry.params.length);
    throw new ScriptError(CALLABLE_ARITY, `"${value.def}" takes ${takes.join(" or ")} argument(s), got ${args.length}`, pos);
  }

  const locals = bindMethodLocals(info, args);
  const names = info.captures ?? [];
  if (names.length !== value.captures.length) {
    throw new ScriptError(
      CALLABLE_UNKNOWN_DEF,
      `the callable's definition "${value.def}" captures ${names.length} name(s), but the handle names ${value.captures.length}`,
      pos,
    );
  }
  for (let index = 0; index < names.length; index += 1) {
    const name = names[index]!;
    if (Object.hasOwn(locals, name)) continue;
    const cell = value.captures[index]!;
    if (cell === "") continue;
    setOwnSlot(locals, name, { value: vm.cells?.[cell] ?? 0, ref: cellRef(cell) });
  }

  frame.ip += 1;
  thread.frames.push({
    program: found.program.ref,
    ip: info.entry,
    locals,
    operands: [],
    errorHandler: null,
    autoLocal: frame.autoLocal,
  });
  return "continue";
}

/**
 * Run a request continuation's command (a call site that was already passed, so
 * the instruction pointer does not advance). The command resolves through the
 * engine's own bindings only — the environment table without the running
 * scope's symbol — because the continuation belongs to the command that asked
 * for it: a script that has reassigned the name does not intercept it.
 */
function performContinuation(
  thread: Thread,
  vm: VmState,
  services: ScriptServices,
  program: Program,
  frame: Frame,
  frameIndex: number,
  name: string,
  args: Arg[],
  pos: SourcePos,
): CallOutcome {
  const resolved = resolveCall(name, args.length, program, services.commands);
  if (resolved === undefined || resolved.kind === "callable") {
    throw new ScriptError("unknown.command", `no built-in or function named "${name}"`, pos);
  }
  return dispatchResolved(thread, vm, services, program, frame, frameIndex, name, resolved, args, pos, false);
}

/**
 * Dispatch one resolved call: a script function pushes a frame, a command runs
 * and its effects are applied (control effects, the effect log, thread
 * operations), then the call parks the thread (a wait, a request, a self-sleep,
 * a movement), or pushes its value. `advance` is false for a request
 * continuation, whose call site was already passed.
 */
function dispatchResolved(
  thread: Thread,
  vm: VmState,
  services: ScriptServices,
  program: Program,
  frame: Frame,
  frameIndex: number,
  name: string,
  resolved: Exclude<CallResolution, { readonly kind: "callable" }>,
  args: Arg[],
  pos: SourcePos,
  advance: boolean,
): CallOutcome {
  if (resolved.kind === "function") {
    if (advance) frame.ip += 1;
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
      autoLocal: frame.autoLocal,
    });
    return "continue";
  }

  checkArity(resolved.command.spec, args, name, pos);
  let result: CommandResult;
  try {
    result = resolved.command.spec.call(services.view, args, resolved.command.next);
  } catch (error) {
    // A command cannot know where it was called from: locate its error here.
    if (error instanceof ScriptError && error.pos === null) {
      throw new ScriptError(error.code, error.message, pos);
    }
    throw error;
  }
  if (advance) frame.ip += 1;

  const tick = services.view.clock.tick();
  let controlApplied = false;
  let parked = false;
  for (const effect of result.effects ?? []) {
    if (effect.kind === "vm.control") {
      const action = effect.args?.[0];
      if (action === "end") {
        thread.frames = [];
        thread.status = "finished";
        thread.wait = null;
        thread.detached = [];
        thread.collect = null;
        return "yield";
      }
      if (action === "run") {
        const rawTarget = effect.args?.[1] as ProgramRef;
        let newRef: ProgramRef;
        if (
          rawTarget.kind === "inline" &&
          services.loader !== undefined &&
          resolveProgram(services.loader, rawTarget.text) !== undefined
        ) {
          newRef = fileProgramRef(services.loader, rawTarget.text, vm.redirects);
        } else {
          newRef = withRedirects(rawTarget, vm.redirects);
        }
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
        thread.detached = [];
        thread.collect = null;
        return "yield";
      }
      if (action === "jump") {
        const labelName = effect.args?.[1] as string;
        const targetIp = lookupLabel(program, frame.ip, labelName);
        if (targetIp === undefined) {
          throw new ScriptError(
            "vm.unknown-label",
            `label \`:${labelName}\` not found in current function scope`,
            pos,
          );
        }
        frame.ip = targetIp;
        controlApplied = true;
      }
      if (action === "setErrorHandler") {
        installHandler(program, frame, frameIndex, frame.ip, pos, effect.args?.[1] as string);
      }
      if (action === "setResumeNextHandler") {
        installHandler(program, frame, frameIndex, frame.ip, pos, null);
      }
      if (action === "resumeNext") {
        resumeAfterFailure(frame, frameIndex, pos);
        controlApplied = true;
      }
      if (action === "debug") {
        if (effect.args?.[1] === true) delete vm.messagesOff;
        else vm.messagesOff = true;
      }
      if (action === "debugger") {
        services.logger.info({
          level: "info",
          code: "script.debugger",
          message: String(effect.args?.[1] ?? ""),
          data: { file: pos.file, line: pos.line, thread: thread.id },
        });
      }
      if (action === "autoLocal") {
        frame.autoLocal = Boolean(effect.args?.[1]);
      }
      if (action === "kill") {
        const targets = (effect.args?.slice(1) ?? []) as string[];
        for (const target of targets) {
          deleteVariable(vm, thread, frameIndex, target);
        }
      }
      if (action === "split") {
        const baseRef = effect.args?.[1] as RefId;
        const baseName = refName(baseRef);
        const isGlobal = baseRef.startsWith("global:");
        const parts = (effect.args?.slice(2) ?? []) as Value[];
        for (let i = 0; i < parts.length; i++) {
          const elemName = `${baseName}[${i}]`;
          const elemRef = isGlobal ? globalRef(elemName) : localRef(elemName);
          writeRef(vm, thread, frameIndex, elemRef, parts[i]!);
        }
      }
      if (action === "local") {
        const varName = effect.args?.[1] as string;
        if (!Object.hasOwn(frame.locals, varName)) {
          setOwnSlot(frame.locals, varName, { value: 0, ref: localRef(varName) });
        }
      }
      if (action === "global") {
        const varName = effect.args?.[1] as string;
        if (!Object.hasOwn(vm.globals, varName)) {
          setOwnValue(vm.globals, varName, 0);
        }
      }
      if (action === "file") {
        const fileAction = effect.args?.[1] as string;
        const fileId = effect.args?.[2] as string;
        if (fileAction === "open") {
          const fileData = effect.args?.[6] as string;
          const file = {
            id: fileId,
            mode: effect.args?.[3] as "input" | "output" | "append" | "binary",
            path: effect.args?.[4] as string,
            area: effect.args?.[5] as "saves" | "files",
            data: fileData,
            position: effect.args?.[3] === "append" ? fileData.length / 2 : 0,
            loaded: true,
          };
          const existing = vm.files.findIndex((item) => item.id === fileId);
          if (existing >= 0) vm.files.splice(existing, 1, file);
          else vm.files.push(file);
        }
        if (fileAction === "close") {
          const index = vm.files.findIndex((item) => item.id === fileId);
          if (index >= 0) vm.files.splice(index, 1);
        }
        if (fileAction === "position") {
          const file = vm.files.find((item) => item.id === fileId);
          if (file !== undefined) file.position = effect.args?.[3] as number;
        }
        if (fileAction === "data") {
          const file = vm.files.find((item) => item.id === fileId);
          if (file !== undefined) {
            file.data = effect.args?.[3] as string;
            file.position = effect.args?.[4] as number;
          }
        }
      }
      if (action === "thread") {
        startThread(vm, {
          ref: { kind: "inline", text: effect.args?.[1] as string, compiler: COMPILER_VERSION },
          kind: effect.args?.[2] === true ? "persistent" : "board",
          owner: "script",
        });
      }
      if (action === "threadKill") {
        const id = effect.args?.[1] as number;
        if (!killThread(vm, id)) {
          throw new ScriptError("thread.unknown", `killThread: no thread ${id} is registered`, pos);
        }
        if (id === thread.id) return "yield";
      }
      if (action === "threadSleep") {
        const target = liveTarget(vm, effect.args?.[1] as number, "threadSleep", pos);
        const current = target.wait;
        if (
          target.status === "waiting" &&
          (current === null || current.kind !== "sleep" || current.global)
        ) {
          throw new ScriptError(
            "thread.busy",
            `threadSleep: thread ${target.id} is waiting on something other than a sleep`,
            pos,
          );
        }
        const resumesCall =
          target === thread || (current !== null && current.kind === "sleep" && current.resumesCall);
        target.wait = {
          kind: "sleep",
          global: false,
          until: (effect.args?.[2] ?? null) as number | null,
          resumesCall,
        };
        target.status = "waiting";
        if (target === thread) parked = true;
      }
      if (action === "threadWake") {
        const id = effect.args?.[1] as number;
        const target = findThread(vm, id);
        if (target === undefined) {
          throw new ScriptError("thread.unknown", `threadWake: no thread ${id} is registered`, pos);
        }
        const slept = target.wait;
        if (target.status === "waiting" && slept !== null && slept.kind === "sleep" && !slept.global) {
          target.status = "ready";
          target.wait = null;
          if (slept.resumesCall) {
            const top = target.frames[target.frames.length - 1];
            if (top === undefined) target.status = "finished";
            else top.operands.push({ value: null, ref: null });
          }
        }
      }
      if (action === "threadTell") {
        const target = liveTarget(vm, effect.args?.[1] as number, "tellThread", pos);
        target.queue.push({ text: effect.args?.[2] as string, file: pos.file, line: pos.line });
      }
      if (action === "move") {
        const sprite = effect.args?.[1] as string;
        const ticks = effect.args?.[2] as number;
        if (!Number.isInteger(ticks) || ticks < 1 || tick + ticks > MAX_TICK) {
          throw new ScriptError("builtin.bad-arg", `"${name}": a move takes a positive whole number of ticks`, pos);
        }
        if (thread.collect !== null) {
          thread.collect.push({ sprite, until: tick + ticks });
        } else {
          thread.wait = {
            kind: "movement",
            global: thread.kind === "blocking",
            moves: [{ sprite, until: tick + ticks }],
          };
          thread.status = "waiting";
          parked = true;
        }
      }
      if (action === "multiRun") {
        const moves = thread.collect;
        if (moves === null) {
          thread.collect = [];
        } else {
          thread.collect = null;
          if (moves.length > 0) {
            thread.wait = { kind: "movement", global: thread.kind === "blocking", moves };
            thread.status = "waiting";
            parked = true;
          }
        }
      }
    } else {
      const section = effect.section;
      const out: { [index: string]: PlainData } = {};
      for (const [index, value] of result.out ?? []) {
        out[String(index)] = typeof value === "number" && value === 0 ? 0 : value;
      }
      const recorded = recordEffect(vm, {
        tick,
        thread: thread.id,
        name,
        kind: effect.kind,
        args: effect.args !== undefined ? [...effect.args] : argValues(args),
        out,
        result: result.value,
        patch: section === undefined ? null : { section, path: [], op: "merge", value: null },
        wait: null,
        request: null,
      });
      if (section !== undefined) services.postEffect?.(section, recorded);
    }
  }

  if (controlApplied) return "continue";
  if (parked) return "yield";

  if (result.wait !== undefined) {
    const waitEffect = result.wait.kind === "movement"
      ? { ...result.wait, moves: result.wait.moves.map((move) => ({ ...move })) }
      : { ...result.wait };
    recordEffect(vm, {
      tick,
      thread: thread.id,
      name,
      kind: "wait",
      args: argValues(args),
      out: {},
      result: result.value,
      patch: null,
      wait: waitEffect,
      request: null,
    });
  }

  if (result.request !== undefined) {
    const timeout = result.timeoutTicks;
    let deadline: number | null = null;
    if (timeout !== undefined) {
      if (!Number.isInteger(timeout) || timeout < 1 || tick + timeout > MAX_TICK) {
        throw new ScriptError(
          "builtin.bad-arg",
          `"${name}": a request timeout is a positive whole number of ticks`,
          pos,
        );
      }
      deadline = tick + timeout;
    }
    vm.requestSeq += 1;
    const reqId = vm.requestSeq;
    recordEffect(vm, {
      tick,
      thread: thread.id,
      name,
      kind: "request",
      args: argValues(args),
      out: {},
      result: null,
      patch: null,
      wait: requestWait(reqId, deadline, result.then, pos, result.request.kind),
      request: { ...result.request, reqId },
    });
    thread.wait = requestWait(reqId, deadline, result.then, pos, result.request.kind);
    thread.status = "waiting";
    return "yield";
  }

  if (result.wait !== undefined) {
    thread.wait = result.wait;
    thread.status = "waiting";
    return "yield";
  }

  applyOut(vm, thread, frameIndex, resolved.command.spec, args, result.out ?? [], name, pos);
  frame.operands.push({ value: result.value, ref: null });
  return "continue";
}

/** A continuation argument is a script value; booleans become `1`/`0` and anything structured is refused. */
function continuationArg(value: PlainData, pos: SourcePos): Arg {
  if (typeof value === "number" || typeof value === "string" || value === null) {
    return { value, ref: null };
  }
  if (typeof value === "boolean") return { value: value ? 1 : 0, ref: null };
  throw new ScriptError("request.bad-reply", "a request continuation argument must be a number, a string or null", pos);
}

function mismatchCode(error: unknown): "restore.source-changed" | "restore.compiler-mismatch" | null {
  if (!(error instanceof ScriptError)) return null;
  return error.code === "restore.source-changed" || error.code === "restore.compiler-mismatch" ? error.code : null;
}

function restartThreadFromSource(thread: Thread, vm: VmState, services: ScriptServices): void {
  const stale = thread.frames[0]?.program;
  if (stale === undefined) throw new ScriptError("restore.shape", `thread ${thread.id} has no program frame`);
  let ref: ProgramRef;
  if (stale.kind === "file") {
    if (services.loader === undefined) {
      throw new ScriptError("program.file-unsupported", `cannot restart "${stale.path}" without a source loader`);
    }
    const fresh = fileProgramRef(services.loader, stale.path, stale.redirects ?? vm.redirects);
    ref = {
      ...fresh,
      ...(stale.includes === undefined ? {} : { includes: [...stale.includes] }),
      ...(stale.dialect === undefined ? {} : { dialect: stale.dialect }),
    };
  } else {
    ref = {
      ...stale,
      compiler: COMPILER_VERSION,
      ...(stale.includes === undefined ? {} : { includes: [...stale.includes] }),
      ...(stale.dialect === undefined ? {} : { dialect: stale.dialect }),
    };
  }
  services.programs.get(ref);
  thread.frames = [
    {
      program: ref,
      ip: 0,
      locals: {},
      operands: [],
      errorHandler: null,
      autoLocal: false,
    },
  ];
  thread.status = "ready";
  thread.wait = null;
  thread.pending = null;
  thread.detached = [];
  thread.collect = null;
}

function ensureCurrentProgram(thread: Thread, vm: VmState, services: ScriptServices): void {
  const frame = thread.frames[thread.frames.length - 1];
  if (frame === undefined) return;
  try {
    if (frame.program.compiler !== COMPILER_VERSION) {
      throw new ScriptError(
        "restore.compiler-mismatch",
        `thread ${thread.id} was compiled by ${frame.program.compiler}, not ${COMPILER_VERSION}`,
      );
    }
    services.programs.get(frame.program);
  } catch (error) {
    if (mismatchCode(error) === null) throw error;
    restartThreadFromSource(thread, vm, services);
  }
}

/**
 * Run one thread for at most `budget` VM steps and return the steps it ran
 * (THR-3). The thread keeps its whole state between calls, so a thread
 * preempted at the budget resumes at the same instruction next tick, and a
 * test can single-step with a budget of 1. A pending request continuation runs
 * first; then code queued by `tellThread` runs, one item at a time, each on a
 * frame of its own on top of the thread's frames (THR-2).
 */
export function stepThread(
  thread: Thread,
  vm: VmState,
  services: ScriptServices,
  budget: number,
): number {
  let steps = 0;
  const finish = (): number => {
    refreshBlock(vm, services.view.clock.tick());
    return steps;
  };
  services.view.thread = thread.id;
  while (thread.status === "ready" && steps < budget) {
    const frameBeforeRestore = thread.frames[thread.frames.length - 1];
    if (frameBeforeRestore !== undefined) {
      ensureCurrentProgram(thread, vm, services);
      if (thread.frames[thread.frames.length - 1] !== frameBeforeRestore) continue;
    }
    if (thread.pending !== null) {
      const pending = thread.pending;
      thread.pending = null;
      const pendingIndex = thread.frames.length - 1;
      const top = thread.frames[pendingIndex];
      if (top === undefined) {
        thread.status = "finished";
        return finish();
      }
      steps += 1;
      const pos: SourcePos = { file: pending.file, line: pending.line };
      const args = pending.args.map((value) => continuationArg(value, pos));
      const outcome = performContinuation(
        thread,
        vm,
        services,
        services.programs.get(top.program),
        top,
        pendingIndex,
        pending.command,
        args,
        pos,
      );
      if (outcome === "yield") return finish();
      continue;
    }
    const queued = thread.queue[0];
    if (queued !== undefined && thread.detached.length === 0) {
      thread.queue.shift();
      thread.frames.push({
        program: withRedirects(
          { kind: "inline", text: queued.text, compiler: COMPILER_VERSION },
          vm.redirects,
        ),
        ip: 0,
        locals: {},
        operands: [],
        errorHandler: null,
        autoLocal: false,
      });
      thread.detached.push(thread.frames.length - 1);
      continue;
    }
    const frameIndex = thread.frames.length - 1;
    const frame = thread.frames[frameIndex];
    if (frame === undefined) {
      thread.status = "finished";
      return finish();
    }
    const program = services.programs.get(frame.program);
    const op = program.ops[frame.ip];
    if (op === undefined) {
      thread.status = "finished";
      return finish();
    }
    steps += 1;
    const opIp = frame.ip;
    const depth = frame.operands.length;

    try {


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
        if (
          op.scope === undefined &&
          frame.objectHandle !== undefined &&
          frame.objectClass !== undefined &&
          findMember(program, frame.objectClass, op.name) !== undefined
        ) {
          const ref = objectRef(frame.objectHandle, op.name);
          frame.operands.push({ value: readRef(vm, thread, frameIndex, ref), ref });
        } else if (op.name === "this" && frame.objectHandle !== undefined && frame.objectClass !== undefined) {
          frame.operands.push({
            value: { kind: "object", handle: frame.objectHandle, className: frame.objectClass },
            ref: null,
          });
        } else {
          frame.operands.push(loadArg(vm, thread, frameIndex, op.name, op.scope, services.virtuals));
        }
        frame.ip += 1;
        break;

      case "member": {
        const receiver = frame.operands.pop();
        const receiverValue = receiver?.value;
        if (!isObjectValue(receiverValue)) {
          throw new ScriptError("object.invalid", "member access requires a live object", op.pos);
        }
        const record = vm.objects.find((item) => item.handle === receiverValue.handle);
        if (record === undefined) throw new ScriptError("object.invalid", `unknown object handle ${receiverValue.handle}`, op.pos);
        const member = findMember(program, record.className, op.name);
        if (member === undefined) throw new ScriptError("object.invalid", `unknown member ${op.name}`, op.pos);
        if (member.access === "private" && frame.objectClass !== record.className) {
          throw new ScriptError("object.inaccessible-member", `member ${op.name} is private`, op.pos);
        }
        const ref = objectRef(record.handle, op.name);
        frame.operands.push({ value: record.members[op.name] ?? 0, ref });
        frame.ip += 1;
        break;
      }

      case "declRef":
        if (op.scope === "local") {
          if (!Object.hasOwn(frame.locals, op.name)) {
            setOwnSlot(frame.locals, op.name, { value: 0, ref: localRef(op.name) });
          }
          const slot = frame.locals[op.name]!;
          // A slot redirected to a cell (a captured local, FUN-8) or aliasing another variable holds a stale copy: read through it.
          const current = slot.ref === localRef(op.name) ? slot.value ?? 0 : readRef(vm, thread, frameIndex, slot.ref);
          frame.operands.push({ value: current, ref: slot.ref });
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
        const refValue = refArg.value;
        if (isObjectValue(refValue)) {
          const record = vm.objects.find((item) => item.handle === refValue.handle);
          const method = record === undefined ? undefined : findMethod(program, record.className, "operator=", 1);
          if (record !== undefined && method !== undefined && method.entry >= 0) {
            frame.ip += 1;
            thread.frames.push({
              program: frame.program, ip: method.entry, locals: bindMethodLocals(method, [valueArg]), operands: [],
              errorHandler: null, autoLocal: frame.autoLocal, objectHandle: record.handle,
              objectClass: method.className ?? record.className,
            });
            break;
          }
        }
        writeRef(vm, thread, frameIndex, refArg.ref, stored);
        frame.operands.push({ value: stored, ref: null });
        frame.ip += 1;
        break;
      }

      case "compound": {
        const valueArg = frame.operands.pop();
        const refArg = frame.operands.pop();
        if (!valueArg || !refArg || refArg.ref === null) {
          throw new ScriptError("vm.stack-underflow", "compound assignment stack underflow", op.pos);
        }
        const current = readRef(vm, thread, frameIndex, refArg.ref);
        if (isObjectValue(current)) {
          const record = vm.objects.find((item) => item.handle === current.handle);
          const method = record === undefined ? undefined : findMethod(program, record.className, `operator${op.operator}`, 1);
          if (record !== undefined && method !== undefined && method.entry >= 0) {
            frame.ip += 1;
            thread.frames.push({
              program: frame.program, ip: method.entry, locals: bindMethodLocals(method, [valueArg]), operands: [],
              errorHandler: null, autoLocal: frame.autoLocal, objectHandle: record.handle,
              objectClass: method.className ?? record.className,
            });
            break;
          }
          throw new ScriptError("object.invalid", `${op.operator} not found`, op.pos);
        }
        const rhs = valueArg.value;
        const result = op.operator === "+=" ? Number(current) + Number(rhs)
          : op.operator === "-=" ? Number(current) - Number(rhs)
          : op.operator === "*=" ? Number(current) * Number(rhs)
          : op.operator === "/=" ? Number(current) / Number(rhs)
          : op.operator === "%=" ? Number(current) % Number(rhs)
          : Number(rhs);
        writeRef(vm, thread, frameIndex, refArg.ref, result);
        frame.operands.push({ value: result, ref: null });
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
        if (baseArg.ref !== null) {
          const object = parseObjectRef(baseArg.ref);
          if (object !== null) {
            const ref = objectRef(object.handle, `${object.name}[${keyText}]`);
            frame.operands.push({ value: readRef(vm, thread, frameIndex, ref), ref });
            frame.ip += 1;
            break;
          }
        }
        const baseObject = isObjectValue(baseArg.value) ? baseArg.value : null;
        if (baseObject !== null) {
          const record = vm.objects.find((item) => item.handle === baseObject.handle);
          if (record === undefined) throw new ScriptError("object.invalid", `unknown object handle ${baseObject.handle}`, op.pos);
          const method = findMethod(program, record.className, "operator[]", 1);
          if (method !== undefined && method.entry >= 0) {
            frame.ip += 1;
            thread.frames.push({
              program: frame.program, ip: method.entry, locals: bindMethodLocals(method, [keyArg]), operands: [],
              errorHandler: null, autoLocal: frame.autoLocal, objectHandle: record.handle,
              objectClass: method.className ?? record.className,
            });
            break;
          }
          const ref = objectRef(baseObject.handle, `[${keyText}]`);
          frame.operands.push({ value: record.members[`[${keyText}]`] ?? 0, ref });
          frame.ip += 1;
          break;
        }
        const baseName = baseArg.ref !== null ? refName(baseArg.ref) : toStringValue(baseArg.value);
        if (frame.objectHandle !== undefined && frame.objectClass !== undefined && findMember(program, frame.objectClass, baseName) !== undefined) {
          const memberRef = objectRef(frame.objectHandle, `${baseName}[${keyText}]`);
          frame.operands.push({ value: readRef(vm, thread, frameIndex, memberRef), ref: memberRef });
          frame.ip += 1;
          break;
        }
        const namedObject = typeof baseArg.value === "string" ? vm.globals[baseArg.value] : undefined;
        if (isObjectValue(namedObject)) {
          const record = vm.objects.find((item) => item.handle === namedObject.handle);
          const method = record === undefined ? undefined : findMethod(program, record.className, "operator[]", 1);
          if (record !== undefined && method !== undefined && method.entry >= 0) {
            frame.ip += 1;
            thread.frames.push({
              program: frame.program, ip: method.entry, locals: bindMethodLocals(method, [keyArg]), operands: [],
              errorHandler: null, autoLocal: frame.autoLocal, objectHandle: record.handle,
              objectClass: method.className ?? record.className,
            });
            break;
          }
        }
        let scope: VarScope | null = null;
        if (baseArg.ref !== null) scope = baseArg.ref.startsWith("global:") ? "global" : "local";
        const fullName = `${baseName}[${keyText}]`;
        const elementArg = loadArg(vm, thread, frameIndex, fullName, scope ?? undefined, services.virtuals);
        frame.operands.push(elementArg);
        frame.ip += 1;
        break;

      }
      case "construct": {
        const args = takeArgs(frame, op.argc, op.pos);
        const info = classInfo(program, op.className);
        if (info === undefined) throw new ScriptError("object.invalid", `unknown class ${op.className}`, op.pos);
        if (info.abstract) throw new ScriptError("object.abstract-class", `class ${op.className} is abstract`, op.pos);
        let handle = vm.objects.length + 1;
        for (const item of vm.objects) if (item.handle >= handle) handle = item.handle + 1;
        const members: { [name: string]: Value } = {};
        for (const member of info.members) {
          if (member.arraySize !== null) {
            for (let index = 0; index < member.arraySize; index += 1) members[`${member.name}[${index}]`] = 0;
          } else members[member.name] = 0;
        }
        const value: ObjectValue = { kind: "object", handle, className: op.className };
        vm.objects.push({ handle, className: op.className, program: frame.program, members });
        const constructor = findMethod(program, op.className, op.className, op.argc);
        frame.ip += 1;
        if (constructor !== undefined && constructor.entry >= 0) {
          thread.frames.push({
            program: frame.program, ip: constructor.entry, locals: bindMethodLocals(constructor, args), operands: [],
            errorHandler: null, autoLocal: frame.autoLocal, objectHandle: handle,
            objectClass: op.className, returnValue: value,
          });
        } else frame.operands.push({ value, ref: null });
        break;
      }

      case "methodCall": {
        const args = takeArgs(frame, op.argc, op.pos);
        const receiver = frame.operands.pop();
        const receiverValue = receiver?.value;
        if (!isObjectValue(receiverValue)) throw new ScriptError("object.invalid", "method receiver is not an object", op.pos);
        const record = vm.objects.find((item) => item.handle === receiverValue.handle);
        if (record === undefined) throw new ScriptError("object.invalid", `unknown object handle ${receiverValue.handle}`, op.pos);
        if (op.name === "release") {
          const info = classInfo(program, record.className);
          if (info?.destructor !== null && info?.destructor !== undefined) {
            frame.ip += 1;
            thread.frames.push({
              program: frame.program, ip: info.destructor.entry, locals: bindMethodLocals(info.destructor, args), operands: [],
              errorHandler: null, autoLocal: frame.autoLocal, objectHandle: record.handle,
              objectClass: record.className, releaseHandle: record.handle,
            });
          } else {
            vm.objects = vm.objects.filter((item) => item.handle !== record.handle);
            frame.ip += 1;
            frame.operands.push({ value: 0, ref: null });
          }
          break;
        }
        const method = findMethod(program, record.className, op.name, op.argc);
        if (method === undefined || method.entry < 0) throw new ScriptError("object.invalid", `method ${op.name} not found`, op.pos);
        if (method.access === "private" && frame.objectClass !== method.className) {
          throw new ScriptError("object.inaccessible-member", `method ${op.name} is private`, op.pos);
        }
        frame.ip += 1;
        thread.frames.push({
          program: frame.program, ip: method.entry, locals: bindMethodLocals(method, args), operands: [],
          errorHandler: null, autoLocal: frame.autoLocal, objectHandle: record.handle,
          objectClass: method.className ?? record.className,
        });
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
        if (isObjectValue(operand.value)) {
          const method = findMethod(program, operand.value.className, `operator${op.operator}`, 0);
          if (method === undefined) throw new ScriptError("object.invalid", `operator${op.operator} not found`, op.pos);
          frame.ip += 1;
          thread.frames.push({
            program: frame.program, ip: method.entry, locals: bindMethodLocals(method, []), operands: [],
            errorHandler: null, autoLocal: frame.autoLocal, objectHandle: operand.value.handle,
            objectClass: method.className ?? operand.value.className,
          });
          break;
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
        if (isObjectValue(leftArg.value)) {
          const method = findMethod(program, leftArg.value.className, `operator${op.operator}`, 1);
          if (method !== undefined) {
            frame.ip += 1;
            thread.frames.push({
              program: frame.program, ip: method.entry, locals: bindMethodLocals(method, [rightArg]), operands: [],
              errorHandler: null, autoLocal: frame.autoLocal, objectHandle: leftArg.value.handle,
              objectClass: method.className ?? leftArg.value.className,
            });
            break;
          }
          if (op.operator === "==" || op.operator === "~=" || op.operator === "!=") {
            const same = leftArg.value.handle === (isObjectValue(rightArg.value) ? rightArg.value.handle : -1);
            frame.operands.push({ value: op.operator === "==" ? (same ? 1 : 0) : (same ? 0 : 1), ref: null });
            frame.ip += 1;
            break;
          }
          throw new ScriptError("object.invalid", `operator${op.operator} not found`, op.pos);
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
            const rem = toInt32(lVal) % divisor;
            resultValue = Object.is(rem, -0) ? 0 : rem;
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

      case "load_fn": {
        // Capture resolution (FUN-8; ADR 0004 decision 8; entries 18.4 and 18.5).
        // The definition's captured names were worked out at lowering, and the
        // handle records one cell per name in that order ("" for a name that is not
        // a local of this frame, which every call reads and writes live as a global).
        // A captured local's cell is that local's storage: the first closure to
        // capture the name moves the value into a fresh cell and redirects the
        // frame's slot to it, so the frame and every closure read and write one
        // slot, and a later closure from this frame takes the same cell. A fresh
        // cell per frame keeps two runs of the same code apart. A slot that is
        // already a cell (an enclosing lambda's capture, or a by-reference
        // parameter that aliases a captured variable) is shared as it stands; a
        // slot that aliases some other variable (a by-reference parameter) cannot
        // become a cell, so the closure takes a by-value copy in a cell of its own.
        const names = program.functions[op.def]?.[0]?.captures ?? [];
        const captures: string[] = [];
        for (const name of names) {
          if (!Object.hasOwn(frame.locals, name)) {
            captures.push("");
            continue;
          }
          const slot = frame.locals[name]!;
          if (slot.ref.startsWith("cell:")) {
            captures.push(slot.ref.slice(5));
            continue;
          }
          vm.cellSeq = (vm.cellSeq ?? 0) + 1;
          const id = `cell${vm.cellSeq}`;
          setOwnValue((vm.cells ??= {}), id, readRef(vm, thread, frameIndex, slot.ref));
          captures.push(id);
          if (slot.ref === localRef(name)) slot.ref = cellRef(id);
        }
        frame.operands.push({ value: { type: "callable", def: op.def, captures, receiver: null }, ref: null });
        frame.ip += 1;
        break;
      }

      case "call_indirect": {
        // The callee is below its arguments on the stack (18.3): pop the
        // arguments, then the callable itself.
        const args = takeArgs(frame, op.argc, op.pos);
        const callee = frame.operands.pop();
        if (callee === undefined) {
          throw new ScriptError(
            "vm.stack-underflow",
            "call_indirect: the operand stack is missing the callable",
            op.pos,
          );
        }
        if (!isCallableValue(callee.value)) {
          throw new ScriptError(
            CALLABLE_NOT_CALLABLE,
            "call_indirect: the value below the arguments is not a callable",
            op.pos,
          );
        }
        if (performCallable(thread, vm, services, program, frame, frameIndex, callee.value, args, op.pos) === "yield") {
          return finish();
        }
        break;
      }

      case "call": {
        const args = takeArgs(frame, op.argc, op.pos);
        if (op.file === undefined && Object.hasOwn(MODULE_COMMANDS, op.name)) {
          runModuleCommand(op.name, args, vm, services.loader, services.programs, program, op.pos);
          frame.ip += 1;
          frame.operands.push({ value: 0, ref: null });
          break;
        }
        if (op.file === undefined && op.name === BINDING_OF) {
          frame.operands.push({ value: bindingOfCall(vm, thread, frameIndex, services, program, args, op.pos), ref: null });
          frame.ip += 1;
          break;
        }
        // The environment table (FUN-8; entry 18.5): the running scope's own
        // callable under this name first, then a built-in, a script function and a
        // plugin command. A `file.`-qualified call never asks the scope.
        const held = op.file === undefined ? heldCallable(vm, thread, frameIndex, op.name) : undefined;
        const resolved = resolveCall(op.name, op.argc, program, services.commands, op.file, held);
        if (resolved === undefined) {
          if (frame.objectHandle !== undefined && frame.objectClass !== undefined) {
            const ownMethod = findMethod(program, frame.objectClass, op.name, op.argc);
            if (ownMethod !== undefined && ownMethod.entry >= 0) {
              frame.ip += 1;
              thread.frames.push({
                program: frame.program, ip: ownMethod.entry, locals: bindMethodLocals(ownMethod, args), operands: [],
                errorHandler: null, autoLocal: frame.autoLocal, objectHandle: frame.objectHandle,
                objectClass: ownMethod.className ?? frame.objectClass,
              });
              break;
            }
          }
          throw new ScriptError("unknown.command", `no built-in or function named "${op.name}"`, op.pos);
        }
        const outcome =
          resolved.kind === "callable"
            ? performCallable(thread, vm, services, program, frame, frameIndex, resolved.value, args, op.pos)
            : dispatchResolved(thread, vm, services, program, frame, frameIndex, op.name, resolved, args, op.pos, true);
        if (outcome === "yield") return finish();
        break;
      }
      case "return": {
        const returnArg =
          frame.returnValue !== undefined
            ? { value: frame.returnValue, ref: null }
            : frame.operands.pop() ?? { value: 0, ref: null };
        const releaseHandle = frame.releaseHandle;
        const poppedIndex = thread.frames.length - 1;
        thread.frames.pop();
        if (releaseHandle !== undefined) {
          vm.objects = vm.objects.filter((item) => item.handle !== releaseHandle);
        }
        if (thread.frames.length === 0) {
          thread.status = "finished";
          return finish();
        }
        if (thread.detached[thread.detached.length - 1] === poppedIndex) {
          // A `tellThread` frame ends: nothing in the target was waiting for its value.
          thread.detached.pop();
          break;
        }
        const callerFrame = thread.frames[thread.frames.length - 1]!;
        callerFrame.operands.push(returnArg);
        break;
      }
    }
    } catch (caught) {
      // Load-time errors are not catchable; only a runtime failure of this one op is routed here.
      if (!(caught instanceof ScriptError) || failureClass(caught.code) === null) throw caught;
      handleFailure(vm, services, program, frame, op, opIp, depth, caught);
    }
  }
  return finish();
}
