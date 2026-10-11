/**
 * Writing a vector board (format-spec §4.2).
 *
 * Pure (G2): it fills a `BinaryWriter` and never touches a host. It emits the
 * version it was given and reproduces the bytes `readBoard` consumed exactly
 * (AD-18): the stored runs, the stored `closed` flags (including the legacy
 * `-1`), every empty slot and the residue are re-emitted verbatim, so an
 * unmodified board writes back byte for byte. Only an unencodable string or an
 * inconsistent model fails; those come back as a located `FormatError`.
 */

import { err, ok, type Result } from "../result.ts";
import { BinaryWriter } from "../binary/writer.ts";
import {
  BOARD_LAYOUT_SECTION,
  type Board,
  type BoardPoint,
} from "./model.ts";

/** A located error for a value the writer cannot encode (AD-18). */
function fail(writer: BinaryWriter, message: string): Result<never> {
  return err({ offset: writer.toBytes().length, section: BOARD_LAYOUT_SECTION, message });
}

/** The stored `i16` upper bound for `count` entries: `-1` for none, else `count - 1`. */
function bound(count: number): number {
  return count === 0 ? -1 : count - 1;
}

/** Write an upper-bounded list of strings (format-spec §1.2, §4.2). */
function writeStrings(writer: BinaryWriter, values: readonly string[]): Result<void> {
  if (values.length > 32_768) {
    return fail(writer, `a string list has ${values.length} entries but the i16 upper bound holds at most 32768`);
  }
  writer.i16(bound(values.length));
  for (const value of values) {
    const written = writer.str(value);
    if (!written.ok) {
      return written;
    }
  }
  return ok(undefined);
}

/** Write an upper-bounded list of `i32 x, i32 y` points (format-spec §4.2). */
function writePoints(writer: BinaryWriter, points: readonly BoardPoint[]): Result<void> {
  if (points.length > 32_768) {
    return fail(writer, `a point list has ${points.length} entries but the i16 upper bound holds at most 32768`);
  }
  writer.i16(bound(points.length));
  for (const point of points) {
    writer.i32(point.x);
    writer.i32(point.y);
  }
  return ok(undefined);
}

/**
 * Serialise `model` to the vector board layout (format-spec §4.2). Every
 * section's bound is derived back from the model's array length, so empty
 * slots round-trip and table indices stay stable (§1.2).
 */
