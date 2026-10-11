// The pure asset resolver of format-spec §1.5 (AD-5): a logical reference
// becomes the canonical `AssetKey` of the matching entry in a host-supplied
// index — case-insensitive, `\` and `/` equivalent, the type-folder prefix
// stripped, subfolders allowed, and the project path ignored inside a package.
//
// The resolver never throws, so the tests assert on values and on the error's
// offset, section and message rather than on exceptions.
import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import {
  assetKey,
  createAssetIndex,
  foldPath,
  PACKAGE_ROOT,
  resolveAsset,
} from "../src/index.ts";
import type { AssetKey, AssetRoot, Result } from "../src/index.ts";

/** Unwrap a result the test expects to succeed. */
function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`expected ok, got: ${result.error.message}`);
  }
  return result.value;
}

/** The failure of a result the test expects to fail. */
function failureOf(result: Result<unknown>): { offset: number; section: string; message: string } {
  if (result.ok) {
    throw new Error("expected a failure");
  }
  return result.error;
}

/** A host index for a game folder: a project folder plus a package-style path. */
const GAME_PATHS: readonly string[] = [
  "Main/demo.gam",
  "Game/demo/Boards/inn.brd",
  "Game/demo/Boards/Village/Shop.BRD",
  "Game/demo/Tiles/default.tst",
  "Game/demo/Item/npc.itm",
  "Game/demo/Chrs/Hero.TEM",
  "Game/demo/Prg/Start.PRG",
  "Game/demo/Misc/title.anm",
];

/** The same game as a package: the project's contents at the package root (§13). */
const PACKAGE_PATHS: readonly string[] = [
  "main.gam",
  "Boards/inn.brd",
  "boards/Village/Shop.BRD",
  "Tiles/default.tst",
  "Item/npc.itm",
  "Chrs/Hero.TEM",
  "Prg/Start.PRG",
  "Misc/title.anm",
];

const folderRoot: AssetRoot = { kind: "game", projectPath: "demo" };

test("a reference resolves to the canonical key of its type folder", () => {
  const index = createAssetIndex(PACKAGE_PATHS);
  const key: AssetKey = unwrap(resolveAsset(index, PACKAGE_ROOT, "boards", "inn.brd"));
  equal(key, "boards/inn.brd");
  equal(unwrap(resolveAsset(index, PACKAGE_ROOT, "tiles", "default.tst")), "tiles/default.tst");
  equal(unwrap(resolveAsset(index, PACKAGE_ROOT, "programs", "Start.PRG")), "prg/start.prg");
  equal(unwrap(resolveAsset(index, PACKAGE_ROOT, "items", "npc.itm")), "item/npc.itm");
});

test("the lookup is case-insensitive in both directions", () => {
  const index = createAssetIndex(PACKAGE_PATHS);
  equal(unwrap(resolveAsset(index, PACKAGE_ROOT, "boards", "INN.BRD")), "boards/inn.brd");
  // The index entry is mixed case; the reference is lower case.
  equal(unwrap(resolveAsset(index, PACKAGE_ROOT, "characters", "hero.tem")), "chrs/hero.tem");
  equal(unwrap(resolveAsset(index, PACKAGE_ROOT, "characters", "HERO.TEM")), "chrs/hero.tem");
});

test("backslash and slash are equivalent", () => {
  const index = createAssetIndex(PACKAGE_PATHS);
  equal(unwrap(resolveAsset(index, PACKAGE_ROOT, "boards", "Village\\Shop.BRD")), "boards/village/shop.brd");
  equal(unwrap(resolveAsset(index, PACKAGE_ROOT, "boards", "Village/Shop.BRD")), "boards/village/shop.brd");
  equal(unwrap(resolveAsset(index, PACKAGE_ROOT, "boards", "village\\shop.brd")), "boards/village/shop.brd");
});

test("a leading type-folder prefix is stripped, whatever its case", () => {
  const index = createAssetIndex(PACKAGE_PATHS);
  equal(unwrap(resolveAsset(index, PACKAGE_ROOT, "boards", "Boards\\INN.brd")), "boards/inn.brd");
  equal(unwrap(resolveAsset(index, PACKAGE_ROOT, "boards", "boards/inn.brd")), "boards/inn.brd");
  equal(unwrap(resolveAsset(index, PACKAGE_ROOT, "items", "Item\\NPC.ITM")), "item/npc.itm");
  equal(unwrap(resolveAsset(index, PACKAGE_ROOT, "tiles", "TILES/default.tst")), "tiles/default.tst");
});

