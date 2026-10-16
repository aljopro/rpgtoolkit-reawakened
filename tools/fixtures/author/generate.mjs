// Author the fixtures the legacy corpus cannot supply (ticket 2.22).
//
//   node tools/fixtures/author/generate.mjs [--out <dir>] [--check]
//
// Every byte here is written straight from `docs/format-spec.md`'s byte layouts
// and nothing else: this tool imports no code from `packages/core` and uses no
// `BinaryWriter`/`writeTileset`, so the committed fixtures under
// `packages/core/test/fixtures/authored/` cannot "pass by sharing the writer
// primitives". The output is deterministic — a fixed timestamp in the ZIPs and
// closed-form pixel patterns — so `--check` can re-run the generator and prove
// the committed bytes are byte-identical (guard-rail G3's spirit, G7's
// doc-first rule).
//
// What is authored, and why:
//   * detail 4, 5 and 6 tilesets (§3.1) — the whole-archive crawl found tilesets
//     only at detail 1, 2 and 3, so detail 4, 5 and 6 have **no real sample
//     anywhere**: they are **authored from spec, unverified against a real
//     file**. The detail-4 set holds two tiles, so the per-tile offset stays
//     covered without the sample games.
//   * an isometric `.iso` (§3.1, §3.3) — no real `.iso` (version 30, detail 150)
//     exists in the archive.
//   * a `.tpk` and a `CMP1` standalone EXE (§13.1) — no real `.tpk` or
//     standalone EXE sample has these forms (`Setup` ZIP installers did ship,
//     and `Game/<project>/` archives do, but no `.tpk` and no `CMP1` trailer was
//     found in the archive).
//   * a Setup ZIP (§13.1 `Main/` + `Game/`), a backslash-separated project ZIP,
//     and two negative EXE stubs (a Toolkit 2 launcher with a private payload
//     and no trailer, and the shape of a self-extracting `zip.exe`: a launcher
//     prefix, then a ZIP, with no trailer locating it).
//   * a deflated (method 8) copy of the `.tpk`, because real packages are
//     deflated and every other fixture here is STORE.
//   * three Windows bitmaps (docs/spec/formats/images.md) — 24-bit with padded
//     rows, 1-bit with a two-entry palette, and an 8-bit RLE8 stream — so the
//     BMP decoder is pinned without a real game file in the repository.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { appendCmp1, ascii, buildZip, concat, le16, le32 } from "./zip.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..", "..");
const defaultOut = join(repoRoot, "packages", "core", "test", "fixtures", "authored");

/**
 * A Windows bitmap (docs/spec/formats/images.md): the 14-byte file header, the
 * 40-byte DIB header, the palette and the pixel array. `pixelBytes` is the
 * array exactly as stored (rows in file order, bottom row first for a positive
 * height, each already padded to its stride, or the RLE8 stream), so the row
 * padding is part of the fixture on purpose. `palette` is a list of
 * `[r, g, b]` triples.
 */
function bmp({ width, height, bits, palette = [], pixelBytes, compression = 0, clrUsed = palette.length }) {
  const paletteBytes = concat(palette.map(([r, g, b]) => new Uint8Array([b, g, r, 0])));
  const offBits = 14 + 40 + paletteBytes.length;
  return concat([
    ascii("BM"),
    le32(offBits + pixelBytes.length), // bfSize
    le32(0), // bfReserved1..2
    le32(offBits),
    le32(40), // biSize
    le32(width),
    le32(height), // positive: stored bottom-up
    le16(1), // biPlanes
    le16(bits),
    le32(compression),
    le32(pixelBytes.length), // biSizeImage
    le32(0), // biXPelsPerMeter
    le32(0), // biYPelsPerMeter
    le32(clrUsed), // biClrUsed (0 means the full set of 2^bits entries)
    le32(0), // biClrImportant
    paletteBytes,
    pixelBytes,
  ]);
}

/** One stored 24-bit row of `width` pixels: B, G, R per pixel, padded to 4 bytes. */
function rgb24Row(pixels) {
  const stride = Math.floor((24 * pixels.length + 31) / 32) * 4;
  const row = new Uint8Array(stride);
  pixels.forEach(([r, g, b], x) => {
    row[x * 3] = b;
    row[x * 3 + 1] = g;
    row[x * 3 + 2] = r;
  });
  return row;
}

/** One 1-bit stored row: `pixels[0]` the leftmost pixel, high bit first, padded to 4. */
function monoRow(pixels) {
  const stride = Math.floor((pixels.length + 31) / 32) * 4;
  const row = new Uint8Array(stride);
  pixels.forEach((value, x) => {
    if (value !== 0) row[x >> 3] |= 0x80 >> (x & 7);
  });
  return row;
}

