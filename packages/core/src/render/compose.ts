/**
 * The board compositor (AD-29): a board plus a view become an ordered draw list.
 *
 * One function, `composeBoard`, is the only place a board is turned into
 * commands, so the runner's frame, the editor's canvas and a `viewBrd` preview
 * cannot drift apart (AD-29). It decides *order and geometry*; it resolves no
 * paths and reads no pixels, which is why the caller supplies a resolver for the
 * board's tile references (format-spec §1.6, AD-5).
 *
 * What it draws today: the background colour, then every tile layer in order,
 * cell by cell, skipping the cells that hold no tile. Board images, sprites and
 * their z-order, under-vector promotion, animation, shading and the debug
 * overlays are the entries that follow, and each says so in its own ticket.
 */

import { boardGrid, type Board } from "../formats/board/model.ts";
import { TRANSPARENT_RGB } from "../formats/tileset/tileset.ts";
import type { DrawCommand, TexRef } from "../ports/draw.ts";

/** A tile's pixel size (format-spec §3.1). */
export type TileSize = {
  /** Width in pixels. */
  readonly width: number;
  /** Height in pixels. */
  readonly height: number;
};

/** What to draw of a board: the tile geometry and which layers (AD-29). */
export type BoardView = {
  /**
   * The tile's stored size (what the reader kept) and its drawn size. The two
   * differ for the 16×16 tileset details, which are drawn doubled once per
   * tileset (format-spec §3.1; the cache and the projection are entry 3's).
   */
  readonly tile: {
    readonly source: TileSize;
    readonly drawn: TileSize;
  };
  /** Layer numbers to draw, or `null` for every layer the board has. */
  readonly layers: readonly number[] | null;
};

/**
 * Resolve a board LUT entry (`default.tst12`, format-spec §1.6) to a texture.
 * `null` means the reference is unusable, and the cell is skipped: a missing
 * tileset is a normal condition (AD-5), not a reason to fail a frame.
 */
export type TileRefResolver = (reference: string) => TexRef | null;

/** Compose a board's background and tile layers into ordered commands (AD-29). */
export function composeBoard(board: Board, view: BoardView, resolve: TileRefResolver): DrawCommand[] {
  const colour = board.properties.backgroundColour;
  const commands: DrawCommand[] = [{ kind: "fill", rgb: { r: colour.r, g: colour.g, b: colour.b } }];
  const grid = boardGrid(board.sizeX, board.sizeY, board.coordType);
  const cells = grid.width * grid.height;
  const wanted = view.layers;
  for (let layer = 1; layer <= board.sizeL; layer += 1) {
    if (wanted !== null && !wanted.includes(layer)) {
      continue;
    }
    const base = (layer - 1) * cells;
    for (let y = 1; y <= grid.height; y += 1) {
      for (let x = 1; x <= grid.width; x += 1) {
        const index = board.tileMatrix[base + (y - 1) * grid.width + (x - 1)] ?? 0;
        if (index <= 0) {
          continue;
        }
        const reference = board.lut[index] ?? "";
        if (reference === "") {
          continue;
        }
        const texture = resolve(reference);
        if (texture === null) {
          continue;
        }
        commands.push({
          kind: "blit",
          source: texture,
          src: { x: 0, y: 0, w: view.tile.source.width, h: view.tile.source.height },
          dst: {
            x: (x - 1) * view.tile.drawn.width,
            y: (y - 1) * view.tile.drawn.height,
            w: view.tile.drawn.width,
            h: view.tile.drawn.height,
          },
          // The tileset's own transparent key, tested on the untinted source
          // (format-spec §15, RND-A1); the tint is the shading entry's to sum.
          key: { r: TRANSPARENT_RGB.r, g: TRANSPARENT_RGB.g, b: TRANSPARENT_RGB.b },
          tint: { r: 0, g: 0, b: 0 },
          alpha: 255,
          blend: "normal",
          iso2d: false,
        });
      }
    }
  }
  return commands;
}
