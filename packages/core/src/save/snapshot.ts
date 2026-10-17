/**
 * Snapshot and restore (AD-10/AD-11; decisions Q4, Q5/Q12).
 *
 * `snapshot(state)` is the canonical form of the whole state tree, so a
 * snapshot, a save, a hash and a restore all share one representation
 * (`canon`, RFC 8785) — Q4. `restoreGameState(json)` parses it and checks the
 * compiler version and the presence of every section; bounds and the
 * restore-versus-restart policy for a mismatch are entry 11's. Q5/Q12 place the
 * shared snapshot→restore→hash check in `runner-harness`. Compiled programs are
 * not in state (AD-7), so a restored host recompiles lazily through its own
 * program memo.
 *
 * Two errors are pinned: a different `schema.compiler` is
 * `restore.compiler-mismatch`, and a missing section is `restore.shape`.
 *
 * **Migration (AD-7's migration chain).** A save whose `schema.vm` is behind
 * `SCHEMA_VERSIONS.vm` is migrated forward before it is returned: v2 → v3 adds
 * the effect log that ticket 3.21 introduced, v3 → v4 the thread, wait and
 * request fields of ticket 3.9, v4 → v5 advances both ticket 3.8 module
 * metadata and ticket 3.16's sandboxed file-handle table, then the section
 * version is set to the current one. The chain is keyed by the per-section
 * numbers (AD-23).
 *
 * AD-10 (the state tree) and AD-11 (the canonical form); docs/spec/formats/save-game.md#layout-minor-4 (the
 * saved game).
 */

import { canon } from "../canon/canon.ts";
import { ScriptError } from "../script/errors.ts";
import { COMPILER_VERSION } from "../script/program.ts";
import { SCHEMA_VERSIONS, type GameState } from "./state.ts";

/** The canonical form of a whole game state (AD-10/AD-11). */
export function snapshot(state: GameState): string {
  return canon(state);
}

/**
 * Migrate a snapshot's `vm` section forward to `SCHEMA_VERSIONS.vm` (AD-7's
 * migration chain), one version at a time:
 *
 * - v2 → v3 adds the effect log (`effects`, `effectSeq`).
 * - v3 → v4 adds the thread and wait fields of ticket 3.9: `block: null` and
 *   `requestSeq: 0` on the section; `queue`, `pending`, `detached` and
 *   `collect` on every thread; and `global` and `resumesCall` on a `sleep`
 *   wait. A v3 sleep came from the blocking `sleep(ticks)` command, so it
 *   becomes a global wait that resumes its call (R-32).
 * - v4 → v5 advances both ticket 3.8's optional module fields (`includes` and
 *   `redirects` on program references, and `file` on call instructions) and
 *   ticket 3.16's empty sandboxed file-handle table. Module fields are absent
 *   when empty, so only the section version moves for those fields; `files` is
 *   initialized as an empty table.
 *
 * A save already at the current version is left untouched.
 */
function migrateVm(record: Record<string, unknown>, schema: Record<string, unknown>): void {
  const version = schema.vm;
  if (typeof version !== "number") {
    throw new ScriptError("restore.shape", "the snapshot's `schema` has no numeric `vm` version");
  }
  if (version >= SCHEMA_VERSIONS.vm) return;

  const vm = record.vm;
  if (typeof vm !== "object" || vm === null || Array.isArray(vm)) {
    throw new ScriptError("restore.shape", "the snapshot's `vm` section is not an object");
  }
  const vmRecord = vm as Record<string, unknown>;
  if (version < 3) {
    if (!Array.isArray(vmRecord.effects)) vmRecord.effects = [];
    if (typeof vmRecord.effectSeq !== "number") vmRecord.effectSeq = 0;
  }
  if (version < 4) {
    if (!Array.isArray(vmRecord.threads)) {
      throw new ScriptError("restore.shape", "the snapshot's `vm.threads` is not an array");
    }
    for (const entry of vmRecord.threads as unknown[]) {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
        throw new ScriptError("restore.shape", "a thread in the snapshot is not an object");
      }
      const thread = entry as Record<string, unknown>;
      thread.queue = [];
      thread.pending = null;
      thread.detached = [];
      thread.collect = null;
      const wait = thread.wait;
      if (typeof wait === "object" && wait !== null && !Array.isArray(wait)) {
        const waitRecord = wait as Record<string, unknown>;
        if (waitRecord.kind === "sleep") {
          waitRecord.global = true;
          waitRecord.resumesCall = true;
        }
      }
    }
    vmRecord.block = null;
    vmRecord.requestSeq = 0;
  }
  if (version < 5) {
    if (!Array.isArray(vmRecord.files)) vmRecord.files = [];
  }
  schema.vm = SCHEMA_VERSIONS.vm;
}

function shapeError(message: string): never {
  throw new ScriptError("restore.shape", message);
}

function recordAt(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return shapeError(`the snapshot's ${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function arrayAt(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) return shapeError(`the snapshot's ${path} must be an array`);
  return value;
}

function stringAt(value: unknown, path: string): string {
  if (typeof value !== "string") return shapeError(`the snapshot's ${path} must be a string`);
  return value;
}

function numberAt(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
    return shapeError(`the snapshot's ${path} must be a finite whole number`);
  }
  return value;
}

function nullableRecord(value: unknown, path: string): Record<string, unknown> | null {
  if (value === null) return null;
  return recordAt(value, path);
}

