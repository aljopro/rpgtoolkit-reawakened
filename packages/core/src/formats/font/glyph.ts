/**
 * Glyph bitmap extraction for Toolkit 2 bitmap fonts
 * (`docs/spec/formats/legacy/text-formats.md#font-toolkit-2-text`).
 *
 * Each glyph is an 8×8 cell. Eight rows per glyph, top row first, bit 7 is the
 * leftmost pixel. 1 is ink, 0 is transparent background.
 */

import { FONT_GLYPH_WIDTH, FONT_GLYPH_HEIGHT, type LegacyFont } from "./model.ts";

export type RgbaTuple = readonly [number, number, number, number];

const DEFAULT_INK: RgbaTuple = [255, 255, 255, 255];
const DEFAULT_BG: RgbaTuple = [0, 0, 0, 0];

/**
 * Render one 8×8 glyph from `font` to an 8×8 straight RGBA buffer (256 bytes).
 *
 * `glyphCode`: 0..255.
 * Row-major top-to-bottom: pixel (x, y) is at `(y * 8 + x) * 4`.
 */
export function glyphToRgba(
  font: LegacyFont,
  glyphCode: number,
  ink: RgbaTuple = DEFAULT_INK,
  bg: RgbaTuple = DEFAULT_BG,
): Uint8Array {
  const out = new Uint8Array(FONT_GLYPH_WIDTH * FONT_GLYPH_HEIGHT * 4);
  const code = glyphCode & 0xff;
  const base = code * FONT_GLYPH_HEIGHT;

  for (let y = 0; y < FONT_GLYPH_HEIGHT; y += 1) {
    const rowByte = font.values[base + y] ?? 0;
    for (let x = 0; x < FONT_GLYPH_WIDTH; x += 1) {
      // Bit 7 is leftmost (x = 0), bit 0 is rightmost (x = 7).
      const bit = (rowByte >> (7 - x)) & 1;
      const color = bit === 1 ? ink : bg;
      const at = (y * FONT_GLYPH_WIDTH + x) * 4;
      out[at] = color[0];
      out[at + 1] = color[1];
      out[at + 2] = color[2];
      out[at + 3] = color[3];
    }
  }

  return out;
}
