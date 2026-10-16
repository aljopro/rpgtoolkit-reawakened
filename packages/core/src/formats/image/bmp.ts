/**
 * Windows bitmap (`.bmp`) decoding for `decodeTexture`
 * (docs/spec/formats/images.md#windows-bitmap-bmp, docs/spec/formats/images.md#the-shared-decode-contract, AD-28).
 *
 * A Toolkit-era game ships most of its pictures as 24-bit BMPs, so the reader
 * sits beside the PNG and JPEG ones and returns the same straight RGBA: the
 * file's own colours, `width × height × 4`, top row first, no colour key
 * applied. It decodes uncompressed `BI_RGB` at 1, 4, 8, 24 and 32 bits and the
 * 8-bit `RLE8` stream, each with a 40-byte DIB header and one plane, and refuses
 * everything else with a located error rather than approximating a picture
 * (docs/spec/formats/images.md#the-shared-decode-contract). Never throws: a damaged file is an `ok: false` result.
 */

import { err, ok, type Result } from "../result.ts";
import type { DecodedTexture } from "./model.ts";

const SECTION = "docs/spec/formats/images.md#the-shared-decode-contract";

/**
 * The largest bitmap this decoder will allocate for, in pixels. `biWidth` and
 * `biHeight` are untrusted input, so past this limit the RGBA buffer is never
 * allocated and the file is refused (docs/spec/formats/images.md). The same
 * limit the PNG and JPEG decoders keep.
 */
const MAX_PIXELS = 100_000_000;

/** The fixed length of the file header (`BITMAPFILEHEADER`). */
const FILE_HEADER_LENGTH = 14;
/** The fixed length of the DIB header (`BITMAPINFOHEADER`). */
const DIB_HEADER_LENGTH = 40;
/** Where the palette begins: right after the two headers. */
const PALETTE_OFFSET = FILE_HEADER_LENGTH + DIB_HEADER_LENGTH;
/** One palette entry: B, G, R, reserved. */
const PALETTE_ENTRY_LENGTH = 4;

/** `BI_RGB`: uncompressed. */
const BI_RGB = 0;
/** `BI_RLE8`: 8-bit run-length. */
const BI_RLE8 = 1;

/** The bit counts this reader decodes (docs/spec/formats/images.md). */
const SUPPORTED_BITS: readonly number[] = [1, 4, 8, 24, 32];

/** The name of a `biCompression` value, for a refusal message. */
function compressionName(value: number): string {
  switch (value) {
    case 0:
      return "BI_RGB";
    case 1:
      return "BI_RLE8";
    case 2:
      return "BI_RLE4";
    case 3:
      return "BI_BITFIELDS";
    case 4:
      return "BI_JPEG";
    case 5:
      return "BI_PNG";
    default:
      return `compression ${value}`;
  }
}

/** A located error while decoding a bitmap (AD-18). */
function fail(offset: number, message: string, path?: string): Result<never> {
  return err({ ...(path === undefined ? {} : { path }), offset, section: SECTION, message });
}

/** The bitmap's parsed header fields (offsets are the fields' own first bytes). */
interface BmpHeader {
  /** `bfOffBits`: where the pixel array starts. */
  readonly offBits: number;
  /** `biWidth`, positive. */
  readonly width: number;
  /** `biHeight`: positive is bottom-up, negative is top-down. */
  readonly height: number;
  /** `biBitCount`. */
  readonly bits: number;
  /** `biCompression`: only `BI_RGB` or, at 8 bits, `BI_RLE8` reaches here. */
  readonly compression: number;
  /** The palette as RGB triples, for the depths that carry one. */
  readonly palette: Uint8Array | undefined;
  /** How many palette entries the header defines. */
  readonly paletteEntries: number;
}

/**
 * The byte length of one stored row: the pixels padded up to a whole number of
 * 4-byte units, so the padding bytes are never read as pixels
 * (docs/spec/formats/images.md#pixel-array).
 */
function strideOf(width: number, bits: number): number {
  return Math.floor((bits * width + 31) / 32) * 4;
}

/**
 * Read and validate the file header and the DIB header
 * (docs/spec/formats/images.md#the-windows-bitmap-layout).
 *
 * The signature, the header size, the geometry, the plane count, the bit count,
 * the compression and the palette are all checked here, before any pixel buffer
 * is allocated, so a zero dimension, an oversized image or an unsupported
 * variant is refused without reserving anything.
 */
