// The distribution package writer of format-spec §13 (AD-6): a `.tpk`-compatible
// ZIP carrying the game files plus `manifest.json { schema, main, index }`.
//
// The fixtures here are the *writer's* input, and every read-back runs through
// the landed reader (`loadPackage`, ticket 2.10) and the landed resolver
// (AD-5), so the writer cannot drift from either: what it writes is read with
// the reader's own CRC, declared-size and limit checks, and it resolves through
// the resolver exactly as the extracted folder does.
import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import { TextDecoder, TextEncoder } from "node:util";
import {
  loadPackage,
  MANIFEST_FILE_NAME,
  PACKAGE_LIMITS,
  PACKAGE_ROOT,
  resolveAsset,
  writeDistributionPackage,
} from "../src/index.ts";
import type {
  AssetKind,
  DistributionInput,
  DistributionManifest,
  FolderEntry,
  FormatError,
  PackageFile,
  Result,
} from "../src/index.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** The bytes of a UTF-8 string. */
function bytesOf(text: string): Uint8Array {
  return encoder.encode(text);
}

/** Bytes that deflate well, to exercise the compressed path. */
function repetitive(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let index = 0; index < length; index += 1) {
    bytes[index] = (index % 7) + 65;
  }
  return bytes;
}

/** The asset tree: a main file, a nested folder, binary data and an empty file. */
const FILES: readonly PackageFile[] = [
  { path: "Main/demo.gam", bytes: bytesOf("RPGTLKIT MAIN demo") },
  { path: "Boards/inn.brd", bytes: repetitive(4096) },
  { path: "Boards/Village/Shop.BRD", bytes: bytesOf("the shop") },
  { path: "Tiles/default.tst", bytes: new Uint8Array([0x54, 0x53, 0x45, 0x54, 0x00, 0x01, 0x02]) },
  { path: "Media/empty.dat", bytes: new Uint8Array(0) },
];

/** The manifest: the project schema, the main file and the index of `FILES`. */
const MANIFEST: DistributionManifest = {
  schema: 3,
  main: "Main/demo.gam",
  index: FILES.map((file) => file.path),
};

/** The writer's input for `FILES` and `MANIFEST`. */
function input(files: readonly PackageFile[] = FILES, manifest: DistributionManifest = MANIFEST): DistributionInput {
  return { files, manifest };
}

/** Unwrap a result the test expects to succeed. */
function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`expected ok, got: ${result.error.message}`);
  }
  return result.value;
}

/** Write the fixture package and read it back through the landed reader. */
function writeAndRead(
  files: readonly PackageFile[] = FILES,
  manifest: DistributionManifest = MANIFEST,
): { bytes: Uint8Array; files: readonly PackageFile[] } {
  const bytes = unwrap(writeDistributionPackage(input(files, manifest)));
  const loaded = unwrap(loadPackage({ kind: "tpk", name: "game.tpk", bytes }));
  return {
    bytes,
    files: loaded.files,
  };
}

/** Assert a write failed, citing §13 and naming `rule`, and return the failure. */
function writeFailure(
  files: readonly PackageFile[],
  manifest: unknown,
  rule: string,
): FormatError {
  const result = writeDistributionPackage({ files, manifest } as DistributionInput);
  if (result.ok) {
    throw new Error(`expected a failure naming ${rule}`);
  }
  equal(result.error.section, "format-spec §13");
  equal(result.error.message.includes(rule), true, `"${result.error.message}" should name ${rule}`);
  return result.error;
}

