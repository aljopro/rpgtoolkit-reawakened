// The package loader of format-spec §13 (AD-6): a loose folder, a `.tpk` ZIP
// archive and a standalone EXE whose `CMP1` trailer points at an appended ZIP
// all load to the same asset tree, under one exported set of untrusted-input
// limits (AD-17).
//
// The ZIPs are built here, byte by byte: a minimal store/deflate writer, a
// store-mode DEFLATE stream (so no compressor is involved), and a local CRC-32.
// Malformed fixtures patch single header fields, so each test pins one rule.
import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import { TextEncoder } from "node:util";
import {
  loadPackage,
  PACKAGE_LIMITS,
  PACKAGE_ROOT,
  readAppendedZip,
  resolveAsset,
} from "../src/index.ts";
import type { FolderEntry, FormatError, LoadedPackage, Result } from "../src/index.ts";

const encoder = new TextEncoder();

/** The bytes of an ASCII string. */
function bytesOf(text: string): Uint8Array {
  return encoder.encode(text);
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
  return new Uint8Array([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ]);
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

/** The header fields a fixture may patch in one header. */
interface HeaderPatch {
  readonly flags?: number;
  readonly method?: number;
  readonly crc?: number;
  readonly compressedSize?: number;
  readonly uncompressedSize?: number;
  readonly externalAttributes?: number;
}

/** One entry of a fixture ZIP. */
interface ZipSpec {
  readonly name: string;
  /** The real content; its length and CRC-32 are the default header values. */
  readonly content?: Uint8Array;
  /** The bytes actually stored (default: `content`, or its DEFLATE stream). */
  readonly body?: Uint8Array;
  readonly method?: number;
  readonly flags?: number;
  readonly crc?: number;
  readonly compressedSize?: number;
  readonly uncompressedSize?: number;
  readonly local?: HeaderPatch;
  readonly central?: HeaderPatch;
}

/** Fields of the end-of-central-directory record a fixture may patch. */
interface ZipOptions {
  readonly totalEntries?: number;
  readonly cdOffset?: number;
  readonly cdSize?: number;
}

/** Build a ZIP archive from `specs` (format-spec §13; PKZIP APPNOTE 4.3). */
function buildZip(specs: readonly ZipSpec[], options: ZipOptions = {}): Uint8Array {
  const locals: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;
  for (const spec of specs) {
    const name = bytesOf(spec.name);
    const content = spec.content ?? new Uint8Array(0);
    const method = spec.method ?? 0;
    const body = spec.body ?? (method === 8 ? storedDeflate(content) : content);
    const crc = spec.crc ?? crc32Of(content);
    const compressedSize = spec.compressedSize ?? body.length;
    const uncompressedSize = spec.uncompressedSize ?? content.length;
    const flags = spec.flags ?? 0;
    const local = spec.local ?? {};
    const central = spec.central ?? {};
    const localHeader = concat([
      le32(0x04034b50),
      le16(20),
      le16(local.flags ?? flags),
      le16(local.method ?? method),
      le16(0),
      le16(0),
      le32(local.crc ?? crc),
      le32(local.compressedSize ?? compressedSize),
      le32(local.uncompressedSize ?? uncompressedSize),
      le16(name.length),
      le16(0),
    ]);
    const localWhole = concat([localHeader, name, body]);
    const centralHeader = concat([
      le32(0x02014b50),
      le16(20),
      le16(20),
      le16(central.flags ?? flags),
      le16(central.method ?? method),
      le16(0),
      le16(0),
      le32(central.crc ?? crc),
      le32(central.compressedSize ?? compressedSize),
      le32(central.uncompressedSize ?? uncompressedSize),
      le16(name.length),
      le16(0),
      le16(0),
      le16(0),
      le16(0),
      le32(central.externalAttributes ?? 0),
      le32(localOffset),
    ]);
    centralParts.push(concat([centralHeader, name]));
    locals.push(localWhole);
    localOffset += localWhole.length;
  }
  const centralDirectory = concat(centralParts);
  const totalEntries = options.totalEntries ?? specs.length;
  const eocd = concat([
    le32(0x06054b50),
    le16(0),
    le16(0),
    le16(totalEntries),
    le16(totalEntries),
    le32(options.cdSize ?? centralDirectory.length),
    le32(options.cdOffset ?? localOffset),
    le16(0),
  ]);
  return concat([...locals, centralDirectory, eocd]);
}

/** The `CMP1` marker of §13's trailer. */
const CMP1 = new Uint8Array([0x43, 0x4d, 0x50, 0x31]);

/** A game as a ZIP: both methods, a subfolder and a nested archive (L14). */
const GAME: readonly ZipSpec[] = [
  { name: "main.gam", content: bytesOf("RPGTLKIT MAIN demo"), method: 0 },
  { name: "Boards/inn.brd", content: bytesOf("board bytes for the inn"), method: 8 },
  { name: "boards/Village/Shop.BRD", content: bytesOf("the shop"), method: 8 },
  { name: "Tiles/default.tst", content: bytesOf("tileset bytes"), method: 0 },
  { name: "Item/npc.itm", content: bytesOf("npc item"), method: 8 },
  { name: "Misc/inner.zip", content: bytesOf("PK\u0003\u0004 not really a zip"), method: 0 },
];

/** The same game as a loose folder. */
function folderEntries(): FolderEntry[] {
  return GAME.map((spec) => ({
    kind: "file" as const,
    path: spec.name,
    bytes: spec.content ?? new Uint8Array(0),
  }));
}

/** The game as a `.tpk`. */
function tpkBytes(specs: readonly ZipSpec[] = GAME, options: ZipOptions = {}): Uint8Array {
  return buildZip(specs, options);
}

/** The game as a standalone EXE: a program image, the ZIP, then the trailer. */
function exeBytes(specs: readonly ZipSpec[] = GAME): Uint8Array {
  const prefix = new Uint8Array(64).fill(0x90);
  const zip = tpkBytes(specs);
  return concat([prefix, zip, CMP1, le32(prefix.length), le32(zip.length)]);
}

/** Unwrap a result the test expects to succeed. */
function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`expected ok, got: ${result.error.message}`);
  }
  return result.value;
}

