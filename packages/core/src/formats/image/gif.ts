/**
 * GIF (`.gif`) decoding for `decodeTexture` (its first page) and for the
 * animation path's `decodeGif` (every page with its delay) — docs/spec/formats/images.md#the-shared-decode-contract,
 * AD-28, docs/spec/formats/images.md#gif.
 *
 * The reader is hand-written pure TypeScript: an LZW decompressor, a four-pass
 * de-interlacer, global and local colour tables, and the graphic control
 * extension (transparency, delay, disposal 0 to 3), with no dependency (G2, G6).
 * Every defect is a located `FormatError` and never a throw (AD-18), and the
 * geometric limits come from the shared docs/spec/formats/images.md#the-shared-decode-contract rule: a zero dimension, a logical
 * screen above 100,000,000 pixels, or a `pages × screen` product above it are
 * refused before anything is allocated.
 *
 * A frame is the logical screen after its page has been drawn; screen area no
 * page has covered and a rectangle a disposal-2 page cleared are transparent,
 * never the descriptor's background colour (docs/spec/formats/images.md#composition).
 */

import { err, ok, type Result } from "../result.ts";
import type { DecodedGif, DecodedGifFrame } from "./model.ts";

const SECTION = "docs/spec/formats/images.md#the-shared-decode-contract";

/** The largest decoded picture this reader will allocate for, in pixels(docs/spec/formats/images.md#the-shared-decode-contract). */
const MAX_PIXELS = 100_000_000;

/** The GIF header length: `GIF87a` or `GIF89a`. */
const HEADER_LENGTH = 6;
/** The logical screen descriptor length. */
const SCREEN_DESCRIPTOR_LENGTH = 7;
/** The image descriptor length, the `2C` separator included. */
const IMAGE_DESCRIPTOR_LENGTH = 10;

/** `GIF87a`. */
const GIF87A: readonly number[] = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61];
/** `GIF89a`. */
const GIF89A: readonly number[] = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];

/** An image descriptor. */
const IMAGE_SEPARATOR = 0x2c;
/** An extension introducer. */
const EXTENSION_INTRODUCER = 0x21;
/** The trailer. */
const TRAILER = 0x3b;
/** The graphic control extension's label. */
const GRAPHIC_CONTROL_LABEL = 0xf9;
/** The graphic control extension's fixed data length. */
const GRAPHIC_CONTROL_LENGTH = 4;

/** The smallest LZW minimum code size this reader accepts. */
const MIN_CODE_SIZE_MIN = 2;
/** The largest LZW minimum code size this reader accepts. */
const MIN_CODE_SIZE_MAX = 8;
/** The widest LZW code. */
const MAX_CODE_WIDTH = 12;
/** The LZW table's entry ceiling: past this no entry is added (the deferred clear). */
const MAX_TABLE_ENTRIES = 1 << MAX_CODE_WIDTH;

/** The block sizes a colour table can declare, as `N` in `2^(N+1)` entries. */
const TABLE_SIZE_MASK = 0x07;

/** R-10's fallback transparent colour when the file names none. */
const MAGENTA = { r: 255, g: 0, b: 255 } as const;

/** A colour table: `entries * 3` bytes of R, G, B. */
type ColorTable = Uint8Array;

/** A located error while decoding a GIF (AD-18). */
function fail(offset: number, message: string, path?: string): Result<never> {
  return err({ ...(path === undefined ? {} : { path }), offset, section: SECTION, message });
}

/** The unsigned 16-bit little-endian value at `at`. */
function u16(bytes: Uint8Array, at: number): number {
  return bytes[at]! | (bytes[at + 1]! << 8);
}

/** Whether `bytes` begins with `signature`. */
function hasGifSignature(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) {
    return false;
  }
  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[i] !== signature[i]) {
      return false;
    }
  }
  return true;
}

/** The six header bytes as text, for a refusal message. */
function versionText(bytes: Uint8Array): string {
  let text = "";
  for (let i = 0; i < HEADER_LENGTH; i += 1) {
    const byte = bytes[i] ?? 0;
    text += byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : "?";
  }
  return text;
}

/** A sub-block chain's payload and where each of its bytes came from. */
interface SubBlocks {
  /** The sub-blocks' payload bytes, concatenated. */
  readonly data: Uint8Array;
  /** `origins[i]` is the file offset of `data[i]`. */
  readonly origins: Int32Array;
  /** The file offset just past the chain's zero terminator. */
  readonly end: number;
}

