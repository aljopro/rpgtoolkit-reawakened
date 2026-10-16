/**
 * Serialising a Toolkit 2 bitmap font (`docs/spec/formats/legacy/text-formats.md#font-toolkit-2-text`,
 * docs/spec/formats/legacy/text-formats.md#font-toolkit-2-text).
 *
 * Emits exactly 2051 lines separated by CRLF.
 */

import { FONT_MAGIC, FONT_TOTAL_VALUES, type LegacyFont } from "./model.ts";

export function writeLegacyFont(font: LegacyFont): string {
  const lines: string[] = [font.magic || FONT_MAGIC, String(font.version), String(font.subversion)];

  for (let i = 0; i < FONT_TOTAL_VALUES; i += 1) {
    const val = font.values[i] ?? 0;
    lines.push(` ${val} `);
  }

  return lines.join("\r\n") + "\r\n";
}
