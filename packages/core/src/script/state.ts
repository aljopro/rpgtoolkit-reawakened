/**
 * The VM state tree (AD-7, AD-26; docs/spec/engine/rpgcode-errors-and-threads.md#threads THR-2).
 *
 * `VmState` is AD-10's `vm` section: `threads`, `globals`, `objects`,
 * `redirects` and the effect log (`effects` and `effectSeq`, ticket 3.21).
 * `objects` is entry 6's and `redirects` entry 8's, so both are
 * empty now. `Thread` and `Frame` carry AD-7's minimum fields with the values
 * this entry fixes: `ThreadKind`/`ThreadOwner` are AD-26's, `source`/`target`
 * are THR-2's per-thread pair and `null` for a plain thread, and `errorHandler`
 * is `null` until entry 7. `Frame.operands` holds bound `Arg`s so a
 * by-reference reference survives to dispatch (docs/spec/engine/rpgcode-runtime.md#sem-3--comparison-and-conversion SEM-6).
 *
 * Everything here is `PlainData` (G1 rule 2): the `GameState` assertion in
 * `core/save` proves it at build time.
 *
 * docs/adr/0004; docs/spec/engine/rpgcode-errors-and-threads.md#threads (THR-2) (SEM-4/SEM-6).
 */

import type { AssertPlainData } from "../ports/plain-data.ts";
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
/** One active object in the deterministic handle table (OOP-3/OOP-5). */
export type ObjectRecord = {
  handle: number;
  className: string;
  program: ProgramRef;
  members: { [name: string]: Value };
};

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
  /** Receiver context for a class method; absent on legacy frames. */
  objectHandle?: number;
  objectClass?: string;
  /** Value supplied by a construction frame when it returns. */
  returnValue?: Value;
  /** Object freed after a destructor frame returns. */
  releaseHandle?: number;
};
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
};

/** The `vm` section: AD-10's threads, globals, objects and redirects, plus the effect log. */
export type VmState = {
  threads: Thread[];
  globals: { [name: string]: Value };
  objects: ObjectRecord[];
  redirects: Array<[string, string]>;
  effects: EffectRecord[];
  effectSeq: number;
};

/** Build-time proof that the `vm` section stays plain data (G1 rule 2, AD-7). */
export type VmStateIsPlainData = AssertPlainData<VmState>;

/** A fresh `vm` section: no threads, no globals, no objects, no redirects, no effects. */
export function createVmState(): VmState {
  return { threads: [], globals: {}, objects: [], redirects: [], effects: [], effectSeq: 0 };
}

/** Build a global-scope variable reference (AD-8's `Arg.ref`). */
export function globalRef(name: string): RefId {
  return `global:${name}` as RefId;
}

/** Build a local-scope variable reference (AD-8's `Arg.ref`). */
export function localRef(name: string): RefId {
  return `local:${name}` as RefId;
}

/**
 * Start a program as a new `blocking` thread (AD-7, AD-26). The id is
 * `max(id) + 1`; a second live blocking thread is refused, because AD-26
 * allows at most one (`thread.blocking-exists`).
 */
export function startProgram(state: VmState, ref: ProgramRef): Thread {
  for (const thread of state.threads) {
    if (thread.kind === "blocking" && thread.status !== "finished") {
      throw new ScriptError("thread.blocking-exists", "a blocking thread already exists (AD-26)");
    }
  }
  let maxId = 0;
  for (const thread of state.threads) {
    if (thread.id > maxId) maxId = thread.id;
  }
  const thread: Thread = {
    id: maxId + 1,
    kind: "blocking",
    owner: "script",
    source: null,
    target: null,
    frames: [
      { program: ref, ip: 0, locals: {}, operands: [], errorHandler: null, autoLocal: false },
    ],
    status: "ready",
    wait: null,
  };
  state.threads.push(thread);
  return thread;
}
