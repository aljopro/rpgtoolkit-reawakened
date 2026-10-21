import { deepEqual, equal } from "node:assert/strict";
import test from "node:test";
import {
  addActor,
  createBehaviourRegistry,
  createGameState,
  restoreGameState,
  snapshot,
  createScriptServices,
  drainDiagnostics,
  registerPackageBehaviours,
  resolveBehaviour,
  runPackageStartup,
  type ActorHooks,
  type ResolvedPlugin,
} from "../src/index.ts";
import type { Diagnostic } from "../src/ports/engine.ts";

const hook: ActorHooks["levelUp"] = () => ({ deltas: { dp: 2 } });

test("behaviour registration is namespaced, closed, and behaviour-first", () => {
  const diagnostics: Diagnostic[] = [];
  const defaults: ActorHooks = { levelUp: () => ({ deltas: { dp: 1 } }) };
  const registry = createBehaviourRegistry(["stock-rpg"], diagnostics, defaults);
  const plugin: ResolvedPlugin = {
    namespace: "stock-rpg",
    definition: {
      id: "stock-rpg",
      version: "1.0.0",
      commands: [],
      behaviourStartup(register) {
        equal(register("stock-rpg.hero", { levelUp: hook }), true);
        equal(register("stock-rpg.hero", { levelUp: hook }), false);
        equal(register("other.hero", { levelUp: hook }), false);
        equal(register("stock_rpg.hero", { levelUp: hook }), false);
        equal(register("stock-rpg.bad", { beforeDamage: hook } as unknown as ActorHooks), false);
      },
    },
  };
  registerPackageBehaviours(registry, [plugin]);
  deepEqual(diagnostics.slice(0, 4).map(({ code, file, line }) => ({ code, file, line })), [
    { code: "behaviour.duplicate", file: "<package startup>", line: 0 },
    { code: "behaviour.namespace", file: "<package startup>", line: 0 },
    { code: "behaviour.malformed-name", file: "<package startup>", line: 0 },
    { code: "behaviour.unknown-hook", file: "<package startup>", line: 0 },
  ]);
  equal(resolveBehaviour(registry, { behaviour: "stock-rpg.hero" }).levelUp, hook);
  equal(resolveBehaviour(registry, { behaviour: "missing.hero" }, diagnostics).levelUp, defaults.levelUp);
  equal(diagnostics.length, 5);
});

test("behaviour definitions retain only the actor name outside the session registry", () => {
  const registry = createBehaviourRegistry(["stock-rpg"]);
  const plugin: ResolvedPlugin = {
    namespace: "stock-rpg",
    definition: {
      id: "stock-rpg",
      version: "1.0.0",
      commands: [],
      behaviourStartup(register) {
        register("stock-rpg.hero", { levelUp: hook });
      },
    },
  };
  registerPackageBehaviours(registry, [plugin]);
  deepEqual(registry.definitions().map((entry) => entry.name), ["stock-rpg.hero"]);
  deepEqual({ behaviour: "stock-rpg.hero" }, { behaviour: "stock-rpg.hero" });
});

test("package-scoped startup registers behaviours used by actor operations", () => {
  const plugin: ResolvedPlugin = {
    namespace: "stock-rpg",
    definition: {
      id: "stock-rpg",
      version: "1.0.0",
      commands: [],
      behaviourStartup(registerBehaviour) {
        registerBehaviour("stock-rpg.hero", {
          levelUp: () => ({ deltas: { dp: 5 } }),
        });
      },
    },
  };
  const state = createGameState({ seed: 1 });
  const actor = addActor(state.actors, {
    kind: "party",
    source: "hero.tem",
    behaviour: "stock-rpg.hero",
    stats: { level: 1, experience: 0, dp: 1 },
    progression: {
      maxLevel: 10,
      remainingExperience: 10,
      nextRequirement: 10,
      levelDp: 1,
      legacyLevelUp: false,
    },
  });
  const services = createScriptServices(state, [plugin]);
  equal(services.behaviours.definitions().length, 0);
  runPackageStartup(state, services, [], [plugin]);
  equal(services.behaviours.definitions().length, 1);
  equal(services.actors.hooks(actor.id).levelUp !== undefined, true);
  const result = services.actors.awardExperience(actor.id, 10);
  equal(result?.actor.stats.level, 2);
  equal(result?.actor.stats.dp, 6);
});

