/**
 * The provisional built-in registry seam (AD-8; format-spec §9.15 THR-1).
 *
 * ADR 0004 decision 2 fixes the final functional contract as
 * `(view, args, next) -> { out, effects, wait? }` with `request` and `then`;
 * entry 3 rewrites this file and the dispatch half of `script/vm.ts` to that
 * shape. Until then the tracer matches AD-8's *contract shapes* now — a
 * `BuiltinSpec` with `name`, `aliases` and `ParamSpec[]`, an `Arg` carrying a
 * value plus `ref: RefId | null`, and a result that is either
 * `{ done, out }` or `{ yield: Wait }` — so entry 3 replaces the assembly, not
 * the contract.
 *
 * `PROVISIONAL_BUILTINS` is exactly `end` and `sleep`. `end` returns normally:
 * that proves registry resolution and the dispatch path, while `end`/`done`/
 * `stop`'s real unwinding (FUN-7) is entry 13's and the registry assembly,
 * duplicate rule, aliases and lookup precedence are entry 3's. `sleep` takes
 * whole ticks directly, so it applies neither THR-1's seconds→ticks formula
 * (that is `core/time`'s `secondsToTicks`, for `threadSleep`, entry 9) nor the
 * `0`-means-indefinite rule: a `0`, fractional or negative count is a
 * `builtin.bad-arg` `ScriptError`.
 *
 * docs/adr/0004 (decision 2); format-spec §9.15 (THR-1) and §9.16 (SEM-6).
 */

import type { ClockPort } from "../ports/time.ts";
import type { RngPort } from "../ports/rng.ts";
import type { RefId, Value } from "../ports/value.ts";
import type { Wait } from "../ports/wait.ts";
import { ScriptError } from "./errors.ts";

/** One declared parameter of a built-in (AD-8). */
export type ParamSpec = {
  readonly name: string;
  readonly optional: boolean;
  readonly byRef: boolean;
  readonly variadic: boolean;
};

/**
 * One bound argument at dispatch: its value, plus the variable reference to
 * write back when the parameter is by-reference (AD-8; format-spec §9.16
 * SEM-6). `ref` is `null` for a literal or any non-variable argument.
 */
export type Arg = { readonly value: Value; readonly ref: RefId | null };

/** A built-in's outcome: a returned value with outputs, or a wait (AD-8). */
export type BuiltinResult =
  | { readonly done: Value; readonly out: readonly (readonly [number, Value])[] }
  | { readonly yield: Wait };

/** The service ports a built-in may use (AD-8, narrowed for the tracer). */
export type BuiltinCtx = { readonly rng: RngPort; readonly clock: ClockPort };

/** One registered built-in (AD-8). */
export type BuiltinSpec = {
  readonly name: string;
  readonly aliases: readonly string[];
  readonly params: readonly ParamSpec[];
  readonly call: (ctx: BuiltinCtx, args: readonly Arg[]) => BuiltinResult;
};

const NO_PARAMS: readonly ParamSpec[] = [];

/**
 * The tracer's two built-ins. Names are already ASCII case-folded by the
 * frontend, so lookup keys are folded too.
 */
export const PROVISIONAL_BUILTINS: readonly BuiltinSpec[] = [
  {
    name: "end",
    aliases: [],
    params: NO_PARAMS,
    call: () => ({ done: null, out: [] }),
  },
  {
    name: "sleep",
    aliases: [],
    params: [{ name: "ticks", optional: false, byRef: false, variadic: false }],
    call: (ctx, args) => {
      const ticks = args[0]?.value;
      if (typeof ticks !== "number" || !Number.isInteger(ticks) || ticks <= 0) {
        throw new ScriptError(
          "builtin.bad-arg",
          "sleep: the tick count must be a positive whole number",
        );
      }
      return { yield: { kind: "sleep", until: ctx.clock.tick() + ticks } };
    },
  },
];

/** A folded-name lookup over a built-in list (entry 3 replaces the assembly). */
export type BuiltinLookup = { get(name: string): BuiltinSpec | undefined };

/** Build the provisional name/alias lookup (duplicate rule is entry 3's). */
export function createBuiltinLookup(specs: readonly BuiltinSpec[]): BuiltinLookup {
  const byName = new Map<string, BuiltinSpec>();
  for (const spec of specs) {
    byName.set(spec.name, spec);
    for (const alias of spec.aliases) byName.set(alias, spec);
  }
  return { get: (name) => byName.get(name) };
}
