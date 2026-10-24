/** Owner-scoped actions, not package state mutation (AD-10; canonical menu save contract). */
import type { GameState } from "../save/state.ts";
import type { EffectRecord } from "../script/effects.ts";
import { addActor, removeActor, type ActorCreateInput } from "../actors/model.ts";
import { ScriptError } from "../script/errors.ts";
import {
  readonlySection,
  validateActionFields,
  validateInventorySection,
  validateMenuSection,
  validatePartySection,
  type DeepReadonly,
  type InventoryEquipment,
  type InventoryItem,
  type InventorySection,
  type MenuScreen,
  type MenuSection,
  type MenuStateResult,
  type PartySection,
  type StateIssue,
} from "./model.ts";

export type PartyAction =
  | { readonly type: "roster"; readonly members: readonly number[]; readonly selected: number | null }
  | { readonly type: "steps"; readonly value: number }
  | { readonly type: "add"; readonly actor?: ActorCreateInput; readonly actorId?: number }
  | { readonly type: "restore" | "remove" | "destroy" | "select"; readonly actorId: number }
  | { readonly type: "swap"; readonly firstActorId: number; readonly secondActorId: number };
export type InventoryAction =
  | { readonly type: "items"; readonly items: readonly Readonly<InventoryItem>[]; readonly nextId: number }
  | { readonly type: "equipment"; readonly equipment: readonly Readonly<InventoryEquipment>[] }
  | { readonly type: "gold"; readonly value: number };
export type MenuAction =
  | { readonly type: "navigation"; readonly screens: readonly Readonly<MenuScreen>[] }
  | { readonly type: "graphic"; readonly value: string | null };
export type SectionOwnerPort<S, A> = {
  read(): DeepReadonly<S>;
  apply(action: A): MenuStateResult;
};
export type MenuOwnerPorts = {
  readonly party: SectionOwnerPort<PartySection, PartyAction>;
  readonly inventory: SectionOwnerPort<InventorySection, InventoryAction>;
  readonly menu: SectionOwnerPort<MenuSection, MenuAction>;
};
export type PartyEvent =
  | { readonly type: "memberAdded"; readonly detail: { readonly actorId: number; readonly index: number } }
  | { readonly type: "memberRemoved"; readonly detail: { readonly actorId: number; readonly index: number } }
  | { readonly type: "membersSwapped"; readonly detail: { readonly firstActorId: number; readonly secondActorId: number; readonly firstIndex: number; readonly secondIndex: number } }
  | { readonly type: "activeMemberChanged"; readonly detail: { readonly previousActorId: number | null; readonly currentActorId: number | null } };
export type PartyEventSink = (event: PartyEvent) => void;

function rosterEvents(previous: PartySection, current: PartySection): PartyEvent[] {
  const events: PartyEvent[] = [];
  previous.members.forEach((actorId, index) => {
    if (!current.members.includes(actorId)) events.push({ type: "memberRemoved", detail: { actorId, index } });
  });
  current.members.forEach((actorId, index) => {
    if (!previous.members.includes(actorId)) events.push({ type: "memberAdded", detail: { actorId, index } });
  });
  if (previous.members.length === current.members.length &&
      previous.members.every((actorId) => current.members.includes(actorId))) {
    const work = [...previous.members];
    for (let i = 0; i < current.members.length; i += 1) {
      if (work[i] === current.members[i]) continue;
      const j = work.indexOf(current.members[i]!, i + 1);
      const firstActorId = work[i]!;
      const secondActorId = work[j]!;
      [work[i], work[j]] = [work[j]!, work[i]!];
      events.push({ type: "membersSwapped", detail: { firstActorId, secondActorId, firstIndex: i, secondIndex: j } });
    }
  }
  if (previous.selected !== current.selected) {
    events.push({ type: "activeMemberChanged", detail: { previousActorId: previous.selected, currentActorId: current.selected } });
  }
  return events;
}
type OwnerState = Pick<GameState, "party" | "inventory" | "menu" | "actors">;
const ACCEPTED: MenuStateResult = Object.freeze({ ok: true, error: null });

function rejected(error: StateIssue): MenuStateResult {
  return { ok: false, error };
}

function actionRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
/** Resolves current section values on every call, including after reset/restore. */
export function createMenuOwnerPorts(state: OwnerState, onPartyEvent?: PartyEventSink): MenuOwnerPorts {
  const commitParty = (next: PartySection, destroyActorId?: number): MenuStateResult => {
    const previous = state.party;
    const same = previous.selected === next.selected && previous.steps === next.steps &&
      previous.members.length === next.members.length &&
      previous.members.every((actorId, index) => actorId === next.members[index]);
    if (same) {
      state.party = { ...previous, members: [...previous.members] };
      return ACCEPTED;
    }
    state.party = { ...next, members: [...next.members] };
    if (destroyActorId !== undefined) removeActor(state.actors, destroyActorId);
    for (const event of rosterEvents(previous, state.party)) onPartyEvent?.(event);
    return ACCEPTED;
  };
  return {
    party: {
      read: () => readonlySection(state.party),
      apply(action: unknown): MenuStateResult {
        const record = actionRecord(action);
        if (record === null) return rejected({ path: "party.action", message: "expected an action object" });
        let keys: readonly string[];
        let candidate: unknown;
        let destroyActorId: number | undefined;
        let createdActor: ActorCreateInput | undefined;
        let candidateActors = state.actors;
        const old = state.party;
        switch (record.type) {
          case "roster":
            keys = ["type", "members", "selected"];
            candidate = { ...old, members: record.members, selected: record.selected };
            break;
          case "steps":
            keys = ["type", "value"];
            candidate = { ...old, steps: record.value };
            break;
          case "add":
          case "restore": {
            let actorId = record.actorId as number;
            if (record.actor !== undefined) {
              keys = ["type", "actor"];
              createdActor = record.actor as ActorCreateInput;
              candidateActors = { ...state.actors, actors: state.actors.actors.map((actor) => ({ ...actor })) };
              actorId = addActor(candidateActors, createdActor).id;
            } else {
              keys = ["type", "actorId"];
            }
            if (old.members.includes(actorId)) return ACCEPTED;
            const members = [...old.members, actorId];
            candidate = { ...old, members, selected: old.selected ?? members[0] ?? null };
            break;
          }
          case "remove":
          case "destroy": {
            keys = ["type", "actorId"];
            if (record.type === "destroy") destroyActorId = record.actorId as number;
            const index = old.members.indexOf(record.actorId as number);
            if (index < 0) return ACCEPTED;
            const members = old.members.filter((actorId) => actorId !== record.actorId);
            const selected = old.selected !== record.actorId
              ? old.selected
              : members.length === 0 ? null : members[Math.min(index, members.length - 1)]!;
            candidate = { ...old, members, selected };
            break;
          }
          case "select":
            keys = ["type", "actorId"];
            if (!old.members.includes(record.actorId as number)) {
              return rejected({ path: "party.selected", message: "expected a current party member id" });
            }
            candidate = { ...old, selected: record.actorId };
            break;
          case "swap": {
            keys = ["type", "firstActorId", "secondActorId"];
            const firstIndex = old.members.indexOf(record.firstActorId as number);
            const secondIndex = old.members.indexOf(record.secondActorId as number);
            if (firstIndex < 0) return rejected({ path: "party.action.firstActorId", message: "expected a current party member id" });
            if (secondIndex < 0) return rejected({ path: "party.action.secondActorId", message: "expected a current party member id" });
            if (firstIndex === secondIndex) return ACCEPTED;
            const members = [...old.members];
            [members[firstIndex], members[secondIndex]] = [members[secondIndex]!, members[firstIndex]!];
            candidate = { ...old, members };
            break;
          }
          default:
            return rejected({ path: "party.action.type", message: "unknown party action" });
        }
        const error = validateActionFields(record, keys, "party.action") ?? validatePartySection(candidate, candidateActors);
        if (error !== null) return rejected(error);
        if (createdActor !== undefined) addActor(state.actors, createdActor);
        const next = candidate as PartySection;
        return commitParty(next, destroyActorId);
      },
    },
    inventory: {
      read: () => readonlySection(state.inventory),
      apply(action: unknown): MenuStateResult {
        const record = actionRecord(action);
        if (record === null) return rejected({ path: "inventory.action", message: "expected an action object" });
        let keys: readonly string[];
        let candidate: unknown;
        switch (record.type) {
          case "items":
            keys = ["type", "items", "nextId"];
            candidate = { ...state.inventory, items: record.items, nextId: record.nextId };
            break;
          case "equipment":
            keys = ["type", "equipment"];
            candidate = { ...state.inventory, equipment: record.equipment };
            break;
          case "gold":
            keys = ["type", "value"];
            candidate = { ...state.inventory, gold: record.value };
            break;
          default:
            return rejected({ path: "inventory.action.type", message: "unknown inventory action" });
        }
        const error = validateActionFields(record, keys, "inventory.action") ?? validateInventorySection(candidate, state.actors);
        if (error !== null) return rejected(error);
        const next = candidate as InventorySection;
        if (next.nextId < state.inventory.nextId) return rejected({ path: "inventory.nextId", message: "item identity counter cannot decrease" });
        if (record.type === "items") {
          for (const [index, item] of next.items.entries()) {
            const prior = state.inventory.items.find((entry) => entry.id === item.id);
            if (prior === undefined && item.id < state.inventory.nextId) {
              return rejected({ path: `inventory.items[${index}].id`, message: "retired item identities cannot be reused" });
            }
            if (prior !== undefined && (prior.source !== item.source || prior.handle !== item.handle)) {
              return rejected({ path: `inventory.items[${index}].id`, message: "an existing item identity cannot change source or handle" });
            }
          }
        }
        state.inventory = {
          ...next,
          items: record.type === "items" ? next.items.map((item) => ({ ...item })) : next.items,
          equipment: record.type === "equipment" ? next.equipment.map((entry) => ({ ...entry })) : next.equipment,
        };
        return ACCEPTED;
      },
    },
    menu: {
      read: () => readonlySection(state.menu),
      apply(action: unknown): MenuStateResult {
        const record = actionRecord(action);
        if (record === null) return rejected({ path: "menu.action", message: "expected an action object" });
        let keys: readonly string[];
        let candidate: unknown;
        switch (record.type) {
          case "navigation":
            keys = ["type", "screens"];
            candidate = { ...state.menu, screens: record.screens };
            break;
          case "graphic":
            keys = ["type", "value"];
            candidate = { ...state.menu, graphic: record.value };
            break;
          default:
            return rejected({ path: "menu.action.type", message: "unknown menu action" });
        }
        const error = validateActionFields(record, keys, "menu.action") ?? validateMenuSection(candidate, state.actors);
        if (error !== null) return rejected(error);
        const next = candidate as MenuSection;
        state.menu = { ...next, screens: record.type === "navigation" ? next.screens.map((screen) => ({ ...screen })) : next.screens };
        return ACCEPTED;
      },
    },
  };
}

