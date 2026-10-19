// Pure-RPGCode middleware (FUN-8; MOD-4 as amended by entry 18.5; ADR 0004
// decision 8; entry 18.7): four authored libraries under `fixtures/plugins/`
// (weather-system, audio-stems, pace, hud-log) written only in RPGCode wrap the
// engine's `mwin` and `sleep` through the environment table and `bindingOf`, and the
// real VM runs them: interception, chaining to the engine, the order of stacked
// layers, a wait inside a wrapper, closure cells shared by one library's handles,
// a save taken at every tick of the run, and two identical runs ending identically.
import { deepEqual, equal, throws } from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { TextEncoder } from "node:util";
import { fileURLToPath } from "node:url";
import {
  assetKey,
  canon,
  createAssetIndex,
  createGameState,
  fileProgramRef,
  hashState,
  PACKAGE_ROOT,
  restoreGameState,
  ScriptError,
  snapshot,
  startProgram,
  UI_PLUGIN,
  verifyRestoredHandles,
  type GameState,
  type ProgramLoader,
  type ScriptServices,
} from "../src/index.ts";
import { advanceOrFail } from "./script-failures.ts";
import { createScriptServices } from "./script-test-services.ts";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "plugins");

/** The fixture folder as a `Prg/` loader, with `extra` files added (a variant boot or game). */
function loaderOf(extra: Record<string, string> = {}): ProgramLoader {
  const files: Record<string, string> = {};
  for (const name of readdirSync(FIXTURES)) files[name] = readFileSync(join(FIXTURES, name), "utf8");
  Object.assign(files, extra);
  const bytes = new Map<string, Uint8Array>();
  for (const [name, content] of Object.entries(files)) {
    bytes.set(assetKey(`Prg/${name}`), new TextEncoder().encode(content));
  }
  return {
    index: createAssetIndex(Object.keys(files).map((name) => `Prg/${name}`)),
    root: PACKAGE_ROOT,
    read: (key) => bytes.get(key),
  };
}

/** A game that starts at `boot.prg`, as the plugin fixture game does. */
function bootState(loader: ProgramLoader, boot = "boot.prg", seed = 0): GameState {
  const state = createGameState({ seed });
  startProgram(state.vm, fileProgramRef(loader, boot));
  return state;
}

function finished(state: GameState): boolean {
  return state.vm.threads.every((thread) => thread.status === "finished");
}

/** Advance until every thread has finished, returning the ticks it took. */
function runToEnd(state: GameState, services: ScriptServices, limit = 60): number {
  let ticks = 0;
  while (!finished(state) && ticks < limit) {
    advanceOrFail(state, services);
    ticks += 1;
  }
  equal(finished(state), true, "the program finished within the tick limit");
  return ticks;
}

/** The cells a callable value captures, in order; any other value is a test failure. */
function capturesOf(value: unknown): string[] {
  if (typeof value === "object" && value !== null && "captures" in value && Array.isArray(value.captures)) {
    return value.captures.map(String);
  }
  throw new Error("expected a callable value");
}

/** The effect log's `[tick, name, args]` for the commands named. */
function effectsOf(state: GameState, ...names: string[]): Array<[number, string, unknown]> {
  const found: Array<[number, string, unknown]> = [];
  for (const effect of state.vm.effects) {
    if (names.includes(effect.name)) found.push([effect.tick, effect.name, effect.args]);
  }
  return found;
}

/** The text of every `mwin` the engine itself ran, in order: what is left after every layer. */
function engineLines(state: GameState): unknown[] {
  return effectsOf(state, "mwin").map((entry) => (entry[2] as unknown[])[0]);
}

/** The script services of a plain test game: the core commands plus the UI pack, which holds `mwin`. */
function gameServices(state: GameState, loader: ProgramLoader): ScriptServices {
  return createScriptServices(state, [{ definition: UI_PLUGIN }], undefined, undefined, loader);
}

function restoreChecked(json: string, loader: ProgramLoader): { state: GameState; services: ScriptServices } {
  const state = restoreGameState(json);
  const services = gameServices(state, loader);
  verifyRestoredHandles(state.vm, services);
  return { state, services };
}

/** The whole fixture game, run to its end. */
function playFixtureGame(seed = 0): GameState {
  const loader = loaderOf();
  const state = bootState(loader, "boot.prg", seed);
  runToEnd(state, gameServices(state, loader));
  return state;
}

// --- The stack: interception, chaining, order -----------------------------------------------

