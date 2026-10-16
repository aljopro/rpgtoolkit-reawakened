/**
 * Reading an animation (docs/spec/formats/animation.md#layout): the binary layout of `RPGTLKIT
 * ANIM`, minor 3.
 *
 * Pure (G2): it consumes a `BinaryReader` the caller positioned and never
 * touches a host. Bad data, a wrong version or a short file is a `Result`
 * carrying a located `FormatError`, never a throw (AD-18).
 */

import { err, ok, type Result } from "../result.ts";
import { BinaryReader } from "../binary/reader.ts";
import { unpackColorref } from "../binary/color.ts";
import { TextLineReader } from "../text/line-reader.ts";
import {
  ANIMATION_DETECT_OFFSET,
  ANIMATION_MAGIC,
  ANIMATION_MINOR,
  ANIMATION_SECTION,
  type Animation,
  type AnimationFrame,
} from "./model.ts";

/**
 * Read an animation from `reader` (docs/spec/formats/animation.md#layout). The header's minor must
 * be 3; the frame count comes from the `i32` upper bound (`n` means `n + 1`
 * slots, `-1` means none, `docs/spec/formats/README.md#counts-are-usually-upper-bounds`), and every slot — empty ones included — is
 * returned. The reader consumes the whole file: bytes after the trailing `f64`
 * delay are kept as `residue` (`docs/spec/formats/README.md#bytes-after-the-last-documented-field`), so a caller sees `remaining === 0`.
 */
export function readAnimation(reader: BinaryReader): Result<Animation> {
  const start = reader.offset;
  const detectAt = start + ANIMATION_DETECT_OFFSET;
  const probe = reader.isBinaryAt(detectAt);
  if (probe.ok && !probe.value) {
    return readTextAnimation(reader);
  }
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

  const residue = reader.readBytes(reader.remaining);
  if (!residue.ok) {
    return residue;
  }
  const warnings: string[] = [];
  if (residue.value.length > 0) {
    warnings.push(
      `${residue.value.length} trailing byte(s) after the animation were kept as residue (docs/spec/formats/animation.md#layout, docs/spec/formats/README.md#bytes-after-the-last-documented-field)`,
    );
  }

  return ok(
    {
      magic: header.value.magic,
      major: header.value.major,
      minor: header.value.minor,
      width: width.value,
      height: height.value,
      frames,
      delay: delay.value,
      residue: residue.value,
    },
    warnings,
  );
}

/** Read a Toolkit 2 minor 0 text animation (docs/spec/formats/legacy/text-formats.md#animation). */
function readTextAnimation(reader: BinaryReader): Result<Animation> {
  const lineReader = new TextLineReader(reader.bytes, reader.path, reader.offset);
  const header = lineReader.nextLine("header", ANIMATION_SECTION);
  if (!header.ok) return header;
  if (header.value.trim().toUpperCase() !== ANIMATION_MAGIC.toUpperCase()) {
    return err({
      ...(reader.path === undefined ? {} : { path: reader.path }),
      offset: 0,
      section: ANIMATION_SECTION,
      message: `not an animation: magic is "${header.value}", expected "${ANIMATION_MAGIC}"`,
    });
  }
  const major = lineReader.nextInt("major", ANIMATION_SECTION);
  if (!major.ok) return major;
  const minor = lineReader.nextInt("minor", ANIMATION_SECTION);
  if (!minor.ok) return minor;
  const width = lineReader.nextInt("width", ANIMATION_SECTION);
  if (!width.ok) return width;
  const height = lineReader.nextInt("height", ANIMATION_SECTION);
  if (!height.ok) return height;
  // Frame count line is ignored per R-17 (read 51 frames by position)
  const frameCount = lineReader.nextLine("frame UB", ANIMATION_SECTION);
  if (!frameCount.ok) return frameCount;

  const frames: AnimationFrame[] = [];
  for (let i = 0; i < 51; i++) {
    const image = lineReader.nextLine(`frame[${i}].image`, ANIMATION_SECTION);
    if (!image.ok) return image;
    const transpColor = lineReader.nextInt(`frame[${i}].transpColor`, ANIMATION_SECTION, 0);
    if (!transpColor.ok) return transpColor;
    const sound = lineReader.nextLine(`frame[${i}].sound`, ANIMATION_SECTION);
    if (!sound.ok) return sound;
    frames.push({
      image: image.value,
      transparent: unpackColorref(transpColor.value),
      sound: sound.value,
    });
  }

  const delay = lineReader.nextFloat("delay", ANIMATION_SECTION, 0);
  if (!delay.ok) return delay;

  const finished = lineReader.finish(ANIMATION_SECTION);
  if (!finished.ok) return finished;

  reader.seek(lineReader.offset);

  return ok({
    magic: ANIMATION_MAGIC,
    major: major.value,
    minor: minor.value,
    width: width.value,
    height: height.value,
    frames,
    delay: delay.value,
    residue: new Uint8Array(0),
  });
}