test("all actor hooks and direct stat writes resolve through the owner service", () => {
  const calls: string[] = [];
  const plugin: ResolvedPlugin = {
    namespace: "stock-rpg",
    definition: {
      id: "stock-rpg",
      version: "1.0.0",
      commands: [],
      behaviourStartup(registerBehaviour) {
        registerBehaviour("stock-rpg.all_hooks", {
          statsChanged: (_actor, context) => {
            calls.push("statsChanged");
            return context.operation === "levelUp" ? { dp: 11 } : { dp: 9 };
          },
          revive: () => {
            calls.push("revive");
            return { hp: 2 };
          },
          statusChanged: () => {
            calls.push("statusChanged");
            return { rounds: 4 };
          },
          equipmentChanged: () => {
            calls.push("equipmentChanged");
            return { bonuses: { dp: 4 } };
          },
          levelUp: () => {
            calls.push("levelUp");
            return { deltas: { dp: 2 } };
          },
        });
      },
    },
  };
  const state = createGameState({ seed: 2 });
  const actor = addActor(state.actors, {
    kind: "party",
    source: "hero.tem",
    behaviour: "stock-rpg.all_hooks",
    stats: { hp: 0, maxHp: 10, level: 1, experience: 0 },
    statuses: { poison: 3 },
    progression: {
      maxLevel: 2,
      remainingExperience: 10,
      nextRequirement: 10,
      levelDp: 1,
      levelUpType: 1,
      legacyLevelUp: false,
    },
  });
  const services = createScriptServices(state, [plugin]);
  runPackageStartup(state, services, [], [plugin]);

  equal(services.actors.write(actor.id, { hp: 1 }), true);
  equal(services.actors.readActor(actor.id)?.stats.hp, 2);
  equal(services.actors.readActor(actor.id)?.stats.dp, 9);

  const status = services.actors.advanceStatus(actor.id, 1);
  equal(status?.actor.statuses.poison, 4);
  const equipment = services.actors.applyEquipment(actor.id, ["ring"], [{ name: "ring", equipBonus: [1, 2, 3, 4] }]);
  equal(equipment?.actor.equipment.bonuses.dp, 4);
  equal(equipment?.actor.stats.fp, 3);
  const level = services.actors.awardExperience(actor.id, 10);
  equal(level?.actor.stats.level, 2);
  equal(level?.actor.stats.dp, 11);
  equal(calls.includes("statsChanged"), true);
  equal(calls.includes("revive"), true);
  equal(calls.includes("statusChanged"), true);
  equal(calls.includes("equipmentChanged"), true);
  equal(calls.includes("levelUp"), true);
});

test("package callbacks own namespaces and reject non-plain hook dictionaries", () => {
  const diagnostics: Diagnostic[] = [];
  const registry = createBehaviourRegistry(["first-pack", "second-pack"], diagnostics);
  let duplicateResult: boolean | undefined;
  let lateRegister: ((name: string, hooks: ActorHooks) => boolean) | undefined;
  const order: string[] = [];
  class HookBag {}
  const hiddenHooks: Record<string, unknown> = {};
  Object.defineProperty(hiddenHooks, "levelUp", { value: hook, enumerable: false });
  const first: ResolvedPlugin = {
    namespace: "first-pack",
    definition: {
      id: "first-pack",
      version: "1.0.0",
      commands: [],
      behaviourStartup(register) {
        order.push("first");
        lateRegister = register;
        register("second-pack.hero", { levelUp: hook });
        register("first-pack.hero", new HookBag() as unknown as ActorHooks);
        register("first-pack.map", new Map() as unknown as ActorHooks);
        register("first-pack.symbol", { [Symbol("unknown")]: hook } as unknown as ActorHooks);
        register("first-pack.hidden", hiddenHooks as unknown as ActorHooks);
      },
    },
  };
  const second: ResolvedPlugin = {
    namespace: "second-pack",
    definition: {
      id: "second-pack",
      version: "1.0.0",
      commands: [],
      behaviourStartup(register) {
        order.push("second");
        register("second-pack.hero", { levelUp: hook });
      },
    },
  };
  const duplicate: ResolvedPlugin = {
    namespace: "second-pack",
    definition: {
      id: "second-pack-duplicate",
      version: "1.0.0",
      commands: [],
      behaviourStartup(register) {
        order.push("duplicate");
        duplicateResult = register("second-pack.hero", { levelUp: hook });
      },
    },
  };
  registerPackageBehaviours(registry, [first, second, duplicate]);
  equal(order.join(","), "first,second,duplicate");
  equal(lateRegister?.("first-pack.late", { levelUp: hook }), false);
  equal(registry.definitions().length, 1);
  const lateDiagnostics = diagnostics.filter((entry) => entry.code === "behaviour.startup-closed");
  equal(lateDiagnostics.length, 1);
  equal(lateDiagnostics[0]?.file, "<package startup>");
  equal(lateDiagnostics[0]?.line, 0);
  equal(registry.definitions().length, 1);
  equal(registry.definitions()[0]?.name, "second-pack.hero");
  equal(diagnostics.filter((entry) => entry.code === "behaviour.namespace").length, 1);
  equal(duplicateResult, false);
  equal(diagnostics.filter((entry) => entry.code === "behaviour.duplicate").length, 1);
  equal(diagnostics.filter((entry) => entry.code === "behaviour.hooks").length, 2);
  equal(diagnostics.filter((entry) => entry.code === "behaviour.unknown-hook").length, 2);
  const locatedDiagnostics = diagnostics.filter((entry) => entry.code === "behaviour.unknown-hook");
  equal(locatedDiagnostics[0]?.file, "<package startup>");
  equal(locatedDiagnostics[0]?.line, 0);
});