function readHeader(bytes: Uint8Array, view: DataView, path?: string): Result<BmpHeader> {
  if (bytes.length < FILE_HEADER_LENGTH) {
    return fail(0, `file is ${bytes.length} bytes; the 14-byte file header is incomplete`, path);
  }
  if (bytes[0] !== 0x42 || bytes[1] !== 0x4d) {
    return fail(0, "not a Windows bitmap: the signature is not BM (42 4D)", path);
  }
  if (bytes.length < PALETTE_OFFSET) {
    return fail(
      FILE_HEADER_LENGTH,
      `DIB header is ${bytes.length - FILE_HEADER_LENGTH} bytes; the 40-byte BITMAPINFOHEADER is required`,
      path,
    );
  }

  const headerSize = view.getInt32(14, true);
  if (headerSize !== DIB_HEADER_LENGTH) {
    return fail(
      14,
      `DIB header size is ${headerSize}; this reader handles the 40-byte BITMAPINFOHEADER`,
      path,
    );
  }

  const width = view.getInt32(18, true);
  if (width <= 0) {
    return fail(18, `biWidth is ${width}; a bitmap width is positive`, path);
  }
  const height = view.getInt32(22, true);
  if (height === 0) {
    return fail(22, "biHeight is 0: the height is the magnitude of the signed field", path);
  }
  const pixels = width * Math.abs(height);
  if (pixels > MAX_PIXELS) {
    return fail(
      18,
      `image is too large: ${width}×${Math.abs(height)} exceeds ${MAX_PIXELS} pixels`,
      path,
    );
  }

  const offBits = view.getInt32(10, true);
  if (offBits < 0 || offBits > bytes.length) {
    return fail(10, `bfOffBits is ${offBits}, past the end of the file (${bytes.length} bytes)`, path);
  }

  const planes = view.getInt16(26, true);
  if (planes !== 1) {
    return fail(26, `biPlanes is ${planes}; a bitmap has one plane`, path);
  }

  const bits = view.getInt16(28, true);
  if (!SUPPORTED_BITS.includes(bits)) {
    return fail(
      28,
      `unsupported biBitCount ${bits}; this reader handles ${SUPPORTED_BITS.join(", ")}`,
      path,
    );
  }

  const compression = view.getInt32(30, true);
  if (compression !== BI_RGB && !(compression === BI_RLE8 && bits === 8)) {
    const allowed = bits === 8 ? "BI_RGB (0) or BI_RLE8 (1)" : "BI_RGB (0)";
    return fail(
      30,
      `unsupported biCompression ${compressionName(compression)}; this reader handles ${allowed}`,
      path,
    );
  }

  const clrUsed = view.getInt32(46, true);
  let paletteEntries = 0;
  let palette: Uint8Array | undefined;
  if (bits <= 8) {
    const max = 1 << bits;
    if (clrUsed < 0 || clrUsed > max) {
      return fail(46, `biClrUsed is ${clrUsed}; a ${bits}-bit bitmap has at most ${max} entries`, path);
    }
    paletteEntries = clrUsed === 0 ? max : clrUsed;
    // The palette runs from the end of the DIB header up to the pixel array. A
    // file that declares fewer entries than its indices need, or that leaves too
    // few bytes before `bfOffBits`, is refused at the first missing entry.
    const present = Math.max(
      0,
      Math.min(
        Math.floor((bytes.length - PALETTE_OFFSET) / PALETTE_ENTRY_LENGTH),
        Math.floor((offBits - PALETTE_OFFSET) / PALETTE_ENTRY_LENGTH),
      ),
    );
    if (paletteEntries > present) {
      return fail(
        PALETTE_OFFSET + present * PALETTE_ENTRY_LENGTH,
        `palette declares ${paletteEntries} entries but only ${present} fit before the pixel array at ${offBits}`,
        path,
      );
    }
    palette = bytes.subarray(PALETTE_OFFSET, PALETTE_OFFSET + paletteEntries * PALETTE_ENTRY_LENGTH);
  } else if (offBits < PALETTE_OFFSET) {
    return fail(10, `bfOffBits is ${offBits}, inside the two headers`, path);
  }

  return ok({ offBits, width, height, bits, compression, palette, paletteEntries });
}

