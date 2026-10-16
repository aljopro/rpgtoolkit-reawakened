/**
 * The animation model and its constants (format-spec §7.1).
 *
 * A `.anm` is a fixed run of frame slots followed by one delay. The model keeps
 * every slot, including the empty ones, each frame's image reference verbatim
 * and any bytes after the delay as `residue`, so an unmodified animation writes
 * back byte-for-byte (AD-18, §1.7, §7.1).
 */

import type { Colorref } from "../binary/color.ts";

/** The magic every binary animation starts with (format-spec §7.1). */
export const ANIMATION_MAGIC = "RPGTLKIT ANIM";

/** The only minor version the binary animation layout accepts (format-spec §7.1). */
export const ANIMATION_MINOR = 3;

/**
 * The offset of the binary/text detection byte for `.anm` (docs/spec/formats/legacy/README.md):
 * `0x00` means binary, non-zero means the 2.x text form.
 */
export const ANIMATION_DETECT_OFFSET = 13;

/** The format-spec section the animation reader and writer implement (G7). */
export const ANIMATION_SECTION = "format-spec §7.1";

/** One frame slot of an animation (format-spec §7.1). */
export interface AnimationFrame {
  /**
   * The image reference, kept **verbatim** for a byte-identical round-trip
   * (§7.1, §1.6). It may be an ordinary picture from `Bitmap/`, a tile
   * reference such as `set.tstN`, a `.tbm`, or the empty string. A frame with
   * an empty image is skipped at playback time but stays in the model.
   */
  readonly image: string;
  /** This frame's own transparent colour (a COLORREF, format-spec §1.1). */
  readonly transparent: Colorref;
  /** The sound cue played when the frame is shown (§7.1). */
  readonly sound: string;
}

/** A parsed animation (format-spec §7.1). */
export interface Animation {
  /** The magic string, e.g. `"RPGTLKIT ANIM"` (§1.3, §7.1). */
  readonly magic: string;
  /** The major version; informational only (§1.4). */
  readonly major: number;
  /** The minor version; must be 3 for this layout (§1.4, §7.1). */
  readonly minor: number;
  /** Width in pixels (§7.1). */
  readonly width: number;
  /** Height in pixels (§7.1). */
  readonly height: number;
  /**
   * The frame slots, in file order. Its length is the stored upper bound plus
   * one (a stored `-1` means none, format-spec §1.2); the writer derives the
   * bound back from it, so empty slots round-trip.
   */
  readonly frames: readonly AnimationFrame[];
  /** Seconds per frame (§7.1). */
  readonly delay: number;
  /**
   * Bytes after the last documented field, kept so a write is byte-identical
   * (AD-18, §1.7). The spec defines no trailing data, so a non-empty residue is
   * reported as a warning rather than dropped.
   */
  readonly residue: Uint8Array;
}
