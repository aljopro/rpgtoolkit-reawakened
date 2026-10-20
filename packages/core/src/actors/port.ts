import { actorId, getActor, patchActor, type ActorId, type ActorStats, type ActorsSection } from "./model.ts";

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
