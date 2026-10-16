/**
 * The animated-tile model of `docs/spec/formats/tiles.md#animated-tile-tan`.
 *
 * An animated tile is a cycle of tile references playing continuously on a board.
 * Stored as a binary file starting with `RPGTLKIT TILEANIM`.
 */

export const TILE_ANIMATION_MAGIC = "RPGTLKIT TILEANIM";
export const TILE_ANIMATION_MAJOR = 2;
export const TILE_ANIMATION_MINOR = 0;
export const TILE_ANIMATION_SECTION = "docs/spec/formats/tiles.md#animated-tile-tan";

/** The valid speed range (docs/spec/formats/tiles.md#animated-tile-tan). */
export const TILE_ANIMATION_MIN_SPEED = 1;
export const TILE_ANIMATION_MAX_SPEED = 200;

export interface TileAnimation {
  /** ASCII magic string: "RPGTLKIT TILEANIM". */
  readonly magic: string;
  /** Major version (2). */
  readonly major: number;
  /** Minor version (0). */
  readonly minor: number;
  /**
   * The editor slider speed: 1..200.
   * Frame delay is `1000 / speed` milliseconds (200 → 5 ms, 1 → 1 s).
   * 0 is invalid (division by zero).
   */
  readonly speed: number;
  /** Exact count of frame strings. */
  readonly frameCount: number;
  /**
   * Stored tile references for each frame in sequence.
   * Empty string denotes an empty frame slot.
   */
  readonly frames: readonly string[];
  /** Trailing bytes beyond the last frame string, if any (docs/spec/formats/README.md#bytes-after-the-last-documented-field). */
  readonly residue?: Uint8Array;
}
