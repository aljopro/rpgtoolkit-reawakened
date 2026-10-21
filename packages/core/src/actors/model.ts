/**
 * Unified party, enemy and NPC actor data (AD-10, AD-32; ACT-1/ACT-3).
 *
 * Actor records are the saved data owned by `core/actors`. Runtime object
 * handles, emitter registrations and behaviour implementations are deliberately
 * absent; those are hydrated by later runtime layers.
 */
import { isRecord } from "../script/cells.ts";

/** The current actor-section schema (docs/spec/engine/actors.md#actor-data-and-identity). */
export const ACTORS_SCHEMA_VERSION = 2;

/** Actors share one record shape; the kind selects the source domain only. */
export const ACTOR_KINDS = ["party", "enemy", "npc"] as const;
export type ActorKind = (typeof ACTOR_KINDS)[number];

/** A stable scalar identity, distinct from a VM object handle. */
export type ActorId = number & { readonly __actorId: unique symbol };

/** The compatibility stats owned by an actor (20.2 inventory). */
export type ActorStats = {
  experience: number;
  hp: number;
  maxHp: number;
  dp: number;
  fp: number;
  smp: number;
  maxSmp: number;
  level: number;
  criticalOn: number;
  criticalBy: number;
};

/** Equipment references and the bonuses already derived by the actor owner. */
export type ActorEquipment = {
  equipped: string[];
  bonuses: ActorEquipmentBonuses;
};

export type ActorEquipmentBonuses = {
  hp: number;
  dp: number;
  fp: number;
  smp: number;
};

/** Plain progression policy data; executable level-up programs are not actor state. */
export type ActorProgression = {
  levelType: number;
  experienceIncrease: number;
  maxLevel: number;
  levelHp: number;
  levelDp: number;
  levelFp: number;
  levelSm: number;
  levelUpType: number;
  /** XP still required before the next level threshold. */
  remainingExperience: number;
  /** Requirement used to derive the next threshold after a level-up. */
  nextRequirement: number;
  /** Source supplied a non-empty legacy level-up program; null means source resolution is pending. */
  legacyLevelUp: boolean | null;
};

/** One actor record in the owned state section. */
export type ActorRecord = {
  id: ActorId;
  kind: ActorKind;
  source: string;
  name: string;
  stats: ActorStats;
  statuses: { [status: string]: number };
  equipment: ActorEquipment;
  progression: ActorProgression;
  behaviour: string | null;
  customEvents: string[];
};

/** Inputs accepted by the actor owner when an asset or package creates an actor. */
export type ActorCreateInput = {
  readonly id?: ActorId | number;
  readonly kind: ActorKind;
  readonly source: string;
  readonly name?: string;
  readonly stats?: Partial<ActorStats>;
  readonly statuses?: Readonly<Record<string, number>>;
  readonly equipment?: {
    readonly equipped?: readonly string[];
    readonly bonuses?: Partial<ActorEquipmentBonuses>;
  };
  readonly progression?: Partial<ActorProgression>;
  readonly behaviour?: string | null;
  readonly customEvents?: readonly string[];
};

/** A plain-data patch accepted by the section owner. */
export type ActorPatch = {
  readonly name?: string;
  readonly stats?: Partial<ActorStats>;
  readonly statuses?: Readonly<Record<string, number>>;
  readonly equipment?: {
    readonly equipped?: readonly string[];
    readonly bonuses?: Partial<ActorEquipmentBonuses>;
  };
  readonly progression?: Partial<ActorProgression>;
  readonly behaviour?: string | null;
  readonly customEvents?: readonly string[];
};

/** An action is data; the service below validates and commits it. */
export type ActorAction =
  | { readonly type: "create"; readonly actor: ActorCreateInput }
  | { readonly type: "patch"; readonly id: ActorId | number; readonly patch: ActorPatch }
  | { readonly type: "remove"; readonly id: ActorId | number };

/** AD-10 actor-owned state. `nextId` is monotonic and is saved with the records. */
export type ActorsSection = {
  version: number;
  nextId: number;
  actors: ActorRecord[];
};

const ZERO_STATS: ActorStats = {
  experience: 0,
  hp: 0,
  maxHp: 0,
  dp: 0,
  fp: 0,
  smp: 0,
  maxSmp: 0,
  level: 0,
  criticalOn: -1,
  criticalBy: -1,
};

const ZERO_BONUSES: ActorEquipmentBonuses = { hp: 0, dp: 0, fp: 0, smp: 0 };

const ZERO_PROGRESSION: ActorProgression = {
  levelType: 0,
  experienceIncrease: 0,
  maxLevel: 0,
  levelHp: 0,
  levelDp: 0,
  levelFp: 0,
  levelSm: 0,
  levelUpType: 0,
  remainingExperience: 0,
  nextRequirement: 0,
  legacyLevelUp: false,
};

