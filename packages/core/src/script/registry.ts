/**
 * The command registry: pure assembly of an ordered resolved-plugin list and
 * the four-tier lookup (AD-8; ADR 0004 decisions 2 and 6).
 *
 * **Layer order.** Registration order is layer order. Where two plugins define
 * the same command name or alias, the later plugin's handler runs first and its
 * `next` reaches the earlier definition, so each name is a stack of layers
 * (command middleware) rather than one winner. The override is not an error: it
 * emits exactly one `command.overridden` warn record through the `Logger` port
 * (AD-24) naming the previous and replacement plugin. The one rejection is a
 * plugin repeating a name or alias *within itself*, which is assembly's own
 * error naming the plugin (AD-8's only surviving duplicate rule).
 *
 * **Name folding.** A name and an alias arrive already ASCII case-folded by the
 * frontend (docs/spec/engine/rpgcode-functions.md#rpgcode-built-in-commands LEX-10), so this module keys on the string as
 * given and does no folding of its own.
 *
 * **Tiers.** AD-8's lookup precedence is redirect, script function, built-in,
 * extension, and the VM and the LSP share it. `createCommandLookup` is that
 * skeleton: the registry supplies the built-in tier, and the redirect, script
 * function and extension tiers are stubs until entries 8, 5/6 and 21/22 fill
 * them (a stub resolves nothing, so an unknown name still reaches
 * `unknown.command`). The extension tier is the seam the legacy engine had —
 * an unknown call is offered to each plugin by name, first claim wins
 * (`docs/spec/engine/plugins-and-battle.md#plugin-roles`, "RPGCode command plugins";
 * `docs/spec/engine/rpgcode-language.md#plugin-commands`, "Plugin commands") — kept here so
 * entries 21/22 register the catalogue and the stub set through it.
 *
 * docs/spec/engine/rpgcode-language.md#plugin-commands.
 */

import type { Logger } from "../ports/logger.ts";
import type { BuiltinSpec } from "./builtins.ts";
import type { FunctionInfo, ParamInfo } from "./lower.ts";
import type { CommandHandler, CommandResult, ResolvedPlugin } from "./plugin.ts";
import type { Program, ProgramRef } from "./program.ts";
import { INCLUDE_MISSING, ScriptError } from "./errors.ts";

/** One layer of one name: the plugin that contributed it and its spec. */
type CommandLayer = {
  readonly plugin: string;
  readonly spec: BuiltinSpec;
  readonly options?: ResolvedPlugin["options"];
};

/**
 * One resolved command: the winning layer and the handler of the layer below (a
 * `command.no-next` no-op when there is none).
 *
 * The winning layer's `spec.params` govern the call, because the top layer is
 * the one that decides what it accepts; a wrapper that wants to check the lower
 * layer's arity against changed arguments can read them from the spec it
 * captured.
 */
export type ResolvedCommand = {
  readonly spec: BuiltinSpec;
  readonly next: CommandHandler;
};

/** The assembled, layered built-in registry of one ordered plugin list (AD-8). */
export type CommandRegistry = {
  /** Resolve a name or alias to its winning layer, or `undefined`. */
  get(name: string): ResolvedCommand | undefined;
  /** Every registered name and alias, in registration order (diagnostics/tests). */
  keys(): readonly string[];
  /** The ids of the plugins that define `name`, bottom layer first (empty when none). */
  layerPlugins(name: string): readonly string[];
};

/** A tier's resolver: a name in, a command out or `undefined` (AD-8). */
export type TierLookup = (name: string) => ResolvedCommand | undefined;

/** The four AD-8 tiers, in precedence order. */
export type CommandTiers = {
  readonly redirect: TierLookup;
  readonly scriptFunction: TierLookup;
  readonly builtin: TierLookup;
  readonly extension: TierLookup;
};

/** The tier order AD-8 fixes; the first tier that resolves a name wins. */
export const TIER_ORDER: readonly (keyof CommandTiers)[] = [
  "redirect",
  "scriptFunction",
  "builtin",
  "extension",
];

/** The name/alias lookup over the four tiers (AD-8; the VM and the LSP share it). */
export type CommandLookup = {
  /** The first tier that resolves `name`. */
  get(name: string): ResolvedCommand | undefined;
  /** What one tier alone resolves for `name` (R-35: built-ins bind ahead of script functions). */
  getTier(tier: keyof CommandTiers, name: string): ResolvedCommand | undefined;
};

/**
 * Build the four-tier lookup (AD-8). Any tier left out is a stub that resolves
 * nothing, so the caller wires only the tiers it owns.
 */
export function createCommandLookup(tiers: Partial<CommandTiers>): CommandLookup {
  const ordered = TIER_ORDER.map((tier) => tiers[tier] ?? (() => undefined));
  return {
    get(name) {
      for (const tier of ordered) {
        const hit = tier(name);
        if (hit !== undefined) return hit;
      }
      return undefined;
    },
    getTier(tier, name) {
      return (tiers[tier] ?? (() => undefined))(name);
    },
  };
}

/** Target metadata when a call resolves to a script function (FUN-1). */
export type FunctionTarget = {
  readonly program: ProgramRef;
  readonly entry: number;
  readonly params: readonly ParamInfo[];
};

/** The outcome of AD-8 call resolution: either a script function target or a command. */
export type CallResolution =
  | { readonly kind: "function"; readonly target: FunctionTarget }
  | { readonly kind: "command"; readonly command: ResolvedCommand };

