/**
 * Reading a pre-vector board (docs/spec/formats/board.md#version-dispatch,
 * docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector).
 *
 * Pure (G2): it consumes a `BinaryReader` the caller positioned and never
 * touches a host. A wrong magic, an unsupported minor, a 2.x text board or a
 * short file is a `Result` carrying a located `FormatError`, never a throw
 * (AD-18).
 *
 * Pre-vector boards are the 3.0.x binary boards of minors 2 and 3
 * (docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector):
 * object positions are tile coordinates and collision is a per-tile type, so
 * the tile matrix carries a shade and a tile type alongside each lookup-table
 * index. `convertPreVectorBoard` (in `pre-vector-convert.ts`) turns the model
 * this reader returns into the vector board model of docs/spec/formats/board.md#vector-layout-minor-4-and-later. Every slot is kept,
 * empty ones included, so program and sprite indices stay stable.
 *
 * The declared grid is bounded by `BOARD_MAX_CELLS` (the vector layout's size
 * limit also applies to the pre-vector grid), the same limit the vector reader
 * applies: a run marker expands up to 32,768 cells from four bytes, so without
 * the bound a crafted file of a few kilobytes could make the reader reserve
 * gigabytes (AD-17, untrusted input).
 */

import { err, ok, type Result } from "../result.ts";
import { BinaryReader } from "../binary/reader.ts";
import type { Colorref } from "../binary/color.ts";
import {
  BOARD_DETECT_OFFSET,
  BOARD_MAGIC,
  BOARD_MAX_CELLS,
  BOARD_SECTION,
  BOARD_VECTOR_MINOR,
  type BoardLinks,
} from "./model.ts";

/** The section this reader implements (G7, docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector). */
export const PRE_VECTOR_SECTION = "docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector";

/** The lowest minor the pre-vector layout covers. */
export const PRE_VECTOR_MINOR_MIN = 2;

/** The highest minor the pre-vector layout covers. */
export const PRE_VECTOR_MINOR_MAX = 3;

/** One expanded tile-matrix cell: its lookup-table index, shade and type(docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector). */
export interface PreVectorCell {
  /** The lookup-table index the cell shows (0 is the reserved "no tile" entry). */
  readonly lutIndex: number;
  /** Red tile shade, −255…+255 ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)). */
  readonly r: number;
  /** Green tile shade. */
  readonly g: number;
  /** Blue tile shade. */
  readonly b: number;
  /** The legacy per-tile type ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector): 0 normal, 1 solid, … */
  readonly tileType: number;
}

/**
 * One stored tile-matrix record ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)): a bare cell
 * (`marker` false) or a run marker whose `count` cells share one index, shade
 * and type (`marker` true). Runs may wrap rows and layers.
 */
export interface PreVectorRun {
  /** The lookup-table index the record's cells show. */
  readonly lutIndex: number;
  /** How many consecutive cells the record covers (at least 1). */
  readonly count: number;
  /** True when the file stored a negative run-length marker rather than a bare index. */
  readonly marker: boolean;
  /** Red tile shade. */
  readonly r: number;
  /** Green tile shade. */
  readonly g: number;
  /** Blue tile shade. */
  readonly b: number;
  /** The legacy per-tile type ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)). */
  readonly tileType: number;
}

/** One pre-vector program slot ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)); positions are tiles. */
export interface PreVectorProgram {
  /** The `.prg` file name, or inline RPGCode; empty for an empty slot. */
  readonly file: string;
  /** Program X in tile coordinates. */
  readonly x: number;
  /** Program Y in tile coordinates. */
  readonly y: number;
  /** The tile layer the program sits on. */
  readonly layer: number;
  /** Unused graphic reference. */
  readonly graphic: string;
  /** 0 = always, 1 = conditional. */
  readonly activate: number;
  /** The variable that opens the activation condition (may carry a legacy suffix). */
  readonly initialVar: string;
  /** The variable that closes the activation condition (may carry a legacy suffix). */
  readonly finalVar: string;
  /** The value the initial variable must have. */
  readonly initialValue: string;
  /** The value the final variable must have. */
  readonly finalValue: string;
  /** Activation flags; docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector adds the stops-movement flag on conversion. */
  readonly activationType: number;
}

