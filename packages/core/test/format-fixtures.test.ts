// The committed, independent fixtures of ticket 2.22: the samples the legacy
// corpus cannot supply, and the reader paths that had only synthetic input.
//
// Three sources, all committed under `packages/core/test/fixtures/` and none
// sharing code with the readers (so a fixture cannot "pass by sharing the writer
// primitives"):
//
//   * `authored/`  — bytes written straight from the format specification layouts by
//     `tools/fixtures/author/generate.mjs` (detail 4/5/6 tilesets, an isometric
//     `.iso`, a `.tpk`, a Setup ZIP, a backslash-entry ZIP, a `CMP1` EXE and two
//     negative EXE stubs). No real sample of any of these exists.
//   * `real/`      — tiny files an editor produced (detail 1, 2 and 3 tilesets,
//     plus a `.tan` and a `.gph` held for ticket 16.7).
//   * `anonymised/` — derivatives of real legacy samples with every string and
//     every content byte replaced by the neutral placeholders the anonymiser
//     uses (`tools/fixtures/author/anonymise.mjs`).
import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TextDecoder } from "node:util";
import {
  BinaryReader,
  expandTileToRgba,
  loadPackage,
  PACKAGE_ROOT,
  readAppendedZip,
  readSpecialMove,
  readStatusEffect,
  readTileAnimation,
  readTileset,
  resolveAsset,
  writeTileAnimation,
  writeTileset,
} from "../src/index.ts";
import type { Result, Tileset } from "../src/index.ts";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "..", "..", "..");
const fixtures = join(testDir, "fixtures");

/** Unwrap a result the test expects to succeed. */
function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`expected ok, got: ${result.error.message}`);
  }
  return result.value;
}

/** The committed fixture at `name`, relative to the fixtures folder. */
function fixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(fixtures, name)));
}

/** A parsed tileset and a check that it round-trips to the same bytes. */
function tileset(name: string): Tileset {
  const bytes = fixture(name);
  const model = unwrap(readTileset(bytes, name));
  equal(model.residue.length, 0, `${name}: no trailing bytes`);
  deepEqual([...unwrap(writeTileset(model))], [...bytes], `${name}: byte-identical round-trip`);
  return model;
}

// ------------------------------------------------------------- tilesets

test("the authored detail-4 tileset parses and its palette pixels expand", () => {
  const model = tileset("authored/detail4.tst");
  equal(model.version, 20);
  equal(model.detail.code, 4);
  equal(model.detail.size, 16);
  equal(model.detail.bytesPerPixel, 1);
  // Two tiles, so the per-tile stride is exercised without the sample games.
  equal(model.tiles.length, 2);
  equal(model.tiles[0]?.pixels.length, 16 * 16);
  equal(model.tiles[1]?.pixels.length, 16 * 16);

  const rgba = unwrap(expandTileToRgba(model, 0));
  equal(rgba.length, 16 * 16 * 4);
  // The stored index at column-major k is `k mod 256`; pixel (x, y) reads k = x*16+y.
  const pixel = (memory: Uint8Array, x: number, y: number): readonly number[] => {
    const o = (x * 16 + y) * 4;
    return [memory[o] ?? 0, memory[o + 1] ?? 0, memory[o + 2] ?? 0, memory[o + 3] ?? 0];
  };
  // index 0 at (0, 0) → black; index 1 at (0, 1) → the palette's blue; index 15
  // (white) at (0, 15).
  deepEqual(pixel(rgba, 0, 0), [0, 0, 0, 255]);
  deepEqual(pixel(rgba, 0, 1), [0x00, 0x00, 0xa8, 255]); // DOS palette index 1 is blue
  deepEqual(pixel(rgba, 0, 15), [255, 255, 255, 255]);
  // stored index 255 is the transparent key; k = 255 is (15, 15).
  deepEqual(pixel(rgba, 15, 15), [0, 0, 0, 0]);

  // Tile 1's pattern is shifted by 64 stored pixels, so the transparent key
  // falls 64 pixels earlier: k = 191 is (11, 15), and (15, 15) is now opaque.
  const second = unwrap(expandTileToRgba(model, 1));
  deepEqual(pixel(second, 11, 15), [0, 0, 0, 0]);
  equal(pixel(second, 15, 15)[3], 255);
  equal(pixel(second, 0, 0)[3], 255);
});

