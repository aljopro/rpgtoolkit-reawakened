/**
 * Core-owned persistent RGBA surfaces (AD-27).
 *
 * Surface pixels live in save state as a small tagged snapshot rather than a
 * `Uint8Array`, so snapshots remain canonical JSON.  The decoded byte cache is
 * deliberately supplied by the caller and is never part of `GameState`.
 */

import type { DecodedTexture } from "../formats/image/model.ts";
import type { SurfacePixels } from "../ports/engine.ts";
import type { Rgb } from "../ports/draw.ts";
import type { SurfaceId } from "../ports/keys.ts";
import type { SurfacesSection, SurfaceState, RgbaSnapshot } from "../save/sections/surfaces.ts";

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** A decoded-pixel cache owned by a runner/core facade, never by save state. */
export type SurfacePixelCache = Map<string, Uint8Array>;

function key(id: SurfaceId, rev: number): string {
  return `${id}:${rev}`;
}

function idOf(value: number): SurfaceId {
  return value as SurfaceId;
}

function validDimension(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function byteCount(width: number, height: number): number {
  return width * height * 4;
}

/** Encode bytes without relying on host `btoa`/`Buffer` APIs (G2). */
export function encodeSurfaceBytes(bytes: Uint8Array): string {
  let output = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const hasB = i + 1 < bytes.length;
    const hasC = i + 2 < bytes.length;
    const b = hasB ? bytes[i + 1]! : 0;
    const c = hasC ? bytes[i + 2]! : 0;
    output += BASE64[a >> 2];
    output += BASE64[((a & 3) << 4) | (b >> 4)];
    output += hasB ? BASE64[((b & 15) << 2) | (c >> 6)] : "=";
    output += hasC ? BASE64[c & 63] : "=";
  }
  return output;
}

/** Decode a canonical base64 surface payload, rejecting malformed input. */
export function decodeSurfaceBytes(value: string): Uint8Array {
  if (value.length % 4 !== 0) throw new TypeError("invalid surface base64 length");
  let padding = 0;
  if (value.endsWith("=")) padding += 1;
  if (value.endsWith("==")) padding += 1;
  const output = new Uint8Array((value.length / 4) * 3 - padding);
  let at = 0;
  for (let i = 0; i < value.length; i += 4) {
    const a = value[i]!;
    const b = value[i + 1]!;
    const c = value[i + 2]!;
    const d = value[i + 3]!;
    const ai = BASE64.indexOf(a);
    const bi = BASE64.indexOf(b);
    const ci = c === "=" ? 0 : BASE64.indexOf(c);
    const di = d === "=" ? 0 : BASE64.indexOf(d);
    if (ai < 0 || bi < 0 || ci < 0 || di < 0 || (c === "=" && d !== "=") || (i + 4 < value.length && (c === "=" || d === "="))) {
      throw new TypeError("invalid surface base64 payload");
    }
    const first = (ai << 2) | (bi >> 4);
    if (at < output.length) output[at++] = first;
    if (c !== "=") {
      const second = ((bi & 15) << 4) | (ci >> 2);
      if (at < output.length) output[at++] = second;
    }
    if (d !== "=") {
      const third = ((ci & 3) << 6) | di;
      if (at < output.length) output[at++] = third;
    }
  }
  return output;
}

function snapshot(width: number, height: number, rgba: Uint8Array): RgbaSnapshot {
  return { t: "rgba", w: width, h: height, b64: encodeSurfaceBytes(rgba) };
}

function decode(entry: SurfaceState, cache?: SurfacePixelCache): Uint8Array {
  const cacheKey = key(entry.id, entry.rev);
  const cached = cache?.get(cacheKey);
  if (cached !== undefined) return cached;
  const rgba = decodeSurfaceBytes(entry.bitmap.b64);
  if (rgba.length !== byteCount(entry.bitmap.w, entry.bitmap.h)) throw new TypeError("surface pixel length does not match dimensions");
  cache?.set(cacheKey, rgba);
  return rgba;
}

function entry(state: SurfacesSection, id: SurfaceId): SurfaceState | null {
  return state.entries[String(id)] ?? null;
}

function checkedRgba(width: number, height: number, rgba: Uint8Array): void {
  if (!validDimension(width) || !validDimension(height)) throw new RangeError("surface dimensions must be non-negative integers");
  if (rgba.length !== byteCount(width, height)) throw new RangeError("surface pixel length does not match dimensions");
}