/** One pre-vector sprite slot ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)); positions are tiles. */
export interface PreVectorSprite {
  /** The `.itm`/`.tem` file; empty for an empty slot. */
  readonly file: string;
  /** Sprite X in tile coordinates. */
  readonly x: number;
  /** Sprite Y in tile coordinates. */
  readonly y: number;
  /** The tile layer the sprite draws on. */
  readonly layer: number;
  /** 0 = always, 1 = conditional. */
  readonly activate: number;
  /** The variable that opens the activation condition (may carry a legacy suffix). */
  readonly initialVar: string;
  /** The variable that closes the activation condition (may carry a legacy suffix). */
  readonly finalVar: string;
  /** The value the initial variable must have. */
  readonly initialValue: string;
  /** The value the final variable must have. */
  readonly finalValue: string;
  /** 0 = step-on, 1 = key-press. */
  readonly activationType: number;
  /** Overrides the item's own activation program. */
  readonly activationPrg: string;
  /** Overrides the item's own multitask program. */
  readonly multitaskPrg: string;
}

/** The unused day/night fields ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)). */
export interface PreVectorDayNight {
  /** The first unused `i16`. */
  readonly a: number;
  /** The second unused `i16`. */
  readonly b: number;
  /** The third unused `i16`. */
  readonly c: number;
  /** The unused trailing string. */
  readonly text: string;
}

/** A whole pre-vector board ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)). */
export interface PreVectorBoard {
  /** The stored magic, `"RPGTLKIT BOARD"` ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)). */
  readonly magic: string;
  /** The major version; informational only ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)). */
  readonly major: number;
  /** The minor version: 2 or 3 ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)). */
  readonly minor: number;
  /** The reserved registration `i16` ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)). */
  readonly registrationFlag: number;
  /** The reserved registration string ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)). */
  readonly registrationKey: string;
  /** Board width in tiles. */
  readonly sizeX: number;
  /** Board height in tiles. */
  readonly sizeY: number;
  /** Layer count, 1-based. */
  readonly sizeL: number;
  /** Start X in **tiles** ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)). */
  readonly startX: number;
  /** Start Y in **tiles**. */
  readonly startY: number;
  /** The start layer. */
  readonly startLayer: number;
  /** Whether the player may save on the board. */
  readonly disableSaving: number;
  /** The tile lookup table: `lutUpperBound + 1` entries, index 0 reserved(docs/spec/formats/README.md#counts-are-usually-upper-bounds, docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector. */
  readonly lut: readonly string[];
  /** The expanded tile matrix, layer-major then row-major (y outer, x inner). */
  readonly tileMatrix: readonly PreVectorCell[];
  /** The stored run-length encoding of the tile matrix. */
  readonly tileRuns: readonly PreVectorRun[];
  /** The background image (drawn as parallax on conversion, [pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)). */
  readonly backgroundImage: string;
  /** The unused foreground image. */
  readonly foregroundImage: string;
  /** The unused border image. */
  readonly borderImage: string;
  /** The background colour (a COLORREF, [pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)). */
  readonly backgroundColour: Colorref;
  /** The unused border colour. */
  readonly borderColour: Colorref;
  /** The ambient preset: 0 none, 1 mist, 2 dark, 3 water ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)). */
  readonly ambientPreset: number;
  /** The four edge links in file order North, South, East, West. */
  readonly links: BoardLinks;
  /** The encounter skill level. */
  readonly battleSkill: number;
  /** The `.bkg` battle background. */
  readonly battleBackground: string;
  /** Whether random battles happen. */
  readonly allowBattles: number;
  /** The unused day/night fields. */
  readonly dayNight: PreVectorDayNight;
  /** The eleven numeric constants 0…10 exposed to scripts ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)). */
  readonly constants: readonly number[];
  /** Loops while the player is on the board. */
  readonly backgroundMusic: string;
  /** The nine layer titles for indices 0…8. */
  readonly layerTitles: readonly string[];
  /** The program slots; positions are tiles ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)). */
  readonly programs: readonly PreVectorProgram[];
  /** Runs after the threads start, each time the board is entered. */
  readonly enterPrg: string;
  /** The reserved trailing string. */
  readonly reserved: string;
  /** The sprite slots; positions are tiles ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)). */
  readonly sprites: readonly PreVectorSprite[];
  /** Background thread programs; always empty for minor 2 ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)). */
  readonly threads: readonly string[];
  /** Coordinate system ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)); 0 for minor 2. */
  readonly coordType: number;
  /** Bytes after the last field, kept for the caller ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)). */
  readonly residue: Uint8Array;
}