test("subfolder references resolve", () => {
  const index = createAssetIndex(PACKAGE_PATHS);
  equal(unwrap(resolveAsset(index, PACKAGE_ROOT, "boards", "Village/Shop.BRD")), "boards/village/shop.brd");
  equal(unwrap(resolveAsset(index, PACKAGE_ROOT, "boards", "village\\shop.brd")), "boards/village/shop.brd");
});

test("a package ignores the project path; a game folder inserts it", () => {
  const game = createAssetIndex(GAME_PATHS);
  const asPackage = createAssetIndex(PACKAGE_PATHS);
  equal(unwrap(resolveAsset(asPackage, PACKAGE_ROOT, "boards", "inn.brd")), "boards/inn.brd");
  equal(
    unwrap(resolveAsset(game, folderRoot, "boards", "inn.brd")),
    "game/demo/boards/inn.brd",
  );
  // A trailing or leading separator on the project path changes nothing.
  equal(
    unwrap(resolveAsset(game, { kind: "game", projectPath: "/demo/" }, "boards", "inn.brd")),
    "game/demo/boards/inn.brd",
  );
  // The package key is not in the game-folder index, and vice versa.
  equal(resolveAsset(game, folderRoot, "boards", "main.gam").ok, false);
  equal(resolveAsset(asPackage, PACKAGE_ROOT, "boards", "game/demo/inn.brd").ok, false);
});

test("a reference with no matching entry is a located failure citing §1.5", () => {
  const index = createAssetIndex(PACKAGE_PATHS);
  const error = failureOf(resolveAsset(index, PACKAGE_ROOT, "boards", "missing.brd"));
  equal(error.section, "format-spec §1.5");
  equal(error.offset, 0);
  equal(error.message, 'asset "Boards/missing.brd" is not in the index (missing asset)');
});

test("an empty index resolves nothing", () => {
  const index = createAssetIndex([]);
  const error = failureOf(resolveAsset(index, PACKAGE_ROOT, "boards", "inn.brd"));
  equal(error.section, "format-spec §1.5");
});

test("odd references never throw and never resolve", () => {
  const index = createAssetIndex(PACKAGE_PATHS);
  const references: readonly string[] = [
    "",
    "..",
    "../Boards/inn.brd",
    "..\\..\\etc\\passwd",
    "/etc/passwd",
    "C:\\windows\\system32\\evil.brd",
    "a\u0000b.brd",
    "\\",
    "Boards/",
    "Boards/../../main.gam",
  ];
  for (const reference of references) {
    const result = resolveAsset(index, PACKAGE_ROOT, "boards", reference);
    equal(result.ok, false, `expected "${reference}" not to resolve`);
    if (!result.ok) {
      equal(result.error.section, "format-spec §1.5");
    }
  }
});

test("assetKey folds separators and case; the index keeps the host's order", () => {
  equal(assetKey("A\\B\\C.TXT"), "a/b/c.txt");
  equal(assetKey("a/b/c.txt"), "a/b/c.txt");
  const index = createAssetIndex(GAME_PATHS);
  deepEqual(index.paths, GAME_PATHS);
  equal(index.keys.length, GAME_PATHS.length);
  for (let i = 0; i < GAME_PATHS.length; i += 1) {
    equal(index.keys[i], foldPath(GAME_PATHS[i] as string));
  }
  equal(index.byKey.size, GAME_PATHS.length);
});

test("two paths that fold to the same key share one lookup", () => {
  const index = createAssetIndex(["Boards/inn.brd", "boards/INN.BRD"]);
  equal(index.keys[0], index.keys[1]);
  equal(index.byKey.size, 1);
  equal(unwrap(resolveAsset(index, PACKAGE_ROOT, "boards", "Inn.Brd")), "boards/inn.brd");
});

test("a game folder accepts both stored forms of the project path", () => {
  const index = createAssetIndex(["Game/demo/Boards/start.brd"]);
  for (const projectPath of ["Game\\demo\\", "demo", "game/demo"]) {
    const root: AssetRoot = { kind: "game", projectPath };
    equal(
      unwrap(resolveAsset(index, root, "boards", "start.brd")),
      "game/demo/boards/start.brd",
      projectPath,
    );
  }
  // A package root ignores the project path and looks the reference up at the
  // package root (§13).
  const asPackage = createAssetIndex(["Boards/start.brd"]);
  equal(unwrap(resolveAsset(asPackage, PACKAGE_ROOT, "boards", "start.brd")), "boards/start.brd");
});
