// The image decoders of docs/spec/formats/images.md#the-shared-decode-contract (AD-28): synthetic PNGs built byte by
// byte pin each scanline filter, sub-byte samples, the palette and tRNS path,
// the alpha channels of colour types 4 and 6, grey and truecolour colour keys,
// Adam7 de-interlacing and the known-answer Adam7 stream. Located errors cover
// a bad signature, truncation, a broken zlib stream, an IDAT that does not
// inflate to the declared layout, a stale chunk CRC, a malformed chunk list, an
// unlisted colour type or depth and an out-of-range palette index, and every
// truncation or one-byte corruption of a valid file comes back as a Result
// rather than a throw. When the legacy sample games are fetched, the two JPEGs
// and the palette PNG decode to their exact dimensions, twice to byte-identical
// RGBA, and a declared tRNS yields transparent pixels.
import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { zlibSync } from "fflate/browser";
import { decodeTexture } from "../src/index.ts";
import type { Result } from "../src/index.ts";

/** Unwrap a result the test expects to succeed. */
function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`expected ok, got: ${result.error.message}`);
  }
  return result.value;
}

/** CRC-32 as PNG defines it, written here independently of the decoder's copy. */
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Adler-32 as zlib appends it. */
function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (const byte of bytes) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

/** Wrap `data` in a zlib stream of stored (uncompressed) deflate blocks. */
function zlibStore(data: Uint8Array): Uint8Array {
  const blocks = Math.max(1, Math.ceil(data.length / 65535));
  const out = new Uint8Array(2 + blocks * 5 + data.length + 4);
  out[0] = 0x78;
  out[1] = 0x01;
  let at = 2;
  for (let block = 0; block < blocks; block += 1) {
    const start = block * 65535;
    const length = Math.min(65535, data.length - start);
    out[at] = block === blocks - 1 ? 1 : 0;
    out[at + 1] = length & 0xff;
    out[at + 2] = (length >> 8) & 0xff;
    out[at + 3] = ~length & 0xff;
    out[at + 4] = (~length >> 8) & 0xff;
    at += 5;
    out.set(data.subarray(start, start + length), at);
    at += length;
  }
  const adler = adler32(data);
  out[at] = (adler >>> 24) & 0xff;
  out[at + 1] = (adler >>> 16) & 0xff;
  out[at + 2] = (adler >>> 8) & 0xff;
  out[at + 3] = adler & 0xff;
  return out.slice(0, at + 4);
}

/** The 8-byte PNG signature. */
const SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Write a big-endian u32 into `out` at `at`. */
function writeU32(out: Uint8Array, at: number, value: number): void {
  out[at] = (value >>> 24) & 0xff;
  out[at + 1] = (value >>> 16) & 0xff;
  out[at + 2] = (value >>> 8) & 0xff;
  out[at + 3] = value & 0xff;
}