/** Assert a `.tpk` load failed, naming `rule`, and return the failure. */
function tpkFailure(bytes: Uint8Array, rule: string): FormatError {
  const result = loadPackage({ kind: "tpk", name: "bad.tpk", bytes });
  if (result.ok) {
    throw new Error(`expected a failure naming ${rule}`);
  }
  equal(result.error.section, "format-spec §13");
  equal(result.error.message.includes(rule), true, `"${result.error.message}" should name ${rule}`);
  return result.error;
}

/** Assert a loose-folder load failed, naming `rule`, and return the failure. */
function folderFailure(entries: readonly FolderEntry[], rule: string): FormatError {
  const result = loadPackage({ kind: "folder", name: "bad", entries });
  if (result.ok) {
    throw new Error(`expected a failure naming ${rule}`);
  }
  equal(result.error.section, "format-spec §13");
  equal(result.error.message.includes(rule), true, `"${result.error.message}" should name ${rule}`);
  return result.error;
}

/** A package as comparable data: paths with their bytes. */
function treeOf(loaded: LoadedPackage): readonly { path: string; bytes: number[] }[] {
  return loaded.files.map((file) => ({ path: file.path, bytes: Array.from(file.bytes) }));
}

test("the limit values are the discovery report's proposals", () => {
  equal(PACKAGE_LIMITS.maxCompressedInputBytes, 268_435_456);
  equal(PACKAGE_LIMITS.maxEntries, 10_000);
  equal(PACKAGE_LIMITS.maxEntryUncompressedBytes, 67_108_864);
  equal(PACKAGE_LIMITS.maxTotalUncompressedBytes, 536_870_912);
  equal(PACKAGE_LIMITS.maxCompressionRatio, 100);
  equal(PACKAGE_LIMITS.maxPathBytes, 256);
  equal(PACKAGE_LIMITS.maxPathDepth, 16);
  equal(PACKAGE_LIMITS.maxBasenameBytes, 128);
  equal(PACKAGE_LIMITS.eocdSearchBytes, 65_557);
  equal(PACKAGE_LIMITS.trailerBytes, 12);
});

test("a loose folder, a .tpk and an appended-ZIP EXE load the same asset tree", () => {
  const folder = unwrap(loadPackage({ kind: "folder", name: "demo", entries: folderEntries() }));
  const tpk = unwrap(loadPackage({ kind: "tpk", name: "demo.tpk", bytes: tpkBytes() }));
  const exe = unwrap(loadPackage({ kind: "exe", name: "demo.exe", bytes: exeBytes() }));
  deepEqual(treeOf(tpk), treeOf(folder));
  deepEqual(treeOf(exe), treeOf(folder));
  deepEqual(tpk.index.keys, folder.index.keys);
  deepEqual(exe.index.keys, tpk.index.keys);
  equal(folder.format, "folder");
  equal(tpk.format, "tpk");
  equal(exe.format, "exe");
  equal(folder.name, "demo");
  // The nested archive is an ordinary file, never opened (L14).
  equal(unwrap(loadPackage({ kind: "tpk", name: "demo.tpk", bytes: tpkBytes() })).files.length, GAME.length);
});

