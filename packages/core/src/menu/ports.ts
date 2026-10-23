/** Owner-scoped actions, not package state mutation (AD-10; canonical menu save contract). */
import type { GameState } from "../save/state.ts";
import type { EffectRecord } from "../script/effects.ts";
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
  | { readonly type: "steps"; readonly value: number };
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
export function createMenuOwnerPorts(state: OwnerState): MenuOwnerPorts {
  return {
    party: {
      read: () => readonlySection(state.party),
      apply(action: unknown): MenuStateResult {
        const record = actionRecord(action);
        if (record === null) return rejected({ path: "party.action", message: "expected an action object" });
        let keys: readonly string[];
        let candidate: unknown;
        switch (record.type) {
          case "roster":
            keys = ["type", "members", "selected"];
            candidate = { ...state.party, members: record.members, selected: record.selected };
            break;
          case "steps":
            keys = ["type", "value"];
            candidate = { ...state.party, steps: record.value };
            break;
          default:
            return rejected({ path: "party.action.type", message: "unknown party action" });
        }
        const error = validateActionFields(record, keys, "party.action") ?? validatePartySection(candidate, state.actors);
        if (error !== null) return rejected(error);
        const next = candidate as PartySection;
        state.party = { ...next, members: next.members === state.party.members ? next.members : [...next.members] };
        return ACCEPTED;
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
        state.inventory = {
          ...next,
          items: next.items === state.inventory.items ? next.items : next.items.map((item) => ({ ...item })),
          equipment: next.equipment === state.inventory.equipment ? next.equipment : next.equipment.map((entry) => ({ ...entry })),
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
        state.menu = { ...next, screens: next.screens === state.menu.screens ? next.screens : next.screens.map((screen) => ({ ...screen })) };
        return ACCEPTED;
      },
    },
  };
}

/** One existing effect bus routes a data action to exactly one section owner. */
export function applyMenuStateEffect(ports: MenuOwnerPorts, effect: EffectRecord): void {
  if (effect.name !== "state" && effect.name !== "menu.state") return;
  const section = effect.patch?.section;
  if (section !== "party" && section !== "inventory" && section !== "menu") {
    throw new ScriptError("menu.state-invalid", "menu.action: expected a party, inventory or menu section");
  }
  if (effect.args.length !== 1) throw new ScriptError("menu.state-invalid", `${section}.action: expected exactly one action`);
  const result = ports[section].apply(effect.args[0] as PartyAction & InventoryAction & MenuAction);
  if (result.error !== null) throw new ScriptError("menu.state-invalid", `${result.error.path}: ${result.error.message}`);
}
