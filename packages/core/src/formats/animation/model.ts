/**
 * The animation model and its constants (docs/spec/formats/animation.md#layout).
 *
 * A `.anm` is a fixed run of frame slots followed by one delay. The model keeps
 * every slot, including the empty ones, each frame's image reference verbatim
 * and any bytes after the delay as `residue`, so an unmodified animation writes
 * back byte-for-byte (AD-18, `docs/spec/formats/README.md#bytes-after-the-last-documented-field`, docs/spec/formats/animation.md#layout).
 */

import type { Colorref } from "../binary/color.ts";

/** The magic every binary animation starts with (docs/spec/formats/animation.md#layout). */
export const ANIMATION_MAGIC = "RPGTLKIT ANIM";

/** The only minor version the binary animation layout accepts (docs/spec/formats/animation.md#layout). */
export const ANIMATION_MINOR = 3;
/**
 * The offset of the binary/text detection byte for `.anm` (docs/spec/formats/legacy/README.md):
 * `0x00` means binary, non-zero means the 2.x text form.
 */
export const ANIMATION_DETECT_OFFSET = 13;

/** The format specification section the animation reader and writer implement (G7). */
export const ANIMATION_SECTION = "docs/spec/formats/animation.md#layout";

/** One frame slot of an animation (docs/spec/formats/animation.md#layout). */
export interface AnimationFrame {
  /**
   * The image reference, kept **verbatim** for a byte-identical round-trip
   * (`docs/spec/formats/animation.md#layout`, `docs/spec/formats/README.md#tile-references`). It may be an ordinary picture from `Bitmap/`, a tile
   * reference such as `set.tstN`, a `.tbm`, or the empty string. A frame with
   * an empty image is skipped at playback time but stays in the model.
   */
  readonly image: string;
  /** This frame's own transparent colour (a COLORREF, `docs/spec/formats/README.md#primitive-encoding`). */
  readonly transparent: Colorref;
  /** The sound cue played when the frame is shown (`docs/spec/formats/animation.md#layout`). */
  readonly sound: string;
}

/** A parsed animation (docs/spec/formats/animation.md#layout). */
export interface Animation {
  /** The magic string, e.g. `"RPGTLKIT ANIM"` (`docs/spec/formats/README.md#header-and-version`, docs/spec/formats/animation.md#layout). */
  readonly magic: string;
  /** The major version; informational only (`docs/spec/formats/README.md#header-and-version`). */
  readonly major: number;
  /** The minor version; must be 3 for this layout (`docs/spec/formats/README.md#header-and-version`, docs/spec/formats/animation.md#layout). */
  readonly minor: number;
  /** Width in pixels (docs/spec/formats/animation.md#layout). */
  readonly width: number;
  /** Height in pixels (`docs/spec/formats/animation.md#layout`). */
  readonly height: number;
  /**
   * The frame slots, in file order. Its length is the stored upper bound plus
   * one (a stored `-1` means none, `docs/spec/formats/README.md#counts-are-usually-upper-bounds`); the writer derives the
   */
  readonly frames: readonly AnimationFrame[];
  /** Seconds per frame(docs/spec/formats/animation.md#layout). */
  readonly delay: number;
  /**
   * Bytes after the last documented field, kept so a write is byte-identical
   * (AD-18, docs/spec/formats/README.md#bytes-after-the-last-documented-field. The spec defines no trailing data, so a non-empty residue is
   * reported as a warning rather than dropped.
   */
  readonly residue: Uint8Array;
}
