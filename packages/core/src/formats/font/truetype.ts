/**
 * Bounded TrueType font reader and vetted opentype.js wrapper (AD-15, ADR 0003).
 *
 * Implements a strict input gate requiring sfnt TrueType glyf tables and
 * deterministically rejecting CFF/CFF2, WOFF, variable fonts and truncated
 * or malformed buffers before library invocation.
 */

import opentype, { type Font as OpentypeFont } from "opentype.js";
import { err, ok, type Result } from "../result.ts";

const TRUETYPE_SECTION = "docs/spec/engine/display-input-audio.md#reawakened-fontref-and-metrics";

function fail(offset: number, message: string, path?: string): Result<never> {
  return err({ ...(path === undefined ? {} : { path }), offset, section: TRUETYPE_SECTION, message });
}

export interface TrueTypeOutlineCommand {
  readonly type: "M" | "L" | "C" | "Q" | "Z";
  readonly x?: number;
  readonly y?: number;
  readonly x1?: number;
  readonly y1?: number;
  readonly x2?: number;
  readonly y2?: number;
}

export interface TrueTypeGlyph {
  readonly id: number;
  readonly name?: string | undefined;
  readonly advance: number;
}

export interface TrueTypeMetrics {
  readonly ascent: number;
  readonly descent: number;
  readonly lineGap: number;
  readonly lineHeight: number;
  readonly unitsPerEm: number;
}

export interface TrueTypeFont {
  readonly kind: "truetype";
  readonly family: string;
  readonly subfamily: string;
  readonly unitsPerEm: number;
  readonly ascent: number;
  readonly descent: number;
  readonly lineGap: number;
  charToGlyph(char: string): TrueTypeGlyph;
  glyphById(id: number): TrueTypeGlyph;
  getKerning(left: TrueTypeGlyph | number, right: TrueTypeGlyph | number): number;
  getCommands(glyph: TrueTypeGlyph | number, size: number, x?: number, y?: number): readonly TrueTypeOutlineCommand[];
}

/**
 * Gate input buffer to verify it contains valid sfnt TrueType glyf tables.
 * Deterministically rejects unsupported signatures, CFF, variable fonts, and malformed tables.
 */
export function gateTrueType(bytes: Uint8Array, path?: string): Result<ArrayBuffer> {
  if (bytes.byteLength < 12) {
    return fail(0, "Truncated font data: header must be at least 12 bytes", path);
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const sfntVersion = view.getUint32(0);
  // TrueType sfnt version is 0x00010000 or 'true' (0x74727565)
  if (sfntVersion !== 0x00010000 && sfntVersion !== 0x74727565) {
    return fail(0, "Unsupported OpenType signature: only TrueType sfnt format is accepted", path);
  }

  const numTables = view.getUint16(4);
  if (12 + numTables * 16 > bytes.byteLength) {
    return fail(4, "Truncated sfnt directory: table count exceeds font byte length", path);
  }

  const tags = new Set<string>();
  for (let i = 0; i < numTables; i += 1) {
    const tableOffset = 12 + i * 16;
    const tag = String.fromCharCode(
      bytes[tableOffset]!,
      bytes[tableOffset + 1]!,
      bytes[tableOffset + 2]!,
      bytes[tableOffset + 3]!,
    );
    const offset = view.getUint32(tableOffset + 8);
    const length = view.getUint32(tableOffset + 12);
    if (offset + length > bytes.byteLength) {
      return fail(tableOffset + 8, `Table '${tag}' offset (${offset}) and length (${length}) exceed font bounds (${bytes.byteLength})`, path);
    }
    tags.add(tag);
  }

  // Reject CFF/CFF2 outlines
  if (tags.has("CFF ") || tags.has("CFF2")) {
    return fail(0, "CFF outlines are unsupported; only TrueType glyf outlines are permitted", path);
  }

  // Reject variable fonts
  if (tags.has("fvar") || tags.has("gvar")) {
    return fail(0, "Variable OpenType fonts are unsupported", path);
  }

  // Require TrueType glyf tables
  const required = ["glyf", "loca", "head", "hhea", "maxp", "cmap", "hmtx"];
  for (const req of required) {
    if (!tags.has(req)) {
      return fail(0, `Missing required TrueType table '${req}'`, path);
    }
  }

  const copy = new Uint8Array(bytes).slice().buffer as ArrayBuffer;
  return ok(copy);
}

/**
 * Return deterministic TrueType metrics per AD-15.
 *
 * TrueType metrics scale by `size / unitsPerEm`, use `hhea` ascent/descent/line gap only,
 * round each non-negative component with `floor(x + 0.5)`, and set `lineHeight` to the sum.
 */
export function trueTypeFontMetrics(font: TrueTypeFont, size: number): TrueTypeMetrics {
  const roundedSize = Math.max(1, Math.floor(size + 0.5));
  const ascentPx = Math.floor(font.ascent * roundedSize / font.unitsPerEm + 0.5);
  const descentPx = Math.floor(-font.descent * roundedSize / font.unitsPerEm + 0.5);
  const lineGapPx = Math.floor(font.lineGap * roundedSize / font.unitsPerEm + 0.5);
  const lineHeight = Math.max(1, ascentPx + descentPx + lineGapPx);
  return {
    ascent: ascentPx,
    descent: descentPx,
    lineGap: lineGapPx,
    lineHeight,
    unitsPerEm: font.unitsPerEm,
  };
}

/**
 * Parse and wrap a TrueType font buffer behind the bounded wrapper seam.
 */
export function readTrueTypeFont(bytes: Uint8Array, path?: string): Result<TrueTypeFont> {
  const gateRes = gateTrueType(bytes, path);
  if (!gateRes.ok) {
    return err(gateRes.error);
  }

  let font: OpentypeFont;
  try {
    font = opentype.parse(gateRes.value);
  } catch (error) {
    return fail(0, error instanceof Error ? error.message : "Failed to parse TrueType font data", path);
  }

  const family = font.names.windows?.fontFamily?.en
    ?? font.names.macintosh?.fontFamily?.en
    ?? "";
  const subfamily = font.names.windows?.fontSubfamily?.en
    ?? font.names.macintosh?.fontSubfamily?.en
    ?? "";

  const wrappedFont: TrueTypeFont = {
    kind: "truetype",
    family,
    subfamily,
    unitsPerEm: font.unitsPerEm,
    ascent: font.tables.hhea.ascender,
    descent: font.tables.hhea.descender,
    lineGap: font.tables.hhea.lineGap,
    charToGlyph(char: string): TrueTypeGlyph {
      const g = font.charToGlyph(char);
      return { id: g.index, name: g.name, advance: g.advanceWidth };
    },
    glyphById(id: number): TrueTypeGlyph {
      const g = font.glyphs.get(id);
      return { id: g.index, name: g.name, advance: g.advanceWidth };
    },
    getKerning(left: TrueTypeGlyph | number, right: TrueTypeGlyph | number): number {
      const leftId = typeof left === "number" ? left : left.id;
      const rightId = typeof right === "number" ? right : right.id;
      return font.getKerningValue(leftId, rightId);
    },
    getCommands(glyph: TrueTypeGlyph | number, size: number, x = 0, y = 0): readonly TrueTypeOutlineCommand[] {
      const g = typeof glyph === "number" ? font.glyphs.get(glyph) : font.glyphs.get(glyph.id);
      const pathObj = g.getPath(x, y, size);
      return pathObj.commands;
    },
  };

  return ok(wrappedFont);
}
