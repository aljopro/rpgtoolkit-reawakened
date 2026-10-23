import { deepEqual, equal, ok, throws } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  addActor,
  applyMenuStateEffect,
  createAssetIndex,
  createEngine,
  createEmptyBoard,
  createGameState,
  hashGameState,
  PACKAGE_ROOT,
  restoreGameState,
  createInventorySection,
  createMenuOwnerPorts,
  createMenuSection,
  createPartySection,
  PARTY_SCHEMA_VERSION,
  INVENTORY_SCHEMA_VERSION,
  MENU_SCHEMA_VERSION,
  snapshot,
  writeBoard,
  validateInventorySection,
  validateMenuSection,
  validatePartySection,
  type EffectRecord,
  type Engine,
  type GameState,
  type PluginDefinition,
  type ResolvedPlugin,
  type ScriptError,
} from "../src/index.ts";

const fixtureDirectory = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "menu");
const saveFixtureDirectory = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "save");

function issue(value: { readonly path: string; readonly message: string } | null): void {
  ok(value !== null);
  ok(value.path.length > 0);
  ok(value.message.length > 0);
}

function rejected(result: { readonly ok: boolean; readonly error: { readonly path: string; readonly message: string } | null }): void {
  equal(result.ok, false);
  issue(result.error);
}

function actorState(): GameState {
  const state = createGameState({ seed: 91 });
  addActor(state.actors, { kind: "party", source: "hero.tem", name: "Hero" });
  addActor(state.actors, { kind: "party", source: "mage.tem", name: "Mage" });
  return state;
}

function fixture(name: string): string {
  return readFileSync(join(saveFixtureDirectory, name), "utf8");
}

test("fresh party, inventory and menu sections are exact v2 plain JSON values", () => {
  equal(PARTY_SCHEMA_VERSION, 2);
  equal(INVENTORY_SCHEMA_VERSION, 2);
  equal(MENU_SCHEMA_VERSION, 2);
  const party = createPartySection();
  const inventory = createInventorySection();
  const menu = createMenuSection();
  deepEqual(party, { version: 2, members: [], selected: null, steps: 0 });
  deepEqual(inventory, { version: 2, nextId: 1, items: [], equipment: [], gold: 0 });
  deepEqual(menu, { version: 2, screens: [], graphic: null });
  deepEqual(JSON.parse(JSON.stringify(party)), party);
  deepEqual(JSON.parse(JSON.stringify(inventory)), inventory);
  deepEqual(JSON.parse(JSON.stringify(menu)), menu);
});

test("validators reject malformed fields, duplicates and dead actor or item references", () => {
  const state = actorState();
  const actorIds = state.actors.actors.map((actor) => actor.id);
  const party = createPartySection();
  const inventory = createInventorySection();
  const menu = createMenuSection();

  issue(validatePartySection({ members: [actorIds[0], actorIds[0]], selected: actorIds[0], steps: 0 }, state.actors));
  issue(validatePartySection({ version: 2, members: [999], selected: 999, steps: 0 }, state.actors));
  issue(validatePartySection({ version: 2, members: [], selected: undefined, steps: 0 }, state.actors));
  issue(validatePartySection({ version: 2, members: [], selected: null, steps: -1 }, state.actors));
  issue(validateInventorySection({ ...inventory, items: [{ id: 1, source: "a.itm", handle: "A", quantity: -1 }] }, state.actors));
  issue(validateInventorySection({ ...inventory, items: [{ id: 1, source: "a.itm", handle: "A", quantity: 0 }, { id: 1, source: "b.itm", handle: "B", quantity: 1 }] }, state.actors));
  issue(validateInventorySection({ ...inventory, items: [{ id: 1, source: "a.itm", handle: "A", quantity: 0 }, { id: 2, source: "a.itm", handle: "A", quantity: 1 }], nextId: 3 }, state.actors));
  issue(validateInventorySection({ ...inventory, gold: -1 }, state.actors));
  issue(validateInventorySection({ ...inventory, items: [{ id: 1, source: "a.itm", handle: "A", quantity: 1 }], equipment: [{ actorId: 999, slot: "weapon", itemId: 1 }], nextId: 2 }, state.actors));
  issue(validateInventorySection({ ...inventory, items: [{ id: 1, source: "a.itm", handle: "A", quantity: 1 }], equipment: [{ actorId: actorIds[0], slot: "weapon", itemId: 1 }, { actorId: actorIds[0], slot: "weapon", itemId: 1 }], nextId: 2 }, state.actors));
  issue(validateInventorySection({ ...inventory, items: [{ id: 1, source: "a.itm", handle: "A", quantity: 1 }], equipment: [{ actorId: actorIds[0], slot: "weapon", itemId: 2 }], nextId: 2 }, state.actors));
  issue(validateMenuSection({ version: 2, screens: [{ screen: "status", actorId: 999, selection: 0 }], graphic: null }, state.actors));
  issue(validateMenuSection({ version: 2, screens: [{ screen: "", actorId: null, selection: 0 }], graphic: null }, state.actors));
  issue(validateMenuSection({ version: 2, screens: [{ screen: "status", actorId: null, selection: -1 }], graphic: null }, state.actors));
  issue(validateMenuSection({ version: 2, screens: [], graphic: undefined }, state.actors));
  equal(validatePartySection(party, state.actors), null);
  equal(validateInventorySection(inventory, state.actors), null);
  equal(validateMenuSection(menu, state.actors), null);
});

