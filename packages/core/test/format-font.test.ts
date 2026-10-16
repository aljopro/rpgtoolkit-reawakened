// Toolkit 2 bitmap font (.fnt) format of
// `docs/spec/formats/legacy/text-formats.md#font-toolkit-2-text` (format-spec §15.12):
// 2051 lines, 2048 values for 256 8x8 glyphs.

import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readLegacyFont,
  writeLegacyFont,
  glyphToRgba,
  FONT_MAGIC,
  FONT_SECTION,
  FONT_TOTAL_VALUES,
  type LegacyFont,
  type Result,
} from "../src/index.ts";

function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`expected ok, got: ${result.error.message}`);
  }
  return result.value;
}
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");


test("reads a valid 2051-line font file and round-trips exactly", () => {
  const values = new Uint8Array(FONT_TOTAL_VALUES);
  for (let i = 0; i < FONT_TOTAL_VALUES; i += 1) {
    values[i] = (i * 17) & 0xff;
  }
  const font: LegacyFont = {
    magic: FONT_MAGIC,
    version: 2,
    subversion: 0,
    values,
  };

  const text = writeLegacyFont(font);
  const lines = text.trimEnd().split(/\r\n|\r|\n/);
  equal(lines.length, 2051);

  const res = readLegacyFont(text);
  equal(res.ok, true);
  if (res.ok) {
    equal(res.value.magic, FONT_MAGIC);
    equal(res.value.version, 2);
    equal(res.value.subversion, 0);
    deepEqual(res.value.values, values);
  }
});
test("reads committed base.fnt version example and round-trips exactly", () => {
  const path = join(repoRoot, "docs", "spec", "examples", "versions", "font", "base.fnt");
  const text = readFileSync(path, "utf8");
  const res = readLegacyFont(text, path);
  equal(res.ok, true);
  if (res.ok) {
    equal(res.value.magic, FONT_MAGIC);
    equal(res.value.version, 2);
    equal(res.value.subversion, 0);
    equal(res.value.values.length, FONT_TOTAL_VALUES);

    const written = writeLegacyFont(res.value);
    equal(written, text);
  }
});

test("reads committed base.fnt as Uint8Array bytes and round-trips", () => {
  const path = join(repoRoot, "docs", "spec", "examples", "versions", "font", "base.fnt");
  const bytes = new Uint8Array(readFileSync(path));
  const res = readLegacyFont(bytes, path);
  equal(res.ok, true);
  if (res.ok) {
    equal(res.value.magic, FONT_MAGIC);
    equal(res.value.version, 2);
    equal(res.value.subversion, 0);
    equal(res.value.values.length, FONT_TOTAL_VALUES);
  }
});


test("renders glyphToRgba with correct bitplane ordering", () => {
  const values = new Uint8Array(FONT_TOTAL_VALUES);
  // Glyph 'A' (ASCII 65): set top row (row 0) to 0b10000001 (0x81): bits 7 and 0 set
  values[65 * 8] = 0x81;
  // Row 1 to 0b01000010 (0x42): bits 6 and 1 set
  values[65 * 8 + 1] = 0x42;

  const font: LegacyFont = {
    magic: FONT_MAGIC,
    version: 2,
    subversion: 0,
    values,
  };

  const rgba = glyphToRgba(font, 65, [255, 0, 0, 255], [0, 0, 0, 0]);
  equal(rgba.length, 8 * 8 * 4);

  // Row 0: pixel 0 (x=0, bit 7) is ink (red)
  deepEqual([rgba[0], rgba[1], rgba[2], rgba[3]], [255, 0, 0, 255]);
  // Row 0: pixel 1 (x=1, bit 6) is bg (transparent)
  deepEqual([rgba[4], rgba[5], rgba[6], rgba[7]], [0, 0, 0, 0]);
  // Row 0: pixel 7 (x=7, bit 0) is ink (red)
  const p7 = 7 * 4;
  deepEqual([rgba[p7], rgba[p7 + 1], rgba[p7 + 2], rgba[p7 + 3]], [255, 0, 0, 255]);

  // Row 1: pixel 0 (x=0) is bg
  const r1p0 = (8 + 0) * 4;
  deepEqual([rgba[r1p0], rgba[r1p0 + 1], rgba[r1p0 + 2], rgba[r1p0 + 3]], [0, 0, 0, 0]);
  // Row 1: pixel 1 (x=1, bit 6) is ink
  const r1p1 = (8 + 1) * 4;
  deepEqual([rgba[r1p1], rgba[r1p1 + 1], rgba[r1p1 + 2], rgba[r1p1 + 3]], [255, 0, 0, 255]);
});

test("refuses invalid magic or short line count", () => {
  const badMagic = "NOT A FONT\r\n2\r\n0\r\n";
  const resBad = readLegacyFont(badMagic);
  equal(resBad.ok, false);
  if (!resBad.ok) {
    equal(resBad.error.section, FONT_SECTION);
  }

  const short = "RPGTLKIT FONT\r\n2\r\n0\r\n 1 \r\n 2 \r\n";
  const resShort = readLegacyFont(short);
  equal(resShort.ok, false);
  if (!resShort.ok) {
    equal(resShort.error.section, FONT_SECTION);
  }
});

test("refuses out-of-range value or non-numeric line", () => {
  const lines = ["RPGTLKIT FONT", "2", "0"];
  for (let i = 0; i < 2047; i += 1) {
    lines.push("0");
  }
  lines.push("999"); // value > 255
  const res = readLegacyFont(lines.join("\r\n"));
  equal(res.ok, false);
  if (!res.ok) {
    equal(res.error.section, FONT_SECTION);
  }
});
