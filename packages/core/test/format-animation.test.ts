// The animation format of format-spec §7.1 (AD-18): the header and the minor
// check, the upper-bound frame slots, per-frame image/transparent/sound, the
// trailing f64 delay, the image-reference classifier, and the sample
// fixtures when they have been fetched.
//
// The reader never throws, so the tests assert on values and on the error's
// offset and section rather than on exceptions.
import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ANIMATION_MAGIC,
  ANIMATION_SECTION,
  BinaryReader,
  BinaryWriter,
  classifyImageReference,
  readAnimation,
  writeAnimation,
} from "../src/index.ts";
import type { Animation, AnimationFrame, Colorref, Result } from "../src/index.ts";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "..", "..", "..");

/** Unwrap a result the test expects to succeed. */
function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`expected ok, got: ${result.error.message}`);
  }
  return result.value;
}

/** A frame with the fields the tests vary. */
function frame(image: string, transparent: Colorref, sound = ""): AnimationFrame {
  return { image, transparent, sound };
}

const WHITE: Colorref = { r: 0xff, g: 0xff, b: 0xff };
const RED: Colorref = { r: 0xff, g: 0x00, b: 0x00 };
const BLACK: Colorref = { r: 0x00, g: 0x00, b: 0x00 };

/** The fields a synthetic animation lets a test vary. */
interface BuildOptions {
  readonly magic?: string;
  readonly major?: number;
  readonly minor?: number;
  readonly width?: number;
  readonly height?: number;
  readonly bound?: number;
  readonly frames?: readonly AnimationFrame[];
  readonly delay?: number;
  /** Extra bytes after the last field, to prove they survive as residue. */
  readonly tail?: readonly number[];
}

/** Serialise a synthetic animation with the raw stored bound. */
function buildBytes(options: BuildOptions = {}): Uint8Array {
  const writer = new BinaryWriter();
  writer.str(options.magic ?? ANIMATION_MAGIC);
  writer.i16(options.major ?? 2);
  writer.i16(options.minor ?? 3);
  writer.i32(options.width ?? 32);
  writer.i32(options.height ?? 32);
  writer.i32(options.bound ?? -1);
  for (const f of options.frames ?? []) {
    writer.str(f.image);
    writer.color(f.transparent);
    writer.str(f.sound);
  }
  writer.f64(options.delay ?? 0.15);
  if (options.tail !== undefined) {
    writer.writeBytes(new Uint8Array(options.tail));
  }
  return writer.toBytes();
}

test("reads the header, dimensions, frame slots and delay", () => {
  const bytes = buildBytes({
    bound: 0,
    frames: [frame("char.tst3", WHITE)],
    delay: 0.15,
  });
  const reader = new BinaryReader(bytes);
  const animation = unwrap(readAnimation(reader));
  equal(animation.magic, ANIMATION_MAGIC);
  equal(animation.major, 2);
  equal(animation.minor, 3);
  equal(animation.width, 32);
  equal(animation.height, 32);
  equal(animation.frames.length, 1);
  deepEqual(animation.frames[0], { image: "char.tst3", transparent: WHITE, sound: "" });
  equal(animation.delay, 0.15);
  equal(reader.remaining, 0);
});

test("a minor other than 3 is rejected with its offset", () => {
  const bytes = buildBytes({ minor: 4 });
  const result = readAnimation(new BinaryReader(bytes));
  equal(result.ok, false);
  if (result.ok) {
    return;
  }
  equal(result.error.section, ANIMATION_SECTION);
  // magic (14 bytes incl. NUL) + major (2) = the minor field starts at 16.
  equal(result.error.offset, 16);
});

test("a wrong magic is rejected at offset 0", () => {
  const bytes = buildBytes({ magic: "RPGTLKIT BOARD" });
  const result = readAnimation(new BinaryReader(bytes));
  equal(result.ok, false);
  if (result.ok) {
    return;
  }
  equal(result.error.section, ANIMATION_SECTION);
  equal(result.error.offset, 0);
});

test("an upper bound of n means n + 1 frame slots", () => {
  const bytes = buildBytes({
    bound: 2,
    frames: [frame("a.png", BLACK), frame("b.png", BLACK), frame("c.png", BLACK)],
  });
  const reader = new BinaryReader(bytes);
  const animation = unwrap(readAnimation(reader));
  equal(animation.frames.length, 3);
  equal(reader.remaining, 0);
});

test("an upper bound of -1 means no frame slots", () => {
  const bytes = buildBytes({ bound: -1, frames: [] });
  const reader = new BinaryReader(bytes);
  const animation = unwrap(readAnimation(reader));
  equal(animation.frames.length, 0);
  equal(animation.delay, 0.15);
  equal(reader.remaining, 0);
});

test("empty images are kept, not dropped", () => {
  const bytes = buildBytes({
    bound: 2,
    frames: [frame("", BLACK), frame("start.tst1", WHITE), frame("", BLACK)],
  });
  const reader = new BinaryReader(bytes);
  const animation = unwrap(readAnimation(reader));
  equal(animation.frames.length, 3);
  equal(animation.frames[0]?.image, "");
  equal(animation.frames[2]?.image, "");
  equal(reader.remaining, 0);
});

test("each frame carries its own transparent colour", () => {
  const bytes = buildBytes({
    bound: 2,
    frames: [frame("a.tst1", WHITE), frame("b.tst2", RED), frame("", BLACK)],
  });
  const animation = unwrap(readAnimation(new BinaryReader(bytes)));
  deepEqual(
    animation.frames.map((f) => f.transparent),
    [WHITE, RED, BLACK],
  );
});

