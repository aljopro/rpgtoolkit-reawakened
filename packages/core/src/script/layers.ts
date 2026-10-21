/**
 * The layer table: the command layers `registerPlugin` registers (MOD-4, PKG-5;
 * docs/spec/engine/rpgcode-modules-and-objects.md#registerplugin-layers-entry-198;
 * ADR 0004 decision 8; entry 19.8).
 *
 * **Session data, never state.** The owner rules that the layers a package
 * registers are rebuilt at every start-up and are not saved (MOD-4 point 3), so
 * the table lives in the script services beside the command registry, not in
 * `GameState`: nothing here is in a save or a state hash, and no schema or
 * compiler version moves (G1). It holds `Map`s because it is not state; every
 * walk is in insertion order, which the language fixes (G3).
 *
 * **One mechanism.** A layer is reached through the environment table's first
 * entry (FUN-8): where the VM looks for the callable the running scope holds
 * under a name, it offers the top layer of the name after it. `resolveCall`
 * receives the same single `held` callable it always did and gains no entry.
 * The wrapper a layer is, is a callable value whose `def` is `plugin.layer:<id>`,
 * a name no script can write (an identifier has no `:`), so it saves, copies and
 * is passed as `next` like any callable; running it is `performCallable`'s job.
 *
 * **Same ids on every start.** Layer ids `L<n>` and registration ids `R<n>` come
 * from one counter of the table. The same installed packages registering in the
 * same order on a fresh state make the same ids, which is what lets a saved
 * thread's `next` (a layer's id) find the rebuilt layer after a restore.
 */

import type { CallableValue } from "../ports/value.ts";

/** The `def` prefix of a layer wrapper; the rest is the layer id. */
export const LAYER_PREFIX = "plugin.layer:";
/** The `def` prefix of a registration's `remove` callable; the rest is the registration id. */
export const REGISTRATION_PREFIX = "plugin.remove:";

/** One registered layer of one command. */
export type PluginLayer = {
  readonly id: string;
  readonly registration: string;
  readonly command: string;
  /** The author's function, taking the command's arguments and then `next`. */
  readonly interceptor: CallableValue;
  /** What `next` is: the layer below, or the engine's own binding. */
  readonly below: CallableValue;
  /** A removed layer passes every call to `below` unchanged. */
  removed: boolean;
};

/** One `registerPlugin` call: its label and the layers it made, in registration order. */
export type PluginRegistration = {
  readonly id: string;
  readonly name: string;
  readonly layers: readonly string[];
};

/** The layers of one running game (see the file header). */
export type PluginLayers = {
  seq: number;
  readonly layers: Map<string, PluginLayer>;
  /** Per command, the live layer ids, bottom first. */
  readonly stacks: Map<string, string[]>;
  readonly registrations: Map<string, PluginRegistration>;
};

/** An empty layer table. */
export function createPluginLayers(): PluginLayers {
  return { seq: 0, layers: new Map(), stacks: new Map(), registrations: new Map() };
}

/** Discard package layers after an aborted startup pass. */
export function clearPluginLayers(table: PluginLayers): void {
  table.seq = 0;
  table.layers.clear();
  table.stacks.clear();
  table.registrations.clear();
}
/** Capture a restorable copy of a session layer table before a startup pass. */
export function snapshotPluginLayers(table: PluginLayers): PluginLayers {
  return {
    seq: table.seq,
    layers: new Map([...table.layers].map(([id, layer]) => [id, { ...layer, interceptor: copyCallable(layer.interceptor), below: copyCallable(layer.below) }])),
    stacks: new Map([...table.stacks].map(([command, ids]) => [command, [...ids]])),
    registrations: new Map([...table.registrations].map(([id, registration]) => [id, { ...registration, layers: [...registration.layers] }])),
  };
}

/** Restore a session layer table to a pre-startup snapshot without replacing its object. */
export function restorePluginLayers(table: PluginLayers, snapshot: PluginLayers): void {
  table.seq = snapshot.seq;
  table.layers.clear();
  for (const [id, layer] of snapshot.layers) table.layers.set(id, { ...layer, interceptor: copyCallable(layer.interceptor), below: copyCallable(layer.below) });
  table.stacks.clear();
  for (const [command, ids] of snapshot.stacks) table.stacks.set(command, [...ids]);
  table.registrations.clear();
  for (const [id, registration] of snapshot.registrations) table.registrations.set(id, { ...registration, layers: [...registration.layers] });
}

