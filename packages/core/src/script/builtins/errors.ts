/**
 * Error-handling and diagnostic built-in commands (ticket 3.7; ERR-1, ERR-2).
 *
 * `setErrorHandler`, `setResumeNextHandler` and `resumeNext` act on the
 * calling frame's handler slot, and `debug` and `debugger` act on the Logger,
 * so each reports a `vm.control` effect that the VM applies; none of them
 * touches a host API or `console`. The legacy `on error` statements parse into
 * calls of the first two.
 */

import type { BuiltinSpec } from "../builtins.ts";
import { ScriptError } from "../errors.ts";
import { toStringValue, truthy } from "../values.ts";

export const ERROR_SPECS: readonly BuiltinSpec[] = [
  {
    name: "seterrorhandler",
    aliases: [],
    params: [{ name: "label", optional: false, byRef: false, variadic: false }],
    call: (_view, args) => {
      const raw = args[0]?.value;
      const label = typeof raw === "string" ? raw : toStringValue(raw ?? "");
      if (label === "") {
        throw new ScriptError("builtin.bad-arg", "setErrorHandler: the handler label is empty");
      }
      return { value: null, effects: [{ kind: "vm.control", args: ["setErrorHandler", label] }] };
    },
  },
  {
    name: "setresumenexthandler",
    aliases: [],
    params: [],
    call: () => ({ value: null, effects: [{ kind: "vm.control", args: ["setResumeNextHandler"] }] }),
  },
  {
    name: "resumenext",
    aliases: [],
    params: [],
    call: () => ({ value: null, effects: [{ kind: "vm.control", args: ["resumeNext"] }] }),
  },
  {
    name: "debug",
    aliases: [],
    params: [{ name: "state", optional: false, byRef: false, variadic: false }],
    call: (_view, args) => ({
      value: null,
      effects: [{ kind: "vm.control", args: ["debug", truthy(args[0]?.value ?? 0)] }],
    }),
  },
  {
    name: "debugger",
    aliases: [],
    params: [{ name: "msg", optional: false, byRef: false, variadic: false }],
    call: (_view, args) => ({
      value: null,
      effects: [{ kind: "vm.control", args: ["debugger", toStringValue(args[0]?.value ?? "")] }],
    }),
  },
];
