/**
 * Hydrate actor-owned state from the Epic 2 character and enemy readers.
 *
 * This module deliberately maps only the fields owned by `core/actors`
 * (docs/spec/engine/actors.md#act-inventory). Item definitions are not
 * actor records: board-item fields are hydrated by `sprites/actorFromSource`
 * and inventory fields have no section until Epic 8. Status `.ste` definitions
 * are owned by the status/battle packages; this adapter does not apply one to
 * every actor or invent a status-definition persistence layer.
 */
import type { Result } from "../formats/result.ts";
import type { Character, Enemy } from "../formats/actor/model.ts";
import {
  addActor,
  type ActorCreateInput,
  type ActorKind,
  type ActorRecord,
  type ActorsSection,
} from "./model.ts";

/** A character source may be a party member or an NPC; a player is party data. */
export type CharacterActorKind = Extract<ActorKind, "party" | "npc">;

/** Inputs shared by character and enemy hydration. */
export type ActorHydrationOptions = {
  /** A registered behaviour name; source formats do not contain executable behaviour. */
  readonly behaviour?: string | null;
};

/** One source entry accepted by `hydrateActorSources`. */
export type ActorHydrationSource =
  | {
      readonly kind: CharacterActorKind;
      readonly source: string;
      readonly character: Character;
      readonly options?: ActorHydrationOptions;
    }
  | {
      readonly kind: "enemy";
      readonly source: string;
      readonly enemy: Enemy;
      readonly options?: ActorHydrationOptions;
    };

/** Build actor-owned fields from a `.tem` character model. */
export function actorInputFromCharacter(
  source: string,
  kind: CharacterActorKind,
  character: Character,
  options: ActorHydrationOptions = {},
): ActorCreateInput {
  return {
    kind,
    source,
    name: character.name,
    stats: {
      experience: character.stats.experience,
      hp: character.stats.hp,
      maxHp: character.stats.maxHp,
      dp: character.stats.dp,
      fp: character.stats.fp,
      smp: character.stats.smp,
      maxSmp: character.stats.maxSmp,
      level: character.stats.level,
      // Characters have no critical values; the actor model's reader default
      // represents the format's "none" value.
      criticalOn: -1,
      criticalBy: -1,
    },
    progression: {
      levelType: character.firstLevelExp,
      experienceIncrease: character.experienceIncrease,
      maxLevel: character.maxLevel,
      levelHp: character.levelIncreases[0] ?? 0,
      levelDp: character.levelIncreases[1] ?? 0,
      levelFp: character.levelIncreases[2] ?? 0,
      levelSm: character.levelIncreases[3] ?? 0,
      levelUpType: character.levelUpType,
      remainingExperience: Math.max(0, character.firstLevelExp - character.stats.experience),
      nextRequirement: character.firstLevelExp,
      legacyLevelUp: character.levelUpProgram.length > 0,
    },
    behaviour: options.behaviour ?? null,
  };
}

/** Build actor-owned fields from an `.ene` enemy model. */
export function actorInputFromEnemy(
  source: string,
  enemy: Enemy,
  options: ActorHydrationOptions = {},
): ActorCreateInput {
  return {
    kind: "enemy",
    source,
    name: enemy.name,
    stats: {
      // Enemy experience is a battle reward, not actor progression data.
      experience: 0,
      hp: enemy.hp,
      maxHp: enemy.hp,
      dp: enemy.dp,
      fp: enemy.fp,
      smp: enemy.smp,
      maxSmp: enemy.smp,
      level: 0,
      criticalOn: enemy.criticalOn,
      criticalBy: enemy.criticalBy,
    },
    behaviour: options.behaviour ?? null,
  };
}

/** Add a character actor to its owner section. */
export function hydrateCharacterActor(
  section: ActorsSection,
  source: string,
  kind: CharacterActorKind,
  character: Character,
  options?: ActorHydrationOptions,
): ActorRecord {
  return addActor(section, actorInputFromCharacter(source, kind, character, options));
}

/** Add a player character to its owner section (players are party actors). */
export function hydratePlayerActor(
  section: ActorsSection,
  source: string,
  character: Character,
  options?: ActorHydrationOptions,
): ActorRecord {
  return hydrateCharacterActor(section, source, "party", character, options);
}

/** Add an enemy actor to its owner section. */
export function hydrateEnemyActor(
  section: ActorsSection,
  source: string,
  enemy: Enemy,
  options?: ActorHydrationOptions,
): ActorRecord {
  return addActor(section, actorInputFromEnemy(source, enemy, options));
}

/** Hydrate an ordered set of source assets; allocation follows source order. */
export function hydrateActorSources(
  section: ActorsSection,
  sources: readonly ActorHydrationSource[],
): ActorRecord[] {
  return sources.map((source) => source.kind === "enemy"
    ? hydrateEnemyActor(section, source.source, source.enemy, source.options)
    : hydrateCharacterActor(section, source.source, source.kind, source.character, source.options));
}

/**
 * Hydrate a character only when its reader succeeded, preserving reader diagnostics.
 * The adapter does not reinterpret reader defaults or invent a second error model.
 */
export function hydrateCharacterResult(
  section: ActorsSection,
  source: string,
  kind: CharacterActorKind,
  result: Result<Character>,
  options?: ActorHydrationOptions,
): Result<ActorRecord> {
  if (!result.ok) return result;
  return {
    ok: true,
    value: hydrateCharacterActor(section, source, kind, result.value, options),
    warnings: [...result.warnings],
  };
}

/** Hydrate an enemy only when its reader succeeded, preserving reader diagnostics. */
export function hydrateEnemyResult(
  section: ActorsSection,
  source: string,
  result: Result<Enemy>,
  options?: ActorHydrationOptions,
): Result<ActorRecord> {
  if (!result.ok) return result;
  return {
    ok: true,
    value: hydrateEnemyActor(section, source, result.value, options),
    warnings: [...result.warnings],
  };
}
