/**
 * Expanding single-tile pixels to straight RGBA
 * (`docs/spec/formats/tiles.md#single-tile-gph`, format-spec §3.2).
 */

import { ok, type Result } from "../result.ts";
import { DOS_PALETTE } from "../tileset/dos-palette.ts";
import type { SingleTile } from "./model.ts";

/**
 * Expand a single tile's stored pixels to a straight RGBA buffer (width × height × 4 bytes).
 *
 * Stored pixels are in column-major order (x outer, y inner).
 * If `layout` is `"column-major"` (default, matching `expandTileToRgba`), the output is
 * `(x * height + y) * 4`. If `"row-major"` (standard image top-row first), the output is
 * `(y * width + x) * 4`.
 */
export function expandSingleTileToRgba(
  tile: SingleTile,
  layout: "column-major" | "row-major" = "column-major",
): Result<Uint8Array> {
  const { width, height, detail, pixels } = tile;
  const out = new Uint8Array(width * height * 4);
  const isPalette = detail === 3 || detail === 5;

  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      const srcIdx = x * height + y;
      const val = pixels[srcIdx] ?? -1;
      const dstIdx = layout === "column-major" ? (x * height + y) * 4 : (y * width + x) * 4;

      if (val === -1 || (isPalette && val === 255)) {
        // Transparent pixel
        out[dstIdx] = 0;
        out[dstIdx + 1] = 0;
        out[dstIdx + 2] = 0;
        out[dstIdx + 3] = 0;
      } else if (isPalette) {
        // DOS palette index
        const palIdx = (val & 0xff) * 3;
        out[dstIdx] = DOS_PALETTE[palIdx] ?? 0;
        out[dstIdx + 1] = DOS_PALETTE[palIdx + 1] ?? 0;
        out[dstIdx + 2] = DOS_PALETTE[palIdx + 2] ?? 0;
        out[dstIdx + 3] = 255;
      } else {
        // COLORREF: R + 256*G + 65536*B
        out[dstIdx] = val & 0xff;
        out[dstIdx + 1] = (val >> 8) & 0xff;
        out[dstIdx + 2] = (val >> 16) & 0xff;
        out[dstIdx + 3] = 255;
      }
    }
  }

  return ok(out);
}
