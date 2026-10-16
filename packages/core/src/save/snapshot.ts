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
 * the effect log (`effects: []`, `effectSeq: 0`) that ticket 3.21 introduced,
 * then the section version is set to the current one. The chain is keyed by the
 * per-section numbers (AD-23).
 *
 * AD-10 (the state tree) and AD-11 (the canonical form); format-spec §11 (the
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
 * migration chain). Only the effect log has a migration so far: v2 → v3 adds
 * `effects` and `effectSeq`. A save already at the current version is left
 * untouched.
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
  if (!Array.isArray(vmRecord.effects)) vmRecord.effects = [];
  if (typeof vmRecord.effectSeq !== "number") vmRecord.effectSeq = 0;
  schema.vm = SCHEMA_VERSIONS.vm;
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

  return parsed as GameState;
}
