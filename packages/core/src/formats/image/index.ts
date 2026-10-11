/**
 * Image decoding for game assets (format-spec §10, AD-28).
 *
 * `decodeTexture` is the one place a game image becomes pixels: it reads the
 * signature, dispatches to the PNG or the JPEG decoder, and returns straight
 * RGBA. Scripts, `core/raster`, every runner and the editor use this and only
 * this, so they cannot disagree about what an image contains.
 */

import { err, type Result } from "../result.ts";
import type { DecodedTexture } from "./model.ts";
import { decodePng } from "./png.ts";
import { decodeJpeg } from "./jpeg.ts";

export * from "./model.ts";
export * from "./png.ts";
export * from "./jpeg.ts";

const SECTION = "format-spec §10";

/** The PNG signature `89 50 4E 47 0D 0A 1A 0A` (format-spec §10). */
const PNG_SIGNATURE: readonly number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** The JPEG SOI marker plus the start of any following segment: `FF D8 FF`. */
const JPEG_SIGNATURE: readonly number[] = [0xff, 0xd8, 0xff];

/** Whether `bytes` begins with `signature`. */
function hasSignature(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) {
    return false;
  }
  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[i] !== signature[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Decode a game image to straight RGBA (AD-28, format-spec §10).
 *
 * The format is detected by signature — PNG `89 50 4E 47 0D 0A 1A 0A`, JPEG
 * `FF D8 FF` — and anything else is a located `FormatError` at offset 0. `ref`
 * is the image's path, when the caller has one, and is carried on every error.
 * Never throws: an unsupported variant and a damaged file are both `ok: false`.
 */
export function decodeTexture(bytes: Uint8Array, ref?: string): Result<DecodedTexture> {
  if (hasSignature(bytes, PNG_SIGNATURE)) {
    return decodePng(bytes, ref);
  }
  if (hasSignature(bytes, JPEG_SIGNATURE)) {
    return decodeJpeg(bytes, ref);
  }
  return err({
    ...(ref === undefined ? {} : { path: ref }),
    offset: 0,
    section: SECTION,
    message: "unrecognised image signature: expected PNG (89 50 4E 47 0D 0A 1A 0A) or JPEG (FF D8 FF)",
  });
}