/** One PNG chunk: length, type, data, CRC over type+data. */
function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  writeU32(out, 0, data.length);
  for (let i = 0; i < 4; i += 1) {
    out[4 + i] = type.charCodeAt(i);
  }
  out.set(data, 8);
  writeU32(out, 8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** Concatenate byte arrays in order. */
function concat(parts: readonly Uint8Array[]): Uint8Array {
  let total = 0;
  for (const part of parts) {
    total += part.length;
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

interface PngSpec {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly colourType: number;
  /** The interlace field; 0 or 1 for valid files, anything else to test rejection. */
  readonly interlace: number;
  /** The already-filtered scanline bytes (filter byte + samples per row). */
  readonly raw: Uint8Array;
  readonly palette?: Uint8Array;
  readonly trns?: Uint8Array;
  /** Replace the compressed IDAT payload (to test a broken zlib stream). */
  readonly idat?: Uint8Array;
}

/** Assemble a PNG from a header and the given chunks. */
function buildPng(spec: PngSpec): Uint8Array {
  const ihdr = new Uint8Array(13);
  writeU32(ihdr, 0, spec.width);
  writeU32(ihdr, 4, spec.height);
  ihdr[8] = spec.depth;
  ihdr[9] = spec.colourType;
  ihdr[12] = spec.interlace;
  const parts: Uint8Array[] = [SIGNATURE, chunk("IHDR", ihdr)];
  if (spec.palette !== undefined) {
    parts.push(chunk("PLTE", spec.palette));
  }
  if (spec.trns !== undefined) {
    parts.push(chunk("tRNS", spec.trns));
  }
  parts.push(chunk("IDAT", spec.idat ?? zlibStore(spec.raw)));
  parts.push(chunk("IEND", new Uint8Array(0)));
  return concat(parts);
}

/** The file offset of the IDAT payload, found by walking the chunks. */
function idatDataOffset(png: Uint8Array): number {
  let at = SIGNATURE.length;
  while (at < png.length) {
    const length = (png[at]! << 24) | (png[at + 1]! << 16) | (png[at + 2]! << 8) | png[at + 3]!;
    const type = String.fromCharCode(png[at + 4]!, png[at + 5]!, png[at + 6]!, png[at + 7]!);
    if (type === "IDAT") {
      return at + 8;
    }
    at += 12 + length;
  }
  throw new Error("no IDAT chunk in the built PNG");
}

/** An IHDR chunk with the geometry the decoder reads, for hand-assembled files. */
function ihdrChunk(width: number, height: number, depth: number, colourType: number): Uint8Array {
  const ihdr = new Uint8Array(13);
  writeU32(ihdr, 0, width);
  writeU32(ihdr, 4, height);
  ihdr[8] = depth;
  ihdr[9] = colourType;
  return chunk("IHDR", ihdr);
}

/** The file offset of the length field of the first `type` chunk in `png`. */
function chunkOffset(png: Uint8Array, type: string): number {
  let at = SIGNATURE.length;
  while (at < png.length) {
    const length = (png[at]! << 24) | (png[at + 1]! << 16) | (png[at + 2]! << 8) | png[at + 3]!;
    const found = String.fromCharCode(png[at + 4]!, png[at + 5]!, png[at + 6]!, png[at + 7]!);
    if (found === type) {
      return at;
    }
    at += 12 + length;
  }
  throw new Error(`no ${type} chunk in the built PNG`);
}

/** The file offset of a chunk's stored CRC, from the same walk. */
function chunkCrcOffset(png: Uint8Array, type: string): number {
  const at = chunkOffset(png, type);
  const length = (png[at]! << 24) | (png[at + 1]! << 16) | (png[at + 2]! << 8) | png[at + 3]!;
  return at + 8 + length;
}

/** The RGBA of one pixel, as a plain array, for readable assertions. */
function pixel(rgba: Uint8Array, width: number, x: number, y: number): number[] {
  const at = (y * width + x) * 4;
  return [rgba[at]!, rgba[at + 1]!, rgba[at + 2]!, rgba[at + 3]!];
}

/** An 8-bit grey PNG of `width × 1`, unfiltered (filter type 0). */
function greyU8(width: number, values: readonly number[]): Uint8Array {
  const raw = new Uint8Array(1 + width);
  raw.set(values, 1);
  return buildPng({ width, height: 1, depth: 8, colourType: 0, interlace: 0, raw });
}

test("the five scanline filters reverse to the same image", () => {
  // A 4×2 8-bit grey image, values fixed by hand; the filtered bytes below are
  // worked out by hand from the PNG filter definitions, so this is a
  // known-answer vector rather than a round-trip through the decoder's own
  // arithmetic.
  const cases: { filter: number; rows: number[][] }[] = [
    { filter: 0, rows: [[10, 20, 30, 40], [50, 60, 70, 80]] },
    { filter: 1, rows: [[10, 10, 10, 10], [50, 10, 10, 10]] },
    { filter: 2, rows: [[10, 20, 30, 40], [40, 40, 40, 40]] },
    { filter: 3, rows: [[10, 15, 20, 25], [45, 25, 25, 25]] },
    // With an all-zero row above, Paeth's predictor is the left neighbour
    // (`p = a`, `pa = 0`), so the first row is filtered exactly as Sub is.
    { filter: 4, rows: [[10, 10, 10, 10], [40, 10, 10, 10]] },
  ];
  const expected = [10, 20, 30, 40, 50, 60, 70, 80];

  for (const { filter, rows } of cases) {
    const raw = new Uint8Array(2 * 5);
    rows.forEach((row, index) => {
      raw[index * 5] = filter;
      raw.set(row, index * 5 + 1);
    });
    const png = buildPng({ width: 4, height: 2, depth: 8, colourType: 0, interlace: 0, raw });
    const { rgba } = unwrap(decodeTexture(png));
    expected.forEach((value, index) => {
      deepEqual(
        pixel(rgba, 4, index % 4, Math.floor(index / 4)),
        [value, value, value, 255],
        `filter ${filter}, sample ${index}`,
      );
    });
  }
});

test("1-, 2-, 4- and 16-bit grey samples widen to exact 8-bit values", () => {
  const cases: { depth: number; width: number; packed: number[]; expected: number[] }[] = [
    { depth: 1, width: 8, packed: [0b1010_1100], expected: [255, 0, 255, 0, 255, 255, 0, 0] },
    { depth: 2, width: 4, packed: [0b1101_1000], expected: [255, 85, 170, 0] },
    { depth: 4, width: 2, packed: [0xa5], expected: [170, 85] },
    { depth: 16, width: 2, packed: [0x00, 0x00, 0x80, 0x80], expected: [0, 128] },
  ];

  for (const { depth, width, packed, expected } of cases) {
    const raw = new Uint8Array(1 + packed.length);
    raw.set(packed, 1);
    const png = buildPng({ width, height: 1, depth, colourType: 0, interlace: 0, raw });
    const { rgba } = unwrap(decodeTexture(png));
    expected.forEach((value, x) => {
      deepEqual(pixel(rgba, width, x, 0), [value, value, value, 255], `${depth}-bit sample ${x}`);
    });
  }
});

test("a palette PNG expands PLTE and applies tRNS alpha", () => {
  const png = buildPng({
    width: 4,
    height: 1,
    depth: 8,
    colourType: 3,
    interlace: 0,
    raw: new Uint8Array([0, 0, 1, 2, 0]),
    palette: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]),
    trns: new Uint8Array([0, 128]),
  });
  const { rgba } = unwrap(decodeTexture(png));
  deepEqual(pixel(rgba, 4, 0, 0), [1, 2, 3, 0]);
  deepEqual(pixel(rgba, 4, 1, 0), [4, 5, 6, 128]);
  deepEqual(pixel(rgba, 4, 2, 0), [7, 8, 9, 255]);
  deepEqual(pixel(rgba, 4, 3, 0), [1, 2, 3, 0]);
});

test("an Adam7 stream de-interlaces to the exact image (known-answer stream)", () => {
  // 3×3 8-bit grey, values 1…9 row-major. The seven passes, in order, carry:
  // pass 1 → (0,0); pass 4 → (2,0); pass 5 → (0,2),(2,2); pass 6 → (1,0),(1,2);
  // pass 7 → (0,1),(1,1),(2,1). Passes 2 and 3 are empty for a 3×3 image.
  const raw = new Uint8Array([0, 1, 0, 3, 0, 7, 9, 0, 2, 0, 8, 0, 4, 5, 6]);
  const png = buildPng({ width: 3, height: 3, depth: 8, colourType: 0, interlace: 1, raw });
  const { w, h, rgba } = unwrap(decodeTexture(png));
  equal(w, 3);
  equal(h, 3);
  equal(rgba.length, 3 * 3 * 4);
  for (let index = 0; index < 9; index += 1) {
    const value = index + 1;
    deepEqual(
      pixel(rgba, 3, index % 3, Math.floor(index / 3)),
      [value, value, value, 255],
      `pixel ${index}`,
    );
  }
});

test("an interlaced palette PNG combines Adam7 with a tRNS alpha", () => {
  // 5×2 palette image. In pass order, the non-empty passes carry, with filter
  // type 0: pass 1 → (0,0); pass 2 → (4,0); pass 4 → (2,0); pass 6 → (1,0),(3,0);
  // pass 7 → every column of row 1. The intended index rows are
  // 1 2 0 1 2 / 2 0 1 2 0.
  const raw = new Uint8Array([0, 1, 0, 2, 0, 0, 0, 2, 1, 0, 2, 0, 1, 2, 0]);
  const png = buildPng({
    width: 5,
    height: 2,
    depth: 8,
    colourType: 3,
    interlace: 1,
    raw,
    palette: new Uint8Array([10, 11, 12, 13, 14, 15, 16, 17, 18]),
    trns: new Uint8Array([255, 0, 200]),
  });
  const { rgba } = unwrap(decodeTexture(png));
  const entries: number[][] = [
    [10, 11, 12, 255],
    [13, 14, 15, 0],
    [16, 17, 18, 200],
  ];
  const indices = [1, 2, 0, 1, 2, 2, 0, 1, 2, 0];
  indices.forEach((index, at) => {
    deepEqual(pixel(rgba, 5, at % 5, Math.floor(at / 5)), entries[index]!, `pixel ${at}`);
  });
});

test("colour type 6 and 4 carry their own non-opaque alpha", () => {
  const truecolour = buildPng({
    width: 2,
    height: 1,
    depth: 8,
    colourType: 6,
    interlace: 0,
    // filter 0, then RGBA / RGBA.
    raw: new Uint8Array([0, 10, 20, 30, 0, 200, 100, 50, 128]),
  });
  const rgba6 = unwrap(decodeTexture(truecolour));
  deepEqual(pixel(rgba6.rgba, 2, 0, 0), [10, 20, 30, 0]);
  deepEqual(pixel(rgba6.rgba, 2, 1, 0), [200, 100, 50, 128]);

  const greyAlpha = buildPng({
    width: 2,
    height: 1,
    depth: 8,
    colourType: 4,
    interlace: 0,
    // filter 0, then grey/alpha / grey/alpha.
    raw: new Uint8Array([0, 77, 0, 200, 64]),
  });
  const rgba4 = unwrap(decodeTexture(greyAlpha));
  deepEqual(pixel(rgba4.rgba, 2, 0, 0), [77, 77, 77, 0]);
  deepEqual(pixel(rgba4.rgba, 2, 1, 0), [200, 200, 200, 64]);
});

test("a type 0 and a type 2 tRNS colour key give transparent pixels", () => {
  // Colour type 0: the key is one 16-bit grey. Only samples equal to it are
  // transparent; every other pixel stays opaque.
  const grey = buildPng({
    width: 3,
    height: 1,
    depth: 8,
    colourType: 0,
    interlace: 0,
    raw: new Uint8Array([0, 5, 6, 5]),
    trns: new Uint8Array([0, 5]),
  });
  const greyRgba = unwrap(decodeTexture(grey)).rgba;
  deepEqual(pixel(greyRgba, 3, 0, 0), [5, 5, 5, 0]);
  deepEqual(pixel(greyRgba, 3, 1, 0), [6, 6, 6, 255]);
  deepEqual(pixel(greyRgba, 3, 2, 0), [5, 5, 5, 0]);

  // Colour type 2: three 16-bit channels must all match the key.
  const truecolour = buildPng({
    width: 2,
    height: 1,
    depth: 8,
    colourType: 2,
    interlace: 0,
    raw: new Uint8Array([0, 10, 20, 30, 10, 20, 31]),
    trns: new Uint8Array([0, 10, 0, 20, 0, 30]),
  });
  const rgbRgba = unwrap(decodeTexture(truecolour)).rgba;
  deepEqual(pixel(rgbRgba, 2, 0, 0), [10, 20, 30, 0]);
  deepEqual(pixel(rgbRgba, 2, 1, 0), [10, 20, 31, 255]);
});

test("the RGBA buffer is fresh and non-aliasing", () => {
  const png = greyU8(2, [1, 2]);
  const first = unwrap(decodeTexture(png));
  const second = unwrap(decodeTexture(png));
  equal(first.rgba === second.rgba, false);
  deepEqual(first.rgba, second.rgba);
  first.rgba[0] = 200;
  deepEqual(pixel(second.rgba, 2, 0, 0), [1, 1, 1, 255]);
});

test("an unknown signature is a located error, not a throw", () => {
  // `D7 CD C6 9A` is a Windows metafile (WMF), a kind docs/spec/formats/images.md#windows-bitmap-bmp drops by name.
  const result = decodeTexture(new Uint8Array([0xd7, 0xcd, 0xc6, 0x9a]), "x.wmf");
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, 0);
    equal(result.error.section, "docs/spec/formats/images.md#the-shared-decode-contract");
    equal(result.error.path, "x.wmf");
  }
});