/**
 * One tileset of §3.1: the 6-byte header (`i16 version`, `i16 tileCount`,
 * `i16 detail`) then tightly packed column-major pixels. `pixel(k, tile)` returns
 * the stored bytes of the k-th stored pixel of tile `tile`, so a fixture's
 * content is a closed-form function the tests can reproduce.
 */
function tileset(version, detail, size, bytesPerPixel, pixel, count = 1) {
  const pixels = new Uint8Array(count * size * size * bytesPerPixel);
  for (let tile = 0; tile < count; tile += 1) {
    for (let k = 0; k < size * size; k += 1) {
      const at = (tile * size * size + k) * bytesPerPixel;
      if (bytesPerPixel === 3) {
        const [r, g, b] = pixel(k, tile);
        pixels[at] = r;
        pixels[at + 1] = g;
        pixels[at + 2] = b;
      } else {
        pixels[at] = pixel(k, tile);
      }
    }
  }
  return concat([le16(version), le16(count), le16(detail), pixels]);
}

/**
 * An 8-bit palette pixel: the stored index is `k mod 256`, so the transparent
 * key (index 255) appears once per 256-pixel block. `tile` shifts the pattern,
 * so two tiles of one set never look alike.
 */
const palettePixel = (k, tile) => (k + tile * 64) & 0xff;

/** A 24-bit pixel that never hits the transparent key R=0, G=1, B=2 (§3.1). */
const rgbPixel = (k) => [k & 0xff, (k >> 8) & 0xff, 7];

const AUTHORED = {
  // Authored from spec, unverified against a real file (no detail-4 sample
  // exists in the archive). Two tiles pin the per-tile offset (§3.1).
  "detail4.tst": tileset(20, 4, 16, 1, palettePixel, 2),
  // Authored from spec, unverified against a real file (no detail-5 sample).
  "detail5.tst": tileset(20, 5, 32, 1, palettePixel),
  // Authored from spec, unverified against a real file (no detail-6 sample).
  "detail6.tst": tileset(20, 6, 16, 1, palettePixel),
  "iso.iso": tileset(30, 150, 32, 3, rgbPixel),

  // The image decoders' fixtures (docs/spec/formats/images.md). A 24-bit
  // bitmap whose 3-pixel rows pad to 12 bytes, stored bottom-up; a 1-bit
  // bitmap with two palette entries (biClrUsed 0) and 10-pixel rows; and an
  // 8-bit RLE8 stream that exercises a run, an odd-length absolute run with
  // its padding byte, end-of-line, a delta and end-of-bitmap.
  "bmp-rgb24.bmp": bmp({
    width: 3,
    height: 2,
    bits: 24,
    pixelBytes: concat([
      rgb24Row([[10, 20, 30], [40, 50, 60], [70, 80, 90]]), // bottom row
      rgb24Row([[100, 110, 120], [130, 140, 150], [160, 170, 180]]), // top row
    ]),
  }),
  "bmp-mono1.bmp": bmp({
    width: 10,
    height: 2,
    bits: 1,
    clrUsed: 0,
    palette: [[255, 255, 255], [0, 0, 0]],
    pixelBytes: concat([
      monoRow([1, 0, 1, 0, 1, 0, 1, 0, 1, 0]), // bottom row
      monoRow([0, 1, 0, 1, 0, 1, 0, 1, 0, 1]), // top row
    ]),
  }),
  "bmp-rle8.bmp": bmp({
    width: 4,
    height: 3,
    bits: 8,
    compression: 1,
    palette: [[10, 20, 30], [200, 0, 0], [0, 200, 0], [0, 0, 200]],
    pixelBytes: new Uint8Array([
      0x03, 0x01, // run: three pixels of index 1
      0x01, 0x02, // run: one pixel of index 2
      0x00, 0x00, // end of line
      0x00, 0x03, 0x03, 0x00, 0x03, 0x00, // absolute run of 3 bytes, then padding
      0x01, 0x00, // run: one pixel of index 0
      0x00, 0x00, // end of line
      0x00, 0x02, 0x01, 0x00, // delta: right 1
      0x02, 0x02, // run: two pixels of index 2
      0x00, 0x01, // end of bitmap
    ]),
  }),
};

/**
 * The project tree the authored packages carry: a project folder's contents at
 * the archive root, plus the legacy pak's root `main.gam` (§13.1). The tileset
 * is the authored detail-4 one, so a package fixture carries a real authored
 * tileset rather than arbitrary bytes.
 */