/** A located error for a pre-vector board field (AD-18). */
function fail(offset: number, section: string, message: string, path?: string): Result<never> {
  return err({ ...(path === undefined ? {} : { path }), offset, section, message });
}

/** Read exactly `count` NUL-terminated strings ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)). */
function readStrings(reader: BinaryReader, count: number): Result<string[]> {
  const strings: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const value = reader.str();
    if (!value.ok) {
      return value;
    }
    strings.push(value.value);
  }
  return ok(strings);
}

/** Read the `r, g, b, tileType` tail that follows a cell's lookup index ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)). */
function readCellTail(reader: BinaryReader): Result<{ r: number; g: number; b: number; tileType: number }> {
  const r = reader.i16();
  if (!r.ok) {
    return r;
  }
  const g = reader.i16();
  if (!g.ok) {
    return g;
  }
  const b = reader.i16();
  if (!b.ok) {
    return b;
  }
  const tileType = reader.i8();
  if (!tileType.ok) {
    return tileType;
  }
  return ok({ r: r.value, g: g.value, b: b.value, tileType: tileType.value });
}

/** Read one program slot of the pre-vector layout (file, x, y, layer, graphic, activate, …). */
function readProgram(reader: BinaryReader): Result<PreVectorProgram> {
  const file = reader.str();
  if (!file.ok) {
    return file;
  }
  const x = reader.i16();
  if (!x.ok) {
    return x;
  }
  const y = reader.i16();
  if (!y.ok) {
    return y;
  }
  const layer = reader.i16();
  if (!layer.ok) {
    return layer;
  }
  const graphic = reader.str();
  if (!graphic.ok) {
    return graphic;
  }
  const activate = reader.i16();
  if (!activate.ok) {
    return activate;
  }
  const initialVar = reader.str();
  if (!initialVar.ok) {
    return initialVar;
  }
  const finalVar = reader.str();
  if (!finalVar.ok) {
    return finalVar;
  }
  const initialValue = reader.str();
  if (!initialValue.ok) {
    return initialValue;
  }
  const finalValue = reader.str();
  if (!finalValue.ok) {
    return finalValue;
  }
  const activationType = reader.i16();
  if (!activationType.ok) {
    return activationType;
  }
  return ok({
    file: file.value,
    x: x.value,
    y: y.value,
    layer: layer.value,
    graphic: graphic.value,
    activate: activate.value,
    initialVar: initialVar.value,
    finalVar: finalVar.value,
    initialValue: initialValue.value,
    finalValue: finalValue.value,
    activationType: activationType.value,
  });
}

/** Read one sprite slot of the pre-vector layout (file, x, y, layer, activate, …). */
function readSprite(reader: BinaryReader): Result<PreVectorSprite> {
  const file = reader.str();
  if (!file.ok) {
    return file;
  }
  const x = reader.i16();
  if (!x.ok) {
    return x;
  }
  const y = reader.i16();
  if (!y.ok) {
    return y;
  }
  const layer = reader.i16();
  if (!layer.ok) {
    return layer;
  }
  const activate = reader.i16();
  if (!activate.ok) {
    return activate;
  }
  const initialVar = reader.str();
  if (!initialVar.ok) {
    return initialVar;
  }
  const finalVar = reader.str();
  if (!finalVar.ok) {
    return finalVar;
  }
  const initialValue = reader.str();
  if (!initialValue.ok) {
    return initialValue;
  }
  const finalValue = reader.str();
  if (!finalValue.ok) {
    return finalValue;
  }
  const activationType = reader.i16();
  if (!activationType.ok) {
    return activationType;
  }
  const activationPrg = reader.str();
  if (!activationPrg.ok) {
    return activationPrg;
  }
  const multitaskPrg = reader.str();
  if (!multitaskPrg.ok) {
    return multitaskPrg;
  }
  return ok({
    file: file.value,
    x: x.value,
    y: y.value,
    layer: layer.value,
    activate: activate.value,
    initialVar: initialVar.value,
    finalVar: finalVar.value,
    initialValue: initialValue.value,
    finalValue: finalValue.value,
    activationType: activationType.value,
    activationPrg: activationPrg.value,
    multitaskPrg: multitaskPrg.value,
  });
}

