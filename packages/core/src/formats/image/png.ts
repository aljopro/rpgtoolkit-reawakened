/**
 * PNG decoding for `decodeTexture` (format-spec §10, AD-28).
 *
 * A PNG is the 8-byte signature followed by length-prefixed, CRC-checked chunks.
 * `IHDR` gives the geometry; `PLTE` a palette and `tRNS` per-palette-entry (or
 * single-colour-key) alpha; the `IDAT` chunks hold one zlib stream of scanlines,
 * each scanline prefixed by a filter-type byte. This decoder inflates that
 * stream with `fflate`'s synchronous `unzlibSync` (AD-6), undoes the five spec
 * filters (None/Sub/Up/Average/Paeth), expands the palette and `tRNS`, and, for
 * an interlaced file, re-assembles the seven Adam7 passes.
 *
 * Everything the spec pairs is decoded: colour types 0 (grey), 2 (truecolour),
 * 3 (palette), 4 (grey+alpha) and 6 (truecolour+alpha) at their permitted bit
 * depths 1/2/4/8/16, filter method 0 and both interlace modes. A file that is
 * truncated, has a bad chunk CRC, or names a colour type/bit-depth/interlace
 * combination the spec does not define comes back as `ok: false` with the
 * offending field's byte offset (AD-18) — never a silently wrong image.
 */

import { unzlibSync } from "fflate/browser";
import { err, ok, type Result } from "../result.ts";
import { crc32 } from "./crc32.ts";
import type { DecodedTexture } from "./model.ts";

const SECTION = "format-spec §10";

/** The 8-byte PNG signature `89 50 4E 47 0D 0A 1A 0A` occupies. */
const SIGNATURE_LENGTH = 8;

/**
 * The largest image this decoder will allocate for, in pixels. A header is
 * untrusted input, so a `width × height` beyond this is refused instead of
 * attempting the allocation. 100 megapixels matches the hand-written JPEG
 * decoder's resolution limit and is far above any game asset.
 */
const MAX_PIXELS = 100_000_000;

/** The bit depths each colour type permits (PNG spec, `IHDR`). */
const PERMITTED_DEPTHS: Record<number, readonly number[]> = {
  0: [1, 2, 4, 8, 16],
  2: [8, 16],
  3: [1, 2, 4, 8],
  4: [8, 16],
  6: [8, 16],
};

/** Samples per pixel for each colour type. */
const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/**
 * The seven Adam7 passes as `[xStart, yStart, xStep, yStep]`: pass 1 holds the
 * top-left pixel of every 8×8 block, pass 2 the pixel four to its right, and so
 * on down to pass 7, which holds every even-row pixel of odd columns.
 */
const ADAM7: readonly (readonly [number, number, number, number])[] = [
  [0, 0, 8, 8],
  [4, 0, 8, 8],
  [0, 4, 4, 8],
  [2, 0, 4, 4],
  [0, 2, 2, 4],
  [1, 0, 2, 2],
  [0, 1, 1, 2],
];

/** A chunk as read, holding a view of its data and the offset of its length. */
interface Chunk {
  readonly type: string;
  readonly data: Uint8Array;
  /** The offset of the chunk's 4-byte length field. */
  readonly at: number;
}

/** The decoded `IHDR` fields this decoder needs. */
interface Header {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly colourType: number;
  readonly interlace: 0 | 1;
  /** Samples per pixel (1–4), from the colour type. */
  readonly channels: number;
}

/** One region of the image: the whole picture, or one Adam7 pass. */
interface Pass {
  readonly x0: number;
  readonly y0: number;
  readonly dx: number;
  readonly dy: number;
  readonly width: number;
  readonly height: number;
}

/** The fixed per-image inputs of `emitPixel`, grouped to keep the call short. */
interface Emit {
  readonly rgba: Uint8Array;
  readonly header: Header;
  readonly palette: Uint8Array | undefined;
  readonly trns: Uint8Array | undefined;
}

/** A located error while decoding a PNG (AD-18). */
function fail(offset: number, message: string, path?: string): Result<never> {
  return err({ ...(path === undefined ? {} : { path }), offset, section: SECTION, message });
}