export function writeBoard(model: Board): Result<Uint8Array> {
  const writer = new BinaryWriter();

  const magic = writer.str(model.magic);
  if (!magic.ok) {
    return magic;
  }
  writer.i16(model.major);
  writer.i16(model.minor);
  writer.i16(model.sizeX);
  writer.i16(model.sizeY);
  writer.i16(model.sizeL);
  writer.i16(model.coordType);

  if (model.lut.length > 32_768) {
    return fail(writer, `the tile LUT has ${model.lut.length} entries but the i16 upper bound holds at most 32768`);
  }
  writer.i16(bound(model.lut.length));
  for (const reference of model.lut) {
    const written = writer.str(reference);
    if (!written.ok) {
      return written;
    }
  }

  for (const run of model.tileRuns) {
    if (!Number.isInteger(run.lutIndex) || run.lutIndex < 0 || run.lutIndex > 32_767) {
      return fail(writer, `tile matrix LUT index ${run.lutIndex} does not fit a non-negative i16`);
    }
    if (!Number.isInteger(run.count) || run.count < 1 || run.count > 32_768) {
      return fail(writer, `a tile matrix run covers ${run.count} cells; a run-length marker holds 1..32768`);
    }
    if (run.marker) {
      writer.i16(-run.count);
    } else if (run.count !== 1) {
      return fail(writer, `an unmarked tile matrix entry covers ${run.count} cells; only a marker covers more than one`);
    }
    writer.i16(run.lutIndex);
  }

  writer.i16(bound(model.shadeLayers.length));
  for (const layer of model.shadeLayers) {
    writer.i32(layer.castLayer);
    for (const record of layer.records) {
      writer.i16(record.runCount);
      writer.i16(record.r);
      writer.i16(record.g);
      writer.i16(record.b);
    }
  }

  writer.i16(bound(model.lights.length));
  for (const light of model.lights) {
    writer.i32(light.layer);
    writer.i32(light.type);
    const nodes = writePoints(writer, light.nodes);
    if (!nodes.ok) {
      return nodes;
    }
    writer.i16(bound(light.colours.length));
    for (const colour of light.colours) {
      writer.i16(colour.r);
      writer.i16(colour.g);
      writer.i16(colour.b);
    }
  }

  writer.i16(bound(model.vectors.length));
  for (const vector of model.vectors) {
    const points = writePoints(writer, vector.points);
    if (!points.ok) {
      return points;
    }
    writer.i16(vector.attributes);
    writer.i16(vector.closed);
    writer.i16(vector.layer);
    writer.i16(vector.type);
    const handle = writer.str(vector.handle);
    if (!handle.ok) {
      return handle;
    }
  }

  writer.i16(bound(model.programs.length));
  for (const program of model.programs) {
    for (const value of [
      program.program,
      program.graphic,
      program.initialVar,
      program.initialValue,
      program.finalVar,
      program.finalValue,
    ]) {
      const written = writer.str(value);
      if (!written.ok) {
        return written;
      }
    }
    writer.i16(program.activate);
    writer.i16(program.activationType);
    writer.i16(program.repeatDistance);
    writer.i16(program.layer);
    const points = writePoints(writer, program.points);
    if (!points.ok) {
      return points;
    }
    writer.i16(program.closed);
    const handle = writer.str(program.handle);
    if (!handle.ok) {
      return handle;
    }
  }

  writer.i16(bound(model.sprites.length));
  for (const sprite of model.sprites) {
    for (const value of [
      sprite.itemFile,
      sprite.activationPrg,
      sprite.multitaskPrg,
      sprite.initialVar,
      sprite.initialValue,
      sprite.finalVar,
      sprite.finalValue,
      sprite.loadingVar,
      sprite.loadingValue,
    ]) {
      const written = writer.str(value);
      if (!written.ok) {
        return written;
      }
    }
    writer.i16(sprite.activate);
    writer.i16(sprite.activationType);
    writer.i16(sprite.x);
    writer.i16(sprite.y);
    writer.i16(sprite.layer);
    writer.i16(sprite.reserved);
  }

  writer.i16(bound(model.images.length));
  for (const image of model.images) {
    const file = writer.str(image.file);
    if (!file.ok) {
      return file;
    }
    writer.i32(image.left);
    writer.i32(image.top);
    writer.i16(image.layer);
    writer.i16(image.drawType);
    writer.color(image.transparent);
    writer.i16(image.reserved);
  }

  const threads = writeStrings(writer, model.threads);
  if (!threads.ok) {
    return threads;
  }
  const constants = writeStrings(writer, model.constants);
  if (!constants.ok) {
    return constants;
  }

  if (model.layerTitles.length !== model.sizeL + 1) {
    return fail(
      writer,
      `the board has ${model.layerTitles.length} layer title(s) but sizeL ${model.sizeL} needs ${model.sizeL + 1} (indices 0…${model.sizeL})`,
    );
  }
  for (const title of model.layerTitles) {
    const written = writer.str(title);
    if (!written.ok) {
      return written;
    }
  }

  for (const link of [model.links.north, model.links.south, model.links.east, model.links.west]) {
    const written = writer.str(link);
    if (!written.ok) {
      return written;
    }
  }

  const properties = model.properties;
  const backgroundImage = writer.str(properties.backgroundImage);
  if (!backgroundImage.ok) {
    return backgroundImage;
  }
  writer.i32(properties.backgroundDrawType);
  writer.color(properties.backgroundColour);
  for (const value of [
    properties.backgroundMusic,
    properties.enterPrg,
    properties.battleBackground,
  ]) {
    const written = writer.str(value);
    if (!written.ok) {
      return written;
    }
  }
  writer.i16(properties.battleSkill);
  writer.i16(properties.allowBattles);
  writer.i16(properties.disableSaving);
  writer.i16(properties.ambient.r);
  writer.i16(properties.ambient.g);
  writer.i16(properties.ambient.b);
  writer.i16(properties.start.x);
  writer.i16(properties.start.y);
  writer.i16(properties.start.layer);

  writer.writeBytes(model.residue);
  return ok(writer.toBytes());
}