test("a truncated IHDR is located at the chunk", () => {
  const png = greyU8(2, [1, 2]);
  for (const [cut, offset] of [[12, 8], [20, 8]] as const) {
    const result = decodeTexture(png.subarray(0, cut));
    equal(result.ok, false, `cut at ${cut}`);
    if (!result.ok) {
      equal(result.error.offset, offset, `cut at ${cut}`);
      equal(result.error.section, "docs/spec/formats/images.md#the-shared-decode-contract");
      equal(result.error.message.includes("IHDR") || result.error.message.includes("chunk header"), true);
    }
  }
});

test("a truncated IDAT is located at the IDAT chunk", () => {
  const png = greyU8(2, [1, 2]);
  const idatAt = idatDataOffset(png);
  const result = decodeTexture(png.subarray(0, idatAt + 2));
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, idatAt - 8);
    equal(result.error.message.includes("IDAT"), true);
    equal(result.error.section, "docs/spec/formats/images.md#the-shared-decode-contract");
  }
});

test("an IDAT that is not a zlib stream is a located error", () => {
  // A bad zlib header makes fflate throw; this is the throw branch.
  const badHeader = buildPng({
    width: 1,
    height: 1,
    depth: 8,
    colourType: 0,
    interlace: 0,
    raw: new Uint8Array([0, 7]),
    idat: new Uint8Array([0x00, 0x00]),
  });
  const thrown = decodeTexture(badHeader);
  equal(thrown.ok, false);
  if (!thrown.ok) {
    equal(thrown.error.offset, idatDataOffset(badHeader));
    equal(thrown.error.message.includes("zlib"), true);
    equal(thrown.error.section, "docs/spec/formats/images.md#the-shared-decode-contract");
  }

  // A good header with a truncated body is not an error inside fflate — it
  // returns short output — so the expected-size check is what catches it.
  const short = buildPng({
    width: 1,
    height: 1,
    depth: 8,
    colourType: 0,
    interlace: 0,
    raw: new Uint8Array([0, 7]),
    idat: new Uint8Array([0x78, 0x01, 0x02, 0x03, 0x04]),
  });
  const truncated = decodeTexture(short);
  equal(truncated.ok, false);
  if (!truncated.ok) {
    equal(truncated.error.offset, idatDataOffset(short));
    equal(truncated.error.message.includes("inflates to"), true);
    equal(truncated.error.section, "docs/spec/formats/images.md#the-shared-decode-contract");
  }
});

