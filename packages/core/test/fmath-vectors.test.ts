// Committed bit patterns for `core/fmath` (ADR 0002 Decision 2, AD-13).
//
// Every export is pinned to the exact double it must return, as the 16-hex
// IEEE-754 bit pattern. The patterns were produced by running the
// implementation, never by hand; the same fixpoint is what makes replays and
// state hashes portable between JavaScript engines. A future export cannot
// slip out unpinned: the coverage test compares the table against the module's
// own keys.
//
// Each vector is evaluated twice in the same process — once in table order,
// once in reverse — so any hidden state or ordering dependence shows up as a
// mismatch. `../../src/index.ts`-style mirrors do not appear here on purpose:
// the surface is the `fmath` barrel.
import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import * as fmath from "../src/fmath/index.ts";

interface Vector {
  name: string;
  args: readonly number[];
  bits: string;
}

const VECTORS: readonly Vector[] = [
  { name: "PI", args: [], bits: "0x400921fb54442d18" },
  { name: "HALF_PI", args: [], bits: "0x3ff921fb54442d18" },
  { name: "QUARTER_PI", args: [], bits: "0x3fe921fb54442d18" },
  { name: "TAU", args: [], bits: "0x401921fb54442d18" },
  { name: "E", args: [], bits: "0x4005bf0a8b145769" },
  { name: "LN2", args: [], bits: "0x3fe62e42fefa39ef" },
  { name: "LN10", args: [], bits: "0x40026bb1bbb55516" },
  { name: "LOG2E", args: [], bits: "0x3ff71547652b82fe" },
  { name: "LOG10E", args: [], bits: "0x3fdbcb7b1526e50e" },
  { name: "SQRT2", args: [], bits: "0x3ff6a09e667f3bcd" },
  { name: "SQRT1_2", args: [], bits: "0x3fe6a09e667f3bcd" },
  { name: "DEG_TO_RAD", args: [], bits: "0x3f91df46a2529d39" },
  { name: "RAD_TO_DEG", args: [], bits: "0x404ca5dc1a63c1f8" },
  { name: "TAN_PI_8", args: [], bits: "0x3fda827999fcef34" },
  { name: "TRIG_ARG_MAX", args: [], bits: "0x4240000000000000" },
  { name: "sin", args: [0], bits: "0x0000000000000000" },
  { name: "sin", args: [-0], bits: "0x8000000000000000" },
  { name: "sin", args: [0.5], bits: "0x3fdeaee8744b05f0" },
  { name: "sin", args: [100000000000], bits: "0x3fedb7dbc47abb83" },
  { name: "sin", args: [1000000000000], bits: "0x7ff8000000000000" },
  { name: "sin", args: [NaN], bits: "0x7ff8000000000000" },
  { name: "cos", args: [0], bits: "0x3ff0000000000000" },
  { name: "cos", args: [1], bits: "0x3fe14a280fb5068c" },
  { name: "cos", args: [3.141592653589793], bits: "0xbff0000000000000" },
  { name: "cos", args: [1000000000000], bits: "0x7ff8000000000000" },
  { name: "cos", args: [NaN], bits: "0x7ff8000000000000" },
  { name: "tan", args: [0], bits: "0x0000000000000000" },
  { name: "tan", args: [-0], bits: "0x8000000000000000" },
  { name: "tan", args: [1], bits: "0x3ff8eb245cbee3a5" },
  { name: "tan", args: [1000000000000], bits: "0x7ff8000000000000" },
  { name: "atan", args: [0], bits: "0x0000000000000000" },
  { name: "atan", args: [-0], bits: "0x8000000000000000" },
  { name: "atan", args: [1], bits: "0x3fe921fb54442d18" },
  { name: "atan", args: [100], bits: "0x3ff8f905eb2def21" },
  { name: "atan", args: [-1e+300], bits: "0xbff921fb54442d18" },
  { name: "atan", args: [Infinity], bits: "0x3ff921fb54442d18" },
  { name: "atan2", args: [0, -1], bits: "0x400921fb54442d18" },
  { name: "atan2", args: [-0, 1], bits: "0x8000000000000000" },
  { name: "atan2", args: [1, 1], bits: "0x3fe921fb54442d18" },
  { name: "atan2", args: [Infinity, Infinity], bits: "0x3fe921fb54442d18" },
  { name: "atan2", args: [-Infinity, -Infinity], bits: "0xc002d97c7f3321d2" },
  { name: "atan2", args: [-0, -0], bits: "0xc00921fb54442d18" },
  { name: "atan2", args: [1, 0], bits: "0x3ff921fb54442d18" },
  { name: "atan2", args: [NaN, 1], bits: "0x7ff8000000000000" },
  { name: "asin", args: [0], bits: "0x0000000000000000" },
  { name: "asin", args: [-0], bits: "0x8000000000000000" },
  { name: "asin", args: [0.5], bits: "0x3fe0c152382d7366" },
  { name: "asin", args: [1], bits: "0x3ff921fb54442d18" },
  { name: "asin", args: [1.0000001], bits: "0x7ff8000000000000" },
  { name: "asin", args: [NaN], bits: "0x7ff8000000000000" },
  { name: "acos", args: [0], bits: "0x3ff921fb54442d18" },
  { name: "acos", args: [1], bits: "0x0000000000000000" },
  { name: "acos", args: [-1], bits: "0x400921fb54442d18" },
  { name: "acos", args: [2], bits: "0x7ff8000000000000" },
  { name: "exp", args: [0], bits: "0x3ff0000000000000" },
  { name: "exp", args: [-0], bits: "0x3ff0000000000000" },
  { name: "exp", args: [1], bits: "0x4005bf0a8b14576a" },
  { name: "exp", args: [-1], bits: "0x3fd78b56362cef38" },
  { name: "exp", args: [709], bits: "0x7fdd422d2be5dc9b" },
  { name: "exp", args: [710], bits: "0x7ff0000000000000" },
  { name: "exp", args: [-746], bits: "0x0000000000000000" },
  { name: "exp", args: [-745], bits: "0x0000000000000001" },
  { name: "exp", args: [-744], bits: "0x0000000000000002" },
  { name: "exp", args: [-708], bits: "0x0017c8ab2288c9ac" },
  { name: "exp", args: [Infinity], bits: "0x7ff0000000000000" },
  { name: "exp", args: [NaN], bits: "0x7ff8000000000000" },
  { name: "log", args: [1], bits: "0x0000000000000000" },
  { name: "log", args: [2], bits: "0x3fe62e42fefa39ef" },
  { name: "log", args: [0], bits: "0xfff0000000000000" },
  { name: "log", args: [-1], bits: "0x7ff8000000000000" },
  { name: "log", args: [Infinity], bits: "0x7ff0000000000000" },
  { name: "log", args: [NaN], bits: "0x7ff8000000000000" },
  { name: "log2", args: [1], bits: "0x0000000000000000" },
  { name: "log2", args: [2], bits: "0x3ff0000000000000" },
  { name: "log2", args: [8], bits: "0x4008000000000000" },
  { name: "log2", args: [3], bits: "0x3ff95c01a39fbd68" },
  { name: "log2", args: [0], bits: "0xfff0000000000000" },
  { name: "log2", args: [-1], bits: "0x7ff8000000000000" },
  { name: "log10", args: [1], bits: "0x0000000000000000" },
  { name: "log10", args: [10], bits: "0x3ff0000000000000" },
  { name: "log10", args: [100], bits: "0x4000000000000000" },
  { name: "log10", args: [0], bits: "0xfff0000000000000" },
  { name: "log10", args: [-1], bits: "0x7ff8000000000000" },
  { name: "pow", args: [2, 10], bits: "0x4090000000000000" },
  { name: "pow", args: [3, -1], bits: "0x3fd5555555555555" },
  { name: "pow", args: [2, -1025], bits: "0x0002000000000000" },
  { name: "pow", args: [2, -1074], bits: "0x0000000000000001" },
  { name: "pow", args: [10, -309], bits: "0x0000b8157268fdb5" },
  { name: "pow", args: [3, 5], bits: "0x406e600000000000" },
  { name: "pow", args: [2, 0.5], bits: "0x3ff6a09e667f3bcc" },
  { name: "pow", args: [-8, 0.3333333333333333], bits: "0x7ff8000000000000" },
  { name: "pow", args: [0, -1], bits: "0x7ff0000000000000" },
  { name: "pow", args: [-0, -1], bits: "0xfff0000000000000" },
  { name: "pow", args: [1, Infinity], bits: "0x7ff8000000000000" },
  { name: "pow", args: [0, 0], bits: "0x3ff0000000000000" },
  { name: "pow", args: [-2, 3], bits: "0xc020000000000000" },
  { name: "pow", args: [2, Infinity], bits: "0x7ff0000000000000" },
  { name: "pow", args: [2, -Infinity], bits: "0x0000000000000000" },
  { name: "pow", args: [NaN, 0], bits: "0x3ff0000000000000" },
  { name: "pow", args: [2, NaN], bits: "0x7ff8000000000000" },
  { name: "cbrt", args: [0], bits: "0x0000000000000000" },
  { name: "cbrt", args: [-0], bits: "0x8000000000000000" },
  { name: "cbrt", args: [-8], bits: "0xc000000000000000" },
  { name: "cbrt", args: [27], bits: "0x4008000000000000" },
  { name: "cbrt", args: [1e+300], bits: "0x54b249ad2594c37d" },
  { name: "cbrt", args: [NaN], bits: "0x7ff8000000000000" },
  { name: "hypot", args: [3, 4], bits: "0x4014000000000000" },
  { name: "hypot", args: [0, 0], bits: "0x0000000000000000" },
  { name: "hypot", args: [Infinity, 1], bits: "0x7ff0000000000000" },
  { name: "hypot", args: [NaN, 1], bits: "0x7ff8000000000000" },
  { name: "hypot", args: [1e+300, 1e+300], bits: "0x7e40e4d50f99b211" },
  { name: "toRadians", args: [0], bits: "0x0000000000000000" },
  { name: "toRadians", args: [180], bits: "0x400921fb54442d18" },
  { name: "toRadians", args: [-45], bits: "0xbfe921fb54442d18" },
  { name: "toDegrees", args: [0], bits: "0x0000000000000000" },
  { name: "toDegrees", args: [3.141592653589793], bits: "0x4066800000000000" },
  { name: "toDegrees", args: [-1], bits: "0xc04ca5dc1a63c1f8" },
];

