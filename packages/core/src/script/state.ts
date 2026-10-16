/**
 * The VM state tree (AD-7, AD-26; docs/spec/engine/rpgcode-errors-and-threads.md#threads THR-2).
 *
 * `VmState` is AD-10's `vm` section: `threads`, `globals`, `objects`,
 * `redirects`, the effect log (`effects` and `effectSeq`, ticket 3.21), the
 * global-block status (`block`, R-32) and the request counter (`requestSeq`,
 * AD-5). `objects` is entry 6's and `redirects` entry 8's, so both are
 * empty now. `Thread` and `Frame` carry AD-7's minimum fields with the values
 * this entry fixes: `ThreadKind`/`ThreadOwner` are AD-26's, `source`/`target`
 * are THR-2's per-thread pair and `null` for a plain thread, and `errorHandler`
 * is `null` until entry 7. `Frame.operands` holds bound `Arg`s so a
 * by-reference reference survives to dispatch (docs/spec/engine/rpgcode-runtime.md#sem-3--comparison-and-conversion SEM-6).
 *
 * A thread's persistence is its kind: `persistent` survives a board change,
 * `board` dies with the board, `item` dies with its item (E-93), and a
 * finished thread stays registered until it is killed or its board or item
 * goes (THR-2; E-93).
 *
 * Everything here is `PlainData` (G1 rule 2): the `GameState` assertion in
 * `core/save` proves it at build time.
 *
 * docs/adr/0004; docs/spec/engine/rpgcode-errors-and-threads.md#threads (THR-2) (SEM-4/SEM-6).
 */

import type { AssertPlainData, PlainData } from "../ports/plain-data.ts";
import type { RefId, Value } from "../ports/value.ts";
import type { Wait } from "../ports/wait.ts";
import type { Arg } from "./builtins.ts";
import type { EffectRecord } from "./effects.ts";
import { ScriptError } from "./errors.ts";
import type { ProgramRef } from "./program.ts";

/** Why a thread exists (AD-26). */
export type ThreadKind = "blocking" | "board" | "persistent" | "item";

/** Who owns a thread's lifecycle (AD-26). */
export type ThreadOwner = "script" | "world";

/** A thread's scheduling state (AD-7). */
export type ThreadStatus = "ready" | "waiting" | "finished";

/** One local variable storage slot in a call frame (AD-7). */
export type LocalSlot = {
  value: Value;
  ref: RefId;
};

/** One active call frame (AD-7). */
export type Frame = {
  program: ProgramRef;
  ip: number;
  locals: { [name: string]: LocalSlot };
  operands: Arg[];
  errorHandler: null;
  autoLocal: boolean;
};

/**
 * Code another thread injected with `tellThread` (THR-2): inline source plus
 * the position of the call that queued it. It runs at the target's next turn.
 */
export type QueuedInline = { text: string; file: string; line: number };

/**
 * A request's continuation, ready to run at the thread's next turn (ADR 0004
 * decision 7): a named command, its arguments with the reply already
 * prepended, and the position of the call that made the request.
 */
export type PendingCall = { command: string; args: PlainData[]; file: string; line: number };

/** One sprite move collected by `multiRun` before the one `movement` wait is entered (E-33). */
export type CollectedMove = { sprite: string; until: number };

/** One RPGCode thread (AD-7, AD-26). */
export type Thread = {
  id: number;
  kind: ThreadKind;
  owner: ThreadOwner;
  source: string | null;
  target: string | null;
  frames: Frame[];
  status: ThreadStatus;
  wait: Wait | null;
  /** Inline code queued by `tellThread`, oldest first (THR-2). */
  queue: QueuedInline[];
  /** The request continuation to run first at the next turn, or `null`. */
  pending: PendingCall | null;
  /** Frame indices of live injected (`tellThread`) frames, innermost last; their return value is dropped. */
  detached: number[];
  /** The moves collected since `multiRun` began, or `null` outside a `multiRun`. */
  collect: CollectedMove[] | null;
};

/**
 * The global-block status (R-32): the thread whose blocking command is
 * waiting, the wait kind and the tick it began. While it is not `null`, no
 * other script thread, movement or frame update advances.
 */
export type GlobalBlock = { thread: number; kind: string; since: number };

/** The `vm` section: AD-10's threads, globals, objects and redirects, plus the effect log. */
export type VmState = {
  threads: Thread[];
  globals: { [name: string]: Value };
  objects: never[];
  redirects: Array<[string, string]>;
  effects: EffectRecord[];
  effectSeq: number;
  block: GlobalBlock | null;
  requestSeq: number;
};

/** Build-time proof that the `vm` section stays plain data (G1 rule 2, AD-7). */
export type VmStateIsPlainData = AssertPlainData<VmState>;

/** A fresh `vm` section: no threads, no globals, no objects, no redirects, no effects, no block. */
export function createVmState(): VmState {
  return {
    threads: [],
    globals: {},
    objects: [],
    redirects: [],
    effects: [],
    effectSeq: 0,
    block: null,
    requestSeq: 0,
  };
}

