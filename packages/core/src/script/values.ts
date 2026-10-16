/**
 * Pure RPGCode value conversions, comparisons and truthiness
 * (docs/spec/engine/rpgcode-runtime.md#sem-3--comparison-and-conversion SEM-3, SEM-5; R-39, R2-Q12).
 *
 * This module is the single owner of the value layer: truthiness, comparison,
 * string/number conversion, the six-significant-digit number-to-string format
 * and array index keys. Entry 12's castLit/castNum/castInt builtins consume it.
 *
 * docs/spec/engine/rpgcode-runtime.md#sem-3--comparison-and-conversion
 * docs/spec/engine/rpgcode-runtime.md#sem-5--unset-variables-and-array-elements
 */

import type { Value } from "../ports/value.ts";

/**
 * ASCII-only case fold (LEX-10): `A`–`Z` to `a`–`z`, every other code point
 * unchanged.
 */
export function foldAscii(text: string): string {
  let out = "";
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    out += code >= 65 && code <= 90 ? String.fromCharCode(code + 32) : text[index]!;
  }
  return out;
}

/**
 * RPGCode truthiness (R-39, docs/spec/engine/rpgcode-runtime.md#sem-3--comparison-and-conversion SEM-3:14):
 * A string is true unless it folds to "off" (case-insensitive); "" is true.
 * A number is true when it is not zero. `null` counts as unset (0) -> false.
 */
export function truthy(v: Value): boolean {
  if (typeof v === "string") {
    return foldAscii(v) !== "off";
  }
  if (typeof v === "number") {
    return v !== 0;
  }
  return false;
}

/**
 * Number to string with six significant digits (docs/spec/engine/rpgcode-runtime.md#sem-3--comparison-and-conversion SEM-3:16-23).
 *
 * Uses exponent form when the decimal exponent X < -4 or X >= 6; otherwise
 * plain decimal form.
 */
export function numberToString(v: number): string {
  if (Object.is(v, -0) || v === 0) return "0";
  if (!Number.isFinite(v)) {
    if (Number.isNaN(v)) return "NaN";
    return v > 0 ? "Infinity" : "-Infinity";
  }
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  const expStr = abs.toExponential(5);
  const [mantissa, expPart] = expStr.split("e");
  if (mantissa === undefined || expPart === undefined) return "0";
  const X = Number(expPart);

  if (X < -4 || X >= 6) {
    const digits = mantissa.replace(".", "");
    const trimmed = digits.replace(/0+$/, "");
    let m = trimmed[0]!;
    if (trimmed.length > 1) {
      m += "." + trimmed.slice(1);
    }
    const expSign = X >= 0 ? "+" : "-";
    const absExp = Math.abs(X);
    const expDigits = absExp < 10 ? "0" + absExp : String(absExp);
    return `${sign}${m}e${expSign}${expDigits}`;
  }

  const digits = mantissa.replace(".", "");
  let result = "";
  if (X >= 0) {
    const intPart = digits.slice(0, X + 1);
    const fracPart = digits.slice(X + 1).replace(/0+$/, "");
    result = fracPart.length > 0 ? `${intPart}.${fracPart}` : intPart;
  } else {
    const leadingZeros = "0".repeat(-X - 1);
    const fracPart = (leadingZeros + digits).replace(/0+$/, "");
    result = `0.${fracPart}`;
  }
  return `${sign}${result}`;
}

/**
 * Longest-prefix string-to-number parse (docs/spec/engine/rpgcode-runtime.md#sem-3--comparison-and-conversion SEM-3:15).
 * Skips leading spaces and tabs; matches optional sign, digits, optional dot
 * with digits, and optional e/E with optional sign and digits.
 */
export function stringToNumber(text: string): number {
  let index = 0;
  const length = text.length;
  while (index < length && (text[index] === " " || text[index] === "\t")) {
    index++;
  }
  if (index >= length) return 0;

  const start = index;
  let cursor = index;
  if (text[cursor] === "+" || text[cursor] === "-") {
    cursor++;
  }

  let hasDigitsBeforeDot = false;
  while (cursor < length && text[cursor]! >= "0" && text[cursor]! <= "9") {
    hasDigitsBeforeDot = true;
    cursor++;
  }

  let hasDigitsAfterDot = false;
  if (cursor < length && text[cursor] === ".") {
    cursor++;
    while (cursor < length && text[cursor]! >= "0" && text[cursor]! <= "9") {
      hasDigitsAfterDot = true;
      cursor++;
    }
  }

  if (!hasDigitsBeforeDot && !hasDigitsAfterDot) {
    return 0;
  }

  let bestEnd = cursor;
  if (cursor < length && (text[cursor] === "e" || text[cursor] === "E")) {
    let expCursor = cursor + 1;
    if (expCursor < length && (text[expCursor] === "+" || text[expCursor] === "-")) {
      expCursor++;
    }
    let expDigits = 0;
    while (expCursor < length && text[expCursor]! >= "0" && text[expCursor]! <= "9") {
      expDigits++;
      expCursor++;
    }
    if (expDigits > 0) {
      bestEnd = expCursor;
    }
  }

  const slice = text.slice(start, bestEnd);
  const val = Number(slice);
  return Number.isFinite(val) ? val : 0;
}

/** Convert any Value to its string representation (SEM-3). */
export function toStringValue(v: Value): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return numberToString(v);
  return "";
}

/** Convert any Value to its numeric representation (SEM-3). */
export function toNumberValue(v: Value): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return stringToNumber(v);
  return 0;
}

/** 32-bit integer conversion (SEM-3:24-26 ToInt32). */
export function toInt32(v: Value): number {
  return toNumberValue(v) | 0;
}

/**
 * Array and map index key format (SEM-5:61-63):
 * A string key keeps its case verbatim; a number is formatted with six
 * significant digits.
 */
export function indexKey(v: Value): string {
  if (typeof v === "string") return v;
  return numberToString(toNumberValue(v));
}

/**
 * Equality comparison `==` (SEM-3:12).
 * Numeric when both sides are number-typed (including unset `null`), otherwise
 * exact byte-for-byte string comparison.
 */
export function compareEqual(left: Value, right: Value): number {
  const leftIsNum = typeof left === "number" || left === null;
  const rightIsNum = typeof right === "number" || right === null;
  if (leftIsNum && rightIsNum) {
    const l = left === null ? 0 : left;
    const r = right === null ? 0 : right;
    return l === r ? 1 : 0;
  }
  return toStringValue(left) === toStringValue(right) ? 1 : 0;
}

/**
 * Relational comparison `<`, `<=`, `>`, `>=` (SEM-3:13).
 * Always numeric using string-to-number conversion.
 */
export function compareRelational(
  op: "<" | "<=" | ">" | ">=",
  left: Value,
  right: Value,
): number {
  const l = toNumberValue(left);
  const r = toNumberValue(right);
  switch (op) {
    case "<":
      return l < r ? 1 : 0;
    case "<=":
      return l <= r ? 1 : 0;
    case ">":
      return l > r ? 1 : 0;
    case ">=":
      return l >= r ? 1 : 0;
  }
}