test("owner actions isolate sections and reject invalid actions atomically", () => {
  const state = actorState();
  const ports = createMenuOwnerPorts(state);
  const actorId = state.actors.actors[0]!.id;
  const actorBefore = JSON.stringify(state.actors);
  const vmBefore = JSON.stringify(state.vm);
  const timeBefore = JSON.stringify(state.time);
  const partyAction = { type: "roster" as const, members: [actorId], selected: actorId };
  const inventoryAction = { type: "items" as const, nextId: 2, items: [{ id: 1, source: "potion.itm", handle: "Potion", quantity: 2 }] };
  const menuAction = { type: "navigation" as const, screens: [{ screen: "status", actorId, selection: 1 }] };
  const inventoryBeforeParty = JSON.stringify(state.inventory);
  const menuBeforeParty = JSON.stringify(state.menu);
  deepEqual(ports.party.apply(partyAction), { ok: true, error: null });
  deepEqual(ports.party.apply({ type: "steps", value: 3 }), { ok: true, error: null });
  equal(JSON.stringify(state.inventory), inventoryBeforeParty);
  equal(JSON.stringify(state.menu), menuBeforeParty);
  const partyBeforeInventory = JSON.stringify(state.party);
  const menuBeforeInventory = JSON.stringify(state.menu);
  deepEqual(ports.inventory.apply(inventoryAction), { ok: true, error: null });
  deepEqual(ports.inventory.apply({ type: "equipment", equipment: [{ actorId, slot: "weapon", itemId: 1 }] }), { ok: true, error: null });
  deepEqual(ports.inventory.apply({ type: "gold", value: 17 }), { ok: true, error: null });
  equal(JSON.stringify(state.party), partyBeforeInventory);
  equal(JSON.stringify(state.menu), menuBeforeInventory);
  const partyBeforeMenu = JSON.stringify(state.party);
  const inventoryBeforeMenu = JSON.stringify(state.inventory);
  deepEqual(ports.menu.apply(menuAction), { ok: true, error: null });
  deepEqual(ports.menu.apply({ type: "graphic", value: "menu.png" }), { ok: true, error: null });
  equal(JSON.stringify(state.party), partyBeforeMenu);
  equal(JSON.stringify(state.inventory), inventoryBeforeMenu);
  equal(state.party.members.length, 1);
  equal(state.party.steps, 3);
  equal(state.inventory.gold, 17);
  equal(state.inventory.equipment.length, 1);
  equal(state.menu.screens.length, 1);
  equal(state.menu.graphic, "menu.png");
  equal(JSON.stringify(state.actors), actorBefore);
  equal(JSON.stringify(state.vm), vmBefore);
  equal(JSON.stringify(state.time), timeBefore);
  const unchanged = snapshot(state);
  rejected(ports.party.apply({ type: "roster", members: [actorId, actorId], selected: actorId }));
  equal(snapshot(state), unchanged);
  rejected(ports.party.apply({ type: "steps", value: undefined } as never));
  equal(snapshot(state), unchanged);
  rejected(ports.party.apply({ type: "steps" } as never));
  equal(snapshot(state), unchanged);
  rejected(ports.inventory.apply({ type: "items", items: undefined, nextId: 2 } as never));
  equal(snapshot(state), unchanged);
  rejected(ports.inventory.apply({ type: "gold", value: Number.MAX_SAFE_INTEGER + 1 } as never));
  equal(snapshot(state), unchanged);
  rejected(ports.inventory.apply({ type: "equipment", equipment: [{ actorId, slot: "weapon", itemId: 1 }, { actorId, slot: "weapon", itemId: 1 }] }));
  equal(snapshot(state), unchanged);
  rejected(ports.menu.apply({ type: "navigation", screens: undefined } as never));
  equal(snapshot(state), unchanged);
  rejected(ports.menu.apply({ type: "navigation", screens: [{ screen: "status", actorId: 999, selection: 0 }] }));
  equal(snapshot(state), unchanged);
});