/** The script-function target of the definition `fns` holds for `argc` parameters, if any (FUN-1). */
function functionTarget(
  fns: { readonly [name: string]: readonly FunctionInfo[] } | undefined,
  name: string,
  argc: number,
  program: Program,
): CallResolution | undefined {
  if (fns === undefined || !Object.hasOwn(fns, name)) return undefined;
  const match = fns[name]!.find((fn) => fn.params.length === argc && fn.entry >= 0);
  if (match === undefined) return undefined;
  return {
    kind: "function",
    target: { program: program.ref, entry: match.entry, params: match.params },
  };
}

/**
 * Resolve a call (docs/spec/engine/rpgcode-modules-and-objects.md#modules MOD-1/MOD-2,
 * docs/spec/engine/rpgcode-functions.md R-35). Redirects were applied where the
 * call site was parsed, so the name here is already substituted. Then:
 *
 * 1. a `file.`-qualified call reaches that file's own definition of the name and
 *    arity first, and raises `include.missing` when the file could not be loaded;
 * 2. a built-in binds ahead of a script function of the same name (R-35);
 * 3. the flat list of script functions, where the last definition added won (R-41);
 * 4. the extension tier: a plugin command that no built-in or script function claims.
 *
 * A script function resolves by name and parameter count (FUN-1); a wrong count
 * falls through to the next step.
 */
export function resolveCall(
  name: string,
  argc: number,
  program: Program,
  commands: CommandLookup,
  file?: string,
): CallResolution | undefined {
  if (file !== undefined) {
    const path = `${file}.prg`;
    const key = Object.hasOwn(program.fileKeys, path) ? program.fileKeys[path]! : undefined;
    if (key === undefined) {
      throw new ScriptError(INCLUDE_MISSING, `the file "${path}" could not be loaded for \`${file}.${name}\``);
    }
    const own = functionTarget(program.files[key], name, argc, program);
    if (own !== undefined) return own;
  }

  // R-35: a built-in binds ahead of a script function of the same name.
  const builtin = commands.getTier("builtin", name);
  if (builtin !== undefined) return { kind: "command", command: builtin };

  const script = functionTarget(program.functions, name, argc, program);
  if (script !== undefined) return script;

  // A plugin's own command is reached only after the script functions (docs/spec OOP-6 call order).
  const extension = commands.getTier("extension", name);
  return extension === undefined ? undefined : { kind: "command", command: extension };
}

/**
 * Assemble the host-resolved ordered plugin list into one layered registry
 * (ADR 0004 decisions 2 and 6). Manifest order is the whole chain; no built-in
 * layer is inserted here.
 *
 * Pure over the list: the same plugins and the same logger records produce the
 * same registry, and nothing here touches game state.
 */
export function assembleCommands(
  plugins: readonly ResolvedPlugin[],
  logger: Logger,
): CommandRegistry {
  const layers = new Map<string, CommandLayer[]>();
  const pluginIds = new Set<string>();

  for (const resolved of plugins) {
    const plugin = resolved.definition;
    if (pluginIds.has(plugin.id)) {
      throw new Error(`plugin "${plugin.id}" appears more than once in the resolved manifest`);
    }
    pluginIds.add(plugin.id);
    const claimed = new Set<string>();
    for (const spec of plugin.commands) {
      for (const key of [spec.name, ...spec.aliases]) {
        if (claimed.has(key)) {
          throw new Error(
            `plugin "${plugin.id}" lists the command name or alias "${key}" more than once`,
          );
        }
        claimed.add(key);
      }
    }
    for (const spec of plugin.commands) {
      for (const key of [spec.name, ...spec.aliases]) {
        const stack = layers.get(key) ?? [];
        const below = stack[stack.length - 1];
        if (below !== undefined) {
          logger.warn({
            level: "warn",
            code: "command.overridden",
            message: `"${key}" is defined by both "${below.plugin}" and "${plugin.id}"; "${plugin.id}" runs first`,
            data: { name: key, kind: "plugin", previous: below.plugin, replacement: plugin.id },
          });
        }
        const layer: CommandLayer =
          resolved.options === undefined
            ? { plugin: plugin.id, spec }
            : { plugin: plugin.id, spec, options: resolved.options };
        stack.push(layer);
        layers.set(key, stack);
      }
    }
  }

  // `next` with nothing below (decision U4): one no-op handler per such name.
  const noNext = new Map<string, CommandHandler>();
  for (const [key, stack] of layers) {
    if (stack.length !== 1) continue;
    noNext.set(key, (): CommandResult => {
      logger.warn({
        level: "warn",
        code: "command.no-next",
        message: `"${key}" called next with no layer below it`,
        data: { name: key },
      });
      return { value: null };
    });
  }

  function handlerAt(stack: readonly CommandLayer[], index: number): CommandHandler {
    const layer = stack[index]!;
    const options = layer.options;
    if (options === undefined) return layer.spec.call;
    return (view, args, next) => layer.spec.call({ ...view, options }, args, next);
  }

  return {
    get(name) {
      const stack = layers.get(name);
      if (stack === undefined) return undefined;
      const top = stack[stack.length - 1];
      if (top === undefined) return undefined;
      const below = stack[stack.length - 2];
      const next = below === undefined ? noNext.get(name) : handlerAt(stack, stack.length - 2);
      if (next === undefined) return undefined;
      const call = handlerAt(stack, stack.length - 1);
      const spec = call === top.spec.call ? top.spec : { ...top.spec, call };
      return { spec, next };
    },
    keys() {
      return [...layers.keys()];
    },
    layerPlugins(name) {
      return (layers.get(name) ?? []).map((layer) => layer.plugin);
    },
  };
}