/** Create an empty surfaces section; `width`/`height` install composed frame 0. */
export function createSurfacesSection(width?: number, height?: number): SurfacesSection {
  const state: SurfacesSection = { nextId: 1, entries: {}, slots: {}, colours: {} };
  if (width !== undefined || height !== undefined) {
    if (width === undefined || height === undefined) throw new RangeError("surface frame dimensions must be supplied together");
    checkedRgba(width, height, new Uint8Array(byteCount(width, height)));
    state.entries["0"] = { id: 0 as SurfaceId, rev: 0, bitmap: snapshot(width, height, new Uint8Array(byteCount(width, height))) };
  }
  return state;
}

/** Allocate a monotonically increasing surface id. Ids are never reused. */
export function createSurface(state: SurfacesSection, width: number, height: number, rgba?: Uint8Array): SurfaceId {
  const pixels = rgba === undefined ? new Uint8Array(byteCount(width, height)) : new Uint8Array(rgba);
  checkedRgba(width, height, pixels);
  const id = idOf(state.nextId);
  state.nextId += 1;
  state.entries[String(id)] = { id, rev: 0, bitmap: snapshot(width, height, pixels) };
  return id;
}

/** Replace a surface's pixels and increment its revision exactly once. */
export function replaceSurface(state: SurfacesSection, id: SurfaceId, width: number, height: number, rgba: Uint8Array): number | null {
  const current = entry(state, id);
  if (current === null) return null;
  const pixels = new Uint8Array(rgba);
  checkedRgba(width, height, pixels);
  for (const colour of Object.keys(state.colours)) {
    if (state.colours[colour] === id) delete state.colours[colour];
  }
  current.rev += 1;
  current.bitmap = snapshot(width, height, pixels);
  return current.rev;
}

/** Delete a surface. The allocation counter remains untouched. Surface 0 is permanent. */
export function killSurface(state: SurfacesSection, id: SurfaceId): boolean {
  if (id === (0 as SurfaceId) || !Object.hasOwn(state.entries, String(id))) return false;
  delete state.entries[String(id)];
  for (const slot of Object.keys(state.slots)) if (state.slots[slot] === id) delete state.slots[slot];
  for (const colour of Object.keys(state.colours)) if (state.colours[colour] === id) delete state.colours[colour];
  return true;
}

/** Read pixels only when the caller's revision is current; always return an owned copy. */
export function readSurfacePixels(state: SurfacesSection, id: SurfaceId, rev: number, cache?: SurfacePixelCache): SurfacePixels | null {
  const current = entry(state, id);
  if (current === null || current.rev !== rev) return null;
  const rgba = decode(current, cache);
  return { w: current.bitmap.w, h: current.bitmap.h, rgba: new Uint8Array(rgba) };
}

export function surfaceTextures(state: SurfacesSection, cache: SurfacePixelCache = new Map()): ReadonlyMap<SurfaceId, DecodedTexture> {
  const textures = new Map<SurfaceId, DecodedTexture>();
  for (const raw of Object.keys(state.entries)) {
    const current = state.entries[raw]!;
    textures.set(current.id, { w: current.bitmap.w, h: current.bitmap.h, rgba: decode(current, cache) });
  }
  return textures;
}

/** Return a stable 1×1 opaque colour surface, reusing one id for each RGB triple. */
export function colourSurface(state: SurfacesSection, rgb: Rgb): SurfaceId {
  const r = Math.max(0, Math.min(255, Math.trunc(rgb.r)));
  const g = Math.max(0, Math.min(255, Math.trunc(rgb.g)));
  const b = Math.max(0, Math.min(255, Math.trunc(rgb.b)));
  const colour = `${r},${g},${b}`;
  const existing = state.colours[colour];
  if (existing !== undefined && entry(state, existing) !== null) return existing;
  const id = createSurface(state, 1, 1, new Uint8Array([r, g, b, 255]));
  state.colours[colour] = id;
  return id;
}

