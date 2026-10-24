// Package command layers through registerPlugin (MOD-4, PKG-5; entry 19.8;
// docs/spec/engine/rpgcode-modules-and-objects.md#registerplugin-layers-entry-198;
// ADR 0004 decision 8).
//
// Three authored package start-up programs under `fixtures/packages/` (chime,
// shout, lag) register command interceptors that wrap mwin and sleep. The layers
// are held outside saved state in the running game's layer table, reached
// through the one environment table without a second dispatch mechanism,
// rebuilt at every start-up (runPackageStartup) on a fresh state, and removed by
// the registration's remove callable.
import { deepEqual, equal, throws } from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { TextEncoder } from "node:util";
import { fileURLToPath } from "node:url";
import {
  advanceScriptTick,
  assetKey,
  createAssetIndex,
  createGameState,
  createPluginLayers,
  createScriptServices as coreCreateScriptServices,
  fileProgramRef,
  hashState,
  PACKAGE_ROOT,
  restoreGameState,
  resolveCall,
  runPackageStartup,
  ScriptError,
  snapshot,
  startProgram,
  UI_PLUGIN,
  verifyRestoredHandles,
  CORE_PLUGIN,
  type GameState,
  type PluginDefinition,
  type PluginLayers,
  type ProgramLoader,
  type ResolvedPlugin,
  type ScriptServices,
} from "../src/index.ts";
import { addRegistration } from "../src/script/layers.ts";
import { advanceOrFail } from "./script-failures.ts";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "packages");

/** The fixture folder as a `Prg/` loader, with `extra` files added. */
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
    read: (key: string) => bytes.get(key),
  };
}

/** Script services with the UI plugin (for `mwin`), the loader, and the session layer table. */
function servicesOf(state: GameState, loader: ProgramLoader, layers: PluginLayers): ScriptServices {
  return coreCreateScriptServices(
    state,
    [{ definition: CORE_PLUGIN }, { definition: UI_PLUGIN }],
    undefined,
    undefined,
    loader,
    "default",
    undefined,
    undefined,
    layers,
  );
}

/**
 * Build a fresh game: create `state`, create `layers`, run `startups` in order
 * on `state` through `runPackageStartup`, and then start `main` as thread 1.
 */
function freshGame(
  loader: ProgramLoader,
  startups: readonly string[],
  main = "game.prg",
  seed = 0,
): { state: GameState; services: ScriptServices; layers: PluginLayers } {
  const state = createGameState({ seed });
  const layers = createPluginLayers();
  const services = servicesOf(state, loader, layers);
  runPackageStartup(state, services, startups.map((name) => fileProgramRef(loader, name)), []);
  startProgram(state.vm, fileProgramRef(loader, main));
  return { state, services, layers };
}

/**
 * Rebuild a host after restore: start-up runs on a scratch fresh state to
 * rebuild the identical layer table, then loads `json` and checks the handles.
 */
function restoreGame(
  json: string,
  loader: ProgramLoader,
  startups: readonly string[],
  seed = 0,
): { state: GameState; services: ScriptServices; layers: PluginLayers } {
  const scratch = createGameState({ seed });
  const layers = createPluginLayers();
  const scratchServices = servicesOf(scratch, loader, layers);
  runPackageStartup(scratch, scratchServices, startups.map((name) => fileProgramRef(loader, name)), []);

  const state = restoreGameState(json);
  const services = servicesOf(state, loader, layers);
  verifyRestoredHandles(state.vm, services);
  return { state, services, layers };
}

function finished(state: GameState): boolean {
  return state.vm.threads.every((thread) => thread.status === "finished");
}

function runToEnd(state: GameState, services: ScriptServices, limit = 60): number {
  let ticks = 0;
  while (!finished(state) && ticks < limit) {
    advanceOrFail(state, services);
    ticks += 1;
  }
  equal(finished(state), true, "the program finished within the tick limit");
  return ticks;
}

function engineLines(state: GameState): unknown[] {
  return state.vm.effects
    .filter((effect) => effect.name === "mwin")
    .map((effect) => effect.args[0]);
}

function sleepTicks(state: GameState): unknown[] {
  return state.vm.effects
    .filter((effect) => effect.name === "sleep")
    .map((effect) => effect.args[0]);
}

// --- Acceptance 1: onion order, `next`, waits, save/restore, removal -------------------------

test("a package registers a wrapper for one command: next reaches the engine", () => {
  const loader = loaderOf();
  const { state, services } = freshGame(loader, ["chime.prg"]);
  runToEnd(state, services);

  deepEqual(engineLines(state), ["chime:hello", "chime:again"]);
  equal(state.vm.globals.trace, "chime> <chime chime> <chime ");
  equal(state.vm.globals.done, 1);
});