test("a stale chunk CRC is a located error at the CRC field", () => {
  // Every chunk's stored CRC is checked over its type and data, so a chunk whose
  // CRC no longer matches its bytes is refused rather than decoded from bytes
  // the file cannot vouch for. Only the CRC byte changes here, so the chunk data
  // itself is untouched and the mismatch is exactly the stale CRC.
  const png = greyU8(2, [1, 2]);
  const crcAt = chunkCrcOffset(png, "IDAT");
  const stale = png.slice();
  stale[crcAt] = stale[crcAt]! ^ 0xff;
  const result = decodeTexture(stale);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, crcAt);
    equal(result.error.section, "docs/spec/formats/images.md#the-shared-decode-contract");
    equal(result.error.message.includes("CRC"), true);
  }
});

test("an IDAT that inflates past the declared layout is refused", () => {
  // A 1×1 grey image declares two bytes of inflated scanlines. This IDAT is a
  // one-kilobyte zlib stream that expands to a megabyte of zeros, so a decoder
  // that inflated without a bound would allocate a hundredfold more than the
  // header allows; the declared layout bounds the output buffer and the
  // over-long stream is refused.
  const png = buildPng({
    width: 1,
    height: 1,
    depth: 8,
    colourType: 0,
    interlace: 0,
    raw: new Uint8Array([0, 7]),
    idat: zlibSync(new Uint8Array(1_000_000)),
  });
  const result = decodeTexture(png);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, idatDataOffset(png));
    equal(result.error.message.includes("inflates to"), true);
    equal(result.error.section, "docs/spec/formats/images.md#the-shared-decode-contract");
  }
});

