/** Board reads and edits (E-14; docs/spec/engine/rpgcode-functions.md#e-14). */
import type { Value } from "../../ports/value.ts";
import type { WorldBoard, WorldProgram, WorldVector } from "../../world/model.ts";
import { ScriptError } from "../errors.ts";
import type { Arg, BuiltinDoc, BuiltinSpec } from "../builtins.ts";
import type { CommandEffect, CommandResult, PluginDefinition } from "../plugin.ts";
import { applyWorldEffect } from "../../world/effects.ts";

function numberArg(args: readonly Arg[], index: number, fallback = 0): number {
  const value = args[index]?.value;
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : fallback;
}
function stringArg(args: readonly Arg[], index: number, fallback = ""): string {
  const value = args[index]?.value;
  return typeof value === "string" ? value : fallback;
}
function output(args: readonly Arg[], index: number, value: Value): readonly (readonly [number, Value])[] {
  const arg = args[index];
  return arg?.ref === null || arg === undefined ? [] : [[index, value]];
}
function board(view: { readonly state?: { readonly world: { readonly board?: WorldBoard | null } } }): WorldBoard {
  const current = view.state?.world.board ?? null;
  if (current === null) throw new ScriptError("world.no-board", "board operation requires a loaded board");
  return current;
}
function location(current: WorldBoard, args: readonly Arg[], layerIndex: number): { readonly index: number; readonly layer: number } | null {
  const x = numberArg(args, 0) - 1;
  const y = numberArg(args, 1) - 1;
  const layer = layerIndex < 0 ? numberArg(args, 2, 1) : layerIndex;
  const layerOffset = layer - 1;
  if (x < 0 || y < 0 || x >= current.sizeX || y >= current.sizeY || layerOffset < 0 || layerOffset >= current.layers.length) return null;
  return { index: y * current.sizeX + x, layer: layerOffset };
}
function tileName(current: WorldBoard, args: readonly Arg[]): string {
  const found = location(current, args, -1);
  if (found === null) return "";
  return current.layers[found.layer]?.tiles[found.index]?.asset ?? "";
}
function typeName(current: WorldBoard, args: readonly Arg[]): string {
  const layer = numberArg(args, 3, 1);
  const x = numberArg(args, 0) - 1;
  const y = numberArg(args, 1) - 1;
  const layerOffset = layer - 1;
  if (x < 0 || y < 0 || x >= current.sizeX || y >= current.sizeY || layerOffset < 0 || layerOffset >= current.layers.length) return "";
  const types = current.runtime?.tileTypes ?? [];
  const flat = layerOffset * current.sizeX * current.sizeY + y * current.sizeX + x;
  return types[flat] ?? "NORMAL";
}
function vector(current: WorldBoard, args: readonly Arg[]): WorldVector | undefined {
  return current.vectors?.[numberArg(args, 0)];
}
function program(current: WorldBoard, args: readonly Arg[]): WorldProgram | undefined {
  return current.programs?.[numberArg(args, 0)];
}
function effect(name: string, args: readonly Arg[], kind: CommandEffect["kind"] = "state-write"): CommandResult {
  void name;
  return { value: null, effects: [{ kind, section: "world", args: args.map((arg) => arg.value as never) }] };
}
function docs(summary: string, behaviour: string, tags: BuiltinDoc["tags"] = ["legacy"]): BuiltinDoc {
  return { summary, behaviour, groups: ["board-tiles-vectors-screen-effects-33"], tags, waits: { kind: "never", summary: "The command completes in the current script turn." } };
}
function noArgs(name: string): BuiltinSpec {
  return { name, aliases: [], params: [], doc: docs(`Obsolete ${name} command.`, "Raises a catchable obsolete-command error and skips the statement.", ["legacy", "obsolete"]), call: () => { throw new ScriptError("builtin.obsolete", `"${name}" is obsolete: the statement is skipped`); } };
}