type Surface = Record<string, number | ((...args: number[]) => number)>;
const surface = fmath as unknown as Surface;

const view = new DataView(new ArrayBuffer(8));

function bitsOf(value: number): string {
  view.setFloat64(0, value, false);
  return "0x" + view.getBigUint64(0, false).toString(16).padStart(16, "0");
}

function evaluate(vector: Vector): number {
  const target = surface[vector.name];
  if (typeof target === "function") return target(...vector.args);
  if (typeof target === "number") return target;
  throw new Error(`no fmath export named ${vector.name}`);
}

test("every fmath export is pinned by at least one vector", () => {
  const pinned = new Set(VECTORS.map((vector) => vector.name));
  for (const key of Object.keys(fmath)) {
    if (!pinned.has(key)) throw new Error(`export ${key} has no committed vector`);
  }
  for (const vector of VECTORS) {
    if (!Object.prototype.hasOwnProperty.call(fmath, vector.name)) {
      throw new Error(`vector names unknown export ${vector.name}`);
    }
  }
});

test("the committed bit patterns hold in two interleaved passes", () => {
  const forward = VECTORS.map((vector) => bitsOf(evaluate(vector)));
  const backward = VECTORS.map((_, i) => bitsOf(evaluate(VECTORS[VECTORS.length - 1 - i]!))).reverse();
  for (let i = 0; i < VECTORS.length; i++) {
    const label = `${VECTORS[i]!.name}(${VECTORS[i]!.args.join(", ")})`;
    equal(forward[i], VECTORS[i]!.bits, `${label} forward`);
    equal(backward[i], VECTORS[i]!.bits, `${label} backward`);
  }
  // A second complete pass must be bit-identical to the first.
  deepEqual(forward, backward);
});