test("a header that declares more than any deflate stream of that length can fill is refused", () => {
  // 5000×5000 grey needs about 25 MB of inflated scanlines; a 100-byte stream
  // cannot expand past a thousandfold, so the header is refused before an
  // output buffer that size is reserved for it.
  const png = buildPng({
    width: 5000,
    height: 5000,
    depth: 8,
    colourType: 0,
    interlace: 0,
    raw: new Uint8Array(0),
    idat: zlibSync(new Uint8Array(100)),
  });
  const result = decodeTexture(png);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, idatDataOffset(png));
    equal(result.error.message.includes("cannot inflate"), true);
    equal(result.error.section, "docs/spec/formats/images.md#the-shared-decode-contract");
  }
});

test("a highly compressible image is not mistaken for a bomb", () => {
  // 2000×2000 grey of one colour inflates to four million bytes from a few
  // kilobytes, a ratio near the deflate maximum; it must still decode.
  const raw = new Uint8Array(2000 * (1 + 2000));
  const png = buildPng({
    width: 2000,
    height: 2000,
    depth: 8,
    colourType: 0,
    interlace: 0,
    raw,
    idat: zlibSync(raw, { level: 9 }),
  });
  const decoded = unwrap(decodeTexture(png));
  equal(decoded.w, 2000);
  equal(decoded.h, 2000);
  deepEqual(pixel(decoded.rgba, 2000, 1999, 1999), [0, 0, 0, 255]);
});

