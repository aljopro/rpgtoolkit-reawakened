// Animated tile format of `docs/spec/formats/tiles.md#animated-tile-tan`:
// binary header, speed 1..200, exact frame count, and frame references.
// Tests assert on values, error offsets and sections, with strict typing.

import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BinaryReader,
  readTileAnimation,
  writeTileAnimation,
  TILE_ANIMATION_MAGIC,
  TILE_ANIMATION_SECTION,
  type Result,
  type TileAnimation,
} from "../src/index.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");

function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`expected ok, got: ${result.error.message}`);
  }
  return result.value;
}

function buildTanBytes(options: {
  magic?: string;
  major?: number;
  minor?: number;
  speed?: number;
  frameCount?: number;
  frames?: readonly string[];
  tail?: readonly number[];
} = {}): Uint8Array {
  const out: number[] = [];
  const pushI16 = (val: number): void => {
    const s = val & 0xffff;
    out.push(s & 0xff, (s >> 8) & 0xff);
  };
  const pushI32 = (val: number): void => {
    out.push(val & 0xff, (val >> 8) & 0xff, (val >> 16) & 0xff, (val >> 24) & 0xff);
  };
  const pushStr = (s: string): void => {
    for (let i = 0; i < s.length; i += 1) {
      out.push(s.charCodeAt(i) & 0xff);
    }
    out.push(0);
  };

  pushStr(options.magic ?? TILE_ANIMATION_MAGIC);
  pushI16(options.major ?? 2);
  pushI16(options.minor ?? 0);
  pushI32(options.speed ?? 15);
  pushI32(options.frameCount ?? (options.frames ? options.frames.length : 0));
  for (const f of options.frames ?? []) {
    pushStr(f);
  }
  if (options.tail !== undefined) {
    out.push(...options.tail);
  }
  return new Uint8Array(out);
}

test("reads water.tan sample file with exact fields and zero residue", () => {
  const path = join(repoRoot, "docs", "spec", "examples", "versions", "tile-animation", "water.tan");
  const bytes = new Uint8Array(readFileSync(path));
  const res = readTileAnimation(new BinaryReader(bytes, path));
  equal(res.ok, true);
  if (res.ok) {
    equal(res.value.magic, TILE_ANIMATION_MAGIC);
    equal(res.value.major, 2);
    equal(res.value.minor, 0);
    equal(res.value.speed, 5);
    equal(res.value.frameCount, 3);
    deepEqual(res.value.frames, ["village.tst2", "village.tst3", "village.tst4"]);
    equal(res.value.residue?.length ?? 0, 0);

    const reEncoded = unwrap(writeTileAnimation(res.value));
    deepEqual(reEncoded, bytes);
  }
});

test("reads real fixture animatedTile.tan with zero residue", () => {
  const path = join(repoRoot, "packages", "core", "test", "fixtures", "real", "animatedTile.tan");
  const bytes = new Uint8Array(readFileSync(path));
  const res = readTileAnimation(new BinaryReader(bytes, path));
  equal(res.ok, true);
  if (res.ok) {
    equal(res.value.magic, TILE_ANIMATION_MAGIC);
    equal(res.value.frameCount, res.value.frames.length);
    equal(res.value.residue?.length ?? 0, 0);

    const reEncoded = unwrap(writeTileAnimation(res.value));
    deepEqual(reEncoded, bytes);
  }
});

test("refuses speed <= 0 with located error (division by zero)", () => {
  const zeroSpeed = buildTanBytes({ speed: 0, frameCount: 1, frames: ["test.tst1"] });
  const resZero = readTileAnimation(new BinaryReader(zeroSpeed));
  equal(resZero.ok, false);
  if (!resZero.ok) {
    equal(resZero.error.section, TILE_ANIMATION_SECTION);
    equal(resZero.error.offset, 22); // magic(18) + major(2) + minor(2) = 22
  }

  const negSpeed = buildTanBytes({ speed: -10, frameCount: 1, frames: ["test.tst1"] });
  const resNeg = readTileAnimation(new BinaryReader(negSpeed));
  equal(resNeg.ok, false);
  if (!resNeg.ok) {
    equal(resNeg.error.section, TILE_ANIMATION_SECTION);
    equal(resNeg.error.offset, 22);
  }
});

test("warns when speed exceeds documented maximum 200", () => {
  const highSpeed = buildTanBytes({ speed: 250, frameCount: 1, frames: ["test.tst1"] });
  const res = readTileAnimation(new BinaryReader(highSpeed));
  equal(res.ok, true);
  if (res.ok) {
    equal(res.value.speed, 250);
    equal(res.warnings.length, 1);
  }
});

test("refuses negative frameCount or frameCount exceeding remaining bytes", () => {
  const negCount = buildTanBytes({ frameCount: -1 });
  const resNeg = readTileAnimation(new BinaryReader(negCount));
  equal(resNeg.ok, false);
  if (!resNeg.ok) {
    equal(resNeg.error.section, TILE_ANIMATION_SECTION);
    equal(resNeg.error.offset, 26);
  }

  const hugeCount = buildTanBytes({ frameCount: 1000, frames: ["test.tst1"] });
  const resHuge = readTileAnimation(new BinaryReader(hugeCount));
  equal(resHuge.ok, false);
  if (!resHuge.ok) {
    equal(resHuge.error.section, TILE_ANIMATION_SECTION);
    equal(resHuge.error.offset, 26);
  }
});

test("keeps trailing residue bytes with warning", () => {
  const withTail = buildTanBytes({
    speed: 10,
    frameCount: 1,
    frames: ["tile.tst1"],
    tail: [0xaa, 0xbb, 0xcc],
  });
  const res = readTileAnimation(new BinaryReader(withTail));
  equal(res.ok, true);
  if (res.ok) {
    equal(res.value.residue?.length, 3);
    equal(res.warnings.length, 1);
    const roundTripped = unwrap(writeTileAnimation(res.value));
    deepEqual(roundTripped, withTail);
  }
});

test("refuses wrong magic header", () => {
  const badMagic = buildTanBytes({ magic: "NOT TILEANIM" });
  const res = readTileAnimation(new BinaryReader(badMagic));
  equal(res.ok, false);
  if (!res.ok) {
    equal(res.error.section, TILE_ANIMATION_SECTION);
    equal(res.error.offset, 0);
  }
});

test("handles every prefix truncation safely without throwing", () => {
  const valid = buildTanBytes({ speed: 20, frameCount: 2, frames: ["a.tst1", "b.tst2"] });
  for (let len = 0; len < valid.length; len += 1) {
    const truncated = valid.slice(0, len);
    const res = readTileAnimation(new BinaryReader(truncated));
    equal(res.ok, false);
  }
});

test("writer validates frame count and numeric ranges", () => {
  const mismatch: TileAnimation = {
    magic: TILE_ANIMATION_MAGIC,
    major: 2,
    minor: 0,
    speed: 10,
    frameCount: 2,
    frames: ["only_one.tst1"],
  };
  const res = writeTileAnimation(mismatch);
  equal(res.ok, false);
});
