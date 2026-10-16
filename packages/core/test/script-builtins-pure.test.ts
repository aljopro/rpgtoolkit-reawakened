// Pure built-in commands test suite (ticket 3.12; SEM-3, SEM-4, SEM-5, SEM-6, E-92).
import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import {
  advanceScriptTick,
  createGameState,
  hashState,
  restoreGameState,
  snapshot,
  startProgram,
  type GameState,
  type ScriptError,
} from "../src/index.ts";
import { createScriptServices } from "./script-test-services.ts";

function run(program: string, seed = 0): GameState {
  const state = createGameState({ seed });
  startProgram(state.vm, { kind: "inline", text: program, compiler: "2" });
  advanceScriptTick(state, createScriptServices(state));
  return state;
}

function errorOf(fn: () => unknown): { code: string; message: string } {
  try {
    fn();
  } catch (error) {
    const err = error as ScriptError;
    equal(typeof err.code, "string");
    return { code: err.code, message: err.message };
  }
  throw new Error("expected call to throw");
}

// ---------------------------------------------------------------------------
// String Built-Ins
// ---------------------------------------------------------------------------

test("len and length return string length and write to byRef output", () => {
  const state = run(`
    a = len("hello")
    b = length("world!")
    len("testing", out1)
    length("done", out2)
  `);
  equal(state.vm.globals.a, 5);
  equal(state.vm.globals.b, 6);
  equal(state.vm.globals.out1, 7);
  equal(state.vm.globals.out2, 4);

  const err = errorOf(() => run('len("hello", 123)'));
  equal(err.code, "builtin.out-not-by-ref");
});

test("left extracts leftmost characters and handles clamp bounds", () => {
  const state = run(`
    a = left("abcdef", 3)
    b = left("abc", 10)
    c = left("abc", -1)
    left("xyz123", 2, d)
  `);
  equal(state.vm.globals.a, "abc");
  equal(state.vm.globals.b, "abc");
  equal(state.vm.globals.c, "");
  equal(state.vm.globals.d, "xy");
});

test("right extracts rightmost characters and handles clamp bounds", () => {
  const state = run(`
    a = right("abcdef", 3)
    b = right("abc", 10)
    c = right("abc", -1)
    right("xyz123", 3, d)
  `);
  equal(state.vm.globals.a, "def");
  equal(state.vm.globals.b, "abc");
  equal(state.vm.globals.c, "");
  equal(state.vm.globals.d, "123");
});

test("mid extracts substrings using 1-based start indexing", () => {
  const state = run(`
    a = mid("abcdef", 2, 3)
    b = mid("hello", 1, 4)
    c = mid("short", 10, 2)
    mid("banana", 3, 2, d)
  `);
  equal(state.vm.globals.a, "bcd");
  equal(state.vm.globals.b, "hell");
  equal(state.vm.globals.c, "");
  equal(state.vm.globals.d, "na");
});

test("inStr finds 1-based needle position with optional 1-based offset", () => {
  const state = run(`
    a = instr("haystack", "stack")
    b = instr("haystack", "needle")
    c = instr("banana", "an", 3)
    instr("apple pie", "pie", 1, d)
  `);
  equal(state.vm.globals.a, 4);
  equal(state.vm.globals.b, 0);
  equal(state.vm.globals.c, 4);
  equal(state.vm.globals.d, 7);
});

test("replace substitutes all occurrences in string", () => {
  const state = run(`
    a = replace("banana", "a", "o")
    b = replace("hello world", "world", "there")
    replace("cat sat on mat", "at", "ar", c)
  `);
  equal(state.vm.globals.a, "bonono");
  equal(state.vm.globals.b, "hello there");
  equal(state.vm.globals.c, "car sar on mar");
});

test("regExpReplace substitutes using regular expressions and catches bad patterns", () => {
  const state = run(`
    a = regexpreplace("foo123bar", "[0-9]+", "X")
    regexpreplace("a1b2c3", "[a-z]", "_", b)
  `);
  equal(state.vm.globals.a, "fooXbar");
  equal(state.vm.globals.b, "_1_2_3");

  const err = errorOf(() => run('regexpreplace("test", "[invalid(", "x")'));
  equal(err.code, "builtin.bad-arg");
});

test("split splits string by delimiter and writes array elements returning count + 1", () => {
  const state = run(`
    count = split("apple,banana,orange", ",", fruits)
    count2 = split("one|two", "|", parts)
  `);
  equal(state.vm.globals.count, 4);
  equal(state.vm.globals["fruits[0]"], "apple");
  equal(state.vm.globals["fruits[1]"], "banana");
  equal(state.vm.globals["fruits[2]"], "orange");

  equal(state.vm.globals.count2, 3);
  equal(state.vm.globals["parts[0]"], "one");
  equal(state.vm.globals["parts[1]"], "two");

  const err = errorOf(() => run('split("a,b", ",", "notAVal")'));
  equal(err.code, "builtin.out-not-by-ref");
});

