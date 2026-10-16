/**
 * Reading a vector board (format-spec §4.1 version dispatch, §4.2 layout).
 *
 * Pure (G2): it consumes a `BinaryReader` the caller positioned and never
 * touches a host. Bad data, a wrong magic, an unsupported version or a short
 * file is a `Result` carrying a located `FormatError`, never a throw (AD-18).
 *
 * Version dispatch is exact (§4.1): a 2.x text board (non-zero byte at offset
 * 14) and minors 0–1 are refused, minors 2–3 are refused with a pointer at the
 * pre-vector layout of §4.8 — which ticket 2.8 converts, not this reader — and
 * minor ≥ 4 uses the §4.2 vector layout. Every slot is returned, empty ones
 * included, so table indices stay stable; the reader consumes the whole file,
 * keeping any trailing bytes as `residue`, so a caller sees `remaining === 0`.
 */

import { err, ok, type Result } from "../result.ts";
import { BinaryReader } from "../binary/reader.ts";
import {
  BOARD_DETECT_OFFSET,
  BOARD_MAGIC,
  BOARD_LAYOUT_SECTION,
  BOARD_MAX_CELLS,
  BOARD_SECTION,
  BOARD_VECTOR_MINOR,
  boardGrid,
  createEmptyBoard,
  type Board,
  type BoardImage,
  type BoardLight,
  type BoardPoint,
  type BoardProgram,
  type BoardProperties,
  type BoardRgb,
  type BoardShadeLayer,
  type BoardShadeRecord,
  type BoardSprite,
  type BoardTileRun,
  type BoardVector,
} from "./model.ts";
import { readTextBoard } from "./text-reader.ts";
/** A located error for a board field (AD-18). */
function fail(offset: number, section: string, message: string, path?: string): Result<never> {
  return err({ ...(path === undefined ? {} : { path }), offset, section, message });
}

/** Read an upper bound of `i32` points: `i16` bound, then `i32 x, i32 y`. */
function readPoints(reader: BinaryReader): Result<BoardPoint[]> {
  const bound = reader.readUpperBound();
  if (!bound.ok) {
    return bound;
  }
  const points: BoardPoint[] = [];
  for (let i = 0; i < bound.value; i += 1) {
    const x = reader.i32();
    if (!x.ok) {
      return x;
    }
    const y = reader.i32();
    if (!y.ok) {
      return y;
    }
    points.push({ x: x.value, y: y.value });
  }
  return ok(points);
}

/** Read an `i16 r, i16 g, i16 b` triple (format-spec §4.2). */
function readRgb(reader: BinaryReader): Result<BoardRgb> {
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
  return ok({ r: r.value, g: g.value, b: b.value });
}

/** Read an upper bound of `i16` RGB triples (a light's colours, format-spec §4.2). */
function readColours(reader: BinaryReader): Result<BoardRgb[]> {
  const bound = reader.readUpperBound();
  if (!bound.ok) {
    return bound;
  }
  const colours: BoardRgb[] = [];
  for (let i = 0; i < bound.value; i += 1) {
    const colour = readRgb(reader);
    if (!colour.ok) {
      return colour;
    }
    colours.push(colour.value);
  }
  return ok(colours);
}

/** Read exactly `count` NUL-terminated strings (format-spec §4.2, §1.1). */
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

/**
 * Read the tile matrix of §4.2: `sizeL` layers, each `height` rows of `width`
 * cells, row-major within the layer. A non-negative `i16` is one cell's LUT
 * index; a negative value is a run marker — `count = -value` cells all use the
 * following `i16` as their index — and runs may wrap rows and layers. Returns
 * the decompressed one-index-per-cell grid and the stored runs (which match
 * byte for byte, AD-18).
 */
function readTileMatrix(
  reader: BinaryReader,
  totalCells: number,
): Result<{ matrix: number[]; runs: BoardTileRun[] }> {
  const matrix: number[] = [];
  const runs: BoardTileRun[] = [];
  while (matrix.length < totalCells) {
    const token = reader.i16();
    if (!token.ok) {
      return token;
    }
    if (token.value >= 0) {
      runs.push({ lutIndex: token.value, count: 1, marker: false });
      matrix.push(token.value);
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
        BOARD_LAYOUT_SECTION,
        `tile matrix run marker is followed by a negative LUT index ${index.value}`,
        reader.path,
      );
    }
    runs.push({ lutIndex: index.value, count, marker: true });
    for (let i = 0; i < count; i += 1) {
      matrix.push(index.value);
    }
  }
  return ok({ matrix, runs });
}