test("a written package round-trips its asset tree and its manifest", () => {
  const { bytes, files } = writeAndRead();
  equal(bytes.length > 0, true);

  // The read-back is the asset tree plus the manifest, sorted by path (the
  // writer's deterministic entry order), byte for byte.
  const readTree = files.filter((file) => file.path !== MANIFEST_FILE_NAME);
  const expected = [...FILES].sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
  deepEqual(
    readTree.map((file) => ({ path: file.path, bytes: Array.from(file.bytes) })),
    expected.map((file) => ({ path: file.path, bytes: Array.from(file.bytes) })),
  );

  // The empty file survives as an empty file, not a missing entry.
  const empty = files.find((file) => file.path === "Media/empty.dat");
  equal(empty !== undefined, true);
  equal(empty?.bytes.length, 0);

  // The manifest survives the read path unchanged, except that `index` is
  // written in code-unit order (plain `sort()` on strings) rather than the
  // caller's: that is what keeps two writes of one tree byte-identical (G3).
  const manifestFile = files.find((file) => file.path === MANIFEST_FILE_NAME);
  equal(manifestFile !== undefined, true);
  deepEqual(JSON.parse(decoder.decode(manifestFile?.bytes)) as unknown, {
    ...MANIFEST,
    index: [...MANIFEST.index].sort(),
  });
  // It sits at the archive root (no folder segment).
  equal((manifestFile?.path ?? "").includes("/"), false);
});

test("the written bytes are deterministic", () => {
  const first = unwrap(writeDistributionPackage(input()));
  const second = unwrap(writeDistributionPackage(input()));
  deepEqual(second, first);

  // A fresh tree object with the same content writes the same bytes.
  const copied: readonly PackageFile[] = FILES.map((file) => ({
    path: file.path,
    bytes: Uint8Array.from(file.bytes),
  }));
  deepEqual(unwrap(writeDistributionPackage(input(copied))), first);
});

test("the caller's index order cannot reach the written bytes", () => {
  // The same tree and the same manifest, listed in the caller's two orders: the
  // manifest's `index` is written in code-unit order, so both writes are
  // byte-identical (G3). Before that, the caller's order reached the manifest
  // bytes (the reversed list was three bytes longer here).
  const forward = unwrap(writeDistributionPackage(input()));
  const reversed = unwrap(
    writeDistributionPackage(input(FILES, { ...MANIFEST, index: [...MANIFEST.index].reverse() })),
  );
  deepEqual(reversed, forward);

  // The manifest still lists every file once, in code-unit order.
  const loaded = unwrap(loadPackage({ kind: "tpk", name: "game.tpk", bytes: reversed }));
  const manifestFile = loaded.files.find((file) => file.path === MANIFEST_FILE_NAME);
  deepEqual(JSON.parse(decoder.decode(manifestFile?.bytes)) as unknown, {
    ...MANIFEST,
    index: [...MANIFEST.index].sort(),
  });
});

test("the written package passes the reader's checks and matches the loose folder", () => {
  const packed = writeAndRead();
  const packedLoaded = unwrap(loadPackage({ kind: "tpk", name: "game.tpk", bytes: packed.bytes }));

  // The extracted folder is the same tree with the same paths.
  const extracted: readonly FolderEntry[] = packedLoaded.files.map((file) => ({
    kind: "file" as const,
    path: file.path,
    bytes: file.bytes,
  }));
  const loose = unwrap(loadPackage({ kind: "folder", name: "game", entries: extracted }));

  // The resolver's index is identical, so the two forms resolve alike (AD-5).
  deepEqual(loose.index.paths, packedLoaded.index.paths);

  const references: readonly (readonly [AssetKind, string])[] = [
    ["boards", "inn.brd"],
    ["boards", "Boards\\Village\\Shop.BRD"],
    ["boards", "village/shop.brd"],
    ["tiles", "default.tst"],
  ];
  for (const [kind, reference] of references) {
    const fromPackage = unwrap(resolveAsset(packedLoaded.index, PACKAGE_ROOT, kind, reference));
    const fromFolder = unwrap(resolveAsset(loose.index, PACKAGE_ROOT, kind, reference));
    equal(fromPackage, fromFolder);
    equal(fromPackage.length > 0, true);
  }

  // A reference neither holds is a located miss in both forms.
  const missPackage = resolveAsset(packedLoaded.index, PACKAGE_ROOT, "boards", "missing.brd");
  const missFolder = resolveAsset(loose.index, PACKAGE_ROOT, "boards", "missing.brd");
  equal(missPackage.ok, false);
  equal(missFolder.ok, false);
});

