// The distribution manifest reader of docs/spec/formats/packaging-and-paths.md (AD-6): `manifest.json`
// `{ schema, main, index }` at the archive root of a distribution package.
//
// The malformed fixtures are ZIPs built byte by byte here — a minimal store
// writer with a local CRC-32 — so each case pins exactly one rule the reader
// must report through `readDistributionManifest` (AD-18: a failure, never a
// throw). The round-trip case goes through the landed writer and the landed
// reader, so the shared validation cannot drift between the two.
import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import { TextEncoder } from "node:util";
import {
  loadPackage,
  MANIFEST_FILE_NAME,
  readDistributionManifest,
  writeDistributionPackage,
} from "../src/index.ts";
import type {
  DistributionManifest,
  FormatError,
  LoadedPackage,
  PackageFile,
  Result,
} from "../src/index.ts";

const encoder = new TextEncoder();

/** The bytes of a UTF-8 string. */
function bytesOf(text: string): Uint8Array {
  return encoder.encode(text);
}

/** The bytes of a JSON value. */
function jsonOf(value: unknown): Uint8Array {
  return bytesOf(JSON.stringify(value));
}

/** The CRC-32 of `bytes`, computed here so the fixture is independent of core. */
function crc32Of(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) !== 0 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Join byte arrays end to end. */
function concat(parts: readonly Uint8Array[]): Uint8Array {
  let length = 0;
  for (const part of parts) length += part.length;
  const joined = new Uint8Array(length);
  let at = 0;
  for (const part of parts) {
    joined.set(part, at);
    at += part.length;
  }
  return joined;
}

/** A little-endian 16-bit field. */
function le16(value: number): Uint8Array {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}

/** A little-endian 32-bit field. */
function le32(value: number): Uint8Array {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]);
}

/**
 * A valid DEFLATE stream of `data`, using stored (uncompressed) blocks: 5 header
 * bytes per 65,535-byte block, so the fixture needs no compressor.
 */
function storedDeflate(data: Uint8Array): Uint8Array {
  const blocks: Uint8Array[] = [];
  let offset = 0;
  do {
    const length = Math.min(0xffff, data.length - offset);
    const final = offset + length >= data.length;
    blocks.push(new Uint8Array([final ? 1 : 0]));
    blocks.push(le16(length));
    blocks.push(le16(~length & 0xffff));
    blocks.push(data.subarray(offset, offset + length));
    offset += length;
  } while (offset < data.length);
  return concat(blocks);
}

/** One entry of a fixture ZIP. */
interface ZipSpec {
  readonly name: string;
  /** The entry's content; its length and CRC-32 are the header values. */
  readonly content?: Uint8Array;
  /** The bytes actually stored (default: `content`, or its DEFLATE stream). */
  readonly body?: Uint8Array;
  readonly method?: number;
  readonly flags?: number;
}

/** Build a ZIP archive from `specs` (docs/spec/formats/packaging-and-paths.md; PKZIP APPNOTE 4.3). */
function buildZip(specs: readonly ZipSpec[]): Uint8Array {
  const locals: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;
  for (const spec of specs) {
    const name = bytesOf(spec.name);
    const content = spec.content ?? new Uint8Array(0);
    const method = spec.method ?? 0;
    const body = spec.body ?? (method === 8 ? storedDeflate(content) : content);
    const flags = spec.flags ?? 0;
    const localHeader = concat([
      le32(0x04034b50),
      le16(20),
      le16(flags),
      le16(method),
      le16(0),
      le16(0),
      le32(crc32Of(content)),
      le32(body.length),
      le32(content.length),
      le16(name.length),
      le16(0),
    ]);
    const localWhole = concat([localHeader, name, body]);
    centralParts.push(
      concat([
        le32(0x02014b50),
        le16(20),
        le16(20),
        le16(flags),
        le16(method),
        le16(0),
        le16(0),
        le32(crc32Of(content)),
        le32(body.length),
        le32(content.length),
        le16(name.length),
        le16(0),
        le16(0),
        le16(0),
        le16(0),
        le32(0),
        le32(localOffset),
        name,
      ]),
    );
    locals.push(localWhole);
    localOffset += localWhole.length;
  }
  const centralDirectory = concat(centralParts);
  const eocd = concat([
    le32(0x06054b50),
    le16(0),
    le16(0),
    le16(specs.length),
    le16(specs.length),
    le32(centralDirectory.length),
    le32(localOffset),
    le16(0),
  ]);
  return concat([...locals, centralDirectory, eocd]);
}