/** Routes documented party effects and section actions through their owners. */
export function applyMenuStateEffect(ports: MenuOwnerPorts, effect: EffectRecord): void {
  const section = effect.patch?.section;
  if (effect.name === "activeplayer" || effect.name === "addplayer" || effect.name === "restoreplayer" || effect.name === "removeplayer" || effect.name === "destroyplayer" || effect.name === "__party_addplayer_asset") {
    if (section !== "party" || effect.args.length !== 1) throw new ScriptError("menu.state-invalid", "party.action: expected one party action");
    const result = ports.party.apply(effect.args[0] as PartyAction);
    if (result.error !== null) throw new ScriptError("menu.state-invalid", `${result.error.path}: ${result.error.message}`);
    return;
  }
  if (effect.name !== "state" && effect.name !== "menu.state") return;
  if (section !== "party" && section !== "inventory" && section !== "menu") {
    throw new ScriptError("menu.state-invalid", "menu.action: expected a party, inventory or menu section");
  }
  if (effect.args.length !== 1) throw new ScriptError("menu.state-invalid", `${section}.action: expected exactly one action`);
  const result = ports[section].apply(effect.args[0] as PartyAction & InventoryAction & MenuAction);
  if (result.error !== null) throw new ScriptError("menu.state-invalid", `${result.error.path}: ${result.error.message}`);
}
