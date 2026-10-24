// Pure-RPGCode package fixtures (epic 19, entry 19.14; CAP-5, CAP-11). Four authored packages
// under `fixtures/platform/`, written only in RPGCode, run in the real VM from a seed:
//
//   fighters   an object-model package: dictionary objects with methods, auto-bound receivers,
//              `bindThis`, and a legacy class instance on the same storage (OOP-10, OOP-11).
//   shield     an emitter package: a shield that halves damage on a cancelable emit, a guard that
//              cancels weak hits, a waiting listener, `once`, `off`, queued plain events and a
//              `fallen` event on the game emitter (EMIT-2 to EMIT-6, EMIT-14, EMIT-16 to EMIT-19).
//   weather and storm
//              two namespaced packages where the later overrides the earlier through one
//              environment table, and each keeps its own namespace (PKG-1, PKG-4, PKG-5, MOD-4).
//
// Every fixture is checked for what it does, for a save taken at every tick (G1: the restored
// state re-serialises to the same bytes, has the same hash, and finishes where the straight run
// finishes) and for determinism (G3: the same seed gives the same hash at every tick, and a
// different seed gives a different game). The headless corpus pins one run of each as
// `synthetic-14-object-package`, `synthetic-15-emitter-package` and
// `synthetic-16-namespaced-packages` (`golden/scripts/golden.json`).
import { deepEqual, equal } from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { TextEncoder } from "node:util";
import { fileURLToPath } from "node:url";
import {
  assetKey,
  canon,
  CORE_PLUGIN,
  createAssetIndex,
  createGameState,
  createPluginLayers,
  createScriptServices as coreCreateScriptServices,
  fileProgramRef,
  hashState,
  PACKAGE_ROOT,
  restoreGameState,
  runPackageStartup,
  snapshot,
  startProgram,
  UI_PLUGIN,
  verifyRestoredHandles,
  withOwner,
  type GameState,
  type PluginLayers,
  type ProgramLoader,
  type ScriptServices,
} from "../src/index.ts";
import { advanceOrFail } from "./script-failures.ts";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "platform");

/** One fixture: the game program and the start-up programs of its packages, each owned by its package (PKG-8). */
type Fixture = {
  readonly main: string;
  readonly startups: readonly { readonly file: string; readonly owner: string }[];
};

const FIGHTERS: Fixture = { main: "fighters-game.prg", startups: [] };
const SHIELD: Fixture = { main: "shield-game.prg", startups: [{ file: "shield.prg", owner: "shield" }] };
const NAMESPACES: Fixture = {
  main: "namespaces-game.prg",
  startups: [
    { file: "weather.prg", owner: "weather" },
    { file: "storm.prg", owner: "storm" },
  ],
};

/** The fixture folder as a `Prg/` loader. */
function loaderOf(): ProgramLoader {
  const bytes = new Map<string, Uint8Array>();
  const names = readdirSync(FIXTURES);
  for (const name of names) {
    bytes.set(assetKey(`Prg/${name}`), new TextEncoder().encode(readFileSync(join(FIXTURES, name), "utf8")));
  }
  return {
    index: createAssetIndex(names.map((name) => `Prg/${name}`)),
    root: PACKAGE_ROOT,
    read: (key) => bytes.get(key),
  };
}

/** Script services with the UI pack (for `mwin`), the loader and the session layer table. */
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

/** A new game: the packages start up on the fresh state (PKG-5), then the game program starts. */
function freshGame(fixture: Fixture, seed: number): { state: GameState; services: ScriptServices } {
  const loader = loaderOf();
  const state = createGameState({ seed });
  const services = servicesOf(state, loader, createPluginLayers());
  runPackageStartup(
    state,
    services,
    fixture.startups.map((entry) => withOwner(fileProgramRef(loader, entry.file), entry.owner)),
    [],
  );
  startProgram(state.vm, fileProgramRef(loader, fixture.main));
  return { state, services };
}

