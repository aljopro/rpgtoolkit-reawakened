/**
 * Toolkit 2 bitmap font model (`docs/spec/formats/legacy/text-formats.md#font-toolkit-2-text`,
 * docs/spec/formats/legacy/text-formats.md#font-toolkit-2-text).
 *
 * A text file containing 256 8×8 monochrome glyphs directly indexed by character code 0..255.
 * There is no binary form.
 */

export const FONT_MAGIC = "RPGTLKIT FONT";
export const FONT_VERSION = 2;
export const FONT_SUBVERSION = 0;
export const FONT_SECTION = "docs/spec/formats/legacy/text-formats.md#font-toolkit-2-text";

export const FONT_GLYPH_COUNT = 256;
export const FONT_GLYPH_WIDTH = 8;
export const FONT_GLYPH_HEIGHT = 8;
export const FONT_TOTAL_VALUES = FONT_GLYPH_COUNT * FONT_GLYPH_HEIGHT; // 2048
export const FONT_TOTAL_LINES = 3 + FONT_TOTAL_VALUES; // 2051

export interface LegacyFont {
  readonly magic: string; // "RPGTLKIT FONT"
  readonly version: number; // 2
  readonly subversion: number; // 0
  /**
   * 2048 byte values: 256 glyphs × 8 rows per glyph, top row first.
   * Glyph `c`, row `r` (0..7) is at `c * 8 + r`.
   * Bit 7 is the leftmost pixel (1 = ink, 0 = transparent).
   */
  readonly values: Uint8Array;
}
