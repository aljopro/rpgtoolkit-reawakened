/**
 * The command registry: pure assembly of an ordered `PluginDefinition[]` and
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
 * frontend (format-spec §9.2 LEX-10), so this module keys on the string as
 * given and does no folding of its own.
 *
 * **Tiers.** AD-8's lookup precedence is redirect, script function, built-in,
 * extension, and the VM and the LSP share it. `createCommandLookup` is that
 * skeleton: the registry supplies the built-in tier, and the redirect, script
 * function and extension tiers are stubs until entries 8, 5/6 and 21/22 fill
 * them (a stub resolves nothing, so an unknown name still reaches
 * `unknown.command`). The extension tier is the seam the legacy engine had —
 * an unknown call is offered to each plugin by name, first claim wins
 * (`docs/spec/engine/plugins-and-battle.md`, "RPGCode command plugins";
 * `docs/spec/engine/rpgcode-language.md`, "Plugin commands") — kept here so
 * entries 21/22 register the catalogue and the stub set through it.
 *
 * docs/adr/0004 (decisions 2 and 6); AD-8, AD-24; docs/spec/engine/
 * rpgcode-language.md ("Plugin commands").
 */

import type { Logger } from "../ports/logger.ts";
import type { BuiltinSpec } from "./builtins.ts";
import type { ParamInfo } from "./lower.ts";
import type { CommandHandler, CommandResult, PluginDefinition } from "./plugin.ts";
import type { Program, ProgramRef } from "./program.ts";
/** One layer of one name: the plugin that contributed it and its spec. */
type CommandLayer = { readonly plugin: string; readonly spec: BuiltinSpec };

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
export type CommandLookup = { get(name: string): ResolvedCommand | undefined };

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

/**
 * Resolve a call in AD-8's order: redirect -> script function -> built-in -> extension.
 * A script function resolves by name and parameter count (FUN-1).
 */
export function resolveCall(
  name: string,
  argc: number,
  program: Program,
  commands: CommandLookup,
): CallResolution | undefined {
  // 1. Script function tier
  const fnList = program.functions[name];
  if (fnList) {
    const match = fnList.find((fn) => fn.params.length === argc);
    if (match) {
      return {
        kind: "function",
        target: {
          program: program.ref,
          entry: match.entry,
          params: match.params,
        },
      };
    }
  }

  // 2. Builtin / Extension tier
  const command = commands.get(name);
  if (command !== undefined) {
    return { kind: "command", command };
  }

  return undefined;
}

/**
 * Assemble an ordered plugin list into one layered registry (ADR 0004 decisions
 * 2 and 6). The list is the whole chain: `createScriptServices` passes the
 * built-in `core` pack as layer 0 followed by the caller's layers, and pinning
 * `core` against removal is entry 25's.
 *
 * Pure over the list: the same plugins and the same logger records produce the
 * same registry, and nothing here touches game state.
 */
export function assembleCommands(
  plugins: readonly PluginDefinition[],
  logger: Logger,
): CommandRegistry {
  const layers = new Map<string, CommandLayer[]>();

  for (const plugin of plugins) {
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
        stack.push({ plugin: plugin.id, spec });
        layers.set(key, stack);
      }
    }
  }

  // `next` with nothing below (decision U4): one no-op handler per such name,
  // so a dispatch allocates nothing. It returns the empty result and warns once
  // per call, so a wrapper placed below the layer it meant to wrap is visible
  // rather than silent.
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

  return {
    get(name) {
      const stack = layers.get(name);
      if (stack === undefined) return undefined;
      const top = stack[stack.length - 1];
      if (top === undefined) return undefined;
      const below = stack[stack.length - 2];
      const next = below === undefined ? noNext.get(name) : below.spec.call;
      if (next === undefined) return undefined;
      return { spec: top.spec, next };
    },
    keys() {
      return [...layers.keys()];
    },
  };
}
