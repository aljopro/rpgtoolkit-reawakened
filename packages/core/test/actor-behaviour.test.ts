import { deepEqual, equal } from "node:assert/strict";
import test from "node:test";
import {
  addActor,
  createGameState,
  createScriptServices,
  createBehaviourRegistry,
  registerBehaviour,
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
  equal(registerBehaviour(registry, "stock-rpg.hero", { levelUp: hook }), true);
  equal(registerBehaviour(registry, "stock-rpg.hero", { levelUp: hook }), false);
  equal(registerBehaviour(registry, "other.hero", { levelUp: hook }), false);
  equal(registerBehaviour(createBehaviourRegistry(), "stock-rpg.unscoped", { levelUp: hook }), false);
  equal(registerBehaviour(registry, "stock_rpg.hero", { levelUp: hook }), false);
  equal(registerBehaviour(registry, "stock-rpg.bad", { beforeDamage: hook }), false);
  equal(diagnostics.length, 4);
  equal(resolveBehaviour(registry, { behaviour: "stock-rpg.hero" }).levelUp, hook);
  equal(resolveBehaviour(registry, { behaviour: "missing.hero" }, diagnostics).levelUp, defaults.levelUp);
  equal(diagnostics.length, 5);
});

test("behaviour definitions retain only the actor name outside the session registry", () => {
  const registry = createBehaviourRegistry(["stock-rpg"]);
  registerBehaviour(registry, "stock-rpg.hero", { levelUp: hook });
  deepEqual(registry.definitions().map((entry) => entry.name), ["stock-rpg.hero"]);
  deepEqual({ behaviour: "stock-rpg.hero" }, { behaviour: "stock-rpg.hero" });
});

test("package startup registers behaviours used by actor operations", () => {
  const plugin: ResolvedPlugin = {
    namespace: "stock-rpg",
    definition: {
      id: "stock-rpg",
      version: "1.0.0",
      commands: [],
      behaviours: [{
        name: "stock-rpg.hero",
        hooks: {
          levelUp: () => ({ deltas: { dp: 5 } }),
        },
      }],
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
