import { deepEqual, equal, ok, throws } from "node:assert/strict";
import { test } from "node:test";
import {
  addActor,
  advanceStatus,
  applyEquipment,
  awardExperience,
  createActorsSection,
  updateActorStats,
  type ActorHooks,
} from "../src/index.ts";

function actor(overrides: Record<string, unknown> = {}) {
  const section = createActorsSection();
  const result = addActor(section, {
    kind: "party",
    source: "hero.tem",
    stats: { hp: 10, maxHp: 10, smp: 4, maxSmp: 4, dp: 10, fp: 10, level: 1, experience: 0 },
    progression: {
      levelType: 10,
      nextRequirement: 10,
      remainingExperience: 10,
      maxLevel: 10,
      experienceIncrease: 100,
      levelHp: 10,
      levelDp: 10,
      levelFp: 10,
      levelSm: 10,
      levelUpType: 1,
      ...(overrides.progression as Record<string, unknown> | undefined),
    },
    ...(overrides as never),
  });
  return { section, actor: result };
}

test("fallen and revival retain the actor and emit one cause/source transition", () => {
  const state = actor();
  const fallen = updateActorStats(state.section, state.actor.id, { hp: 0 }, { cause: "damage", source: 7 });
  ok(fallen);
  equal(fallen.actor.stats.hp, 0);
  deepEqual(fallen.transitions, [
    { type: "statsChanged", actorId: state.actor.id, stats: fallen.actor.stats, changed: ["hp"] },
    { type: "fallen", actorId: state.actor.id, cause: "damage", source: 7 },
  ]);
  const duplicate = updateActorStats(state.section, state.actor.id, { hp: 0 }, { cause: "damage", source: 7 });
  ok(duplicate);
  equal(duplicate.transitions.some((transition) => transition.type === "fallen"), false);
  const revived = updateActorStats(state.section, state.actor.id, { hp: 5 }, { cause: "script", source: null });
  ok(revived);
  equal(revived.actor.id, state.actor.id);
  deepEqual(revived.transitions.at(-1), { type: "revived", actorId: state.actor.id, cause: "script", source: null });
  const noRevival = updateActorStats(state.section, state.actor.id, { hp: 0 }, { cause: "status" });
  ok(noRevival);
  equal(noRevival.transitions.some((transition) => transition.type === "revived"), false);
  throws(() => updateActorStats(state.section, state.actor.id, { hp: 0 }, { cause: "bad" as never }));
  throws(() => updateActorStats(state.section, state.actor.id, { hp: 0 }, { cause: "damage", source: 0 }));
});
test("advanceStatus ages all counters in stable order and supports caller timing policies", () => {
  const perTurn = actor();
  perTurn.actor.statuses = { burn: 1, poison: 3, slow: 2 };
  const perTime = actor();
  perTime.actor.statuses = { burn: 1, poison: 3, slow: 2 };
  const first = advanceStatus(perTurn.section, perTurn.actor.id, 2);
  const second = advanceStatus(perTime.section, perTime.actor.id, 1);
  ok(first && second);
  deepEqual(first.actor.statuses, { poison: 1, slow: 1 });
  deepEqual(first.transitions.filter((transition) => transition.type === "statusChanged").map((transition) => transition.status), ["burn", "poison", "slow"]);
  deepEqual(first.transitions.filter((transition) => transition.type === "statusChanged").map((transition) => transition.rounds), [0, 1, 0]);
  advanceStatus(perTime.section, perTime.actor.id, 1);
  deepEqual(perTime.actor.statuses, { poison: 1 });
  throws(() => advanceStatus(perTurn.section, perTurn.actor.id, -1));
  throws(() => advanceStatus(perTurn.section, perTurn.actor.id, 1.5));
});