/**
 * One palette entry's R, G, B, read from its 4-byte slot, or a located error
 * when the index is at or above the entry count the header declares
 * (docs/spec/formats/images.md#palette-1-4-and-8-bits).
 */
function paletteRgb(
  header: BmpHeader,
  index: number,
  offset: number,
  path?: string,
): Result<readonly [number, number, number]> {
  if (index >= header.paletteEntries) {
    return fail(
      offset,
      `palette index ${index} is outside the ${header.paletteEntries} entries the header declares`,
      path,
    );
  }
  const at = index * PALETTE_ENTRY_LENGTH;
  const palette = header.palette!;
  return ok([palette[at + 2]!, palette[at + 1]!, palette[at]!]);
}

/**
 * Decode an uncompressed `BI_RGB` bitmap into the RGBA buffer
 * (docs/spec/formats/images.md#pixel-array).
 *
 * `stride` bytes hold each stored row; the padding bytes between the row's
 * pixels and the next row are skipped. A positive `biHeight` means the first
 * stored row is the bottom row, so the rows are written to the RGBA in reverse.
 * Returns a located error for a palette index the header does not define, and
 * `undefined` otherwise.
 */
function decodeRgb(
  bytes: Uint8Array,
  header: BmpHeader,
  rgba: Uint8Array,
  path?: string,
): Result<never> | undefined {
  const { offBits, width, bits } = header;
  const height = Math.abs(header.height);
  const bottomUp = header.height > 0;
  const stride = strideOf(width, bits);

  for (let stored = 0; stored < height; stored += 1) {
    const row = offBits + stored * stride;
    const out = (bottomUp ? height - 1 - stored : stored) * width * 4;
    for (let x = 0; x < width; x += 1) {
      const at = out + x * 4;
      if (bits === 24) {
        const p = row + x * 3;
        rgba[at] = bytes[p + 2]!;
        rgba[at + 1] = bytes[p + 1]!;
        rgba[at + 2] = bytes[p]!;
        rgba[at + 3] = 255;
        continue;
      }
      if (bits === 32) {
        const p = row + x * 4;
        rgba[at] = bytes[p + 2]!;
        rgba[at + 1] = bytes[p + 1]!;
        rgba[at + 2] = bytes[p]!;
        // BI_RGB defines no alpha channel: every pixel is opaque.
        rgba[at + 3] = 255;
        continue;
      }
      let index: number;
      let source: number;
      if (bits === 8) {
        source = row + x;
        index = bytes[source]!;
      } else if (bits === 4) {
        source = row + (x >> 1);
        const byte = bytes[source]!;
        index = (x & 1) === 0 ? byte >> 4 : byte & 15;
      } else {
        source = row + (x >> 3);
        index = (bytes[source]! >> (7 - (x & 7))) & 1;
      }
      const rgb = paletteRgb(header, index, source, path);
      if (!rgb.ok) {
        return rgb;
      }
      rgba[at] = rgb.value[0];
      rgba[at + 1] = rgb.value[1];
      rgba[at + 2] = rgb.value[2];
      rgba[at + 3] = 255;
    }
  }
  return undefined;
}

/**
 * Decode an 8-bit `BI_RLE8` stream into the RGBA buffer
 * (docs/spec/formats/images.md#rle8-8-bit-bicompression-1).
 *
 * Pixels the stream never reaches keep the palette's entry 0, so the buffer is
 * primed with it first. Every escape that would leave the image, a run past the
 * row end, a missing padding byte, a palette index the header does not define
 * and a stream with no end-of-bitmap are located errors.
 */
