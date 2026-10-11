/**
 * RFC 8785 (JCS) canonical JSON and the core's two hashes (AD-11).
 *
 * `canon` serialises plain data with no whitespace: keys sorted by UTF-16 code
 * unit, numbers per ECMAScript `Number::toString` with `-0` normalised to
 * `"0"`, minimal string escaping. It rejects anything outside `PlainData`
 * (G1, AD-7) with `TypeError`. `hashState` and `hashDrawList` are FNV-1a
 * 64-bit over the canonical form's UTF-8 bytes, so equal data hashes equal and
 * a differing surface `rev` hashes differently.
 */

import type { DrawList } from "../ports/draw.ts";
import type { PlainData } from "../ports/plain-data.ts";
import { fnv1a64 } from "./fnv1a.ts";

/** The canonical form of `value` (RFC 8785). */
export function canon(value: PlainData): string {
  return serialize(value, new Set<object>());
}

/** FNV-1a 64-bit of a state's canonical form (AD-11). */
export function hashState(state: PlainData): string {
  return fnv1a64(canon(state));
}

/**
 * FNV-1a 64-bit of a draw list's canonical form (AD-11). Covers the commands
 * and the surface `rev` numbers they reference, never pixel bytes.
 */
export function hashDrawList(drawList: DrawList): string {
  return fnv1a64(canon(drawList));
}

function serialize(value: unknown, seen: Set<object>): string {
  switch (typeof value) {
    case "object":
      if (value === null) return "null";
      if (Array.isArray(value)) return serializeArray(value, seen);
      return serializeObject(value, seen);
    case "boolean":
      return value ? "true" : "false";
    case "number":
      return serializeNumber(value);
    case "string":
      return serializeString(value);
    default:
      throw new TypeError(`canon: ${typeof value} is not plain data`);
  }
}

function serializeNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new TypeError("canon: NaN and Infinity are not plain data");
  }
  // Number::toString(-0) is "0" (ES spec; RFC 8785 3.2.2.3), so -0 needs no
  // special case; the tests pin it.
  return JSON.stringify(value);
}

function serializeString(value: string): string {
  let out = '"';
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code === 0x22) {
      out += '\\"';
    } else if (code === 0x5c) {
      out += "\\\\";
    } else if (code === 0x08) {
      out += "\\b";
    } else if (code === 0x09) {
      out += "\\t";
    } else if (code === 0x0a) {
      out += "\\n";
    } else if (code === 0x0c) {
      out += "\\f";
    } else if (code === 0x0d) {
      out += "\\r";
    } else if (code < 0x20) {
      out += "\\u" + code.toString(16).padStart(4, "0");
    } else if (code >= 0xd800 && code <= 0xdbff) {
      const low = value.charCodeAt(i + 1);
      if (!(low >= 0xdc00 && low <= 0xdfff)) {
        throw new TypeError("canon: unpaired surrogate in a string");
      }
      out += value.charAt(i) + value.charAt(i + 1);
      i++;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new TypeError("canon: unpaired surrogate in a string");
    } else {
      out += value.charAt(i);
    }
  }
  return out + '"';
}

function serializeArray(items: readonly unknown[], seen: Set<object>): string {
  const prototype = Object.getPrototypeOf(items);
  if (prototype !== Array.prototype) {
    throw new TypeError("canon: only plain arrays are plain data");
  }
  if (seen.has(items)) {
    throw new TypeError("canon: circular reference");
  }
  // A dense array has exactly one own key per index; a hole or an extra
  // property makes the counts differ.
  if (Object.keys(items).length !== items.length) {
    throw new TypeError("canon: sparse arrays and array properties are not plain data");
  }
  seen.add(items);
  let out = "[";
  for (let i = 0; i < items.length; i++) {
    if (i > 0) out += ",";
    out += serialize(items[i], seen);
  }
  seen.delete(items);
  return out + "]";
}

function serializeObject(record: object, seen: Set<object>): string {
  const prototype = Object.getPrototypeOf(record);
  if (prototype !== null && prototype !== Object.prototype) {
    throw new TypeError("canon: only plain objects are plain data");
  }
  if (seen.has(record)) {
    throw new TypeError("canon: circular reference");
  }
  seen.add(record);
  // Keys sort by UTF-16 code unit, independent of locale (RFC 8785 §3.2.3).
  const keys = Object.keys(record).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  let out = "{";
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]!;
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (descriptor === undefined) {
      throw new TypeError("canon: missing property descriptor");
    }
    if (descriptor.get !== undefined || descriptor.set !== undefined) {
      throw new TypeError("canon: accessor properties are not plain data");
    }
    if (i > 0) out += ",";
    out += serializeString(key) + ":" + serialize(descriptor.value, seen);
  }
  seen.delete(record);
  return out + "}";
}
