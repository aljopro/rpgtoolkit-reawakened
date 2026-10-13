/**
 * The reference surface: a mutable straight-RGBA pixel buffer (AD-3, AD-4).
 *
 * A surface is a plain buffer plus its size — no DOM, no canvas, no host
 * object — so the same code rasterises a golden image, a script's read-back
 * and the editor's export. Pixels are four bytes per pixel, row-major,
 * non-premultiplied, and an alpha of 0 means "nothing is there" (AD-28 decodes
 * images to the same layout).
 *
 * The pixel pipeline is AD-3's, normatively: a pixel that is format-transparent
 * or equal to the command's `key` is skipped, tested on the untinted source; the
 * tint is added once and clamped; the source's own alpha multiplies the
 * command's alpha (format-spec §15, RND-21); then the blend is applied. Every
 * step is integer arithmetic, because two runners must agree on every pixel
 * (G3).
 */

import type { BlitCommand, Rgb } from "../ports/draw.ts";

/** A mutable RGBA pixel buffer (AD-3, AD-27). */
export type Surface = {
  /** Width in pixels. */
  readonly width: number;
  /** Height in pixels. */
  readonly height: number;
  /** `width · height · 4` bytes, row-major, straight RGBA. */
  readonly rgba: Uint8Array;
};

/** One decoded pixel. */
export type Rgba = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
};

/**
 * A new, fully transparent surface. `width` and `height` are pixel counts; a
 * non-positive one yields an empty surface rather than throwing, so a caller
 * that computed a size from data cannot crash the core (AD-18's spirit).
 */
export function createSurface(width: number, height: number): Surface {
  const w = width > 0 ? Math.floor(width) : 0;
  const h = height > 0 ? Math.floor(height) : 0;
  return { width: w, height: h, rgba: new Uint8Array(w * h * 4) };
}

/** Every pixel becomes `rgb`, fully opaque (an AD-3 `fill`). */
export function fillSurface(surface: Surface, rgb: Rgb): void {
  const { rgba } = surface;
  const r = clampChannel(rgb.r);
  const g = clampChannel(rgb.g);
  const b = clampChannel(rgb.b);
  for (let at = 0; at < rgba.length; at += 4) {
    rgba[at] = r;
    rgba[at + 1] = g;
    rgba[at + 2] = b;
    rgba[at + 3] = 255;
  }
}

/** The pixel at `x, y`, or `null` when the point is outside the surface. */
export function pixelAt(surface: Surface, x: number, y: number): Rgba | null {
  if (x < 0 || y < 0 || x >= surface.width || y >= surface.height) {
    return null;
  }
  const at = (y * surface.width + x) * 4;
  return {
    r: surface.rgba[at] ?? 0,
    g: surface.rgba[at + 1] ?? 0,
    b: surface.rgba[at + 2] ?? 0,
    a: surface.rgba[at + 3] ?? 0,
  };
}

/**
 * Replay one `blit` onto `target`, reading `source` (AD-3). The source is a
 * surface the caller resolved: a decoded tile, a decoded image, or another
 * surface. A source pixel outside the target or the source rectangle is
 * skipped, so a partially off-screen blit is not an error.
 *
 * `command.iso2d` is refused: the 2D-on-iso projection is a renderer feature
 * that lands with epic-board-rendering entry 3, and guessing one here would
 * freeze a wrong projection into every golden image (format-spec §15, RND-1).
 */
export function blitSurface(target: Surface, command: BlitCommand, source: Surface): void {
  if (command.iso2d) {
    throw new UnsupportedRasterFeatureError("blit.iso2d", "3");
  }
  const { dst, src, key, tint, alpha } = command;
  if (dst.w <= 0 || dst.h <= 0 || src.w <= 0 || src.h <= 0 || alpha <= 0) {
    return;
  }
  const left = Math.max(dst.x, 0);
  const top = Math.max(dst.y, 0);
  const right = Math.min(dst.x + dst.w, target.width);
  const bottom = Math.min(dst.y + dst.h, target.height);
  for (let y = top; y < bottom; y += 1) {
    const sy = src.y + Math.floor(((y - dst.y) * src.h) / dst.h);
    if (sy < 0 || sy >= source.height) {
      continue;
    }
    for (let x = left; x < right; x += 1) {
      const sx = src.x + Math.floor(((x - dst.x) * src.w) / dst.w);
      if (sx < 0 || sx >= source.width) {
        continue;
      }
      const from = (sy * source.width + sx) * 4;
      const sourceAlpha = source.rgba[from + 3] ?? 0;
      if (sourceAlpha === 0) {
        continue;
      }
      const r0 = source.rgba[from] ?? 0;
      const g0 = source.rgba[from + 1] ?? 0;
      const b0 = source.rgba[from + 2] ?? 0;
      if (key !== null && r0 === key.r && g0 === key.g && b0 === key.b) {
        continue;
      }
      const r = clampChannel(r0 + tint.r);
      const g = clampChannel(g0 + tint.g);
      const b = clampChannel(b0 + tint.b);
      const a = Math.floor((alpha * sourceAlpha + 127) / 255);
      if (a === 0) {
        continue;
      }
      const to = (y * target.width + x) * 4;
      target.rgba[to] = blendChannel(command.blend, target.rgba[to] ?? 0, r, a);
      target.rgba[to + 1] = blendChannel(command.blend, target.rgba[to + 1] ?? 0, g, a);
      target.rgba[to + 2] = blendChannel(command.blend, target.rgba[to + 2] ?? 0, b, a);
      const below = target.rgba[to + 3] ?? 0;
      target.rgba[to + 3] = Math.max(below, a);
    }
  }
}

/**
 * One channel of a blend (AD-3): `normal` keeps the source, `translucent`
 * mixes by alpha and `additive` adds the alpha-scaled source. The formulas are
 * integer division, spelled exactly as AD-3 states them.
 */
function blendChannel(blend: BlitCommand["blend"], dst: number, src: number, alpha: number): number {
  switch (blend) {
    case "normal":
      return src;
    case "translucent":
      return Math.floor((dst * (255 - alpha) + src * alpha + 127) / 255);
    case "additive":
      return Math.min(255, dst + Math.floor((src * alpha + 127) / 255));
  }
}

/** Clamp one colour channel to a byte (AD-3's one clamped `src + tint`). */
export function clampChannel(value: number): number {
  const floored = Math.floor(value);
  if (floored < 0) {
    return 0;
  }
  if (floored > 255) {
    return 255;
  }
  return floored;
}

/** A rendering feature the reference rasteriser does not have yet (AD-4). */
export class UnsupportedRasterFeatureError extends Error {
  /** The feature that was asked for, e.g. `"blit.iso2d"`. */
  readonly feature: string;
  /** The epic-board-rendering entry that adds it. */
  readonly entry: string;

  constructor(feature: string, entry: string) {
    super(`core/raster cannot draw \`${feature}\` yet: it lands with epic-board-rendering entry ${entry} (AD-4).`);
    this.name = "UnsupportedRasterFeatureError";
    this.feature = feature;
    this.entry = entry;
  }
}
