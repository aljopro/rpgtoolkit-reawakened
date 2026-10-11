// The `dump` subcommand: the extension → reader dispatch, the skip-vs-fail
// classification, the deterministic ordering and digests of the JSON report,
// and the corpus expectation's record/check round trip.
//
// The report and digest cases run in memory (`PackageFile`s, no file system);
// the exit codes, the folder walk and the expectation file go through the real
// CLI in a temp directory. A valid PNG is built here with `node:zlib` so the
// image path is exercised end to end.
import { equal, notEqual, deepEqual, ok } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import {
  writeAnimation,
  writeTileset,
  type Animation,
  type PackageFile,
  type Result,
  type Tileset,
} from "@rpgtoolkit/core";
import { main } from "../src/index.ts";
import { digestModel, digestRgba } from "../src/dump/digest.ts";
import { boardLayout, classify, type DataFormatId } from "../src/dump/formats.ts";
import {
  buildExpectation,
  compareGame,
  driftLines,
  parseExpectation,
  serializeExpectation,
  toExpectationGame,
  type ExpectationGame,
} from "../src/dump/expectation.ts";
import { buildReport, digestsOf, serializeReport, type DumpEntry } from "../src/dump/report.ts";

const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CLI_PATH = join(PACKAGE_ROOT, "dist/cli.js");

function runCli(args: string[]) {
  const result = spawnSync(process.execPath, [CLI_PATH, ...args], { encoding: "utf8" });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

/** A reader/writer result the test expects to succeed. */
function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`expected ok, got: ${result.error.message}`);
  }
  return result.value;
}

// ------------------------------------------------------------- test fixtures

const ANIMATION: Animation = {
  magic: "RPGTLKIT ANIM",
  major: 2,
  minor: 3,
  width: 32,
  height: 32,
  frames: [
    { image: "man_s.tst1", transparent: { r: 0, g: 0, b: 0 }, sound: "" },
    { image: "", transparent: { r: 0, g: 0, b: 0 }, sound: "die.wav" },
  ],
  delay: 0.15,
};

const ANIMATION_BYTES = unwrap(writeAnimation(ANIMATION));

const TILESET: Tileset = {
  version: 20,
  detail: { code: 1, size: 32, bytesPerPixel: 3, isometric: false },
  tiles: [{ pixels: new Uint8Array(32 * 32 * 3) }, { pixels: new Uint8Array(32 * 32 * 3).fill(7) }],
  residue: new Uint8Array(0),
};

const TILESET_BYTES = unwrap(writeTileset(TILESET));

/** The ASCII bytes of a literal, for a text `.prg` and a truncated board header. */
function asciiBytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) {
    out[index] = text.charCodeAt(index);
  }
  return out;
}

const PRG_TEXT = asciiBytes("walk()\nwait(5)\n");

/** The PNG CRC-32 (PNG spec §5.5), so the test needs no zlib version beyond `deflateSync`. */
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** One big-endian PNG chunk: length, type, payload, CRC over type+payload. */
function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let index = 0; index < 4; index += 1) {
    out[4 + index] = type.charCodeAt(index);
  }
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** A 1×1 RGB PNG of the given pixel, built with `deflateSync` (a zlib stream). */
function onePixelPng(red: number, green: number, blue: number): Uint8Array {
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, 1);
  view.setUint32(4, 1);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  const idat = deflateSync(new Uint8Array([0, red, green, blue]));
  return concat([PNG_SIGNATURE, pngChunk("IHDR", ihdr), pngChunk("IDAT", idat), pngChunk("IEND", new Uint8Array(0))]);
}

const PIXEL_PNG = onePixelPng(200, 100, 50);
const PIXEL_RGBA = new Uint8Array([200, 100, 50, 255]);

/** A board file truncated just after its magic, so `readBoard` reports a located EOF. */
const TRUNCATED_BOARD = asciiBytes("RPGTLKIT BOARD\0");

const FILES: readonly PackageFile[] = [
  { path: "Prg/main.prg", bytes: PRG_TEXT },
  { path: "walk.anm", bytes: ANIMATION_BYTES },
  { path: "Tiles/base.tst", bytes: TILESET_BYTES },
  { path: "pic.png", bytes: PIXEL_PNG },
  { path: "Media/song.mid", bytes: new Uint8Array([1, 2, 3]) },
  { path: "Boards/broken.brd", bytes: TRUNCATED_BOARD },
  { path: "Plugin/tk3fight.dll", bytes: new Uint8Array([4, 5]) },
  { path: "readme.zzz", bytes: new Uint8Array(0) },
];

