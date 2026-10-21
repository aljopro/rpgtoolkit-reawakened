import type { Diagnostic } from "../ports/engine.ts";
import type { ActorRecord } from "./model.ts";
import type { ActorHooks } from "./rules.ts";
import type { ResolvedPlugin } from "../script/plugin.ts";
/** The closed core hook surface. */
export const ACTOR_BEHAVIOUR_HOOKS = ["levelUp", "revive", "statusChanged", "equipmentChanged", "statsChanged"] as const;
export type ActorBehaviourHook = (typeof ACTOR_BEHAVIOUR_HOOKS)[number];

/** A package's session-only behaviour definition. */
export type BehaviourDefinition = {
  readonly name: string;
  readonly hooks: ActorHooks;
};

/** Session registry; never part of game or actor save state. */
export type BehaviourRegistry = {
  readonly registerBehaviour: (name: string, hooks: unknown) => boolean;
  readonly resolve: (name: string | null | undefined) => ActorHooks;
  readonly definitions: () => readonly BehaviourDefinition[];
  readonly missingReported: (name: string) => boolean;
};

const NAME = /^([a-z][a-z0-9]*(?:-[a-z0-9]+)*)\.([A-Za-z][A-Za-z0-9_]*)$/;

function diagnostic(diagnostics: Diagnostic[] | undefined, code: string, message: string): void {
  diagnostics?.push({ code, file: "<package startup>", line: 0, message });
}

/** Register one behaviour in the supplied session registry. */
export function registerBehaviour(registry: BehaviourRegistry, name: string, hooks: unknown): boolean {
  return registry.registerBehaviour(name, hooks);
}

/** Register the static behaviour contributions of the resolved packages. */
export function registerPackageBehaviours(registry: BehaviourRegistry, plugins: readonly ResolvedPlugin[]): void {
  for (const plugin of plugins) {
    for (const behaviour of plugin.definition.behaviours ?? []) {
      registry.registerBehaviour(behaviour.name, behaviour.hooks);
    }
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Create a fresh registry for one boot/reset/restore session. */
export function createBehaviourRegistry(
  namespaces: readonly string[] = [],
  diagnostics?: Diagnostic[],
  defaults: ActorHooks = {},
): BehaviourRegistry {
  const allowed = new Set(namespaces);
  const definitions = new Map<string, BehaviourDefinition>();
  const missing = new Set<string>();
  const registerBehaviour = (name: string, hooks: unknown): boolean => {
    const match = typeof name === "string" ? NAME.exec(name) : null;
    if (match === null) {
      diagnostic(diagnostics, "behaviour.malformed-name", `behaviour name ${JSON.stringify(name)} must use namespace.name with a lower-case hyphenated namespace`);
      return false;
    }
    const namespace = match[1]!;
    if (!allowed.has(namespace)) {
      diagnostic(diagnostics, "behaviour.namespace", `behaviour ${JSON.stringify(name)} is not provided by a registered package namespace`);
      return false;
    }
    if (!isObject(hooks)) {
      diagnostic(diagnostics, "behaviour.hooks", `behaviour ${JSON.stringify(name)} hooks must be a dictionary`);
      return false;
    }
    const result: ActorHooks = {};
    for (const key of Object.keys(hooks)) {
      if (!(ACTOR_BEHAVIOUR_HOOKS as readonly string[]).includes(key)) {
        diagnostic(diagnostics, "behaviour.unknown-hook", `behaviour ${JSON.stringify(name)} has unknown hook ${JSON.stringify(key)}`);
        return false;
      }
      if (typeof hooks[key] !== "function") {
        diagnostic(diagnostics, "behaviour.hook", `behaviour ${JSON.stringify(name)} hook ${JSON.stringify(key)} must be callable`);
        return false;
      }
      (result as Record<string, unknown>)[key] = hooks[key];
    }
    if (definitions.has(name)) {
      diagnostic(diagnostics, "behaviour.duplicate", `behaviour ${JSON.stringify(name)} is already registered`);
      return false;
    }
    definitions.set(name, { name, hooks: result });
    return true;
  };
  const resolve = (name: string | null | undefined): ActorHooks => {
    if (name === null || name === undefined || name === "") return defaults;
    return definitions.get(name)?.hooks ?? defaults;
  };
  const missingReported = (name: string): boolean => {
    if (missing.has(name)) return true;
    missing.add(name);
    return false;
  };
  return { registerBehaviour, resolve, definitions: () => [...definitions.values()], missingReported };

}

/** Resolve actor hooks and report one diagnostic when the saved name is absent. */
export function resolveBehaviour(
  registry: BehaviourRegistry,
  actor: Pick<ActorRecord, "behaviour">,
  diagnostics?: Diagnostic[],
): ActorHooks {
  if (actor.behaviour === null || actor.behaviour === undefined || actor.behaviour === "") return registry.resolve(actor.behaviour);
  const found = registry.definitions().some((definition) => definition.name === actor.behaviour);
  if (!found && !registry.missingReported(actor.behaviour)) diagnostic(diagnostics, "behaviour.missing", `actor behaviour ${JSON.stringify(actor.behaviour)} is not registered; using core defaults`);
  return registry.resolve(actor.behaviour);
}


