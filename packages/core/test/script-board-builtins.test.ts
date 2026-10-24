import { deepEqual, equal, throws } from "node:assert/strict";
import { test } from "node:test";
import { assetKey, createActorService, createGameState, createScriptServices, createDefaultVirtuals, ScriptError, type Arg, type GameState, type WorldBoard } from "../src/index.ts";
import { applyWorldEffect } from "../src/world/effects.ts";
import { WORLD_PLUGIN } from "../src/script/packs/world.ts";

type BoardFixture = WorldBoard;

function board(): BoardFixture {
  return {
    key: assetKey("boards/test.brd"), coordType: 0, sizeX: 2, sizeY: 1, sizeL: 1,
    width: 64, height: 32, background: { r: 1, g: 2, b: 3 }, ambient: { r: 4, g: 5, b: 6 },
    battleBackground: "battle.bkg", battleSkill: 7,
    layers: [{ tiles: [{ asset: assetKey("tiles/a.tst"), tile: 0 }, null] }],
    vectors: [{ points: [{ x: 1, y: 2 }], attributes: 3, closed: 0, layer: 1, type: 2, handle: "v" }],
    programs: [{ program: "a.prg", graphic: "", initialVar: "", initialValue: "", finalVar: "", finalValue: "", activate: 1, activationType: 2, repeatDistance: 3, layer: 1, points: [{ x: 1, y: 2 }], closed: 0, handle: "p" }],
    layerTitles: ["", "Ground"], constants: ["zero", "one"],
    runtime: { tileEdits: [], tileTypes: ["NORMAL", "NORMAL"] },
  };
}

function stateWithBoard(): GameState {
  const state = createGameState({ seed: 12 });
  state.world = { board: board() };
  return state;
}

test("board built-ins report board reads and synchronous world effects", () => {
  const state = stateWithBoard();
  const services = createScriptServices(state, [{ definition: WORLD_PLUGIN }]);
  const getName = services.commands.get("getboardname")?.spec;
  const put = services.commands.get("put")?.spec;
  equal(getName?.call(services.view, [], () => ({ value: null })).value, "boards/test.brd");
  const result = put?.call(services.view, [{ value: 1, ref: null }, { value: 1, ref: null }, { value: "tiles/new.tst", ref: null }], () => ({ value: null }));
  equal(result?.effects?.[0]?.section, "world");
  applyWorldEffect(state, { name: "put", args: [1, 1, "tiles/new.tst"], kind: "state-write" } as never);
  equal(state.world.board?.layers[0]?.tiles[0]?.asset, "tiles/new.tst");
  const vector = services.commands.get("boardgetvector")?.spec?.call(services.view, [{ value: 0, ref: null }, { value: 0, ref: null }], () => ({ value: null }));
  deepEqual(vector?.out, [[1, 2], [2, 1], [3, 1], [4, 0], [5, 3]]);
});

test("lifecycle built-ins emit reset, main-file, trigger, game-over and one shared quit effect", () => {
  const state = createGameState({ seed: 12 });
  const services = createScriptServices(state, [{ definition: WORLD_PLUGIN }]);
  const call = (name: string, args: readonly Arg[] = []) => {
    const spec = services.commands.get(name)?.spec;
    if (spec === undefined) throw new Error(`missing command ${name}`);
    return spec.call(services.view, args, () => ({ value: null }));
  };
  equal(call("reset").effects?.[0]?.args?.[0], "reset");
  equal(call("mainFile", [{ value: "other.gam", ref: null }]).effects?.[0]?.args?.[0], "mainFile");
  equal(call("gone").effects?.[0]?.section, "triggers");
  equal(call("over").effects?.[0]?.args?.[0], "over");
  for (const alias of ["quitgame", "dos", "windows"]) equal(call(alias).effects?.[0]?.args?.[0], "quit");
});

test("obsolete world built-ins reject every documented call form", () => {
  const state = createGameState({ seed: 12 });
  const services = createScriptServices(state, [{ definition: WORLD_PLUGIN }]);
  const documentedCalls: readonly (readonly [string, readonly Arg[]])[] = [
    ["start", [{ value: "main.gam", ref: null }]],
    ["godos", [{ value: "echo", ref: null }]],
    ["win", []],
    ["animatedtiles", [{ value: 1, ref: null }]],
    ["parallax", [{ value: 1, ref: null }]],
    ["setconstants", [{ value: 1, ref: null }, { value: "name", ref: null }]],
    ["underarrow", []],
  ];
  for (const [name, documentedArgs] of documentedCalls) {
    const spec = services.commands.get(name)?.spec;
    if (spec === undefined) throw new Error(`missing command ${name}`);
    for (const args of [[], documentedArgs] as readonly (readonly Arg[])[]) {
      throws(
        () => spec.call(services.view, args, () => ({ value: null })),
        (error: unknown): error is ScriptError => error instanceof ScriptError && error.code === "builtin.obsolete",
      );
    }
  }
});

test("board virtual variables read hydrated board data", () => {
  const state = stateWithBoard();
  const virtuals = createDefaultVirtuals(state, createActorService(state.actors));
  equal(virtuals.read("boardBackground"), "battle.bkg");
  equal(virtuals.read("boardSkill"), 7);
  equal(virtuals.read("boardTitle[1]"), "Ground");
  equal(virtuals.read("constant[1]"), "one");
  equal(virtuals.read("ambientRed"), 4);
});