/** A restored game: start-up runs on a scratch fresh state to rebuild the layers, then the save loads. */
function restoreGame(fixture: Fixture, json: string, seed: number): { state: GameState; services: ScriptServices } {
  const loader = loaderOf();
  const layers = createPluginLayers();
  const scratch = createGameState({ seed });
  runPackageStartup(
    scratch,
    servicesOf(scratch, loader, layers),
    fixture.startups.map((entry) => withOwner(fileProgramRef(loader, entry.file), entry.owner)),
    [],
  );

  const state = restoreGameState(json);
  const services = servicesOf(state, loader, layers);
  verifyRestoredHandles(state.vm, services);
  return { state, services };
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

function play(fixture: Fixture, seed = 0): GameState {
  const { state, services } = freshGame(fixture, seed);
  runToEnd(state, services);
  return state;
}

/** The handle number of the object a global holds. */
function handleOf(state: GameState, name: string): string {
  const value = state.vm.globals[name];
  if (typeof value === "object" && value !== null && "handle" in value) return String(value.handle);
  throw new Error(`${name} does not hold an object`);
}

function objectOf(state: GameState, name: string) {
  const handle = handleOf(state, name);
  const found = state.vm.objects.find((record) => String(record.handle) === handle);
  if (found === undefined) throw new Error(`${name} names no live object`);
  return found;
}

/** The receiver a callable global carries, or `undefined` when the global is not a callable. */
function receiverOf(state: GameState, name: string): string | null | undefined {
  const value = state.vm.globals[name];
  return typeof value === "object" && value !== null && "receiver" in value ? value.receiver : undefined;
}

/**
 * A save at every tick of a fixture. For each split point: save, restore into fresh services,
 * check the bytes and the hash, finish both, and compare with the uninterrupted run. Returns
 * how many saves fell while a thread waited on a cancelable emit's delivery (`event.dispatch`) and
 * while one waited in a `sleep`.
 */
function saveAtEveryTick(fixture: Fixture, seed = 0): { total: number; inDispatch: number; inSleep: number } {
  const straight = freshGame(fixture, seed);
  const total = runToEnd(straight.state, straight.services);
  const straightJson = snapshot(straight.state);

  let inDispatch = 0;
  let inSleep = 0;
  for (let split = 0; split <= total; split += 1) {
    const live = freshGame(fixture, seed);
    for (let tick = 0; tick < split; tick += 1) advanceOrFail(live.state, live.services);

    const json = snapshot(live.state);
    const restored = restoreGame(fixture, json, seed);
    equal(canon(restored.state), json, `split ${split}: the restored state re-serialises to the same bytes`);
    equal(hashState(restored.state), hashState(live.state), `split ${split}: same state hash at the save`);

    for (const thread of live.state.vm.threads) {
      if (thread.status !== "waiting") continue;
      if (thread.wait?.kind === "event.dispatch") inDispatch += 1;
      if (thread.wait?.kind === "sleep") inSleep += 1;
    }

    runToEnd(live.state, live.services);
    runToEnd(restored.state, restored.services);
    equal(snapshot(restored.state), snapshot(live.state), `split ${split}: the restored run ends where the original ends`);
    equal(snapshot(restored.state), straightJson, `split ${split}: and where the uninterrupted run ends`);
  }
  return { total, inDispatch, inSleep };
}

/** Two runs of one seed hash the same at every tick, and the effect logs agree. */
function assertDeterministic(fixture: Fixture, seed: number): void {
  const left = freshGame(fixture, seed);
  const right = freshGame(fixture, seed);
  equal(hashState(left.state), hashState(right.state), "the same hash before the first tick");
  for (let tick = 0; tick < 24; tick += 1) {
    advanceOrFail(left.state, left.services);
    advanceOrFail(right.state, right.services);
    equal(hashState(left.state), hashState(right.state), `tick ${tick}`);
  }
  equal(finished(left.state), true);
  equal(snapshot(left.state), snapshot(right.state));
  equal(canon(left.state.vm.effects), canon(right.state.vm.effects));
}

const SEEDS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

// --- fighters: the object model ------------------------------------------------------------

test("fighters: every blow runs a method of an object with the receiver it was taken from (OOP-10, OOP-11)", () => {
  const state = play(FIGHTERS);

  // Seed 0: hit = power + random(3) on each call. hero (power 4) hits slime (hp 12) for 5 and, torn off
  // the hero and called bare, for 7, which leaves slime at 0. bindThis(hero.hit, slime) runs the same
  // function with this = slime (power 2), so slime hits the hero for 3: hero 20 - 3 = 17; the
  // Potion(5) then heals the hero to 22.
  equal(state.vm.globals.log, "direct:5;torn-off:7;rebound:3;potion:22;killed:slime;");
  equal(objectOf(state, "hero").members.hp, 22);
  equal(objectOf(state, "slime").members.hp, 0);

  // A fighter stores its method unbound; reading it off the object is what binds the receiver.
  const hero = handleOf(state, "hero");
  const slime = handleOf(state, "slime");
  deepEqual(objectOf(state, "hero").members.hit, objectOf(state, "slime").members.hit, "one function, stored in each fighter");
  const stored = objectOf(state, "hero").members.hit;
  equal(typeof stored === "object" && stored !== null && "receiver" in stored ? stored.receiver : undefined, null);
  equal(receiverOf(state, "strike"), hero, "a method taken out of its object keeps the object");
  equal(receiverOf(state, "bite"), slime, "bindThis made a copy that names the other fighter");
  equal(handleOf(state, "roster[0]"), hero, "an array holds the same object, not a copy");
  equal(handleOf(state, "roster[1]"), slime);
});

test("fighters: a class instance, a dictionary and a killed field are records of one object table", () => {
  const state = play(FIGHTERS);

  const potion = objectOf(state, "potion");
  equal(potion.className, "potion");
  deepEqual(potion.keys, ["heal"]);
  equal(objectOf(state, "hero").className, "", "a dictionary is an object with no class");
  deepEqual(objectOf(state, "hero").keys, ["name", "hp", "power", "hit"]);
  // kill(slime.power) removes the key; the rest keep their order.
  deepEqual(objectOf(state, "slime").keys, ["name", "hp", "hit"]);
  equal(Object.hasOwn(objectOf(state, "slime").members, "power"), false);
  // The potion's heal went through a class method onto a dictionary field.
  equal(state.vm.objects.length, 3);
});

test("fighters: whatever the seed, each blow is its fighter's power plus a roll of one to three", () => {
  for (const seed of SEEDS) {
    const state = play(FIGHTERS, seed);
    const blows = [...String(state.vm.globals.log).matchAll(/(direct|torn-off|rebound):(\d+);/g)].map((m) => Number(m[2]));
    equal(blows.length, 3);
    const [direct, tornOff, rebound] = blows as [number, number, number];
    for (const blow of [direct, tornOff]) equal(blow >= 5 && blow <= 7, true, `seed ${seed}: hero blow ${blow} is 4 + 1..3`);
    equal(rebound >= 3 && rebound <= 5, true, `seed ${seed}: slime blow ${rebound} is 2 + 1..3`);
    equal(objectOf(state, "slime").members.hp, 12 - direct - tornOff, `seed ${seed}`);
    equal(objectOf(state, "hero").members.hp, 20 - rebound + 5, `seed ${seed}`);
  }
});

test("fighters: a save taken at every tick restores and finishes the same (G1)", () => {
  const { total } = saveAtEveryTick(FIGHTERS);
  equal(total >= 5, true, `the game takes several ticks (${total})`);
  saveAtEveryTick(FIGHTERS, 3);
});

test("fighters: one seed is one game at every tick, and another seed is another game (G3)", () => {
  assertDeterministic(FIGHTERS, 0);
  assertDeterministic(FIGHTERS, 5);
  equal(hashState(play(FIGHTERS, 0)) !== hashState(play(FIGHTERS, 1)), true, "the seed reaches the damage rolls");
});

// --- shield: the emitter package -------------------------------------------------------------

/** What the shield game logged for each of its four rounds: the roll, the damage taken, in order. */
function roundsOf(log: string): Array<{ roll: number; taken: number }> {
  return [...log.matchAll(/r(\d):(\d+)>(\d+);/g)].map((m) => ({ roll: Number(m[2]), taken: Number(m[3]) }));
}

test("shield: the shield halves damage, the guard cancels what is left below 4, and the listeners run in the order added (EMIT-4 to EMIT-6)", () => {
  const state = play(SHIELD);
  const log = String(state.vm.globals.log);

  // Seed 0 rolls 6, 10, 6, 6. The shield halves each (3, 5, 3, 3); the guard, added after it, cancels any
  // half below 4, so only the 10 goes through (5). The waiting listener was added last, so it sees the
  // cancel the guard made before it: w1 for a cancelled hit, w0 for the hit that went through.
  equal(
    log,
    "w1r0:6>0;blocked:6;w0r1:10>5;first:5;hurt:5;w1r2:6>0;blocked:6;w1r3:6>0;blocked:6;bare:40;hurt:40;foe:4;",
  );
  deepEqual(roundsOf(log), [
    { roll: 6, taken: 0 },
    { roll: 10, taken: 5 },
    { roll: 6, taken: 0 },
    { roll: 6, taken: 0 },
  ]);
  // 30 - 5 - 40: the shield and the guard were gone for the last hit, which was taken whole and knocked the hero down.
  equal(objectOf(state, "hero").members.hp, -15);
  equal(objectOf(state, "foe").members.hp, 6, "the foe had no shield: 10 - 4");
});

test("shield: a plain emit is queued behind the emitter, `once` runs once, and `off` takes every listener of the type away (EMIT-3, EMIT-4)", () => {
  const log = String(play(SHIELD).vm.globals.log);

  // The emitter carries on: its own round line is logged before the listeners of the event it queued.
  equal(log.indexOf("r1:") < log.indexOf("first:"), true, "first: is delivered after round 1 was logged");
  equal([...log.matchAll(/first:/g)].length, 1, "once ran for the first damage only");
  equal([...log.matchAll(/hurt:/g)].length, 2, "the permanent listener ran for the round-1 hit and for the bare hit");
  // After hero.off("beforeDamage") no shield, guard or waiting listener is left: the bare hit is whole and no w token follows.
  equal(log.includes("bare:40;"), true);
  equal(log.slice(log.indexOf("bare:")).includes("w"), false);
});

test("shield: a fall is sent on the game emitter and the package's game listener hears it (EMIT-19)", () => {
  const state = play(SHIELD);
  equal(state.vm.globals.fallen, 1, "the hero fell once; the foe did not");
  equal(state.vm.globals.lastfallen, "hero");
  // The game emitter is registered in the saved events section, where the package's listener is plain data.
  equal(state.events?.emitters !== undefined && Object.hasOwn(state.events.emitters, "game"), true);
});

test("shield: for any seed a hit is halved, and a halved hit under 4 is blocked and never reaches hp", () => {
  for (const seed of SEEDS) {
    const state = play(SHIELD, seed);
    const log = String(state.vm.globals.log);
    const rounds = roundsOf(log);
    equal(rounds.length, 4, `seed ${seed}`);
    let taken = 0;
    for (const round of rounds) {
      const half = round.roll / 2;
      equal([6, 8, 10].includes(round.roll), true, `seed ${seed}: roll ${round.roll} is 2 * (2 + 1..3)`);
      equal(round.taken, half < 4 ? 0 : half, `seed ${seed}: roll ${round.roll} gives ${round.taken}`);
      taken += round.taken;
    }
    equal([...log.matchAll(/blocked:/g)].length, rounds.filter((round) => round.taken === 0).length, `seed ${seed}: one blocked event per cancel`);
    equal(objectOf(state, "hero").members.hp, 30 - taken - 40, `seed ${seed}`);
    equal(state.vm.globals.fallen, 1, `seed ${seed}`);
  }
});

test("shield: a save taken at every tick, inside a delivery too, restores and finishes the same (G1, EMIT-10)", () => {
  const { total, inDispatch, inSleep } = saveAtEveryTick(SHIELD);
  equal(total >= 10, true, `the game takes ten or more ticks (${total})`);
  equal(inDispatch >= 3, true, `saves fell while hurt waited for a delivery (${inDispatch})`);
  equal(inSleep >= 1, true, `a save fell inside a sleep (${inSleep})`);
  saveAtEveryTick(SHIELD, 3);
});

test("shield: one seed is one game at every tick, and another seed is another game (G3)", () => {
  assertDeterministic(SHIELD, 0);
  assertDeterministic(SHIELD, 4);
  equal(hashState(play(SHIELD, 0)) !== hashState(play(SHIELD, 1)), true, "the seed reaches the damage rolls");
});

// --- weather and storm: namespaces and an override ----------------------------------------------

test("namespaces: the later package wins the plain call and hands on; a qualified call reaches that package's own command (PKG-1, PKG-4)", () => {
  const state = play(NAMESPACES);

  // Seed 0: weather's rain is mm + random(3). rain(2) is storm's (later wins): storm doubles it to 4, hands it
  // on to weather's, and adds "+storm". weather.rain(2) is weather's own and storm.rain(2) is storm's own, both
  // whatever the plain name does. After stormOff the plain name is weather's again.
  equal(state.vm.globals.log, "weather:5+storm;weather:5;weather:5+storm;weather:3;");
  // The namespaces are dictionary objects named after the package, so a call on them is a call on a live object.
  equal(objectOf(state, "weather").members.name, "weather");
  equal(objectOf(state, "storm").members.name, "storm");
  equal(receiverOf(state, "rain"), handleOf(state, "weather"), "after stormOff the plain rain is weather's method again");
});

test("namespaces: the later package's mwin layer runs first, reaches the earlier through next, and stormOff removes it alone (PKG-1, PKG-5, MOD-4)", () => {
  const state = play(NAMESPACES);

  // First line: storm tags it, weather tags the tagged text, the engine shows it. After stormOff only weather's layer is left.
  deepEqual(
    state.vm.effects.filter((effect) => effect.name === "mwin").map((effect) => effect.args[0]),
    ["weather|storm|one", "weather|two"],
  );
  equal(state.vm.globals.trace, "storm> weather> <weather <storm weather> <weather ");
});

test("namespaces: each package's steps are counted under its own name, and a restore keeps the counts (PKG-8)", () => {
  const state = play(NAMESPACES);
  const counters = state.vm.stepCounters;
  equal(counters !== undefined, true);
  equal((counters?.weather ?? 0) > 0, true, "weather's start-up and its callables ran steps");
  equal((counters?.storm ?? 0) > 0, true, "storm's start-up and its callables ran steps");
  deepEqual(Object.keys(counters ?? {}).sort(), ["storm", "weather"]);

  // The game program is owned by no package, so it adds nothing to either count; a restore carries them over.
  const { state: halfway, services } = freshGame(NAMESPACES, 0);
  for (let tick = 0; tick < 2; tick += 1) advanceOrFail(halfway, services);
  const restored = restoreGame(NAMESPACES, snapshot(halfway), 0);
  deepEqual(restored.state.vm.stepCounters, halfway.vm.stepCounters);
  runToEnd(restored.state, restored.services);
  deepEqual(restored.state.vm.stepCounters, counters);
});

test("namespaces: for any seed the plain call is storm's doubled and the qualified calls are each package's own", () => {
  for (const seed of SEEDS) {
    const answers = String(play(NAMESPACES, seed).vm.globals.log).split(";");
    const [plain, weatherOwn, stormOwn, afterOff] = answers as [string, string, string, string];
    const gust = (text: string, base: number): number => Number(/^weather:(\d+)/.exec(text)?.[1]) - base;
    equal(plain.endsWith("+storm") && stormOwn.endsWith("+storm"), true, `seed ${seed}: storm answers the plain call and its own`);
    equal(weatherOwn.includes("+"), false, `seed ${seed}: weather.rain does not pass through storm`);
    equal(afterOff.includes("+"), false, `seed ${seed}: after stormOff the plain call is weather's`);
    for (const [text, base] of [[plain, 4], [weatherOwn, 2], [stormOwn, 4], [afterOff, 2]] as const) {
      equal(gust(text, base) >= 1 && gust(text, base) <= 3, true, `seed ${seed}: "${text}" is ${base} plus a gust of 1..3`);
    }
  }
});

test("namespaces: a save taken at every tick, inside storm's waiting layer too, restores and finishes the same (G1, MOD-4)", () => {
  const { total, inSleep } = saveAtEveryTick(NAMESPACES);
  equal(total >= 3, true, `the game takes several ticks (${total})`);
  equal(inSleep >= 3, true, `saves fell while a thread slept, inside the layer or the game (${inSleep})`);
  saveAtEveryTick(NAMESPACES, 3);
});

test("namespaces: one seed is one game at every tick, and another seed is another game (G3)", () => {
  assertDeterministic(NAMESPACES, 0);
  assertDeterministic(NAMESPACES, 6);
  equal(hashState(play(NAMESPACES, 0)) !== hashState(play(NAMESPACES, 1)), true, "the seed reaches the gusts");
});