test("the image-reference classifier reads tile references, pictures and .tbm", () => {
  deepEqual(classifyImageReference("default.tst12"), {
    kind: "tile",
    tileset: "default.tst",
    index: 12,
  });
  deepEqual(classifyImageReference("forest.iso3"), {
    kind: "tile",
    tileset: "forest.iso",
    index: 3,
  });
  deepEqual(classifyImageReference("man_n.png"), { kind: "picture", path: "man_n.png" });
  deepEqual(classifyImageReference("Bitmap/tiles.tbm"), {
    kind: "tileBitmap",
    path: "Bitmap/tiles.tbm",
  });
  deepEqual(classifyImageReference(""), { kind: "empty" });
});

test("the delay is an f64 read back exactly", () => {
  const bytes = buildBytes({ bound: -1, frames: [], delay: 0.125 });
  const animation = unwrap(readAnimation(new BinaryReader(bytes)));
  equal(animation.delay, 0.125);
});

test("a parsed animation writes back byte-for-byte", () => {
  const bytes = buildBytes({
    bound: 2,
    frames: [frame("char.tst3", WHITE), frame("", BLACK, "clang.wav"), frame("man_n.png", RED)],
    delay: 0.2,
  });
  const animation = unwrap(readAnimation(new BinaryReader(bytes)));
  const out = unwrap(writeAnimation(animation));
  deepEqual(out, bytes);
});

test("keeps trailing bytes as residue with one warning and round-trips", () => {
  const bytes = buildBytes({ bound: 0, frames: [frame("a.tst1", BLACK)], tail: [0xde, 0xad] });
  const reader = new BinaryReader(bytes);
  const result = readAnimation(reader);
  equal(result.ok, true);
  const animation = unwrap(result);
  deepEqual(animation.residue, new Uint8Array([0xde, 0xad]));
  equal(result.ok && result.warnings.length, 1);
  equal(reader.remaining, 0);
  deepEqual(unwrap(writeAnimation(animation)), bytes);
});

test("a clean synthetic animation has no residue and no warnings", () => {
  const bytes = buildBytes({ bound: 0, frames: [frame("a.tst1", BLACK)], delay: 0.5 });
  const result = readAnimation(new BinaryReader(bytes));
  equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  equal(result.value.residue.length, 0);
  equal(result.warnings.length, 0);
});

test("EOF before the delay reports the field offset and a section", () => {
  const writer = new BinaryWriter();
  writer.str(ANIMATION_MAGIC);
  writer.i16(2);
  writer.i16(3);
  writer.i32(32);
  writer.i32(32);
  writer.i32(0);
  writer.str("x");
  writer.color(BLACK);
  writer.str("");
  const bytes = writer.toBytes();
  const result = readAnimation(new BinaryReader(bytes));
  equal(result.ok, false);
  if (result.ok) {
    return;
  }
  // header (18) + width/height/bound (12) + frame ("x\0" 2 + color 4 + "\0" 1).
  equal(result.error.offset, 37);
  equal(typeof result.error.section, "string");
  equal(result.error.section.length > 0, true);
});

test("a frame cut short reports the frame's first byte", () => {
  const writer = new BinaryWriter();
  writer.str(ANIMATION_MAGIC);
  writer.i16(2);
  writer.i16(3);
  writer.i32(32);
  writer.i32(32);
  writer.i32(1);
  const bytes = writer.toBytes();
  const result = readAnimation(new BinaryReader(bytes));
  equal(result.ok, false);
  if (result.ok) {
    return;
  }
  // header (18) + width/height/bound (12): the first frame's image starts here.
  equal(result.error.offset, 30);
  equal(result.error.section.length > 0, true);
});

test("an unencodable frame string fails the writer", () => {
  const model: Animation = {
    magic: ANIMATION_MAGIC,
    major: 2,
    minor: 3,
    width: 32,
    height: 32,
    frames: [frame("bad\u0100.png", BLACK)],
    delay: 0.15,
    residue: new Uint8Array(0),
  };
  const result = writeAnimation(model);
  equal(result.ok, false);
});

// --- Sample fixtures (guard-rail G5 rule 4: fetched, never committed) --------

/** Every `.anm` under `root`, recursively; empty when the folder is absent. */
function collectAnm(root: string): string[] {
  if (!existsSync(root)) {
    return [];
  }
  return readdirSync(root, { recursive: true })
    .filter((name) => name.toLowerCase().endsWith(".anm"))
    .map((name) => join(root, name));
}

const sampleAnm = [
  ...collectAnm(join(repoRoot, "fixtures", "legacy", "demo")),
  ...collectAnm(join(repoRoot, "fixtures", "legacy", "Basic")),
];

test(
  "every sample animation parses with zero trailing bytes and round-trips",
  { skip: sampleAnm.length === 0 ? "legacy fixtures are not fetched" : false },
  () => {
    for (const file of sampleAnm) {
      const bytes = new Uint8Array(readFileSync(file));
      const reader = new BinaryReader(bytes, file);
      const result = readAnimation(reader);
      const animation = unwrap(result);
      equal(reader.remaining, 0, `${file} has ${reader.remaining} trailing byte(s)`);
      equal(animation.residue.length, 0, `${file}: ${animation.residue.length} byte(s) fell through to residue`);
      if (result.ok) {
        equal(
          result.warnings.filter((warning) => warning.includes("residue")).length,
          0,
          `${file}: residue warning`,
        );
      }
      const out = unwrap(writeAnimation(animation));
      deepEqual(out, bytes, `${file} did not round-trip`);
    }
  },
);
