/**
 * The tileset reader and writer: `.tst` (version 20) and `.iso` (version 30)
 * of format-spec §3.1, plus the isometric packing of §3.3.
 *
 * The file is a 6-byte header — `i16 version`, `i16 tileCount` (a true count,
 * not an upper bound), `i16 detail` — followed by tightly packed tiles. Tile
 * *n* (1-based) starts at `6 + (n−1) × size × size × bytesPerPixel`, and each
 * tile's pixels are stored **column-major**: the outer loop runs over x and
 * the inner loop over y, so the first `size` pixels are the left-most column
 * top to bottom.
 *
 * The model keeps the stored pixel bytes exactly as read (AD-18), so
 * `writeTileset` re-emits the input byte-for-byte; `expandTileToRgba` is the
 * separate accessor the renderer uses to get the resolved pixels, applying the
 * transparent key as alpha 0 and the VGA palette for the 8-bit details.
 */

import { err, ok, type Result } from "../result.ts";
import { BinaryReader } from "../binary/reader.ts";
import { BinaryWriter } from "../binary/writer.ts";
import { ISO_IMAGE_HEIGHT, ISO_IMAGE_WIDTH, isInsideIsoDiamond } from "./iso-diamond.ts";
import { VGA_DEFAULT_PALETTE } from "./vga-palette.ts";

const HEADER_SECTION = "format-spec §3.1";

/** The stored `version` field: 20 is `.tst`, 30 is `.iso` (format-spec §3.1). */
export type TilesetVersion = 20 | 30;

/** How one `detail` level lays a tile out (format-spec §3.1). */
export interface TilesetDetail {
  /** The stored `detail` value. */
  readonly code: number;
  /** The tile side in pixels: 32 or 16. */
  readonly size: number;
  /** Bytes per pixel: 3 for 24-bit RGB, 1 for a palette index. */
  readonly bytesPerPixel: 1 | 3;
  /** Whether the stored block is the §3.3 isometric packing (detail 150). */
  readonly isometric: boolean;
}

/** The `detail` table of format-spec §3.1, keyed by the stored value. */
const DETAILS: readonly TilesetDetail[] = [
  { code: 1, size: 32, bytesPerPixel: 3, isometric: false },
  { code: 2, size: 16, bytesPerPixel: 3, isometric: false },
  { code: 3, size: 32, bytesPerPixel: 1, isometric: false },
  { code: 4, size: 16, bytesPerPixel: 1, isometric: false },
  { code: 5, size: 32, bytesPerPixel: 1, isometric: false },
  { code: 6, size: 16, bytesPerPixel: 1, isometric: false },
  { code: 150, size: 32, bytesPerPixel: 3, isometric: true },
];

/** The `detail` descriptor for a stored code, or `undefined` if unlisted. */
export function tilesetDetail(code: number): TilesetDetail | undefined {
  return DETAILS.find((detail) => detail.code === code);
}

/** The 24-bit transparent key: the exact triple R=0, G=1, B=2 (§3.1). */
export const TRANSPARENT_RGB = { r: 0, g: 1, b: 2 } as const;

/** The 8-bit transparent key: the palette index 255 (§3.1). */
export const TRANSPARENT_INDEX = 255;

/** One tile, holding its stored pixels verbatim (column-major, §3.1). */
export interface TilesetTile {
  /** `size × size × bytesPerPixel` stored bytes, column-major. */
  readonly pixels: Uint8Array;
}

/** A whole tileset: the header plus every tile and any trailing bytes. */
export interface Tileset {
  /** The stored version (format-spec §3.1). */
  readonly version: TilesetVersion;
  /** The uniform `detail` layout (format-spec §3.1). */
  readonly detail: TilesetDetail;
  /** The tiles, in file order. */
  readonly tiles: readonly TilesetTile[];
  /**
   * Bytes after the last tile, kept so the writer re-emits them unchanged
   * (AD-18). The spec defines no trailing data, so a non-empty residue is
   * reported as a warning rather than dropped.
   */
  readonly residue: Uint8Array;
}