/** Read and CRC-check the chunk whose length field starts at `at`. */
function readChunkAt(bytes: Uint8Array, view: DataView, at: number, path?: string): Result<Chunk> {
  if (at + 8 > bytes.length) {
    return fail(at, `truncated chunk header: ${bytes.length - at} of 8 bytes present`, path);
  }
  const length = view.getUint32(at, false);
  const type = String.fromCharCode(bytes[at + 4]!, bytes[at + 5]!, bytes[at + 6]!, bytes[at + 7]!);
  const dataAt = at + 8;
  const crcAt = dataAt + length;
  if (length > 0x7fffffff || crcAt + 4 > bytes.length) {
    return fail(at, `${type} chunk length ${length} runs past the end of the file`, path);
  }
  const stored = view.getUint32(crcAt, false);
  const computed = crc32(bytes, at + 4, crcAt);
  if (stored !== computed) {
    return fail(crcAt, `${type} chunk CRC mismatch: stored ${stored}, computed ${computed}`, path);
  }
  return ok({ type, data: bytes.subarray(dataAt, crcAt), at });
}

/**
 * Read and CRC-check every chunk from the end of the signature. Stops after
 * `IEND`; a trailing chunk after it is not part of the image and is ignored.
 */
function readChunks(bytes: Uint8Array, view: DataView, path?: string): Result<Chunk[]> {
  const chunks: Chunk[] = [];
  let at = SIGNATURE_LENGTH;
  while (at < bytes.length) {
    const chunk = readChunkAt(bytes, view, at, path);
    if (!chunk.ok) {
      return chunk;
    }
    chunks.push(chunk.value);
    at = chunk.value.at + 12 + chunk.value.data.length;
    if (chunk.value.type === "IEND") {
      break;
    }
  }
  return ok(chunks);
}

/** Validate the leading `IHDR` chunk's geometry (format-spec §10). */
function readHeader(ihdr: Chunk, path?: string): Result<Header> {
  if (ihdr.data.length !== 13) {
    return fail(ihdr.at, `IHDR is ${ihdr.data.length} bytes; the spec fixes 13`, path);
  }

  // `field` is the first byte of the IHDR payload in the file, so each offset
  // below is that field's own first byte (AD-18).
  const field = ihdr.at + 8;
  const view = new DataView(ihdr.data.buffer, ihdr.data.byteOffset, ihdr.data.byteLength);
  const width = view.getUint32(0, false);
  const height = view.getUint32(4, false);
  if (width === 0 || height === 0) {
    return fail(field, `IHDR has a zero dimension: ${width}×${height}`, path);
  }
  if (width * height > MAX_PIXELS) {
    return fail(field, `image is too large: ${width}×${height} exceeds ${MAX_PIXELS} pixels`, path);
  }

  const depth = ihdr.data[8]!;
  const colourType = ihdr.data[9]!;
  const compression = ihdr.data[10]!;
  const filterMethod = ihdr.data[11]!;
  const interlace = ihdr.data[12]!;

  const permitted = PERMITTED_DEPTHS[colourType];
  const channels = CHANNELS[colourType];
  if (permitted === undefined || channels === undefined) {
    return fail(field + 9, `unsupported colour type ${colourType}`, path);
  }
  if (!permitted.includes(depth)) {
    return fail(
      field + 8,
      `colour type ${colourType} does not allow bit depth ${depth} (permitted: ${permitted.join(", ")})`,
      path,
    );
  }
  if (compression !== 0) {
    return fail(field + 10, `unsupported compression method ${compression}`, path);
  }
  if (filterMethod !== 0) {
    return fail(field + 11, `unsupported filter method ${filterMethod}`, path);
  }
  if (interlace !== 0 && interlace !== 1) {
    return fail(field + 12, `unsupported interlace method ${interlace}`, path);
  }

  return ok({ width, height, depth, colourType, interlace, channels });
}