/** Write the same corpus to a temp project folder, optionally with the broken board. */
function createProject(options?: { brokenBoard?: boolean; extra?: ReadonlyArray<readonly [string, Uint8Array]> }): {
  root: string;
  cleanup: () => void;
} {
  const root = mkdtempSync(join(tmpdir(), "rpg-dump-test-"));
  const written: ReadonlyArray<readonly [string, Uint8Array]> = [
    ...FILES.filter((file) => options?.brokenBoard === true || file.path !== "Boards/broken.brd").map(
      (file) => [file.path, file.bytes] as const,
    ),
    ...(options?.extra ?? []),
  ];
  for (const [path, bytes] of written) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, bytes);
  }
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

// ------------------------------------------------------------------ dispatch

/** Every data extension and the reader it must reach. */
const DISPATCH: ReadonlyArray<readonly [string, DataFormatId, string]> = [
  ["Main/demo.gam", "gam", "format-spec §2"],
  ["Boards/start.brd", "board", "format-spec §4"],
  ["Tiles/base.tst", "tileset", "format-spec §3.1"],
  ["Tiles/iso.iso", "tileset", "format-spec §3.1"],
  ["Misc/man/man_s.anm", "animation", "format-spec §7.1"],
  ["Chrs/start.tem", "character", "format-spec §6.1"],
  ["Item/man.itm", "item", "format-spec §6.2"],
  ["Enemy/pirate.ene", "enemy", "format-spec §6.3"],
  ["Bkrounds/bkg.bkg", "battle-background", "format-spec §8.3"],
  ["SpcMove/fire.spc", "special-move", "format-spec §8.1"],
  ["StatusE/poison.ste", "status-effect", "format-spec §8.2"],
  ["Bitmap/layout.png", "image", "format-spec §10"],
  ["Bitmap/bkg.jpg", "image", "format-spec §10"],
  ["Bitmap/bkg.jpeg", "image", "format-spec §10"],
  ["Bitmap/old.bmp", "image", "format-spec §10"],
  ["Bitmap/anim.gif", "image", "format-spec §10"],
];

test("classify sends every data extension to the reader its section names", () => {
  for (const [path, format, section] of DISPATCH) {
    const cls = classify(path);
    equal(cls.kind, "data", path);
    if (cls.kind !== "data") continue;
    equal(cls.format, format, path);
    equal(cls.section, section, path);
  }
});

test("classify is case-insensitive, so the legacy uppercase names land on the same row", () => {
  const upper = classify("Media/VIP - Village1.MID");
  const lower = classify("Media/village1.mid");
  equal(upper.kind, "skip");
  equal(lower.kind, "skip");
  if (upper.kind === "skip" && lower.kind === "skip") {
    equal(upper.reason, lower.reason);
  }
  const bmp = classify("Bitmap/OLD.BMP");
  equal(bmp.kind, "data");
  if (bmp.kind === "data") {
    equal(bmp.format, "image");
  }
});

test("classify skips the non-format, media and plugin files with a reason", () => {
  for (const path of ["Prg/start.prg", "Media/song.mid", "Media/die.wav", "readme.txt", "Plugin/tk3.dll", "readme.zzz", "LICENSE"]) {
    const cls = classify(path);
    equal(cls.kind, "skip", path);
    if (cls.kind === "skip") {
      ok(cls.reason.length > 0, path);
    }
  }
  const prg = classify("Prg/start.prg");
  ok(prg.kind === "skip" && prg.reason.includes("format-spec §9"), "the .prg reason cites §9");
  const unknown = classify("readme.zzz");
  ok(unknown.kind === "skip" && unknown.reason.includes("unrecognised"), "an unknown extension says so");
});

test("the .prg skip reports size and line count, not just a reason", () => {
  const cls = classify("Prg/main.prg");
  ok(cls.kind === "skip");
  if (cls.kind !== "skip") return;
  equal(cls.describe?.(PRG_TEXT), "15 bytes, 2 lines");
  equal(cls.describe?.(new Uint8Array(0)), "0 bytes, 0 lines");
  equal(cls.describe?.(new Uint8Array([0x61])), "1 bytes, 1 lines");
});