/** How many stored bytes one tile occupies for a detail (format-spec §3.1). */
function storedTileSize(detail: TilesetDetail): number {
  return detail.size * detail.size * detail.bytesPerPixel;
}

/**
 * The width/height of one tile as stored, once expanded to RGBA (format-spec
 * §3.1, §3.3): 32×32 for a 2D tileset, 64×32 for an isometric one, and 16×16
 * for the 16×16 details (2, 4 and 6). Those 16×16 tiles are not doubled here:
 * §3.1 puts the pixel doubling in the renderer, which does it once per tileset
 * and caches the result, so this layer reports what the file stores.
 */
export function tileDimensions(detail: TilesetDetail): { width: number; height: number } {
  return detail.isometric
    ? { width: ISO_IMAGE_WIDTH, height: ISO_IMAGE_HEIGHT }
    : { width: detail.size, height: detail.size };
}

/** A located error for a tileset field (AD-18). */
function fail(offset: number, section: string, message: string, path?: string): Result<never> {
  return err({ ...(path === undefined ? {} : { path }), offset, section, message });
}

/**
 * Read a `.tst`/`.iso` file (format-spec §3.1). Never throws: a truncated
 * header, an unlisted version or detail, a negative count or a short tile run
 * all come back as `ok: false` with the failing field's byte offset.
 */
export function readTileset(bytes: Uint8Array, path?: string): Result<Tileset> {
  const reader = new BinaryReader(bytes, path);

  const version = reader.i16();
  if (!version.ok) {
    return version;
  }
  if (version.value !== 20 && version.value !== 30) {
    return fail(0, HEADER_SECTION, `unknown tileset version ${version.value}: expected 20 (.tst) or 30 (.iso)`, path);
  }

  const tileCount = reader.readTrueCount("i16");
  if (!tileCount.ok) {
    return tileCount;
  }
  if (tileCount.value < 0) {
    return fail(2, HEADER_SECTION, `tileCount is a true count and cannot be negative (${tileCount.value})`, path);
  }

  const detailCode = reader.i16();
  if (!detailCode.ok) {
    return detailCode;
  }
  const detail = tilesetDetail(detailCode.value);
  if (detail === undefined) {
    return fail(4, HEADER_SECTION, `unknown tileset detail ${detailCode.value}: not one of 1–6 or 150`, path);
  }
  const perTile = storedTileSize(detail);
  const tiles: TilesetTile[] = [];
  for (let n = 0; n < tileCount.value; n += 1) {
    const pixels = reader.readBytes(perTile);
    if (!pixels.ok) {
      return pixels;
    }
    tiles.push({ pixels: pixels.value });
  }

  const residue = reader.readBytes(reader.remaining);
  if (!residue.ok) {
    return residue;
  }
  const warnings =
    residue.value.length === 0
      ? []
      : [`${residue.value.length} trailing byte(s) after the tiles were kept as residue (format-spec §3.1)`];

  return ok({ version: version.value, detail, tiles, residue: residue.value }, warnings);
}

/**
 * Write a tileset back out (format-spec §3.1). Byte-identical to what
 * `readTileset` consumed for an unmodified model, because the stored pixel
 * bytes and any residue are re-emitted verbatim (AD-18).
 */
export function writeTileset(model: Tileset): Result<Uint8Array> {
  const perTile = storedTileSize(model.detail);
  for (const [n, tile] of model.tiles.entries()) {
    const actual = tile.pixels.length;
    if (actual !== perTile) {
      return fail(
        6 + n * perTile,
        HEADER_SECTION,
        `tile ${n + 1} has ${actual} stored byte(s) but detail ${model.detail.code} needs ${perTile}`,
      );
    }
  }
  if (model.tiles.length > 32_767) {
    return fail(2, HEADER_SECTION, `tileCount ${model.tiles.length} does not fit the i16 header field`);
  }

  const writer = new BinaryWriter();
  writer.i16(model.version);
  writer.i16(model.tiles.length);
  writer.i16(model.detail.code);
  for (const tile of model.tiles) {
    writer.writeBytes(tile.pixels);
  }
  writer.writeBytes(model.residue);
  return ok(writer.toBytes());
}

