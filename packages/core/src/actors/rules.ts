import {
  actorId,
  getActor,
  patchActor,
  type ActorId,
  type ActorProgression,
  type ActorRecord,
  type ActorStats,
  type ActorsSection,
  type ActorEquipmentBonuses,
} from "./model.ts";

export const ACTOR_FALLEN_CAUSES = ["damage", "status", "script"] as const;
export type ActorFallenCause = (typeof ACTOR_FALLEN_CAUSES)[number];
export type ActorSource = ActorId | number | null;

type NumericStat = keyof ActorStats;
const NUMERIC_STATS: readonly NumericStat[] = ["experience", "hp", "maxHp", "dp", "fp", "smp", "maxSmp", "level", "criticalOn", "criticalBy"];
const LEVEL_STATS = ["maxHp", "dp", "fp", "maxSmp"] as const;
type LevelStat = (typeof LEVEL_STATS)[number];

export type ActorTransition =
  | { readonly type: "fallen"; readonly actorId: ActorId; readonly cause: ActorFallenCause; readonly source: ActorId | null }
  | { readonly type: "revived"; readonly actorId: ActorId; readonly cause: ActorFallenCause; readonly source: ActorId | null }
  | { readonly type: "statusChanged"; readonly actorId: ActorId; readonly status: string; readonly previousRounds: number; readonly rounds: number; readonly expired: boolean; readonly source: ActorId | null }
  | { readonly type: "equipmentChanged"; readonly actorId: ActorId; readonly equipped: readonly string[]; readonly bonuses: ActorEquipmentBonuses }
  | { readonly type: "statsChanged"; readonly actorId: ActorId; readonly stats: ActorStats; readonly changed: readonly NumericStat[] }
  | { readonly type: "leveledUp"; readonly actorId: ActorId; readonly level: number; readonly experience: number; readonly applied: Readonly<Partial<Record<LevelStat, number>>> };

export type ActorRuleResult = {
  readonly actor: ActorRecord;
  readonly transitions: readonly ActorTransition[];
};

export type StatsChangedContext = {
  readonly operation: "stats" | "equipment" | "levelUp";
  readonly previous: ActorStats;
  readonly proposal: ActorStats;
};
export type StatusChangedContext = {
  readonly status: string;
  readonly previousRounds: number;
  readonly rounds: number;
  readonly source: ActorId | null;
};
export type EquipmentChangedContext = {
  readonly equipped: readonly string[];
  readonly bonuses: ActorEquipmentBonuses;
  readonly previous: ActorEquipmentBonuses;
};
export type ReviveContext = {
  readonly cause: ActorFallenCause;
  readonly source: ActorId | null;
  readonly hp: number;
};
export type LevelUpContext = {
  readonly award: number;
  readonly level: number;
  readonly proposal: Readonly<LevelUpProposal>;
};

export type LevelUpProposal = {
  readonly level: number;
  readonly deltas: Readonly<Partial<Record<LevelStat, number>>>;
  readonly nextRequirement: number;
  readonly remainingExperience: number;
};

export type ActorHooks = {
  readonly levelUp?: (actor: Readonly<ActorRecord>, context: LevelUpContext) => LevelUpHookResult;
  readonly revive?: (actor: Readonly<ActorRecord>, context: ReviveContext) => ReviveHookResult;
  readonly statusChanged?: (actor: Readonly<ActorRecord>, context: StatusChangedContext) => StatusHookResult;
  readonly equipmentChanged?: (actor: Readonly<ActorRecord>, context: EquipmentChangedContext) => EquipmentHookResult;
  readonly statsChanged?: (actor: Readonly<ActorRecord>, context: StatsChangedContext) => StatsHookResult;
};

export type StatsHookResult = Partial<ActorStats>;
export type ReviveHookResult = { readonly hp?: number };
export type StatusHookResult = { readonly rounds?: number };
export type EquipmentHookResult = {
  readonly equipped?: readonly string[];
  readonly bonuses?: Partial<ActorEquipmentBonuses>;
};
export type LevelUpHookResult = {
  readonly deltas?: Partial<Record<LevelStat, number>>;
  readonly stats?: Partial<ActorStats>;
};

export type StatsChangeOptions = {
  readonly cause: ActorFallenCause;
  readonly source?: ActorSource;
  readonly hooks?: ActorHooks;
};

