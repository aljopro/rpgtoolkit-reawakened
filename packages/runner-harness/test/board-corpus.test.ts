// The tracer path on the fetched sample games (epic-board-rendering entry 1):
// each board's own `.brd` file plus the tilesets its LUT references render to a
// PNG whose draw and pixel hashes are pinned in `golden/board-2d/corpus.json`,
// with the PNGs beside it for a person to review (assumption A1).
// `GOLDEN_RECORD=1 pnpm test` rewrites both. With the corpus not fetched this
// file contributes no tests, the same way the format tests behave.
import { deepEqual, equal } from "node:assert/strict";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { test } from "node:test";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assetKey,
  BinaryReader,
  classifyImageReference,
  expandTileToRgba,
  readBoard,
  readTileset,
  tileDimensions,
  type Board,
  type Surface,
  type Tileset,
} from "@tk-reawakened/core";
import { renderFrame, type BoardFixture, type FixtureTexture } from "../src/board-host.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const legacyRoot = join(repoRoot, "fixtures", "legacy");
const goldenPath = join(repoRoot, "golden", "board-2d", "corpus.json");
const pngDir = join(repoRoot, "golden", "board-2d", "corpus");

/** Every `.brd` under one fetched game, in a stable order. */
function collectBoards(game: string): string[] {
  const root = join(legacyRoot, game);
  if (!existsSync(root)) {
    return [];
  }
  return readdirSync(join(root, "Boards"))
    .filter((name) => name.endsWith(".brd"))
    .sort()
    .map((name) => join(root, "Boards", name));
}

/** The game folder's `Tiles/` files by ASCII-folded name (format-spec §1.5). */
function tileFiles(game: string): Record<string, string> {
  const root = join(legacyRoot, game, "Tiles");
  const files: Record<string, string> = {};
  if (!existsSync(root)) {
    return files;
  }
  for (const name of readdirSync(root)) {
    files[name.replace(/[A-Z]/g, (letter) => letter.toLowerCase())] = join(root, name);
  }
  return files;
}

/**
 * A fixture for one board: the tilesets its LUT references, read once, with a
 * texture per tile the board actually uses. Tiles are drawn at their stored size
 * here; the 16×16 details double in entry 3.
 */
function fixtureFor(board: Board, game: string): BoardFixture {
  const files = tileFiles(game);
  const tilesets: Record<string, Tileset> = {};
  const textures: Record<string, FixtureTexture> = {};
  let tile = { width: 32, height: 32 };
  for (const reference of board.lut) {
    const classified = classifyImageReference(reference);
    if (classified.kind !== "tile") {
      continue;
    }
    const path = files[`${classified.tileset.replace(/[A-Z]/g, (l) => l.toLowerCase())}`];
    if (path === undefined) {
      continue;
    }
    const tileset = tilesets[path] ?? readTileset(readFileSync(path), path);
    if (!("ok" in tileset) || !tileset.ok) {
      continue;
    }
    tilesets[path] = tileset.value;
    const rgba = expandTileToRgba(tileset.value, classified.index - 1);
    if (!rgba.ok) {
      continue;
    }
    const size = tileDimensions(tileset.value.detail);
    tile = size;
    textures[reference] = {
      ref: { asset: assetKey(relative(repoRoot, path)), tile: classified.index },
      pixels: { width: size.width, height: size.height, rgba: rgba.value } satisfies Surface,
    };
  }
  return {
    board,
    view: { tile: { source: tile, drawn: tile }, layers: null },
    // The sample games render at 640×480 (format-spec §15, RND-A9).
    viewport: { width: 640, height: 480 },
    textures,
  };
}

const boards = ["demo", "Basic"].flatMap((game) => collectBoards(game).map((path) => ({ game, path })));
const recorded: Record<string, { draw: string; pixel: string }> = existsSync(goldenPath)
  ? (JSON.parse(readFileSync(goldenPath, "utf8")) as Record<string, { draw: string; pixel: string }>)
  : {};
const fresh: Record<string, { draw: string; pixel: string }> = {};

for (const { game, path } of boards) {
  const key = relative(legacyRoot, path);

  test(`the sample board ${key} renders to its pinned hash`, () => {
    const read = readBoard(new BinaryReader(readFileSync(path), path), path);
    if (!read.ok) {
      throw new Error(`expected ${key} to parse, got: ${read.error.message}`);
    }
    const frame = renderFrame(fixtureFor(read.value, game));
    fresh[key] = { draw: frame.drawHash, pixel: frame.pixelHash };

    if (process.env.GOLDEN_RECORD === "1") {
      mkdirSync(pngDir, { recursive: true });
      writeFileSync(join(pngDir, `${key.split("/").join("-")}.png`), frame.png);
      return;
    }

    equal(frame.drawList.width, 640);
    equal(frame.drawList.height, 480);
    equal(frame.surface.rgba.length, 640 * 480 * 4);
    deepEqual(recorded[key], fresh[key]);
  });
}

if (boards.length > 0) {
  test("every fetched board is pinned in golden/board-2d/corpus.json", () => {
    if (process.env.GOLDEN_RECORD === "1") {
      mkdirSync(dirname(goldenPath), { recursive: true });
      writeFileSync(goldenPath, `${JSON.stringify(fresh, null, 2)}\n`);
      return;
    }
    deepEqual(Object.keys(recorded).sort(), boards.map(({ path }) => relative(legacyRoot, path)).sort());
  });
}
