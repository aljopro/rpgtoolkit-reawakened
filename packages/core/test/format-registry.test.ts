// The core format registry of AD-31: the `AssetDecoder` interface, dispatch by
// file extension and by magic header, and the core decoders that wrap every
// landed reader.
//
// A custom decoder is registered over synthetic bytes to pin the dispatch the
// ticket's verify sentence names; every core decoder is then checked against its
// magic (or, for the tileset, its version bytes) so the header route cannot
// silently stop matching; and each core decoder is compared with its own reader
// on the same bytes, so the wrapping cannot drift.
import { test } from "node:test";
import { deepEqual, equal, throws } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ANIMATION_MAGIC,
  BATTLE_BACKGROUND_MAGIC,
  BinaryReader,
  boardLayout,
  BOARD_MAGIC,
  CHARACTER_MAGIC,
  CORE_DECODERS,
  CORE_REGISTRY,
  createAssetIndex,
  createAssetRegistry,
  decodeTexture,
  ENEMY_MAGIC,
  ITEM_MAGIC,
  MAIN_MAGIC,
  ok as okResult,
  PACKAGE_ROOT,
  readAnimation,
  readBattleBackground,
  readBoard,
  readCharacter,
  readEnemy,
  readItem,
  readMainFile,
  readSpecialMove,
  TILE_BITMAP_MAGIC,
  SPECIAL_MOVE_MAGIC,
  STATUS_EFFECT_MAGIC,
  readTileset,
  readTileBitmap,
  readStatusEffect,
  FONT_MAGIC,
  SINGLE_TILE_MAGIC,
  TILE_ANIMATION_MAGIC,
  readLegacyFont,
  readSingleTile,
  readTileAnimation,
  type LegacyFont,
  type SingleTile,
  type TileAnimation,
  type AssetDecoder,
  type AssetResolver,
  type CoreFormatId,
  type Result,
  type Tileset,
} from "../src/index.ts";

/** Unwrap a result the test expects to succeed. */
function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`expected ok, got: ${result.error.message}`);
  }
  return result.value;
}

/** The ASCII bytes of `text`, for building a synthetic magic header. */
function asciiBytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    out[i] = text.charCodeAt(i);
  }
  return out;
}

/** A decode context with no project behind it: nothing to resolve. */
const EMPTY_RESOLVER: AssetResolver = { index: createAssetIndex([]), root: PACKAGE_ROOT };

/** A decoder a host might register, over bytes no core reader knows. */
const CUSTOM: AssetDecoder<string> = {
  id: "custom",
  section: "docs/spec/formats/README.md#primitive-encoding",
  extensions: ["zzz"],
  detect: (header) => header.length > 0 && header[0] === 0x7f,
  decode: (bytes) => okResult(`custom ${bytes.length}`),
};

test("a registered decoder is dispatched by extension and by magic header", () => {
  const registry = createAssetRegistry();
  registry.register(CUSTOM);

  equal(registry.byExtension("zzz"), CUSTOM);
  equal(registry.byExtension("ZZZ"), CUSTOM, "the extension match folds case");
  equal(registry.byExtension("qqq"), undefined);

  const magic = new Uint8Array([0x7f, 0x01, 0x02]);
  equal(registry.byHeader(magic), CUSTOM, "the magic header finds it without an extension");
  equal(registry.byHeader(new Uint8Array([0x00, 0x7f])), undefined);
  equal(registry.byHeader(new Uint8Array(0)), undefined);

  equal(registry.resolve("zzz", new Uint8Array([0x00])), CUSTOM, "the extension resolves it");
  equal(registry.resolve("qqq", magic), CUSTOM, "the header resolves it without an extension");
  equal(registry.resolve("qqq", new Uint8Array([0x00])), undefined);
});

test("an extension match wins over the magic header", () => {
  const extensionDecoder: AssetDecoder = {
    id: "by-extension",
    section: "docs/spec/formats/README.md#primitive-encoding",
    extensions: ["aaa"],
    detect: () => false,
    decode: () => okResult(null),
  };
  const registry = createAssetRegistry([extensionDecoder, CUSTOM]);
  equal(registry.resolve("aaa", new Uint8Array([0x7f])), extensionDecoder);
});

test("registering a decoder twice, or an extension twice, throws", () => {
  const registry = createAssetRegistry([CUSTOM]);
  throws(() => registry.register(CUSTOM), /already registered/);
  throws(
    () => registry.register({ ...CUSTOM, id: "other" }),
    /extension "zzz", already claimed by "custom"/,
  );
  const competing: AssetDecoder = {
    id: "competing",
    section: "docs/spec/formats/README.md#primitive-encoding",
    extensions: ["aaa"],
    detect: () => false,
    decode: () => okResult(null),
  };
  registry.register(competing);
  throws(() => registry.register({ ...CUSTOM, id: "third", extensions: ["aaa"] }), /already claimed/);
});