test("four libraries wrap mwin and sleep: the game's lines reach the engine through every layer in order", () => {
  const state = playFixtureGame();

  // hud (installed last) is outermost, then audio, then weather; the engine runs last.
  deepEqual(engineLines(state), ["w:rain|a0:hello", "w:snow|a1:again"]);
  equal(
    state.vm.globals.trace,
    "hud> pace> <pace audio> weather> <weather <audio <hud " +
      "hud> pace> <pace audio> weather> <weather <audio <hud " +
      "pace> <pace ",
  );
  equal(state.vm.globals.hudshown, 2);
  equal(state.vm.globals.stemcue, 2);
  equal(state.vm.globals.done, 2, "the game read the weather back through a handle the library stored");
});

test("a wrapper's own call of another wrapped command goes through that layer too (hud's sleep(1) is paced)", () => {
  const state = playFixtureGame();

  // hud calls sleep(1) and pace doubles it, so the engine's sleep gets 2; the game's sleep(1) is doubled the same way.
  deepEqual(effectsOf(state, "sleep").map((entry) => entry[2]), [[2], [2], [2]]);
  // Each mwin waits its hud sleep (2 ticks) before the engine shows the line.
  deepEqual(effectsOf(state, "mwin").map((entry) => entry[0]), [3, 5]);
});

test("installing the same libraries in another order changes the text the engine receives", () => {
  const loader = loaderOf({
    "boot.prg": `
#include "weather-system.prg"
#include "audio-stems.prg"
trace = ""
installStems()
installWeather()
run("game.prg")
`,
    "game.prg": `weatherSet(1)\nmwin("hello")\nend()\n`,
  });
  const state = bootState(loader);
  runToEnd(state, gameServices(state, loader));

  // weather is now the outer layer: it prefixes first, audio tags the already prefixed text.
  deepEqual(engineLines(state), ["a0:w:rain|hello"]);
  equal(state.vm.globals.trace, "weather> audio> <audio <weather ");
});

test("a program that installs nothing still reaches the engine's own mwin and sleep untouched", () => {
  const loader = loaderOf({ "game2.prg": `mwin("plain")\nsleep(1)\nend()\n` });
  const state = bootState(loader, "game2.prg");
  runToEnd(state, gameServices(state, loader));

  deepEqual(engineLines(state), ["plain"]);
  deepEqual(effectsOf(state, "sleep").map((entry) => entry[2]), [[1]]);
});

test("hudRemove puts back the layer the hud covered, and the layers under it keep working", () => {
  const loader = loaderOf({
    "game.prg": `
weatherSet(1)
mwin("one")
hudRemove()
mwin("two")
done = 1
end()
`,
  });
  const state = bootState(loader);
  runToEnd(state, gameServices(state, loader));

  deepEqual(engineLines(state), ["w:rain|a0:one", "w:rain|a1:two"]);
  equal(state.vm.globals.hudshown, 1, "the hud saw the first line only");
  equal(
    state.vm.globals.trace,
    "hud> pace> <pace audio> weather> <weather <audio <hud audio> weather> <weather <audio ",
  );
});

test("an uninstall by kill drops every layer under the name at once: the engine's mwin runs bare", () => {
  const loader = loaderOf({ "game.prg": `mwin("covered")\nkill(mwin)\nmwin("bare")\nend()\n` });
  const state = bootState(loader);
  runToEnd(state, gameServices(state, loader));

  deepEqual(engineLines(state), ["w:clear|a0:covered", "bare"]);
});

// --- Closures with shared cell state --------------------------------------------------------

test("a library's handles share one cell: a change made through one is seen by the others and by the wrapper", () => {
  const state = playFixtureGame();
  const cellsOf = ["weatherset", "weathernow", "weathername"].map((name) => capturesOf(state.vm.globals[name]));
  deepEqual(cellsOf[0], cellsOf[1], "weatherSet and weatherNow capture the same cell");
  deepEqual(cellsOf[0], cellsOf[2]);
  const code = cellsOf[0]![0]!;
  equal(state.vm.cells?.[code], 2, "the cell holds the last weather the game set");

  // The two libraries that count have cells of their own; no library's cell is another's.
  const stems = capturesOf(state.vm.globals.stemnow)[0]!;
  equal(state.vm.cells?.[stems], 2, "audio-stems counted two lines");
  equal(stems !== code, true);
});

test("two installs of one library keep separate cells: each wrapper counts its own lines", () => {
  const loader = loaderOf({
    "game.prg": `
mwin("x")
mwin("y")
end()
`,
    "boot.prg": `
#include "audio-stems.prg"
trace = ""
installStems()
first = stemNow
installStems()
run("game.prg")
`,
  });
  const state = bootState(loader);
  runToEnd(state, gameServices(state, loader));

  const first = capturesOf(state.vm.globals.first)[0]!;
  const second = capturesOf(state.vm.globals.stemnow)[0]!;
  equal(first !== second, true, "each install made its own cell");
  deepEqual(engineLines(state), ["a0:a0:x", "a1:a1:y"], "both layers tagged the line");
  equal(state.vm.cells?.[first], 2, "the covered install counted the two lines the outer one passed down");
  equal(state.vm.cells?.[second], 2);
});