test("an IDAT that inflates to fewer bytes than the declared layout is refused", () => {
  const png = buildPng({
    width: 2,
    height: 1,
    depth: 8,
    colourType: 0,
    interlace: 0,
    raw: new Uint8Array([0, 1, 2]),
    // A well-formed zlib stream of two bytes, where the layout needs three.
    idat: zlibStore(new Uint8Array([0, 1])),
  });
  const result = decodeTexture(png);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, idatDataOffset(png));
    equal(result.error.message.includes("inflates to"), true);
    equal(result.error.section, "docs/spec/formats/images.md#the-shared-decode-contract");
  }
});

test("an unlisted colour type or bit depth is reported at its IHDR field", () => {
  const colourType = decodeTexture(
    buildPng({ width: 1, height: 1, depth: 8, colourType: 5, interlace: 0, raw: new Uint8Array([0, 0]) }),
  );
  equal(colourType.ok, false);
  if (!colourType.ok) {
    equal(colourType.error.offset, 25);
    equal(colourType.error.message.includes("colour type 5"), true);
  }

  const depth = decodeTexture(
    buildPng({ width: 1, height: 1, depth: 4, colourType: 2, interlace: 0, raw: new Uint8Array([0, 0, 0, 0]) }),
  );
  equal(depth.ok, false);
  if (!depth.ok) {
    equal(depth.error.offset, 24);
    equal(depth.error.message.includes("bit depth 4"), true);
  }
});

test("an unlisted interlace method and an unknown filter are located errors", () => {
  const interlace = decodeTexture(
    buildPng({ width: 1, height: 1, depth: 8, colourType: 0, interlace: 2, raw: new Uint8Array([0, 0]) }),
  );
  equal(interlace.ok, false);
  if (!interlace.ok) {
    equal(interlace.error.offset, 28);
    equal(interlace.error.message.includes("interlace method 2"), true);
  }

  const filter = buildPng({
    width: 1,
    height: 1,
    depth: 8,
    colourType: 0,
    interlace: 0,
    raw: new Uint8Array([9, 7]),
  });
  const filtered = decodeTexture(filter);
  equal(filtered.ok, false);
  if (!filtered.ok) {
    equal(filtered.error.offset, idatDataOffset(filter));
    equal(filtered.error.message.includes("filter type 9"), true);
  }
});

test("a palette index outside PLTE is reported, never rendered", () => {
  const png = buildPng({
    width: 2,
    height: 1,
    depth: 8,
    colourType: 3,
    interlace: 0,
    raw: new Uint8Array([0, 0, 5]),
    palette: new Uint8Array([1, 2, 3, 4, 5, 6]),
  });
  const result = decodeTexture(png);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, idatDataOffset(png));
    equal(result.error.message.includes("palette index 5"), true);
  }
});

test("a truncated IHDR payload reports a short IHDR", () => {
  const png = buildPng({
    width: 1,
    height: 1,
    depth: 8,
    colourType: 0,
    interlace: 0,
    raw: new Uint8Array([0, 0]),
  });
  // Replace the IHDR length (13) with 5 and recompute its CRC over the shorter
  // payload, so only the payload length is wrong.
  const short = png.slice();
  writeU32(short, 8, 5);
  writeU32(short, 21, crc32(short.subarray(12, 21)));
  const result = decodeTexture(short);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, 8);
    equal(result.error.message.includes("IHDR is 5 bytes"), true);
  }
});

