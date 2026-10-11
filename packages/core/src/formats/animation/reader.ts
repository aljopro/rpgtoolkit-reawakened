/**
 * Reading an animation (format-spec §7.1): the binary layout of `RPGTLKIT
 * ANIM`, minor 3.
 *
 * Pure (G2): it consumes a `BinaryReader` the caller positioned and never
 * touches a host. Bad data, a wrong version or a short file is a `Result`
 * carrying a located `FormatError`, never a throw (AD-18).
 */

import { err, ok, type Result } from "../result.ts";
import { BinaryReader } from "../binary/reader.ts";
import {
  ANIMATION_MAGIC,
  ANIMATION_MINOR,
  ANIMATION_SECTION,
  type Animation,
  type AnimationFrame,
} from "./model.ts";

/**
 * Read an animation from `reader` (format-spec §7.1). The header's minor must
 * be 3; the frame count comes from the `i32` upper bound (`n` means `n + 1`
 * slots, `-1` means none, §1.2), and every slot — empty ones included — is
 * returned. Reading stops right after the trailing `f64` delay; any remaining
 * bytes are the caller's to check.
 */
export function readAnimation(reader: BinaryReader): Result<Animation> {
  const start = reader.offset;
  const header = reader.header();
  if (!header.ok) {
    return header;
  }
  if (header.value.magic !== ANIMATION_MAGIC) {
    return err({
      ...(reader.path === undefined ? {} : { path: reader.path }),
      offset: start,
      section: ANIMATION_SECTION,
      message: `not an animation: magic is "${header.value.magic}", expected "${ANIMATION_MAGIC}"`,
    });
  }
  if (header.value.minor !== ANIMATION_MINOR) {
    return err({
      ...(reader.path === undefined ? {} : { path: reader.path }),
      offset: reader.offset - 2,
      section: ANIMATION_SECTION,
      message: `unsupported animation minor version ${header.value.minor}: this layout requires ${ANIMATION_MINOR}`,
    });
  }

  const width = reader.i32();
  if (!width.ok) {
    return width;
  }
  const height = reader.i32();
  if (!height.ok) {
    return height;
  }
  const slots = reader.readUpperBound("i32");
  if (!slots.ok) {
    return slots;
  }

  const frames: AnimationFrame[] = [];
  for (let i = 0; i < slots.value; i += 1) {
    const image = reader.str();
    if (!image.ok) {
      return image;
    }
    const transparent = reader.color();
    if (!transparent.ok) {
      return transparent;
    }
    const sound = reader.str();
    if (!sound.ok) {
      return sound;
    }
    frames.push({ image: image.value, transparent: transparent.value, sound: sound.value });
  }

  const delay = reader.f64();
  if (!delay.ok) {
    return delay;
  }

  return ok({
    magic: header.value.magic,
    major: header.value.major,
    minor: header.value.minor,
    width: width.value,
    height: height.value,
    frames,
    delay: delay.value,
  });
}
