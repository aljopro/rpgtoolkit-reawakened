/**
 * Single tile model (`docs/spec/formats/tiles.md#single-tile-gph`).
 *
 * A text file storing a single 32×32 or 16×16 tile in column-major order
 * (x outer, y inner), uncompressed or run-length compressed.
 */

export const SINGLE_TILE_MAGIC = "RPGTLKIT TILE";
export const SINGLE_TILE_MAJOR = 2;
export const SINGLE_TILE_MINOR = 0;
export const SINGLE_TILE_SECTION = "docs/spec/formats/tiles.md#single-tile-gph";

export interface SingleTile {
  readonly magic: string;
  readonly major: number;
  readonly minor: number;
  /** Detail level: 1, 3, 5 (32×32) or 2, 4, 6 (16×16). */
  readonly detail: number;
  /** 0 = uncompressed, 1 = run-length compressed. */
  readonly compression: number;
  readonly width: number;
  readonly height: number;
  /**
   * The pixel values in column-major order (x outer, y inner).
   * Total length is `width × height`.
   * `-1` = transparent.
   * Details 1 and 2: COLORREF integer (`R + 256·G + 65536·B`).
   * Details 3 and 5: DOS palette index (0..255).
   * Details 4 and 6: COLORREF or DOS palette index.
   */
  readonly pixels: readonly number[];
}
