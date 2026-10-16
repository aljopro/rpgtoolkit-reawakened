/**
 * Classifying an animation frame's `image` string (docs/spec/formats/animation.md#layout, with the
 * tile-reference grammar of `docs/spec/formats/README.md#tile-references` and the tile bitmap of `docs/spec/formats/tiles.md#tile-bitmap-tbm`).
 *
 * The classifier only inspects the string; it never resolves a reference
 * against a project folder, so it is pure (G2) and leaves path resolution to
 * the asset resolver(docs/spec/formats/README.md#paths-inside-files).
 */

import { asciiLower } from "../main-file/layout.ts";

/**
 * What a frame's `image` string denotes (docs/spec/formats/animation.md#layout): nothing (an empty slot, skipped
 * at playback), a tile reference (`set.tstN` / `set.isoN`, `docs/spec/formats/README.md#tile-references`), a tile bitmap
 * (`.tbm`, `docs/spec/formats/tiles.md#tile-bitmap-tbm`), or an ordinary picture path from `Bitmap/`.
 */
export type ImageReference =
  | { readonly kind: "empty" }
  | { readonly kind: "tile"; readonly tileset: string; readonly index: number }
  | { readonly kind: "singleTile"; readonly path: string }
  | { readonly kind: "tileBitmap"; readonly path: string }
  | { readonly kind: "picture"; readonly path: string };

/** Whether every character of `value` is an ASCII digit 0–9. */
function isDigitRun(value: string): boolean {
  if (value === "") {
    return false;
  }
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x30 || code > 0x39) {
      return false;
    }
  }
  return true;
}

/**
 * Classify a frame's `image` string (docs/spec/formats/animation.md#layout, `docs/spec/formats/README.md#tile-references`). A tile reference
 * is a tileset name whose three-character extension is `tst` or `iso` with a
 * 1-based digit index appended directly (`default.tst12` → `default.tst`,
 * index 12); `.tbm` is a tile bitmap; anything else is an ordinary picture
 * path. Matching is case-insensitive because the legacy file system was
 * (`docs/spec/formats/README.md#paths-inside-files`).
 */
export function classifyImageReference(image: string): ImageReference {
  if (image === "") {
    return { kind: "empty" };
  }
  const dot = image.lastIndexOf(".");
  if (dot < 0) {
    return { kind: "picture", path: image };
  }
  const ext = asciiLower(image.slice(dot + 1, dot + 4));
  const rest = image.slice(dot + 4);
  if ((ext === "tst" || ext === "iso") && isDigitRun(rest)) {
    return { kind: "tile", tileset: image.slice(0, dot + 4), index: Number(rest) };
  }
  if (ext === "gph" && rest === "") {
    return { kind: "singleTile", path: image };
  }
  if (ext === "tbm" && rest === "") {
    return { kind: "tileBitmap", path: image };
  }
  return { kind: "picture", path: image };
}
