// The save tree, canonical form and restore checks (AD-7, AD-10, AD-11, AD-23):
// the 18-section shape, a mid-yield round-trip and the two pinned restore errors.
import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import {
  canon,
  createGameState,
  createScriptServices,
  advanceScriptTick,
  restoreGameState,
  SCHEMA_VERSIONS,
  snapshot,
  startProgram,
  type GameState,
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

function midYieldState(): GameState {
  const state = createGameState({ seed: 3 });
  startProgram(state.vm, {
    kind: "inline",
    text: 'greeting = "hi"\ncount = 2\nsleep(count)\ncount = 3\nend()\n',
    compiler: "1",
  });
  advanceScriptTick(state, createScriptServices(state));
  return state;
}

test("GameState is PlainData and has exactly the AD-10 sections", () => {
  const state = createGameState({ seed: 0 });
  deepEqual(Object.keys(state).sort(), Object.keys(SCHEMA_VERSIONS).sort());
  equal(Object.keys(state).length, 18);
  equal(typeof canon(state), "string");
  deepEqual(state.schema.compiler, "1");
});

test("canon round-trips through restore for a mid-yield state", () => {
  const state = midYieldState();
  equal(state.vm.threads[0]!.status, "waiting");

  const json = snapshot(state);
  equal(canon(restoreGameState(json)), json);
});

test("restore rejects a different compiler version and a missing section", () => {
  const json = snapshot(createGameState({ seed: 0 }));

  const wrongCompiler = JSON.parse(json) as { schema: { compiler: string } };
  wrongCompiler.schema.compiler = "999";
  equal(
    errorOf(() => restoreGameState(JSON.stringify(wrongCompiler))).code,
    "restore.compiler-mismatch",
  );

  const missingSection = JSON.parse(json) as Record<string, unknown>;
  delete missingSection.vm;
  equal(errorOf(() => restoreGameState(JSON.stringify(missingSection))).code, "restore.shape");

  equal(errorOf(() => restoreGameState("{ not json")).code, "restore.shape");
});
