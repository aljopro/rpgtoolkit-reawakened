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
 * the keys `t` and `hex` where `t` is `"bytes"` is read back as bytes.
 */
export function decodeLog(value: PlainData): PortData {
  if (Array.isArray(value)) return value.map(decodeLog);
  if (typeof value === "object" && value !== null) {
    const record = value as { readonly [key: string]: PlainData };
    const keys = Object.keys(record);
    const tag = record["t"];
    const hex = record["hex"];
    if (keys.length === 2 && tag === BYTES_TAG && typeof hex === "string") {
      return hexToBytes(hex);
    }
    const out: { [key: string]: PortData } = {};
    for (const key of keys) {
      setProperty(out, key, decodeLog(record[key]!));
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

function hexToBytes(hex: string): Bytes {
  if (hex.length % 2 !== 0) {
    throw new TypeError("decodeLog: odd-length hex string");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = (hexDigit(hex.charCodeAt(i * 2)) << 4) | hexDigit(hex.charCodeAt(i * 2 + 1));
  }
  return bytes;
}

function hexDigit(code: number): number {
  if (code >= 0x30 && code <= 0x39) return code - 0x30;
  if (code >= 0x61 && code <= 0x66) return code - 0x57;
  throw new TypeError("decodeLog: invalid hex digit");
}