/**
 * Read a sub-block chain from `start` (docs/spec/formats/images.md#the-sub-block-chain).
 *
 * The chain is one length byte, that many payload bytes, repeated, ending with a
 * length byte of 0. A sub-block whose declared length runs past the end of the
 * file, or a chain that never reaches its terminator, is a located error at the
 * sub-block's length byte.
 */
function readSubBlocks(bytes: Uint8Array, start: number, path?: string): Result<SubBlocks> {
  const starts: number[] = [];
  const lengths: number[] = [];
  let total = 0;
  let at = start;
  let lastAt = start;
  for (;;) {
    if (at >= bytes.length) {
      return fail(lastAt, "the sub-block chain has no terminator before the end of the file", path);
    }
    lastAt = at;
    const length = bytes[at]!;
    if (length === 0) {
      at += 1;
      break;
    }
    if (at + 1 + length > bytes.length) {
      return fail(
        at,
        `a sub-block of ${length} bytes at ${at} runs past the end of the file (${bytes.length} bytes)`,
        path,
      );
    }
    starts.push(at + 1);
    lengths.push(length);
    total += length;
    at += 1 + length;
  }

  const data = new Uint8Array(total);
  const origins = new Int32Array(total);
  let out = 0;
  for (let block = 0; block < starts.length; block += 1) {
    const from = starts[block]!;
    const length = lengths[block]!;
    for (let i = 0; i < length; i += 1) {
      data[out] = bytes[from + i]!;
      origins[out] = from + i;
      out += 1;
    }
  }
  return ok({ data, origins, end: at });
}

/**
 * Decompress one page's LZW stream into its palette indices
 * (docs/spec/formats/images.md#the-lzw-image-data-stream).
 *
 * Codes are read least significant bit first, the width starts at `m + 1` and
 * grows to 12 as the table grows, and the table stops at 4096 entries (the
 * deferred clear). A code at or past the next free code is a located error at
 * the byte its first bit came from, except the "one behind" case, and a stream
 * that ends before its end-of-information code or that yields a pixel count
 * other than `expected` is a located error too.
 */
function lzwDecode(
  data: Uint8Array,
  origins: Int32Array,
  expected: number,
  minCodeSize: number,
  imageDataAt: number,
  path?: string,
): Result<Uint8Array> {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;

  const pixels = new Uint8Array(expected);
  const prefix = new Int32Array(MAX_TABLE_ENTRIES);
  const suffix = new Uint8Array(MAX_TABLE_ENTRIES);
  const first = new Uint8Array(MAX_TABLE_ENTRIES);
  const stack = new Uint8Array(MAX_TABLE_ENTRIES);

  for (let code = 0; code < clearCode; code += 1) {
    suffix[code] = code;
    first[code] = code;
  }

  let bit = 0;
  let nextCode = clearCode + 2;
  let width = minCodeSize + 1;
  let total = 0;
  let previous = -1;

  /** Read one `width`-bit code, or -1 when the data runs out. */
  const readCode = (): number => {
    let value = 0;
    for (let i = 0; i < width; i += 1) {
      const byte = bit >> 3;
      if (byte >= data.length) {
        return -1;
      }
      value |= ((data[byte]! >> (bit & 7)) & 1) << i;
      bit += 1;
    }
    return value;
  };

  /** Fill `stack` with `code`'s string reversed; return its length. */
  const fill = (code: number): number => {
    let length = 0;
    let at = code;
    while (at >= clearCode) {
      stack[length] = suffix[at]!;
      length += 1;
      at = prefix[at]!;
    }
    stack[length] = at;
    return length + 1;
  };

  for (;;) {
    const codeAt = origins[bit >> 3] ?? imageDataAt;
    const code = readCode();
    if (code < 0) {
      return fail(
        origins.length > 0 ? origins[origins.length - 1]! : imageDataAt,
        "the image data ends before the end-of-information code",
        path,
      );
    }
    if (code === clearCode) {
      nextCode = clearCode + 2;
      width = minCodeSize + 1;
      previous = -1;
      continue;
    }
    if (code === endCode) {
      break;
    }
    if (previous < 0) {
      if (code >= clearCode) {
        return fail(
          codeAt,
          `the first code after a clear is ${code}, which is not a palette index below ${clearCode}`,
          path,
        );
      }
      if (total >= expected) {
        return fail(codeAt, `the image data yields more than the page's ${expected} pixels`, path);
      }
      pixels[total] = code;
      total += 1;
      previous = code;
      continue;
    }

    let length: number;
    let firstByte: number;
    if (code < nextCode) {
      length = fill(code);
      firstByte = first[code]!;
    } else if (code === nextCode) {
      // The format's "one behind" case: the previous string plus its own first byte.
      length = fill(previous);
      firstByte = first[previous]!;
    } else {
      return fail(
        codeAt,
        `code ${code} is at or past the next free code ${nextCode}, which the table does not hold`,
        path,
      );
    }
    const oneBehind = code === nextCode;
    if (total + length + (oneBehind ? 1 : 0) > expected) {
      return fail(
        codeAt,
        `the image data yields more than the page's ${expected} pixels`,
        path,
      );
    }
    for (let i = length - 1; i >= 0; i -= 1) {
      pixels[total] = stack[i]!;
      total += 1;
    }
    if (oneBehind) {
      pixels[total] = firstByte;
      total += 1;
    }

    if (nextCode < MAX_TABLE_ENTRIES) {
      prefix[nextCode] = previous;
      suffix[nextCode] = firstByte;
      first[nextCode] = first[previous]!;
      nextCode += 1;
      // A code read here is the encoder's next code, so the width grows as soon
      // as the next free code fills the current width.
      if (nextCode === 1 << width && width < MAX_CODE_WIDTH) {
        width += 1;
      }
    }
    previous = code;
  }

  if (total !== expected) {
    return fail(
      origins[bit >> 3] ?? imageDataAt,
      `the image data holds ${total} pixels; the page holds ${expected}`,
      path,
    );
  }
  return ok(pixels);
}

