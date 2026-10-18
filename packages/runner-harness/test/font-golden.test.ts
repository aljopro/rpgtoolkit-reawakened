import { deepEqual, equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { glyphToRgba, readLegacyFont } from "@tk-reawakened/core";
import { comparePngPixels, encodeRgbaPng } from "../src/png.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");
const PANGRAM = "The quick brown fox jumps over the lazy dog! 0123456789";

function authoredPangramPng(): Uint8Array {
  const width = PANGRAM.length * 9;
  const rgba = new Uint8Array(width * 8 * 4);
  const fontResult = readLegacyFont(readFileSync(join(repoRoot, "media", "fonts", "tkr-8x8.fnt")));
  if (!fontResult.ok) throw new Error(fontResult.error.message);
  for (let index = 0; index < PANGRAM.length; index += 1) {
    const glyph = glyphToRgba(fontResult.value, PANGRAM.charCodeAt(index), [255, 255, 255, 255], [0, 0, 0, 0]);
    const x0 = index * 9;
    for (let y = 0; y < 8; y += 1) {
      rgba.set(glyph.subarray(y * 32, y * 32 + 32), (y * width + x0) * 4);
    }
  }
  return encodeRgbaPng({ w: width, h: 8, rgba });
}

test("authored font pangram golden is stable through the reader and PNG path", () => {
  const actual = authoredPangramPng();
  const expected = readFileSync(join(repoRoot, "golden", "regression", "tkr-font-pangram.png"));
  const comparison = comparePngPixels(actual, new Uint8Array(expected));
  equal(comparison.error, null);
  equal(comparison.equal, true, comparison.firstDifference ? JSON.stringify(comparison.firstDifference) : "");
  deepEqual(authoredPangramPng(), actual);
});