test("boardLayout picks the §4.1 branch a stored minor takes", () => {
  equal(boardLayout(0), "obsolete");
  equal(boardLayout(1), "obsolete");
  equal(boardLayout(2), "pre-vector");
  equal(boardLayout(3), "pre-vector");
  equal(boardLayout(4), "vector");
  equal(boardLayout(9), "vector");
});

// -------------------------------------------------------------- digest values

test("digestModel is stable, key-order independent and field sensitive", () => {
  const first = { a: 1, bytes: new Uint8Array([1, 2]), nested: { d: "x" } };
  const reordered = { nested: { d: "x" }, bytes: new Uint8Array([1, 2]), a: 1 };
  equal(digestModel(first), digestModel(reordered));
  notEqual(digestModel(first), digestModel({ a: 2, bytes: new Uint8Array([1, 2]), nested: { d: "x" } }));
  notEqual(digestModel(first), digestModel({ a: 1, bytes: new Uint8Array([1, 3]), nested: { d: "x" } }));
  notEqual(digestModel(first), digestModel({ a: 1, bytes: new Uint8Array([1, 2]), nested: { d: "y" } }));
});

test("digestModel drops undefined fields, which a reader's optional model fields are", () => {
  equal(digestModel({ a: 1, absent: undefined }), digestModel({ a: 1 }));
  equal(digestModel({ a: 1, list: [1, undefined, 2] }), digestModel({ a: 1, list: [1, null, 2] }));
});

test("digestRgba hashes the decoded bytes", () => {
  equal(digestRgba(PIXEL_RGBA), digestRgba(new Uint8Array([200, 100, 50, 255])));
  notEqual(digestRgba(PIXEL_RGBA), digestRgba(new Uint8Array([200, 100, 50, 254])));
});

// ------------------------------------------------------------ the report

test("buildReport classifies each file, digests the parsed ones and counts the rest", () => {
  const report = buildReport(FILES);
  deepEqual(report.counts, { parsed: 3, skipped: 4, failed: 1 });

  const byPath: { [path: string]: DumpEntry } = Object.fromEntries(
    report.files.map((entry) => [entry.path, entry] as const),
  );
  equal(byPath["walk.anm"]?.status, "parsed");
  equal(byPath["Tiles/base.tst"]?.status, "parsed");
  equal(byPath["pic.png"]?.status, "parsed");
  equal(byPath["Prg/main.prg"]?.status, "skipped");
  equal(byPath["Media/song.mid"]?.status, "skipped");
  equal(byPath["Plugin/tk3fight.dll"]?.status, "skipped");
  equal(byPath["readme.zzz"]?.status, "skipped");
  equal(byPath["Boards/broken.brd"]?.status, "failed");

  const broken = byPath["Boards/broken.brd"];
  ok(broken !== undefined && broken.status === "failed");
  if (broken?.status === "failed") {
    ok(broken.error.section.includes("format-spec §"), broken.error.section);
    equal(broken.format, "board");
    ok(broken.error.offset >= 0);
  }

  const prg = byPath["Prg/main.prg"];
  ok(prg !== undefined && prg.status === "skipped" && prg.reason.includes("2 lines"));

  // The image digest is the decoded RGBA's, and the summary carries the dimensions.
  const image = byPath["pic.png"];
  ok(image !== undefined && image.status === "parsed");
  if (image?.status === "parsed") {
    equal(image.digest, digestRgba(PIXEL_RGBA));
    ok(image.summary.includes("1×1"), image.summary);
    equal(image.format, "image");
  }

  const animation = byPath["walk.anm"];
  ok(animation !== undefined && animation.status === "parsed");
  if (animation?.status === "parsed") {
    equal(animation.digest, digestModel(ANIMATION));
    ok(animation.summary.includes("2 frame slots"), animation.summary);
  }
});

test("buildReport orders files by path and serialises byte-identically every time", () => {
  const first = buildReport(FILES);
  const second = buildReport([...FILES].reverse());
  equal(serializeReport(first), serializeReport(second));

  const paths = first.files.map((entry) => entry.path);
  deepEqual(paths, [...paths].sort());

  const parsed = JSON.parse(serializeReport(first)) as {
    schema: number;
    counts: { parsed: number };
    files: ReadonlyArray<{ path: string; status: string }>;
  };
  equal(parsed.schema, 1);
  equal(parsed.counts.parsed, 3);
  equal(parsed.files.length, FILES.length);
  equal(parsed.files[0]?.path, "Boards/broken.brd");
});