test("a malformed chunk list is a located error, not a decoded image", () => {
  // Every file below is otherwise a valid 2×1 grey or 1×1 palette PNG, so the
  // only defect is the one under test and only the structure check can catch it.
  const ihdr = ihdrChunk(2, 1, 8, 0);
  const greyIdat = chunk("IDAT", zlibStore(new Uint8Array([0, 1, 2])));
  const paletteIhdr = ihdrChunk(1, 1, 8, 3);
  const paletteIdat = chunk("IDAT", zlibStore(new Uint8Array([0, 0])));
  const iend = chunk("IEND", new Uint8Array(0));

  // No IEND: the chunk stream ends after the image data.
  const noEnd = concat([SIGNATURE, ihdr, greyIdat]);
  const missing = decodeTexture(noEnd);
  equal(missing.ok, false);
  if (!missing.ok) {
    equal(missing.error.offset, noEnd.length);
    equal(missing.error.message.includes("IEND"), true);
    equal(missing.error.section, "docs/spec/formats/images.md#the-shared-decode-contract");
  }

  // A second IHDR: the header appears once and first.
  const twoHeaders = concat([SIGNATURE, ihdr, ihdr, greyIdat, iend]);
  const duplicate = decodeTexture(twoHeaders);
  equal(duplicate.ok, false);
  if (!duplicate.ok) {
    equal(duplicate.error.offset, 8 + ihdr.length);
    equal(duplicate.error.message.includes("IHDR"), true);
  }

  // An unknown critical chunk: `CgBI`'s first letter is uppercase, so a decoder
  // that cannot honour it must refuse the file rather than guess at the pixels.
  const unknown = concat([SIGNATURE, ihdr, chunk("CgBI", new Uint8Array(0)), greyIdat, iend]);
  const critical = decodeTexture(unknown);
  equal(critical.ok, false);
  if (!critical.ok) {
    equal(critical.error.offset, chunkOffset(unknown, "CgBI"));
    equal(critical.error.message.includes("CgBI"), true);
  }

  // PLTE and tRNS belong before the first IDAT.
  const latePlte = concat([
    SIGNATURE,
    paletteIhdr,
    paletteIdat,
    chunk("PLTE", new Uint8Array([1, 2, 3])),
    iend,
  ]);
  const misplacedPalette = decodeTexture(latePlte);
  equal(misplacedPalette.ok, false);
  if (!misplacedPalette.ok) {
    equal(misplacedPalette.error.offset, chunkOffset(latePlte, "PLTE"));
    equal(misplacedPalette.error.message.includes("PLTE"), true);
  }

  const lateTrns = concat([SIGNATURE, ihdr, greyIdat, chunk("tRNS", new Uint8Array([0, 1])), iend]);
  const misplacedKey = decodeTexture(lateTrns);
  equal(misplacedKey.ok, false);
  if (!misplacedKey.ok) {
    equal(misplacedKey.error.offset, chunkOffset(lateTrns, "tRNS"));
    equal(misplacedKey.error.message.includes("tRNS"), true);
  }

  // A palette longer than the bit depth can address: depth 1 selects two.
  const longPalette = concat([
    SIGNATURE,
    ihdrChunk(1, 1, 1, 3),
    chunk("PLTE", new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9])),
    paletteIdat,
    iend,
  ]);
  const oversized = decodeTexture(longPalette);
  equal(oversized.ok, false);
  if (!oversized.ok) {
    equal(oversized.error.offset, chunkOffset(longPalette, "PLTE"));
    equal(oversized.error.message.includes("PLTE"), true);
  }
});