test("the authored detail-5 tileset parses (32x32 palette)", () => {
  const model = tileset("authored/detail5.tst");
  equal(model.detail.code, 5);
  equal(model.detail.size, 32);
  const rgba = unwrap(expandTileToRgba(model, 0));
  equal(rgba.length, 32 * 32 * 4);
  // index 1 is at k = 1 → (0, 1), i.e. offset (0*32+1)*4.
  deepEqual([rgba[4], rgba[5], rgba[6], rgba[7]], [0x00, 0x00, 0xa8, 255]);
});

test("the authored detail-6 tileset parses (16x16 palette)", () => {
  const model = tileset("authored/detail6.tst");
  equal(model.detail.code, 6);
  equal(model.detail.size, 16);
  equal(model.detail.bytesPerPixel, 1);
  const rgba = unwrap(expandTileToRgba(model, 0));
  equal(rgba.length, 16 * 16 * 4);
  // k = 255 is (15, 15) → transparent.
  equal(rgba[(15 * 16 + 15) * 4 + 3], 0);
});

test("the authored isometric .iso parses and unpacks the documented diamond", () => {
  const model = tileset("authored/iso.iso");
  equal(model.version, 30);
  equal(model.detail.code, 150);
  equal(model.detail.isometric, true);

  const rgba = unwrap(expandTileToRgba(model, 0));
  equal(rgba.length, 64 * 32 * 4);
  let opaque = 0;
  for (let at = 3; at < rgba.length; at += 4) {
    if (rgba[at] === 255) opaque += 1;
  }
  equal(opaque, 1024);
  // The column-major walk meets (1, 15), (1, 16), (2, 15) first, taking stored
  // pixels 0, 1, 2 — whose authored R values are 0, 1, 2 (R = k mod 256).
  equal(rgba[(1 * 32 + 15) * 4], 0);
  equal(rgba[(1 * 32 + 16) * 4], 1);
  equal(rgba[(2 * 32 + 15) * 4], 2);
  equal(rgba[0 * 4 + 3], 0); // the top-left corner is outside the diamond
});

test("the real 16x16 detail-2 tileset parses and round-trips", () => {
  const model = tileset("real/16x16.tst");
  equal(model.version, 20);
  equal(model.detail.code, 2);
  equal(model.detail.size, 16);
  equal(model.tiles.length, 1);
});

test("the real 256-colour tileset parses as detail 3 and round-trips", () => {
  const model = tileset("real/256.tst");
  equal(model.version, 20);
  equal(model.detail.code, 3);
  equal(model.detail.size, 32);
  equal(model.detail.bytesPerPixel, 1);
});

test("the real 16-colour-mode tilesets still save as detail 1", () => {
  // Both files came from the "16 colours" mode but store detail 1 (the detail
  // is the pixel format, not the palette size the UI offered; `docs/spec/formats/tiles.md#tileset-tst-and-isometric-tileset-iso`).
  for (const name of ["real/16m.tst", "real/16c.tst"]) {
    const model = tileset(name);
    equal(model.detail.code, 1, name);
    equal(model.detail.bytesPerPixel, 3, name);
  }
});

test("the real .tan parses with readTileAnimation with zero residue (ticket 16.7)", () => {
  const tan = fixture("real/animatedTile.tan");
  const model = unwrap(readTileAnimation(new BinaryReader(tan, "animatedTile.tan")));
  equal(model.magic, "RPGTLKIT TILEANIM");
  equal(model.residue?.length ?? 0, 0);
  const reEncoded = unwrap(writeTileAnimation(model));
  deepEqual(reEncoded, tan);

  const gph = fixture("real/v1tile.gph");
  const lines = new TextDecoder().decode(gph).split("\r\n").filter((line) => line !== "");
  equal(lines.length, 16, "`docs/spec/formats/tiles.md#single-tile-gph`: a 16x16 grid, one text row per y");
  equal(lines[0]?.length, 16);
});

// --------------------------------------------------------- battle files