test("a highly compressible file is stored, so the reader's ratio limit cannot reject it", () => {
  const zeros = new Uint8Array(200_000);
  const files: readonly PackageFile[] = [
    { path: "Main/demo.gam", bytes: bytesOf("RPGTLKIT MAIN demo") },
    { path: "Media/zeros.bin", bytes: zeros },
  ];
  const manifest: DistributionManifest = { schema: 1, main: "Main/demo.gam", index: files.map((file) => file.path) };

  // 200,000 zero bytes deflate far past the reader's 100:1 guard (L5); the
  // writer must therefore store it. A read-back success proves it did.
  const bytes = unwrap(writeDistributionPackage({ files, manifest }));
  const loaded = unwrap(loadPackage({ kind: "tpk", name: "zeros.tpk", bytes }));
  const read = loaded.files.find((file) => file.path === "Media/zeros.bin");
  deepEqual(Array.from(read?.bytes ?? []), Array.from(zeros));
});

test("a path with '..' is refused, naming the escape rule", () => {
  const files: readonly PackageFile[] = [{ path: "Boards/../inn.brd", bytes: bytesOf("x") }];
  writeFailure(files, { schema: 1, main: "Boards/../inn.brd", index: ["Boards/../inn.brd"] }, "path escape, L9");
});

test("an absolute path is refused, naming the escape rule", () => {
  const files: readonly PackageFile[] = [{ path: "/etc/passwd", bytes: bytesOf("x") }];
  writeFailure(files, { schema: 1, main: "/etc/passwd", index: ["/etc/passwd"] }, "path escape, L9");
});

test("a duplicate-by-case path is refused, naming the ambiguity rule", () => {
  const files: readonly PackageFile[] = [
    { path: "Boards/inn.brd", bytes: bytesOf("a") },
    { path: "boards/INN.BRD", bytes: bytesOf("b") },
  ];
  writeFailure(files, { schema: 1, main: "Boards/inn.brd", index: ["Boards/inn.brd"] }, "case-insensitive duplicates, L10");
});

test("a caller file named manifest.json is refused, naming the manifest rule", () => {
  const files: readonly PackageFile[] = [
    { path: "Main/demo.gam", bytes: bytesOf("RPGTLKIT MAIN demo") },
    { path: "manifest.json", bytes: bytesOf("{}") },
  ];
  writeFailure(
    files,
    { schema: 1, main: "Main/demo.gam", index: ["Main/demo.gam", "manifest.json"] },
    "manifest, L10",
  );
});

test("a missing manifest is refused, naming the manifest rule", () => {
  writeFailure(FILES, undefined, "manifest, AD-6");
});

test("a malformed manifest is refused, naming the schema rule", () => {
  writeFailure(FILES, { schema: 1.5, main: "Main/demo.gam", index: MANIFEST.index }, "project schema, AD-23");
});

test("a manifest whose main is not in the tree is refused, naming the main rule", () => {
  writeFailure(FILES, { schema: 1, main: "Main/missing.gam", index: MANIFEST.index }, "manifest main, AD-6");
});

test("a manifest whose index does not match the tree is refused, naming the index rule", () => {
  // A missing index entry.
  writeFailure(FILES, { schema: 1, main: "Main/demo.gam", index: MANIFEST.index.slice(1) }, "asset index, AD-5");
  // An index entry the tree does not hold.
  writeFailure(
    FILES,
    { schema: 1, main: "Main/demo.gam", index: [...MANIFEST.index, "Boards/ghost.brd"] },
    "asset index, AD-5",
  );
});