test("owner ports copy input and expose deeply immutable read views", () => {
  const state = actorState();
  const ports = createMenuOwnerPorts(state);
  const actorId = state.actors.actors[0]!.id;
  const screens = [{ screen: "status", actorId, selection: 2 }];
  const items = [{ id: 1, source: "potion.itm", handle: "Potion", quantity: 1 }];
  deepEqual(ports.menu.apply({ type: "navigation", screens }), { ok: true, error: null });
  deepEqual(ports.inventory.apply({ type: "items", nextId: 2, items }), { ok: true, error: null });
  screens[0]!.selection = 99;
  items[0]!.quantity = 99;
  equal(state.menu.screens[0]!.selection, 2);
  equal(state.inventory.items[0]!.quantity, 1);
  const view = ports.menu.read() as unknown as { screens: Array<{ selection: number }> };
  try { view.screens[0]!.selection = 77; } catch { /* frozen views are expected */ }
  try { view.screens.push({ selection: 88 }); } catch { /* frozen views are expected */ }
  equal(state.menu.screens[0]!.selection, 2);
  equal(state.menu.screens.length, 1);
});

test("existing ports follow section replacement and restored sections", () => {
  const state = actorState();
  const ports = createMenuOwnerPorts(state);
  const actorId = state.actors.actors[0]!.id;
  deepEqual(ports.party.apply({ type: "steps", value: 4 }), { ok: true, error: null });
  state.party = createPartySection();
  state.inventory = createInventorySection();
  state.menu = createMenuSection();
  equal(ports.party.read().steps, 0);
  equal(ports.inventory.read().gold, 0);
  equal(ports.menu.read().graphic, null);
  const restored = restoreGameState(snapshot(state));
  restored.party = { version: 2, members: [actorId], selected: actorId, steps: 8 };
  restored.inventory = { version: 2, nextId: 2, items: [{ id: 1, source: "potion.itm", handle: "Potion", quantity: 1 }], equipment: [], gold: 12 };
  restored.menu = { version: 2, screens: [{ screen: "status", actorId, selection: 0 }], graphic: "menu.png" };
  state.party = restored.party;
  state.inventory = restored.inventory;
  state.menu = restored.menu;
  deepEqual(ports.party.read(), restored.party);
  deepEqual(ports.inventory.read(), restored.inventory);
  deepEqual(ports.menu.read(), restored.menu);
  deepEqual(ports.party.apply({ type: "steps", value: 9 }), { ok: true, error: null });
  equal(state.party.steps, 9);
});

test("menu.state rejects invalid actions through the catchable ScriptError path", () => {
  const state = actorState();
  const ports = createMenuOwnerPorts(state);
  const effect: EffectRecord = { name: "menu.state", patch: { section: "party", path: [], op: "merge", value: null }, args: [{ type: "roster", members: [999], selected: 999 }], kind: "state-write", tick: 0, thread: 1, out: {}, result: null, wait: null, request: null, seq: 1 };
  throws(() => applyMenuStateEffect(ports, effect), (error: unknown) => {
    const scriptError = error as ScriptError;
    equal(scriptError.code, "menu.state-invalid");
    ok(scriptError.message.includes("members"));
    return true;
  });
});

test("v1 party, inventory and menu placeholders migrate to fresh v2 sections idempotently", () => {
  const migrated = restoreGameState(fixture("menu-v1.json"));
  deepEqual(migrated.party, createPartySection());
  deepEqual(migrated.inventory, createInventorySection());
  deepEqual(migrated.menu, createMenuSection());
  const once = snapshot(migrated);
  const twice = restoreGameState(once);
  equal(snapshot(twice), once);
  equal(hashGameState(twice), hashGameState(migrated));
});

test("restore rejects malformed v1 placeholders and unsupported menu section versions", () => {
  const raw = JSON.parse(fixture("menu-v1.json")) as Record<string, unknown>;
  const malformed = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
  malformed.party = { version: 1 };
  throws(() => restoreGameState(JSON.stringify(malformed)), (error: unknown) => (error as ScriptError).code === "restore.shape");
  const unsupported = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
  const schema = unsupported.schema as Record<string, unknown>;
  schema.menu = 3;
  unsupported.menu = { version: 3, screens: [], graphic: null };
  throws(() => restoreGameState(JSON.stringify(unsupported)), (error: unknown) => (error as ScriptError).code === "restore.shape");
});

const authoredProgram = readFileSync(join(fixtureDirectory, "state-ports.prg"), "utf8");
const boardBytes = (() => {
  const encoded = writeBoard(createEmptyBoard());
  if (!encoded.ok) throw new Error(encoded.error.message);
  return encoded.value;
})();