test("every anonymised .spc parses with readSpecialMove and keeps only the placeholders", () => {
  for (const [name, expected] of [
    ["anonymised/spc-1.spc", "Move One"],
    ["anonymised/spc-2.spc", "Move Two"],
    ["anonymised/spc-3.spc", "Move Three"],
  ] as const) {
    const bytes = fixture(name);
    const move = unwrap(readSpecialMove(new BinaryReader(bytes, name)));
    equal(move.magic, "RPGTLKIT SPLMOVE", name);
    equal(move.minor, 2, name);
    equal(move.name, expected, name);
    // Every surviving string is a neutral placeholder, so no source-game text
    // can have survived the anonymisation.
    equal(move.program, "", name);
    equal(move.statusEffect, "", name);
    equal(move.animation, "", name);
    equal(move.description, "Authored placeholder description.", name);
    equal(move.residue.length, 0, name);
  }
});

test("every anonymised .ste parses with readStatusEffect and keeps only the placeholders", () => {
  for (const [name, expected] of [
    ["anonymised/ste-1.ste", "Status One"],
    ["anonymised/ste-2.ste", "Status Two"],
    ["anonymised/ste-3.ste", "Status Three"],
  ] as const) {
    const bytes = fixture(name);
    const effect = unwrap(readStatusEffect(new BinaryReader(bytes, name)));
    equal(effect.magic, "RPGTLKIT STATUSE", name);
    equal(effect.minor, 2, name);
    equal(effect.name, expected, name);
    equal(effect.program, "", name);
    equal(effect.residue.length, 0, name);
  }
});

// ------------------------------------------------------------ packages

/** The project tree the authored `.tpk`, backslash ZIP and `CMP1` EXE share. */
const AUTHORED_TREE = [
  "main.gam",
  "Tiles/set.tst",
  "Boards/start.brd",
  "Media/theme.mid",
  "README.txt",
];

test("the authored .tpk loads and resolves a tile reference case-insensitively", () => {
  const loaded = unwrap(loadPackage({ kind: "tpk", name: "package.tpk", bytes: fixture("authored/package.tpk") }));
  equal(loaded.format, "tpk");
  deepEqual(loaded.files.map((file) => file.path), AUTHORED_TREE);
  equal(unwrap(resolveAsset(loaded.index, PACKAGE_ROOT, "tiles", "TILES\\set.tst")), "tiles/set.tst");
  equal(unwrap(resolveAsset(loaded.index, PACKAGE_ROOT, "tiles", "set.tst")), "tiles/set.tst");
  const missing = resolveAsset(loaded.index, PACKAGE_ROOT, "specialMoves", "nothing.spc");
  equal(missing.ok, false);

  // The tileset inside the package is the authored detail-4 one, so the package
  // fixture carries a real tileset rather than arbitrary bytes.
  const tiles = loaded.files.find((file) => file.path === "Tiles/set.tst");
  equal(tiles !== undefined, true);
  equal(unwrap(readTileset(tiles?.bytes ?? new Uint8Array())).detail.code, 4);
});

test("the authored Setup ZIP loads with its Main/ and Game/ layout", () => {
  const loaded = unwrap(loadPackage({ kind: "tpk", name: "setup.zip", bytes: fixture("authored/setup.zip") }));
  deepEqual(loaded.files.map((file) => file.path), [
    "Main/game.gam",
    "Game/demo/Tiles/set.tst",
    "Game/demo/Boards/start.brd",
    "Game/demo/Media/theme.mid",
    "Game/demo/README.txt",
  ]);
});

test("the authored deflated .tpk (method 8) loads to the same tree as the stored one", () => {
  const bytes = fixture("authored/package-deflated.tpk");
  // The first local file header's method field (bytes 8..9) is 8, so this ZIP
  // really does take the reader's inflate path.
  equal(bytes[8] !== undefined && (bytes[8]! | ((bytes[9] ?? 0) << 8)) === 8, true);

  const deflated = unwrap(loadPackage({ kind: "tpk", name: "package-deflated.tpk", bytes }));
  const stored = unwrap(loadPackage({ kind: "tpk", name: "package.tpk", bytes: fixture("authored/package.tpk") }));
  deepEqual(deflated.files.map((file) => file.path), AUTHORED_TREE);
  for (const file of deflated.files) {
    const reference = stored.files.find((other) => other.path === file.path);
    deepEqual([...file.bytes], [...(reference?.bytes ?? new Uint8Array())], file.path);
  }
  deepEqual(unwrap(readTileset(deflated.files.find((file) => file.path === "Tiles/set.tst")?.bytes ?? new Uint8Array())).tiles.length, 2);
});

