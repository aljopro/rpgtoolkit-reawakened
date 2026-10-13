/**
 * The board model and its constants (format-spec §4, §4.1, §4.2).
 *
 * A board is one scene: a 3-D grid of tiles plus free images, collision and
 * trigger geometry, sprites, lighting and per-board settings (§4). The vector
 * layout of §4.2 is the only one this model covers; every slot is kept —
 * empty ones included — so that indices into the tile lookup table, the
 * programs and the sprites stay stable, and the writer reproduces the bytes
 * `readBoard` consumed exactly (AD-18).
 */

import type { Colorref } from "../binary/color.ts";

/** The magic every binary board starts with (format-spec §4, §1.3). */
export const BOARD_MAGIC = "RPGTLKIT BOARD";

/** The first minor version that uses the §4.2 vector layout (format-spec §4.1). */
export const BOARD_VECTOR_MINOR = 4;

/** The byte §4.1 inspects to tell a 2.x text board from a binary one. */
export const BOARD_DETECT_OFFSET = 14;

/** The version-dispatch section the reader applies (G7, format-spec §4.1). */
export const BOARD_SECTION = "format-spec §4.1";

/** The vector-layout section the reader and writer implement (G7, format-spec §4.2). */
export const BOARD_LAYOUT_SECTION = "format-spec §4.2";

/**
 * The `coordType` bit that turns the stored tile grid into a square of
 * `sizeX + sizeY` per side (format-spec §4.2, §5).
 */
export const COORD_ISO_ROTATED = 2;

/**
 * The most cells a board's tile matrix may declare (format-spec §4.2, "Size
 * limits"): the effective grid times `sizeL`. The §4.8 pre-vector grid is the
 * same measure — `sizeX × sizeY × sizeL` — and its reader applies this bound
 * too. A reader refuses a board above this, so that a run-length marker — four
 * bytes for up to 32,768 cells — cannot make it reserve gigabytes, and a writer
 * refuses a board the reader would refuse.
 */
export const BOARD_MAX_CELLS = 4_194_304;

/** The stored grid dimensions of a board's tile matrix (format-spec §4.2, §5). */
export interface BoardGrid {
  /** Cells across, per layer. */
  readonly width: number;
  /** Rows down, per layer. */
  readonly height: number;
}

/**
 * The grid the tile matrix and the shading layers are stored on
 * (format-spec §4.2, §5): `sizeX × sizeY` normally, and
 * `(sizeX + sizeY) × (sizeX + sizeY)` for iso-rotated boards, where the
 * matrix is stored on the rotated axes.
 */
export function boardGrid(sizeX: number, sizeY: number, coordType: number): BoardGrid {
  if ((coordType & COORD_ISO_ROTATED) !== 0) {
    const side = sizeX + sizeY;
    return { width: side, height: side };
  }
  return { width: sizeX, height: sizeY };
}

/** An `(x, y)` pixel position (format-spec §4.2). */
export interface BoardPoint {
  /** X in pixels. */
  readonly x: number;
  /** Y in pixels. */
  readonly y: number;
}

/** An additive RGB triple (format-spec §4.2, §4.5); channels are signed. */
export interface BoardRgb {
  /** Red offset, −255…+255 for ambient values. */
  readonly r: number;
  /** Green offset. */
  readonly g: number;
  /** Blue offset. */
  readonly b: number;
}

/**
 * One entry of the stored tile matrix (format-spec §4.2).
 *
 * A non-negative stored `i16` is one cell holding that LUT index; a negative
 * one is a run-length marker whose `count` (the negated value) cells all use
 * the following `i16` as their LUT index. Runs may wrap rows and layers. The
 * `marker` flag records which of the two encodings the file used, so the
 * writer can reproduce the bytes exactly (AD-18) even when a run covers one
 * cell.
 */
export interface BoardTileRun {
  /** The lookup-table index these cells show. */
  readonly lutIndex: number;
  /** How many consecutive cells the run covers (at least 1). */
  readonly count: number;
  /** True when the file stored a negative run-length marker rather than a bare index. */
  readonly marker: boolean;
}

/**
 * One shading record (format-spec §4.2): `runCount` cells share one additive
 * RGB shade. A `runCount` of 0 or 1 covers one cell, which is how the model
 * keeps the stored value verbatim.
 */
export interface BoardShadeRecord {
  /** The stored `runCount`; 0 and 1 both mean a single cell. */
  readonly runCount: number;
  /** Red shade, −255…+255 (format-spec §4.5). */
  readonly r: number;
  /** Green shade. */
  readonly g: number;
  /** Blue shade. */
  readonly b: number;
}

/**
 * One tile shading layer (format-spec §4.2): it tints `castLayer` and every
 * layer below it, and its records walk the grid row-major (y outer, x inner).
 */
export interface BoardShadeLayer {
  /** The highest tile layer this shade layer applies to. */
  readonly castLayer: number;
  /** The records, in file order; they cover the grid row-major. */
  readonly records: readonly BoardShadeRecord[];
}

