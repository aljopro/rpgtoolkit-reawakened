/**
 * Outline flattening, fixed-point nonzero-winding coverage rasterisation,
 * and external glyph raster caching for TrueType vector fonts (AD-15).
 */

import type { TrueTypeFont, TrueTypeGlyph, TrueTypeOutlineCommand } from "../formats/font/truetype.ts";

export interface LineSegment {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

export interface GlyphRaster {
  readonly width: number;
  readonly height: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly coverage: Uint8Array;
}

const glyphRasterCache = new WeakMap<TrueTypeFont, Map<string, GlyphRaster>>();

function flattenOutline(
  commands: readonly TrueTypeOutlineCommand[],
  bold: boolean,
  italic: boolean,
  ascentPx: number,
): { readonly lines: LineSegment[]; readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number } {
  const lines: LineSegment[] = [];
  let currX = 0;
  let currY = 0;
  let startX = 0;
  let startY = 0;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  function addLine(x0: number, y0: number, x1: number, y1: number): void {
    let X0 = Math.round(x0 * 64);
    let Y0 = Math.round(y0 * 64);
    let X1 = Math.round(x1 * 64);
    let Y1 = Math.round(y1 * 64);

    if (italic) {
      const slant0 = Math.round((ascentPx * 64 - Y0) * 12 / 64);
      const slant1 = Math.round((ascentPx * 64 - Y1) * 12 / 64);
      X0 += slant0;
      X1 += slant1;
    }

    if (Y0 !== Y1) {
      lines.push({ x0: X0, y0: Y0, x1: X1, y1: Y1 });
      minX = Math.min(minX, X0, X1);
      minY = Math.min(minY, Y0, Y1);
      maxX = Math.max(maxX, X0, X1);
      maxY = Math.max(maxY, Y0, Y1);
    }
  }

  function flattenQuad(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, depth: number): void {
    const dx = x2 - x0;
    const dy = y2 - y0;
    const lineLen2 = dx * dx + dy * dy;
    let dist = 0;
    if (lineLen2 === 0) {
      dist = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
    } else {
      dist = Math.abs((x1 - x0) * dy - (y1 - y0) * dx) / Math.sqrt(lineLen2);
    }
    if (dist <= 0.25 || depth >= 8) {
      addLine(x0, y0, x2, y2);
      return;
    }
    const x01 = (x0 + x1) / 2;
    const y01 = (y0 + y1) / 2;
    const x12 = (x1 + x2) / 2;
    const y12 = (y1 + y2) / 2;
    const x012 = (x01 + x12) / 2;
    const y012 = (y01 + y12) / 2;
    flattenQuad(x0, y0, x01, y01, x012, y012, depth + 1);
    flattenQuad(x012, y012, x12, y12, x2, y2, depth + 1);
  }

  function flattenCubic(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    depth: number,
  ): void {
    const dx = x3 - x0;
    const dy = y3 - y0;
    const lineLen2 = dx * dx + dy * dy;
    let dist1 = 0;
    let dist2 = 0;
    if (lineLen2 === 0) {
      dist1 = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
      dist2 = Math.sqrt((x2 - x0) * (x2 - x0) + (y2 - y0) * (y2 - y0));
    } else {
      const len = Math.sqrt(lineLen2);
      dist1 = Math.abs((x1 - x0) * dy - (y1 - y0) * dx) / len;
      dist2 = Math.abs((x2 - x0) * dy - (y2 - y0) * dx) / len;
    }
    if ((dist1 <= 0.25 && dist2 <= 0.25) || depth >= 8) {
      addLine(x0, y0, x3, y3);
      return;
    }
    const x01 = (x0 + x1) / 2;
    const y01 = (y0 + y1) / 2;
    const x12 = (x1 + x2) / 2;
    const y12 = (y1 + y2) / 2;
    const x23 = (x2 + x3) / 2;
    const y23 = (y2 + y3) / 2;
    const x012 = (x01 + x12) / 2;
    const y012 = (y01 + y12) / 2;
    const x123 = (x12 + x23) / 2;
    const y123 = (y12 + y23) / 2;
    const x0123 = (x012 + x123) / 2;
    const y0123 = (y012 + y123) / 2;
    flattenCubic(x0, y0, x01, y01, x012, y012, x0123, y0123, depth + 1);
    flattenCubic(x0123, y0123, x123, y123, x23, y23, x3, y3, depth + 1);
  }

  for (const cmd of commands) {
    if (cmd.type === "M") {
      currX = cmd.x ?? 0;
      currY = cmd.y ?? 0;
      startX = currX;
      startY = currY;
    } else if (cmd.type === "L") {
      const nextX = cmd.x ?? currX;
      const nextY = cmd.y ?? currY;
      addLine(currX, currY, nextX, nextY);
      currX = nextX;
      currY = nextY;
    } else if (cmd.type === "Q") {
      const cX = cmd.x1 ?? currX;
      const cY = cmd.y1 ?? currY;
      const endX = cmd.x ?? currX;
      const endY = cmd.y ?? currY;
      flattenQuad(currX, currY, cX, cY, endX, endY, 0);
      currX = endX;
      currY = endY;
    } else if (cmd.type === "C") {
      const c1X = cmd.x1 ?? currX;
      const c1Y = cmd.y1 ?? currY;
      const c2X = cmd.x2 ?? currX;
      const c2Y = cmd.y2 ?? currY;
      const endX = cmd.x ?? currX;
      const endY = cmd.y ?? currY;
      flattenCubic(currX, currY, c1X, c1Y, c2X, c2Y, endX, endY, 0);
      currX = endX;
      currY = endY;
    } else if (cmd.type === "Z") {
      if (currX !== startX || currY !== startY) {
        addLine(currX, currY, startX, startY);
      }
      currX = startX;
      currY = startY;
    }
  }

  return { lines, minX, minY, maxX, maxY };
}

function rasterizeLines(
  lines: readonly LineSegment[],
  originX: number,
  originY: number,
  width: number,
  height: number,
  bold: boolean,
): Uint8Array {
  const coverage = new Uint8Array(width * height);
  if (width <= 0 || height <= 0 || lines.length === 0) return coverage;

  const rawWidth = bold ? Math.max(1, width - 1) : width;
  const rawCoverage = bold ? new Uint8Array(rawWidth * height) : coverage;

  for (let py = 0; py < height; py += 1) {
    const rowTop = originY + py * 64;
    const rowBot = rowTop + 64;
    const deltas = new Int32Array(rawWidth + 1);
    const cellAreas = new Int32Array(rawWidth);

    for (const line of lines) {
      const minY = Math.min(line.y0, line.y1);
      const maxY = Math.max(line.y0, line.y1);
      if (maxY <= rowTop || minY >= rowBot) continue;

      const yA = Math.max(minY, rowTop);
      const yB = Math.min(maxY, rowBot);
      const dy = line.y1 > line.y0 ? (yB - yA) : -(yB - yA);

      const totalDy = line.y1 - line.y0;
      const xA = line.x0 + Math.round((line.x1 - line.x0) * (yA - line.y0) / totalDy) - originX;
      const xB = line.x0 + Math.round((line.x1 - line.x0) * (yB - line.y0) / totalDy) - originX;

      const pxA = Math.floor(Math.min(xA, xB) / 64);
      const pxB = Math.floor(Math.max(xA, xB) / 64);

      if (pxA === pxB) {
        const px = pxA;
        if (px >= 0 && px < rawWidth) {
          const midX = (xA + xB) / 2;
          const right = (px + 1) * 64;
          cellAreas[px] = (cellAreas[px] ?? 0) + Math.round(dy * (right - midX));
        }
        if (px + 1 < rawWidth && px + 1 >= 0) {
          deltas[px + 1] = (deltas[px + 1] ?? 0) + dy * 64;
        } else if (px + 1 <= 0) {
          deltas[0] = (deltas[0] ?? 0) + dy * 64;
        }
      } else {
        const startCol = Math.max(0, pxA);
        const endCol = Math.min(rawWidth - 1, pxB);
        for (let px = startCol; px <= endCol; px += 1) {
          const colL = px * 64;
          const colR = (px + 1) * 64;
          const subXA = Math.max(colL, Math.min(colR, xA));
          const subXB = Math.max(colL, Math.min(colR, xB));
          const subYA = xB !== xA ? yA + Math.round((yB - yA) * (subXA - xA) / (xB - xA)) : yA;
          const subYB = xB !== xA ? yA + Math.round((yB - yA) * (subXB - xA) / (xB - xA)) : yB;
          const subDy = line.y1 > line.y0 ? Math.abs(subYB - subYA) : -Math.abs(subYB - subYA);
          const subMidX = (subXA + subXB) / 2;
          cellAreas[px] = (cellAreas[px] ?? 0) + Math.round(subDy * (colR - subMidX));
          if (px + 1 < rawWidth) {
            deltas[px + 1] = (deltas[px + 1] ?? 0) + subDy * 64;
          }
        }
      }
    }

    let runningArea = 0;
    for (let px = 0; px < rawWidth; px += 1) {
      runningArea += deltas[px]!;
      const totalArea = cellAreas[px]! + runningArea;
      const cov = Math.min(255, Math.floor(Math.abs(totalArea) * 255 / 4096 + 0.5));
      rawCoverage[py * rawWidth + px] = cov;
    }
  }

  if (bold) {
    for (let py = 0; py < height; py += 1) {
      for (let px = 0; px < width; px += 1) {
        const c1 = px < rawWidth ? rawCoverage[py * rawWidth + px]! : 0;
        const c0 = px > 0 && px - 1 < rawWidth ? rawCoverage[py * rawWidth + px - 1]! : 0;
        coverage[py * width + px] = Math.min(255, c1 + c0);
      }
    }
  }

  return coverage;
}

/**
 * Return cached raster coverage for a TrueType glyph.
 * Computes outlines and fills with nonzero winding coverage when not cached.
 */
export function getGlyphRaster(
  font: TrueTypeFont,
  glyph: TrueTypeGlyph,
  size: number,
  bold = false,
  italic = false,
): GlyphRaster {
  let fontCache = glyphRasterCache.get(font);
  if (fontCache === undefined) {
    fontCache = new Map<string, GlyphRaster>();
    glyphRasterCache.set(font, fontCache);
  }
  const cacheKey = `${size}:${glyph.id}:${bold ? 1 : 0}:${italic ? 1 : 0}`;
  const cached = fontCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const roundedSize = Math.max(1, Math.floor(size + 0.5));
  const ascentPx = Math.floor(font.ascent * roundedSize / font.unitsPerEm + 0.5);
  const commands = font.getCommands(glyph, roundedSize, 0, 0);

  const { lines, minX, minY, maxX, maxY } = flattenOutline(commands, bold, italic, ascentPx);
  if (lines.length === 0 || !Number.isFinite(minX) || !Number.isFinite(minY)) {
    const emptyRaster: GlyphRaster = {
      width: 0,
      height: 0,
      offsetX: 0,
      offsetY: 0,
      coverage: new Uint8Array(0),
    };
    fontCache.set(cacheKey, emptyRaster);
    return emptyRaster;
  }

  const pxMinX = Math.floor(minX / 64);
  const pxMaxX = Math.ceil(maxX / 64);
  const pxMinY = Math.floor(minY / 64);
  const pxMaxY = Math.ceil(maxY / 64);

  const width = Math.max(1, pxMaxX - pxMinX + (bold ? 1 : 0));
  const height = Math.max(1, pxMaxY - pxMinY);
  const originX = pxMinX * 64;
  const originY = pxMinY * 64;

  const coverage = rasterizeLines(lines, originX, originY, width, height, bold);
  const raster: GlyphRaster = {
    width,
    height,
    offsetX: pxMinX,
    offsetY: pxMinY,
    coverage,
  };
  fontCache.set(cacheKey, raster);
  return raster;
}
