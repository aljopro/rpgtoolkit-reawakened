/**
 * Writing a tile bitmap (`docs/spec/formats/tiles.md#tile-bitmap-tbm`).
 *
 * It emits the magic and the version it was given and reproduces the bytes of a
 * model that came from `readTileBitmap` exactly (AD-18), padding row and column
 * included. Pure (G2): it fills a `BinaryWriter` and never touches a host.
 *
 * A model the reader could not have produced is refused rather than written:
 * a bound below `-1` or past the `i16` field, a cell count that disagrees with the
 * bounds, a version or tint the `i16` fields cannot hold, and an unencodable tile
 * reference. Each comes back as a located `FormatError`.
 */

import { err, ok, type Result } from "../result.ts";
import { BinaryWriter } from "../binary/writer.ts";
import { TILE_BITMAP_SECTION, type TileBitmap } from "./model.ts";

/** The stored `i16` range a field must fit (`docs/spec/formats/README.md#primitive-encoding`). */
const I16_MIN = -32_768;
const I16_MAX = 32_767;

/** A located error for a model the writer cannot encode (AD-18). */
function fail(writer: BinaryWriter, message: string): Result<never> {
  return err({ offset: writer.toBytes().length, section: TILE_BITMAP_SECTION, message });
}

/**
 * Serialise `model` to the tile-bitmap layout
 * (`docs/spec/formats/tiles.md#tile-bitmap-tbm`, docs/spec/formats/tiles.md#tile-bitmap-tbm). The bounds are
 * written exactly as the model stores them — a stored `-1` stays `-1` — and the
 * cells follow in the model's order, which is the file's x-outer, y-inner order.
 */
export function writeTileBitmap(model: TileBitmap): Result<Uint8Array> {
  const writer = new BinaryWriter();

  if (!Number.isInteger(model.width) || model.width < -1 || model.width > I16_MAX) {
    return fail(
      writer,
      `width ${model.width} is not a stored bound: it must be -1 (none) or 0..${I16_MAX} (docs/spec/formats/tiles.md#tile-bitmap-tbm)`,
    );
  }
  if (!Number.isInteger(model.height) || model.height < -1 || model.height > I16_MAX) {
    return fail(
      writer,
      `height ${model.height} is not a stored bound: it must be -1 (none) or 0..${I16_MAX} (docs/spec/formats/tiles.md#tile-bitmap-tbm)`,
    );
  }
  const storedCells = (model.width < 0 ? 0 : model.width + 1) * (model.height < 0 ? 0 : model.height + 1);
  if (model.cells.length !== storedCells) {
    return fail(
      writer,
      `the model has ${model.cells.length} cell(s) but width ${model.width} and height ${model.height} ` +
        `mean ${storedCells} stored cell(s) (docs/spec/formats/tiles.md#tile-bitmap-tbm)`,
    );
  }
  if (
    !Number.isInteger(model.major) || model.major < 0 || model.major > I16_MAX ||
    !Number.isInteger(model.minor) || model.minor < 0 || model.minor > I16_MAX
  ) {
    return fail(
      writer,
      `version ${model.major}.${model.minor} is not writable: a version field must be 0..${I16_MAX} (docs/spec/formats/README.md#header-and-version)`,
    );
  }

  const magic = writer.str(model.magic);
  if (!magic.ok) {
    return magic;
  }
  writer.i16(model.major);
  writer.i16(model.minor);
  writer.i16(model.width);
  writer.i16(model.height);

  for (const cell of model.cells) {
    const tile = writer.str(cell.tile);
    if (!tile.ok) {
      return tile;
    }
    // `docs/spec/formats/README.md#primitive-encoding`: each tint is an `i16` field, so a value the field cannot hold is
    // refused rather than silently wrapped into a different colour.
    if (
      !Number.isInteger(cell.r) || cell.r < I16_MIN || cell.r > I16_MAX ||
      !Number.isInteger(cell.g) || cell.g < I16_MIN || cell.g > I16_MAX ||
      !Number.isInteger(cell.b) || cell.b < I16_MIN || cell.b > I16_MAX
    ) {
      return fail(
        writer,
        `tint (${cell.r}, ${cell.g}, ${cell.b}) of tile "${cell.tile}" does not fit the stored i16 fields (docs/spec/formats/README.md#primitive-encoding, docs/spec/formats/tiles.md#tile-bitmap-tbm)`,
      );
    }
    writer.i16(cell.r);
    writer.i16(cell.g);
    writer.i16(cell.b);
  }

  writer.writeBytes(model.residue);
  return ok(writer.toBytes());
}