test("three registered layers run in ruled order and next reaches the layer below then the engine", () => {
  const loader = loaderOf();
  // chime installed first (innermost), then shout, then lag (outermost).
  const { state, services } = freshGame(loader, ["chime.prg", "shout.prg", "lag.prg"]);
  runToEnd(state, services);

  // lag sees the line first, then shout uppercases it, then chime prefixes it, then the engine.
  deepEqual(engineLines(state), ["chime:HELLO", "chime:AGAIN"]);
  equal(
    state.vm.globals.trace,
    "lag> slow> <slow shout> chime> <chime <shout <lag " +
      "slow> <slow " +
      "lag> slow> <slow shout> chime> <chime <shout <lag ",
  );
  // shout doubled every sleep: lag's sleep(1) becomes sleep(2), the game's sleep(1) becomes sleep(2).
  deepEqual(sleepTicks(state), [2, 2, 2]);
});

test("a layer that waits parks and saves/restores cleanly; the restored run finishes with the same state hash", () => {
  const loader = loaderOf();
  const startups = ["chime.prg", "shout.prg", "lag.prg"];
  const { state: straight, services: straightServices } = freshGame(loader, startups);
  const total = runToEnd(straight, straightServices);
  const straightHash = hashState(straight);

  // Split at every tick: lag's sleep(1) doubles to 2 ticks, so ticks 0..5 park inside the layers.
  let parkedInLayer = 0;
  for (let split = 0; split <= total; split += 1) {
    const { state, services } = freshGame(loader, startups);
    for (let tick = 0; tick < split; tick += 1) advanceOrFail(state, services);

    const json = snapshot(state);
    const { state: restored, services: restoredServices } = restoreGame(json, loader, startups);
    equal(hashState(restored), hashState(state), `split ${split}: state hash matches right after restore`);

    const waitingInLayer = state.vm.threads.some(
      (thread) => thread.status === "waiting" && thread.frames.length > 1,
    );
    if (waitingInLayer) parkedInLayer += 1;

    runToEnd(state, services);
    runToEnd(restored, restoredServices);
    equal(hashState(restored), hashState(state), `split ${split}: restored finishes where straight finishes`);
    equal(hashState(restored), straightHash, `split ${split}: and where the uninterrupted run finishes`);
  }
  equal(parkedInLayer >= 4, true, `saves landed inside wrapped layers (${parkedInLayer} times)`);
});

test("removing a package removes only its layers; the layers below and above it keep working", () => {
  const loader = loaderOf({
    "game.prg": `
trace = ""
mwin("one")
shoutHandle.remove()
mwin("two")
done = 1
end()
`,
  });
  const startups = ["chime.prg", "shout.prg", "lag.prg"];
  const { state, services } = freshGame(loader, startups);
  runToEnd(state, services);

  // First line: lag -> shout (HELLO) -> chime (chime:HELLO) -> engine.
  // shout removed: lag and chime stay. Second line: lag -> chime (chime:two, not CHIME:TWO) -> engine.
  deepEqual(engineLines(state), ["chime:ONE", "chime:two"]);
  equal(
    state.vm.globals.trace,
    "lag> slow> <slow shout> chime> <chime <shout <lag " +
      "lag> chime> <chime <lag ",
  );
  // Before removal, sleep was doubled (2 ticks). After removal of shout, the layer below lag's sleep is the engine bare sleep (1 tick).
  deepEqual(sleepTicks(state), [2, 1]);
});

test("calling remove a second time returns 0 and does not error", () => {
  const loader = loaderOf({
    "game.prg": `
r1 = shoutHandle.remove()
r2 = shoutHandle.remove()
end()
`,
  });
  const { state, services } = freshGame(loader, ["shout.prg"]);
  runToEnd(state, services);

  equal(state.vm.globals.r1, 1, "the first remove removed the layers");
  equal(state.vm.globals.r2, 0, "the second remove saw none left");
});

test("no new resolution tier exists in resolveCall: resolveCall resolves through the 4 ruled tiers only", () => {
  const loader = loaderOf();
  const { state, services } = freshGame(loader, ["chime.prg", "shout.prg", "lag.prg"]);

  // Without passing `held`, resolveCall resolves through tiers 2..4 only (built-in, script function, extension).
  const program = services.programs.get(fileProgramRef(loader, "game.prg"));
  // mwin is an extension command (from the UI pack): resolveCall finds it through the extension tier.
  const extensionOnly = services.commands.extension("mwin");
  equal(extensionOnly !== undefined, true);
  // resolveCall with no held callable sees the extension/built-in, not the package layer:
  // resolveCall itself is unchanged and has no layer tier.
  const resolved = resolveCall("mwin", 1, program, services.commands);
  equal(resolved?.kind, "command");
});

// --- Errors and edge cases ------------------------------------------------------------------