test("trim removes whitespace and writes to byRef output", () => {
  const state = run(`
    a = trim("   hello world   ")
    trim("  spaces  ", b)
  `);
  equal(state.vm.globals.a, "hello world");
  equal(state.vm.globals.b, "spaces");
});

test("lcase and ucase fold ASCII cases correctly", () => {
  const state = run(`
    a = lcase("Hello WORLD 123!")
    b = ucase("Hello world 123!")
    lcase("TEST", c)
    ucase("test", d)
  `);
  equal(state.vm.globals.a, "hello world 123!");
  equal(state.vm.globals.b, "HELLO WORLD 123!");
  equal(state.vm.globals.c, "test");
  equal(state.vm.globals.d, "TEST");
});

test("asc and chr perform ASCII character conversions", () => {
  const state = run(`
    a = asc("A")
    b = asc("")
    c = chr(65)
    asc("Z", d)
    chr(90, e)
  `);
  equal(state.vm.globals.a, 65);
  equal(state.vm.globals.b, 0);
  equal(state.vm.globals.c, "A");
  equal(state.vm.globals.d, 90);
  equal(state.vm.globals.e, "Z");
});

test("charAt retrieves 1-based character at position or empty string", () => {
  const state = run(`
    a = charat("hello", 1)
    b = charat("hello", 5)
    c = charat("hello", 6)
    c2 = charat("hello", 0)
    charat("abc", 2, d)
  `);
  equal(state.vm.globals.a, "h");
  equal(state.vm.globals.b, "o");
  equal(state.vm.globals.c, "");
  equal(state.vm.globals.c2, "");
  equal(state.vm.globals.d, "b");
});

test("spliceVariables substitutes global variables enclosed in angle brackets", () => {
  const state = run(`
    hero = "Alex"
    score = 100
    msg = splicevariables("Welcome <hero>! Score: <score> [missing: <unknown>]")
    splicevariables("Hello <hero>", msg2)
  `);
  equal(state.vm.globals.msg, "Welcome Alex! Score: 100 [missing: ]");
  equal(state.vm.globals.msg2, "Hello Alex");
});

// ---------------------------------------------------------------------------
// Conversion Built-Ins
// ---------------------------------------------------------------------------

test("castLit formats numbers with six significant digits per SEM-3", () => {
  const state = run(`
    a = castlit(1234567)
    b = castlit(2.50)
    c = castlit(-0.0000123456)
    castlit(42, d)
  `);
  equal(state.vm.globals.a, "1.23457e+06");
  equal(state.vm.globals.b, "2.5");
  equal(state.vm.globals.c, "-1.23456e-05");
  equal(state.vm.globals.d, "42");
});

test("castNum parses strings to numbers using longest valid prefix", () => {
  const state = run(`
    a = castnum("12abc")
    b = castnum("abc")
    c = castnum("  3.14xyz")
    castnum("999", d)
  `);
  equal(state.vm.globals.a, 12);
  equal(state.vm.globals.b, 0);
  equal(state.vm.globals.c, 3.14);
  equal(state.vm.globals.d, 999);
});

test("castInt truncates numbers to 32-bit integers toward zero", () => {
  const state = run(`
    a = castint(-2.7)
    b = castint("3.9abc")
    c = castint(4.2)
    castint(15.9, d)
  `);
  equal(state.vm.globals.a, -2);
  equal(state.vm.globals.b, 3);
  equal(state.vm.globals.c, 4);
  equal(state.vm.globals.d, 15);
});

// ---------------------------------------------------------------------------
// Scope & Variable Built-Ins
// ---------------------------------------------------------------------------

test("autoLocal true allocates new assignments in frame locals", () => {
  const state = run(`
    autolocal(true)
    x = 10
    autolocal(false)
    y = 20
  `);
  // x was allocated in top-level frame locals, discarded on thread completion
  equal(Object.hasOwn(state.vm.globals, "x"), false);
  // y was allocated in globals
  equal(state.vm.globals.y, 20);
});

test("autoLocal propagates across function calls", () => {
  const state = run(`
    autolocal(true)
    function testFn() {
      inside = 42
    }
    testFn()
  `);
  // inside was created in testFn's locals because autoLocal was propagated
  equal(Object.hasOwn(state.vm.globals, "inside"), false);
});

test("kill deletes scalar variables from scope", () => {
  const state = run(`
    x = 10
    kill(x)
    after = x
  `);
  // Reading x after kill yields unset 0 and re-creates it as 0
  equal(state.vm.globals.after, 0);
  equal(state.vm.globals.x, 0);
});

test("kill deletes single array elements without affecting siblings", () => {
  const state = run(`
    a[0] = "first"
    a[1] = "second"
    kill(a[1])
    read0 = a[0]
    read1 = a[1]
  `);
  equal(state.vm.globals.read0, "first");
  equal(state.vm.globals.read1, 0);
});

