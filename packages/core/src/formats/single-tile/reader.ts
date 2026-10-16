/**
 * Reading a single tile (`docs/spec/formats/tiles.md#single-tile-gph`, format-spec §3.2, §15.11).
 *
 * Pure (G2): parses text or bytes without I/O or timers. Returns a located
 * FormatError on failure (AD-18).
 */

import { err, ok, type Result } from "../result.ts";
import { decodeCp1252 } from "../binary/cp1252.ts";
import {
  SINGLE_TILE_MAGIC,
  SINGLE_TILE_MAJOR,
  SINGLE_TILE_MINOR,
  SINGLE_TILE_SECTION,
  type SingleTile,
} from "./model.ts";

export function readSingleTile(source: string | Uint8Array, path?: string): Result<SingleTile> {
  const text = typeof source === "string" ? source : decodeCp1252(source, 0, source.length);
  const rawLines = text.split(/\r\n|\r|\n/);

  // Find non-empty lines, keeping 1-based line numbers for located errors.
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
      section: SINGLE_TILE_SECTION,
      message: "empty single-tile file",
    });
  }

  const firstLine = lines[0]!.text;
  if (firstLine.toUpperCase() !== SINGLE_TILE_MAGIC) {
    // If it lacks RPGTLKIT TILE, check if it's a 16x16 Toolkit 1 file.
    if (rawLines.length >= 16 && rawLines.slice(0, 16).every((l) => l.replace(/\r|\n/g, "").length === 16)) {
      return err({
        ...(path === undefined ? {} : { path }),
        offset: 0,
        section: SINGLE_TILE_SECTION,
        message:
          "single tile version 1 (Toolkit 1.x) is out of scope for the first release (docs/spec/formats/legacy/text-formats.md#single-tile-version-1-toolkit-1)",
      });
    }
    return err({
      ...(path === undefined ? {} : { path }),
      offset: 0,
      section: SINGLE_TILE_SECTION,
      message: `not a single tile: header is "${firstLine}", expected "${SINGLE_TILE_MAGIC}"`,
    });
  }

  if (lines.length < 5) {
    return err({
      ...(path === undefined ? {} : { path }),
      offset: 0,
      section: SINGLE_TILE_SECTION,
      message: `truncated single tile header: expected at least 5 lines, found ${lines.length}`,
    });
  }

  const warnings: string[] = [];
  const major = parseInt(lines[1]!.text, 10);
  const minor = parseInt(lines[2]!.text, 10);
  if (major !== SINGLE_TILE_MAJOR || minor !== SINGLE_TILE_MINOR) {
    warnings.push(
      `single tile version ${lines[1]!.text}.${lines[2]!.text} is not ${SINGLE_TILE_MAJOR}.${SINGLE_TILE_MINOR}; ` +
        `read as the same layout (docs/spec/formats/tiles.md#single-tile-gph)`,
    );
  }

  const detail = parseInt(lines[3]!.text, 10);
  if (!Number.isInteger(detail) || detail < 1 || detail > 6) {
    return err({
      ...(path === undefined ? {} : { path }),
      offset: lines[3]!.lineNum,
      section: SINGLE_TILE_SECTION,
      message: `unsupported tile detail ${lines[3]!.text}: expected 1..6 (docs/spec/formats/tiles.md#single-tile-gph)`,
    });
  }

  const compression = parseInt(lines[4]!.text, 10);
  if (compression !== 0 && compression !== 1) {
    return err({
      ...(path === undefined ? {} : { path }),
      offset: lines[4]!.lineNum,
      section: SINGLE_TILE_SECTION,
      message: `unsupported compression ${lines[4]!.text}: expected 0 or 1 (docs/spec/formats/tiles.md#single-tile-gph)`,
    });
  }

  const is32 = detail === 1 || detail === 3 || detail === 5;
  const width = is32 ? 32 : 16;
  const height = is32 ? 32 : 16;
  const total = width * height;
  const pixels: number[] = [];

  let idx = 5;
  if (compression === 0) {
    // Uncompressed: one decimal value per pixel.
    if (lines.length - idx < total) {
      return err({
        ...(path === undefined ? {} : { path }),
        offset: lines[idx]?.lineNum ?? lines[lines.length - 1]!.lineNum,
        section: SINGLE_TILE_SECTION,
        message: `single tile declared ${total} uncompressed pixels but only ${lines.length - idx} lines remain`,
      });
    }
    for (let i = 0; i < total; i += 1) {
      const entry = lines[idx]!;
      idx += 1;
      const val = parseInt(entry.text, 10);
      if (Number.isNaN(val)) {
        return err({
          ...(path === undefined ? {} : { path }),
          offset: entry.lineNum,
          section: SINGLE_TILE_SECTION,
          message: `invalid pixel value "${entry.text}" at line ${entry.lineNum}`,
        });
      }
      pixels.push(val);
    }
  } else {
    // Compressed (RLE): repeated pairs of lines: count, value.
    while (pixels.length < total) {
      if (idx >= lines.length) {
        return err({
          ...(path === undefined ? {} : { path }),
          offset: lines[lines.length - 1]!.lineNum,
          section: SINGLE_TILE_SECTION,
          message: `compressed single tile stream ended early: produced ${pixels.length} of ${total} pixels`,
        });
      }
      const countEntry = lines[idx]!;
      idx += 1;
      const count = parseInt(countEntry.text, 10);
      if (Number.isNaN(count) || count < 1) {
        return err({
          ...(path === undefined ? {} : { path }),
          offset: countEntry.lineNum,
          section: SINGLE_TILE_SECTION,
          message: `invalid run length "${countEntry.text}" at line ${countEntry.lineNum}: must be integer >= 1`,
        });
      }

      if (idx >= lines.length) {
        return err({
          ...(path === undefined ? {} : { path }),
          offset: countEntry.lineNum,
          section: SINGLE_TILE_SECTION,
          message: `run-length count at line ${countEntry.lineNum} missing pair value`,
        });
      }
      const valEntry = lines[idx]!;
      idx += 1;
      const val = parseInt(valEntry.text, 10);
      if (Number.isNaN(val)) {
        return err({
          ...(path === undefined ? {} : { path }),
          offset: valEntry.lineNum,
          section: SINGLE_TILE_SECTION,
          message: `invalid run value "${valEntry.text}" at line ${valEntry.lineNum}`,
        });
      }

      if (pixels.length + count > total) {
        return err({
          ...(path === undefined ? {} : { path }),
          offset: countEntry.lineNum,
          section: SINGLE_TILE_SECTION,
          message: `run of ${count} pixels at line ${countEntry.lineNum} exceeds tile capacity (${pixels.length} + ${count} > ${total})`,
        });
      }

      for (let c = 0; c < count; c += 1) {
        pixels.push(val);
      }
    }
  }

  if (idx < lines.length) {
    warnings.push(`${lines.length - idx} trailing line(s) after single tile were ignored`);
  }

  return ok(
    {
      magic: SINGLE_TILE_MAGIC,
      major: Number.isNaN(major) ? SINGLE_TILE_MAJOR : major,
      minor: Number.isNaN(minor) ? SINGLE_TILE_MINOR : minor,
      detail,
      compression,
      width,
      height,
      pixels,
    },
    warnings,
  );
}
