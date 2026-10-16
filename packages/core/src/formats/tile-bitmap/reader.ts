/**
 * Reading a tile bitmap: the binary layout of `TK3 TILEBITMAP`
 * (`docs/spec/formats/tiles.md#tile-bitmap-tbm`, format-spec §3.6).
 *
 * Pure (G2): it consumes a `BinaryReader` the caller positioned and never touches
 * a host. Bad data or a short file is a `Result` carrying a located `FormatError`,
 * never a throw (AD-18).
 *
 * The reader follows format-spec §1.2 for `width` and `height`: the stored value
 * is an inclusive upper bound, `n` means `n + 1` stored cells and `-1` means none,
 * and any other negative is refused. The cell count is checked against the bytes
 * that remain before the loop runs, so a damaged file cannot make the reader walk
 * a bound it cannot pay for. The editor's 1..40 limit is an editor rule, not a
 * file rule, so it is not enforced here (`docs/spec/formats/tiles.md#tile-bitmap-tbm`).
 */

import { err, ok, type Result } from "../result.ts";
import { BinaryReader } from "../binary/reader.ts";
import {
  TILE_BITMAP_MAGIC,
  TILE_BITMAP_MAJOR,
  TILE_BITMAP_MINOR,
  TILE_BITMAP_SECTION,
  type TileBitmap,
  type TileBitmapCell,
} from "./model.ts";

/** The fewest bytes one cell can occupy: an empty `str` (one NUL) and three `i16` (§1.1). */
const MIN_CELL_BYTES = 7;

/** The documented tint range, −255…+255 (format-spec §3.6). */
const TINT_MIN = -255;
const TINT_MAX = 255;

/**
 * Read a tile bitmap from `reader` (`docs/spec/formats/tiles.md#tile-bitmap-tbm`,
 * format-spec §3.6). The magic must match; the major and minor versions are read
 * as stored and only warned about when they are not 3.0, because the engine
 * ignores both. Every stored cell — the padding row and column included — is
 * returned, x outer and y inner, and the reader consumes the whole file: bytes
 * after the last cell are kept as `residue` (format-spec §1.7), so a caller sees
 * `remaining === 0`.
 */
export function readTileBitmap(reader: BinaryReader): Result<TileBitmap> {
  const start = reader.offset;
  const header = reader.header();
  if (!header.ok) {
    return header;
  }
  if (header.value.magic !== TILE_BITMAP_MAGIC) {
    return err({
      ...(reader.path === undefined ? {} : { path: reader.path }),
      offset: start,
      section: TILE_BITMAP_SECTION,
      message: `not a tile bitmap: magic is "${header.value.magic}", expected "${TILE_BITMAP_MAGIC}"`,
    });
  }

  const warnings: string[] = [];
  if (header.value.major !== TILE_BITMAP_MAJOR || header.value.minor !== TILE_BITMAP_MINOR) {
    warnings.push(
      `tile bitmap version ${header.value.major}.${header.value.minor} is not ${TILE_BITMAP_MAJOR}.${TILE_BITMAP_MINOR}; ` +
        `it was read as the same layout, since the version is ignored (format-spec §3.6, §1.4)`,
    );
  }

  const widthAt = reader.offset;
  const width = reader.i16();
  if (!width.ok) {
    return width;
  }
  if (width.value < -1) {
    return err({
      ...(reader.path === undefined ? {} : { path: reader.path }),
      offset: widthAt,
      section: TILE_BITMAP_SECTION,
      message: `invalid width bound: ${width.value} is below -1 (only -1 means none, format-spec §1.2)`,
    });
  }
  const heightAt = reader.offset;
  const height = reader.i16();
  if (!height.ok) {
    return height;
  }
  if (height.value < -1) {
    return err({
      ...(reader.path === undefined ? {} : { path: reader.path }),
      offset: heightAt,
      section: TILE_BITMAP_SECTION,
      message: `invalid height bound: ${height.value} is below -1 (only -1 means none, format-spec §1.2)`,
    });
  }

  // §1.2: check the bounds against the bytes that remain before anything is
  // allocated or looped over, so a corrupt 32767 x 32767 header cannot reserve a
  // billion cells (each cell is at least a NUL and three i16).
  const columns = width.value < 0 ? 0 : width.value + 1;
  const rows = height.value < 0 ? 0 : height.value + 1;
  const cellsAt = reader.offset;
  const needed = columns * rows * MIN_CELL_BYTES;
  if (needed > reader.remaining) {
    return err({
      ...(reader.path === undefined ? {} : { path: reader.path }),
      offset: cellsAt,
      section: TILE_BITMAP_SECTION,
      message:
        `width ${width.value} and height ${height.value} claim ${columns * rows} cells ` +
        `(at least ${needed} byte(s)) but only ${reader.remaining} byte(s) remain`,
    });
  }

  const cells: TileBitmapCell[] = [];
  let outOfRange = false;
  for (let x = 0; x < columns; x += 1) {
    for (let y = 0; y < rows; y += 1) {
      const tile = reader.str();
      if (!tile.ok) {
        return tile;
      }
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
      const cell: TileBitmapCell = { tile: tile.value, r: r.value, g: g.value, b: b.value };
      cells.push(cell);
      const tinted =
        r.value >= TINT_MIN && r.value <= TINT_MAX &&
        g.value >= TINT_MIN && g.value <= TINT_MAX &&
        b.value >= TINT_MIN && b.value <= TINT_MAX;
      if (!tinted && !outOfRange) {
        outOfRange = true;
        warnings.push(
          `tint (${r.value}, ${g.value}, ${b.value}) at cell (${x}, ${y}) is outside the documented ` +
            `-255..255 range and was kept verbatim (format-spec §3.6)`,
        );
      }
    }
  }

  const residue = reader.readBytes(reader.remaining);
  if (!residue.ok) {
    return residue;
  }
  if (residue.value.length > 0) {
    warnings.push(
      `${residue.value.length} trailing byte(s) after the tile bitmap were kept as residue (format-spec §3.6, §1.7)`,
    );
  }

  return ok(
    {
      magic: header.value.magic,
      major: header.value.major,
      minor: header.value.minor,
      width: width.value,
      height: height.value,
      cells,
      residue: residue.value,
    },
    warnings,
  );
}
