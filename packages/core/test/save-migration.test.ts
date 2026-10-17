// The vm section's migration chain (AD-7, AD-23; tickets 3.21 and 3.9). Each
// bump of `SCHEMA_VERSIONS.vm` needs a save fixture from the previous version
// and a restore test over it. v2 (`fixtures/save/v2-vm.json`, no effect log)
// gains `effects: []` and `effectSeq: 0`; v3 (`fixtures/save/v3-vm.json`, a
// sleeping thread with the old wait shape) gains the thread, wait and request
// fields of ticket 3.9; v4 (`fixtures/save/v4-vm.json`) gains only the section
// version for the module fields of ticket 3.8. All end at the current section version.
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

  equal(SCHEMA_VERSIONS.vm, 5);
  equal(restored.schema.vm, SCHEMA_VERSIONS.vm);
  deepEqual(restored.vm.effects, []);
  equal(restored.vm.effectSeq, 0);
  equal(restored.vm.block, null);
  equal(restored.vm.requestSeq, 0);
  // The migrated state is a valid GameState: it canonicalises and round-trips.
  equal(canon(restoreGameState(snapshot(restored))), canon(restored));
});

test("a v3 save restores with its thread and sleep wait migrated to the v4 shape", () => {
  const restored = restoreGameState(fixtureText("v3-vm.json"));

  equal(restored.schema.vm, SCHEMA_VERSIONS.vm);
  equal(restored.vm.block, null);
  equal(restored.vm.requestSeq, 0);
  const thread = restored.vm.threads[0]!;
  deepEqual(thread.queue, []);
  equal(thread.pending, null);
  deepEqual(thread.detached, []);
  equal(thread.collect, null);
  // The v3 sleep was the blocking `sleep(ticks)` command: global, and it resumes its call.
  deepEqual(thread.wait, { kind: "sleep", until: 5, global: true, resumesCall: true });
  equal(canon(restoreGameState(snapshot(restored))), canon(restored));
});

test("a v4 save (no module fields) restores unchanged apart from the v5 section version", () => {
  const restored = restoreGameState(fixtureText("v4-vm.json"));

  equal(SCHEMA_VERSIONS.vm, 5);
  equal(restored.schema.vm, SCHEMA_VERSIONS.vm);
  const frame = restored.vm.threads[0]!.frames[0]!;
  // The module fields are optional and stay absent: the ref is the v4 ref.
  deepEqual(frame.program, { compiler: "2", kind: "inline", text: "sleep(5)\nend()\n" });
  deepEqual(restored.vm.redirects, []);
  deepEqual(restored.vm.threads[0]!.wait, { kind: "sleep", until: 5, global: true, resumesCall: true });
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
