/**
 * The built-in command seam: `ParamSpec`, `Arg`, `BuiltinSpec` and the `core`
 * pack (AD-8; ADR 0004 decisions 2 and 6; docs/spec/engine/rpgcode-errors-and-threads.md#threads THR-1).
 *
 * `BuiltinSpec` is AD-8's registry unit — a name, its aliases, its declared
 * parameters and the handler — and `call` is ADR 0004 decision 2's functional
 * contract `(view, args, next) -> CommandResult` (see `script/plugin.ts` for
 * the result). `script/registry.ts` layers specs and supplies `next`;
 * `script/vm.ts` resolves, checks arity and dispatches.
 *
 * `CORE_PLUGIN` is the built-in `core` pack: layer 0 of the ordered plugin list
 * every caller assembles (ADR 0004 decision 6). Entry 3 holds only the tracer's
 * two commands. `end` returns normally (`{ value: null }`): that proves
 * registry resolution and the dispatch path, while `end`/`done`/`stop`'s real
 * unwinding (FUN-7) is entry 13's, and entry 21 registers the catalogue here.
 * `sleep` takes whole ticks directly and is a blocking command (R-32: its wait
 * is `global`), so it applies neither THR-1's seconds→ticks formula nor the
 * `0`-means-indefinite rule: a `0`, fractional or negative count is a
 * `builtin.bad-arg` `ScriptError`. The cooperative, per-thread sleep is
 * `threadSleep` (`script/builtins/threads.ts`).
 *
 * docs/adr/0004 (decision 2); docs/spec/engine/rpgcode-errors-and-threads.md#threads (THR-1) (SEM-6).
 */

import type { Value } from "../ports/value.ts";
import type { RefId } from "../ports/value.ts";
import { ScriptError } from "./errors.ts";
import type { CommandHandler, PluginDefinition } from "./plugin.ts";
import { CONVERSION_SPECS } from "./builtins/conversions.ts";
import { ERROR_SPECS } from "./builtins/errors.ts";
import { FILE_SPECS } from "./builtins/files.ts";
import { SCOPE_SPECS } from "./builtins/scope.ts";
import { STRING_SPECS } from "./builtins/strings.ts";
import { THREAD_SPECS } from "./builtins/threads.ts";
import { PURE_SPECS } from "./builtins/pure.ts";
export type ParamSpec = {
  readonly name: string;
  readonly optional: boolean;
  readonly byRef: boolean;
  readonly variadic: boolean;
};

/**
 * One bound argument at dispatch: its value, plus the variable reference to
 * write back when the parameter is by-reference (AD-8; docs/spec/engine/rpgcode-runtime.md#sem-3--comparison-and-conversion
 * SEM-6). `ref` is `null` for a literal or any non-variable argument.
 */
export type Arg = { readonly value: Value; readonly ref: RefId | null };

/** One registered command of a plugin (AD-8). `call` is the AD-8 contract. */
export type BuiltinSpec = {
  readonly name: string;
  readonly aliases: readonly string[];
  readonly params: readonly ParamSpec[];
  readonly call: CommandHandler;
};

/**
 * The built-in `core` pack (ADR 0004 decision 6). Names are already ASCII
 * case-folded by the frontend, so lookup keys are folded too.
 */
export const CORE_PLUGIN: PluginDefinition = {
  id: "core",
  version: "1.0.0",
  commands: [
    ...PURE_SPECS,
    {
      name: "sleep",
      aliases: [],
      params: [{ name: "ticks", optional: false, byRef: false, variadic: false }],
      call: (view, args) => {
        const ticks = args[0]?.value;
        if (typeof ticks !== "number" || !Number.isInteger(ticks) || ticks <= 0) {
          throw new ScriptError(
            "builtin.bad-arg",
            "sleep: the tick count must be a positive whole number",
          );
        }
        return {
          value: null,
          wait: {
            kind: "sleep",
            global: true,
            until: view.clock.tick() + ticks,
            resumesCall: true,
          },
        };
      },
    },
    ...STRING_SPECS,
    ...CONVERSION_SPECS,
    ...SCOPE_SPECS,
    ...THREAD_SPECS,
    ...ERROR_SPECS,
    ...FILE_SPECS,
  ],
};