test("the authored backslash-entry ZIP loads to the same tree as the .tpk", () => {
  const zip = unwrap(loadPackage({ kind: "tpk", name: "backslash.zip", bytes: fixture("authored/backslash.zip") }));
  const tpk = unwrap(loadPackage({ kind: "tpk", name: "package.tpk", bytes: fixture("authored/package.tpk") }));
  deepEqual(zip.files.map((file) => file.path), AUTHORED_TREE);
  deepEqual(zip.index.keys, tpk.index.keys);
});

test("the authored CMP1 standalone EXE extracts its ZIP and loads the same tree", () => {
  const bytes = fixture("authored/package-cmp1.exe");
  const zip = fixture("authored/package.tpk");
  deepEqual([...unwrap(readAppendedZip(bytes, "package-cmp1.exe"))], [...zip]);

  const exe = unwrap(loadPackage({ kind: "exe", name: "package-cmp1.exe", bytes }));
  equal(exe.format, "exe");
  deepEqual(exe.files.map((file) => file.path), AUTHORED_TREE);
  deepEqual(exe.index.keys, unwrap(loadPackage({ kind: "tpk", name: "package.tpk", bytes: zip })).index.keys);
});

test("both negative EXE stubs are refused by L21 with the extract-your-assets message", () => {
  for (const name of ["authored/exe-tk2-stub.exe", "authored/exe-pe-zip.exe"]) {
    const result = loadPackage({ kind: "exe", name, bytes: fixture(name) });
    equal(result.ok, false, `${name} should be refused`);
    if (result.ok) continue;
    equal(result.error.section, "docs/spec/formats/packaging-and-paths.md", name);
    const message = result.error.message;
    equal(message.includes("missing CMP1 trailer"), true, name);
    equal(message.includes("L21"), true, name);
    equal(message.includes("not supported"), true, name);
    equal(message.includes("extract the assets"), true, name);
    equal(/project folder/.test(message), true, name);
    equal(/Setup ZIP/.test(message), true, name);
    equal(/\.tpk/.test(message), true, name);
  }
});

test("the anonymised Setup-bundle excerpt keeps the Setup layout with neutral names", () => {
  const bytes = fixture("anonymised/setup-excerpt.zip");
  // The source bundle's own separators were backslashes; the fixture keeps them.
  equal(new TextDecoder("windows-1252").decode(bytes).includes("Game\\Demo\\"), true);

  const loaded = unwrap(loadPackage({ kind: "tpk", name: "setup-excerpt.zip", bytes }));
  deepEqual(loaded.files.map((file) => file.path), [
    "Main/asset0.gam",
    "Game/Demo/Tiles/asset1.tst",
    "Game/Demo/Tiles/asset2",
    "Game/Demo/Tiles/asset3.tan",
    "Game/Demo/Tiles/asset4.tst",
    "Game/Demo/Tiles/asset5.tst",
  ]);
  // docs/spec/formats/packaging-and-paths.md#loose-folder's Setup shape: the main file under `Main/` and the project under `Game/`.
  equal(loaded.files.filter((file) => file.path.startsWith("Main/")).length, 1);
  equal(loaded.files.filter((file) => file.path.startsWith("Game/Demo/")).length, 5);
  for (const file of loaded.files) {
    equal(file.bytes.length <= 48, true, `${file.path} is small`);
  }
});

// ----------------------------------------------------------- provenance

test("no committed fixture body holds more than the authored stub (nothing legacy-sized)", () => {
  const scanned = ["authored", "real", "anonymised"];
  for (const folder of scanned) {
    for (const name of readdirSync(join(fixtures, folder))) {
      const bytes = fixture(join(folder, name));
      // The largest authored fixture is the 3,078-byte isometric tileset; a
      // legacy game asset would be orders of magnitude larger.
      equal(bytes.length <= 8192, true, `${folder}/${name} is ${bytes.length} bytes`);
    }
  }
});

test("the authoring script reproduces the committed fixtures byte for byte", () => {
  const script = join(repoRoot, "tools", "fixtures", "author", "generate.mjs");
  const result = spawnSync(process.execPath, [script, "--check"], { encoding: "utf8" });
  equal(result.status, 0, result.stderr);
  equal(/match a fresh run/.test(result.stdout), true, result.stdout);
});