/**
 * Expand one tile to RGBA (format-spec §3.1, §3.3): the stored colour with the
 * transparent key turned into alpha 0, and the VGA palette applied for the
 * 8-bit details. The result is column-major, `width × height × 4` bytes, with
 * `tileDimensions` giving the width and height at the stored size (a 16×16
 * detail gives 16×16 pixels; doubling them to 32×32 is the renderer's job, §3.1).
 * The stored encoding is left untouched, so the writer still re-emits the
 * original bytes (AD-18).
 */
export function expandTileToRgba(model: Tileset, tileIndex: number): Result<Uint8Array> {
  const tile = model.tiles[tileIndex];
  if (tile === undefined) {
    return fail(
      6,
      HEADER_SECTION,
      model.tiles.length === 0
        ? `tileset has no tiles, so tile index ${tileIndex} is out of range`
        : `tile index ${tileIndex} is out of range (0…${model.tiles.length - 1})`,
    );
  }
  const { detail } = model;
  const { width, height } = tileDimensions(detail);
  const out = new Uint8Array(width * height * 4);

  if (detail.isometric) {
    expandIsometric(tile, out);
    return ok(out);
  }

  for (let x = 0; x < detail.size; x += 1) {
    for (let y = 0; y < detail.size; y += 1) {
      const stored = (x * detail.size + y) * detail.bytesPerPixel;
      const to = (x * height + y) * 4;
      if (detail.bytesPerPixel === 3) {
        write24Bit(
          out,
          to,
          tile.pixels[stored] ?? 0,
          tile.pixels[stored + 1] ?? 0,
          tile.pixels[stored + 2] ?? 0,
        );
      } else {
        writePalette(out, to, tile.pixels[stored] ?? 0);
      }
    }
  }
  return ok(out);
}

/** Write one 24-bit stored pixel into an RGBA slot (format-spec §3.1). */
function write24Bit(out: Uint8Array, at: number, r: number, g: number, b: number): void {
  const transparent = r === TRANSPARENT_RGB.r && g === TRANSPARENT_RGB.g && b === TRANSPARENT_RGB.b;
  out[at] = r;
  out[at + 1] = g;
  out[at + 2] = b;
  out[at + 3] = transparent ? 0 : 255;
}

/** Write one 8-bit palette pixel into an RGBA slot (format-spec §3.1). */
function writePalette(out: Uint8Array, at: number, index: number): void {
  if (index === TRANSPARENT_INDEX) {
    out[at + 3] = 0;
    return;
  }
  const from = index * 3;
  out[at] = VGA_DEFAULT_PALETTE[from] ?? 0;
  out[at + 1] = VGA_DEFAULT_PALETTE[from + 1] ?? 0;
  out[at + 2] = VGA_DEFAULT_PALETTE[from + 2] ?? 0;
  out[at + 3] = 255;
}

/**
 * Unpack a detail 150 tile (format-spec §3.3 step 2): walk the 64×32 image
 * column-major (x outer, y inner); at each pixel inside the diamond take the
 * next stored pixel, and leave the outside pixels transparent.
 */
function expandIsometric(tile: TilesetTile, out: Uint8Array): void {
  let next = 0;
  for (let x = 0; x < ISO_IMAGE_WIDTH; x += 1) {
    for (let y = 0; y < ISO_IMAGE_HEIGHT; y += 1) {
      if (!isInsideIsoDiamond(x, y)) {
        continue;
      }
      const to = (x * ISO_IMAGE_HEIGHT + y) * 4;
      const stored = next * 3;
      next += 1;
      write24Bit(
        out,
        to,
        tile.pixels[stored] ?? 0,
        tile.pixels[stored + 1] ?? 0,
        tile.pixels[stored + 2] ?? 0,
      );
    }
  }
}