/** Unwrap a result the test expects to succeed. */
function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`expected ok, got: ${result.error.message}`);
  }
  return result.value;
}

/** Load a `.tpk` fixture. */
function load(bytes: Uint8Array): LoadedPackage {
  return unwrap(loadPackage({ kind: "tpk", name: "game.tpk", bytes }));
}

/** The two game files every malformed fixture builds on. */
const GAME: readonly ZipSpec[] = [
  { name: "Main/demo.gam", content: bytesOf("RPGTLKIT MAIN demo") },
  { name: "Boards/inn.brd", content: bytesOf("board bytes for the inn") },
];

/** The paths of `GAME`, the index a well-formed manifest would list. */
const ALL = ["Main/demo.gam", "Boards/inn.brd"];

/** The two game files plus one `manifest.json` holding `manifestBytes`. */
function withManifest(manifestBytes: Uint8Array, at = MANIFEST_FILE_NAME): readonly ZipSpec[] {
  return [...GAME, { name: at, content: manifestBytes }];
}

/** Read the manifest of a `.tpk` fixture, expecting the test's own unwrap. */
function read(bytes: Uint8Array): Result<DistributionManifest> {
  return readDistributionManifest(load(bytes));
}

/** Assert a read failed, citing docs/spec/formats/packaging-and-paths.md and naming `rule`, and return the failure. */
function readFailure(bytes: Uint8Array, rule: string): FormatError {
  const result = read(bytes);
  if (result.ok) {
    throw new Error(`expected a failure naming ${rule}`);
  }
  equal(result.error.section, "docs/spec/formats/packaging-and-paths.md");
  equal(result.error.message.includes(rule), true, `"${result.error.message}" should name ${rule}`);
  return result.error;
}

/** The writer's asset tree. */
const FILES: readonly PackageFile[] = [
  { path: "Main/demo.gam", bytes: bytesOf("RPGTLKIT MAIN demo") },
  { path: "Boards/inn.brd", bytes: bytesOf("the inn") },
  { path: "Tiles/default.tst", bytes: new Uint8Array([0x54, 0x53, 0x45, 0x54]) },
];

/** The manifest the writer writes and the reader must return. */
const MANIFEST: DistributionManifest = {
  schema: 3,
  main: "Main/demo.gam",
  index: FILES.map((file) => file.path),
};

test("a written package's manifest reads back deep-equal to the input", () => {
  const bytes = unwrap(writeDistributionPackage({ files: FILES, manifest: MANIFEST }));
  const manifest = unwrap(readDistributionManifest(load(bytes)));
  // The writer puts `index` in code-unit order (plain `sort()` on strings), not
  // the caller's, so a manifest is byte-identical however the caller ordered it.
  deepEqual(manifest, { ...MANIFEST, index: [...MANIFEST.index].sort() });
});

test("a package with no manifest.json fails naming the missing manifest", () => {
  const result = read(buildZip(GAME));
  if (result.ok) throw new Error("expected a failure");
  equal(result.error.section, "docs/spec/formats/packaging-and-paths.md");
  equal(result.error.message.includes(`no ${MANIFEST_FILE_NAME}`), true, result.error.message);
});

test("a manifest below the archive root is not found", () => {
  // The lookup is rooted: a nested manifest.json is not the package's manifest.
  const result = read(buildZip(withManifest(jsonOf({ schema: 1, main: ALL[0], index: ALL }), "Sub/manifest.json")));
  if (result.ok) throw new Error("expected a failure");
  equal(result.error.message.includes(`no ${MANIFEST_FILE_NAME}`), true, result.error.message);
});