test("every truncation and one-byte change of a PNG returns a Result, never a throw", () => {
  // An asset is untrusted input: a decoder that throws takes the whole game down
  // on one corrupt file. A cut at any length and a flipped byte at any offset
  // must come back as a `Result`, and a refusal must be a located failure.
  const png = greyU8(2, [1, 2]);
  for (let cut = 0; cut <= png.length; cut += 1) {
    const result = decodeTexture(png.subarray(0, cut));
    equal(result.ok, cut === png.length, `truncated to ${cut} bytes`);
    if (!result.ok) {
      equal(result.error.section, "docs/spec/formats/images.md#the-shared-decode-contract", `truncated to ${cut} bytes`);
      equal(result.error.offset >= 0, true, `truncated to ${cut} bytes`);
    }
  }
  for (let at = 0; at < png.length; at += 1) {
    const mutated = png.slice();
    mutated[at] = mutated[at]! ^ 0xff;
    const result = decodeTexture(mutated);
    if (!result.ok) {
      equal(result.error.section, "docs/spec/formats/images.md#the-shared-decode-contract", `byte ${at} changed`);
      equal(result.error.offset >= 0, true, `byte ${at} changed`);
    }
  }
});

// The legacy sample games are fetched, not committed (G5 rule 4). Skip cleanly
// when they are absent.
const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "..", "..", "..");
const SAMPLE_IMAGES = [
  { file: join(repoRoot, "fixtures", "legacy", "demo", "Bitmap", "layout.png"), width: 640, height: 480 },
  { file: join(repoRoot, "fixtures", "legacy", "Basic", "Bitmap", "layout.png"), width: 640, height: 480 },
  { file: join(repoRoot, "fixtures", "legacy", "demo", "Bitmap", "bkg.jpg"), width: 640, height: 480 },
  { file: join(repoRoot, "fixtures", "legacy", "Basic", "Bitmap", "bkg.jpg"), width: 640, height: 480 },
  { file: join(repoRoot, "fixtures", "legacy", "demo", "Bitmap", "mwin.jpg"), width: 600, height: 100 },
  { file: join(repoRoot, "fixtures", "legacy", "Basic", "Bitmap", "mwin.jpg"), width: 600, height: 100 },
];
const missingFixtures = SAMPLE_IMAGES.filter((image) => !existsSync(image.file));

/** Whether a PNG carries a tRNS chunk: a walk of its chunk list. */
function declaresTrns(bytes: Uint8Array): boolean {
  let at = SIGNATURE.length;
  while (at + 8 <= bytes.length) {
    const length = (bytes[at]! << 24) | (bytes[at + 1]! << 16) | (bytes[at + 2]! << 8) | bytes[at + 3]!;
    const type = String.fromCharCode(bytes[at + 4]!, bytes[at + 5]!, bytes[at + 6]!, bytes[at + 7]!);
    if (type === "tRNS") {
      return true;
    }
    if (type === "IEND") {
      return false;
    }
    at += 12 + length;
  }
  return false;
}

test(
  "the sample images decode to exact dimensions and deterministic RGBA",
  { skip: missingFixtures.length === 0 ? false : `fixtures not fetched: ${missingFixtures[0]!.file}` },
  () => {
    for (const image of SAMPLE_IMAGES) {
      const bytes = new Uint8Array(readFileSync(image.file));
      const first = unwrap(decodeTexture(bytes, image.file));
      equal(first.w, image.width, `${image.file} width`);
      equal(first.h, image.height, `${image.file} height`);
      equal(first.rgba.length, image.width * image.height * 4, `${image.file} buffer length`);

      // Determinism (G3): the same bytes decode to the same pixels.
      const second = unwrap(decodeTexture(bytes, image.file));
      deepEqual(second.rgba, first.rgba, `${image.file} is not deterministic`);

      // Both fixtures are photographic or palette art, never a flat colour.
      const distinct = new Set<number>();
      for (let at = 0; at < first.rgba.length; at += 4) {
        distinct.add((first.rgba[at]! << 16) | (first.rgba[at + 1]! << 8) | first.rgba[at + 2]!);
        if (distinct.size > 1) {
          break;
        }
      }
      equal(distinct.size > 1, true, `${image.file} decoded to a single colour`);

      // The 8-bit palette PNG of the corpus carries no tRNS chunk, so it is
      // fully opaque; a declared tRNS must produce transparent pixels.
      let transparent = 0;
      for (let at = 3; at < first.rgba.length; at += 4) {
        if (first.rgba[at] === 0) {
          transparent += 1;
        }
      }
      if (declaresTrns(bytes)) {
        equal(transparent > 0, true, `${image.file} declares tRNS but has no transparent pixel`);
      } else {
        equal(transparent, 0, `${image.file} declares no tRNS, so every pixel is opaque`);
      }
    }
  },
);
