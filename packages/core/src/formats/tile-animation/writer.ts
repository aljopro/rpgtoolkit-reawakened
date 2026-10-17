/**
 * Writing an animated tile (`docs/spec/formats/tiles.md#animated-tile-tan`).
 *
 * Pure (G2): fills a BinaryWriter, never touches a host.
 */

import { err, ok, type Result } from "../result.ts";
import { BinaryWriter } from "../binary/writer.ts";
import {
  TILE_ANIMATION_MIN_SPEED,
  TILE_ANIMATION_SECTION,
  type TileAnimation,
} from "./model.ts";

const I16_MAX = 32_767;
const I32_MAX = 2_147_483_647;

export function writeTileAnimation(model: TileAnimation): Result<Uint8Array> {
  const writer = new BinaryWriter();

  if (
    !Number.isInteger(model.major) || model.major < 0 || model.major > I16_MAX ||
    !Number.isInteger(model.minor) || model.minor < 0 || model.minor > I16_MAX
  ) {
    return err({
      offset: writer.toBytes().length,
      section: TILE_ANIMATION_SECTION,
      message: `version ${model.major}.${model.minor} is not writable: must be 0..${I16_MAX} (docs/spec/formats/README.md#header-and-version)`,
    });
  }

  if (!Number.isInteger(model.speed) || model.speed < TILE_ANIMATION_MIN_SPEED || model.speed > I32_MAX) {
    return err({
      offset: writer.toBytes().length,
      section: TILE_ANIMATION_SECTION,
      message: `speed ${model.speed} must be a positive integer ${TILE_ANIMATION_MIN_SPEED}..${I32_MAX} (docs/spec/formats/tiles.md#animated-tile-tan)`,
    });
  }

  if (!Number.isInteger(model.frameCount) || model.frameCount < 0 || model.frameCount > I32_MAX) {
    return err({
      offset: writer.toBytes().length,
      section: TILE_ANIMATION_SECTION,
      message: `frameCount ${model.frameCount} must be a non-negative integer (docs/spec/formats/tiles.md#animated-tile-tan)`,
    });
  }

  if (model.frames.length !== model.frameCount) {
    return err({
      offset: writer.toBytes().length,
      section: TILE_ANIMATION_SECTION,
      message: `the model has ${model.frames.length} frame(s) but frameCount claims ${model.frameCount}`,
    });
  }

  const magic = writer.str(model.magic);
  if (!magic.ok) {
    return magic;
  }
  writer.i16(model.major);
  writer.i16(model.minor);
  writer.i32(model.speed);
  writer.i32(model.frameCount);

  for (const frame of model.frames) {
    const written = writer.str(frame);
    if (!written.ok) {
      return written;
    }
  }

  if (model.residue !== undefined && model.residue.length > 0) {
    writer.writeBytes(model.residue);
  }

  return ok(writer.toBytes());
}