test("behaviour hook dictionaries reject accessors and non-callable values", () => {
  const diagnostics: Diagnostic[] = [];
  const registry = createBehaviourRegistry(["stock-rpg"], diagnostics);
  const accessor: Record<string, unknown> = {};
  Object.defineProperty(accessor, "levelUp", { get: () => hook, enumerable: true });
  const nonCallable = { levelUp: 1 };
  equal(registry.registerForNamespace("stock-rpg", "stock-rpg.accessor", accessor), false);
  equal(registry.registerForNamespace("stock-rpg", "stock-rpg.value", nonCallable), false);
  equal(diagnostics.map((entry) => entry.code).join(","), "behaviour.unknown-hook,behaviour.hook");
  equal(diagnostics.every((entry) => entry.file === "<package startup>" && entry.line === 0), true);
});

test("fresh startup services rebuild registrations and report a missing behaviour once", () => {
  const plugin: ResolvedPlugin = {
    namespace: "stock-rpg",
    definition: {
      id: "stock-rpg",
      version: "1.0.0",
      commands: [],
      behaviourStartup(register) {
        register("stock-rpg.hero", { levelUp: hook });
      },
    },
  };
  const make = () => {
    const state = createGameState({ seed: 3 });
    const actor = addActor(state.actors, {
      kind: "party",
      source: "hero.tem",
      behaviour: "missing.hero",
      stats: { level: 1, experience: 0, dp: 1 },
      progression: { maxLevel: 2, remainingExperience: 10, nextRequirement: 10, legacyLevelUp: false },
    });
    addActor(state.actors, {
      kind: "enemy",
      source: "unused.tem",
      behaviour: "missing.hero",
      stats: { level: 1, experience: 0, dp: 1 },
      progression: { maxLevel: 2, remainingExperience: 10, nextRequirement: 10, legacyLevelUp: false },
    });
    const services = createScriptServices(state, [plugin]);
    runPackageStartup(state, services, [], [plugin]);
    return { actor, services, state };
  };
  const first = make();
  const second = make();
  equal(first.services.behaviours.definitions().length, 1);
  equal(second.services.behaviours.definitions().length, 1);
  const restored = restoreGameState(snapshot(first.state));
  const restoredServices = createScriptServices(restored, [plugin]);
  runPackageStartup(restored, restoredServices, [], [plugin]);
  equal(restoredServices.behaviours.definitions().length, 1);
  const restoredUnused = restored.actors.actors[1]!;
  equal(restoredUnused.behaviour, "missing.hero");
  const restoredMissing = drainDiagnostics(restoredServices).filter((entry) => entry.code === "behaviour.missing");
  equal(restoredMissing.length, 1);
  equal(restoredMissing[0]?.file, "<package startup>");
  equal(restoredMissing[0]?.line, 0);
  const restoredActor = restored.actors.actors[0]!;
  const restoredResult = restoredServices.actors.awardExperience(restoredActor.id, 10);
  if (restoredResult === null) throw new Error("expected default progression result");
  equal(restoredResult.transitions.length, 1);
  equal(restoredServices.actors.readActor(restoredActor.id)?.stats.level, 2);
  first.services.actors.awardExperience(first.actor.id, 10);
  first.services.actors.awardExperience(first.actor.id, 0);
  const missing = drainDiagnostics(first.services).filter((entry) => entry.code === "behaviour.missing");
  equal(missing.length, 1);
  equal(missing[0]?.file, "<package startup>");
  equal(missing[0]?.line, 0);
});