/** The palette as RGB triples, or `undefined` when the file carries no `PLTE`. */
function readPalette(chunks: readonly Chunk[], path?: string): Result<Uint8Array | undefined> {
  const plte = chunks.find((chunk) => chunk.type === "PLTE");
  if (plte === undefined) {
    return ok(undefined);
  }
  if (plte.data.length === 0 || plte.data.length % 3 !== 0 || plte.data.length > 256 * 3) {
    return fail(plte.at, `PLTE is ${plte.data.length} bytes; it must be 1–256 whole RGB triples`, path);
  }
  return ok(plte.data);
}

/**
 * The alpha bytes for a `tRNS` chunk: one per palette entry for colour type 3,
 * or a single 2-byte grey / 6-byte RGB colour key for types 0 and 2. Types 4
 * and 6 carry alpha in the pixels, so a `tRNS` there is ignored.
 */
function readTrns(
  chunks: readonly Chunk[],
  header: Header,
  paletteEntries: number,
  path?: string,
): Result<Uint8Array | undefined> {
  const trns = chunks.find((chunk) => chunk.type === "tRNS");
  if (trns === undefined || header.colourType === 4 || header.colourType === 6) {
    return ok(undefined);
  }
  if (header.colourType === 3) {
    if (trns.data.length > paletteEntries) {
      return fail(
        trns.at,
        `tRNS holds ${trns.data.length} alphas for ${paletteEntries} palette entries`,
        path,
      );
    }
    return ok(trns.data);
  }
  const expected = header.colourType === 0 ? 2 : 6;
  if (trns.data.length !== expected) {
    return fail(
      trns.at,
      `tRNS is ${trns.data.length} bytes; colour type ${header.colourType} needs ${expected}`,
      path,
    );
  }
  return ok(trns.data);
}

/** Concatenate every `IDAT` chunk's data into the one zlib stream. */
function readIdat(chunks: readonly Chunk[], path?: string): Result<Uint8Array> {
  const parts = chunks.filter((chunk) => chunk.type === "IDAT");
  if (parts.length === 0) {
    return fail(SIGNATURE_LENGTH, "no IDAT chunk: the file has no image data", path);
  }
  let total = 0;
  for (const part of parts) {
    total += part.data.length;
  }
  const idat = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    idat.set(part.data, at);
    at += part.data.length;
  }
  return ok(idat);
}

/** The passes of the image: one whole-image pass, or the seven Adam7 passes. */
function passesOf(header: Header): Pass[] {
  if (header.interlace === 0) {
    return [{ x0: 0, y0: 0, dx: 1, dy: 1, width: header.width, height: header.height }];
  }
  const passes: Pass[] = [];
  for (const [x0, y0, dx, dy] of ADAM7) {
    const width = Math.ceil(Math.max(0, header.width - x0) / dx);
    const height = Math.ceil(Math.max(0, header.height - y0) / dy);
    if (width > 0 && height > 0) {
      passes.push({ x0, y0, dx, dy, width, height });
    }
  }
  return passes;
}

/** The Paeth predictor (PNG spec, filter 4), exact in integers. */
function paeth(a: number, b: number, c: number): number {
  const estimate = a + b - c;
  const pa = Math.abs(estimate - a);
  const pb = Math.abs(estimate - b);
  const pc = Math.abs(estimate - c);
  if (pa <= pb && pa <= pc) {
    return a;
  }
  return pb <= pc ? b : c;
}

/** Undo one scanline filter in place (PNG spec, filter types 0–4). */
function unfilter(line: Uint8Array, previous: Uint8Array, bpp: number, type: number): void {
  const length = line.length;
  if (type === 0) {
    return;
  }
  if (type === 1) {
    for (let i = bpp; i < length; i += 1) {
      line[i] = (line[i]! + line[i - bpp]!) & 0xff;
    }
    return;
  }
  if (type === 2) {
    for (let i = 0; i < length; i += 1) {
      line[i] = (line[i]! + previous[i]!) & 0xff;
    }
    return;
  }
  if (type === 3) {
    for (let i = 0; i < length; i += 1) {
      const left = i >= bpp ? line[i - bpp]! : 0;
      line[i] = (line[i]! + ((left + previous[i]!) >> 1)) & 0xff;
    }
    return;
  }
  for (let i = 0; i < length; i += 1) {
    const left = i >= bpp ? line[i - bpp]! : 0;
    const upLeft = i >= bpp ? previous[i - bpp]! : 0;
    line[i] = (line[i]! + paeth(left, previous[i]!, upLeft)) & 0xff;
  }
}