/** Build a global-scope variable reference (AD-8's `Arg.ref`). */
export function globalRef(name: string): RefId {
  return `global:${name}` as RefId;
}

/** Build a local-scope variable reference (AD-8's `Arg.ref`). */
export function localRef(name: string): RefId {
  return `local:${name}` as RefId;
}

/** The id the next thread gets: `max(id) + 1` (a killed highest id is reused). */
export function nextThreadId(state: Pick<VmState, "threads">): number {
  let maxId = 0;
  for (const thread of state.threads) {
    if (thread.id > maxId) maxId = thread.id;
  }
  return maxId + 1;
}

/** Find a registered thread by id, or `undefined`. */
export function findThread(state: Pick<VmState, "threads">, id: number): Thread | undefined {
  for (const thread of state.threads) {
    if (thread.id === id) return thread;
  }
  return undefined;
}

/** What `startThread` needs to register a thread. */
export type ThreadInit = {
  readonly ref: ProgramRef;
  readonly kind: ThreadKind;
  readonly owner: ThreadOwner;
  readonly source?: string | null;
  readonly target?: string | null;
};

/**
 * Register a new thread running `init.ref` (AD-7, AD-26; E-93). The id is
 * `max(id) + 1`. A second live blocking thread is refused, because AD-26
 * allows at most one (`thread.blocking-exists`); a `blocking` thread is always
 * script-owned and an `item` thread always world-owned (`thread.bad-owner`).
 * An item thread's `source` and `target` are the item (E-46); every other
 * thread starts with `null` for both unless the caller gives them.
 */
export function startThread(state: VmState, init: ThreadInit): Thread {
  if (init.kind === "blocking") {
    for (const thread of state.threads) {
      if (thread.kind === "blocking" && thread.status !== "finished") {
        throw new ScriptError("thread.blocking-exists", "a blocking thread already exists (AD-26)");
      }
    }
  }
  if (
    (init.kind === "blocking" && init.owner !== "script") ||
    (init.kind === "item" && init.owner !== "world")
  ) {
    throw new ScriptError(
      "thread.bad-owner",
      `a ${init.kind} thread cannot be owned by "${init.owner}" (AD-26)`,
    );
  }
  const thread: Thread = {
    id: nextThreadId(state),
    kind: init.kind,
    owner: init.owner,
    source: init.source ?? null,
    target: init.target ?? null,
    frames: [
      { program: init.ref, ip: 0, locals: {}, operands: [], errorHandler: null, autoLocal: false },
    ],
    status: "ready",
    wait: null,
    queue: [],
    pending: null,
    detached: [],
    collect: null,
  };
  state.threads.push(thread);
  return thread;
}

/**
 * Start a program as a new `blocking` thread (AD-7, AD-26). The id is
 * `max(id) + 1`; a second live blocking thread is refused, because AD-26
 * allows at most one (`thread.blocking-exists`).
 */
export function startProgram(state: VmState, ref: ProgramRef): Thread {
  return startThread(state, { ref, kind: "blocking", owner: "script" });
}

/** Unregister the thread `id`. Returns `false` when no such thread is registered (E-93). */
export function killThread(state: VmState, id: number): boolean {
  const index = state.threads.findIndex((thread) => thread.id === id);
  if (index < 0) return false;
  const thread = state.threads[index]!;
  const wasBlocker = state.block?.thread === id;
  thread.status = "finished";
  thread.frames = [];
  thread.wait = null;
  thread.queue = [];
  thread.pending = null;
  thread.detached = [];
  thread.collect = null;
  state.threads.splice(index, 1);
  if (wasBlocker) state.block = null;
  return true;
}

/** Board exit: every `board` thread dies; `persistent`, `item` and `blocking` threads stay (E-93). */
export function endBoardThreads(state: VmState): void {
  for (const thread of [...state.threads]) {
    if (thread.kind === "board") killThread(state, thread.id);
  }
}

/** An item leaves the board: its `item` threads die with it; `source` names the item (E-46, E-93). */
export function endItemThreads(state: VmState, item: string): void {
  for (const thread of [...state.threads]) {
    if (thread.kind === "item" && thread.source === item) killThread(state, thread.id);
  }
}

/**
 * The thread whose blocking command is waiting (R-32): the lowest id holding
 * a `global` wait, or `null` when no blocking command waits.
 */
export function findBlockingThread(state: Pick<VmState, "threads">): Thread | null {
  let found: Thread | null = null;
  for (const thread of state.threads) {
    if (thread.status !== "waiting" || thread.wait === null || !thread.wait.global) continue;
    if (found === null || thread.id < found.id) found = thread;
  }
  return found;
}

/** Recompute `vm.block` from the threads; the VM calls this after every wait change. */
export function refreshBlock(state: VmState, tick: number): void {
  const thread = findBlockingThread(state);
  if (thread === null || thread.wait === null) {
    state.block = null;
  } else if (
    state.block === null ||
    state.block.thread !== thread.id ||
    state.block.kind !== thread.wait.kind
  ) {
    state.block = { thread: thread.id, kind: thread.wait.kind, since: tick };
  }
}