test("digestsOf keeps only the parsed files", () => {
  deepEqual(Object.keys(digestsOf(buildReport(FILES))).sort(), ["Tiles/base.tst", "pic.png", "walk.anm"]);
});

// ------------------------------------------------------------ the expectation

test("the expectation round-trips through its committed form", () => {
  const report = buildReport(FILES);
  const expectation = buildExpectation({ sample: toExpectationGame(report) });
  const text = serializeExpectation(expectation);
  const parsed = parseExpectation(text, "expectation.json");
  deepEqual(parsed.games, expectation.games);
  equal(serializeExpectation(parsed), text);
});

test("compareGame and driftLines name the file that drifted, went missing or is new", () => {
  const report = buildReport(FILES);
  const expected = toExpectationGame(report);
  deepEqual(driftLines(compareGame("sample", expected, report)), []);

  const drifted: ExpectationGame = {
    counts: expected.counts,
    digests: { ...expected.digests, "walk.anm": "0000000000000000", "ghost.anm": "1111111111111111" },
  };
  const lines = driftLines(compareGame("sample", drifted, report));
  ok(lines.some((line) => line.includes("walk.anm") && line.includes("differs")), lines.join("\n"));
  ok(lines.some((line) => line.includes("ghost.anm") && line.includes("missing")), lines.join("\n"));

  const withoutAnimation: ExpectationGame = {
    counts: expected.counts,
    digests: Object.fromEntries(Object.entries(expected.digests).filter(([path]) => path !== "walk.anm")),
  };
  const extra = driftLines(compareGame("sample", withoutAnimation, report));
  ok(extra.some((line) => line.includes("walk.anm") && line.includes("does not list it")), extra.join("\n"));
});

test("parseExpectation refuses a malformed expectation, naming the file", () => {
  for (const [text, pattern] of [
    ["not json", /not JSON/],
    ["{}", /schema must be 1/],
    ['{"schema":1,"games":{"x":{"counts":{"parsed":0,"skipped":0,"failed":0},"digests":{"a.brd":"zz"}}}}', /16-hex digest/],
    ['{"schema":1,"games":[]}', /games must be an object/],
  ] as ReadonlyArray<readonly [string, RegExp]>) {
    let caught: unknown;
    try {
      parseExpectation(text, "expectation.json");
    } catch (cause) {
      caught = cause;
    }
    ok(caught instanceof Error, `expected a throw for ${text}`);
    ok(pattern.test(caught.message), caught.message);
    ok(caught.message.includes("expectation.json"));
  }
});

// ------------------------------------------------------------------ the CLI

test("dump on a clean project exits 0 and prints a line per file plus the counts", () => {
  const project = createProject();
  try {
    const result = runCli(["dump", project.root]);
    equal(result.status, 0, result.stderr);
    ok(result.stdout.includes("walk.anm  animation"), result.stdout);
    ok(result.stdout.includes("pic.png  image  image png 1×1"));
    ok(result.stdout.includes("Prg/main.prg  skipped"));
    ok(result.stdout.includes("3 parsed, 4 skipped, 0 failed"));
  } finally {
    project.cleanup();
  }
});

test("a data file that fails to parse exits non-zero and names the file and the error", () => {
  const project = createProject({ brokenBoard: true });
  try {
    const result = runCli(["dump", project.root]);
    equal(result.status, 1);
    ok(result.stdout.includes("Boards/broken.brd  FAILED"), result.stdout);
    ok(result.stdout.includes("format-spec §"), result.stdout);
    ok(result.stdout.includes("offset"), result.stdout);
    ok(result.stdout.includes("3 parsed, 4 skipped, 1 failed"));
  } finally {
    project.cleanup();
  }
});