/** One sample of a scanline at `index` (channel-major within the row). */
function sample(line: Uint8Array, index: number, depth: number): number {
  if (depth === 8) {
    return line[index]!;
  }
  if (depth === 16) {
    return (line[index * 2]! << 8) | line[index * 2 + 1]!;
  }
  const bit = index * depth;
  const shift = 8 - depth - (bit & 7);
  return (line[bit >> 3]! >> shift) & ((1 << depth) - 1);
}

/**
 * Widen a sample to 8 bits. Depths 1, 2 and 4 scale by the exact integer factor
 * that maps their maximum to 255; depth 16 uses `floor(v / 257)`, the exact
 * inverse of the `v * 257` the spec's 16→8 conversion needs, so 65535 maps to
 * 255 with no rounding error.
 */
function toByte(value: number, depth: number): number {
  switch (depth) {
    case 1:
      return value * 255;
    case 2:
      return value * 85;
    case 4:
      return value * 17;
    case 16:
      return Math.floor(value / 257);
    default:
      return value;
  }
}

/**
 * Write one pixel's RGBA into `emit.rgba` at byte offset `out`, expanding the
 * palette (colour type 3), the `tRNS` alpha and the grey/truecolour colour keys
 * of types 0 and 2. Alpha is 255 wherever the file declares no transparency.
 * Returns a message when the pixel is not decodable (a palette index outside
 * `PLTE`), and `undefined` otherwise.
 */
function emitPixel(
  emit: Emit,
  out: number,
  line: Uint8Array,
  column: number,
): string | undefined {
  const { depth, colourType, channels } = emit.header;
  const rgba = emit.rgba;
  const base = column * channels;

  switch (colourType) {
    case 0: {
      const grey = sample(line, base, depth);
      const key = emit.trns !== undefined && grey === ((emit.trns[0]! << 8) | emit.trns[1]!);
      const value = toByte(grey, depth);
      rgba[out] = value;
      rgba[out + 1] = value;
      rgba[out + 2] = value;
      rgba[out + 3] = key ? 0 : 255;
      return undefined;
    }
    case 2: {
      const r = sample(line, base, depth);
      const g = sample(line, base + 1, depth);
      const b = sample(line, base + 2, depth);
      const key =
        emit.trns !== undefined &&
        r === ((emit.trns[0]! << 8) | emit.trns[1]!) &&
        g === ((emit.trns[2]! << 8) | emit.trns[3]!) &&
        b === ((emit.trns[4]! << 8) | emit.trns[5]!);
      rgba[out] = toByte(r, depth);
      rgba[out + 1] = toByte(g, depth);
      rgba[out + 2] = toByte(b, depth);
      rgba[out + 3] = key ? 0 : 255;
      return undefined;
    }
    case 3: {
      const index = sample(line, base, depth);
      const palette = emit.palette;
      const entries = (palette?.length ?? 0) / 3;
      if (palette === undefined || index >= entries) {
        return `palette index ${index} is outside the ${entries}-entry PLTE`;
      }
      rgba[out] = palette[index * 3]!;
      rgba[out + 1] = palette[index * 3 + 1]!;
      rgba[out + 2] = palette[index * 3 + 2]!;
      rgba[out + 3] = emit.trns !== undefined && index < emit.trns.length ? emit.trns[index]! : 255;
      return undefined;
    }
    case 4: {
      const grey = toByte(sample(line, base, depth), depth);
      rgba[out] = grey;
      rgba[out + 1] = grey;
      rgba[out + 2] = grey;
      rgba[out + 3] = toByte(sample(line, base + 1, depth), depth);
      return undefined;
    }
    default: {
      rgba[out] = toByte(sample(line, base, depth), depth);
      rgba[out + 1] = toByte(sample(line, base + 1, depth), depth);
      rgba[out + 2] = toByte(sample(line, base + 2, depth), depth);
      rgba[out + 3] = toByte(sample(line, base + 3, depth), depth);
      return undefined;
    }
  }
}

