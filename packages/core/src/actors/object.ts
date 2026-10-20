import { actorEmitterKey, actorId, getActor, type ActorId, type ActorsSection } from "./model.ts";
import { registerEmitter } from "../events/emitter.ts";
import type { EventsSection } from "../events/model.ts";
import { createHostObject } from "../script/objects.ts";
import type { VmState } from "../script/state.ts";
import type { ObjectRecord } from "../script/state.ts";

/** Register the actor's one script object and emitter under `actor:<id>`. */
export function registerActorObject(
  vm: VmState,
  events: EventsSection,
  actors: ActorsSection,
  actor: ActorId | number,
): ObjectRecord | null {
  const id = actorId(actor);
  if (getActor(actors, id) === null) return null;
  const key = actorEmitterKey(id);
  const existingHandle = events.emitters?.[key];
  const existing = existingHandle === undefined ? undefined : vm.objects.find((record) => record.handle === existingHandle);
  return registerEmitter(vm, events, key, existing ?? createHostObject(vm, "actor"));
}