/**
 * Read the tile matrix ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)): `sizeL` layers, each `sizeY` rows of `sizeX`
 * cells (z, y, x). A non-negative `i16` is one cell's lookup index; a negative
 * value is a run marker — `count = -value` cells share the following index,
 * shade and type — and runs may wrap rows and layers. A run that would overrun
 * the grid is clamped and reported as a warning, so the expanded matrix always
 * covers exactly `sizeX × sizeY × sizeL` cells.
 */
function readTileMatrix(
  reader: BinaryReader,
  totalCells: number,
  warnings: string[],
): Result<{ cells: PreVectorCell[]; runs: PreVectorRun[] }> {
  const cells: PreVectorCell[] = [];
  const runs: PreVectorRun[] = [];
  while (cells.length < totalCells) {
    const token = reader.i16();
    if (!token.ok) {
      return token;
    }
    if (token.value >= 0) {
      const tail = readCellTail(reader);
      if (!tail.ok) {
        return tail;
      }
      const cell: PreVectorCell = {
        lutIndex: token.value,
        r: tail.value.r,
        g: tail.value.g,
        b: tail.value.b,
        tileType: tail.value.tileType,
      };
      cells.push(cell);
      runs.push({ ...cell, count: 1, marker: false });
      continue;
    }
    const count = -token.value;
    const index = reader.i16();
    if (!index.ok) {
      return index;
    }
    if (index.value < 0) {
      return fail(
        reader.offset - 2,
        PRE_VECTOR_SECTION,
        `tile matrix run marker is followed by a negative LUT index ${index.value}`,
        reader.path,
      );
    }
    const tail = readCellTail(reader);
    if (!tail.ok) {
      return tail;
    }
    const covered = Math.min(count, totalCells - cells.length);
    if (covered < count) {
      warnings.push(
        `tile matrix run covers ${count} cells but only ${covered} remained in the ${totalCells}-cell grid ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector))`,
      );
    }
    const cell: PreVectorCell = {
      lutIndex: index.value,
      r: tail.value.r,
      g: tail.value.g,
      b: tail.value.b,
      tileType: tail.value.tileType,
    };
    runs.push({ ...cell, count: covered, marker: true });
    for (let i = 0; i < covered; i += 1) {
      cells.push(cell);
    }
  }
  return ok({ cells, runs });
}