test("kill deletes whole array prefixed variables", () => {
  const state = run(`
    arr[0] = 100
    arr[1] = 200
    arr[2] = 300
    other = 99
    kill(arr)
    check0 = arr[0]
    checkother = other
  `);
  equal(state.vm.globals.check0, 0);
  equal(state.vm.globals.checkother, 99);
  equal(Object.hasOwn(state.vm.globals, "arr[1]"), false);
  equal(Object.hasOwn(state.vm.globals, "arr[2]"), false);
});

test("kill variadic deletes multiple variables in single call", () => {
  const state = run(`
    x = 1
    y = 2
    z = 3
    kill(x, y, z)
  `);
  equal(Object.hasOwn(state.vm.globals, "x"), false);
  equal(Object.hasOwn(state.vm.globals, "y"), false);
  equal(Object.hasOwn(state.vm.globals, "z"), false);
});

test("local and global allocate variables dynamically", () => {
  const state = run(`
    global(myglobal)
    local(mylocal)
  `);
  equal(Object.hasOwn(state.vm.globals, "myglobal"), true);
  equal(state.vm.globals.myglobal, 0);

  // Also test functional BuiltinSpec call directly
  const services = createScriptServices(createGameState({ seed: 0 }));
  const localSpec = services.commands.get("local")?.spec;
  const globalSpec = services.commands.get("global")?.spec;
  equal(localSpec !== undefined, true);
  equal(globalSpec !== undefined, true);
  const resLocal = localSpec!.call(
    services.view,
    [{ value: "dynLocal", ref: null }],
    () => ({ value: null }),
  );
  equal(resLocal.value, 0);
  equal(resLocal.effects?.[0]?.kind, "vm.control");
  equal(resLocal.effects?.[0]?.args?.[1], "dynLocal");
});

// ---------------------------------------------------------------------------
// E-92 Virtual Variables
// ---------------------------------------------------------------------------

test("E-92 virtual gametime reads tick elapsed and assignment breaks link", () => {
  const state = createGameState({ seed: 0 });
  state.time.tick = 180; // 3 seconds at 60 fps
  startProgram(state.vm, {
    kind: "inline",
    text: `
      t1 = gametime
      gametime = 999
      t2 = gametime
    `,
    compiler: "2",
  });
  advanceScriptTick(state, createScriptServices(state));
  equal(state.vm.globals.t1, 3);
  equal(state.vm.globals.t2, 999);
  equal(state.vm.globals.gametime, 999);
});

test("E-92 virtual variables read engine state sections", () => {
  const state = createGameState({ seed: 0 });
  // Set mock engine state on sections
  (state.audio as { music?: string }).music = "town.mid";
  (state.world as { board?: { background?: string; skill?: number; constants?: Record<number, number> } }).board = {
    background: "forest.png",
    skill: 5,
    constants: { 0: 42, 1: 100 },
  };
  (state.surfaces as { renderNow?: number }).renderNow = 7;
  (state.sprites as { players?: Array<{ x?: number; y?: number; layer?: number }> }).players = [
    { x: 12, y: 34, layer: 2 },
  ];
  (state.party as { members?: Array<{ name?: string }> }).members = [{ name: "Hero" }];

  startProgram(state.vm, {
    kind: "inline",
    text: `
      m = music
      bg = boardbackground
      sk = boardskill
      cnv = cnvrendernow
      px = playerx[0]
      py = playery[0]
      pl = playerlayer[0]
      ph = playerhandle[0]
      c0 = constant[0]
      c1 = constant[1]
    `,
    compiler: "2",
  });
  advanceScriptTick(state, createScriptServices(state));

  equal(state.vm.globals.m, "town.mid");
  equal(state.vm.globals.bg, "forest.png");
  equal(state.vm.globals.sk, 5);
  equal(state.vm.globals.cnv, 7);
  equal(state.vm.globals.px, 12);
  equal(state.vm.globals.py, 34);
  equal(state.vm.globals.pl, 2);
  equal(state.vm.globals.ph, "Hero");
  equal(state.vm.globals.c0, 42);
  equal(state.vm.globals.c1, 100);
});

// ---------------------------------------------------------------------------
// Snapshot & Restore Verification
// ---------------------------------------------------------------------------

test("pure built-ins execution preserves snapshot and state hash", () => {
  const state = run(`
    msg = "hello"
    count = split("x,y,z", ",", arr)
    val = castnum("123")
    sub = mid(msg, 2, 3)
  `);

  const initialHash = hashState(state);
  const snap = snapshot(state);
  const restored = restoreGameState(snap);
  const restoredHash = hashState(restored);

  equal(restoredHash, initialHash);
  deepEqual(restored.vm.globals, state.vm.globals);
});