/** Convert an untrusted numeric value to an actor id. */
export function actorId(value: number): ActorId {
  if (!Number.isSafeInteger(value) || value < 1) throw new RangeError(`actor id must be a positive safe integer: ${value}`);
  return value as ActorId;
}

/** The built-in emitter key for an actor. The key is runtime identity, not saved identity. */
export function actorEmitterKey(id: ActorId | number): string {
  return `actor:${actorId(id)}`;
}

/** A fresh actor section. */
export function createActorsSection(): ActorsSection {
  return { version: ACTORS_SCHEMA_VERSION, nextId: 1, actors: [] };
}

function safeInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new RangeError(`${field} must be a safe integer`);
  return value;
}

function stringList(values: readonly unknown[] | undefined, field: string): string[] {
  const result = [...(values ?? [])];
  if (!result.every((value) => typeof value === "string")) throw new TypeError(`${field} must contain strings`);
  return result;
}

function stats(values: Partial<ActorStats> | undefined): ActorStats {
  return {
    experience: safeInteger(values?.experience ?? ZERO_STATS.experience, "stats.experience"),
    hp: safeInteger(values?.hp ?? ZERO_STATS.hp, "stats.hp"),
    maxHp: safeInteger(values?.maxHp ?? ZERO_STATS.maxHp, "stats.maxHp"),
    dp: safeInteger(values?.dp ?? ZERO_STATS.dp, "stats.dp"),
    fp: safeInteger(values?.fp ?? ZERO_STATS.fp, "stats.fp"),
    smp: safeInteger(values?.smp ?? ZERO_STATS.smp, "stats.smp"),
    maxSmp: safeInteger(values?.maxSmp ?? ZERO_STATS.maxSmp, "stats.maxSmp"),
    level: safeInteger(values?.level ?? ZERO_STATS.level, "stats.level"),
    criticalOn: safeInteger(values?.criticalOn ?? ZERO_STATS.criticalOn, "stats.criticalOn"),
    criticalBy: safeInteger(values?.criticalBy ?? ZERO_STATS.criticalBy, "stats.criticalBy"),
  };
}

function bonuses(values: Partial<ActorEquipmentBonuses> | undefined): ActorEquipmentBonuses {
  return {
    hp: safeInteger(values?.hp ?? ZERO_BONUSES.hp, "equipment.bonuses.hp"),
    dp: safeInteger(values?.dp ?? ZERO_BONUSES.dp, "equipment.bonuses.dp"),
    fp: safeInteger(values?.fp ?? ZERO_BONUSES.fp, "equipment.bonuses.fp"),
    smp: safeInteger(values?.smp ?? ZERO_BONUSES.smp, "equipment.bonuses.smp"),
  };
}

function progression(values: Partial<ActorProgression> | undefined): ActorProgression {
  const legacyLevelUp = values?.legacyLevelUp === undefined ? ZERO_PROGRESSION.legacyLevelUp : values.legacyLevelUp;
  if (typeof legacyLevelUp !== "boolean" && legacyLevelUp !== null) throw new TypeError("progression.legacyLevelUp must be boolean or null");
  return {
    levelType: safeInteger(values?.levelType ?? ZERO_PROGRESSION.levelType, "progression.levelType"),
    experienceIncrease: safeInteger(values?.experienceIncrease ?? ZERO_PROGRESSION.experienceIncrease, "progression.experienceIncrease"),
    maxLevel: safeInteger(values?.maxLevel ?? ZERO_PROGRESSION.maxLevel, "progression.maxLevel"),
    levelHp: safeInteger(values?.levelHp ?? ZERO_PROGRESSION.levelHp, "progression.levelHp"),
    levelDp: safeInteger(values?.levelDp ?? ZERO_PROGRESSION.levelDp, "progression.levelDp"),
    levelFp: safeInteger(values?.levelFp ?? ZERO_PROGRESSION.levelFp, "progression.levelFp"),
    levelSm: safeInteger(values?.levelSm ?? ZERO_PROGRESSION.levelSm, "progression.levelSm"),
    levelUpType: safeInteger(values?.levelUpType ?? ZERO_PROGRESSION.levelUpType, "progression.levelUpType"),
    remainingExperience: safeInteger(values?.remainingExperience ?? ZERO_PROGRESSION.remainingExperience, "progression.remainingExperience"),
    nextRequirement: safeInteger(values?.nextRequirement ?? ZERO_PROGRESSION.nextRequirement, "progression.nextRequirement"),
    legacyLevelUp,
  };
}

function statusCounters(values: Readonly<Record<string, number>> | undefined): { [status: string]: number } {
  const result: { [status: string]: number } = {};
  for (const [name, count] of Object.entries(values ?? {})) {
    const safeCount = safeInteger(count, `statuses.${name}`);
    Object.defineProperty(result, name, { value: safeCount, enumerable: true, writable: true, configurable: true });
  }
  return result;
}