/** Read a pre-vector board from [version dispatch](../../../../../../docs/spec/formats/board.md#version-dispatch) and the [pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector). */
export function readPreVectorBoard(reader: BinaryReader): Result<PreVectorBoard> {
  const start = reader.offset;
  const warnings: string[] = [];
  const detection = reader.isBinaryAt(start + BOARD_DETECT_OFFSET);

  if (detection.ok && !detection.value) {
    const offset = start + BOARD_DETECT_OFFSET;
    return fail(
      offset,
      PRE_VECTOR_SECTION,
      `${BOARD_MAGIC}: unsupported 2.x line-oriented text board (byte at offset ${offset} is non-NUL); only the binary pre-vector layout is implemented`,
      reader.path,
    );
  }

  const header = reader.header();
  if (!header.ok) {
    return header;
  }
  if (header.value.magic !== BOARD_MAGIC) {
    return fail(
      start,
      PRE_VECTOR_SECTION,
      `not a board: magic is "${header.value.magic}", expected "${BOARD_MAGIC}"`,
      reader.path,
    );
  }
  const versionAt = reader.offset - 2;
  if (header.value.minor < PRE_VECTOR_MINOR_MIN) {
    return fail(
      versionAt,
      BOARD_SECTION,
      `obsolete board minor version ${header.value.minor}: the pre-vector layout needs minor ${PRE_VECTOR_MINOR_MIN}…${PRE_VECTOR_MINOR_MAX} ([version dispatch](../../../../../../docs/spec/formats/board.md#version-dispatch))`,
      reader.path,
    );
  }
  if (header.value.minor > PRE_VECTOR_MINOR_MAX) {
    return fail(
      versionAt,
      BOARD_SECTION,
      `board minor version ${header.value.minor} is not a pre-vector board: minor >= ${BOARD_VECTOR_MINOR} uses the [vector layout](../../../../../../docs/spec/formats/board.md#vector-layout-minor-4-and-later)`,
      reader.path,
    );
  }
  const minor = header.value.minor;

  const registrationFlag = reader.i16();
  if (!registrationFlag.ok) {
    return registrationFlag;
  }
  const registrationKey = reader.str();
  if (!registrationKey.ok) {
    return registrationKey;
  }

  const sizeX = reader.i16();
  if (!sizeX.ok) {
    return sizeX;
  }
  const sizeY = reader.i16();
  if (!sizeY.ok) {
    return sizeY;
  }
  const sizeL = reader.i16();
  if (!sizeL.ok) {
    return sizeL;
  }
  if (sizeX.value < 0 || sizeY.value < 0 || sizeL.value < 0) {
    return fail(
      reader.offset - 6,
      PRE_VECTOR_SECTION,
      `negative board dimensions ${sizeX.value}×${sizeY.value}×${sizeL.value}`,
      reader.path,
    );
  }
  // The [vector layout](../../../../../../docs/spec/formats/board.md#vector-layout-minor-4-and-later) "Size limits", applied to the [pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector) grid: the dimensions bound the tile
  // matrix, so an over-large declared cell count is refused here — before the
  // LUT or a single run is read or expanded — so a crafted file cannot make the
  // reader reserve gigabytes (AD-17).
  const totalCells = sizeX.value * sizeY.value * sizeL.value;
  if (totalCells > BOARD_MAX_CELLS) {
    return fail(
      reader.offset - 6,
      PRE_VECTOR_SECTION,
      `the tile matrix would hold ${totalCells} cells (${sizeX.value}×${sizeY.value}×${sizeL.value}) but the limit is ${BOARD_MAX_CELLS}`,
      reader.path,
    );
  }

  const startX = reader.i16();
  if (!startX.ok) {
    return startX;
  }
  const startY = reader.i16();
  if (!startY.ok) {
    return startY;
  }
  const startLayer = reader.i16();
  if (!startLayer.ok) {
    return startLayer;
  }
  const disableSaving = reader.i16();
  if (!disableSaving.ok) {
    return disableSaving;
  }

  const lutBound = reader.readUpperBound();
  if (!lutBound.ok) {
    return lutBound;
  }
  const lut = readStrings(reader, lutBound.value);
  if (!lut.ok) {
    return lut;
  }

  const matrix = readTileMatrix(reader, totalCells, warnings);
  if (!matrix.ok) {
    return matrix;
  }

  const backgroundImage = reader.str();
  if (!backgroundImage.ok) {
    return backgroundImage;
  }
  const foregroundImage = reader.str();
  if (!foregroundImage.ok) {
    return foregroundImage;
  }
  const borderImage = reader.str();
  if (!borderImage.ok) {
    return borderImage;
  }
  const backgroundColour = reader.color();
  if (!backgroundColour.ok) {
    return backgroundColour;
  }
  const borderColour = reader.color();
  if (!borderColour.ok) {
    return borderColour;
  }
  const ambientPreset = reader.i16();
  if (!ambientPreset.ok) {
    return ambientPreset;
  }

  const linkStrings = readStrings(reader, 4);
  if (!linkStrings.ok) {
    return linkStrings;
  }

  const battleSkill = reader.i16();
  if (!battleSkill.ok) {
    return battleSkill;
  }
  const battleBackground = reader.str();
  if (!battleBackground.ok) {
    return battleBackground;
  }
  const allowBattles = reader.i16();
  if (!allowBattles.ok) {
    return allowBattles;
  }

  const dayA = reader.i16();
  if (!dayA.ok) {
    return dayA;
  }
  const dayB = reader.i16();
  if (!dayB.ok) {
    return dayB;
  }
  const dayC = reader.i16();
  if (!dayC.ok) {
    return dayC;
  }
  const dayText = reader.str();
  if (!dayText.ok) {
    return dayText;
  }

  const constants: number[] = [];
  for (let i = 0; i < 11; i += 1) {
    const value = reader.i16();
    if (!value.ok) {
      return value;
    }
    constants.push(value.value);
  }

  const backgroundMusic = reader.str();
  if (!backgroundMusic.ok) {
    return backgroundMusic;
  }
  const layerTitles = readStrings(reader, 9);
  if (!layerTitles.ok) {
    return layerTitles;
  }

  const programBound = reader.readUpperBound();
  if (!programBound.ok) {
    return programBound;
  }
  const programs: PreVectorProgram[] = [];
  for (let i = 0; i < programBound.value; i += 1) {
    const program = readProgram(reader);
    if (!program.ok) {
      return program;
    }
    programs.push(program.value);
  }

  const enterPrg = reader.str();
  if (!enterPrg.ok) {
    return enterPrg;
  }
  const reserved = reader.str();
  if (!reserved.ok) {
    return reserved;
  }

  const spriteBound = reader.readUpperBound();
  if (!spriteBound.ok) {
    return spriteBound;
  }
  const sprites: PreVectorSprite[] = [];
  for (let i = 0; i < spriteBound.value; i += 1) {
    const sprite = readSprite(reader);
    if (!sprite.ok) {
      return sprite;
    }
    sprites.push(sprite.value);
  }

  let threads: string[] = [];
  let coordType = 0;
  if (minor >= 3) {
    const threadBound = reader.readUpperBound("i32");
    if (!threadBound.ok) {
      return threadBound;
    }
    const names = readStrings(reader, threadBound.value);
    if (!names.ok) {
      return names;
    }
    threads = names.value;
    const coord = reader.i8();
    if (!coord.ok) {
      return coord;
    }
    coordType = coord.value;
  } else if (reader.remaining === 1) {
    // Minor-2 `coordType` — Reawakened rule (R-04)
    // (docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector):
    // the field is absent from the minor-2 layout and the two original programs
    // disagree (the engine never reads it, the editor reads a byte). We follow
    // the editor, but only when **exactly one byte remains** after the sprite
    // list — most corpus boards end exactly there, and those that carry a byte
    // carry a `0x00` (2D). A board with two or more trailing bytes reads none
    // and reports them as residue, unchanged.
    const coord = reader.i8();
    if (!coord.ok) {
      return coord;
    }
    coordType = coord.value;
  }

  const residue = reader.readBytes(reader.remaining);
  if (!residue.ok) {
    return residue;
  }
  if (residue.value.length > 0) {
    warnings.push(
      `${residue.value.length} trailing byte(s) after the pre-vector board were kept as residue ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector))`,
    );
  }

  const linkList = linkStrings.value;
  return ok(
    {
      magic: header.value.magic,
      major: header.value.major,
      minor,
      registrationFlag: registrationFlag.value,
      registrationKey: registrationKey.value,
      sizeX: sizeX.value,
      sizeY: sizeY.value,
      sizeL: sizeL.value,
      startX: startX.value,
      startY: startY.value,
      startLayer: startLayer.value,
      disableSaving: disableSaving.value,
      lut: lut.value,
      tileMatrix: matrix.value.cells,
      tileRuns: matrix.value.runs,
      backgroundImage: backgroundImage.value,
      foregroundImage: foregroundImage.value,
      borderImage: borderImage.value,
      backgroundColour: backgroundColour.value,
      borderColour: borderColour.value,
      ambientPreset: ambientPreset.value,
      links: {
        north: linkList[0] ?? "",
        south: linkList[1] ?? "",
        east: linkList[2] ?? "",
        west: linkList[3] ?? "",
      },
      battleSkill: battleSkill.value,
      battleBackground: battleBackground.value,
      allowBattles: allowBattles.value,
      dayNight: { a: dayA.value, b: dayB.value, c: dayC.value, text: dayText.value },
      constants,
      backgroundMusic: backgroundMusic.value,
      layerTitles: layerTitles.value,
      programs,
      enterPrg: enterPrg.value,
      reserved: reserved.value,
      sprites,
      threads,
      coordType,
      residue: residue.value,
    },
    warnings,
  );
}