test("a loaded package resolves references case-insensitively", () => {
  const tpk = unwrap(loadPackage({ kind: "tpk", name: "demo.tpk", bytes: tpkBytes() }));
  equal(unwrap(resolveAsset(tpk.index, PACKAGE_ROOT, "boards", "Boards\\INN.brd")), "boards/inn.brd");
  equal(unwrap(resolveAsset(tpk.index, PACKAGE_ROOT, "boards", "village/shop.brd")), "boards/village/shop.brd");
  equal(unwrap(resolveAsset(tpk.index, PACKAGE_ROOT, "items", "Item\\NPC.ITM")), "item/npc.itm");
  const exe = unwrap(loadPackage({ kind: "exe", name: "demo.exe", bytes: exeBytes() }));
  equal(unwrap(resolveAsset(exe.index, PACKAGE_ROOT, "tiles", "TILES\\Default.TST")), "tiles/default.tst");
  equal(exe.index.byKey.has("main.gam"), true);
});

test("directory entries are counted but never served", () => {
  const specs: readonly ZipSpec[] = [
    { name: "Boards/", content: new Uint8Array(0), method: 0 },
    { name: "Boards/inn.brd", content: bytesOf("inn"), method: 8 },
  ];
  const loaded = unwrap(loadPackage({ kind: "tpk", name: "dirs.tpk", bytes: tpkBytes(specs) }));
  deepEqual(
    loaded.files.map((file) => file.path),
    ["Boards/inn.brd"],
  );
  const folder = unwrap(
    loadPackage({
      kind: "folder",
      name: "dirs",
      entries: [
        { kind: "directory", path: "Boards/" },
        { kind: "file", path: "Boards/inn.brd", bytes: bytesOf("inn") },
      ],
    }),
  );
  deepEqual(treeOf(folder), treeOf(loaded));
});

test("an entry whose declared size is smaller than its content is rejected, not truncated (L17)", () => {
  // The discovery report measured `unzipSync` returning 1,000 bytes, with no
  // error, for an entry declaring 1,000 but holding 10,000,000. Here the
  // CRC-32 matches the truncated prefix too, so neither the declared size nor
  // the CRC-32 can tell the difference: only inflating the entry's own stream
  // and measuring it can, and the loader does that before anything decodes.
  const content = new Uint8Array(5000);
  for (let i = 0; i < content.length; i += 1) content[i] = i & 0xff;
  const truncatedCrc = crc32Of(content.subarray(0, 1000));
  const bytes = buildZip([
    {
      name: "Boards/lie.brd",
      content,
      method: 8,
      body: storedDeflate(content),
      crc: truncatedCrc,
      uncompressedSize: 1000,
    },
  ]);
  const error = tpkFailure(bytes, "declared vs actual size");
  equal(error.message.includes("L17"), true, error.message);
  equal(error.message.includes("1000"), true, error.message);
  // And the loader returned no 1,000-byte prefix of the file.
  equal(loadPackage({ kind: "tpk", name: "bad.tpk", bytes }).ok, false);
});

test("a stored entry whose compressed size differs from its declared size is rejected (L17)", () => {
  const bytes = buildZip([
    { name: "s.bin", content: bytesOf("hello"), method: 0, uncompressedSize: 4 },
  ]);
  const error = tpkFailure(bytes, "declared vs actual size");
  equal(error.message.includes("stored"), true, error.message);
});

test("CRC-32 corruption is caught (L18)", () => {
  const bytes = buildZip([
    { name: "bad.txt", content: bytesOf("hello"), method: 8, body: storedDeflate(bytesOf("hellp")) },
  ]);
  const error = tpkFailure(bytes, "CRC-32");
  equal(error.message.includes("L18"), true, error.message);
  // The same for a stored entry, whose bytes are checked just as closely.
  tpkFailure(
    buildZip([{ name: "bad2.txt", content: bytesOf("hello"), method: 0, body: bytesOf("hellp") }]),
    "CRC-32",
  );
});

test("a local header that disagrees with the central directory is caught (L19)", () => {
  const bytes = buildZip([
    { name: "d.txt", content: bytesOf("hello"), method: 0, central: { method: 8 } },
  ]);
  const error = tpkFailure(bytes, "header consistency");
  equal(error.message.includes("method"), true, error.message);
  // A disagreement on the name is caught too.
  tpkFailure(
    buildZip([{ name: "e.txt", content: bytesOf("hello"), method: 0, local: { crc: 0xdeadbeef } }]),
    "header consistency",
  );
});