/**
 * The stored row order of a page's pixel data: `rowOrder[stored]` is the true
 * `y` of the `stored`-th row (docs/spec/formats/images.md#interlace).
 */
function rowOrderOf(height: number, interlaced: boolean): Int32Array {
  const order = new Int32Array(height);
  if (!interlaced) {
    for (let y = 0; y < height; y += 1) {
      order[y] = y;
    }
    return order;
  }
  let stored = 0;
  const passes: ReadonlyArray<readonly [number, number]> = [
    [0, 8],
    [4, 8],
    [2, 4],
    [1, 2],
  ];
  for (const [start, step] of passes) {
    for (let y = start; y < height; y += step) {
      order[stored] = y;
      stored += 1;
    }
  }
  return order;
}

/** A page's parsed descriptor and colour table. */
interface Page {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly interlaced: boolean;
  readonly table: ColorTable;
  readonly tableEntries: number;
  /** The offset of the page's `2C` separator, for a located error. */
  readonly descriptorAt: number;
}

/** The state a graphic control extension leaves for the next page. */
interface PendingControl {
  disposal: number;
  delay: number;
  transparent: number;
}

/**
 * Decode a GIF to its logical screen and pages (AD-28,
 * docs/spec/formats/images.md#gif).
 *
 * `path` is the file's path, when the caller has one, and is carried on every
 * error. `pageLimit` stops the walk after that many pages, so `decodeTexture`
 * pays for one page and never reads a later page's image data.
 */
