/**
 * Toolkit 2.x compatibility command pack (docs/spec/engine/rpgcode-dialects.md,
 * ADR 0004 decision 3). It contains only deterministic adapters and recorded
 * effects; legacy DLLs, files and network services are never loaded.
 */

import {
  ScriptError,
  type Arg,
  type BuiltinSpec,
  type CommandHandler,
  type CommandResult,
  type PluginDefinition,
  type ParamSpec,
} from "@tk-reawakened/core";

const NO_PARAMS: readonly ParamSpec[] = [];
const ONE_ARG: readonly ParamSpec[] = [{ name: "value", optional: false, byRef: false, variadic: false }];
const IMAGE_ARGS: readonly ParamSpec[] = [
  { name: "file", optional: false, byRef: false, variadic: false },
  { name: "x", optional: false, byRef: false, variadic: false },
  { name: "y", optional: false, byRef: false, variadic: false },
  { name: "width", optional: false, byRef: false, variadic: false },
  { name: "height", optional: false, byRef: false, variadic: false },
];

function effect(args: readonly Arg[], value: Arg["value"] = null): CommandResult {
  return {
    value,
    effects: [{ kind: "state-write", section: "vm", args: args.map((arg) => arg.value) }],
  };
}

function empty(): CommandResult {
  return { value: null, effects: [{ kind: "state-write", section: "vm", args: [] }] };
}

function fbranch(_view: Parameters<CommandHandler>[0], args: readonly Arg[]): CommandResult {
  const label = args[0]?.value;
  if (typeof label !== "string") throw new ScriptError("builtin.bad-arg", "fbranch requires a label argument");
  return { value: null, effects: [{ kind: "vm.control", args: ["fbranch", label] }] };
}

function speed(args: readonly Arg[]): number {
  const value = args[0]?.value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") throw new ScriptError("builtin.bad-arg", "walkspeed requires a number or speed name");
  const folded = value.toLowerCase();
  if (folded === "slow") return 1;
  if (folded === "normal" || folded === "medium") return 2;
  if (folded === "fast") return 3;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  throw new ScriptError("builtin.bad-arg", `unknown TK2 speed ${JSON.stringify(value)}`);
}

function speedAdapter(view: Parameters<CommandHandler>[0], args: readonly Arg[], next: CommandHandler): CommandResult {
  const converted: Arg[] = [{ value: speed(args), ref: args[0]?.ref ?? null }];
  return next(view, converted, next);
}

function unsupported(name: string): CommandHandler {
  return () => {
    throw new ScriptError("command.request-unsupported", `TK2 plugin command ${name} has no native implementation`);
  };
}

function stub(name: string): BuiltinSpec {
  return { name, aliases: [], params: [{ name: "args", optional: true, byRef: false, variadic: true }], call: unsupported(name) };
}

const pluginCommandNames = [
  "addplyr", "cntrtext", "ftpclose", "ftpconnect", "ftpfileclose",
  "ftpopen", "ftpwrite", "httpread", "ksniloc_email_send", "menu", "mlib",
  "nlib", "npc_talk", "queue", "queues", "sell", "stack", "stacks", "system",
] as const;

const SET_IMAGE: BuiltinSpec = {
  name: "setimage",
  aliases: ["setimagetransparent", "setimageadditive"],
  params: IMAGE_ARGS,
  call: (_view, args) => {
    if (args.length !== 5) throw new ScriptError("arity.mismatch", "TK2 SetImage requires file, x, y, width and height");
    return effect(args);
  },
};

const WALK_SPEED: BuiltinSpec = {
  name: "walkspeed",
  aliases: [],
  params: ONE_ARG,
  call: speedAdapter,
};

const ITEM_WALK_SPEED: BuiltinSpec = {
  name: "itemwalkspeed",
  aliases: [],
  params: ONE_ARG,
  call: speedAdapter,
};

const NEW_PLAYER: BuiltinSpec = {
  name: "newplyr",
  aliases: ["newplayer"],
  params: ONE_ARG,
  call: (_view, args) => effect(args),
};

/** The manifest id `tk2` resolves to this one compatibility pack. */
export const TK2_COMPAT_PLUGIN: PluginDefinition = {
  id: "tk2",
  version: "1.0.0",
  commands: [
    { name: "empty", aliases: [], params: NO_PARAMS, call: empty },
    { name: "fbranch", aliases: [], params: [{ name: "label", optional: false, byRef: false, variadic: false }], call: fbranch },
    SET_IMAGE,
    WALK_SPEED,
    ITEM_WALK_SPEED,
    NEW_PLAYER,
    ...pluginCommandNames.map(stub),
  ],
};

export const TK2_COMPAT_MANIFEST_ENTRY = { id: "tk2" } as const;
