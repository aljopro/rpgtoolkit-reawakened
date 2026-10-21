// The stock RPG actor bridge (ticket 20.15; docs/spec/engine/actors.md, EMIT-13, EMIT-21).
//
// `stock_rpg` declares one native listener on the pattern `actor:*` for `fallen`. Every actor
// emitter therefore reaches the one command `bridgefallen`, which re-emits the transition on the
// game emitter as `stock-rpg.fallen`, carrying the actor id, the ruled cause and the source. Core
// delivery on `actor:<id>` is untouched, so an actor's own listeners still see exactly one event
// per transition and nothing else's.
import { test } from "node:test";
import { deepEqual, equal, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  addActor,
  assetKey,
  COMPILER_VERSION,
  createAssetIndex,
  createEmptyBoard,
  createEngine,
  ENGINE_DEFAULT_MANIFEST,
  hashGameState,
  PACKAGE_ROOT,
  restoreGameState,
  snapshot,
  writeBoard,
} from "../src/index.ts";
import { resolveManifestPlugins } from "../src/engine/boot.ts";
import { readEvent, emitEffect } from "../src/events/native.ts";
import { createCollectingSink, createGameState, createLogger } from "../src/index.ts";
import { createScriptServices } from "./script-test-services.ts";
import type { Diagnostic, GameState, PackageCatalogueEntry, PluginDefinition, ResolvedPlugin } from "../src/index.ts";

const testDir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PLUGINS: readonly ResolvedPlugin[] = resolveManifestPlugins(ENGINE_DEFAULT_MANIFEST).plugins;

function fixture(name: string): string {
  return readFileSync(join(testDir, "fixtures", "authored", "stock-rpg", name), "utf8");
}

/** `stock_rpg` as the host installs it: native definition, identity from the package's manifest. */
function stockRpg(): PluginDefinition {
  return {
    id: "stock_rpg",
    version: "1.0.0",
    commands: [
      {
        name: "stockrpgstarted",
        aliases: [],
        params: [],
        call: (view) => {
          if (view.state !== undefined) view.state.vm.globals.stockrpgstarted = 1;
          return { value: null };
        },
      },
      {
        name: "bridgefallen",
        aliases: [],
        params: [{ name: "event", optional: false, byRef: false, variadic: false }],
        call: (view, args) => {
          if (view.state === undefined) return { value: 0 };
          const event = readEvent(view.state, args[0]?.value);
          if (event === undefined) return { value: 0 };
          const actor = Number(event.emitter.slice("actor:".length));
          const cause = event.detail.cause;
          const source = event.detail.source;
          return {
            value: 1,
            effects: [emitEffect("game", "stock-rpg.fallen", {
              actor: Number.isSafeInteger(actor) && actor > 0 ? actor : 0,
              cause: typeof cause === "string" ? cause : "",
              source: typeof source === "number" ? source : 0,
            })],
          };
        },
      },
    ],
    listeners: [{ emitter: "actor:*", type: "fallen", command: "bridgefallen" }],
  };
}

/** A test package whose listener names one concrete actor key, to prove actor isolation. */
function oneActorListener(): PluginDefinition {
  return {
    id: "bridge-one-actor",
    version: "1.0.0",
    commands: [{
      name: "noteactorone",
      aliases: [],
      params: [{ name: "event", optional: false, byRef: false, variadic: false }],
      call: (view) => {
        if (view.state !== undefined) view.state.vm.globals.noteactorone = Number(view.state.vm.globals.noteactorone ?? 0) + 1;
        return { value: null };
      },
    }],
    listeners: [{ emitter: "actor:1", type: "fallen", command: "noteactorone" }],
  };
}

/** A host package that hurts an actor through the owner, so a transition comes from a real operation. */
function hurtPackage(): PluginDefinition {
  return {
    id: "bridge-probe",
    version: "1.0.0",
    commands: [{
      name: "hurt",
      aliases: [],
      params: [
        { name: "id", optional: false, byRef: false, variadic: false },
        { name: "amount", optional: false, byRef: false, variadic: false },
      ],
      call: (view, args) => {
        const actors = view.actors;
        if (actors === undefined) return { value: 0 };
        const id = Number(args[0]?.value ?? 0);
        const before = actors.readActor(id);
        if (before === null) return { value: 0 };
        actors.updateStats(id, { hp: before.stats.hp - Number(args[1]?.value ?? 0) }, { cause: "damage" });
        return { value: before.stats.hp };
      },
    }],
  };
}

/** The package catalogue entry of `stock_rpg`, loaded through the 19.17 startup path. */
function catalogue(): readonly PackageCatalogueEntry[] {
  return [{
    name: "stock_rpg",
    version: "1.0.0",
    namespace: "stock_rpg",
    requests: [],
    definition: stockRpg(),
    startup: { kind: "inline", text: fixture("startup.prg"), compiler: COMPILER_VERSION, dialect: "tk3" },
  }];
}

type BridgeRun = {
  readonly state: GameState;
  readonly diagnostics: readonly Diagnostic[];
  readonly snapshots: readonly string[];
  readonly hashes: readonly string[];
};

const BOARD = (() => {
  const encoded = writeBoard(createEmptyBoard());
  if (!encoded.ok) throw new Error(encoded.error.message);
  return encoded.value;
})();

