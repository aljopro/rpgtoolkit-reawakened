/**
 * The per-file digests `dump --json` carries (epic 2 Done-when 1).
 *
 * A digest is the FNV-1a 64-bit hash `core` already exports (AD-11) over one of
 * two canonical inputs, so parser or decoder drift changes it:
 *
 *  * a **parsed model** is digested as `canon(model)`, the RFC 8785 canonical
 *    JSON of the model (AD-11). Canonical JSON sorts object keys, so the hash
 *    never depends on property insertion order or on map iteration order (G3).
 *  * an **image** is digested over the decoded RGBA bytes themselves, so a
 *    change in one pixel is caught.
 *
 * `canon` accepts only `PlainData` (G1 rule 2), and a parsed model holds
 * `Uint8Array` residue and tile pixels. `toPlainData` folds those to a
 * lowercase-hex string — deterministic, order independent, and far smaller than
 * a number array — and drops `undefined` keys, which `canon` rejects.
 */

import { canon, fnv1a64, type PlainData } from "@rpgtoolkit/core";

/** Plain data never survives a `undefined` value, so `canon` would reject a model that has one. */
function isPlainPrimitive(value: unknown): value is null | boolean | number | string {
  return (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  );
}

/** The lowercase-hex form of a byte span. */
function toHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    out += (bytes[i] as number).toString(16).padStart(2, "0");
  }
  return out;
}

/**
 * Convert a parsed model to `PlainData` for `canon`.
 *
 * `Uint8Array` becomes a hex string; an array maps element-wise (`undefined`
 * becomes `null`, so indices stay stable); an object keeps every own key whose
 * value is not `undefined`; anything else is a primitive. A value outside this
 * family is a `TypeError`, which is the same contract `canon` itself has.
 */
export function toPlainData(value: unknown): PlainData {
  if (value instanceof Uint8Array) {
    return toHex(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => toPlainData(item));
  }
  if (typeof value === "object" && value !== null) {
    const out: { [key: string]: PlainData } = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) {
        out[key] = toPlainData(item);
      }
    }
    return out;
  }
  if (value === undefined) {
    return null;
  }
  if (isPlainPrimitive(value)) {
    return value;
  }
  throw new TypeError(`digest: ${typeof value} is not a parsed-model value`);
}

/** The FNV-1a 64-bit digest of a parsed model's canonical form. */
export function digestModel(model: unknown): string {
  return fnv1a64(canon(toPlainData(model)));
}

/** The FNV-1a 64-bit digest of decoded RGBA bytes. */
export function digestRgba(rgba: Uint8Array): string {
  return fnv1a64(rgba);
}
