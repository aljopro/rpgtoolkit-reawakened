// The vm section's migration chain (AD-7, AD-23; ticket 3.21). Bumping
// `SCHEMA_VERSIONS.vm` to 3 needs a save fixture from the previous version
// (`fixtures/save/v2-vm.json`, schema.vm 2, no effect log) and a restore test
// over it: the migration adds `effects: []` and `effectSeq: 0` and moves the
// section version to the current one.
import { deepEqual, equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  canon,
  createGameState,
  restoreGameState,
  SCHEMA_VERSIONS,
  snapshot,
  type ScriptError,
} from "../src/index.ts";

function errorOf(run: () => unknown): { code: string; message: string } {
  try {
    run();
  } catch (error) {
    const scriptError = error as ScriptError;
    equal(typeof scriptError.code, "string");
    return { code: scriptError.code, message: scriptError.message };
  }
  throw new Error("expected the call to throw");
}

function fixtureText(name: string): string {
  return readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures", "save", name), "utf8");
}

test("a v2 save (no effect log) restores cleanly as the current vm schema", () => {
  const restored = restoreGameState(fixtureText("v2-vm.json"));

  equal(SCHEMA_VERSIONS.vm, 3);
  equal(restored.schema.vm, SCHEMA_VERSIONS.vm);
  deepEqual(restored.vm.effects, []);
  equal(restored.vm.effectSeq, 0);
  // The migrated state is a valid GameState: it canonicalises and round-trips.
  equal(canon(restoreGameState(snapshot(restored))), canon(restored));
});

test("migration is idempotent and leaves a current-version save untouched", () => {
  const current = createGameState({ seed: 0 });
  const json = snapshot(current);
  const restored = restoreGameState(json);
  equal(canon(restored), json);
  deepEqual(restored.vm.effects, []);
  equal(restored.vm.effectSeq, 0);
});

test("restore refuses a snapshot whose schema has no numeric vm version", () => {
  const json = JSON.parse(snapshot(createGameState({ seed: 0 }))) as {
    schema: { vm?: unknown };
  };
  json.schema.vm = "two";
  equal(errorOf(() => restoreGameState(JSON.stringify(json))).code, "restore.shape");
});

test("restore refuses a snapshot whose vm section is not an object", () => {
  const json = JSON.parse(snapshot(createGameState({ seed: 0 }))) as {
    schema: { vm: unknown };
    vm: unknown;
  };
  json.schema.vm = 2;
  json.vm = 7;
  equal(errorOf(() => restoreGameState(JSON.stringify(json))).code, "restore.shape");
});