/**
 * Decode a PNG file to the file's own straight RGBA (AD-28, format-spec §10):
 * the palette/truecolour channels and the file's own alpha (`tRNS`, alpha
 * channels), nothing added. No colour key is applied — the key is not part of
 * the file; it is the `key` of a `blit` (AD-3) and `core/raster` tests it on
 * these pixels. Never throws: the caller has already matched the signature, and
 * every later defect is a located `FormatError`. `path`, the asset path, is
 * carried on every error.
 */
export function decodePng(bytes: Uint8Array, path?: string): Result<DecodedTexture> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // IHDR must be the first chunk and is read on its own, so a wrong payload
  // length is reported as such rather than as a broken walk later.
  const ihdr = readChunkAt(bytes, view, SIGNATURE_LENGTH, path);
  if (!ihdr.ok) {
    return ihdr;
  }
  if (ihdr.value.type !== "IHDR") {
    return fail(SIGNATURE_LENGTH, "the first chunk is not IHDR", path);
  }
  const header = readHeader(ihdr.value, path);
  if (!header.ok) {
    return header;
  }
  const chunks = readChunks(bytes, view, path);
  if (!chunks.ok) {
    return chunks;
  }
  const palette = readPalette(chunks.value, path);
  if (!palette.ok) {
    return palette;
  }
  const trns = readTrns(chunks.value, header.value, (palette.value?.length ?? 0) / 3, path);
  if (!trns.ok) {
    return trns;
  }
  if (header.value.colourType === 3 && palette.value === undefined) {
    return fail(SIGNATURE_LENGTH, "colour type 3 needs a PLTE chunk", path);
  }
  const idat = readIdat(chunks.value, path);
  if (!idat.ok) {
    return idat;
  }
  // Errors found in the inflated bytes still name the file's image data: the
  // IDAT payload is where those bytes come from.
  const idatAt = chunks.value.find((chunk) => chunk.type === "IDAT")!.at + 8;

  let inflated: Uint8Array;
  try {
    inflated = unzlibSync(idat.value);
  } catch (cause) {
    return fail(idatAt, `IDAT is not a valid zlib stream: ${String(cause)}`, path);
  }

  const { width, height, depth, colourType, channels } = header.value;
  const bpp = Math.max(1, Math.ceil((channels * depth) / 8));
  const bitsPerPixel = channels * depth;
  const passes = passesOf(header.value);

  let expected = 0;
  for (const pass of passes) {
    expected += pass.height * (1 + Math.ceil((pass.width * bitsPerPixel) / 8));
  }
  if (inflated.length !== expected) {
    return fail(
      idatAt,
      `IDAT inflates to ${inflated.length} bytes; ${width}×${height} at ${depth}-bit needs ${expected}`,
      path,
    );
  }

  const rgba = new Uint8Array(width * height * 4);
  const emit: Emit = { rgba, header: header.value, palette: palette.value, trns: trns.value };
  // The first row of every pass filters against an all-zero row (`Up`/`Average`
  // /`Paeth`), so a shared zero line as long as the widest pass serves them all.
  const zeroRow = new Uint8Array(Math.ceil((width * bitsPerPixel) / 8));
  let cursor = 0;

  for (const pass of passes) {
    const rowBytes = Math.ceil((pass.width * bitsPerPixel) / 8);
    let previous: Uint8Array = zeroRow;
    for (let row = 0; row < pass.height; row += 1) {
      const filter = inflated[cursor]!;
      const lineAt = cursor + 1;
      cursor = lineAt + rowBytes;
      if (filter > 4) {
        return fail(idatAt, `unknown scanline filter type ${filter} in pass ${pass.dx}×${pass.dy}`, path);
      }
      const line = inflated.subarray(lineAt, cursor);
      unfilter(line, previous, bpp, filter);
      previous = line;

      const y = pass.y0 + row * pass.dy;
      for (let column = 0; column < pass.width; column += 1) {
        const x = pass.x0 + column * pass.dx;
        const problem = emitPixel(emit, (y * width + x) * 4, line, column);
        if (problem !== undefined) {
          return fail(idatAt, problem, path);
        }
      }
    }
  }

  return ok({ w: width, h: height, rgba });
}
