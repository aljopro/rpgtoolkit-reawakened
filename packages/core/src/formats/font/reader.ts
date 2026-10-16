/**
 * Reading a Toolkit 2 bitmap font (`docs/spec/formats/legacy/text-formats.md#font-toolkit-2-text`,
 * format-spec §15.12).
 *
 * Pure (G2): parses text without host I/O or timers. Returns a located
 * FormatError on failure (AD-18).
 */

import { err, ok, type Result } from "../result.ts";
import { decodeCp1252 } from "../binary/cp1252.ts";
import {
  FONT_MAGIC,
  FONT_VERSION,
  FONT_SUBVERSION,
  FONT_SECTION,
  FONT_TOTAL_VALUES,
  type LegacyFont,
} from "./model.ts";

export function readLegacyFont(source: string | Uint8Array, path?: string): Result<LegacyFont> {
  const text = typeof source === "string" ? source : decodeCp1252(source, 0, source.length);
  const rawLines = text.split(/\r\n|\r|\n/);

  const lines: { lineNum: number; text: string }[] = [];
  for (let i = 0; i < rawLines.length; i += 1) {
    const raw = rawLines[i] ?? "";
    const trimmed = raw.trim();
    if (trimmed.length > 0) {
      lines.push({ lineNum: i + 1, text: trimmed });
    }
  }

  if (lines.length === 0) {
    return err({
      ...(path === undefined ? {} : { path }),
      offset: 0,
      section: FONT_SECTION,
      message: "empty font file",
    });
  }

  const magic = lines[0]!.text;
  if (magic.toUpperCase() !== FONT_MAGIC) {
    return err({
      ...(path === undefined ? {} : { path }),
      offset: 0,
      section: FONT_SECTION,
      message: `not a Toolkit 2 font: header is "${magic}", expected "${FONT_MAGIC}"`,
    });
  }

  if (lines.length < 3) {
    return err({
      ...(path === undefined ? {} : { path }),
      offset: 0,
      section: FONT_SECTION,
      message: `truncated font header: expected at least 3 lines, found ${lines.length}`,
    });
  }

  const warnings: string[] = [];
  const version = parseInt(lines[1]!.text, 10);
  const subversion = parseInt(lines[2]!.text, 10);
  if (version !== FONT_VERSION || subversion !== FONT_SUBVERSION) {
    warnings.push(
      `font version ${lines[1]!.text}.${lines[2]!.text} is not ${FONT_VERSION}.${FONT_SUBVERSION}; ` +
        `read as the same layout (docs/spec/formats/legacy/text-formats.md#font-toolkit-2-text)`,
    );
  }

  const valueLines = lines.slice(3);
  if (valueLines.length < FONT_TOTAL_VALUES) {
    return err({
      ...(path === undefined ? {} : { path }),
      offset: valueLines.length > 0 ? valueLines[valueLines.length - 1]!.lineNum : lines[2]!.lineNum,
      section: FONT_SECTION,
      message: `font file declared 2048 values but only ${valueLines.length} values were found`,
    });
  }

  const values = new Uint8Array(FONT_TOTAL_VALUES);
  for (let i = 0; i < FONT_TOTAL_VALUES; i += 1) {
    const entry = valueLines[i]!;
    const val = parseInt(entry.text, 10);
    if (Number.isNaN(val) || val < 0 || val > 255) {
      return err({
        ...(path === undefined ? {} : { path }),
        offset: entry.lineNum,
        section: FONT_SECTION,
        message: `invalid font row value "${entry.text}" at line ${entry.lineNum}: must be integer 0..255`,
      });
    }
    values[i] = val;
  }

  if (valueLines.length > FONT_TOTAL_VALUES) {
    warnings.push(`${valueLines.length - FONT_TOTAL_VALUES} trailing line(s) after 2048 font values were ignored`);
  }

  return ok(
    {
      magic: FONT_MAGIC,
      version: Number.isNaN(version) ? FONT_VERSION : version,
      subversion: Number.isNaN(subversion) ? FONT_SUBVERSION : subversion,
      values,
    },
    warnings,
  );
}