function copyRegion(state: SurfacesSection, source: SurfaceId, rect: { x: number; y: number; w: number; h: number }, cache?: SurfacePixelCache): { w: number; h: number; rgba: Uint8Array } | null {
  const sourceEntry = entry(state, source);
  if (sourceEntry === null || !validDimension(rect.w) || !validDimension(rect.h) || !Number.isInteger(rect.x) || !Number.isInteger(rect.y)) return null;
  if (rect.x < 0 || rect.y < 0 || rect.x + rect.w > sourceEntry.bitmap.w || rect.y + rect.h > sourceEntry.bitmap.h) return null;
  const input = decode(sourceEntry, cache);
  const output = new Uint8Array(byteCount(rect.w, rect.h));
  for (let y = 0; y < rect.h; y += 1) {
    const from = ((rect.y + y) * sourceEntry.bitmap.w + rect.x) * 4;
    output.set(input.subarray(from, from + rect.w * 4), y * rect.w * 4);
  }
  return { w: rect.w, h: rect.h, rgba: output };
}

/** Save a region of a surface into a numbered slot, preserving the slot id. */
export function saveScreen(state: SurfacesSection, slot: number, source: SurfaceId = 0 as SurfaceId, rect?: { x: number; y: number; w: number; h: number }, cache?: SurfacePixelCache): SurfaceId | null {
  const sourceEntry = entry(state, source);
  if (sourceEntry === null || !Number.isInteger(slot) || slot < 0) return null;
  const region = copyRegion(state, source, rect ?? { x: 0, y: 0, w: sourceEntry.bitmap.w, h: sourceEntry.bitmap.h }, cache);
  if (region === null) return null;
  const slotKey = String(slot);
  const prior = state.slots[slotKey];
  if (prior !== undefined && entry(state, prior) !== null) {
    replaceSurface(state, prior, region.w, region.h, region.rgba);
    return prior;
  }
  const id = createSurface(state, region.w, region.h, region.rgba);
  state.slots[slotKey] = id;
  return id;
}

/** Read a pixel's RGB colour, or `null` outside its bounds (E-56). */
export function getPixel(state: SurfacesSection, id: SurfaceId, x: number, y: number, cache?: SurfacePixelCache): Rgb | null {
  const current = entry(state, id);
  if (current === null || !Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= current.bitmap.w || y >= current.bitmap.h) return null;
  const rgba = decode(current, cache);
  const at = (y * current.bitmap.w + x) * 4;
  return { r: rgba[at]!, g: rgba[at + 1]!, b: rgba[at + 2]! };
}

/** The snapshot shape used by save files, exposed for format and test callers. */
export type { RgbaSnapshot, SurfaceState };

/** Capture a whole surface or region into a newly allocated persistent surface. */
export function captureScreen(state: SurfacesSection, source: SurfaceId = 0 as SurfaceId, rect?: { x: number; y: number; w: number; h: number }, cache?: SurfacePixelCache): SurfaceId | null {
  const sourceEntry = entry(state, source);
  if (sourceEntry === null) return null;
  const region = copyRegion(state, source, rect ?? { x: 0, y: 0, w: sourceEntry.bitmap.w, h: sourceEntry.bitmap.h }, cache);
  if (region === null) return null;
  return createSurface(state, region.w, region.h, region.rgba);
}

/** `canvasGetScreen` copies the composed screen into an existing canvas (E-56). */
export function canvasGetScreen(state: SurfacesSection, destination: SurfaceId, source: SurfaceId = 0 as SurfaceId, cache?: SurfacePixelCache): number | null {
  const sourceEntry = entry(state, source);
  if (sourceEntry === null) return null;
  const region = copyRegion(state, source, { x: 0, y: 0, w: sourceEntry.bitmap.w, h: sourceEntry.bitmap.h }, cache);
  if (region === null) return null;
  return replaceSurface(state, destination, region.w, region.h, region.rgba);
}

/** Restore one numbered saved-screen slot into an existing destination surface. */
export function restoreScreen(state: SurfacesSection, slot: number, destination: SurfaceId = 0 as SurfaceId, cache?: SurfacePixelCache): number | null {
  if (!Number.isInteger(slot) || slot < 0) return null;
  const source = state.slots[String(slot)];
  if (source === undefined) return null;
  const region = copyRegion(state, source, { x: 0, y: 0, w: entry(state, source)?.bitmap.w ?? 0, h: entry(state, source)?.bitmap.h ?? 0 }, cache);
  if (region === null) return null;
  return replaceSurface(state, destination, region.w, region.h, region.rgba);
}