/** The layer id a `def` names, or `null` when `def` is not a layer wrapper. */
export function layerIdOf(def: string): string | null {
  return def.startsWith(LAYER_PREFIX) ? def.slice(LAYER_PREFIX.length) : null;
}

/** The registration id a `def` names, or `null` when `def` is not a `remove` callable. */
export function registrationIdOf(def: string): string | null {
  return def.startsWith(REGISTRATION_PREFIX) ? def.slice(REGISTRATION_PREFIX.length) : null;
}

/** Whether `def` is one of the table's own definitions (a wrapper or a `remove`). */
export function isLayerDef(def: string): boolean {
  return def.startsWith(LAYER_PREFIX) || def.startsWith(REGISTRATION_PREFIX);
}

/** The wrapper callable of layer `id`. */
export function layerHandle(id: string): CallableValue {
  return { type: "callable", def: `${LAYER_PREFIX}${id}`, captures: [], receiver: null };
}

/** The `remove` callable of registration `id`. */
export function removeHandle(id: string): CallableValue {
  return { type: "callable", def: `${REGISTRATION_PREFIX}${id}`, captures: [], receiver: null };
}

/** The wrapper of the top live layer of `command`, or `undefined` when it has none. */
export function topLayerHandle(table: PluginLayers, command: string): CallableValue | undefined {
  if (table.stacks.size === 0) return undefined;
  const stack = table.stacks.get(command);
  const top = stack?.[stack.length - 1];
  return top === undefined ? undefined : layerHandle(top);
}

/** One command a registration wraps: its interceptor and the engine's own binding (needed only while no layer is registered for it). */
export type LayerRequest = {
  readonly command: string;
  readonly interceptor: CallableValue;
  readonly engine: CallableValue | undefined;
};

/**
 * Register `requests` in order as one registration. Each layer's `below` is the
 * top layer already registered for its command, else the engine's binding the
 * request carries, so a later registration of a command is its outer layer.
 */
export function addRegistration(
  table: PluginLayers,
  name: string,
  requests: readonly LayerRequest[],
): PluginRegistration {
  table.seq += 1;
  const id = `R${table.seq}`;
  const made: string[] = [];
  for (const request of requests) {
    table.seq += 1;
    const layerId = `L${table.seq}`;
    const below = topLayerHandle(table, request.command) ?? request.engine;
    if (below === undefined) {
      throw new Error(`plugin layer for "${request.command}" has no layer or engine binding below it`);
    }
    table.layers.set(layerId, {
      id: layerId,
      registration: id,
      command: request.command,
      interceptor: copyCallable(request.interceptor),
      below,
      removed: false,
    });
    const stack = table.stacks.get(request.command) ?? [];
    stack.push(layerId);
    table.stacks.set(request.command, stack);
    made.push(layerId);
  }
  const registration: PluginRegistration = { id, name, layers: made };
  table.registrations.set(id, registration);
  return registration;
}

/**
 * Remove every layer of registration `id` from its command (for this session):
 * the layer is marked removed, so a handle that names it still reaches the layer
 * below, and leaves its command's stack. Returns `1` when a layer was removed,
 * `0` when all were already removed, and `null` when the table has no such
 * registration.
 */
export function removeRegistration(table: PluginLayers, id: string): 0 | 1 | null {
  const registration = table.registrations.get(id);
  if (registration === undefined) return null;
  let removed: 0 | 1 = 0;
  for (const layerId of registration.layers) {
    const layer = table.layers.get(layerId);
    if (layer === undefined || layer.removed) continue;
    layer.removed = true;
    removed = 1;
    const stack = table.stacks.get(layer.command);
    if (stack === undefined) continue;
    const at = stack.indexOf(layerId);
    if (at >= 0) stack.splice(at, 1);
    if (stack.length === 0) table.stacks.delete(layer.command);
  }
  return removed;
}

/**
 * The script values the table keeps alive: the interceptor of every live layer and
 * every `below`. The end-of-tick pass takes them as roots, so a closure's cells and a
 * bound receiver stay while a layer can still call them (R-34, entry 18.6).
 */
export function layerRoots(table: PluginLayers): readonly CallableValue[] {
  const roots: CallableValue[] = [];
  for (const layer of table.layers.values()) {
    if (!layer.removed) roots.push(layer.interceptor);
    roots.push(layer.below);
  }
  return roots;
}

function copyCallable(value: CallableValue): CallableValue {
  return {
    type: "callable",
    def: value.def,
    captures: [...value.captures],
    receiver: value.receiver,
    ...(value.owner === undefined ? {} : { owner: value.owner }),
  };
}
