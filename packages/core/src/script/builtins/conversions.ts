/**
 * Pure conversion built-in commands (ticket 3.12; SEM-3; R2-Q12; docs/spec/engine/rpgcode-runtime.md).
 *
 * Implements castLit, castNum, and castInt.
 */

import type { BuiltinSpec } from "../builtins.ts";
import { numberToString, toInt32, toNumberValue } from "../values.ts";

export const CONVERSION_SPECS: readonly BuiltinSpec[] = [
  {
    name: "castlit",
    aliases: [],
    params: [
      { name: "val", optional: false, byRef: false, variadic: false },
      { name: "dest", optional: true, byRef: true, variadic: false },
    ],
    call: (_view, args) => {
      const val = args[0]?.value;
      const res =
        typeof val === "number" ? numberToString(val) : typeof val === "string" ? val : "0";
      return args.length > 1 ? { value: res, out: [[1, res]] } : { value: res };
    },
  },
  {
    name: "castnum",
    aliases: [],
    params: [
      { name: "val", optional: false, byRef: false, variadic: false },
      { name: "dest", optional: true, byRef: true, variadic: false },
    ],
    call: (_view, args) => {
      const res = toNumberValue(args[0]?.value ?? 0);
      return args.length > 1 ? { value: res, out: [[1, res]] } : { value: res };
    },
  },
  {
    name: "castint",
    aliases: [],
    params: [
      { name: "val", optional: false, byRef: false, variadic: false },
      { name: "dest", optional: true, byRef: true, variadic: false },
    ],
    call: (_view, args) => {
      const res = toInt32(args[0]?.value ?? 0);
      return args.length > 1 ? { value: res, out: [[1, res]] } : { value: res };
    },
  },
];