function validateProgramRef(value: unknown, path: string): void {
  const ref = recordAt(value, path);
  const kind = stringAt(ref.kind, `${path}.kind`);
  if (kind !== "inline" && kind !== "file") return shapeError(`the snapshot's ${path}.kind is invalid`);
  stringAt(ref.compiler, `${path}.compiler`);
  if (kind === "inline") stringAt(ref.text, `${path}.text`);
  else {
    stringAt(ref.path, `${path}.path`);
    stringAt(ref.sourceHash, `${path}.sourceHash`);
  }
  if (ref.includes !== undefined) {
    for (const [index, item] of arrayAt(ref.includes, `${path}.includes`).entries()) {
      stringAt(item, `${path}.includes[${index}]`);
    }
  }
  if (ref.redirects !== undefined) {
    for (const [index, pair] of arrayAt(ref.redirects, `${path}.redirects`).entries()) {
      const values = arrayAt(pair, `${path}.redirects[${index}]`);
      if (values.length !== 2) return shapeError(`the snapshot's ${path}.redirects[${index}] must have two items`);
      stringAt(values[0], `${path}.redirects[${index}][0]`);
      stringAt(values[1], `${path}.redirects[${index}][1]`);
    }
  }
}

function validateVmShape(vm: Record<string, unknown>): void {
  for (const key of ["threads", "objects", "redirects", "files", "effects"] as const) arrayAt(vm[key], `vm.${key}`);
  recordAt(vm.globals, "vm.globals");
  numberAt(vm.effectSeq, "vm.effectSeq");
  numberAt(vm.requestSeq, "vm.requestSeq");
  nullableRecord(vm.block, "vm.block");
  if (vm.messagesOff !== undefined && vm.messagesOff !== true) shapeError("the snapshot's vm.messagesOff is invalid");
  for (const [index, threadValue] of arrayAt(vm.threads, "vm.threads").entries()) {
    const thread = recordAt(threadValue, `vm.threads[${index}]`);
    numberAt(thread.id, `vm.threads[${index}].id`);
    if (!["blocking", "board", "persistent", "item"].includes(stringAt(thread.kind, `vm.threads[${index}].kind`))) {
      shapeError(`the snapshot's vm.threads[${index}].kind is invalid`);
    }
    if (!["script", "world"].includes(stringAt(thread.owner, `vm.threads[${index}].owner`))) {
      shapeError(`the snapshot's vm.threads[${index}].owner is invalid`);
    }
    if (thread.source !== null) stringAt(thread.source, `vm.threads[${index}].source`);
    if (thread.target !== null) stringAt(thread.target, `vm.threads[${index}].target`);
    if (!["ready", "waiting", "finished"].includes(stringAt(thread.status, `vm.threads[${index}].status`))) {
      shapeError(`the snapshot's vm.threads[${index}].status is invalid`);
    }
    nullableRecord(thread.wait, `vm.threads[${index}].wait`);
    arrayAt(thread.queue, `vm.threads[${index}].queue`);
    nullableRecord(thread.pending, `vm.threads[${index}].pending`);
    arrayAt(thread.detached, `vm.threads[${index}].detached`);
    if (thread.collect !== null) arrayAt(thread.collect, `vm.threads[${index}].collect`);
    for (const [frameIndex, frameValue] of arrayAt(thread.frames, `vm.threads[${index}].frames`).entries()) {
      const frame = recordAt(frameValue, `vm.threads[${index}].frames[${frameIndex}]`);
      validateProgramRef(frame.program, `vm.threads[${index}].frames[${frameIndex}].program`);
      numberAt(frame.ip, `vm.threads[${index}].frames[${frameIndex}].ip`);
      recordAt(frame.locals, `vm.threads[${index}].frames[${frameIndex}].locals`);
      arrayAt(frame.operands, `vm.threads[${index}].frames[${frameIndex}].operands`);
      if (frame.errorHandler !== null) recordAt(frame.errorHandler, `vm.threads[${index}].frames[${frameIndex}].errorHandler`);
      if (typeof frame.autoLocal !== "boolean") shapeError(`the snapshot's vm.threads[${index}].frames[${frameIndex}].autoLocal is invalid`);
    }
  }
}

function validateShape(record: Record<string, unknown>): void {
  const schema = recordAt(record.schema, "schema");
  for (const key of Object.keys(SCHEMA_VERSIONS)) numberAt(schema[key], `schema.${key}`);
  stringAt(schema.compiler, "schema.compiler");
  for (const key of Object.keys(SCHEMA_VERSIONS)) {
    if (key === "schema" || key === "vm" || key === "rng" || key === "time") continue;
    recordAt(record[key], key);
  }
  const rng = recordAt(record.rng, "rng");
  for (const key of ["s0", "s1", "s2", "s3"]) numberAt(rng[key], `rng.${key}`);
  numberAt(recordAt(record.time, "time").tick, "time.tick");
  validateVmShape(recordAt(record.vm, "vm"));
}

/** Parse and check a snapshot's canonical form (see the file header). */
export function restoreGameState(json: string): GameState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new ScriptError("restore.shape", "a snapshot must be valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new ScriptError("restore.shape", "a snapshot must be a JSON object");
  }
  const record = parsed as Record<string, unknown>;

  const schema = record.schema;
  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) {
    throw new ScriptError("restore.shape", "the snapshot has no `schema` section");
  }
  const compiler = (schema as Record<string, unknown>).compiler;
  if (compiler !== COMPILER_VERSION) {
    throw new ScriptError(
      "restore.compiler-mismatch",
      `the snapshot's compiler ${String(compiler)} does not match ${COMPILER_VERSION}`,
    );
  }

  for (const key of Object.keys(SCHEMA_VERSIONS)) {
    if (!Object.hasOwn(record, key)) {
      throw new ScriptError("restore.shape", `the snapshot is missing the "${key}" section`);
    }
  }

  migrateVm(record, schema as Record<string, unknown>);

  validateShape(record);
  return parsed as GameState;
}