test("dump --json is byte-identical across runs and carries the counts", () => {
  const clean = createProject();
  const broken = createProject({ brokenBoard: true });
  try {
    const first = runCli(["dump", "--json", clean.root]);
    const second = runCli(["dump", "--json", clean.root]);
    equal(first.status, 0, first.stderr);
    equal(first.stdout, second.stdout);

    const report = JSON.parse(first.stdout) as {
      schema: number;
      counts: { parsed: number; skipped: number; failed: number };
      files: ReadonlyArray<{ path: string; status: string; digest?: string }>;
    };
    equal(report.schema, 1);
    deepEqual(report.counts, { parsed: 3, skipped: 4, failed: 0 });
    equal(report.files.length, 7);
    const animation = report.files.find((file) => file.path === "walk.anm");
    equal(animation?.digest, digestModel(ANIMATION));

    // A failure still prints the whole report, and the exit code carries the verdict.
    const failing = runCli(["dump", "--json", broken.root]);
    equal(failing.status, 1);
    const parsed = JSON.parse(failing.stdout) as { counts: { failed: number } };
    equal(parsed.counts.failed, 1);
  } finally {
    clean.cleanup();
    broken.cleanup();
  }
});

test("dump --record then --check round-trips, and a drifted digest fails naming the file", () => {
  const games = mkdtempSync(join(tmpdir(), "rpg-dump-games-"));
  const game = join(games, "alpha");
  try {
    for (const [path, bytes] of [
      ["walk.anm", ANIMATION_BYTES],
      ["Tiles/base.tst", TILESET_BYTES],
      ["Media/song.mid", new Uint8Array([1, 2, 3])],
    ] as ReadonlyArray<readonly [string, Uint8Array]>) {
      const target = join(game, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, bytes);
    }

    const expectationPath = join(games, "expectation.json");
    const recorded = runCli(["dump", "--record", expectationPath, games]);
    equal(recorded.status, 0, recorded.stderr);

    const checked = runCli(["dump", "--check", expectationPath, games]);
    equal(checked.status, 0, checked.stderr);
    ok(checked.stdout.includes("alpha: 2 parsed, 1 skipped, 0 failed, 2 digests match"), checked.stdout);

    writeFileSync(join(game, "walk.anm"), unwrap(writeAnimation({ ...ANIMATION, delay: 0.5 })));
    const drifted = runCli(["dump", "--check", expectationPath, games]);
    equal(drifted.status, 1);
    ok(drifted.stderr.includes("alpha: walk.anm"), drifted.stderr);
    ok(drifted.stderr.includes("differs"), drifted.stderr);
  } finally {
    rmSync(games, { recursive: true, force: true });
  }
});

test("dump --record refuses a corpus that does not parse", () => {
  const games = mkdtempSync(join(tmpdir(), "rpg-dump-games-"));
  const game = join(games, "broken");
  try {
    mkdirSync(join(game, "Boards"), { recursive: true });
    writeFileSync(join(game, "Boards/broken.brd"), TRUNCATED_BOARD);
    const result = runCli(["dump", "--record", join(games, "expectation.json"), games]);
    equal(result.status, 1);
    ok(result.stderr.includes("refusing to record"), result.stderr);
    ok(result.stderr.includes("Boards/broken.brd"), result.stderr);
  } finally {
    rmSync(games, { recursive: true, force: true });
  }
});

test("a symbolic link in a project folder is refused, never followed", () => {
  const project = createProject();
  try {
    symlinkSync(join(project.root, "walk.anm"), join(project.root, "linked.anm"));
    const result = runCli(["dump", project.root]);
    equal(result.status, 1);
    ok(result.stderr.includes("symbolic link"), result.stderr);
  } finally {
    project.cleanup();
  }
});

test("a plain file that is not a package is refused with the three accepted forms", () => {
  const project = createProject();
  try {
    const result = runCli(["dump", join(project.root, "walk.anm")]);
    equal(result.status, 1);
    ok(result.stderr.includes("not a project folder, a .tpk or a .exe"), result.stderr);
  } finally {
    project.cleanup();
  }
});

test("dump usage errors exit 1 with a named message", () => {
  const cases: ReadonlyArray<readonly [string[], RegExp]> = [
    [["dump"], /missing path/],
    [["dump", "--nope"], /unknown flag: --nope/],
    [["dump", "one", "two"], /unexpected argument 'two'/],
    [["dump", "--check"], /--check needs a file/],
    [["dump", "--check", "e.json", "--record", "r.json", "games"], /cannot be combined/],
    [["dump", "--json", "--check", "e.json", "games"], /--json is for a single project/],
  ];
  for (const [args, pattern] of cases) {
    const result = runCli(args);
    equal(result.status, 1, args.join(" "));
    ok(pattern.test(result.stderr), `${args.join(" ")}: ${result.stderr}`);
  }

  equal(main(["dump"]), 1);
  equal(main(["dump", "--nope"]), 1);
});
