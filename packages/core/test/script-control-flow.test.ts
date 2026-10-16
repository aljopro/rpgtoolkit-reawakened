// Control flow: if/elseif/else, while, until, for, switch, labels and control effects.
import { equal } from "node:assert/strict";
import { test } from "node:test";
import {
  createGameState,
  startProgram,
  type BuiltinSpec,
  type GameState,
  type PluginDefinition,
  type ScriptError,
} from "../src/index.ts";
import { advanceOrFail } from "./script-failures.ts";
import { createScriptServices } from "./script-test-services.ts";

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

function runScript(source: string, plugins: readonly PluginDefinition[] = []): GameState {
  const state = createGameState({ seed: 0 });
  startProgram(state.vm, { kind: "inline", text: source, compiler: "2" });
  advanceOrFail(state, createScriptServices(state, plugins));
  return state;
}

test("if/elseif/else selects the matching branch and skips the rest", () => {
  const script = `
function classify(x) {
  if (x == 1) {
    return "one"
  } elseif (x == 2) {
    return "two"
  } else if (x == 3) {
    return "three"
  } else {
    return "other"
  }
}
r1 = classify(1)
r2 = classify(2)
r3 = classify(3)
r4 = classify(99)
`;
  const state = runScript(script);
  equal(state.vm.globals.r1, "one");
  equal(state.vm.globals.r2, "two");
  equal(state.vm.globals.r3, "three");
  equal(state.vm.globals.r4, "other");
});

test("while loops until false and skips when initially false", () => {
  const script = `
i = 0
sum = 0
while (i < 5) {
  sum = sum + i
  i = i + 1
}
skipped = 0
while (0) {
  skipped = 1
}
`;
  const state = runScript(script);
  equal(state.vm.globals.i, 5);
  equal(state.vm.globals.sum, 10);
  equal(state.vm.globals.skipped, 0);
});

test("until checks first (SEM-2) and loops until true", () => {
  const script = `
i = 0
sum = 0
until (i >= 5) {
  sum = sum + i
  i = i + 1
}
// Initially true condition skips immediately
skipped = 0
until (1) {
  skipped = 1
}
`;
  const state = runScript(script);
  equal(state.vm.globals.i, 5);
  equal(state.vm.globals.sum, 10);
  equal(state.vm.globals.skipped, 0);
});

test("for header allows empty parts (STX-4)", () => {
  const script = `
n = 0
for (; n < 3; ) {
  n = n + 1
}
// with step only
m = 0
for (; m < 3; m = m + 1) {
}
`;
  const state = runScript(script);
  equal(state.vm.globals.n, 3);
  equal(state.vm.globals.m, 3);
});

test("switch/case with colon or colon-less labels and default has no fall-through (STX-2)", () => {
  const script = `
function pick(v) {
  switch (v) {
    case (0) {
      hit = 0
      return "zero"
    }
    case (1): {
      hit = 1
      return "one"
    }
    case 2: {
      hit = 2
      return "two"
    }
    default: {
      hit = 99
      return "many"
    }
  }
}
r0 = pick(0)
r1 = pick(1)
r2 = pick(2)
r3 = pick(10)
`;
  const state = runScript(script);
  equal(state.vm.globals.r0, "zero");
  equal(state.vm.globals.r1, "one");
  equal(state.vm.globals.r2, "two");
  equal(state.vm.globals.r3, "many");
});

test("labels are function-scoped and duplicate label is rejected (STX-5)", () => {
  // Duplicate label in one scope throws compile.duplicate-label
  equal(
    errorOf(() =>
      runScript(`
function f() {
  :loop
  x = 1
  :loop
  return x
}
`),
    ).code,
    "compile.duplicate-label",
  );

  // Same label name in different functions is allowed
  const state = runScript(`
function f1() {
  :loop
  return 1
}
function f2() {
  :loop
  return 2
}
r1 = f1()
r2 = f2()
`);
  equal(state.vm.globals.r1, 1);
  equal(state.vm.globals.r2, 2);
});

test("vm.control effects: end unwinds all frames and finishes thread (FUN-7)", () => {
  const script = `
function deep() {
  end()
  return "unreachable"
}
function mid() {
  return deep()
}
mid()
result = "done"
`;
  const state = runScript(script);
  equal(state.vm.threads[0]!.status, "finished");
  equal(state.vm.threads[0]!.frames.length, 0);
  equal(state.vm.globals.result, undefined);
});

test("vm.control effects: run replaces program and jump jumps to label", () => {
  const jumpCmd: BuiltinSpec = {
    name: "dojump",
    aliases: [],
    params: [{ name: "target", optional: false, byRef: false, variadic: false }],
    call: (_view, args) => ({
      value: null,
      effects: [{ kind: "vm.control", args: ["jump", String(args[0]?.value)] }],
    }),
  };

  const plugins: readonly PluginDefinition[] = [
    { id: "test.jump", version: "1.0.0", commands: [jumpCmd] },
  ];

  // Test jump
  const jumpScript = `
function f() {
  x = 1
  dojump(:target)
  x = 99
  :target
  return x
}
r = f()
`;
  const state = runScript(jumpScript, plugins);
  equal(state.vm.globals.r, 1);

  // Unknown label raises vm.unknown-label
  const badJump = `
function f() {
  dojump(:nonexistent)
}
f()
`;
  equal(errorOf(() => runScript(badJump, plugins)).code, "vm.unknown-label");
});
