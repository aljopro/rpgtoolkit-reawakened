import { actorId, getActor, patchActor, type ActorId, type ActorPatch, type ActorRecord, type ActorStats, type ActorsSection } from "./model.ts";
import type { HostObjectType } from "../script/host.ts";
import type { Value } from "../ports/value.ts";

/**
 * The actor-owned stats path used by legacy aliases (AD-10, E-85).
 *
 * Reads return the owner-held stats record rather than copying it into
 * `vm.globals`; writes replace that record through the actor owner.
 */
export type StatsPort = {
  read(actor: ActorId | number): Readonly<ActorStats> | null;
  write(actor: ActorId | number, patch: Partial<ActorStats>): boolean;
};

/** The owner seam used by script views; runtime objects never own actor data. */
export type ActorService = StatsPort & {
  readActor(actor: ActorId | number): Readonly<ActorRecord> | null;
  patchActor(actor: ActorId | number, patch: ActorPatch): Readonly<ActorRecord> | null;
  activeActor(): Readonly<ActorRecord> | null;
};

/** Create the owner service over the one authoritative actor section. */
export function createActorService(section: ActorsSection): ActorService {
  const stats = createStatsPort(section);
  return {
    read(actor) {
      return stats.read(actor);
    },
    write(actor, patch) {
      return stats.write(actor, patch);
    },
    readActor(actor) {
      return getActor(section, actorId(actor));
    },
    patchActor(actor, patch) {
      return patchActor(section, actorId(actor), patch);
    },
    activeActor() {
      const party = section.actors.find((candidate) => candidate.kind === "party");
      return party ?? section.actors[0] ?? null;
    },
  };
}

/** Create the StatsPort view over the one authoritative actor section. */
export function createStatsPort(section: ActorsSection): StatsPort {
  return {
    read(actor) {
      return getActor(section, actorId(actor))?.stats ?? null;
    },
    write(actor, patch) {
      return patchActor(section, actorId(actor), { stats: patch }) !== null;
    },
  };
}

const ACTOR_STAT_FIELDS: Readonly<Record<string, keyof ActorStats>> = {
  experience: "experience",
  hp: "hp",
  maxhp: "maxHp",
  dp: "dp",
  fp: "fp",
  smp: "smp",
  maxsmp: "maxSmp",
  level: "level",
  criticalon: "criticalOn",
  criticalby: "criticalBy",
};

function actorIdFromEmitter(context: { readonly events: { readonly emitters?: Readonly<Record<string, number>> }; readonly record: { readonly handle: number } }): ActorId | null {
  for (const [key, handle] of Object.entries(context.events.emitters ?? {})) {
    if (handle !== context.record.handle || !key.startsWith("actor:")) continue;
    const parsed = Number(key.slice("actor:".length));
    if (Number.isSafeInteger(parsed) && parsed > 0) return actorId(parsed);
  }
  return null;
}

/** Build the generic OOP-12 actor host type with owner-backed data hooks. */
export function createActorHostType(service: ActorService): HostObjectType {
  return {
    name: "actor",
    read(context, name): Value | undefined {
      const id = actorIdFromEmitter(context);
      if (id === null) return undefined;
      const actor = service.readActor(id);
      if (actor === null) return undefined;
      const stat = ACTOR_STAT_FIELDS[name.toLowerCase()];
      if (stat !== undefined) return actor.stats[stat];
      switch (name.toLowerCase()) {
        case "id":
          return actor.id;
        case "kind":
          return actor.kind;
        case "source":
          return actor.source;
        case "name":
          return actor.name;
        case "behaviour":
          return actor.behaviour ?? "";
        default:
          return undefined;
      }
    },
    write(context, name, value) {
      const id = actorIdFromEmitter(context);
      if (id === null) return "not-host";
      const actor = service.readActor(id);
      if (actor === null) return "not-host";
      const stat = ACTOR_STAT_FIELDS[name.toLowerCase()];
      if (stat !== undefined && typeof value === "number") {
        service.write(id, { [stat]: value } as Partial<ActorStats>);
        return "written";
      }
      if (name.toLowerCase() === "name" && typeof value === "string") {
        service.patchActor(id, { name: value });
        return "written";
      }
      return "read-only";
    },
    remove() {
      return "system-owned";
    },
  };
}
