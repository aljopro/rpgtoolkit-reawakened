/**
 * Pure RPGCode maths, seeded random and language-flow commands (ticket 3.13;
 * AD-2, AD-12, AD-13; FUN-7; docs/spec/engine/rpgcode-language.md).
 */

import {
  cos,
  log,
  sin,
  sqrt,
  tan,
} from "../../fmath/index.ts";
import { TICKS_PER_SECOND, secondsToTicks } from "../../time/time.ts";
import type { Arg, BuiltinSpec } from "../builtins.ts";
import { ScriptError } from "../errors.ts";
import { COMPILER_VERSION } from "../program.ts";
import type { CommandEffect } from "../plugin.ts";
import { toNumberValue, toStringValue, truthy } from "../values.ts";

function unaryMath(name: string, operation: (value: number) => number): BuiltinSpec {
  return {
    name,
    aliases: [],
    params: [
      { name: "value", optional: false, byRef: false, variadic: false },
      { name: "dest", optional: true, byRef: true, variadic: false },
    ],
    call: (_view, args) => {
      const value = operation(toNumberValue(args[0]?.value ?? 0));
      return args.length > 1 ? { value, out: [[1, value]] } : { value };
    },
  };
}

const MATH_SPECS: readonly BuiltinSpec[] = [
  unaryMath("sin", sin),
  unaryMath("cos", cos),
  unaryMath("tan", tan),
  unaryMath("sqrt", sqrt),
  unaryMath("log", log),
  {
    name: "random",
    aliases: [],
    params: [
      { name: "max", optional: false, byRef: false, variadic: false },
      { name: "dest", optional: true, byRef: true, variadic: false },
    ],
    call: (view, args) => {
      const max = toNumberValue(args[0]?.value ?? 0);
      if (!Number.isFinite(max) || !Number.isInteger(max) || max < 1) {
        throw new ScriptError("builtin.bad-arg", "random: max must be a positive whole number");
      }
      // The single injected generator is the only source of randomness. A
      // fixed modulo mapping keeps the draw order part of the tick contract.
      const value = 1 + (view.rng.nextUint32() % max);
      return args.length > 1 ? { value, out: [[1, value]] } : { value };
    },
  },
  {
    name: "iif",
    aliases: [],
    params: [
      { name: "condition", optional: false, byRef: false, variadic: false },
      { name: "whenTrue", optional: false, byRef: false, variadic: false },
      { name: "whenFalse", optional: false, byRef: false, variadic: false },
    ],
    call: (_view, args) => ({ value: truthy(args[0]?.value ?? 0) ? (args[1]?.value ?? 0) : (args[2]?.value ?? 0) }),
  },
  {
    name: "gettickcount",
    aliases: [],
    params: [{ name: "milliseconds", optional: true, byRef: true, variadic: false }],
    call: (view, args) => {
      const value = Math.floor((view.clock.tick() * 1000) / TICKS_PER_SECOND);
      return args.length > 0 ? { value, out: [[0, value]] } : { value };
    },
  },
];

function control(args: readonly Arg[], action: "run" | "jump"): CommandEffect {
  if (action === "run") {
    return {
      kind: "vm.control",
      args: [
        "run",
        { kind: "inline", text: toStringValue(args[0]?.value ?? 0), compiler: COMPILER_VERSION },
      ],
    };
  }
  return { kind: "vm.control", args: ["jump", toStringValue(args[0]?.value ?? 0)] };
}

const FLOW_SPECS: readonly BuiltinSpec[] = [
  {
    name: "run",
    aliases: [],
    params: [{ name: "program", optional: false, byRef: false, variadic: false }],
    call: (_view, args) => ({ value: null, effects: [control(args, "run")] }),
  },
  {
    name: "change",
    aliases: [],
    params: [{ name: "program", optional: false, byRef: false, variadic: false }],
    call: (_view, args) => ({ value: null, effects: [{ kind: "flow-control", args: ["change", toStringValue(args[0]?.value ?? "")] }] }),
  },
  {
    name: "rpgcode",
    aliases: [],
    params: [{ name: "line", optional: false, byRef: false, variadic: false }],
    call: (view, args) => ({
      value: null,
      effects: view.thread === undefined ? [] : [{ kind: "vm.control", args: ["threadTell", view.thread, toStringValue(args[0]?.value ?? "")] }],
    }),
  },
  {
    name: "delay",
    aliases: [],
    params: [{ name: "seconds", optional: false, byRef: false, variadic: false }],
    call: (view, args) => {
      const seconds = toNumberValue(args[0]?.value ?? 0);
      const ticks = secondsToTicks(seconds);
      if (ticks === null || ticks < 1) throw new ScriptError("builtin.bad-arg", `delay: ${seconds} is not a valid duration`);
      return { value: null, wait: { kind: "sleep", global: true, until: view.clock.tick() + ticks, resumesCall: true } };
    },
  },
  {
    name: "end",
    aliases: ["done", "stop"],
    params: [],
    call: () => ({ value: null, effects: [{ kind: "vm.control", args: ["end"] }] }),
  },
  {
    name: "branch",
    aliases: ["fbranch"],
    params: [{ name: "label", optional: false, byRef: false, variadic: false }],
    call: (_view, args) => ({ value: null, effects: [control(args, "jump")] }),
  },
];

export const PURE_SPECS: readonly BuiltinSpec[] = [...MATH_SPECS, ...FLOW_SPECS];