export function decodeGif(bytes: Uint8Array, path?: string, pageLimit?: number): Result<DecodedGif> {
  if (bytes.length < HEADER_LENGTH) {
    return fail(0, `file is ${bytes.length} bytes; the 6-byte GIF header is incomplete`, path);
  }
  if (!hasGifSignature(bytes, GIF87A) && !hasGifSignature(bytes, GIF89A)) {
    return fail(
      0,
      `unsupported GIF version "${versionText(bytes)}"; this reader handles GIF87a and GIF89a`,
      path,
    );
  }
  if (bytes.length < HEADER_LENGTH + SCREEN_DESCRIPTOR_LENGTH) {
    return fail(
      HEADER_LENGTH,
      `logical screen descriptor is ${bytes.length - HEADER_LENGTH} bytes; the 7-byte descriptor is required`,
      path,
    );
  }

  const screenW = u16(bytes, HEADER_LENGTH);
  const screenH = u16(bytes, HEADER_LENGTH + 2);
  if (screenW === 0 || screenH === 0) {
    return fail(
      HEADER_LENGTH,
      `logical screen is ${screenW}×${screenH}; both dimensions are positive`,
      path,
    );
  }
  const screenPixels = screenW * screenH;
  if (screenPixels > MAX_PIXELS) {
    return fail(
      HEADER_LENGTH,
      `image is too large: ${screenW}×${screenH} exceeds ${MAX_PIXELS} pixels`,
      path,
    );
  }

  const packed = bytes[HEADER_LENGTH + 4]!;
  const background = bytes[HEADER_LENGTH + 5]!;
  let at = HEADER_LENGTH + SCREEN_DESCRIPTOR_LENGTH;

  let globalTable: ColorTable | undefined;
  let globalEntries = 0;
  if ((packed & 0x80) !== 0) {
    globalEntries = 1 << ((packed & TABLE_SIZE_MASK) + 1);
    const length = globalEntries * 3;
    if (at + length > bytes.length) {
      return fail(
        at,
        `global colour table of ${globalEntries} entries runs past the end of the file (${bytes.length} bytes)`,
        path,
      );
    }
    globalTable = bytes.subarray(at, at + length);
    at += length;
  }

  const frames: DecodedGifFrame[] = [];
  let canvas = new Uint8Array(screenPixels * 4);
  let transparent: { r: number; g: number; b: number } | undefined;
  let trailerAt = -1;
  const pending: PendingControl = { disposal: 0, delay: 0, transparent: -1 };

  while (at < bytes.length) {
    if (pageLimit !== undefined && frames.length >= pageLimit) {
      return ok({ w: screenW, h: screenH, frames, transparent: transparent ?? MAGENTA });
    }

    const block = bytes[at]!;
    if (block === TRAILER) {
      trailerAt = at;
      break;
    }

    if (block === EXTENSION_INTRODUCER) {
      if (at + 1 >= bytes.length) {
        return fail(at, "an extension introducer is the file's last byte; its label is missing", path);
      }
      const label = bytes[at + 1]!;
      if (label === GRAPHIC_CONTROL_LABEL) {
        if (at + 2 >= bytes.length) {
          return fail(at, "an extension introducer is missing its block size", path);
        }
        if (bytes[at + 2] !== GRAPHIC_CONTROL_LENGTH) {
          return fail(
            at + 2,
            `graphic control extension block size is ${bytes[at + 2]}; it is always ${GRAPHIC_CONTROL_LENGTH}`,
            path,
          );
        }
      }
      const chain = readSubBlocks(bytes, at + 2, path);
      if (!chain.ok) {
        return chain;
      }
      if (label === GRAPHIC_CONTROL_LABEL) {
        const data = chain.value.data;
        if (data.length !== GRAPHIC_CONTROL_LENGTH) {
          return fail(
            at + 2,
            `graphic control extension holds ${data.length} bytes; it holds ${GRAPHIC_CONTROL_LENGTH}`,
            path,
          );
        }
        pending.disposal = (data[0]! >> 2) & 0x07;
        pending.delay = data[1]! | (data[2]! << 8);
        pending.transparent = (data[0]! & 0x01) !== 0 ? data[3]! : -1;
      }
      at = chain.value.end;
      continue;
    }

    if (block !== IMAGE_SEPARATOR) {
      return fail(
        at,
        `unexpected block 0x${block.toString(16).padStart(2, "0")} at ${at}; ` +
          "expected an image descriptor (2C), an extension (21) or the trailer (3B)",
        path,
      );
    }

    const descriptorAt = at;
    if (at + IMAGE_DESCRIPTOR_LENGTH > bytes.length) {
      return fail(at, `image descriptor is ${bytes.length - at} bytes; ${IMAGE_DESCRIPTOR_LENGTH} are required`, path);
    }
    const left = u16(bytes, at + 1);
    const top = u16(bytes, at + 3);
    const pageW = u16(bytes, at + 5);
    const pageH = u16(bytes, at + 7);
    const pagePacked = bytes[at + 9]!;
    if (pageW === 0 || pageH === 0) {
      return fail(at, `page is ${pageW}×${pageH} at (${left}, ${top}); both dimensions are positive`, path);
    }
    if (left + pageW > screenW || top + pageH > screenH) {
      return fail(
        at,
        `page at (${left}, ${top}) of ${pageW}×${pageH} leaves the ${screenW}×${screenH} logical screen`,
        path,
      );
    }
    if ((frames.length + 1) * screenPixels > MAX_PIXELS) {
      return fail(
        at,
        `${frames.length + 1} pages of ${screenW}×${screenH} exceed ${MAX_PIXELS} pixels; ` +
          "every frame is held at once",
        path,
      );
    }
    at += IMAGE_DESCRIPTOR_LENGTH;

    let table = globalTable;
    let tableEntries = globalEntries;
    if ((pagePacked & 0x80) !== 0) {
      tableEntries = 1 << ((pagePacked & TABLE_SIZE_MASK) + 1);
      const length = tableEntries * 3;
      if (at + length > bytes.length) {
        return fail(
          at,
          `local colour table of ${tableEntries} entries runs past the end of the file (${bytes.length} bytes)`,
          path,
        );
      }
      table = bytes.subarray(at, at + length);
      at += length;
    }
    if (table === undefined) {
      return fail(descriptorAt, "page has neither a local nor a global colour table", path);
    }

    if (at >= bytes.length) {
      return fail(at, "image data is missing: the LZW minimum code size byte is absent", path);
    }
    const minCodeSize = bytes[at]!;
    if (minCodeSize < MIN_CODE_SIZE_MIN || minCodeSize > MIN_CODE_SIZE_MAX) {
      return fail(
        at,
        `LZW minimum code size is ${minCodeSize}; this reader handles ${MIN_CODE_SIZE_MIN} to ${MIN_CODE_SIZE_MAX}`,
        path,
      );
    }
    at += 1;

    const chain = readSubBlocks(bytes, at, path);
    if (!chain.ok) {
      return chain;
    }
    at = chain.value.end;
    const imageDataAt = chain.value.origins.length > 0 ? chain.value.origins[0]! : at;

    const pagePixels = pageW * pageH;
    const indices = lzwDecode(chain.value.data, chain.value.origins, pagePixels, minCodeSize, imageDataAt, path);
    if (!indices.ok) {
      return indices;
    }

    const previousCanvas = pending.disposal === 3 ? canvas.slice() : undefined;
    const order = rowOrderOf(pageH, (pagePacked & 0x40) !== 0);
    for (let stored = 0; stored < pageH; stored += 1) {
      const y = order[stored]! + top;
      let out = (y * screenW + left) * 4;
      let from = stored * pageW;
      for (let x = 0; x < pageW; x += 1) {
        const index = indices.value[from]!;
        if (index >= tableEntries) {
          return fail(
            imageDataAt,
            `palette index ${index} is outside the page's ${tableEntries}-entry colour table`,
            path,
          );
        }
        const entry = index * 3;
        canvas[out] = table[entry]!;
        canvas[out + 1] = table[entry + 1]!;
        canvas[out + 2] = table[entry + 2]!;
        canvas[out + 3] = index === pending.transparent ? 0 : 255;
        out += 4;
        from += 1;
      }
    }

    frames.push({ rgba: canvas.slice(), delay: pending.delay / 100 });

    if (transparent === undefined) {
      if (pending.transparent >= 0 && pending.transparent < tableEntries) {
        const entry = pending.transparent * 3;
        transparent = { r: table[entry]!, g: table[entry + 1]!, b: table[entry + 2]! };
      } else if (globalTable !== undefined && background < globalEntries) {
        const entry = background * 3;
        transparent = { r: globalTable[entry]!, g: globalTable[entry + 1]!, b: globalTable[entry + 2]! };
      } else {
        transparent = MAGENTA;
      }
    }

    if (pending.disposal === 2) {
      for (let y = 0; y < pageH; y += 1) {
        const row = (top + y) * screenW + left;
        for (let x = 0; x < pageW; x += 1) {
          const out = (row + x) * 4;
          canvas[out] = 0;
          canvas[out + 1] = 0;
          canvas[out + 2] = 0;
          canvas[out + 3] = 0;
        }
      }
    } else if (pending.disposal === 3 && previousCanvas !== undefined) {
      canvas = previousCanvas;
    }

    pending.disposal = 0;
    pending.delay = 0;
    pending.transparent = -1;
  }

  if (frames.length === 0) {
    return fail(
      trailerAt < 0 ? at : trailerAt,
      "the file holds no image page: header, screen descriptor, trailer",
      path,
    );
  }
  const warnings: string[] = [];
  if (trailerAt < 0) {
    warnings.push(
      "the file ends after the last page's data with no 3B trailer; every page's own data was complete",
    );
  }
  return ok({ w: screenW, h: screenH, frames, transparent: transparent ?? MAGENTA }, warnings);
}