function projectFiles() {
  return [
    { name: "main.gam", bytes: concat([ascii("RPGTLKIT MAIN"), new Uint8Array([0]), le16(2), le16(9), new Uint8Array(8)]) },
    { name: "Tiles/set.tst", bytes: AUTHORED["detail4.tst"] },
    { name: "Boards/start.brd", bytes: concat([ascii("RPGTLKIT BOARD"), new Uint8Array([0]), le16(3), le16(4), ascii("authored board")]) },
    { name: "Media/theme.mid", bytes: concat([ascii("MThd"), le32(6)]) },
    { name: "README.txt", bytes: ascii("Authored fixture project for the package-loader tests (ticket 2.22).\n") },
  ];
}

/** A `.tpk` (§13.1): the project folder at the archive root, `main.gam` at the root. */
function tpk() {
  return buildZip(projectFiles());
}

/** A Setup ZIP (§13.1): a plain ZIP of the `Main/` and `Game/` folders. */
function setupZip(files) {
  const main = files.find((file) => file.name === "main.gam");
  const project = files.filter((file) => file.name !== "main.gam");
  return buildZip([
    { name: "Main/game.gam", bytes: main.bytes },
    ...project.map((file) => ({ name: `Game/demo/${file.name}`, bytes: file.bytes })),
  ]);
}

/** The same project ZIP with the legacy backslash separators in its entry names. */
function backslashZip(files) {
  return buildZip(files.map((file) => ({ name: file.name.replaceAll("/", "\\"), bytes: file.bytes })));
}

/**
 * The same project ZIP again, but every entry deflated (method 8) over a
 * stored-block DEFLATE stream. Real `.tpk` and Setup files are deflated, so this
 * pins the reader's method-8 path without any compressor.
 */
function deflatedTpk(files) {
  return buildZip(files.map((file) => ({ name: file.name, bytes: file.bytes, deflate: true })));
}

/** A `CMP1` standalone EXE (§13.1): an engine image, the ZIP, then the 12-byte trailer. */
function cmp1Exe(zip) {
  const prefix = new Uint8Array(64).fill(0x90);
  return appendCmp1(prefix, zip);
}

/** A Toolkit 2 launcher stub: an `MZ` image with no `CMP1` trailer (§13.1, L21). */
function tk2Stub() {
  const stub = new Uint8Array(100).fill(0x90);
  stub.set([0x4d, 0x5a], 0); // "MZ"
  stub[2] = 0x90;
  stub[3] = 0x00;
  return stub;
}

/** A self-extracting `zip.exe` shape: a PE-ish prefix followed by a ZIP, no trailer (§13.1, L21). */
function pePrefixedZip(zip) {
  const prefix = new Uint8Array(64).fill(0x90);
  prefix.set([0x4d, 0x5a], 0); // "MZ"
  return concat([prefix, zip]);
}

/** Every authored fixture, as `name -> bytes`, in a fixed order. */
export function authoredFixtures() {
  const files = projectFiles();
  const zip = tpk();
  return [
    ...Object.entries(AUTHORED),
    ["package.tpk", zip],
    ["package-deflated.tpk", deflatedTpk(files)],
    ["setup.zip", setupZip(files)],
    ["backslash.zip", backslashZip(files)],
    ["package-cmp1.exe", cmp1Exe(zip)],
    ["exe-tk2-stub.exe", tk2Stub()],
    ["exe-pe-zip.exe", pePrefixedZip(zip)],
  ];
}

/** Write every authored fixture under `out`, creating the folder. */
export function generate(out = defaultOut) {
  mkdirSync(out, { recursive: true });
  for (const [name, bytes] of authoredFixtures()) {
    writeFileSync(join(out, name), bytes);
  }
  return out;
}

/**
 * Re-run the generator in memory and compare with what is on disk. Returns the
 * list of mismatches (empty when the committed fixtures are byte-identical).
 */
export function check(out = defaultOut) {
  const problems = [];
  for (const [name, expected] of authoredFixtures()) {
    let actual;
    try {
      actual = readFileSync(join(out, name));
    } catch {
      problems.push(`${name}: missing`);
      continue;
    }
    if (actual.length !== expected.length) {
      problems.push(`${name}: ${actual.length} bytes on disk, ${expected.length} generated`);
      continue;
    }
    if (!actual.every((byte, index) => byte === expected[index])) {
      problems.push(`${name}: bytes differ from a fresh run`);
    }
  }
  return problems;
}

function main(argv) {
  let out = defaultOut;
  let checkOnly = false;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--out") out = resolve(argv[index + 1]);
    else if (argv[index] === "--check") checkOnly = true;
    else throw new Error(`unknown argument: ${argv[index]}`);
  }
  if (checkOnly) {
    const problems = check(out);
    for (const problem of problems) console.error(`generate.mjs: ${problem}`);
    if (problems.length > 0) return 1;
    console.log(`authored fixtures in ${out} match a fresh run`);
    return 0;
  }
  generate(out);
  console.log(`wrote ${authoredFixtures().length} authored fixtures to ${out}`);
  return 0;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
