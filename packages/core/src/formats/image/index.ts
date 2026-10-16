/**
 * Image decoding for game assets (docs/spec/formats/images.md#the-shared-decode-contract, AD-28).
 *
 * `decodeTexture` is the one place a game image becomes pixels: it reads the
 * signature, dispatches to the PNG, the JPEG, the BMP or the GIF decoder, and
 * returns the file's own straight RGBA and its own alpha, nothing added. A
 * colour key is not part of the file (docs/spec/formats/images.md#the-shared-decode-contract), so no key is applied
 * here: the key is the `key` of a `blit` (AD-3) and `core/raster` tests it on
 * these pixels. Scripts, `core/raster`, every runner and the editor use this and
 * only this, so they cannot disagree about what an image contains.
 *
 * A GIF is the one kind that is a **sequence of pages** with delays, which a
 * single texture cannot express (docs/spec/formats/images.md#gif, R-10), so the
 * entry exports a second decoder, `decodeGif`, for the animation path(docs/spec/formats/images.md#gif).
 * This entry exports `decodeTexture`, `decodeGif` and their model types only
 * (AD-22, AD-28), so no other package can reach the PNG, JPEG, BMP or GIF
 * decoder.
 */

import { err, ok, type Result } from "../result.ts";
import type { DecodedGif, DecodedTexture } from "./model.ts";
import { decodeBmp } from "./bmp.ts";
import { decodePng } from "./png.ts";
import { decodeJpeg } from "./jpeg.ts";
import { decodeGif as readGif } from "./gif.ts";

export type { DecodedGif, DecodedGifFrame, DecodedTexture } from "./model.ts";

const SECTION = "docs/spec/formats/images.md#the-shared-decode-contract";

/** The PNG signature `89 50 4E 47 0D 0A 1A 0A` (docs/spec/formats/images.md#the-shared-decode-contract). */
const PNG_SIGNATURE: readonly number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** The JPEG SOI marker plus the start of any following segment: `FF D8 FF`. */
const JPEG_SIGNATURE: readonly number[] = [0xff, 0xd8, 0xff];

/** The Windows bitmap file-header signature: `BM` (docs/spec/formats/images.md). */
const BMP_SIGNATURE: readonly number[] = [0x42, 0x4d];

/**
 * The GIF versions' common prefix: `GIF8`. Both `GIF87a` and `GIF89a` start
 * with it, and a third version is refused by the decoder itself at offset 0
 * (docs/spec/formats/images.md#gif-header).
 */
const GIF_SIGNATURE: readonly number[] = [0x47, 0x49, 0x46, 0x38];

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
 * Decode a game image to straight RGBA (AD-28, docs/spec/formats/images.md#the-shared-decode-contract).
 *
 * The format is detected by signature — PNG `89 50 4E 47 0D 0A 1A 0A`, JPEG
 * `FF D8 FF`, Windows bitmap `BM`, GIF `GIF8` — and anything else is a located
 * `FormatError` at offset 0. `ref` is the image's path, when the caller has one,
 * and is carried on every error. Never throws: an unsupported variant and a
 * damaged file are both `ok: false`.
 *
 * A GIF returns its **first page**, decoded on its own, so the caller pays for
 * one page and a defect in a later page is not seen here. Ask `decodeGif` for
 * every page with its delay.
 */
export function decodeTexture(bytes: Uint8Array, ref?: string): Result<DecodedTexture> {
  if (hasSignature(bytes, PNG_SIGNATURE)) {
    return decodePng(bytes, ref);
  }
  if (hasSignature(bytes, JPEG_SIGNATURE)) {
    return decodeJpeg(bytes, ref);
  }
  if (hasSignature(bytes, BMP_SIGNATURE)) {
    return decodeBmp(bytes, ref);
  }
  if (hasSignature(bytes, GIF_SIGNATURE)) {
    const gif = readGif(bytes, ref, 1);
    if (!gif.ok) {
      return gif;
    }
    const first = gif.value.frames[0]!;
    return ok({ w: gif.value.w, h: gif.value.h, rgba: first.rgba }, gif.warnings);
  }
  return err({
    ...(ref === undefined ? {} : { path: ref }),
    offset: 0,
    section: SECTION,
    message:
      "unrecognised image signature: expected PNG (89 50 4E 47 0D 0A 1A 0A), " +
      "JPEG (FF D8 FF), Windows bitmap (BM) or GIF (GIF87a / GIF89a)",
  });
}

/**
 * Decode a GIF's pages, with their delays, for the animation path
 * (docs/spec/formats/images.md#gif, R-10).
 *
 * `ref` is the file's path, when the caller has one. `pageLimit` stops the walk
 * after that many pages. Every frame is the logical screen size, in file order;
 * `transparent` is R-10's key colour. Never throws: a damaged file is
 * `ok: false` with a located error.
 */
export function decodeGif(
  bytes: Uint8Array,
  ref?: string,
  pageLimit?: number,
): Result<DecodedGif> {
  return readGif(bytes, ref, pageLimit);
}
