import { deepEqual, equal } from "node:assert/strict";
import test from "node:test";
import {
  createBehaviourRegistry,
  registerBehaviour,
  resolveBehaviour,
  type ActorHooks,
} from "../src/index.ts";

const hook: ActorHooks["levelUp"] = () => ({ deltas: { dp: 2 } });

test("behaviour registration is namespaced, closed, and behaviour-first", () => {
  const diagnostics = [];
  const defaults: ActorHooks = { levelUp: () => ({ deltas: { dp: 1 } }) };
  const registry = createBehaviourRegistry(["stock-rpg"], diagnostics, defaults);
  equal(registerBehaviour(registry, "stock-rpg.hero", { levelUp: hook }), true);
  equal(registerBehaviour(registry, "stock-rpg.hero", { levelUp: hook }), false);
  equal(registerBehaviour(registry, "other.hero", { levelUp: hook }), false);
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
