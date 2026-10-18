import { decodeTexture, type DecodedTexture } from "@tk-reawakened/core";

function u32be(value: number): number[] { return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]; }
function crc32(bytes: readonly number[]): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(name: string, data: readonly number[]): number[] {
  const type = [...name].map((character) => character.charCodeAt(0));
  const payload = [...type, ...data];
  return [...u32be(data.length), ...payload, ...u32be(crc32(payload))];
}

/**
 * Encode straight RGBA as a PNG. By default the zlib stream is stored blocks, so the bytes are identical on every
 * runtime (the committed font and scene PNGs). A caller that writes large committed images passes `deflate`, which turns
 * the filtered scanlines into a complete zlib stream; the pixels decode identically either way.
 */
export function encodeRgbaPng(image: DecodedTexture, deflate?: (scanlines: Uint8Array) => Uint8Array): Uint8Array {
  const scan = new Uint8Array(image.h * (image.w * 4 + 1));
  for (let y = 0; y < image.h; y += 1) scan.set(image.rgba.subarray(y * image.w * 4, (y + 1) * image.w * 4), y * (image.w * 4 + 1) + 1);
  const z: number[] = [];
  if (deflate !== undefined) {
    for (const value of deflate(scan)) z.push(value);
  } else {
    z.push(0x78, 0x01);
    let offset = 0;
    while (offset < scan.length) {
      const length = Math.min(65535, scan.length - offset);
      z.push(offset + length === scan.length ? 1 : 0, length & 255, length >>> 8, (~length) & 255, ((~length) >>> 8) & 255);
      for (let i = 0; i < length; i += 1) z.push(scan[offset + i] ?? 0);
      offset += length;
    }
    let a = 1, b = 0;
    for (const value of scan) { a = (a + value) % 65521; b = (b + a) % 65521; }
    z.push(...u32be(((b << 16) | a) >>> 0));
  }
  const ihdr = [...u32be(image.w), ...u32be(image.h), 8, 6, 0, 0, 0];
  return new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, ...chunk("IHDR", ihdr), ...chunk("IDAT", z), ...chunk("IEND", [])]);
}

export type PixelComparison = { readonly equal: boolean; readonly firstDifference: { readonly x: number; readonly y: number; readonly expected: readonly number[]; readonly actual: readonly number[] } | null; readonly maxChannelError: number; readonly expected: DecodedTexture | null; readonly error: string | null };

/** Decode PNG bytes through core's public image reader and compare exact RGBA pixels. */
export function comparePngPixels(actualPng: Uint8Array, expectedPng: Uint8Array): PixelComparison {
  const actual = decodeTexture(actualPng, "actual.png");
  if (!actual.ok) return { equal: false, firstDifference: null, maxChannelError: 0, expected: null, error: actual.error.message };
  return compareRgbaWithPng(actual.value, expectedPng);
}

/** Compare decoded RGBA pixels with the decoded pixels of `expectedPng`, exactly. */
export function compareRgbaWithPng(actual: DecodedTexture, expectedPng: Uint8Array): PixelComparison {
  const expected = decodeTexture(expectedPng, "expected.png");
  if (!expected.ok) return { equal: false, firstDifference: null, maxChannelError: 0, expected: null, error: expected.error.message };
  if (actual.w !== expected.value.w || actual.h !== expected.value.h) return { equal: false, firstDifference: { x: 0, y: 0, expected: [expected.value.w, expected.value.h], actual: [actual.w, actual.h] }, maxChannelError: 255, expected: expected.value, error: null };
  let maximum = 0;
  let first: PixelComparison["firstDifference"] = null;
  for (let i = 0; i < actual.rgba.length; i += 1) {
    const error = Math.abs((actual.rgba[i] ?? 0) - (expected.value.rgba[i] ?? 0));
    maximum = Math.max(maximum, error);
    if (error !== 0 && first === null) {
      const pixel = Math.floor(i / 4);
      first = { x: pixel % actual.w, y: Math.floor(pixel / actual.w), expected: Array.from(expected.value.rgba.subarray(pixel * 4, pixel * 4 + 4)), actual: Array.from(actual.rgba.subarray(pixel * 4, pixel * 4 + 4)) };
    }
  }
  return { equal: first === null, firstDifference: first, maxChannelError: maximum, expected: expected.value, error: null };
}
