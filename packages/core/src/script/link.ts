/**
 * Linking: placing one lowered file's code after another's in a single Step IR
 * array, so a program and the files it includes run as one flat `Program`
 * (docs/spec/engine/rpgcode-modules-and-objects.md#includes: an included file is
 * merged into the including program).
 *
 * Lowering numbers a file's instructions from 0, so every absolute index it
 * wrote (jump targets, function entries and ends, labels, statement ranges) is
 * shifted by the file's offset in the combined array.
 */

import type { CompiledClass, FunctionInfo, LowerResult, StatementRange } from "./lower.ts";
import type { StepOp } from "./ops.ts";

function shiftLabels(
  labels: { readonly [name: string]: number },
  by: number,
): { [name: string]: number } {
  const out: { [name: string]: number } = {};
  for (const [name, at] of Object.entries(labels)) out[name] = at + by;
  return out;
}

/** A function with its indices shifted; a body-less (pure virtual) prototype has none to shift. */
function shiftInfo(info: FunctionInfo, by: number): FunctionInfo {
  if (info.entry < 0) return info;
  return { ...info, entry: info.entry + by, end: info.end + by, labels: shiftLabels(info.labels, by) };
}

function shiftTable(
  table: { readonly [name: string]: readonly FunctionInfo[] },
  by: number,
): { [name: string]: readonly FunctionInfo[] } {
  const out: { [name: string]: readonly FunctionInfo[] } = {};
  for (const [name, list] of Object.entries(table)) out[name] = list.map((info) => shiftInfo(info, by));
  return out;
}

function shiftOp(op: StepOp, by: number): StepOp {
  if (op.op === "jump" || op.op === "jumpIfFalse") return { ...op, target: op.target + by };
  return op;
}

function shiftClass(cls: CompiledClass, by: number): CompiledClass {
  return {
    ...cls,
    methods: shiftTable(cls.methods, by),
    constructor: cls.constructor === null ? null : shiftInfo(cls.constructor, by),
    destructor: cls.destructor === null ? null : shiftInfo(cls.destructor, by),
  };
}

/** `result` with every absolute instruction index moved `by` places later. */
export function relocate(result: LowerResult, by: number): LowerResult {
  if (by === 0) return result;
  const classes: { [name: string]: CompiledClass } = {};
  for (const [name, cls] of Object.entries(result.classes)) classes[name] = shiftClass(cls, by);
  const statements: StatementRange[] = result.statements.map((range) => ({
    start: range.start + by,
    end: range.end + by,
  }));
  return {
    ops: result.ops.map((op) => shiftOp(op, by)),
    functions: shiftTable(result.functions, by),
    classes,
    labels: shiftLabels(result.labels, by),
    statements,
    defs: result.defs,
  };
}