function menuEngine(onState: (state: GameState) => void, effects: EffectRecord[]): { engine: Engine; state: () => GameState | null } {
  const actions = [
    { section: "party" as const, action: { type: "steps" as const, value: 6 } },
    { section: "inventory" as const, action: { type: "gold" as const, value: 23 } },
    { section: "menu" as const, action: { type: "navigation" as const, screens: [{ screen: "status", actorId: null, selection: 1 }] } },
  ];
  let call = 0;
  let latest: GameState | null = null;
  const definition: PluginDefinition = {
    id: "menu-state-test",
    version: "1.0.0",
    commands: [
      {
        name: "state",
        aliases: [],
        params: [],
        call: () => {
          const next = actions[call++];
          if (next === undefined) return { value: null };
          return { value: null, effects: [{ kind: "state-write", section: next.section, args: [next.action] }] };
        },
      },
    ],
  };
  const plugin: ResolvedPlugin = { namespace: "menu", definition };
  let resetPosted = false;
  const seenEffects = new Set<number>();
  const engine = createEngine({
    seed: 17,
    assetIndex: createAssetIndex(["Boards/test.brd"]),
    assetRoot: PACKAGE_ROOT,
    initialBoard: "test.brd",
    width: 64,
    height: 64,
    maxTicks: 20,
    program: authoredProgram,
    plugins: [plugin],
    phaseRegistrations: [
      { phase: "input", run: (state) => {
        latest = state;
        if (state.actors.actors.length === 0) addActor(state.actors, { kind: "party", source: "hero.tem", name: "Hero" });
      }},
      { phase: "events", run: (state, postEffect) => {
        for (const effect of state.vm.effects) {
          if (effect.name !== "state" || seenEffects.has(effect.seq)) continue;
          seenEffects.add(effect.seq);
          effects.push(effect);
        }
        if (state.menu.screens.length > 0 && !resetPosted) {
          resetPosted = true;
          onState(state);
          postEffect?.("engine", {
            name: "reset",
            kind: "state-write",
            thread: 0,
            args: [],
            out: {},
            result: null,
            patch: { section: "engine", path: [], op: "merge", value: null },
            wait: null,
            request: null,
          });
        }
      }},
    ],
  });
  return { engine, state: () => latest };
}

function runEngine(engine: Engine): string[] {
  const hashes: string[] = [];
  let report = engine.advance(0, []);
  hashes.push(report.stateHash);
  for (let turn = 0; turn < 8; turn += 1) {
    const asset = report.requests.find((request) => request.kind === "asset");
    const inputs = asset === undefined ? [] : [{ tick: report.tickAfter, event: { kind: "asset" as const, reqId: asset.reqId, bytes: boardBytes } }];
    report = engine.advance(1, inputs);
    hashes.push(report.stateHash);
    if (report.requests.length === 0 && report.ticksRun === 0) break;
  }
  return hashes;
}

test("authored RPGCode dispatches menu.state adapters through all owners and reset clears all sections", () => {
  const effects: EffectRecord[] = [];
  let savedBeforeReset: string | null = null;
  let savedBeforeResetHash: string | null = null;
  const created = menuEngine((state) => {
    if (state.menu.screens.length > 0) {
      savedBeforeReset = snapshot(state);
      savedBeforeResetHash = hashGameState(state);
    }
  }, effects);
  runEngine(created.engine);
  equal(effects.filter((effect) => effect.kind === "state-write").length, 3);
  deepEqual(effects.slice(0, 3).map((effect) => [effect.patch?.section, effect.args[0]]), [
    ["party", { type: "steps", value: 6 }],
    ["inventory", { type: "gold", value: 23 }],
    ["menu", { type: "navigation", screens: [{ screen: "status", actorId: null, selection: 1 }] }],
  ]);
  ok(effects.slice(0, 3).every((effect) => effect.name === "state"));
  ok(savedBeforeReset !== null);
  if (savedBeforeReset !== null && savedBeforeResetHash !== null) equal(hashGameState(restoreGameState(savedBeforeReset)), savedBeforeResetHash);
  const afterReset = created.state();
  ok(afterReset !== null);
  equal(afterReset.party.members.length, 0);
  equal(afterReset.party.steps, 0);
  equal(afterReset.inventory.gold, 0);
  equal(afterReset.menu.screens.length, 0);
});

test("identically seeded authored engines have identical per-tick state hashes", () => {
  const first = menuEngine(() => undefined, []);
  const second = menuEngine(() => undefined, []);
  deepEqual(runEngine(first.engine), runEngine(second.engine));
});