function record(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError(`${name} hook must return a plain object`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${name} hook must return a plain object`);
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined || typeof entry === "function") throw new TypeError(`${name} hook returned invalid ${key}`);
  }
  return value as Record<string, unknown>;
}

function finite(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new RangeError(`${field} must be finite`);
  return value;
}

function integer(value: unknown, field: string): number {
  const result = finite(value, field);
  if (!Number.isSafeInteger(result)) throw new RangeError(`${field} must be a safe integer`);
  return result;
}

function actorSource(value: ActorSource | undefined): ActorId | null {
  if (value === undefined || value === null) return null;
  return actorId(value);
}

function cause(value: unknown): ActorFallenCause {
  if (!ACTOR_FALLEN_CAUSES.includes(value as ActorFallenCause)) throw new RangeError(`invalid fallen cause: ${String(value)}`);
  return value as ActorFallenCause;
}

function clamp(value: number, maximum: number, field: string): number {
  if (maximum < 0) throw new RangeError(`${field} maximum must not be negative`);
  return Math.max(0, Math.min(maximum, value));
}

function statsWithPatch(base: ActorStats, patch: Partial<ActorStats>): ActorStats {
  for (const key of Object.keys(patch)) {
    if (!(NUMERIC_STATS as readonly string[]).includes(key)) throw new RangeError(`unknown actor stat: ${key}`);
    integer(patch[key as NumericStat], `stats.${key}`);
  }
  const result = { ...base, ...patch };
  result.hp = clamp(result.hp, result.maxHp, "stats.hp");
  result.smp = clamp(result.smp, result.maxSmp, "stats.smp");
  return result;
}

function changedStats(before: ActorStats, after: ActorStats): NumericStat[] {
  return NUMERIC_STATS.filter((key) => before[key] !== after[key]) as NumericStat[];
}

function statsTransition(id: ActorId, stats: ActorStats, changed: readonly NumericStat[]): ActorTransition | null {
  return changed.length === 0 ? null : { type: "statsChanged", actorId: id, stats, changed };
}

function applyStatsHook(actor: ActorRecord, previous: ActorStats, proposal: ActorStats, operation: StatsChangedContext["operation"], hooks: ActorHooks | undefined): ActorStats {
  const hook = hooks?.statsChanged;
  if (hook === undefined) return proposal;
  const result = record(hook(actor, { operation, previous, proposal }), "statsChanged") as Partial<ActorStats>;
  return statsWithPatch(proposal, result);
}

/** Apply an owner-backed absolute stat patch and return fallen/revival transitions. */
export function updateActorStats(section: ActorsSection, id: ActorId | number, patch: Partial<ActorStats>, options: StatsChangeOptions): ActorRuleResult | null {
  const stableId = actorId(id);
  const actor = getActor(section, stableId);
  if (actor === null) return null;
  const fallenCause = cause(options.cause);
  const source = actorSource(options.source);
  const previous = actor.stats;
  let proposal = statsWithPatch(previous, patch);
  const wasFallen = previous.hp <= 0;
  const shouldRevive = wasFallen && proposal.hp > 0;
  if (shouldRevive && options.hooks?.revive !== undefined) {
    const result = record(options.hooks.revive(actor, { cause: fallenCause, source, hp: proposal.hp }), "revive") as ReviveHookResult;
    proposal = statsWithPatch(proposal, result);
  }
  proposal = applyStatsHook(actor, previous, proposal, "stats", options.hooks);
  const changed = changedStats(previous, proposal);
  if (changed.length > 0) patchActor(section, stableId, { stats: proposal });
  const current = getActor(section, stableId);
  if (current === null) return null;
  const transitions: ActorTransition[] = [];
  const statChange = statsTransition(stableId, current.stats, changed);
  if (statChange !== null) transitions.push(statChange);
  if (!wasFallen && current.stats.hp <= 0) transitions.push({ type: "fallen", actorId: stableId, cause: fallenCause, source });
  if (wasFallen && current.stats.hp > 0) transitions.push({ type: "revived", actorId: stableId, cause: fallenCause, source });
  return { actor: current, transitions };
}

export type AdvanceStatusOptions = { readonly source?: ActorSource; readonly hooks?: ActorHooks };

/** Age every actor status by a caller-defined non-negative integer amount. */
export function advanceStatus(section: ActorsSection, id: ActorId | number, amount: number, options: AdvanceStatusOptions = {}): ActorRuleResult | null {
  const stableId = actorId(id);
  const actor = getActor(section, stableId);
  if (actor === null) return null;
  const age = integer(amount, "status advance");
  if (age < 0) throw new RangeError("status advance must not be negative");
  const source = actorSource(options.source);
  const nextStatuses: Record<string, number> = {};
  const transitions: ActorTransition[] = [];
  for (const status of Object.keys(actor.statuses).sort()) {
    const previousRounds = integer(actor.statuses[status], `statuses.${status}`);
    if (previousRounds < 0) throw new RangeError(`statuses.${status} must not be negative`);
    let rounds = previousRounds - age;
    if (options.hooks?.statusChanged !== undefined) {
      const result = record(options.hooks.statusChanged(actor, { status, previousRounds, rounds, source }), "statusChanged") as StatusHookResult;
      if (result.rounds !== undefined) rounds = integer(result.rounds, `status ${status} rounds`);
    }
    if (rounds < 0) rounds = 0;
    const expired = rounds === 0;
    if (!expired) nextStatuses[status] = rounds;
    transitions.push({ type: "statusChanged", actorId: stableId, status, previousRounds, rounds, expired, source });
  }
  patchActor(section, stableId, { statuses: nextStatuses });
  const current = getActor(section, stableId);
  if (current === null) return null;
  return { actor: current, transitions };
}

export type EquipmentItemDefinition = {
  readonly name: string;
  readonly equipBonus: readonly number[];
  readonly id?: string;
};

function equipmentBonuses(items: readonly EquipmentItemDefinition[], equipped: readonly string[]): ActorEquipmentBonuses {
  const result = { hp: 0, dp: 0, fp: 0, smp: 0 };
  for (const reference of equipped) {
    if (typeof reference !== "string" || reference.length === 0) throw new TypeError("equipment references must be non-empty strings");
    const item = items.find((candidate) => candidate.name === reference || candidate.id === reference);
    if (item === undefined) throw new RangeError(`unknown equipped item: ${reference}`);
    if (!Array.isArray(item.equipBonus) || item.equipBonus.length !== 4) throw new TypeError(`item ${reference} must have four equip bonuses`);
    item.equipBonus.forEach((value, index) => integer(value, `item ${reference} equipBonus[${index}]`));
    result.hp += item.equipBonus[0]!;
    result.dp += item.equipBonus[1]!;
    result.fp += item.equipBonus[2]!;
    result.smp += item.equipBonus[3]!;
  }
  return result;
}

/** Derive and apply equipment bonuses from an immutable item catalog. */
export function applyEquipment(section: ActorsSection, id: ActorId | number, equipped: readonly string[], items: readonly EquipmentItemDefinition[], hooks: ActorHooks = {}): ActorRuleResult | null {
  const stableId = actorId(id);
  const actor = getActor(section, stableId);
  if (actor === null) return null;
  if (!Array.isArray(equipped) || equipped.some((entry) => typeof entry !== "string")) throw new TypeError("equipment references must be strings");
  const previousBonuses = actor.equipment.bonuses;
  let nextEquipped = [...equipped];
  let nextBonuses = equipmentBonuses(items, nextEquipped);
  if (hooks.equipmentChanged !== undefined) {
    const result = record(hooks.equipmentChanged(actor, { equipped: nextEquipped, bonuses: nextBonuses, previous: previousBonuses }), "equipmentChanged") as EquipmentHookResult;
    if (result.equipped !== undefined) {
      if (!Array.isArray(result.equipped) || result.equipped.some((entry) => typeof entry !== "string")) throw new TypeError("equipmentChanged equipped must be strings");
      nextEquipped = [...result.equipped];
      nextBonuses = equipmentBonuses(items, nextEquipped);
    }
    if (result.bonuses !== undefined) {
      const merged = { ...nextBonuses, ...result.bonuses };
      nextBonuses = {
        hp: integer(merged.hp, "equipment.bonuses.hp"),
        dp: integer(merged.dp, "equipment.bonuses.dp"),
        fp: integer(merged.fp, "equipment.bonuses.fp"),
        smp: integer(merged.smp, "equipment.bonuses.smp"),
      };
    }
  }
  let stats = { ...actor.stats };
  stats.maxHp += nextBonuses.hp - previousBonuses.hp;
  stats.dp += nextBonuses.dp - previousBonuses.dp;
  stats.fp += nextBonuses.fp - previousBonuses.fp;
  stats.maxSmp += nextBonuses.smp - previousBonuses.smp;
  stats = statsWithPatch(stats, {});
  stats = applyStatsHook(actor, actor.stats, stats, "equipment", hooks);
  const changed = changedStats(actor.stats, stats);
  patchActor(section, stableId, { equipment: { equipped: nextEquipped, bonuses: nextBonuses }, stats });
  const current = getActor(section, stableId);
  if (current === null) return null;
  const transitions: ActorTransition[] = [{ type: "equipmentChanged", actorId: stableId, equipped: [...nextEquipped], bonuses: nextBonuses }];
  const statChange = statsTransition(stableId, current.stats, changed);
  if (statChange !== null) transitions.push(statChange);
  return { actor: current, transitions };
}

function progressionInput(actor: ActorRecord): ActorProgression {
  const progression = actor.progression;
  for (const key of ["levelType", "experienceIncrease", "maxLevel", "levelHp", "levelDp", "levelFp", "levelSm", "levelUpType", "remainingExperience", "nextRequirement"] as const) integer(progression[key], `progression.${key}`);
  if (progression.levelType < 0 || progression.experienceIncrease < 0 || progression.maxLevel < 0 || progression.levelUpType < 0 || progression.levelUpType > 1) throw new RangeError("invalid actor progression policy");
  if (progression.maxLevel > 0 && actor.stats.level < progression.maxLevel && (progression.nextRequirement <= 0 || progression.remainingExperience < 0)) throw new RangeError("invalid actor progression threshold");
  integer(actor.stats.experience, "stats.experience");
  if (actor.stats.experience < 0 || actor.stats.level < 0) throw new RangeError("invalid actor progression stats");
  return progression;
}

function growth(base: number, configured: number, type: number): number {
  return type === 0 ? Math.trunc(base * configured / 100) : configured;
}

function levelDeltas(actor: ActorRecord, progression: ActorProgression): Partial<Record<LevelStat, number>> {
  return {
    maxHp: growth(actor.stats.maxHp - actor.equipment.bonuses.hp, progression.levelHp, progression.levelUpType),
    dp: growth(actor.stats.dp - actor.equipment.bonuses.dp, progression.levelDp, progression.levelUpType),
    fp: growth(actor.stats.fp - actor.equipment.bonuses.fp, progression.levelFp, progression.levelUpType),
    maxSmp: growth(actor.stats.maxSmp - actor.equipment.bonuses.smp, progression.levelSm, progression.levelUpType),
  };
}

function applyLevelDelta(stats: ActorStats, deltas: Partial<Record<LevelStat, number>>): ActorStats {
  const next = { ...stats };
  for (const stat of LEVEL_STATS) {
    const delta = deltas[stat] ?? 0;
    integer(delta, `level-up ${stat} delta`);
    next[stat] += delta;
  }
  return statsWithPatch(next, {});
}

/** Award integer XP, applying every crossed level threshold synchronously. */
export function awardExperience(section: ActorsSection, id: ActorId | number, amount: number, hooks: ActorHooks = {}): ActorRuleResult | null {
  const stableId = actorId(id);
  const actor = getActor(section, stableId);
  if (actor === null) return null;
  const award = integer(amount, "experience award");
  if (award < 0) throw new RangeError("experience award must not be negative");
  const progression = progressionInput(actor);
  let experience = actor.stats.experience + award;
  if (!Number.isSafeInteger(experience)) throw new RangeError("total experience must be a safe integer");
  let level = integer(actor.stats.level, "stats.level");
  let remaining = progression.remainingExperience;
  let nextRequirement = progression.nextRequirement;
  let stats = actor.stats;
  const transitions: ActorTransition[] = [];
  if (progression.maxLevel > 0 && level < progression.maxLevel) {
    remaining -= award;
    while (remaining <= 0 && level < progression.maxLevel) {
      const proposedLevel = level + 1;
      let deltas = levelDeltas({ ...actor, stats, progression: { ...progression, level } }, progression);
      const proposal: LevelUpProposal = { level: proposedLevel, deltas, nextRequirement, remainingExperience: remaining };
      if (!progression.legacyLevelUp && hooks.levelUp !== undefined) {
        const hookResult = record(hooks.levelUp({ ...actor, stats }, { award, level: proposedLevel, proposal }), "levelUp") as LevelUpHookResult;
        if (hookResult.deltas !== undefined) deltas = { ...deltas, ...hookResult.deltas };
        if (hookResult.stats !== undefined) stats = statsWithPatch(stats, hookResult.stats);
      }
      stats = applyLevelDelta(stats, deltas);
      level = proposedLevel;
      transitions.push({ type: "leveledUp", actorId: stableId, level, experience, applied: { ...deltas } });
      if (level >= progression.maxLevel) {
        remaining = 0;
        break;
      }
      const oldRequirement = nextRequirement;
      if (oldRequirement <= 0) throw new RangeError("invalid actor progression threshold");
      nextRequirement = progression.levelUpType === 0
        ? oldRequirement + Math.trunc(oldRequirement * progression.experienceIncrease / 100)
        : oldRequirement + progression.experienceIncrease;
      if (!Number.isSafeInteger(nextRequirement) || nextRequirement <= 0) throw new RangeError("invalid actor progression threshold");
      remaining += nextRequirement;
    }
  }
  stats = { ...stats, level, experience };
  stats = applyStatsHook(actor, actor.stats, stats, "levelUp", hooks);
  const changed = changedStats(actor.stats, stats);
  patchActor(section, stableId, {
    stats,
    progression: { remainingExperience: remaining, nextRequirement },
  });
  const current = getActor(section, stableId);
  if (current === null) return null;
  const statChange = statsTransition(stableId, current.stats, changed);
  if (statChange !== null) transitions.push(statChange);
  return { actor: current, transitions };
}
