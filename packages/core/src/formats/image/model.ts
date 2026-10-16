/**
 * The decoded-image model shared by the PNG, JPEG and BMP decoders
 * (format-spec §10, AD-28).
 *
 * `decodeTexture` is the single place a game image becomes pixels: `core/raster`,
 * every runner and the editor ask for this type and cannot disagree about what
 * an image contains. The bytes are **straight** (non-premultiplied) 8-bit RGBA —
 * the file's own colours and its own alpha (`tRNS`, alpha channels), nothing
 * added. A colour key is not part of the file (format-spec §10 keeps it per
 * image or per frame, outside the image), so the decoder never applies one: the
 * key is the `key` of a `blit` (AD-3), and `core/raster` tests it on these
 * pixels.
 */

/**
 * A decoded game image (AD-28, format-spec §10).
 *
 * `rgba` is a fresh, non-aliasing array of exactly `w * h * 4` bytes in
 * row-major order — R, G, B, A per pixel, top row first. The caller owns it and
 * may mutate it; nothing else in `core` holds a reference.
 */
export interface DecodedTexture {
  /** The image width in pixels (the PNG/JPEG width, never a padded one). */
  readonly w: number;
  /** The image height in pixels. */
  readonly h: number;
  /** `w * h * 4` straight RGBA bytes, row-major. */
  readonly rgba: Uint8Array;
}