test("too many entries is rejected (L2)", () => {
  const bytes = buildZip([{ name: "a.txt", content: bytesOf("a") }], {
    totalEntries: PACKAGE_LIMITS.maxEntries + 1,
  });
  const error = tpkFailure(bytes, "max entry count");
  equal(error.message.includes("L2"), true, error.message);
});

test("an oversize entry is rejected before anything inflates (L3)", () => {
  const bytes = buildZip([
    {
      name: "big.bin",
      content: bytesOf("x"),
      method: 0,
      uncompressedSize: PACKAGE_LIMITS.maxEntryUncompressedBytes + 1,
    },
  ]);
  const error = tpkFailure(bytes, "max entry size");
  equal(error.message.includes("L3"), true, error.message);
});

test("an oversize total is rejected (L4)", () => {
  const sixtyMiB = 60 * 1024 * 1024;
  const specs: ZipSpec[] = Array.from({ length: 9 }, (_, index) => ({
    name: `f${index}.bin`,
    content: bytesOf("x"),
    method: 0,
    uncompressedSize: sixtyMiB,
  }));
  const error = tpkFailure(buildZip(specs), "max total size");
  equal(error.message.includes("L4"), true, error.message);
});

test("a ratio bomb is rejected (L5)", () => {
  const bytes = buildZip([
    {
      name: "bomb.bin",
      content: bytesOf("x"),
      method: 8,
      body: new Uint8Array(20),
      uncompressedSize: 1_000_000,
    },
  ]);
  const error = tpkFailure(bytes, "zip-bomb guard");
  equal(error.message.includes("L5"), true, error.message);
});

test("paths that escape the package root are rejected (L9)", () => {
  const escapes: readonly string[] = [
    "..\\evil.txt",
    "../evil.txt",
    "Boards/../../evil.brd",
    "/etc/passwd",
    "C:/windows/evil.brd",
    "a\u0000b.txt",
  ];
  for (const path of escapes) {
    const error = tpkFailure(buildZip([{ name: path, content: bytesOf("x") }]), "path escape");
    equal(error.message.includes("L9"), true, error.message);
  }
});

test("an entry duplicated by case is rejected (L10)", () => {
  const bytes = buildZip([
    { name: "Boards/inn.brd", content: bytesOf("one") },
    { name: "boards/INN.BRD", content: bytesOf("two") },
  ]);
  const error = tpkFailure(bytes, "case-insensitive duplicates");
  equal(error.message.includes("L10"), true, error.message);
});

test("an encrypted entry is rejected (L11)", () => {
  const bytes = buildZip([{ name: "secret.brd", content: bytesOf("x"), flags: 1 }]);
  const error = tpkFailure(bytes, "encrypted entry");
  equal(error.message.includes("L11"), true, error.message);
});

test("an unsupported compression method is rejected (L12)", () => {
  const bytes = buildZip([{ name: "weird.brd", content: bytesOf("x"), method: 12 }]);
  const error = tpkFailure(bytes, "compression method");
  equal(error.message.includes("L12"), true, error.message);
});

test("ZIP64 is rejected (L13)", () => {
  const error = tpkFailure(
    buildZip([{ name: "a.txt", content: bytesOf("a") }], { cdOffset: 0xffffffff }),
    "ZIP64",
  );
  equal(error.message.includes("L13"), true, error.message);
});

test("a package with no end-of-central-directory record in the window is rejected (L15)", () => {
  const error = tpkFailure(new Uint8Array(1024), "EOCD search window");
  equal(error.message.includes("L15"), true, error.message);
});

test("path length, depth and basename limits are enforced (L6, L7, L8)", () => {
  const long = tpkFailure(buildZip([{ name: "a".repeat(257), content: bytesOf("x") }]), "max path length");
  equal(long.message.includes("L6"), true, long.message);
  const deep = tpkFailure(
    buildZip([{ name: `${"a/".repeat(16)}f.txt`, content: bytesOf("x") }]),
    "max depth",
  );
  equal(deep.message.includes("L7"), true, deep.message);
  const named = tpkFailure(
    buildZip([{ name: `${"a".repeat(129)}.txt`, content: bytesOf("x") }]),
    "max name length",
  );
  equal(named.message.includes("L8"), true, named.message);
});