function decodeRle8(
  bytes: Uint8Array,
  header: BmpHeader,
  rgba: Uint8Array,
  path?: string,
): Result<never> | undefined {
  const { offBits, width } = header;
  const height = Math.abs(header.height);
  const bottomUp = header.height > 0;

  // Prime every pixel with palette entry 0: an RLE8 stream stores only the
  // pixels it paints, so the rest are index 0.
  const zero = paletteRgb(header, 0, offBits, path);
  if (!zero.ok) {
    return zero;
  }
  for (let at = 0; at < rgba.length; at += 4) {
    rgba[at] = zero.value[0];
    rgba[at + 1] = zero.value[1];
    rgba[at + 2] = zero.value[2];
    rgba[at + 3] = 255;
  }

  /** Write the palette colour of `index` at column `x` of stored row `row`. */
  const put = (row: number, x: number, index: number, offset: number): Result<never> | undefined => {
    const rgb = paletteRgb(header, index, offset, path);
    if (!rgb.ok) {
      return rgb;
    }
    const at = (bottomUp ? height - 1 - row : row) * width * 4 + x * 4;
    rgba[at] = rgb.value[0];
    rgba[at + 1] = rgb.value[1];
    rgba[at + 2] = rgb.value[2];
    rgba[at + 3] = 255;
    return undefined;
  };

  let at = offBits;
  let x = 0;
  let row = 0;
  while (at < bytes.length) {
    const begin = at;
    const count = bytes[at]!;
    const value = bytes[at + 1];
    if (value === undefined) {
      return fail(at, "the RLE8 stream ends after a count byte with no value byte", path);
    }
    at += 2;
    if (count > 0) {
      if (x + count > width) {
        return fail(
          begin,
          `a run of ${count} pixels at column ${x} crosses the row end (width ${width})`,
          path,
        );
      }
      for (let i = 0; i < count; i += 1) {
        const failure = put(row, x + i, value, begin);
        if (failure !== undefined) {
          return failure;
        }
      }
      x += count;
      continue;
    }
    if (value === 0) {
      x = 0;
      row += 1;
      if (row > height) {
        return fail(begin, `an end-of-line escape moves past the last row (height ${height})`, path);
      }
      continue;
    }
    if (value === 1) {
      return undefined;
    }
    if (value === 2) {
      const dx = bytes[at];
      const dy = bytes[at + 1];
      if (dx === undefined || dy === undefined) {
        return fail(at, "a delta escape is missing its dx and dy bytes", path);
      }
      at += 2;
      if (x + dx > width || row + dy >= height) {
        return fail(
          begin,
          `a delta escape moves to (${x + dx}, ${row + dy}), outside the ${width}×${height} image`,
          path,
        );
      }
      x += dx;
      row += dy;
      continue;
    }
    // An absolute run: `value` literal palette indices, then a padding byte when
    // their count is odd so the run ends on a 16-bit boundary.
    const length = value;
    if (at + length > bytes.length) {
      return fail(at, `an absolute run of ${length} bytes runs past the end of the file`, path);
    }
    if (x + length > width) {
      return fail(
        begin,
        `an absolute run of ${length} pixels at column ${x} crosses the row end (width ${width})`,
        path,
      );
    }
    for (let i = 0; i < length; i += 1) {
      const failure = put(row, x + i, bytes[at + i]!, at + i);
      if (failure !== undefined) {
        return failure;
      }
    }
    x += length;
    at += length;
    if ((length & 1) === 1) {
      if (at >= bytes.length) {
        return fail(at, `an odd absolute run of ${length} bytes is missing its padding byte`, path);
      }
      at += 1;
    }
  }
  return fail(at, "the RLE8 stream ends without an end-of-bitmap escape (0 1)", path);
}

/**
 * Decode a Windows bitmap to the file's own straight RGBA (AD-28, docs/spec/formats/images.md#windows-bitmap-bmp).
 *
 * The signature `BM` and the 40-byte DIB header are checked first, then the
 * geometry: for an uncompressed bitmap the pixel-array span is measured against
 * the bytes that remain before any buffer is allocated, so a truncated or
 * oversized file is refused rather than half-decoded. `path` is the bitmap's
 * path, when the caller has one, and is carried on every error. Never throws.
 */
export function decodeBmp(bytes: Uint8Array, path?: string): Result<DecodedTexture> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const header = readHeader(bytes, view, path);
  if (!header.ok) {
    return header;
  }

  const { offBits, width, bits, compression } = header.value;
  const height = Math.abs(header.value.height);

  if (compression === BI_RGB) {
    // The whole pixel array must lie within the file; the check happens before
    // the RGBA buffer is allocated (docs/spec/formats/images.md#pixel-array).
    const needed = strideOf(width, bits) * height;
    const remaining = bytes.length - offBits;
    if (needed > remaining) {
      return fail(
        offBits,
        `the pixel array needs ${needed} bytes from offset ${offBits} but only ${remaining} remain`,
        path,
      );
    }
  }

  const rgba = new Uint8Array(width * height * 4);
  const failure =
    compression === BI_RLE8
      ? decodeRle8(bytes, header.value, rgba, path)
      : decodeRgb(bytes, header.value, rgba, path);
  return failure ?? ok({ w: width, h: height, rgba });
}
