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
//     only at detail 1, 2 and 3, so detail 4/5/6 have no real sample anywhere.
//   * an isometric `.iso` (§3.1, §3.3) — no real `.iso` (version 30, detail 150)
//     exists in the archive.
//   * a `.tpk`, a Setup ZIP (§13.1 `Main/` + `Game/`), a backslash-separated
//     project ZIP, a `CMP1` standalone EXE (§13.1) and two negative EXE stubs
//     (a Toolkit 2 launcher with no trailer, and a self-extracting `zip.exe`
//     shape: a PE-ish prefix followed by a ZIP with no trailer). No sample
//     package was ever shipped, so none of these has real evidence either.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { appendCmp1, ascii, buildZip, concat, le16, le32 } from "./zip.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..", "..");
const defaultOut = join(repoRoot, "packages", "core", "test", "fixtures", "authored");

/**
 * One tileset of §3.1: the 6-byte header (`i16 version`, `i16 tileCount`,
 * `i16 detail`) then tightly packed column-major pixels. `pixel(k)` returns the
 * stored bytes of the k-th stored pixel, so a fixture's content is a closed-form
 * function the tests can reproduce.
 */
function tileset(version, detail, size, bytesPerPixel, pixel) {
  const count = 1;
  const pixels = new Uint8Array(size * size * bytesPerPixel);
  for (let k = 0; k < size * size; k += 1) {
    const at = k * bytesPerPixel;
    if (bytesPerPixel === 3) {
      const [r, g, b] = pixel(k);
      pixels[at] = r;
      pixels[at + 1] = g;
      pixels[at + 2] = b;
    } else {
      pixels[at] = pixel(k);
    }
  }
  return concat([le16(version), le16(count), le16(detail), pixels]);
}

/** An 8-bit palette pixel: the stored index is `k mod 256`, so index 255 (the transparent key) appears once. */
const palettePixel = (k) => k & 0xff;

/** A 24-bit pixel that never hits the transparent key R=0, G=1, B=2 (§3.1). */
const rgbPixel = (k) => [k & 0xff, (k >> 8) & 0xff, 7];

const AUTHORED = {
  "detail4.tst": tileset(20, 4, 16, 1, palettePixel),
  "detail5.tst": tileset(20, 5, 32, 1, palettePixel),
  "detail6.tst": tileset(20, 6, 16, 1, palettePixel),
  "iso.iso": tileset(30, 150, 32, 3, rgbPixel),
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
