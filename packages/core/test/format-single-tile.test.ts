// Single tile (.gph v2) format of `docs/spec/formats/tiles.md#single-tile-gph`
// (format-spec §3.2, §15.11): text format, details 1..6, compression 0 (uncompressed)
// and 1 (RLE), RGBA expansion and writer.

import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readSingleTile,
  writeSingleTile,
  expandSingleTileToRgba,
  DOS_PALETTE,
  SINGLE_TILE_MAGIC,
  SINGLE_TILE_SECTION,
  type Result,
  type SingleTile,
} from "../src/index.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");

function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`expected ok, got: ${result.error.message}`);
  }
  return result.value;
}

test("reads tile_v2_compressed.gph sample file", () => {
  const path = join(repoRoot, "docs", "spec", "examples", "versions", "single-tile", "tile_v2_compressed.gph");
  const text = readFileSync(path, "utf8");
  const res = readSingleTile(text, path);
  equal(res.ok, true);
  if (res.ok) {
    equal(res.value.magic, SINGLE_TILE_MAGIC);
    equal(res.value.detail, 1);
    equal(res.value.compression, 1);
    equal(res.value.width, 32);
    equal(res.value.height, 32);
    equal(res.value.pixels.length, 1024);

    const rgba = unwrap(expandSingleTileToRgba(res.value));
    equal(rgba.length, 32 * 32 * 4);

    // Re-writing and re-reading preserves pixels
    const written = writeSingleTile(res.value);
    const reRead = unwrap(readSingleTile(written));
    deepEqual(reRead.pixels, res.value.pixels);
  }
});

test("reads tile_v2_uncompressed.gph sample file", () => {
  const path = join(repoRoot, "docs", "spec", "examples", "versions", "single-tile", "tile_v2_uncompressed.gph");
  const text = readFileSync(path, "utf8");
  const res = readSingleTile(text, path);
  equal(res.ok, true);
  if (res.ok) {
    equal(res.value.detail, 1);
    equal(res.value.compression, 0);
    equal(res.value.pixels.length, 1024);

    const written = writeSingleTile(res.value);
    const reRead = unwrap(readSingleTile(written));
    deepEqual(reRead.pixels, res.value.pixels);
  }
});

test("reads tile_v2_detail2.gph (16x16 tile)", () => {
  const path = join(repoRoot, "docs", "spec", "examples", "versions", "single-tile", "tile_v2_detail2.gph");
  const text = readFileSync(path, "utf8");
  const res = readSingleTile(text, path);
  equal(res.ok, true);
  if (res.ok) {
    equal(res.value.detail, 2);
    equal(res.value.width, 16);
    equal(res.value.height, 16);
    equal(res.value.pixels.length, 256);

    const rgba = unwrap(expandSingleTileToRgba(res.value));
    equal(rgba.length, 16 * 16 * 4);
  }
});

test("reads flower.gph game example tile", () => {
  const path = join(repoRoot, "docs", "spec", "examples", "game", "Game", "Example", "Tiles", "flower.gph");
  const text = readFileSync(path, "utf8");
  const res = readSingleTile(text, path);
  equal(res.ok, true);
  if (res.ok) {
    equal(res.value.width, 32);
    equal(res.value.height, 32);
    equal(res.value.pixels.length, 1024);
  }
});

test("refuses tile_v1.gph with helpful Toolkit 1 out-of-scope error", () => {
  const path = join(repoRoot, "docs", "spec", "examples", "versions", "single-tile", "tile_v1.gph");
  const text = readFileSync(path, "utf8");
  const res = readSingleTile(text, path);
  equal(res.ok, false);
  if (!res.ok) {
    equal(res.error.section, SINGLE_TILE_SECTION);
    equal(res.error.message.includes("Toolkit 1.x"), true);
  }
});

test("expands detail 3 palette tile using DOS_PALETTE with transparency", () => {
  const tile: SingleTile = {
    magic: SINGLE_TILE_MAGIC,
    major: 2,
    minor: 0,
    detail: 3,
    compression: 0,
    width: 2,
    height: 2,
    pixels: [1, 255, -1, 0],
  };
  const rgba = unwrap(expandSingleTileToRgba(tile, "column-major"));
  equal(rgba.length, 2 * 2 * 4);

  // Pixel 0 (val 1): DOS_PALETTE[1*3 .. 1*3+2]
  deepEqual([rgba[0], rgba[1], rgba[2], rgba[3]], [DOS_PALETTE[3], DOS_PALETTE[4], DOS_PALETTE[5], 255]);
  // Pixel 1 (val 255): transparent
  deepEqual([rgba[4], rgba[5], rgba[6], rgba[7]], [0, 0, 0, 0]);
  // Pixel 2 (val -1): transparent
  deepEqual([rgba[8], rgba[9], rgba[10], rgba[11]], [0, 0, 0, 0]);
  // Pixel 3 (val 0): DOS_PALETTE[0]
  deepEqual([rgba[12], rgba[13], rgba[14], rgba[15]], [DOS_PALETTE[0], DOS_PALETTE[1], DOS_PALETTE[2], 255]);
});

test("expands detail 1 COLORREF tile with transparency", () => {
  // COLORREF 0x00BBGGRR: red 0x11, green 0x22, blue 0x33 -> 0x00332211 = 3351057
  const tile: SingleTile = {
    magic: SINGLE_TILE_MAGIC,
    major: 2,
    minor: 0,
    detail: 1,
    compression: 0,
    width: 1,
    height: 2,
    pixels: [3351057, -1],
  };
  const rgba = unwrap(expandSingleTileToRgba(tile));
  deepEqual([rgba[0], rgba[1], rgba[2], rgba[3]], [0x11, 0x22, 0x33, 255]);
  deepEqual([rgba[4], rgba[5], rgba[6], rgba[7]], [0, 0, 0, 0]);
});

test("refuses invalid detail, compression, or malformed numbers", () => {
  const badDetail = "RPGTLKIT TILE\r\n 2 \r\n 0 \r\n 9 \r\n 0 \r\n";
  const resDetail = readSingleTile(badDetail);
  equal(resDetail.ok, false);
  if (!resDetail.ok) {
    equal(resDetail.error.section, SINGLE_TILE_SECTION);
  }

  const badComp = "RPGTLKIT TILE\r\n 2 \r\n 0 \r\n 1 \r\n 5 \r\n";
  const resComp = readSingleTile(badComp);
  equal(resComp.ok, false);

  const nonNum = "RPGTLKIT TILE\r\n 2 \r\n 0 \r\n 1 \r\n 0 \r\n not_a_number \r\n";
  const resNum = readSingleTile(nonNum);
  equal(resNum.ok, false);
});

test("refuses runs that overshoot or undershoot grid capacity", () => {
  // 16x16 = 256 pixels expected. Run of 300 overshoots.
  const overshoot = "RPGTLKIT TILE\r\n 2 \r\n 0 \r\n 2 \r\n 1 \r\n 300 \r\n -1 \r\n";
  const resOver = readSingleTile(overshoot);
  equal(resOver.ok, false);

  // Run of only 50 ends early.
  const undershoot = "RPGTLKIT TILE\r\n 2 \r\n 0 \r\n 2 \r\n 1 \r\n 50 \r\n -1 \r\n";
  const resUnder = readSingleTile(undershoot);
  equal(resUnder.ok, false);
});