const GET_NAME: BuiltinSpec = {
  name: "getboardname", aliases: [], params: [{ name: "name", optional: true, byRef: true, variadic: false }],
  doc: docs("Get the file name of the current board.", "Return the loaded board asset key immediately and optionally write it to the by-reference output."),
  call: (view, args) => { const value = board(view).key; return { value, out: output(args, 0, value) }; },
};
const PUT: BuiltinSpec = {
  name: "put", aliases: [], params: [{ name: "args", optional: true, byRef: false, variadic: true }],
  doc: docs("Put a tile on the board until the program ends.", "Record a board tile replacement for the current turn; arguments are x, y, optional one-based layer, and tile asset key. The effect is applied before the next statement and does not wait."),
  call: (view, args) => { board(view); if (args.length !== 3 && args.length !== 4) throw new ScriptError("builtin.bad-arg", '"put" expects x,y,tile or x,y,layer,tile'); return effect("put", args); },
};
const LAYER_PUT: BuiltinSpec = {
  name: "layerput", aliases: [], params: [{ name: "x", optional: false, byRef: false, variadic: false }, { name: "y", optional: false, byRef: false, variadic: false }, { name: "layer", optional: false, byRef: false, variadic: false }, { name: "tile", optional: false, byRef: false, variadic: false }],
  doc: docs("Put a tile on a board layer until the board is left.", "Record a replacement at x, y and one-based layer using the tile asset key; apply it immediately and do not wait."),
  call: (view, args) => { board(view); return effect("layerput", args); },
};
function tileGetter(name: string, alias = ""): BuiltinSpec {
  return { name, aliases: alias === "" ? [] : [alias], params: [{ name: "x", optional: false, byRef: false, variadic: false }, { name: "y", optional: false, byRef: false, variadic: false }, { name: "layer", optional: false, byRef: false, variadic: false }, { name: "dest", optional: true, byRef: true, variadic: false }], doc: docs("Read the tile file at a board position.", "Return the tile asset key at x, y and one-based layer immediately, writing the optional by-reference destination."), call: (view, args) => { const value = tileName(board(view), args); return { value, out: output(args, 3, value) }; } };
}
const TILE_TYPE_GET: BuiltinSpec = {
  name: "getboardtiletype", aliases: [], params: [{ name: "x", optional: false, byRef: false, variadic: false }, { name: "y", optional: false, byRef: false, variadic: false }, { name: "layer", optional: false, byRef: false, variadic: false }, { name: "dest", optional: true, byRef: true, variadic: false }], doc: docs("Read the type of a board tile.", "Return the stored tile type at x, y and one-based layer immediately, writing the optional by-reference destination."), call: (view, args) => { const value = typeName(board(view), args); return { value, out: output(args, 3, value) }; },
};
const TILE_TYPE: BuiltinSpec = {
  name: "tiletype", aliases: [], params: [{ name: "x", optional: false, byRef: false, variadic: false }, { name: "y", optional: false, byRef: false, variadic: false }, { name: "type", optional: false, byRef: false, variadic: false }, { name: "layer", optional: true, byRef: false, variadic: false }], doc: docs("Change a tile type at a board position.", "Set the type string at x, y and optional one-based layer immediately; the call does not wait."), call: (view, args) => { board(view); return effect("tiletype", args); },
};
const AMBIENT: BuiltinSpec = {
  name: "setambientlevel", aliases: [], params: [{ name: "red", optional: false, byRef: false, variadic: false }, { name: "green", optional: false, byRef: false, variadic: false }, { name: "blue", optional: false, byRef: false, variadic: false }], doc: docs("Set the board's ambient light level.", "Write red, green and blue levels in the inclusive -255..255 range immediately; the next draw list uses the new values and the call does not wait."), call: (view, args) => { board(view); return effect("setambientlevel", args); },
};
const GET_VECTOR: BuiltinSpec = {
  name: "boardgetvector", aliases: [], params: [{ name: "vector", optional: false, byRef: false, variadic: false }, { name: "type", optional: false, byRef: true, variadic: false }, { name: "pointCount", optional: false, byRef: true, variadic: false }, { name: "layer", optional: false, byRef: true, variadic: false }, { name: "closed", optional: false, byRef: true, variadic: false }, { name: "attributes", optional: false, byRef: true, variadic: false }], doc: docs("Read a board vector's properties.", "Read the vector at index and write type, point count, layer, closed flag and attributes to the by-reference outputs immediately."), call: (view, args) => { const value = vector(board(view), args); return { value: value === undefined ? 0 : 1, out: [ [1, value?.type ?? 0], [2, value?.points.length ?? 0], [3, value?.layer ?? 0], [4, value?.closed ?? 0], [5, value?.attributes ?? 0] ] }; },
};
const SET_VECTOR: BuiltinSpec = {
  name: "boardsetvector", aliases: [], params: [{ name: "vector", optional: false, byRef: false, variadic: false }, { name: "type", optional: false, byRef: false, variadic: false }, { name: "pointCount", optional: false, byRef: false, variadic: false }, { name: "layer", optional: false, byRef: false, variadic: false }, { name: "closed", optional: false, byRef: false, variadic: false }, { name: "attributes", optional: false, byRef: false, variadic: false }], doc: docs("Set a board vector's properties.", "Replace the vector properties and resize its point list immediately; the call does not wait."), call: (view, args) => { board(view); return effect("boardsetvector", args); },
};
const GET_VECTOR_POINT: BuiltinSpec = {
  name: "boardgetvectorpoint", aliases: [], params: [{ name: "vector", optional: false, byRef: false, variadic: false }, { name: "point", optional: false, byRef: false, variadic: false }, { name: "x", optional: false, byRef: true, variadic: false }, { name: "y", optional: false, byRef: true, variadic: false }], doc: docs("Read one point from a board vector.", "Return the vector point in pixel coordinates and write x and y to the by-reference outputs immediately."), call: (view, args) => { const current = vector(board(view), args)?.points[numberArg(args, 1)]; return { value: current === undefined ? 0 : 1, out: [[2, current?.x ?? 0], [3, current?.y ?? 0]] }; },
};
const SET_VECTOR_POINT: BuiltinSpec = {
  name: "boardsetvectorpoint", aliases: [], params: [{ name: "vector", optional: false, byRef: false, variadic: false }, { name: "point", optional: false, byRef: false, variadic: false }, { name: "x", optional: false, byRef: false, variadic: false }, { name: "y", optional: false, byRef: false, variadic: false }, { name: "apply", optional: true, byRef: false, variadic: false }], doc: docs("Move one point on a board vector.", "Set the point in pixel coordinates immediately; the optional apply flag is accepted for legacy scripts and the call does not wait."), call: (view, args) => { board(view); return effect("boardsetvectorpoint", args); },
};
const GET_PROGRAM: BuiltinSpec = {
  name: "boardgetprogram", aliases: [], params: [{ name: "program", optional: false, byRef: false, variadic: false }, { name: "name", optional: false, byRef: true, variadic: false }, { name: "pointCount", optional: false, byRef: true, variadic: false }, { name: "layer", optional: false, byRef: true, variadic: false }, { name: "closed", optional: false, byRef: true, variadic: false }, { name: "attributes", optional: false, byRef: true, variadic: false }, { name: "repeat", optional: false, byRef: true, variadic: false }], doc: docs("Read a board program's properties.", "Read the program name, point count, layer, closed flag, attributes and repeat distance into by-reference outputs immediately."), call: (view, args) => { const value = program(board(view), args); return { value: value === undefined ? 0 : 1, out: [[1, value?.program ?? ""], [2, value?.points.length ?? 0], [3, value?.layer ?? 0], [4, value?.closed ?? 0], [5, value?.activationType ?? 0], [6, value?.repeatDistance ?? 0]] }; },
};
const SET_PROGRAM: BuiltinSpec = {
  name: "boardsetprogram", aliases: [], params: [{ name: "program", optional: false, byRef: false, variadic: false }, { name: "name", optional: false, byRef: false, variadic: false }, { name: "pointCount", optional: false, byRef: false, variadic: false }, { name: "layer", optional: false, byRef: false, variadic: false }, { name: "closed", optional: false, byRef: false, variadic: false }, { name: "attributes", optional: false, byRef: false, variadic: false }, { name: "repeat", optional: false, byRef: false, variadic: false }], doc: docs("Set a board program's properties.", "Replace or append the program at index and resize its point list immediately; the call does not wait."), call: (view, args) => { board(view); return effect("boardsetprogram", args); },
};
const GET_PROGRAM_POINT: BuiltinSpec = {
  name: "boardgetprogrampoint", aliases: [], params: [{ name: "program", optional: false, byRef: false, variadic: false }, { name: "point", optional: false, byRef: false, variadic: false }, { name: "x", optional: false, byRef: true, variadic: false }, { name: "y", optional: false, byRef: true, variadic: false }], doc: docs("Read one point from a board program.", "Return the program point in pixel coordinates and write x and y to the by-reference outputs immediately."), call: (view, args) => { const current = program(board(view), args)?.points[numberArg(args, 1)]; return { value: current === undefined ? 0 : 1, out: [[2, current?.x ?? 0], [3, current?.y ?? 0]] }; },
};
const SET_PROGRAM_POINT: BuiltinSpec = {
  name: "boardsetprogrampoint", aliases: [], params: [{ name: "program", optional: false, byRef: false, variadic: false }, { name: "point", optional: false, byRef: false, variadic: false }, { name: "x", optional: false, byRef: false, variadic: false }, { name: "y", optional: false, byRef: false, variadic: false }], doc: docs("Move one point on a board program.", "Set the program point in pixel coordinates immediately; the call does not wait."), call: (view, args) => { board(view); return effect("boardsetprogrampoint", args); },
};
const PRG: BuiltinSpec = {
  name: "prg", aliases: [], params: [{ name: "program", optional: false, byRef: false, variadic: false }, { name: "x", optional: false, byRef: false, variadic: false }, { name: "y", optional: false, byRef: false, variadic: false }, { name: "layer", optional: true, byRef: false, variadic: false }], doc: docs("Move a board program to a new location until the board is left.", "Set the first program point to pixel x and y and optional one-based layer immediately; the call does not wait."), call: (view, args) => { board(view); return effect("prg", args); },
};

const WORLD_COMMANDS: readonly BuiltinSpec[] = [
  GET_NAME, PUT, LAYER_PUT, tileGetter("getboardtile", "boardgettile"), TILE_TYPE_GET, TILE_TYPE, noArgs("animatedtiles"), noArgs("parallax"), AMBIENT,
  GET_VECTOR, SET_VECTOR, GET_VECTOR_POINT, SET_VECTOR_POINT, GET_PROGRAM, SET_PROGRAM, GET_PROGRAM_POINT, SET_PROGRAM_POINT, PRG,
  noArgs("setconstants"), noArgs("underarrow"),
];

/** Apply a recorded world effect; exported for engine and host-owned tests. */
export { applyWorldEffect };
export const WORLD_PLUGIN: PluginDefinition = { id: "world", version: "1.0.0", doc: { summary: "Board, layer, tile, vector and program operations.", groups: [] }, commands: WORLD_COMMANDS };
