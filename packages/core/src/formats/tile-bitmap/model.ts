/**
 * The tile-bitmap model and its constants
 * (`docs/spec/formats/tiles.md#tile-bitmap-tbm`, docs/spec/formats/tiles.md#tile-bitmap-tbm).
 *
 * A `.tbm` is a rectangular picture made of tiles, each cell carrying its own
 * additive tint. `width` and `height` are **inclusive upper bounds** like every
 * other count (`docs/spec/formats/README.md#counts-are-usually-upper-bounds`, `docs/spec/formats/tiles.md#tile-bitmap-tbm`): a stored `width` means columns `0..width`,
 * so the grid holds `(width + 1) × (height + 1)` cells, x outer and y inner. Only
 * the cells with `x < width` and `y < height` are drawn; "the extra row and column
 * must still be written and read" (`docs/spec/formats/tiles.md#tile-bitmap-tbm`).
 *
 * The model keeps the bounds as stored — `-1` included, which means none — every
 * stored cell including the padding row and column, each cell's tile reference
 * verbatim (resolution is the resolver's job, `docs/spec/formats/README.md#tile-references`) and its three tints verbatim,
 * and any bytes after the last cell as `residue`, so a file that is read and
 * written without changes comes back byte for byte (`docs/spec/formats/README.md#bytes-after-the-last-documented-field`, AD-18).
 */

/** The magic every tile bitmap starts with (`docs/spec/formats/tiles.md#tile-bitmap-tbm`). */
export const TILE_BITMAP_MAGIC = "TK3 TILEBITMAP";

/** The major version the 3.x editor writes; the engine ignores it (docs/spec/formats/tiles.md#tile-bitmap-tbm). */
export const TILE_BITMAP_MAJOR = 3;

/** The minor version the 3.x editor writes; the engine ignores it (docs/spec/formats/tiles.md#tile-bitmap-tbm). */
export const TILE_BITMAP_MINOR = 0;

/**
 * The format specification section the reader, the writer and the core decoder implement
 * (G7). It is cited as `docs/spec/formats/tiles.md#tile-bitmap-tbm` (ADR 0007
 * decision 4).
 */
export const TILE_BITMAP_SECTION = "docs/spec/formats/tiles.md#tile-bitmap-tbm";

/**
 * One cell of the `(width + 1) × (height + 1)` grid
 * (`docs/spec/formats/tiles.md#tile-bitmap-tbm`).
 */
export interface TileBitmapCell {
  /**
   * The tile reference, kept **verbatim** — `name.tstN`, `name.isoN`, `name.gph`,
   * `name.tan`, a legacy `\` sub-folder path, or the empty string for an empty
   * cell (`docs/spec/formats/README.md#tile-references`). The reader never resolves it.
   */
  readonly tile: string;
  /** The red tint added to the tile; the documented range is −255…255 (`docs/spec/formats/tiles.md#tile-bitmap-tbm`). */
  readonly r: number;
  /** The green tint added to the tile; the documented range is −255…255 (`docs/spec/formats/tiles.md#tile-bitmap-tbm`). */
  readonly g: number;
  /** The blue tint added to the tile; the documented range is −255…255 (`docs/spec/formats/tiles.md#tile-bitmap-tbm`). */
  readonly b: number;
}

/** A parsed tile bitmap (`docs/spec/formats/tiles.md#tile-bitmap-tbm`). */
export interface TileBitmap {
  /** The magic string, e.g. `"TK3 TILEBITMAP"` (`docs/spec/formats/tiles.md#tile-bitmap-tbm`). */
  readonly magic: string;
  /** The major version as stored; informational only (`docs/spec/formats/README.md#header-and-version`, `docs/spec/formats/tiles.md#tile-bitmap-tbm`). */
  readonly major: number;
  /** The minor version as stored; informational only (`docs/spec/formats/README.md#header-and-version`, `docs/spec/formats/tiles.md#tile-bitmap-tbm`). */
  readonly minor: number;
  /**
   * The stored `width` bound (`docs/spec/formats/README.md#counts-are-usually-upper-bounds`, `docs/spec/formats/tiles.md#tile-bitmap-tbm`): the drawn columns are
   * `0..width − 1` and the grid stores `width + 1` of them, so `-1` means none
   * and `0` means one column. Kept exactly as written.
   */
  readonly width: number;
  /** The stored `height` bound, read the same way as `width` (`docs/spec/formats/README.md#counts-are-usually-upper-bounds`, `docs/spec/formats/tiles.md#tile-bitmap-tbm`). */
  readonly height: number;
  /**
   * Every stored cell, in file order: x outer, y inner, so the cell at `(x, y)`
   * is `x × (height + 1) + y`. Its length is `(width + 1) × (height + 1)` for
   * non-negative bounds, padding row and column included; the writer derives the
   * bounds' consistency back from it.
   */
  readonly cells: readonly TileBitmapCell[];
  /**
   * Bytes after the last cell, kept so a write is byte-identical
   * (`docs/spec/formats/README.md#bytes-after-the-last-documented-field`). The layout defines no trailing data, so a non-empty residue is
   * reported as a warning rather than dropped.
   */
  readonly residue: Uint8Array;
}

/**
 * The cell at `(x, y)` of the grid, or `undefined` when the bitmap has no such
 * cell (an out-of-range, negative or non-integer coordinate, or a `x`/`y` inside
 * the padding row or column of a file whose bounds are negative).
 *
 * This is the one place the x-outer, y-inner file order is written down, so no
 * caller has to re-derive it; `(0, 0)` is the first cell of the file and
 * `(width, height)` the last one.
 */
export function tileBitmapCell(bitmap: TileBitmap, x: number, y: number): TileBitmapCell | undefined {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0) {
    return undefined;
  }
  const columns = bitmap.width < 0 ? 0 : bitmap.width + 1;
  const rows = bitmap.height < 0 ? 0 : bitmap.height + 1;
  if (x >= columns || y >= rows) {
    return undefined;
  }
  return bitmap.cells[x * rows + y];
}