test("registerPlugin fails cleanly when a command value is not a callable", () => {
  const loader = loaderOf({
    "bad.prg": `
registerPlugin({
  name: "bad",
  commands: { mwin: 42 }
})
end()
`,
  });
  const state = createGameState({ seed: 0 });
  const layers = createPluginLayers();
  const services = servicesOf(state, loader, layers);
  startProgram(state.vm, fileProgramRef(loader, "bad.prg"));
  throws(
    () => advanceOrFail(state, services),
    (error: unknown) => error instanceof ScriptError && error.code === "callable.not-callable",
  );
  equal(layers.layers.size, 0, "nothing was registered");
});

test("registerPlugin fails cleanly when the definition is not a dictionary", () => {
  const loader = loaderOf({
    "bad.prg": `registerPlugin("not-a-dict")\nend()\n`,
  });
  const state = createGameState({ seed: 0 });
  const layers = createPluginLayers();
  const services = servicesOf(state, loader, layers);
  startProgram(state.vm, fileProgramRef(loader, "bad.prg"));
  throws(
    () => advanceOrFail(state, services),
    (error: unknown) => error instanceof ScriptError && error.code === "object.invalid",
  );
});

test("registerPlugin fails cleanly when wrapping a command that does not exist", () => {
  const loader = loaderOf({
    "bad.prg": `
registerPlugin({
  name: "bad",
  commands: { nonexistentCommandXYZ: (next) => next() }
})
end()
`,
  });
  const state = createGameState({ seed: 0 });
  const layers = createPluginLayers();
  const services = servicesOf(state, loader, layers);
  startProgram(state.vm, fileProgramRef(loader, "bad.prg"));
  throws(
    () => advanceOrFail(state, services),
    (error: unknown) => error instanceof ScriptError && error.code === "unknown.command",
  );
});

test("an interceptor with wrong arity fails with callable.arity naming the command", () => {
  const loader = loaderOf({
    "bad-arity.prg": `
registerPlugin({
  name: "bad-arity",
  commands: {
    // mwin takes 1 argument; with next it needs 2. A 3-param lambda fails on mwin("hello").
    mwin: (a, b, next) => next(a)
  }
})
`,
  });
  const { state, services } = freshGame(loader, ["bad-arity.prg"]);
  throws(
    () => advanceOrFail(state, services),
    (error: unknown) =>
      error instanceof ScriptError &&
      error.code === "callable.arity" &&
      error.message.includes("mwin"),
  );
});

test("calling a layer handle when the layer was not rebuilt on restore fails with callable.unknown-def", () => {
  const loader = loaderOf({
    "game.prg": `h = bindingOf("mwin")\nend()\n`,
    "game2.prg": `h("hi")\nend()\n`,
  });
  // Start-up registers chime, then game.prg captures bindingOf("mwin") into global h.
  const { state, services } = freshGame(loader, ["chime.prg"], "game.prg");
  runToEnd(state, services);
  const json = snapshot(state);

  // Restore into a host whose start-up was NOT run: the layer table is empty.
  const restored = restoreGameState(json);
  const emptyLayers = createPluginLayers();
  const servicesWithoutStartup = servicesOf(restored, loader, emptyLayers);
  verifyRestoredHandles(restored.vm, servicesWithoutStartup);

  // Start game2.prg which calls the saved layer handle h:
  startProgram(restored.vm, fileProgramRef(loader, "game2.prg"));
  throws(
    () => runToEnd(restored, servicesWithoutStartup),
    (error: unknown) =>
      error instanceof ScriptError &&
      error.code === "callable.unknown-def" &&
      error.message.includes("package layers are rebuilt by package start-up"),
  );
});

test("package start-up that waits is refused with package.startup-unfinished", () => {
  const loader = loaderOf({
    "waiter.prg": `sleep(1)\nend()\n`,
  });
  const state = createGameState({ seed: 0 });
  const services = servicesOf(state, loader, createPluginLayers());
  throws(
    () => runPackageStartup(state, services, [fileProgramRef(loader, "waiter.prg")], []),
    (error: unknown) =>
      error instanceof ScriptError &&
      error.code === "package.startup-unfinished" &&
      error.pos !== null &&
      error.pos !== undefined &&
      error.pos.file !== "" &&
      error.message.includes("waits"),
  );
});