const SCRIPT = [
  "spawn(10)",
  "spawn(10)",
  "log = \"\"",
  "game.on(\"stock-rpg.fallen\", (e) => { log = log + e.detail.actor + \":\" + e.detail.cause + \"|\" })",
  "hurt(1, 10)",
  "hurt(1, 10)",
  "hurt(2, 4)",
  "hurt(2, 6)",
  "sleep(4)",
  "ended = 1",
  "end()",
].join("\n");

function runBridge(): BridgeRun {
  const hashes: string[] = [];
  const snapshots: string[] = [];
  const diagnostics: Diagnostic[] = [];
  const capture: { state: GameState | null } = { state: null };
  let recorded = -1;
  const spawn: PluginDefinition = {
    id: "bridge-spawn",
    version: "1.0.0",
    commands: [{
      name: "spawn",
      aliases: [],
      params: [{ name: "hp", optional: false, byRef: false, variadic: false }],
      call: (view, args) => {
        if (view.state === undefined) return { value: 0 };
        const hp = Number(args[0]?.value ?? 0);
        const actor = addActor(view.state.actors, {
          kind: "party",
          source: "hero.tem",
          stats: { experience: 0, hp, maxHp: hp, dp: 0, fp: 0, smp: 0, maxSmp: 0, level: 1, criticalOn: 0, criticalBy: 0 },
        });
        return { value: actor.id };
      },
    }],
  };
  const engine = createEngine({
    seed: 3,
    assetIndex: createAssetIndex([assetKey("boards/test.brd")]),
    assetRoot: PACKAGE_ROOT,
    initialBoard: "test.brd",
    width: 32,
    height: 32,
    maxTicks: 600,
    program: SCRIPT,
    plugins: [...DEFAULT_PLUGINS, { definition: oneActorListener() }, { definition: hurtPackage() }, { definition: spawn }, { namespace: "stock_rpg", definition: stockRpg(), startup: catalogue()[0]!.startup! }],
    packageCatalogue: catalogue(),
    phaseRegistrations: [{
      phase: "audio",
      run: (state) => {
        capture.state = state;
        if (state.time.tick === recorded) return;
        recorded = state.time.tick;
        snapshots.push(snapshot(state));
        hashes.push(hashGameState(state));
      },
    }],
  });
  let report = engine.advance(0, []);
  diagnostics.push(...report.diagnostics);
  for (let guard = 0; guard < 400; guard += 1) {
    const replies = report.requests.flatMap((request) => request.kind === "asset"
      ? [{ tick: report.tickAfter, event: { kind: "asset" as const, reqId: request.reqId, bytes: request.key === assetKey("boards/test.brd") ? BOARD : null } }]
      : []);
    report = engine.advance(report.loading ? 0 : 1, replies);
    diagnostics.push(...report.diagnostics);
    if (report.loading) continue;
    if (capture.state !== null && Number(capture.state.vm.globals.ended ?? 0) === 1) break;
  }
  if (capture.state === null) throw new Error("the bridge script never ran");
  ok(Number(capture.state.vm.globals.ended ?? 0) === 1, "the bridge script must reach end()");
  return { state: capture.state, diagnostics, snapshots, hashes };
}

test("every actor fallen transition is one stock-rpg.fallen event on the game", () => {
  const run = runBridge();
  equal(run.diagnostics.filter((diagnostic) => diagnostic.code.startsWith("plugin.listener")).length, 0);
  equal(run.state.vm.globals.stockrpgstarted, 1, "the package start-up ran through the catalogue");
  // Two HP-zero writes on the first actor: the transition happens once, so one re-emit; the
  // second actor falls on its second hit. Actor isolation holds and no duplicate is delivered.
  equal(run.state.vm.globals.log, "1:damage|2:damage|");
  equal(String(run.state.vm.globals.log).split("|").length - 1, 2, "one game event per transition");
  equal(run.state.vm.globals.noteactorone, 1, "a listener on actor:1 hears only that actor's transition");
  deepEqual(run.state.actors.actors.map((actor) => actor.stats.hp), [0, 0]);
});

test("a restored save delivers the same bridge events and hashes the same", () => {
  const run = runBridge();
  ok(run.snapshots.length > 2, "the bridge must span several ticks");
  run.snapshots.forEach((json, index) => {
    equal(hashGameState(restoreGameState(json)), run.hashes[index], `tick ${index} restores to its own hash`);
  });
  const again = runBridge();
  deepEqual([...again.hashes], [...run.hashes]);
  equal(again.state.vm.globals.log, run.state.vm.globals.log);
});

test("a malformed listener pattern is a located warning and registers nothing", () => {
  const state = createGameState({ seed: 0 });
  const { sink, records } = createCollectingSink();
  const definition: PluginDefinition = {
    id: "broken-bridge",
    version: "1.0.0",
    commands: [{ name: "nop", aliases: [], params: [], call: () => ({ value: null }) }],
    listeners: [{ emitter: "actor:*:x", type: "fallen", command: "nop" }],
  };
  createScriptServices(state, [{ definition }], createLogger([sink]));
  equal(state.events.listeners.length, 0, "a malformed pattern registers nothing");
  deepEqual(records.filter((record) => record.code.startsWith("plugin.listener")).map((record) => record.code), ["plugin.listener-bad-emitter"]);
});
