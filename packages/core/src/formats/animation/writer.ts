/**
 * Writing an animation (docs/spec/formats/animation.md#layout): the binary layout of `RPGTLKIT
 * ANIM`, minor 3.
 *
 * It emits the version it was given and reproduces the bytes of a model that
 * came from `readAnimation` exactly (AD-18). Pure (G2): it writes into a
 * `BinaryWriter` and never touches a host. Only an unencodable string fails.
 */

import { ok, type Result } from "../result.ts";
import { BinaryWriter } from "../binary/writer.ts";
import type { Animation } from "./model.ts";

/**
 * Serialise `model` to the animation layout (docs/spec/formats/animation.md#layout). The frame
 * count is written back as the upper bound the reader derived it from: `-1`
 * for no slots, otherwise `frames.length - 1` (`docs/spec/formats/README.md#counts-are-usually-upper-bounds`).
 */
export function writeAnimation(model: Animation): Result<Uint8Array> {
  const writer = new BinaryWriter();

  const magic = writer.str(model.magic);
  if (!magic.ok) {
    return magic;
  }
  writer.i16(model.major);
  writer.i16(model.minor);
  writer.i32(model.width);
  writer.i32(model.height);
  writer.i32(model.frames.length === 0 ? -1 : model.frames.length - 1);

  for (const frame of model.frames) {
    const image = writer.str(frame.image);
    if (!image.ok) {
      return image;
    }
    writer.color(frame.transparent);
    const sound = writer.str(frame.sound);
    if (!sound.ok) {
      return sound;
    }
  }

  writer.f64(model.delay);
  writer.writeBytes(model.residue);
  return ok(writer.toBytes());
}