/** One precomputed light (format-spec §4.2). */
export interface BoardLight {
  /** The tile layer the light sits on. */
  readonly layer: number;
  /** 0 = elliptical spotlight, 1 = linear gradient, 2 = clipped gradient. */
  readonly type: number;
  /** Spotlights have 3 nodes, gradients 2 (format-spec §4.2). */
  readonly nodes: readonly BoardPoint[];
  /** Spotlight: centre and edge; gradient: two ends (format-spec §4.2). */
  readonly colours: readonly BoardRgb[];
}

/**
 * One collision / under / stairs / waypoint vector (format-spec §4.2, §4.4).
 */
export interface BoardVector {
  /** The polygon/polyline points, in pixels. */
  readonly points: readonly BoardPoint[];
  /**
   * Meaning by `type` (format-spec §4.4): an *under* vector uses bit flags
   * (1 = include the board background image, 2 = apply to all layers below,
   * 4 = trigger on sprite frame intersection); a *stairs* vector stores the
   * destination layer number.
   */
  readonly attributes: number;
  /** The stored closed flag: non-zero (legacy `-1`) = closed, 0 = open polyline. */
  readonly closed: number;
  /** The tile layer the vector applies to. */
  readonly layer: number;
  /** 1 = solid, 2 = under, 8 = stairs, 16 = waypoint, 0 = passable (§4.4). */
  readonly type: number;
  /** The stored handle string. */
  readonly handle: string;
}

/** One program trigger region (format-spec §4.2). */
export interface BoardProgram {
  /** A `.prg` file name, or a line of inline RPGCode (format-spec §4.2). */
  readonly program: string;
  /** Unused graphic reference (format-spec §4.2). */
  readonly graphic: string;
  /** The variable that opens the activation condition. */
  readonly initialVar: string;
  /** The value the initial variable must have. */
  readonly initialValue: string;
  /** The variable that closes the activation condition. */
  readonly finalVar: string;
  /** The value the final variable must have. */
  readonly finalValue: string;
  /** 0 = always, 1 = conditional (format-spec §4.2). */
  readonly activate: number;
  /** Bit flags: step-on / key-press, repeat, stops movement (format-spec §4.4). */
  readonly activationType: number;
  /** Repeat distance in pixels (format-spec §4.2). */
  readonly repeatDistance: number;
  /** The tile layer the region sits on. */
  readonly layer: number;
  /** The region polygon, in pixels. */
  readonly points: readonly BoardPoint[];
  /** The stored closed flag: non-zero (legacy `-1`) = closed. */
  readonly closed: number;
  /** Reserved handle string (format-spec §4.2). */
  readonly handle: string;
}

/** One sprite slot on the board (format-spec §4.2). */
export interface BoardSprite {
  /** The `.itm`/`.tem` file, or empty for an empty slot. */
  readonly itemFile: string;
  /** Overrides the item's own activation program. */
  readonly activationPrg: string;
  /** Overrides the item's own multitask program. */
  readonly multitaskPrg: string;
  /** The variable that opens the activation condition. */
  readonly initialVar: string;
  /** The value the initial variable must have. */
  readonly initialValue: string;
  /** The variable that closes the activation condition. */
  readonly finalVar: string;
  /** The value the final variable must have. */
  readonly finalValue: string;
  /** The variable that opens the loading condition. */
  readonly loadingVar: string;
  /** The value the loading variable must have. */
  readonly loadingValue: string;
  /** 0 = always, 1 = conditional (format-spec §4.2). */
  readonly activate: number;
  /** 0 = step-on, 1 = key-press (format-spec §4.2, §4.4). */
  readonly activationType: number;
  /** X in pixels; the anchor is the frame's bottom-centre (format-spec §4.3). */
  readonly x: number;
  /**
   * Y in pixels; the editor display adds a historical +8 px vertical offset on
   * isometric boards (format-spec §4.3).
   */
  readonly y: number;
  /** The tile layer the sprite draws on. */
  readonly layer: number;
  /** Always −1 in legacy files (format-spec §4.2). */
  readonly reserved: number;
}

/** One free image on the board (format-spec §4.2). */
export interface BoardImage {
  /** The image file reference. */
  readonly file: string;
  /** Left edge in pixels. */
  readonly left: number;
  /** Top edge in pixels. */
  readonly top: number;
  /** The tile layer the image draws on. */
  readonly layer: number;
  /** 0 = normal, 1 = parallax, 2 = stretch (format-spec §4.2, §4.3). */
  readonly drawType: number;
  /** The transparent colour (unit ignored: RGB only, format-spec §1.1). */
  readonly transparent: Colorref;
  /** Written as 100 by legacy writers; intended for translucency (format-spec §4.2). */
  readonly reserved: number;
}

/**
 * The four edge links, in the file order **North, South, East, West**
 * (format-spec §4.2): each is a `.brd`, a `.prg`, or empty.
 */
