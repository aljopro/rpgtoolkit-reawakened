/**
 * Pure string built-in commands (ticket 3.12; SEM-5, SEM-6; R2-Q15; docs/spec/engine/rpgcode-functions.md).
 *
 * Implements len, length, left, right, mid, inStr, replace, regExpReplace,
 * split, trim, lcase, ucase, asc, chr, charAt, spliceVariables.
 */

import { ScriptError } from "../errors.ts";
import type { BuiltinSpec } from "../builtins.ts";
import { foldAscii, toInt32, toStringValue } from "../values.ts";

export const STRING_SPECS: readonly BuiltinSpec[] = [
  {
    name: "len",
    aliases: [],
    params: [
      { name: "str", optional: false, byRef: false, variadic: false },
      { name: "ret", optional: true, byRef: true, variadic: false },
    ],
    call: (_view, args) => {
      const s = toStringValue(args[0]?.value ?? "");
      const len = s.length;
      return args.length > 1 ? { value: len, out: [[1, len]] } : { value: len };
    },
  },
  {
    name: "length",
    aliases: [],
    params: [
      { name: "str", optional: false, byRef: false, variadic: false },
      { name: "ret", optional: true, byRef: true, variadic: false },
    ],
    call: (_view, args) => {
      const s = toStringValue(args[0]?.value ?? "");
      const len = s.length;
      return args.length > 1 ? { value: len, out: [[1, len]] } : { value: len };
    },
  },
  {
    name: "left",
    aliases: [],
    params: [
      { name: "str", optional: false, byRef: false, variadic: false },
      { name: "count", optional: false, byRef: false, variadic: false },
      { name: "ret", optional: true, byRef: true, variadic: false },
    ],
    call: (_view, args) => {
      const s = toStringValue(args[0]?.value ?? "");
      const count = Math.max(0, toInt32(args[1]?.value ?? 0));
      const res = s.slice(0, count);
      return args.length > 2 ? { value: res, out: [[2, res]] } : { value: res };
    },
  },
  {
    name: "right",
    aliases: [],
    params: [
      { name: "str", optional: false, byRef: false, variadic: false },
      { name: "count", optional: false, byRef: false, variadic: false },
      { name: "ret", optional: true, byRef: true, variadic: false },
    ],
    call: (_view, args) => {
      const s = toStringValue(args[0]?.value ?? "");
      const count = Math.max(0, toInt32(args[1]?.value ?? 0));
      const res = count === 0 ? "" : count >= s.length ? s : s.slice(s.length - count);
      return args.length > 2 ? { value: res, out: [[2, res]] } : { value: res };
    },
  },
  {
    name: "mid",
    aliases: [],
    params: [
      { name: "str", optional: false, byRef: false, variadic: false },
      { name: "start", optional: false, byRef: false, variadic: false },
      { name: "length", optional: false, byRef: false, variadic: false },
      { name: "dest", optional: true, byRef: true, variadic: false },
    ],
    call: (_view, args) => {
      const s = toStringValue(args[0]?.value ?? "");
      const start = toInt32(args[1]?.value ?? 0);
      const length = Math.max(0, toInt32(args[2]?.value ?? 0));
      const jsStart = start < 1 ? 0 : start - 1;
      const res = jsStart >= s.length || length <= 0 ? "" : s.slice(jsStart, jsStart + length);
      return args.length > 3 ? { value: res, out: [[3, res]] } : { value: res };
    },
  },
  {
    name: "instr",
    aliases: [],
    params: [
      { name: "haystack", optional: false, byRef: false, variadic: false },
      { name: "needle", optional: false, byRef: false, variadic: false },
      { name: "offset", optional: true, byRef: false, variadic: false },
      { name: "ret", optional: true, byRef: true, variadic: false },
    ],
    call: (_view, args) => {
      const haystack = toStringValue(args[0]?.value ?? "");
      const needle = toStringValue(args[1]?.value ?? "");
      const offset = args.length > 2 ? Math.max(1, toInt32(args[2]?.value ?? 1)) : 1;
      const jsOffset = offset - 1;
      let pos = 0;
      if (jsOffset <= haystack.length) {
        const idx = haystack.indexOf(needle, jsOffset);
        pos = idx === -1 ? 0 : idx + 1;
      }
      return args.length > 3 ? { value: pos, out: [[3, pos]] } : { value: pos };
    },
  },
  {
    name: "replace",
    aliases: [],
    params: [
      { name: "str", optional: false, byRef: false, variadic: false },
      { name: "find", optional: false, byRef: false, variadic: false },
      { name: "replace", optional: false, byRef: false, variadic: false },
      { name: "dest", optional: true, byRef: true, variadic: false },
    ],
    call: (_view, args) => {
      const s = toStringValue(args[0]?.value ?? "");
      const find = toStringValue(args[1]?.value ?? "");
      const rep = toStringValue(args[2]?.value ?? "");
      const res = find === "" ? s : s.split(find).join(rep);
      return args.length > 3 ? { value: res, out: [[3, res]] } : { value: res };
    },
  },
  {
    name: "regexpreplace",
    aliases: [],
    params: [
      { name: "subject", optional: false, byRef: false, variadic: false },
      { name: "pattern", optional: false, byRef: false, variadic: false },
      { name: "replace", optional: false, byRef: false, variadic: false },
      { name: "dest", optional: true, byRef: true, variadic: false },
    ],
    call: (_view, args) => {
      const subject = toStringValue(args[0]?.value ?? "");
      const pattern = toStringValue(args[1]?.value ?? "");
      const rep = toStringValue(args[2]?.value ?? "");
      let regex: RegExp;
      try {
        regex = new RegExp(pattern, "g");
      } catch {
        throw new ScriptError("builtin.bad-arg", "regExpReplace: invalid regular expression");
      }
      const res = subject.replace(regex, rep);
      return args.length > 3 ? { value: res, out: [[3, res]] } : { value: res };
    },
  },
  {
    name: "split",
    aliases: [],
    params: [
      { name: "str", optional: false, byRef: false, variadic: false },
      { name: "delim", optional: false, byRef: false, variadic: false },
      { name: "arr", optional: false, byRef: true, variadic: false },
    ],
    call: (_view, args) => {
      const str = toStringValue(args[0]?.value ?? "");
      const delim = toStringValue(args[1]?.value ?? "");
      const arrArg = args[2];
      if (!arrArg || arrArg.ref === null) {
        throw new ScriptError("builtin.out-not-by-ref", "split: array parameter must be a variable");
      }
      const parts = str.split(delim);
      return {
        value: parts.length + 1,
        effects: [{ kind: "vm.control", args: ["split", arrArg.ref, ...parts] }],
      };
    },
  },
  {
    name: "trim",
    aliases: [],
    params: [
      { name: "str", optional: false, byRef: false, variadic: false },
      { name: "dest", optional: true, byRef: true, variadic: false },
    ],
    call: (_view, args) => {
      const s = toStringValue(args[0]?.value ?? "");
      const res = s.trim();
      return args.length > 1 ? { value: res, out: [[1, res]] } : { value: res };
    },
  },
  {
    name: "lcase",
    aliases: [],
    params: [
      { name: "str", optional: false, byRef: false, variadic: false },
      { name: "dest", optional: true, byRef: true, variadic: false },
    ],
    call: (_view, args) => {
      const s = toStringValue(args[0]?.value ?? "");
      const res = foldAscii(s);
      return args.length > 1 ? { value: res, out: [[1, res]] } : { value: res };
    },
  },
  {
    name: "ucase",
    aliases: [],
    params: [
      { name: "str", optional: false, byRef: false, variadic: false },
      { name: "dest", optional: true, byRef: true, variadic: false },
    ],
    call: (_view, args) => {
      const s = toStringValue(args[0]?.value ?? "");
      let res = "";
      for (let i = 0; i < s.length; i++) {
        const code = s.charCodeAt(i);
        res += code >= 97 && code <= 122 ? String.fromCharCode(code - 32) : s[i]!;
      }
      return args.length > 1 ? { value: res, out: [[1, res]] } : { value: res };
    },
  },
  {
    name: "asc",
    aliases: [],
    params: [
      { name: "str", optional: false, byRef: false, variadic: false },
      { name: "ret", optional: true, byRef: true, variadic: false },
    ],
    call: (_view, args) => {
      const s = toStringValue(args[0]?.value ?? "");
      const res = s.length === 0 ? 0 : s.charCodeAt(0);
      return args.length > 1 ? { value: res, out: [[1, res]] } : { value: res };
    },
  },
  {
    name: "chr",
    aliases: [],
    params: [
      { name: "code", optional: false, byRef: false, variadic: false },
      { name: "ret", optional: true, byRef: true, variadic: false },
    ],
    call: (_view, args) => {
      const code = toInt32(args[0]?.value ?? 0);
      const res = String.fromCharCode(code & 0xffff);
      return args.length > 1 ? { value: res, out: [[1, res]] } : { value: res };
    },
  },
  {
    name: "charat",
    aliases: [],
    params: [
      { name: "str", optional: false, byRef: false, variadic: false },
      { name: "index", optional: false, byRef: false, variadic: false },
      { name: "ret", optional: true, byRef: true, variadic: false },
    ],
    call: (_view, args) => {
      const s = toStringValue(args[0]?.value ?? "");
      const pos = toInt32(args[1]?.value ?? 0);
      const res = pos >= 1 && pos <= s.length ? s[pos - 1]! : "";
      return args.length > 2 ? { value: res, out: [[2, res]] } : { value: res };
    },
  },
  {
    name: "splicevariables",
    aliases: [],
    params: [
      { name: "str", optional: false, byRef: false, variadic: false },
      { name: "dest", optional: true, byRef: true, variadic: false },
    ],
    call: (view, args) => {
      const s = toStringValue(args[0]?.value ?? "");
      const globals = view.state?.vm.globals;
      const res = s.replace(/<([^>]+)>/g, (_match, name) => {
        const key = foldAscii(name);
        if (globals && Object.hasOwn(globals, key)) {
          return toStringValue(globals[key] ?? "");
        }
        return "";
      });
      return args.length > 1 ? { value: res, out: [[1, res]] } : { value: res };
    },
  },
];