// --- Save and restore in the middle of wrapped calls ------------------------------------------

test("a save taken at every tick, including inside wrapped waits, restores and finishes the same", () => {
  const loader = loaderOf();
  const straight = bootState(loader);
  const straightServices = gameServices(straight, loader);
  const total = runToEnd(straight, straightServices);
  const straightJson = snapshot(straight);

  let parkedInWrapper = 0;
  for (let split = 0; split <= total; split += 1) {
    const state = bootState(loader);
    const live = gameServices(state, loader);
    for (let tick = 0; tick < split; tick += 1) advanceOrFail(state, live);

    const json = snapshot(state);
    const { state: restored, services: restoredServices } = restoreChecked(json, loader);
    equal(canon(restored), json, `split ${split}: the restored state re-serialises to the same bytes`);
    equal(hashState(restored), hashState(state), `split ${split}: same state hash at the save`);

    // Count the splits where the thread is parked inside a wrapper (more than the game's own frame, waiting).
    const thread = state.vm.threads.find((candidate) => candidate.status === "waiting" && candidate.frames.length > 1);
    if (thread !== undefined && thread.wait?.kind === "sleep") parkedInWrapper += 1;

    runToEnd(state, live);
    runToEnd(restored, restoredServices);
    equal(snapshot(restored), snapshot(state), `split ${split}: the restored run ends where the original ends`);
    equal(snapshot(restored), straightJson, `split ${split}: and where the uninterrupted run ends`);
  }
  equal(parkedInWrapper >= 4, true, `the saves landed inside wrapped sleeps (${parkedInWrapper} of them)`);
});

test("a save taken while mwin waits inside three layers keeps the frames, the trace and the cells", () => {
  const loader = loaderOf();
  const state = bootState(loader);
  const live = gameServices(state, loader);
  // boot, then game: tick 0 installs and starts the game; the first mwin parks in hud's sleep.
  for (let tick = 0; tick < 2; tick += 1) advanceOrFail(state, live);
  const thread = state.vm.threads[0]!;
  equal(thread.status, "waiting");
  equal(thread.wait?.kind, "sleep");
  // game frame, hud's lambda, pace's lambda (the sleep wrapper that is waiting).
  equal(thread.frames.length, 3, "the game, the hud wrapper and the pace wrapper");
  equal(state.vm.globals.trace, "hud> pace> ");

  const { state: restored, services: restoredServices } = restoreChecked(snapshot(state), loader);
  equal(restored.vm.threads[0]!.frames.length, 3);
  equal(restored.vm.globals.trace, "hud> pace> ");
  deepEqual(restored.vm.cells, state.vm.cells);
  runToEnd(restored, restoredServices);
  deepEqual(engineLines(restored), ["w:rain|a0:hello", "w:snow|a1:again"]);
});

test("a save restored into a host with the library files missing is refused, not run with a stale handle", () => {
  const loader = loaderOf();
  const state = bootState(loader);
  const live = gameServices(state, loader);
  for (let tick = 0; tick < 2; tick += 1) advanceOrFail(state, live);

  // The wrappers were made by boot.prg (the owner recorded for each definition) and the game never saw the files again.
  const json = snapshot(state);
  const empty: ProgramLoader = { index: createAssetIndex([]), root: PACKAGE_ROOT, read: () => undefined };
  const restored = restoreGameState(json);
  throws(
    () => verifyRestoredHandles(restored.vm, gameServices(restored, empty)),
    (error: unknown) => error instanceof ScriptError && error.code === "program.missing",
  );
});

// --- Determinism --------------------------------------------------------------------------

test("two identical runs of the plugin fixture game end in byte-identical state, tick by tick", () => {
  const loader = loaderOf();
  const left = bootState(loader);
  const right = bootState(loader);
  const leftServices = gameServices(left, loader);
  const rightServices = gameServices(right, loader);

  for (let tick = 0; tick < 12; tick += 1) {
    advanceOrFail(left, leftServices);
    advanceOrFail(right, rightServices);
    equal(hashState(left), hashState(right), `tick ${tick}`);
  }
  equal(finished(left), true);
  equal(snapshot(left), snapshot(right));
  equal(canon(left.vm.effects), canon(right.vm.effects));
});

test("the wrapped run is not the bare run: the same game without the libraries ends in a different state", () => {
  const loader = loaderOf({
    "bare.prg": `weatherSet = (c) => c\nweatherNow = () => 2\ntrace = ""\nmwin("hello")\nmwin("again")\nsleep(1)\nend()\n`,
  });
  const bare = bootState(loader, "bare.prg");
  runToEnd(bare, gameServices(bare, loader));

  deepEqual(engineLines(bare), ["hello", "again"]);
  equal(hashState(bare) !== hashState(playFixtureGame()), true);
});