test("the manifest is found case-insensitively at the root", () => {
  const bytes = buildZip(withManifest(jsonOf({ schema: 1, main: ALL[0], index: ALL }), "Manifest.JSON"));
  deepEqual(unwrap(read(bytes)), { schema: 1, main: ALL[0], index: ALL });
});

interface MalformedCase {
  readonly name: string;
  readonly bytes: Uint8Array;
  /** The rule the failure must name. */
  readonly rule: string;
}

const MALFORMED: readonly MalformedCase[] = [
  {
    name: "invalid JSON",
    bytes: buildZip(withManifest(bytesOf("{ not json"))),
    rule: "manifest JSON",
  },
  {
    name: "a JSON array",
    bytes: buildZip(withManifest(jsonOf([]))),
    rule: "manifest shape",
  },
  {
    name: "null",
    bytes: buildZip(withManifest(bytesOf("null"))),
    rule: "manifest shape",
  },
  {
    name: "a number",
    bytes: buildZip(withManifest(bytesOf("42"))),
    rule: "manifest shape",
  },
  {
    name: "a missing key",
    bytes: buildZip(withManifest(jsonOf({ schema: 1, main: ALL[0] }))),
    rule: '"index"',
  },
  {
    name: "an extra key",
    bytes: buildZip(withManifest(jsonOf({ schema: 1, main: ALL[0], index: ALL, extra: true }))),
    rule: '"extra"',
  },
  {
    name: "an own __proto__ key",
    bytes: buildZip(
      withManifest(bytesOf(`{"schema":1,"main":"${ALL[0]}","index":${JSON.stringify(ALL)},"__proto__":{"x":1}}`)),
    ),
    rule: '"__proto__"',
  },
  {
    name: "schema -1",
    bytes: buildZip(withManifest(jsonOf({ schema: -1, main: ALL[0], index: ALL }))),
    rule: "project schema",
  },
  {
    name: "schema 1.5",
    bytes: buildZip(withManifest(jsonOf({ schema: 1.5, main: ALL[0], index: ALL }))),
    rule: "project schema",
  },
  {
    name: 'schema "1"',
    bytes: buildZip(withManifest(jsonOf({ schema: "1", main: ALL[0], index: ALL }))),
    rule: "project schema",
  },
  {
    name: "main absent from the archive",
    bytes: buildZip(withManifest(jsonOf({ schema: 1, main: "Main/other.gam", index: ALL }))),
    rule: "manifest main",
  },
  {
    name: "main equal to manifest.json",
    bytes: buildZip(withManifest(jsonOf({ schema: 1, main: MANIFEST_FILE_NAME, index: ALL }))),
    rule: "manifest main",
  },
  {
    name: "an index entry not in the archive",
    bytes: buildZip(withManifest(jsonOf({ schema: 1, main: ALL[0], index: [...ALL, "Tiles/x.tst"] }))),
    rule: "asset index",
  },
  {
    name: "a game file missing from the index",
    bytes: buildZip(withManifest(jsonOf({ schema: 1, main: ALL[0], index: [ALL[0]] }))),
    rule: "asset index",
  },
  {
    name: "a duplicate index entry after case folding",
    bytes: buildZip(withManifest(jsonOf({ schema: 1, main: ALL[0], index: [ALL[0], ALL[1], "boards/INN.BRD"] }))),
    rule: "L10",
  },
  {
    name: "non-UTF-8 bytes",
    bytes: buildZip(withManifest(new Uint8Array([0xff, 0xfe, 0x41]))),
    rule: "manifest JSON",
  },
];

for (const testCase of MALFORMED) {
  test(`a manifest that is ${testCase.name} fails naming the rule`, () => {
    readFailure(testCase.bytes, testCase.rule);
  });
}

test("an own __proto__ key never changes a prototype", () => {
  readFailure(
    buildZip(
      withManifest(bytesOf(`{"schema":1,"main":"${ALL[0]}","index":${JSON.stringify(ALL)},"__proto__":{"x":1}}`)),
    ),
    '"__proto__"',
  );
  equal(({} as Record<string, unknown>).x, undefined);
  equal(Object.getPrototypeOf({}), Object.prototype);
});
