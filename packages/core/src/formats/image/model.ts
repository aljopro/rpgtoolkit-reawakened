/**
 * The decoded-image model shared by the PNG and JPEG decoders (format-spec §10,
 * AD-28).
 *
 * `decodeTexture` is the single place a game image becomes pixels: `core/raster`,
 * every runner and the editor ask for this type and cannot disagree about what
 * an image contains. The bytes are **straight** (non-premultiplied) 8-bit RGBA
 * with alpha 255 where the source has no transparency, so the colour-key
 * comparisons of format-spec §10 see the file's own channels.
 */

/**
 * A decoded game image (AD-28, format-spec §10).
 *
 * `rgba` is a fresh, non-aliasing array of exactly `width * height * 4` bytes in
 * row-major order — R, G, B, A per pixel, top row first. The caller owns it and
 * may mutate it; nothing else in `core` holds a reference.
 */
export interface DecodedTexture {
  /** The image width in pixels (the PNG/JPEG width, never a padded one). */
  readonly width: number;
  /** The image height in pixels. */
  readonly height: number;
  /** `width * height * 4` straight RGBA bytes, row-major. */
  readonly rgba: Uint8Array;
}
