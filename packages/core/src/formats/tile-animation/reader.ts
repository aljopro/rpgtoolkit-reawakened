/**
 * The animated-tile reader (`docs/spec/formats/tiles.md#animated-tile-tan`).
 *
 * Pure (G2): consumes a BinaryReader, never touches a host or timer. Returns a
 * Result with a located FormatError on failure (AD-18).
 */

import { err, ok, type Result } from "../result.ts";
import type { BinaryReader } from "../binary/reader.ts";
import {
  TILE_ANIMATION_MAGIC,
  TILE_ANIMATION_MAJOR,
  TILE_ANIMATION_MINOR,
  TILE_ANIMATION_MAX_SPEED,
  TILE_ANIMATION_SECTION,
  type TileAnimation,
} from "./model.ts";

export function readTileAnimation(reader: BinaryReader): Result<TileAnimation> {
  const start = reader.offset;
  const header = reader.header();
  if (!header.ok) {
    return header;
  }
  if (header.value.magic !== TILE_ANIMATION_MAGIC) {
    return err({
      ...(reader.path === undefined ? {} : { path: reader.path }),
      offset: start,
      section: TILE_ANIMATION_SECTION,
      message: `not an animated tile: magic is "${header.value.magic}", expected "${TILE_ANIMATION_MAGIC}"`,
    });
  }

  const warnings: string[] = [];
  if (header.value.major !== TILE_ANIMATION_MAJOR || header.value.minor !== TILE_ANIMATION_MINOR) {
    warnings.push(
      `animated tile version ${header.value.major}.${header.value.minor} is not ${TILE_ANIMATION_MAJOR}.${TILE_ANIMATION_MINOR}; ` +
        `read as the same layout (docs/spec/formats/tiles.md#animated-tile-tan)`,
    );
  }

  const speedAt = reader.offset;
  const speed = reader.i32();
  if (!speed.ok) {
    return speed;
  }
  if (speed.value <= 0) {
    return err({
      ...(reader.path === undefined ? {} : { path: reader.path }),
      offset: speedAt,
      section: TILE_ANIMATION_SECTION,
      message: `invalid animated tile speed ${speed.value}: speed <= 0 causes division by zero (docs/spec/formats/tiles.md#animated-tile-tan)`,
    });
  }
  if (speed.value > TILE_ANIMATION_MAX_SPEED) {
    warnings.push(
      `speed ${speed.value} is above documented maximum ${TILE_ANIMATION_MAX_SPEED} (docs/spec/formats/tiles.md#animated-tile-tan)`,
    );
  }

  const countAt = reader.offset;
  const frameCount = reader.readTrueCount("i32");
  if (!frameCount.ok) {
    return frameCount;
  }
  if (frameCount.value < 0) {
    return err({
      ...(reader.path === undefined ? {} : { path: reader.path }),
      offset: countAt,
      section: TILE_ANIMATION_SECTION,
      message: `invalid animated tile frame count ${frameCount.value}: cannot be negative (docs/spec/formats/tiles.md#animated-tile-tan)`,
    });
  }

  // Refusal before allocation: each NUL-terminated frame string occupies at least 1 byte (the NUL).
  if (frameCount.value > reader.remaining) {
    return err({
      ...(reader.path === undefined ? {} : { path: reader.path }),
      offset: countAt,
      section: TILE_ANIMATION_SECTION,
      message: `frame count ${frameCount.value} exceeds remaining bytes (${reader.remaining})`,
    });
  }

  const frames: string[] = [];
  for (let i = 0; i < frameCount.value; i += 1) {
    const frame = reader.str();
    if (!frame.ok) {
      return frame;
    }
    frames.push(frame.value);
  }

  const residue = reader.readBytes(reader.remaining);
  if (!residue.ok) {
    return residue;
  }
  if (residue.value.length > 0) {
    warnings.push(
      `${residue.value.length} trailing byte(s) after the animated tile were kept as residue (docs/spec/formats/README.md#bytes-after-the-last-documented-field)`,
    );
  }

  return ok(
    {
      magic: header.value.magic,
      major: header.value.major,
      minor: header.value.minor,
      speed: speed.value,
      frameCount: frameCount.value,
      frames,
      residue: residue.value,
    },
    warnings,
  );
}