function validateProgression(statsValue: ActorStats, progressionValue: ActorProgression): void {
  for (const [name, value] of Object.entries(progressionValue)) {
    if (name === "legacyLevelUp") continue;
    safeInteger(value, `progression.${name}`);
  }
  if (typeof progressionValue.legacyLevelUp !== "boolean" && progressionValue.legacyLevelUp !== null) throw new TypeError("progression.legacyLevelUp must be boolean or null");
  if (
    progressionValue.levelType < 0
    || progressionValue.experienceIncrease < 0
    || progressionValue.maxLevel < 0
    || progressionValue.levelHp < 0
    || progressionValue.levelDp < 0
    || progressionValue.levelFp < 0
    || progressionValue.levelSm < 0
    || ![0, 1].includes(progressionValue.levelUpType)
    || progressionValue.remainingExperience < 0
    || progressionValue.nextRequirement < 0
  ) throw new RangeError("invalid actor progression policy");
  if (!Number.isSafeInteger(statsValue.level) || statsValue.level < 0 || !Number.isSafeInteger(statsValue.experience) || statsValue.experience < 0) {
    throw new RangeError("invalid actor progression stats");
  }
  if (progressionValue.maxLevel > 0 && statsValue.level < progressionValue.maxLevel && progressionValue.nextRequirement <= 0) {
    throw new RangeError("invalid actor progression threshold");
  }
}

/** Validate progression policy and persisted state against actor stats. */
export function validateActorProgression(statsValue: ActorStats, progressionValue: ActorProgression): void {
  validateProgression(statsValue, progressionValue);
}

function validateRecord(record: ActorRecord): void {
  if (record.stats.maxHp < 0 || record.stats.maxSmp < 0) throw new RangeError("actor maximum stats must not be negative");
  validateProgression(record.stats, record.progression);
}

/** Build one actor record without retaining any caller-owned arrays or methods. */
export function createActorRecord(id: ActorId | number, input: ActorCreateInput): ActorRecord {
  const stableId = actorId(id);
  if (!ACTOR_KINDS.includes(input.kind)) throw new RangeError(`unknown actor kind: ${String(input.kind)}`);
  if (typeof input.source !== "string" || input.source.length === 0) throw new RangeError("actor source must not be empty");
  if (input.source.toLowerCase().endsWith(".prg")) throw new RangeError("actor source must be an asset, not a raw program path");
  if (input.name !== undefined && typeof input.name !== "string") throw new TypeError("actor name must be a string");
  if (input.behaviour !== undefined && input.behaviour !== null && typeof input.behaviour !== "string") throw new TypeError("actor behaviour must be a name");
  const record: ActorRecord = {
    id: stableId,
    kind: input.kind,
    source: input.source,
    name: input.name ?? input.source,
    stats: stats(input.stats),
    statuses: statusCounters(input.statuses),
    equipment: {
      equipped: stringList(input.equipment?.equipped, "equipment.equipped"),
      bonuses: bonuses(input.equipment?.bonuses),
    },
    progression: progression(input.progression),
    behaviour: input.behaviour ?? null,
    customEvents: stringList(input.customEvents, "customEvents"),
  };
  validateRecord(record);
  return record;
}

/** Add an actor with a deterministic monotonically allocated id. */
export function addActor(section: ActorsSection, input: ActorCreateInput): ActorRecord {
  const id = input.id ?? actorId(section.nextId);
  if (section.actors.some((actor) => actor.id === id)) throw new RangeError(`actor id is already in use: ${id}`);
  const record = createActorRecord(id, input);
  section.actors.push(record);
  section.nextId = Math.max(section.nextId, id + 1);
  return record;
}

/** Find the owner-held record; callers must use owner operations to replace it. */
export function getActor(section: ActorsSection, id: ActorId | number): ActorRecord | null {
  const stableId = actorId(id);
  return section.actors.find((actor) => actor.id === stableId) ?? null;
}

function patchedActor(actor: ActorRecord, patch: ActorPatch): ActorRecord {
  if (patch.name !== undefined && typeof patch.name !== "string") throw new TypeError("actor name must be a string");
  if (patch.behaviour !== undefined && patch.behaviour !== null && typeof patch.behaviour !== "string") throw new TypeError("actor behaviour must be a name");
  const equipment = patch.equipment;
  const customEvents = patch.customEvents === undefined ? actor.customEvents : stringList(patch.customEvents, "customEvents");
  return {
    ...actor,
    name: patch.name ?? actor.name,
    stats: patch.stats === undefined ? actor.stats : stats({ ...actor.stats, ...patch.stats }),
    statuses: patch.statuses === undefined ? actor.statuses : statusCounters(patch.statuses),
    equipment: equipment === undefined ? actor.equipment : {
      equipped: stringList(equipment.equipped ?? actor.equipment.equipped, "equipment.equipped"),
      bonuses: bonuses({ ...actor.equipment.bonuses, ...equipment.bonuses }),
    },
    progression: patch.progression === undefined ? actor.progression : progression({ ...actor.progression, ...patch.progression }),
    behaviour: patch.behaviour === undefined ? actor.behaviour : patch.behaviour,
    customEvents,
  };
}

