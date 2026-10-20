import { deepEqual, equal, ok } from "node:assert/strict";
import { test } from "node:test";
import {
  ASSIGN_READ_ONLY,
  actorEmitterKey,
  addActor,
  createActorHostType,
  createActorService,
  createActorsSection,
  createDefaultVirtuals,
  createGameState,
  createStatsPort,
  KILL_SYSTEM_OWNED,
  hashGameState,
  patchActor,
  registerActorObject,
  resetActorsSection,
  restoreGameState,
  snapshot,
} from "../src/index.ts";

const partyFixture = {
  kind: "party" as const,
  source: "hero.tem",
  name: "Hero",
  stats: { hp: 12, maxHp: 12, smp: 4, maxSmp: 4, dp: 2, fp: 3, level: 1 },
  behaviour: "stock-rpg.hero",
};

function hasCallable(value: unknown): boolean {
  if (typeof value === "function") return true;
  if (Array.isArray(value)) return value.some(hasCallable);
  if (typeof value !== "object" || value === null) return false;
  return Object.values(value).some(hasCallable);
}

test("party, enemy and NPC actors use one plain-data record shape and stable scalar ids", () => {
  const actors = createActorsSection();
  const party = addActor(actors, partyFixture);
  const enemy = addActor(actors, { kind: "enemy", source: "slime.ene", stats: { hp: 9, maxHp: 9 } });
  const npc = addActor(actors, { kind: "npc", source: "merchant.tem", customEvents: ["talkedTo"] });

  deepEqual(actors.actors.map((actor) => actor.id), [1, 2, 3]);
  deepEqual(actors.actors.map((actor) => actor.kind), ["party", "enemy", "npc"]);
  equal(actorEmitterKey(party.id), "actor:1");
  equal(actorEmitterKey(enemy.id), "actor:2");
  equal(actorEmitterKey(npc.id), "actor:3");
  ok(!("handle" in party), "actor data does not persist a VM object handle");
  ok(!hasCallable(actors), "actor section contains no callable");
});

test("actor records round-trip through the owned state section with equal hash", () => {
  const state = createGameState({ seed: 27 });
  addActor(state.actors, partyFixture);
  addActor(state.actors, {
    kind: "enemy",
    source: "slime.ene",
    stats: { hp: 9, maxHp: 9, fp: 2 },
    statuses: { poison: 3 },
    equipment: { equipped: ["ring.itm"], bonuses: { hp: 2 } },
  });
  addActor(state.actors, { kind: "npc", source: "merchant.tem", behaviour: null });

  const saved = snapshot(state);
  const restored = restoreGameState(saved);
  deepEqual(restored.actors, state.actors);
  equal(hashGameState(restored), hashGameState(state));
  equal(snapshot(restored), saved);
});

test("StatsPort reads and writes the actor-owned stats without a vm.globals copy", () => {
  const state = createGameState({ seed: 5 });
  const actor = addActor(state.actors, partyFixture);
  const port = createStatsPort(state.actors);
  const before = port.read(actor.id);
  ok(before === actor.stats);
  ok(!Object.hasOwn(state.vm.globals, "HP!"));
  equal(port.write(actor.id, { hp: 7 }), true);
  equal(port.read(actor.id)?.hp, 7);
  equal(state.actors.actors[0]?.stats.hp, 7);
  ok(!Object.hasOwn(state.vm.globals, "HP!"));
});

test("actor reset clears records and restarts deterministic allocation", () => {
  const section = createActorsSection();
  addActor(section, partyFixture);
  section.actors[0]!.statuses.poison = 2;
  resetActorsSection(section);
  deepEqual(section, createActorsSection());
  equal(addActor(section, { kind: "npc", source: "merchant.tem" }).id, 1);
});

test("actor patches retain identity and reject accidental executable state", () => {
  const section = createActorsSection();
  const actor = addActor(section, { ...partyFixture, id: 7 });
  const patched = patchActor(section, actor.id, { stats: { hp: 10 }, behaviour: "stock-rpg.hero" });
  equal(patched?.id, actor.id);
  equal(patched?.stats.hp, 10);
  ok(!hasCallable(section));
});

test("actor script object is the owner-backed emitter registration", () => {
  const state = createGameState({ seed: 8 });
  const actor = addActor(state.actors, partyFixture);
  const object = registerActorObject(state.vm, state.events, state.actors, actor.id);
  ok(object !== null);
  equal(object?.hostType, "actor");
  equal(state.events.emitters?.[actorEmitterKey(actor.id)], object?.handle);
  const duplicate = registerActorObject(state.vm, state.events, state.actors, actor.id);
  equal(duplicate?.handle, object?.handle);
  equal(state.vm.objects.length, 1);

  const host = createActorHostType(createActorService(state.actors));
  const context = { state, events: state.events, vm: state.vm, record: object! };
  equal(host.read?.(context, "hp"), 12);
  equal(host.write?.(context, "hp", 5), "written");
  equal(state.actors.actors[0]?.stats.hp, 5);
  patchActor(state.actors, actor.id, { stats: { hp: 9 } });
  equal(host.read?.(context, "hp"), 9);
});

test("actor aliases write through and protected virtuals keep their links", () => {
  const state = createGameState({ seed: 9 });
  const actor = addActor(state.actors, partyFixture);
  const virtuals = createDefaultVirtuals(state);
  equal(virtuals.read("HP!"), 12);
  equal(virtuals.write?.("HP!", 4), "written");
  equal(state.actors.actors[0]?.stats.hp, 4);
  equal(virtuals.read("HP!"), 4);
  equal(virtuals.write?.("gametime", 99), "read-only");
  equal(virtuals.read("gametime"), 0);
  try {
    virtuals.kill?.("HP!");
    ok(false, "kill should reject an actor alias");
  } catch (error) {
    equal((error as { code?: string }).code, KILL_SYSTEM_OWNED);
  }
  equal(virtuals.write?.("threads[1]", 2), "read-only");
  ok(!Object.hasOwn(state.vm.globals, "HP!"));
  equal(ASSIGN_READ_ONLY, "assign.read-only");
});