test("a tree that would exceed the entry limit is refused, naming L2", () => {
  const files: readonly PackageFile[] = Array.from({ length: PACKAGE_LIMITS.maxEntries }, (_, index) => ({
    path: `F/p${index}.dat`,
    bytes: new Uint8Array(0),
  }));
  const manifest: DistributionManifest = { schema: 1, main: "F/p0.dat", index: files.map((file) => file.path) };
  writeFailure(files, manifest, "max entry count, L2");
  // One fewer fits (plus the manifest) and round-trips.
  const smaller: readonly PackageFile[] = files.slice(1);
  const smallerManifest: DistributionManifest = {
    schema: 1,
    main: "F/p1.dat",
    index: smaller.map((file) => file.path),
  };
  const result = writeDistributionPackage({ files: smaller, manifest: smallerManifest });
  equal(result.ok && result.value.length > 0, true);
});

test("a tree over the L1 budget is refused at the entry that crosses it", () => {
  // The L1 budget is on the written container, so it can only be proved while
  // the entries are compressed: the check runs after each entry against a lower
  // bound on the finished archive (the entries so far, the local headers still to
  // come, the whole central directory and the record), which is exact at the last
  // entry. This tree is 319 MiB of bytes that deflate past the reader's 100:1
  // guard, so the writer stores them whole, with the L1 limit at 256 MiB: the
  // first four entries fill the budget to the byte (4 x 64 MiB) and the headers
  // push the bound past it, so the fifth entry must never be compressed. The old
  // post-loop check could only report the finished total, which counts every
  // body — the reported number is therefore the observable that says where the
  // refusal landed.
  const sixtyFourMiB = new Uint8Array(64 * 1024 * 1024);
  const full: readonly PackageFile[] = [0, 1, 2, 3].map((index) => ({
    path: `F/p${index}.bin`,
    bytes: sixtyFourMiB,
  }));
  const files: readonly PackageFile[] = [
    ...full,
    { path: "F/p4.bin", bytes: sixtyFourMiB.subarray(0, 63 * 1024 * 1024) },
  ];
  const manifest: DistributionManifest = { schema: 1, main: "F/p0.bin", index: files.map((file) => file.path) };

  const result = writeDistributionPackage({ files, manifest });
  if (result.ok) throw new Error("expected a failure naming L1");
  equal(result.error.section, "format-spec §13");
  equal(result.error.message.includes("max compressed input, L1"), true, result.error.message);

  // The refusal is at the crossing, not after the last entry: the reported bound
  // is over the 256 MiB limit, and within the limit plus the fourth entry and
  // the headers that follow it — far below the 319 MiB of bodies it would report
  // if every entry had been compressed first.
  const reported = Number(/(\d+) bytes/.exec(result.error.message)?.[1]);
  equal(Number.isInteger(reported), true, result.error.message);
  equal(reported > PACKAGE_LIMITS.maxCompressedInputBytes, true, `${reported} should exceed the L1 limit`);
  equal(
    reported < PACKAGE_LIMITS.maxCompressedInputBytes + 1024,
    true,
    `${reported} should be the fourth entry's crossing, not the finished total of 319 MiB of bodies`,
  );
});

test("a path over the length limit is refused, naming L6", () => {
  const long = `${"a".repeat(300)}.brd`;
  const files: readonly PackageFile[] = [{ path: long, bytes: bytesOf("x") }];
  writeFailure(files, { schema: 1, main: long, index: [long] }, "max path length, L6");
});

test("a path with an empty segment is refused, naming the path-shape rule", () => {
  const files: readonly PackageFile[] = [{ path: "Boards//inn.brd", bytes: bytesOf("x") }];
  const failure = writeFailure(
    files,
    { schema: 1, main: "Boards/inn.brd", index: ["Boards//inn.brd"] },
    "path shape",
  );
  // The path-shape rule is not the zip-slip rule, so the message must not cite L9.
  equal(failure.message.includes("L9"), false, failure.message);
});