/** Validate and commit a plain-data actor patch. */
export function patchActor(section: ActorsSection, id: ActorId | number, patch: ActorPatch): ActorRecord | null {
  const stableId = actorId(id);
  const index = section.actors.findIndex((actor) => actor.id === stableId);
  if (index < 0) return null;
  const updated = patchedActor(section.actors[index]!, patch);
  validateRecord(updated);
  section.actors[index] = updated;
  return updated;
}

/** Remove an actor without reusing its allocated id. */
export function removeActor(section: ActorsSection, id: ActorId | number): boolean {
  const stableId = actorId(id);
  const index = section.actors.findIndex((actor) => actor.id === stableId);
  if (index < 0) return false;
  section.actors.splice(index, 1);
  return true;
}

/** Apply one data action through the actor owner. */
export function applyActorAction(section: ActorsSection, action: ActorAction): ActorRecord | null {
  if (action.type === "create") return addActor(section, action.actor);
  if (action.type === "patch") return patchActor(section, action.id, action.patch);
  removeActor(section, action.id);
  return null;
}

/** Reset the actor owner to an empty section while retaining the section object. */
export function resetActorsSection(section: ActorsSection): void {
  section.version = ACTORS_SCHEMA_VERSION;
  section.nextId = 1;
  section.actors = [];
}
function isSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function isStats(value: unknown): value is ActorStats {
  if (!isRecord(value)) return false;
  return ["experience", "hp", "maxHp", "dp", "fp", "smp", "maxSmp", "level", "criticalOn", "criticalBy"].every((key) => isSafeInteger(value[key]))
    && (value.maxHp as number) >= 0
    && (value.maxSmp as number) >= 0;
}

function isBonuses(value: unknown): value is ActorEquipmentBonuses {
  if (!isRecord(value)) return false;
  return ["hp", "dp", "fp", "smp"].every((key) => isSafeInteger(value[key]));
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  return isRecord(value) && Object.values(value).every((entry) => isSafeInteger(entry) && entry >= 0);
}

function isProgression(value: unknown, statsValue: ActorStats): value is ActorProgression {
  if (!isRecord(value) || (value.legacyLevelUp !== null && typeof value.legacyLevelUp !== "boolean")) return false;
  const keys = ["levelType", "experienceIncrease", "maxLevel", "levelHp", "levelDp", "levelFp", "levelUpType", "remainingExperience", "nextRequirement"] as const;
  if (!keys.every((key) => isSafeInteger(value[key]))) return false;
  try {
    validateProgression(statsValue, value as unknown as ActorProgression);
    return true;
  } catch {
    return false;
  }
}

/** Runtime shape guard used by snapshot restore. */
export function isActorRecord(value: unknown): value is ActorRecord {
  if (!isRecord(value) || !Number.isSafeInteger(value.id) || (value.id as number) < 1) return false;
  if (!ACTOR_KINDS.includes(value.kind as ActorKind) || typeof value.source !== "string" || value.source.length === 0 || typeof value.name !== "string") return false;
  if (!isStats(value.stats) || !isNumberRecord(value.statuses)) return false;
  const equipmentValue = value.equipment;
  if (!isRecord(equipmentValue) || !Array.isArray(equipmentValue.equipped) || !equipmentValue.equipped.every((entry) => typeof entry === "string") || !isBonuses(equipmentValue.bonuses)) return false;
  if (!isProgression(value.progression, value.stats)) return false;
  if (value.behaviour !== null && typeof value.behaviour !== "string") return false;
  return Array.isArray(value.customEvents) && value.customEvents.every((entry) => typeof entry === "string");
}

/** Runtime shape guard used by snapshot restore. */
export function asActorsSection(value: unknown): ActorsSection | null {
  if (!isRecord(value) || value.version !== ACTORS_SCHEMA_VERSION || !Array.isArray(value.actors)) return null;
  const nextId = value.nextId;
  if (!isSafeInteger(nextId) || nextId < 1) return null;
  const actors = value.actors;
  if (!actors.every(isActorRecord)) return null;
  const ids = new Set(actors.map((actor) => actor.id));
  if (ids.size !== actors.length || actors.some((actor) => actor.id >= nextId)) return null;
  return value as unknown as ActorsSection;
}
