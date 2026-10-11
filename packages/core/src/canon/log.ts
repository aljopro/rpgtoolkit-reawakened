/**
 * The self-contained log codec (AD-5, AD-14).
 *
 * A recorded run is HAR-like: the concatenation of every `StepReport.consumed`
 * list, stamped with the integer `step` that consumed it. `canon` rejects raw
 * `Bytes`, so `encodeLog` replaces each `Bytes` leaf with `{ t: 'bytes', hex }`
 * (lowercase hex) and `decodeLog` reverses it. A log therefore survives
 * `canon` and `JSON.parse` and replays with no other input:
 *
 * ```ts
 * decodeLog(JSON.parse(canon(encodeLog(log)))) // deep-equals log
 * ```
 *
 * Plain records shaped as `{ t: 'bytes', hex: string }` with no other keys
 * are rejected by `encodeLog` with `TypeError` because they collide with the
 * encoded bytes tag and cannot round-trip.
 */

import type { Bytes, PortData } from "../ports/bytes.ts";
import type { PlainData } from "../ports/plain-data.ts";

const BYTES_TAG = "bytes";

function setProperty<T>(target: { [key: string]: T }, key: string, value: T): void {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

/** Replace every `Bytes` leaf with `{ t: 'bytes', hex }`, yielding plain data. */
export function encodeLog(value: PortData): PlainData {
  if (value instanceof Uint8Array) {
    return { t: BYTES_TAG, hex: bytesToHex(value) };
  }
  if (Array.isArray(value)) {
    const items: PlainData[] = [];
    for (const item of value) items.push(encodeLog(item));
    return items;
  }
  if (typeof value === "object" && value !== null) {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== null && prototype !== Object.prototype) {
      throw new TypeError("encodeLog: only plain objects are port data");
    }
    const record = value as { readonly [key: string]: PortData };
    const keys = Object.keys(record);
    const tag = record["t"];
    const hex = record["hex"];
    if (keys.length === 2 && tag === BYTES_TAG && typeof hex === "string") {
      throw new TypeError(
        "encodeLog: plain records shaped as { t: 'bytes', hex: string } collide with the bytes tag",
      );
    }
    const out: { [key: string]: PlainData } = {};
    for (const key of keys) {
      setProperty(out, key, encodeLog(record[key]!));
    }
    return out;
  }
  return value as PlainData;
}

/**
 * Restore the `Bytes` leaves written by `encodeLog`. An object with exactly
 * the keys `t` and `hex` where `t` is `"bytes"` is read back as bytes. A
 * malformed payload throws a `TypeError` that names the dotted path of the
 * offending value (`decodeLog: at event.bytes: invalid hex digit`); a failure
 * at the value's own root keeps the plain message (`decodeLog: invalid hex
 * digit`).
 */
export function decodeLog(value: PlainData): PortData {
  return decodeAt(value, "");
}

function decodeAt(value: PlainData, path: string): PortData {
  if (Array.isArray(value)) {
    const items: PortData[] = [];
    items.length = value.length;
    for (let i = 0; i < value.length; i++) {
      if (i in value) items[i] = decodeAt(value[i]!, path + "[" + i + "]");
    }
    return items;
  }
  if (typeof value === "object" && value !== null) {
    const record = value as { readonly [key: string]: PlainData };
    const keys = Object.keys(record);
    const tag = record["t"];
    const hex = record["hex"];
    if (keys.length === 2 && tag === BYTES_TAG && typeof hex === "string") {
      return hexToBytes(hex, path);
    }
    const out: { [key: string]: PortData } = {};
    for (const key of keys) {
      const childPath = path === "" ? key : path + "." + key;
      setProperty(out, key, decodeAt(record[key]!, childPath));
    }
    return out;
  }
  return value;
}

function bytesToHex(bytes: Bytes): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i]!.toString(16).padStart(2, "0");
  }
  return out;
}

function hexToBytes(hex: string, path: string): Bytes {
  if (hex.length % 2 !== 0) {
    throw new TypeError(
      path === ""
        ? "decodeLog: odd-length hex string"
        : "decodeLog: at " + path + ": odd-length hex string",
    );
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] =
      (hexDigit(hex.charCodeAt(i * 2), path) << 4) | hexDigit(hex.charCodeAt(i * 2 + 1), path);
  }
  return bytes;
}

function hexDigit(code: number, path: string): number {
  if (code >= 0x30 && code <= 0x39) return code - 0x30;
  if (code >= 0x61 && code <= 0x66) return code - 0x57;
  throw new TypeError(
    path === ""
      ? "decodeLog: invalid hex digit"
      : "decodeLog: at " + path + ": invalid hex digit",
  );
}
