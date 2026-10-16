/**
 * Pure scope and variable built-in commands (ticket 3.12; SEM-4, SEM-5; R2-Q13, R2-Q14).
 *
 * Implements autoLocal, kill, local, and global.
 */

import type { BuiltinSpec } from "../builtins.ts";
import { toStringValue, truthy } from "../values.ts";

export const SCOPE_SPECS: readonly BuiltinSpec[] = [
  {
    name: "autolocal",
    aliases: [],
    params: [{ name: "bool", optional: false, byRef: false, variadic: false }],
    call: (_view, args) => {
      const enabled = truthy(args[0]?.value ?? 0);
      return {
        value: null,
        effects: [{ kind: "vm.control", args: ["autoLocal", enabled] }],
      };
    },
  },
  {
    name: "kill",
    aliases: [],
    params: [{ name: "var", optional: false, byRef: false, variadic: true }],
    call: (_view, args) => {
      const names: string[] = [];
      for (const arg of args) {
        if (arg.ref !== null) {
          const sep = arg.ref.indexOf(":");
          names.push(sep >= 0 ? arg.ref.slice(sep + 1) : arg.ref);
        } else if (typeof arg.value === "string") {
          names.push(arg.value);
        }
      }
      return {
        value: null,
        effects: [{ kind: "vm.control", args: ["kill", ...names] }],
      };
    },
  },
  {
    name: "local",
    aliases: [],
    params: [
      { name: "name", optional: false, byRef: false, variadic: false },
      { name: "ret", optional: true, byRef: true, variadic: false },
    ],
    call: (_view, args) => {
      const raw = args[0]?.ref !== null ? args[0]?.ref : args[0]?.value;
      const name =
        typeof raw === "string"
          ? (raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw)
          : toStringValue(args[0]?.value ?? "");
      const effects = [{ kind: "vm.control" as const, args: ["local", name] }];
      return args.length > 1
        ? { value: 0, effects, out: [[1, 0]] }
        : { value: 0, effects };
    },
  },
  {
    name: "global",
    aliases: [],
    params: [
      { name: "name", optional: false, byRef: false, variadic: false },
      { name: "ret", optional: true, byRef: true, variadic: false },
    ],
    call: (_view, args) => {
      const raw = args[0]?.ref !== null ? args[0]?.ref : args[0]?.value;
      const name =
        typeof raw === "string"
          ? (raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw)
          : toStringValue(args[0]?.value ?? "");
      const effects = [{ kind: "vm.control" as const, args: ["global", name] }];
      return args.length > 1
        ? { value: 0, effects, out: [[1, 0]] }
        : { value: 0, effects };
    },
  },
];