test("equipment derives four bonuses from item data and applies only stat deltas", () => {
  const state = actor();
  const equipped = applyEquipment(state.section, state.actor.id, ["blade", "ring"], [
    { name: "blade", equipBonus: [5, 2, 3, 1] },
    { name: "ring", id: "ring", equipBonus: [2, 1, 4, 2] },
  ]);
  ok(equipped);
  deepEqual(equipped.actor.equipment.bonuses, { hp: 7, dp: 3, fp: 7, smp: 3 });
  deepEqual(equipped.actor.stats, { ...state.actor.stats, maxHp: 17, dp: 13, fp: 17, maxSmp: 7 });
  const removed = applyEquipment(state.section, state.actor.id, [], [
    { name: "blade", equipBonus: [5, 2, 3, 1] },
    { name: "ring", equipBonus: [2, 1, 4, 2] },
  ]);
  ok(removed);
  deepEqual(removed.actor.stats, state.actor.stats);
  throws(() => applyEquipment(state.section, state.actor.id, ["missing"], []));
  throws(() => applyEquipment(state.section, state.actor.id, ["bad"], [{ name: "bad", equipBonus: [1, 2, 3] }]));
});

test("XP uses fixed and percentage branches, carries multi-level awards, excludes equipment and never refills", () => {
  const fixed = actor({ progression: { levelUpType: 1, levelHp: 5, levelDp: 2, levelFp: 3, levelSm: 4, experienceIncrease: 5 } });
  fixed.actor.equipment.bonuses = { hp: 10, dp: 10, fp: 10, smp: 10 };
  const fixedResult = awardExperience(fixed.section, fixed.actor.id, 25);
  ok(fixedResult);
  equal(fixedResult.actor.stats.experience, 25);
  equal(fixedResult.actor.stats.level, 3);
  equal(fixedResult.actor.stats.hp, 10);
  equal(fixedResult.actor.stats.smp, 4);
  equal(fixedResult.actor.progression.remainingExperience, 20);

  const percentage = actor({
    stats: { hp: 10, maxHp: 20, smp: 4, maxSmp: 20, dp: 20, fp: 20, level: 1, experience: 0 },
    progression: { levelUpType: 0, levelHp: 50, levelDp: 50, levelFp: 50, levelSm: 50, experienceIncrease: 50, nextRequirement: 20, remainingExperience: 20 },
  });
  percentage.actor.equipment.bonuses = { hp: 10, dp: 10, fp: 10, smp: 10 };
  const percentageResult = awardExperience(percentage.section, percentage.actor.id, 20);
  ok(percentageResult);
  equal(percentageResult.actor.stats.maxHp, 25);
  equal(percentageResult.actor.stats.dp, 25);
  equal(percentageResult.actor.stats.fp, 25);
  equal(percentageResult.actor.stats.maxSmp, 30);
});

test("max level retains XP and legacy program precedence suppresses levelUp hook", () => {
  const state = actor({ progression: { maxLevel: 2, legacyLevelUp: true } });
  let called = false;
  const hooks: ActorHooks = { levelUp: () => { called = true; return { deltas: { maxHp: 999 } }; } };
  const result = awardExperience(state.section, state.actor.id, 100, hooks);
  ok(result);
  equal(result.actor.stats.experience, 100);
  equal(result.actor.stats.level, 2);
  equal(called, false);
  equal(result.actor.stats.hp, 10);
  const maxed = awardExperience(state.section, state.actor.id, 1);
  ok(maxed);
  equal(maxed.actor.stats.experience, 101);
  throws(() => awardExperience(state.section, state.actor.id, -1));
});

test("the five hooks are direct synchronous plain-data seams", () => {
  const state = actor();
  const calls: string[] = [];
  const hooks: ActorHooks = {
    statsChanged: (_actor, context) => { calls.push(context.operation); return {}; },
    revive: () => { calls.push("revive"); return {}; },
    statusChanged: () => { calls.push("statusChanged"); return {}; },
    equipmentChanged: () => { calls.push("equipmentChanged"); return {}; },
    levelUp: () => { calls.push("levelUp"); return {}; },
  };
  state.actor.statuses = { poison: 1 };
  updateActorStats(state.section, state.actor.id, { hp: 0 }, { cause: "script", hooks });
  advanceStatus(state.section, state.actor.id, 1, { hooks });
  applyEquipment(state.section, state.actor.id, [], [], hooks);
  awardExperience(state.section, state.actor.id, 10, hooks);
  ok(calls.includes("revive"));
  ok(calls.includes("statusChanged"));
  ok(calls.includes("equipmentChanged"));
  ok(calls.includes("levelUp"));
  ok(calls.includes("stats"));
});