test("package startup delay and positive threadSleep report unfinished without clock access", () => {
  for (const [name, source] of [["delay.prg", "delay(1)\nend()\n"], ["threadsleep.prg", "threadsleep(getthreadid(), 1)\nend()\n"]] as const) {
    const loader = loaderOf({ [name]: source });
    const state = createGameState({ seed: 0 });
    const services = servicesOf(state, loader, createPluginLayers());
    throws(
      () => runPackageStartup(state, services, [fileProgramRef(loader, name)], []),
      (error: unknown) => error instanceof ScriptError && error.code === "package.startup-unfinished",
    );
  }
});
test("package startup helper rejects randomness directly", () => {
  const loader = loaderOf({ "random.prg": `random(3)\nend()\n` });
  const state = createGameState({ seed: 0 });
  const services = servicesOf(state, loader, createPluginLayers());
  throws(
    () => runPackageStartup(state, services, [fileProgramRef(loader, "random.prg")], []),
    (error: unknown) => error instanceof ScriptError && error.code === "package.startup-forbidden",
  );
});
test("package startup helper rejects native clock access directly", () => {
  const state = createGameState({ seed: 0 });
  const definition: PluginDefinition = {
    id: "clock-package",
    version: "1.0.0",
    commands: [{
      name: "readclock",
      aliases: [],
      params: [],
      call: (view) => {
        const state = view.state;
        if (state === undefined) return { value: null };
        try { Object.defineProperty(state, "rng", { value: { nextUint32: () => 1 } }); } catch { /* guarded state */ }
        try { delete (state as Record<string, unknown>).time; } catch { /* guarded state */ }
        try { Object.getOwnPropertyDescriptor(state, "time"); } catch { /* guarded state */ }
        state.rng;
        return { value: null };
      },
    }],
  };
  const services = coreCreateScriptServices(state, [{ definition: CORE_PLUGIN }, { definition }]);
  const plugin: ResolvedPlugin = { definition, startup: { kind: "inline", text: "readclock()\nend()\n", compiler: "2", dialect: "tk3" } };
  throws(
    () => runPackageStartup(state, services, [plugin.startup!], [plugin]),
    (error: unknown) => error instanceof ScriptError && error.code === "package.startup-forbidden",
  );
});


test("failed package startup removes package listeners, layers and behaviours but preserves prior listeners", () => {
  const loader = loaderOf({
    "rollback.prg": `h = registerPlugin({ name: "temporary", commands: { random: (value, next) => next(value) } })\ngame.on("startup", (event) => { observed = 1 })\nthread("threadsleep(getthreadid(), 0)", 1)\nforbiddenrng()\nend()\n`,
  });
  const state = createGameState({ seed: 0 });
  const prior: PluginDefinition = {
    id: "prior",
    version: "1.0.0",
    commands: [{ name: "priorlistener", aliases: [], params: [], call: () => ({ value: null }) }],
    listeners: [{ emitter: "game", type: "prior", command: "priorlistener" }],
  };
  const packageDefinition: PluginDefinition = {
    id: "rollback-package",
    version: "1.0.0",
  commands: [
      { name: "packagelistener", aliases: [], params: [], call: () => ({ value: null }) },
      { name: "forbiddenrng", aliases: [], params: [], call: (view) => { view.rng.nextUint32(); return { value: null }; } },
    ],
    listeners: [{ emitter: "game", type: "package", command: "packagelistener" }],
    behaviourStartup(register) {
      register("rollback-package.actor", { statsChanged: () => ({ dp: 1 }) });
    },
  };
  coreCreateScriptServices(state, [{ definition: CORE_PLUGIN }, { definition: prior }], undefined, undefined, loader);
  const services = coreCreateScriptServices(state, [{ definition: CORE_PLUGIN }, { definition: packageDefinition }], undefined, undefined, loader, "default", undefined, undefined, createPluginLayers());
  const listenersBeforeStartup = services.listenersBeforePackageStartup;
  const baselineRegistration = addRegistration(services.layers, "preexisting", [{
    command: "random",
    interceptor: { type: "callable", def: "prior-interceptor", captures: [], receiver: null },
    engine: { type: "callable", def: "prior-engine", captures: [], receiver: null },
  }]);
  equal(services.behaviours.registerForNamespace("rollback-package", "rollback-package.prior", { statsChanged: () => ({ dp: 2 }) }), true);
  const plugin: ResolvedPlugin = { definition: packageDefinition, startup: fileProgramRef(loader, "rollback.prg") };
  throws(
    () => runPackageStartup(state, services, [plugin.startup!], [plugin]),
    (error: unknown) => error instanceof ScriptError && error.code === "package.startup-forbidden",
  );
  equal(state.vm.threads.some((thread) => thread.status !== "finished"), false);
  deepEqual(state.events.listeners.map((listener) => listener.id), listenersBeforeStartup.map((listener) => listener.id));
  equal(services.layers.layers.has(baselineRegistration.layers[0]!), true);
  equal(services.layers.registrations.has(baselineRegistration.id), true);
  deepEqual(services.behaviours.definitions().map((definition) => definition.name), ["rollback-package.prior"]);
  equal(state.events.listeners.some((listener) => listener.id !== listenersBeforeStartup.find((before) => before.id === listener.id)?.id), false);
});