test("the CMP1 trailer decides where the appended ZIP is (L20, L21)", () => {
  const zip = tpkBytes();
  // A valid appended ZIP: the extracted range is the ZIP itself.
  const prefix = new Uint8Array(32).fill(0x90);
  const good = concat([prefix, zip, CMP1, le32(prefix.length), le32(zip.length)]);
  deepEqual(Array.from(unwrap(readAppendedZip(good, "good.exe"))), Array.from(zip));

  // No trailer at all.
  const missing = loadPackage({ kind: "exe", name: "bad.exe", bytes: zip });
  equal(missing.ok, false);
  if (!missing.ok) {
    equal(missing.error.message.includes("missing CMP1 trailer"), true, missing.error.message);
    equal(missing.error.message.includes("L21"), true, missing.error.message);
  }
  const short = loadPackage({ kind: "exe", name: "bad.exe", bytes: new Uint8Array(4) });
  equal(short.ok, false);

  // An offset past the end, a length that runs into the trailer, and a
  // negative offset are all the same rule (L20).
  const outOfRange = concat([prefix, zip, CMP1, le32(prefix.length + zip.length + 1), le32(zip.length)]);
  const overlapping = concat([prefix, zip, CMP1, le32(0), le32(prefix.length + zip.length + 1)]);
  const negative = concat([prefix, zip, CMP1, le32(0xfffffff0), le32(zip.length)]);
  for (const bytes of [outOfRange, overlapping, negative]) {
    const result = loadPackage({ kind: "exe", name: "bad.exe", bytes });
    equal(result.ok, false);
    if (!result.ok) {
      equal(result.error.message.includes("CMP1 trailer"), true, result.error.message);
      equal(result.error.message.includes("L20"), true, result.error.message);
    }
  }
});

test("a loose folder obeys the same limits as an archive (L22–L26)", () => {
  const one = bytesOf("x");
  const tooMany: FolderEntry[] = Array.from({ length: PACKAGE_LIMITS.maxEntries + 1 }, (_, index) => ({
    kind: "file" as const,
    path: `f${index}.txt`,
    bytes: one,
  }));
  equal(folderFailure(tooMany, "max entry count").message.includes("L22"), true);

  const oversize = new Uint8Array(PACKAGE_LIMITS.maxEntryUncompressedBytes + 1);
  equal(
    folderFailure([{ kind: "file", path: "big.bin", bytes: oversize }], "max entry size").message.includes(
      "L25",
    ),
    true,
  );

  // The same 64 MiB buffer nine times: 576 MiB of total size, without allocating it.
  const chunk = new Uint8Array(PACKAGE_LIMITS.maxEntryUncompressedBytes);
  const nine: FolderEntry[] = Array.from({ length: 9 }, (_, index) => ({
    kind: "file" as const,
    path: `c${index}.bin`,
    bytes: chunk,
  }));
  equal(folderFailure(nine, "max total size").message.includes("L24"), true);

  equal(
    folderFailure([{ kind: "link", path: "linked.brd" }], "symbolic links").message.includes("L23"),
    true,
  );
  equal(
    folderFailure(
      [
        { kind: "file", path: "Boards/inn.brd", bytes: one },
        { kind: "file", path: "boards/INN.BRD", bytes: one },
      ],
      "case-insensitive duplicates",
    ).message.includes("L10"),
    true,
  );
  equal(
    folderFailure([{ kind: "file", path: "../evil.brd", bytes: one }], "path escape").message.includes(
      "L9",
    ),
    true,
  );
  equal(
    folderFailure([{ kind: "file", path: `${"a".repeat(129)}.txt`, bytes: one }], "max name length").message.includes(
      "L8",
    ),
    true,
  );
});

test("the loader never throws, whatever bytes it is given", () => {
  const zip = tpkBytes();
  const inputs: readonly Uint8Array[] = [
    new Uint8Array(0),
    new Uint8Array([1, 2, 3]),
    new Uint8Array(1024),
    zip.subarray(0, 20),
    zip.subarray(0, zip.length - 10),
    new Uint8Array([0x50, 0x4b, 0x05, 0x06]),
    concat([zip, CMP1]),
  ];
  for (const bytes of inputs) {
    const tpk = loadPackage({ kind: "tpk", name: "t.tpk", bytes });
    equal(tpk.ok, false, `expected a .tpk failure for ${bytes.length} bytes`);
    const exe = loadPackage({ kind: "exe", name: "t.exe", bytes });
    equal(exe.ok, false, `expected an EXE failure for ${bytes.length} bytes`);
  }
});