/** Read a board from `reader` (format-spec §4.1 dispatch, §4.2 layout). */
export function readBoard(reader: BinaryReader): Result<Board> {
  const start = reader.offset;

  if (reader.remaining === 0) {
    return fail(start, BOARD_SECTION, "unexpected end of data reading magic: need 1 byte(s), 0 remain", reader.path);
  }

  // §4.1 lists the detection byte first and the header second; the probe does
  // not move the cursor, so the header is read first and the detection checked
  // before any header error — a text board has no NUL-terminated magic to read.
  const header = reader.header();
  const detection = reader.isBinaryAt(start + BOARD_DETECT_OFFSET);
  const warnings: string[] = [];

  if (detection.ok && !detection.value) {
    const bytes = reader.readBytes(reader.remaining);
    if (!bytes.ok) {
      return bytes;
    }
    return readTextBoard(bytes.value, reader.path);
  }
  if (!header.ok) {
    return header;
  }
  if (header.value.magic !== BOARD_MAGIC) {
    return fail(
      start,
      BOARD_SECTION,
      `not a board: magic is "${header.value.magic}", expected "${BOARD_MAGIC}"`,
      reader.path,
    );
  }
  if (header.value.minor < BOARD_VECTOR_MINOR) {
    const section = BOARD_SECTION;
    const at = reader.offset - 2;
    if (header.value.minor >= 2) {
      return fail(
        at,
        section,
        `unsupported board minor version ${header.value.minor}: it stores the pre-vector layout of format-spec §4.8 (tile-coordinate objects and per-tile collision), which this reader does not convert — see ticket 2.8`,
        reader.path,
      );
    }
    return fail(
      at,
      section,
      `obsolete board minor version ${header.value.minor}: the vector layout needs minor >= ${BOARD_VECTOR_MINOR}`,
      reader.path,
    );
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
  const coordType = reader.i16();
  if (!coordType.ok) {
    return coordType;
  }

  // §4.2 "Size limits": the dimensions bound the tile matrix, so a negative
  // one is invalid and an over-large declared cell count is refused here —
  // before a single run is read or expanded — so a crafted file cannot make
  // the reader reserve gigabytes.
  const dimensionsOffset = reader.offset - 8;
  if (sizeX.value < 0 || sizeY.value < 0 || sizeL.value < 0) {
    return fail(
      dimensionsOffset,
      BOARD_LAYOUT_SECTION,
      `invalid negative board dimensions ${sizeX.value}×${sizeY.value}×${sizeL.value}`,
      reader.path,
    );
  }
  const grid = boardGrid(sizeX.value, sizeY.value, coordType.value);
  const cellsPerLayer = grid.width * grid.height;
  const totalCells = cellsPerLayer * sizeL.value;
  if (totalCells > BOARD_MAX_CELLS) {
    return fail(
      dimensionsOffset,
      BOARD_LAYOUT_SECTION,
      `the tile matrix would hold ${totalCells} cells (${grid.width}×${grid.height}×${sizeL.value}) but the limit is ${BOARD_MAX_CELLS}`,
      reader.path,
    );
  }

  const lutBound = reader.readUpperBound();
  if (!lutBound.ok) {
    return lutBound;
  }
  const lut = readStrings(reader, lutBound.value);
  if (!lut.ok) {
    return lut;
  }

  const tile = readTileMatrix(reader, totalCells);
  if (!tile.ok) {
    return tile;
  }
  if (tile.value.matrix.length > totalCells) {
    warnings.push(
      `tile matrix covers ${tile.value.matrix.length} cells but the ${grid.width}×${grid.height}×${sizeL.value} grid has ${totalCells} (format-spec §4.2)`,
    );
  }

  const shadeBound = reader.readUpperBound();
  if (!shadeBound.ok) {
    return shadeBound;
  }
  const shadeLayers: BoardShadeLayer[] = [];
  for (let layer = 0; layer < shadeBound.value; layer += 1) {
    const castLayer = reader.i32();
    if (!castLayer.ok) {
      return castLayer;
    }
    const records: BoardShadeRecord[] = [];
    let covered = 0;
    while (covered < cellsPerLayer) {
      const runCount = reader.i16();
      if (!runCount.ok) {
        return runCount;
      }
      const rgb = readRgb(reader);
      if (!rgb.ok) {
        return rgb;
      }
      records.push({
        runCount: runCount.value,
        r: rgb.value.r,
        g: rgb.value.g,
        b: rgb.value.b,
      });
      covered += runCount.value > 1 ? runCount.value : 1;
    }
    if (covered > cellsPerLayer) {
      warnings.push(
        `shade layer ${layer} covers ${covered} cells but the grid has ${cellsPerLayer} (format-spec §4.2)`,
      );
    }
    shadeLayers.push({ castLayer: castLayer.value, records });
  }

  const lightBound = reader.readUpperBound();
  if (!lightBound.ok) {
    return lightBound;
  }
  const lights: BoardLight[] = [];
  for (let i = 0; i < lightBound.value; i += 1) {
    const layer = reader.i32();
    if (!layer.ok) {
      return layer;
    }
    const type = reader.i32();
    if (!type.ok) {
      return type;
    }
    const nodes = readPoints(reader);
    if (!nodes.ok) {
      return nodes;
    }
    const colours = readColours(reader);
    if (!colours.ok) {
      return colours;
    }
    lights.push({ layer: layer.value, type: type.value, nodes: nodes.value, colours: colours.value });
  }

  const vectorBound = reader.readUpperBound();
  if (!vectorBound.ok) {
    return vectorBound;
  }
  const vectors: BoardVector[] = [];
  for (let i = 0; i < vectorBound.value; i += 1) {
    const points = readPoints(reader);
    if (!points.ok) {
      return points;
    }
    const scalars = readVectorScalars(reader);
    if (!scalars.ok) {
      return scalars;
    }
    const handle = reader.str();
    if (!handle.ok) {
      return handle;
    }
    vectors.push({ points: points.value, ...scalars.value, handle: handle.value });
  }

  const programBound = reader.readUpperBound();
  if (!programBound.ok) {
    return programBound;
  }
  const programs: BoardProgram[] = [];
  for (let i = 0; i < programBound.value; i += 1) {
    const strings = readProgramStrings(reader);
    if (!strings.ok) {
      return strings;
    }
    const scalars = readProgramScalars(reader);
    if (!scalars.ok) {
      return scalars;
    }
    const points = readPoints(reader);
    if (!points.ok) {
      return points;
    }
    const closed = reader.i16();
    if (!closed.ok) {
      return closed;
    }
    const handle = reader.str();
    if (!handle.ok) {
      return handle;
    }
    programs.push({
      ...strings.value,
      ...scalars.value,
      points: points.value,
      closed: closed.value,
      handle: handle.value,
    });
  }

  const spriteBound = reader.readUpperBound();
  if (!spriteBound.ok) {
    return spriteBound;
  }
  const sprites: BoardSprite[] = [];
  for (let i = 0; i < spriteBound.value; i += 1) {
    const strings = readSpriteStrings(reader);
    if (!strings.ok) {
      return strings;
    }
    const scalars = readSpriteScalars(reader);
    if (!scalars.ok) {
      return scalars;
    }
    sprites.push({ ...strings.value, ...scalars.value });
  }

  const imageBound = reader.readUpperBound();
  if (!imageBound.ok) {
    return imageBound;
  }
  const images: BoardImage[] = [];
  for (let i = 0; i < imageBound.value; i += 1) {
    const image = readImage(reader);
    if (!image.ok) {
      return image;
    }
    images.push(image.value);
  }

  const threadBound = reader.readUpperBound();
  if (!threadBound.ok) {
    return threadBound;
  }
  const threads = readStrings(reader, threadBound.value);
  if (!threads.ok) {
    return threads;
  }

  const constantBound = reader.readUpperBound();
  if (!constantBound.ok) {
    return constantBound;
  }
  const constants = readStrings(reader, constantBound.value);
  if (!constants.ok) {
    return constants;
  }

  const layerTitles = readStrings(reader, sizeL.value + 1);
  if (!layerTitles.ok) {
    return layerTitles;
  }

  const links = readLinks(reader);
  if (!links.ok) {
    return links;
  }

  const properties = readProperties(reader);
  if (!properties.ok) {
    return properties;
  }

  const residue = reader.readBytes(reader.remaining);
  if (!residue.ok) {
    return residue;
  }
  if (residue.value.length > 0) {
    warnings.push(
      `${residue.value.length} trailing byte(s) after the board were kept as residue (format-spec §4.2)`,
    );
  }

  return ok(
    {
      magic: header.value.magic,
      major: header.value.major,
      minor: header.value.minor,
      sizeX: sizeX.value,
      sizeY: sizeY.value,
      sizeL: sizeL.value,
      coordType: coordType.value,
      lut: lut.value,
      tileMatrix: tile.value.matrix,
      tileRuns: tile.value.runs,
      shadeLayers,
      lights,
      vectors,
      programs,
      sprites,
      images,
      threads: threads.value,
      constants: constants.value,
      layerTitles: layerTitles.value,
      links: links.value,
      properties: properties.value,
      residue: residue.value,
    },
    warnings,
  );
}

/** The `attributes, closed, layer, type` scalars shared by a vector (§4.2). */
function readVectorScalars(
  reader: BinaryReader,
): Result<{ attributes: number; closed: number; layer: number; type: number }> {
  const attributes = reader.i16();
  if (!attributes.ok) {
    return attributes;
  }
  const closed = reader.i16();
  if (!closed.ok) {
    return closed;
  }
  const layer = reader.i16();
  if (!layer.ok) {
    return layer;
  }
  const type = reader.i16();
  if (!type.ok) {
    return type;
  }
  return ok({
    attributes: attributes.value,
    closed: closed.value,
    layer: layer.value,
    type: type.value,
  });
}

/** The `activate, activationType, repeatDistance, layer` scalars of a program (§4.2). */
function readProgramScalars(
  reader: BinaryReader,
): Result<{ activate: number; activationType: number; repeatDistance: number; layer: number }> {
  const activate = reader.i16();
  if (!activate.ok) {
    return activate;
  }
  const activationType = reader.i16();
  if (!activationType.ok) {
    return activationType;
  }
  const repeatDistance = reader.i16();
  if (!repeatDistance.ok) {
    return repeatDistance;
  }
  const layer = reader.i16();
  if (!layer.ok) {
    return layer;
  }
  return ok({
    activate: activate.value,
    activationType: activationType.value,
    repeatDistance: repeatDistance.value,
    layer: layer.value,
  });
}

/** The `activate, activationType, x, y, layer, reserved` scalars of a sprite (§4.2). */
function readSpriteScalars(
  reader: BinaryReader,
): Result<{
  activate: number;
  activationType: number;
  x: number;
  y: number;
  layer: number;
  reserved: number;
}> {
  const activate = reader.i16();
  if (!activate.ok) {
    return activate;
  }
  const activationType = reader.i16();
  if (!activationType.ok) {
    return activationType;
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
  const reserved = reader.i16();
  if (!reserved.ok) {
    return reserved;
  }
  return ok({
    activate: activate.value,
    activationType: activationType.value,
    x: x.value,
    y: y.value,
    layer: layer.value,
    reserved: reserved.value,
  });
}

/** The six leading strings of a program entry (format-spec §4.2). */
function readProgramStrings(reader: BinaryReader): Result<{
  program: string;
  graphic: string;
  initialVar: string;
  initialValue: string;
  finalVar: string;
  finalValue: string;
}> {
  const program = reader.str();
  if (!program.ok) {
    return program;
  }
  const graphic = reader.str();
  if (!graphic.ok) {
    return graphic;
  }
  const initialVar = reader.str();
  if (!initialVar.ok) {
    return initialVar;
  }
  const initialValue = reader.str();
  if (!initialValue.ok) {
    return initialValue;
  }
  const finalVar = reader.str();
  if (!finalVar.ok) {
    return finalVar;
  }
  const finalValue = reader.str();
  if (!finalValue.ok) {
    return finalValue;
  }
  return ok({
    program: program.value,
    graphic: graphic.value,
    initialVar: initialVar.value,
    initialValue: initialValue.value,
    finalVar: finalVar.value,
    finalValue: finalValue.value,
  });
}

/** The nine leading strings of a sprite entry (format-spec §4.2). */
function readSpriteStrings(reader: BinaryReader): Result<{
  itemFile: string;
  activationPrg: string;
  multitaskPrg: string;
  initialVar: string;
  initialValue: string;
  finalVar: string;
  finalValue: string;
  loadingVar: string;
  loadingValue: string;
}> {
  const itemFile = reader.str();
  if (!itemFile.ok) {
    return itemFile;
  }
  const activationPrg = reader.str();
  if (!activationPrg.ok) {
    return activationPrg;
  }
  const multitaskPrg = reader.str();
  if (!multitaskPrg.ok) {
    return multitaskPrg;
  }
  const initialVar = reader.str();
  if (!initialVar.ok) {
    return initialVar;
  }
  const initialValue = reader.str();
  if (!initialValue.ok) {
    return initialValue;
  }
  const finalVar = reader.str();
  if (!finalVar.ok) {
    return finalVar;
  }
  const finalValue = reader.str();
  if (!finalValue.ok) {
    return finalValue;
  }
  const loadingVar = reader.str();
  if (!loadingVar.ok) {
    return loadingVar;
  }
  const loadingValue = reader.str();
  if (!loadingValue.ok) {
    return loadingValue;
  }
  return ok({
    itemFile: itemFile.value,
    activationPrg: activationPrg.value,
    multitaskPrg: multitaskPrg.value,
    initialVar: initialVar.value,
    initialValue: initialValue.value,
    finalVar: finalVar.value,
    finalValue: finalValue.value,
    loadingVar: loadingVar.value,
    loadingValue: loadingValue.value,
  });
}

/** The four edge links in file order North, South, East, West (format-spec §4.2). */
function readLinks(reader: BinaryReader): Result<{
  north: string;
  south: string;
  east: string;
  west: string;
}> {
  const north = reader.str();
  if (!north.ok) {
    return north;
  }
  const south = reader.str();
  if (!south.ok) {
    return south;
  }
  const east = reader.str();
  if (!east.ok) {
    return east;
  }
  const west = reader.str();
  if (!west.ok) {
    return west;
  }
  return ok({
    north: north.value,
    south: south.value,
    east: east.value,
    west: west.value,
  });
}

/** One free image (format-spec §4.2). */
function readImage(reader: BinaryReader): Result<BoardImage> {
  const file = reader.str();
  if (!file.ok) {
    return file;
  }
  const left = reader.i32();
  if (!left.ok) {
    return left;
  }
  const top = reader.i32();
  if (!top.ok) {
    return top;
  }
  const layer = reader.i16();
  if (!layer.ok) {
    return layer;
  }
  const drawType = reader.i16();
  if (!drawType.ok) {
    return drawType;
  }
  const transparent = reader.color();
  if (!transparent.ok) {
    return transparent;
  }
  const reserved = reader.i16();
  if (!reserved.ok) {
    return reserved;
  }
  return ok({
    file: file.value,
    left: left.value,
    top: top.value,
    layer: layer.value,
    drawType: drawType.value,
    transparent: transparent.value,
    reserved: reserved.value,
  });
}

/** The trailing board properties (format-spec §4.2). */
function readProperties(reader: BinaryReader): Result<BoardProperties> {
  const backgroundImage = reader.str();
  if (!backgroundImage.ok) {
    return backgroundImage;
  }
  const backgroundDrawType = reader.i32();
  if (!backgroundDrawType.ok) {
    return backgroundDrawType;
  }
  const backgroundColour = reader.color();
  if (!backgroundColour.ok) {
    return backgroundColour;
  }
  const backgroundMusic = reader.str();
  if (!backgroundMusic.ok) {
    return backgroundMusic;
  }
  const enterPrg = reader.str();
  if (!enterPrg.ok) {
    return enterPrg;
  }
  const battleBackground = reader.str();
  if (!battleBackground.ok) {
    return battleBackground;
  }
  const battleSkill = reader.i16();
  if (!battleSkill.ok) {
    return battleSkill;
  }
  const allowBattles = reader.i16();
  if (!allowBattles.ok) {
    return allowBattles;
  }
  const disableSaving = reader.i16();
  if (!disableSaving.ok) {
    return disableSaving;
  }
  const ambient = readRgb(reader);
  if (!ambient.ok) {
    return ambient;
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
  return ok({
    backgroundImage: backgroundImage.value,
    backgroundDrawType: backgroundDrawType.value,
    backgroundColour: backgroundColour.value,
    backgroundMusic: backgroundMusic.value,
    enterPrg: enterPrg.value,
    battleBackground: battleBackground.value,
    battleSkill: battleSkill.value,
    allowBattles: allowBattles.value,
    disableSaving: disableSaving.value,
    ambient: ambient.value,
    start: { x: startX.value, y: startY.value, layer: startLayer.value },
  });
}