test("a backslash-separated path is written with forward slashes", () => {
  const files: readonly PackageFile[] = [
    { path: "Main\\demo.gam", bytes: bytesOf("RPGTLKIT MAIN demo") },
    { path: "Boards\\Village\\inn.brd", bytes: bytesOf("the inn") },
  ];
  const manifest: DistributionManifest = {
    schema: 1,
    main: "Main\\demo.gam",
    index: ["Main\\demo.gam", "Boards\\Village\\inn.brd"],
  };
  const { files: readBack } = writeAndRead(files, manifest);
  deepEqual(
    readBack.map((file) => file.path).sort(),
    [MANIFEST_FILE_NAME, "Boards/Village/inn.brd", "Main/demo.gam"].sort(),
  );
  // The manifest names the archive's own spelling, not the caller's backslashes,
  // and in code-unit order (`Boards/…` sorts before `Main/…`).
  const manifestFile = readBack.find((file) => file.path === MANIFEST_FILE_NAME);
  equal(manifestFile !== undefined, true);
  deepEqual(JSON.parse(decoder.decode(manifestFile?.bytes)) as unknown, {
    schema: 1,
    main: "Main/demo.gam",
    index: ["Boards/Village/inn.brd", "Main/demo.gam"],
  });
});

test("a non-ASCII file name round-trips through the package", () => {
  const files: readonly PackageFile[] = [
    { path: "Main/demo.gam", bytes: bytesOf("RPGTLKIT MAIN demo") },
    { path: "Média/café.dat", bytes: bytesOf("café") },
  ];
  const manifest: DistributionManifest = { schema: 1, main: "Main/demo.gam", index: files.map((file) => file.path) };
  const { files: readBack } = writeAndRead(files, manifest);
  const found = readBack.find((file) => file.path === "Média/café.dat");
  equal(found !== undefined, true);
  deepEqual(Array.from(found?.bytes ?? []), Array.from(bytesOf("café")));
});

test("a non-object input is refused, naming the distribution input", () => {
  for (const bad of [null, undefined, 42, "input"] as readonly unknown[]) {
    const result = writeDistributionPackage(bad as DistributionInput);
    if (result.ok) throw new Error("expected a failure");
    equal(result.error.section, "format-spec §13");
    equal(result.error.message.includes("distribution input"), true, result.error.message);
  }
});

test("a files list that is not an array is refused, naming the asset tree", () => {
  const result = writeDistributionPackage({ files: null, manifest: MANIFEST } as unknown as DistributionInput);
  if (result.ok) throw new Error("expected a failure");
  equal(result.error.message.includes("asset tree"), true, result.error.message);
});

test("an asset-tree entry that is not an object is refused, naming the asset tree", () => {
  const result = writeDistributionPackage({ files: [null], manifest: MANIFEST } as unknown as DistributionInput);
  if (result.ok) throw new Error("expected a failure");
  equal(result.error.message.includes("asset tree"), true, result.error.message);
});

test("an asset-tree entry whose path is not a string is refused, naming the asset tree", () => {
  const result = writeDistributionPackage({
    files: [{ path: 7, bytes: bytesOf("x") }],
    manifest: MANIFEST,
  } as unknown as DistributionInput);
  if (result.ok) throw new Error("expected a failure");
  equal(result.error.message.includes("asset tree"), true, result.error.message);
});

test("an asset-tree entry whose bytes are not a Uint8Array is refused, naming the asset tree", () => {
  const result = writeDistributionPackage({
    files: [{ path: "Main/demo.gam", bytes: "not bytes" }],
    manifest: MANIFEST,
  } as unknown as DistributionInput);
  if (result.ok) throw new Error("expected a failure");
  equal(result.error.message.includes("asset tree"), true, result.error.message);
});