export interface BoardLinks {
  /** Walk off the north edge to reach this reference. */
  readonly north: string;
  /** The south edge. */
  readonly south: string;
  /** The east edge. */
  readonly east: string;
  /** The west edge. */
  readonly west: string;
}

/** The board's start position, in pixels (format-spec §4.2). */
export interface BoardStart {
  /** Start X in pixels; defaults to 64 when ≤ 0 (format-spec §4.2). */
  readonly x: number;
  /** Start Y in pixels; defaults to 64 when ≤ 0 (format-spec §4.2). */
  readonly y: number;
  /** The start layer (1-based); defaults to 1 when ≤ 0 (format-spec §4.2). */
  readonly layer: number;
}

/**
 * The trailing board properties (format-spec §4.2): background image and draw
 * type, background colour and music, the entry program, the battle settings,
 * the additive ambience and the start position.
 */
export interface BoardProperties {
  /** Drawn below layer 1. */
  readonly backgroundImage: string;
  /** 0 = normal, 1 = parallax, 2 = stretch. */
  readonly backgroundDrawType: number;
  /** The background colour (a COLORREF, format-spec §1.1). */
  readonly backgroundColour: Colorref;
  /** Loops while the player is on the board. */
  readonly backgroundMusic: string;
  /** Runs after the threads start, each time the board is entered. */
  readonly enterPrg: string;
  /** The `.bkg` battle background. */
  readonly battleBackground: string;
  /** The encounter skill level. */
  readonly battleSkill: number;
  /** Whether random battles happen. */
  readonly allowBattles: number;
  /** Non-zero disables the main menu's Save option on this board (engine-features E-18). */
  readonly disableSaving: number;
  /** Additive board ambience, −255…+255 (format-spec §4.5). */
  readonly ambient: BoardRgb;
  /** Where the player appears when the board loads. */
  readonly start: BoardStart;
}

/** A whole vector board (format-spec §4.2). */
export interface Board {
  /** The stored magic, e.g. `"RPGTLKIT BOARD"` (format-spec §1.3, §4). */
  readonly magic: string;
  /** The major version; informational only (format-spec §1.4). */
  readonly major: number;
  /** The minor version; at least 4 for this layout (format-spec §1.4, §4.1). */
  readonly minor: number;
  /** Board width in tiles (format-spec §4.2). */
  readonly sizeX: number;
  /** Board height in tiles (format-spec §4.2). */
  readonly sizeY: number;
  /** Layer count, 1-based (format-spec §4.2). */
  readonly sizeL: number;
  /** Coordinate-system bit flags (format-spec §4.2, §5). */
  readonly coordType: number;
  /**
   * The tile lookup table: exactly `lutUpperBound + 1` entries, index 0 the
   * reserved "no tile" entry (an empty string). Every slot is kept so the
   * indices in the tile matrix stay stable (format-spec §4.2, §1.2).
   */
  readonly lut: readonly string[];
  /**
   * The decompressed tile matrix: one LUT index per cell, flattened
   * layer-major then row-major (y outer, x inner), so `sizeL × width × height`
   * entries — the runs of `tileRuns` expanded, runs wrapping rows and layers
   * as §4.2 allows.
   */
  readonly tileMatrix: readonly number[];
  /**
   * The stored run-length encoding of the tile matrix, kept so the writer is
   * byte-identical (AD-18). `tileMatrix` is `tileRuns` expanded.
   */
  readonly tileRuns: readonly BoardTileRun[];
  /** The tile shading layers (format-spec §4.2). */
  readonly shadeLayers: readonly BoardShadeLayer[];
  /** The precomputed lights (format-spec §4.2). */
  readonly lights: readonly BoardLight[];
  /** The collision / under / stairs / waypoint geometry (format-spec §4.2). */
  readonly vectors: readonly BoardVector[];
  /** The program trigger regions; empty slots are kept (format-spec §4.2). */
  readonly programs: readonly BoardProgram[];
  /** The sprites; empty slots are kept (format-spec §4.2). */
  readonly sprites: readonly BoardSprite[];
  /** The free images (format-spec §4.2). */
  readonly images: readonly BoardImage[];
  /** Background thread programs started when the board loads (format-spec §4.2). */
  readonly threads: readonly string[];
  /** Values exposed to scripts as `constant[i]` (format-spec §4.2). */
  readonly constants: readonly string[];
  /** Layer titles indexed 0…sizeL, exposed as `boardTitle[i]` (format-spec §4.2). */
  readonly layerTitles: readonly string[];
  /** The four edge links (format-spec §4.2). */
  readonly links: BoardLinks;
  /** The trailing properties (format-spec §4.2). */
  readonly properties: BoardProperties;
  /**
   * Bytes after the last field, kept so the writer re-emits them unchanged
   * (AD-18). The spec defines no trailing data, so a non-empty residue is
   * reported as a warning rather than dropped.
   */
  readonly residue: Uint8Array;
}
