/**
 * The decoded-image model shared by the PNG, JPEG, BMP and GIF decoders
 * (docs/spec/formats/images.md#the-shared-decode-contract, AD-28).
 *
 * `decodeTexture` is the single place a game image becomes pixels: `core/raster`,
 * every runner and the editor ask for this type and cannot disagree about what
 * an image contains. The bytes are **straight** (non-premultiplied) 8-bit RGBA —
 * the file's own colours and its own alpha (`tRNS`, alpha channels), nothing
 * added. A colour key is not part of the file (docs/spec/formats/images.md#the-shared-decode-contract keeps it per
 * image or per frame, outside the image), so the decoder never applies one: the
 * key is the `key` of a `blit` (AD-3), and `core/raster` tests it on these
 * pixels.
 *
 * A GIF is the one kind that is a sequence of pages, which `DecodedTexture`
 * cannot express: `decodeGif` returns `DecodedGif`, its pages as frames with
 * their delays (docs/spec/formats/images.md#gif, R-10), and `decodeTexture`
 * returns the first page alone.
 */

/**
 * A decoded game image (AD-28, docs/spec/formats/images.md#the-shared-decode-contract).
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

/**
 * One page of a decoded GIF as a frame of the animation (AD-28,
 * docs/spec/formats/images.md#gif).
 *
 * `rgba` is a fresh, non-aliasing array of exactly the logical screen's
 * `w * h * 4` bytes in row-major order — the canvas after this page was drawn:
 * the page's own pixels at their offset, whatever earlier pages the disposal
 * method left in place, and alpha 0 with RGB 0 where nothing has painted.
 */
export interface DecodedGifFrame {
  /** The logical screen's RGBA after this page was drawn. */
  readonly rgba: Uint8Array;
  /** This page's frame time in seconds, from its control extension; 0 when it has none. */
  readonly delay: number;
}

/**
 * A decoded GIF (AD-28, docs/spec/formats/images.md#gif): its logical screen,
 * every page as a frame in file order, and the colour the animation keys out.
 *
 * The frames are all the **logical screen** size, in file order, and the delays
 * are the file's own (hundredths ÷ 100). `transparent` is R-10's adoption rule:
 * the first page's transparent index's palette colour when that page declares
 * one, else the background index's colour when it is inside the global table,
 * else magenta `(255, 0, 255)`.
 */
export interface DecodedGif {
  /** The logical screen width in pixels; every frame is this wide. */
  readonly w: number;
  /** The logical screen height in pixels; every frame is this tall. */
  readonly h: number;
  /** The pages, in file order, each composited on the logical screen. */
  readonly frames: readonly DecodedGifFrame[];
  /** The animation's transparent colour (R-10). */
  readonly transparent: { readonly r: number; readonly g: number; readonly b: number };
}
