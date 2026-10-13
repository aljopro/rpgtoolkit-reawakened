// The board compositor (AD-29): the background colour first, then every tile
// layer in order, cells row-major, skipping the reserved "no tile" index, an
// empty LUT entry and a reference the resolver cannot place. The command's key
// is the tileset's own transparent triple (format-spec §15, RND-A1) and its
// source rectangle is the tile's stored size while its destination is the drawn
// size, which is how the 16×16 details double (format-spec §3.1).
import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import { composeBoard } from "../src/index.ts";
import type { AssetKey, Board, BoardView, TexRef } from "../src/index.ts";

/** A 2D board of `sizeX × sizeY` cells over `layers` layers, with a colour background. */
function boardOf(sizeX: number, sizeY: number, layers: readonly (readonly number[])[], lut: readonly string[]): Board {
  const tileMatrix: number[] = [];
  for (const layer of layers) {
    for (let y = 0; y < sizeY; y += 1) {
      for (let x = 0; x < sizeX; x += 1) {
        tileMatrix.push(layer[x + y * sizeX] ?? 0);
      }
    }
  }
  return {
    magic: "RPGTLKIT BOARD",
    major: 2,
    minor: 4,
    sizeX,
    sizeY,
    sizeL: layers.length,
    coordType: 0,
    lut: ["", ...lut],
    tileMatrix,
    tileRuns: [],
    shadeLayers: [],
    lights: [],
    vectors: [],
    programs: [],
    sprites: [],
    images: [],
    threads: [],
    constants: [],
    layerTitles: [],
    links: { north: "", south: "", east: "", west: "" },
    properties: {
      backgroundImage: "",
      backgroundDrawType: 0,
      backgroundColour: { r: 5, g: 6, b: 7 },
      backgroundMusic: "",
      enterPrg: "",
      battleBackground: "",
      battleSkill: 0,
      allowBattles: 0,
      disableSaving: 0,
      ambient: { r: 0, g: 0, b: 0 },
      start: { x: 1, y: 1, layer: 1 },
    },
    residue: new Uint8Array(0),
  };
}

/** A view drawing 32×32 tiles, every layer unless `layers` is given. */
function viewOf(overrides: Partial<BoardView> = {}): BoardView {
  return { tile: { source: { width: 32, height: 32 }, drawn: { width: 32, height: 32 } }, layers: null, ...overrides };
}

/** A resolver that maps every `tiles/a.tstN` reference to tile `N`. */
function resolver(): (reference: string) => TexRef | null {
  return (reference) => {
    const index = Number(reference.replace("tiles/a.tst", ""));
    if (!Number.isFinite(index) || index <= 0) {
      return null;
    }
    return { asset: "tiles/a.tst" as AssetKey, tile: index };
  };
}

test("the background colour comes first, then layer 1 then layer 2, row-major", () => {
  const board = boardOf(2, 1, [[1, 2], [3, 0]], ["tiles/a.tst1", "tiles/a.tst2", "tiles/a.tst3"]);

  const commands = composeBoard(board, viewOf(), resolver());

  deepEqual(commands, [
    { kind: "fill", rgb: { r: 5, g: 6, b: 7 } },
    {
      kind: "blit",
      source: { asset: "tiles/a.tst", tile: 1 },
      src: { x: 0, y: 0, w: 32, h: 32 },
      dst: { x: 0, y: 0, w: 32, h: 32 },
      key: { r: 0, g: 1, b: 2 },
      tint: { r: 0, g: 0, b: 0 },
      alpha: 255,
      blend: "normal",
      iso2d: false,
    },
    {
      kind: "blit",
      source: { asset: "tiles/a.tst", tile: 2 },
      src: { x: 0, y: 0, w: 32, h: 32 },
      dst: { x: 32, y: 0, w: 32, h: 32 },
      key: { r: 0, g: 1, b: 2 },
      tint: { r: 0, g: 0, b: 0 },
      alpha: 255,
      blend: "normal",
      iso2d: false,
    },
    {
      kind: "blit",
      source: { asset: "tiles/a.tst", tile: 3 },
      src: { x: 0, y: 0, w: 32, h: 32 },
      dst: { x: 0, y: 0, w: 32, h: 32 },
      key: { r: 0, g: 1, b: 2 },
      tint: { r: 0, g: 0, b: 0 },
      alpha: 255,
      blend: "normal",
      iso2d: false,
    },
  ]);
});

test("a layer filter draws only the layers it names", () => {
  const board = boardOf(1, 1, [[1], [2]], ["tiles/a.tst1", "tiles/a.tst2"]);

  const only = composeBoard(board, viewOf({ layers: [2] }), resolver());

  equal(only.length, 2);
  deepEqual(only[1]?.kind === "blit" ? only[1].source : null, { asset: "tiles/a.tst", tile: 2 });
});

test("the reserved no-tile index, an empty entry and an unplaceable reference are all skipped", () => {
  const board = boardOf(3, 1, [[0, 1, 2]], ["tiles/a.tst1", ""]);

  const commands = composeBoard(board, viewOf(), resolver());

  // Only the cell holding LUT index 1 draws: index 0 is "no tile", index 2's
  // entry is empty, and the resolver would refuse an unknown reference anyway.
  equal(commands.length, 2);
  deepEqual(commands[1]?.kind === "blit" ? commands[1].source : null, { asset: "tiles/a.tst", tile: 1 });

  const nothing = composeBoard(boardOf(1, 1, [[1]], ["tiles/a.tst1"]), viewOf(), () => null);
  equal(nothing.length, 1);
  equal(nothing[0]?.kind, "fill");
});

test("a 16×16 stored tile drawn at 32×32 keeps its stored source rectangle", () => {
  const board = boardOf(1, 1, [[1]], ["tiles/a.tst1"]);

  const commands = composeBoard(
    board,
    viewOf({ tile: { source: { width: 16, height: 16 }, drawn: { width: 32, height: 32 } } }),
    resolver(),
  );

  const blit = commands[1];
  if (blit?.kind !== "blit") {
    throw new Error("expected a blit command");
  }
  deepEqual(blit.src, { x: 0, y: 0, w: 16, h: 16 });
  deepEqual(blit.dst, { x: 0, y: 0, w: 32, h: 32 });
});