test("register normalises case and refuses a dotted or empty extension", () => {
  const registry = createAssetRegistry();
  throws(() => registry.register({ ...CUSTOM, id: "dotted", extensions: [".zzz"] }), /bare, dotless/);
  throws(() => registry.register({ ...CUSTOM, id: "empty", extensions: [""] }), /bare, dotless/);

  const upper: AssetDecoder = { ...CUSTOM, id: "upper", extensions: ["ZZZ"] };
  registry.register(upper);
  equal(registry.byExtension("zzz"), upper, "an uppercase extension is stored lowercased");

  // A non-lowercase extension cannot slip past the duplicate check and shadow
  // the decoder that already owns the lowercased key.
  const pngUpper: AssetDecoder = {
    id: "png-upper",
    section: "docs/spec/formats/README.md#primitive-encoding",
    extensions: ["PNG"],
    detect: () => false,
    decode: () => okResult(null),
  };
  const pngLower: AssetDecoder = { ...pngUpper, id: "png-lower", extensions: ["png"] };
  const coreRegistry = createAssetRegistry([pngUpper]);
  throws(() => coreRegistry.register(pngLower), /extension "png", already claimed by "png-upper"/);
});

/** Each core decoder and a header its own format starts with. */
const CORE_HEADERS: ReadonlyArray<readonly [CoreFormatId, Uint8Array]> = [
  ["gam", asciiBytes(MAIN_MAGIC)],
  ["board", asciiBytes(BOARD_MAGIC)],
  ["tileset", new Uint8Array([0x14, 0x00])],
  ["tile-bitmap", asciiBytes(TILE_BITMAP_MAGIC)],
  ["animation", asciiBytes(ANIMATION_MAGIC)],
  ["character", asciiBytes(CHARACTER_MAGIC)],
  ["item", asciiBytes(ITEM_MAGIC)],
  ["enemy", asciiBytes(ENEMY_MAGIC)],
  ["special-move", asciiBytes(SPECIAL_MOVE_MAGIC)],
  ["status-effect", asciiBytes(STATUS_EFFECT_MAGIC)],
  ["battle-background", asciiBytes(BATTLE_BACKGROUND_MAGIC)],
  ["single-tile", asciiBytes(SINGLE_TILE_MAGIC)],
  ["tile-animation", asciiBytes(TILE_ANIMATION_MAGIC)],
  ["font", asciiBytes(FONT_MAGIC)],
  ["image", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  ["image", new Uint8Array([0x42, 0x4d, 0x36, 0x00])],
  ["image", asciiBytes("GIF89a")],
];

test("the core registry claims each core decoder's extensions and magic header", () => {
  for (const [id, decoder] of Object.entries(CORE_DECODERS) as ReadonlyArray<
    readonly [CoreFormatId, AssetDecoder]
  >) {
    equal(decoder.id, id, "the key and the decoder id agree");
    equal(decoder.section.startsWith("docs/spec/"), true, `${id} cites its format specification page`);
    for (const extension of decoder.extensions) {
      equal(CORE_REGISTRY.byExtension(extension), decoder, extension);
      equal(CORE_REGISTRY.byExtension(extension.toUpperCase()), decoder, extension);
    }
  }
  for (const [id, header] of CORE_HEADERS) {
    equal(CORE_REGISTRY.byHeader(header), CORE_DECODERS[id], id);
  }
  equal(CORE_REGISTRY.byExtension("nope"), undefined);
  equal(CORE_REGISTRY.byHeader(new Uint8Array([0x00, 0x01, 0x02])), undefined);
});

test("the core registry holds exactly the core decoders", () => {
  const byId = (a: AssetDecoder, b: AssetDecoder): number => (a.id === b.id ? 0 : a.id < b.id ? -1 : 1);
  deepEqual([...CORE_REGISTRY.decoders].sort(byId), Object.values(CORE_DECODERS).sort(byId));
});

test("the board decoder's version dispatch picks the branch a stored minor takes", () => {
  equal(boardLayout(0), "obsolete");
  equal(boardLayout(1), "obsolete");
  equal(boardLayout(2), "pre-vector");
  equal(boardLayout(3), "pre-vector");
  equal(boardLayout(4), "vector");
  equal(boardLayout(9), "vector");
});

/**
 * A committed, independently authored tileset (ticket 2.22): a detail-4 `.tst`
 * written from the docs/spec/formats/tiles.md#tileset-tst-and-isometric-tileset-iso layout by `tools/fixtures/author/generate.mjs`, which
 * imports no core code. Feeding the decoder a fixture rather than `writeTileset`
 * output keeps this test from passing by sharing the writer's primitives.
 */
const testDir = dirname(fileURLToPath(import.meta.url));
const TILESET_BYTES = new Uint8Array(readFileSync(join(testDir, "fixtures", "authored", "detail4.tst")));

/** Each core decoder's own reader, called directly on the same bytes. */
const READERS: ReadonlyArray<readonly [CoreFormatId, (bytes: Uint8Array) => Result<unknown>]> = [
  ["gam", (bytes) => readMainFile(new BinaryReader(bytes))],
  ["board", (bytes) => readBoard(new BinaryReader(bytes))],
  ["tileset", (bytes) => readTileset(bytes)],
  ["tile-bitmap", (bytes) => readTileBitmap(new BinaryReader(bytes))],
  ["animation", (bytes) => readAnimation(new BinaryReader(bytes))],
  ["character", (bytes) => readCharacter(new BinaryReader(bytes))],
  ["item", (bytes) => readItem(new BinaryReader(bytes))],
  ["enemy", (bytes) => readEnemy(new BinaryReader(bytes))],
  ["special-move", (bytes) => readSpecialMove(new BinaryReader(bytes))],
  ["status-effect", (bytes) => readStatusEffect(new BinaryReader(bytes))],
  ["battle-background", (bytes) => readBattleBackground(new BinaryReader(bytes))],
  ["single-tile", (bytes) => readSingleTile(bytes)],
  ["tile-animation", (bytes) => readTileAnimation(new BinaryReader(bytes))],
  ["font", (bytes) => readLegacyFont(bytes)],
  ["image", (bytes) => decodeTexture(bytes)],
];

/**
 * Bytes that reach each decoder's first fields and then stop, plus one committed
 * authored tileset fixture. None is a valid pre-vector board, so the board row's
 * direct reader (`readBoard`, the docs/spec/formats/board.md#vector-layout-minor-4-and-later layout) is the same branch the decoder
 * takes; the docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector branch is covered by the dump's own pre-vector case.
 */
const SAMPLES: readonly Uint8Array[] = [
  new Uint8Array(0),
  new Uint8Array([0x00]),
  asciiBytes("RPGTLKIT BOARD"),
  asciiBytes("TK3 TILEBITMAP"),
  new Uint8Array([0x14, 0x00, 0x00, 0x00, 0x00, 0x00]),
  new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
  new Uint8Array([0x42, 0x4d, 0x36, 0x00, 0x00, 0x00]),
  asciiBytes("not a game file at all; just some bytes to fail on"),
  TILESET_BYTES,
  new Uint8Array(readFileSync(join(testDir, "fixtures", "authored", "gif-still87a.gif"))),
  asciiBytes(SINGLE_TILE_MAGIC),
  asciiBytes(TILE_ANIMATION_MAGIC),
  asciiBytes(FONT_MAGIC),
];

test("every core decoder returns exactly what its own reader returns", () => {
  for (const [id, reader] of READERS) {
    for (const bytes of SAMPLES) {
      deepEqual(
        CORE_DECODERS[id].decode(bytes, EMPTY_RESOLVER),
        reader(bytes),
        `${id} on ${bytes.length} bytes`,
      );
    }
  }
});

test("the tileset decoder returns the authored fixture's documented model", () => {
  const model = unwrap(CORE_DECODERS.tileset.decode(TILESET_BYTES, EMPTY_RESOLVER)) as Tileset;
  // The fixture's header alone says detail 4 with two tiles(docs/spec/formats/tiles.md#tileset-tst-and-isometric-tileset-iso) — values no
  // writer of ours produced.
  equal(model.version, 20);
  equal(model.detail.code, 4);
  equal(model.tiles.length, 2);
  deepEqual(model, unwrap(readTileset(TILESET_BYTES)));
});

test("a custom decoder decodes its own bytes through the registry", () => {
  const registry = createAssetRegistry([CUSTOM]);
  const decoder = registry.resolve("zzz", new Uint8Array(0));
  equal(decoder, CUSTOM);
  const bytes = new Uint8Array([0x7f, 0x01, 0x02, 0x03]);
  deepEqual(unwrap(CUSTOM.decode(bytes, EMPTY_RESOLVER)), "custom 4");
});
