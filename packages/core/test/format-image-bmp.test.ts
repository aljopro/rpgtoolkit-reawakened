// The Windows bitmap decoder of docs/spec/formats/images.md#the-shared-decode-contract (AD-28,
// docs/spec/formats/images.md#windows-bitmap-bmp): synthetic bitmaps built byte
// by byte pin the 1/4/8/24/32-bit BI_RGB paths, the 4-byte-padded stride, the
// bottom-up and top-down row orders, the palette and its declared count, 32-bit
// alpha of 255, and the RLE8 escapes. The three committed authored bitmaps
// (packages/core/test/fixtures/authored/bmp-*.bmp, written from the same doc by
// tools/fixtures/author/generate.mjs) decode to their exact pixels. Located
// errors cover the signature, the DIB header size, a zero dimension, the plane
// count, the bit count, the compression, an oversized image, a pixel array past
// the end of the file, a short palette and an out-of-range palette index, and
// every truncation or one-byte change of a valid bitmap comes back as a Result
// rather than a throw.
import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeTexture } from "../src/index.ts";
import type { Result } from "../src/index.ts";

/** Unwrap a result the test expects to succeed. */
function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`expected ok, got: ${result.error.message}`);
  }
  return result.value;
}

/** The RGBA of one pixel of a decoded texture. */
function rgbaAt(rgba: Uint8Array, width: number, x: number, y: number): number[] {
  const at = (y * width + x) * 4;
  return [rgba[at]!, rgba[at + 1]!, rgba[at + 2]!, rgba[at + 3]!];
}

/**
 * A hand-built Windows bitmap, the same layout
 * docs/spec/formats/images.md#the-windows-bitmap-layout states: the 14-byte file
 * header, the 40-byte DIB header, the palette, then `pixels` exactly as stored.
 */
function bmpFile(options: {
  width: number;
  height: number;
  bits: number;
  compression?: number;
  clrUsed?: number;
  palette?: ReadonlyArray<readonly [number, number, number]>;
  pixels: Uint8Array;
}): Uint8Array {
  const { width, height, bits, compression = 0, palette = [], pixels } = options;
  const clrUsed = options.clrUsed ?? palette.length;
  const offBits = 54 + palette.length * 4;
  const bytes = new Uint8Array(offBits + pixels.length);
  const view = new DataView(bytes.buffer);
  bytes[0] = 0x42;
  bytes[1] = 0x4d;
  view.setInt32(2, bytes.length, true); // bfSize
  view.setInt32(10, offBits, true); // bfOffBits
  view.setInt32(14, 40, true); // biSize
  view.setInt32(18, width, true);
  view.setInt32(22, height, true); // positive: bottom-up
  view.setInt16(26, 1, true); // biPlanes
  view.setInt16(28, bits, true);
  view.setInt32(30, compression, true);
  view.setInt32(34, pixels.length, true); // biSizeImage
  view.setInt32(46, clrUsed, true);
  palette.forEach(([r, g, b], index) => {
    bytes[54 + index * 4] = b;
    bytes[54 + index * 4 + 1] = g;
    bytes[54 + index * 4 + 2] = r;
    bytes[54 + index * 4 + 3] = 0;
  });
  bytes.set(pixels, offBits);
  return bytes;
}

/** Pad a stored row's pixels to the 4-byte stride a bitmap requires. */
function padded(px: ReadonlyArray<number>): number[] {
  const row: number[] = [...px];
  while (row.length % 4 !== 0) {
    row.push(0);
  }
  return row;
}

const testDir = dirname(fileURLToPath(import.meta.url));
const authored = (name: string): Uint8Array =>
  new Uint8Array(readFileSync(join(testDir, "fixtures", "authored", name)));

// ------------------------------------------------------------- authored fixtures

test("the authored 24-bit bitmap decodes bottom-up with the padding skipped", () => {
  const image = unwrap(decodeTexture(authored("bmp-rgb24.bmp")));
  equal(image.w, 3);
  equal(image.h, 2);
  equal(image.rgba.length, 3 * 2 * 4);
  // The file stores the bottom row first, so the RGBA's top row is the file's
  // last stored row.
  deepEqual(rgbaAt(image.rgba, 3, 0, 0), [100, 110, 120, 255]);
  deepEqual(rgbaAt(image.rgba, 3, 2, 0), [160, 170, 180, 255]);
  deepEqual(rgbaAt(image.rgba, 3, 0, 1), [10, 20, 30, 255]);
  deepEqual(rgbaAt(image.rgba, 3, 2, 1), [70, 80, 90, 255]);
});

test("a second decode is byte-identical and the buffer is fresh", () => {
  const bytes = authored("bmp-rgb24.bmp");
  const first = unwrap(decodeTexture(bytes));
  const second = unwrap(decodeTexture(bytes));
  equal(first.rgba === second.rgba, false);
  deepEqual(first.rgba, second.rgba);
  first.rgba[0] = 200;
  deepEqual(rgbaAt(second.rgba, 3, 0, 0), [100, 110, 120, 255]);
});

test("the authored 1-bit bitmap reads two palette colours, high bit first", () => {
  const image = unwrap(decodeTexture(authored("bmp-mono1.bmp")));
  equal(image.w, 10);
  equal(image.h, 2);
  // The palette is white, black; the bottom stored row alternates 1, 0, … and
  // its first pixel is the byte's high bit.
  deepEqual(rgbaAt(image.rgba, 10, 0, 1), [0, 0, 0, 255]);
  deepEqual(rgbaAt(image.rgba, 10, 1, 1), [255, 255, 255, 255]);
  deepEqual(rgbaAt(image.rgba, 10, 0, 0), [255, 255, 255, 255]);
  deepEqual(rgbaAt(image.rgba, 10, 9, 0), [0, 0, 0, 255]);
});

test("the authored RLE8 bitmap decodes to the equivalent uncompressed image", () => {
  const rle = unwrap(decodeTexture(authored("bmp-rle8.bmp")));
  const palette = [
    [10, 20, 30],
    [200, 0, 0],
    [0, 200, 0],
    [0, 0, 200],
  ] as const;
  // The same rows, stored bottom-up with no compression.
  const plain = bmpFile({
    width: 4,
    height: 3,
    bits: 8,
    palette,
    pixels: new Uint8Array([1, 1, 1, 2, 3, 0, 3, 0, 0, 2, 2, 0]),
  });
  const expected = unwrap(decodeTexture(plain));
  deepEqual(rle.rgba, expected.rgba);
  equal(rle.w, 4);
  equal(rle.h, 3);
  // The stream paints the top two RGBA rows; the bottom keeps palette entry 0.
  deepEqual(rgbaAt(rle.rgba, 4, 0, 0), [10, 20, 30, 255]);
  deepEqual(rgbaAt(rle.rgba, 4, 0, 1), [0, 0, 200, 255]);
  deepEqual(rgbaAt(rle.rgba, 4, 1, 2), [200, 0, 0, 255]);
});

// ------------------------------------------------------------- depths and layout

test("a 4-bit bitmap reads two pixels per byte, high nibble first", () => {
  const palette = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    [10, 11, 12],
  ] as const;
  // One stored row: 0x1F is pixels 1 then 15; 15 is inside the 16-entry palette
  // a 4-bit depth addresses, even though only four are declared below.
  const image = unwrap(
    decodeTexture(
      bmpFile({
        width: 2,
        height: 1,
        bits: 4,
        clrUsed: 16,
        palette: [...palette, ...new Array(12).fill([0, 0, 0])],
        pixels: new Uint8Array(padded([0x1f])),
      }),
    ),
  );
  deepEqual(rgbaAt(image.rgba, 2, 0, 0), [4, 5, 6, 255]);
  deepEqual(rgbaAt(image.rgba, 2, 1, 0), [0, 0, 0, 255]);
});

test("a top-down bitmap copies its rows in file order", () => {
  // biHeight negative: the magnitude is the height and the first row is the top.
  const image = unwrap(
    decodeTexture(
      bmpFile({
        width: 1,
        height: -2,
        bits: 24,
        // Two stored rows of one padded 24-bit pixel each: B, G, R, pad.
        pixels: new Uint8Array([
          0x03, 0x02, 0x01, 0x00, // first stored row: RGB(1, 2, 3)
          0x06, 0x05, 0x04, 0x00, // second stored row: RGB(4, 5, 6)
        ]),
      }),
    ),
  );
  equal(image.h, 2);
  deepEqual(rgbaAt(image.rgba, 1, 0, 0), [1, 2, 3, 255]);
  deepEqual(rgbaAt(image.rgba, 1, 0, 1), [4, 5, 6, 255]);
});

test("the stride padding bytes are never read as pixels", () => {
  // Width 1 at 24 bits is 3 bytes plus one padding byte, filled with 0xAB here.
  const image = unwrap(
    decodeTexture(
      bmpFile({
        width: 1,
        height: 1,
        bits: 24,
        pixels: new Uint8Array([0x30, 0x20, 0x10, 0xab]),
      }),
    ),
  );
  deepEqual(rgbaAt(image.rgba, 1, 0, 0), [0x10, 0x20, 0x30, 255]);
});

test("a 32-bit BI_RGB bitmap is opaque, whatever its fourth byte holds", () => {
  const image = unwrap(
    decodeTexture(
      bmpFile({
        width: 1,
        height: 1,
        bits: 32,
        pixels: new Uint8Array([0x30, 0x20, 0x10, 0x00]),
      }),
    ),
  );
  deepEqual(rgbaAt(image.rgba, 1, 0, 0), [0x10, 0x20, 0x30, 255]);
});

test("an 8-bit palette is read from its declared count", () => {
  const image = unwrap(
    decodeTexture(
      bmpFile({
        width: 2,
        height: 1,
        bits: 8,
        palette: [
          [9, 9, 9],
          [8, 8, 8],
        ],
        pixels: new Uint8Array(padded([1, 0])),
      }),
    ),
  );
  deepEqual(rgbaAt(image.rgba, 2, 0, 0), [8, 8, 8, 255]);
  deepEqual(rgbaAt(image.rgba, 2, 1, 0), [9, 9, 9, 255]);
});

// ------------------------------------------------------------------- refusals

test("a wrong DIB header size is refused at offset 14", () => {
  const bytes = bmpFile({ width: 1, height: 1, bits: 24, pixels: new Uint8Array(padded([1, 2, 3])) });
  new DataView(bytes.buffer).setInt32(14, 12, true);
  const result = decodeTexture(bytes, "x.bmp");
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, 14);
    equal(result.error.section, "docs/spec/formats/images.md#the-shared-decode-contract");
    equal(result.error.message.includes("12"), true);
  }
});

test("a zero or negative width is refused at offset 18", () => {
  for (const width of [0, -3]) {
    const result = decodeTexture(bmpFile({ width, height: 1, bits: 24, pixels: new Uint8Array(3) }));
    equal(result.ok, false, `width ${width}`);
    if (!result.ok) {
      equal(result.error.offset, 18, `width ${width}`);
    }
  }
});

test("a zero height is refused at offset 22", () => {
  const result = decodeTexture(bmpFile({ width: 1, height: 0, bits: 24, pixels: new Uint8Array(0) }));
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, 22);
  }
});

test("an image above the pixel cap is refused before any allocation", () => {
  const result = decodeTexture(bmpFile({ width: 100_000, height: 1001, bits: 24, pixels: new Uint8Array(0) }));
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, 18);
    equal(result.error.message.includes("100000"), true);
    equal(result.error.message.includes("1001"), true);
  }
});

test("plane and bit counts outside the supported set are refused at their fields", () => {
  const planes = bmpFile({ width: 1, height: 1, bits: 24, pixels: new Uint8Array(padded([1, 2, 3])) });
  new DataView(planes.buffer).setInt16(26, 2, true);
  const badPlanes = decodeTexture(planes);
  equal(badPlanes.ok, false);
  if (!badPlanes.ok) {
    equal(badPlanes.error.offset, 26);
  }

  const bits = bmpFile({ width: 1, height: 1, bits: 24, pixels: new Uint8Array(padded([1, 2, 3])) });
  new DataView(bits.buffer).setInt16(28, 2, true);
  const badBits = decodeTexture(bits);
  equal(badBits.ok, false);
  if (!badBits.ok) {
    equal(badBits.error.offset, 28);
    equal(badBits.error.message.includes("2"), true);
  }
});

test("BITFIELDS and RLE4 compressions are refused at offset 30", () => {
  const bitfields = bmpFile({
    width: 1,
    height: 1,
    bits: 32,
    compression: 3,
    pixels: new Uint8Array(4),
  });
  const bad = decodeTexture(bitfields);
  equal(bad.ok, false);
  if (!bad.ok) {
    equal(bad.error.offset, 30);
    equal(bad.error.message.includes("BI_BITFIELDS"), true);
  }

  const rle4 = bmpFile({ width: 1, height: 1, bits: 8, compression: 2, palette: [[0, 0, 0]], pixels: new Uint8Array(0) });
  const badRle4 = decodeTexture(rle4);
  equal(badRle4.ok, false);
  if (!badRle4.ok) {
    equal(badRle4.error.offset, 30);
    equal(badRle4.error.message.includes("BI_RLE4"), true);
  }
});

test("an off-bits past the end of the file is refused at offset 10", () => {
  const bytes = bmpFile({ width: 1, height: 1, bits: 24, pixels: new Uint8Array(padded([1, 2, 3])) });
  new DataView(bytes.buffer).setInt32(10, 9999, true);
  const result = decodeTexture(bytes);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, 10);
    equal(result.error.message.includes("9999"), true);
  }
});

test("a pixel array that runs past the end of the file is refused at its offset", () => {
  // 4×4 at 24 bits needs a stride of 12 and 48 bytes, but only 10 are present.
  const bytes = bmpFile({ width: 4, height: 4, bits: 24, pixels: new Uint8Array(10) });
  const result = decodeTexture(bytes);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, 54);
    equal(result.error.message.includes("48"), true);
  }
});

test("a short palette is refused at the first missing entry", () => {
  // 8 bits with biClrUsed 0 needs 256 entries; the pixel array starts at 54, so
  // not one entry fits.
  const bytes = bmpFile({ width: 1, height: 1, bits: 8, clrUsed: 0, palette: [], pixels: new Uint8Array(4) });
  const result = decodeTexture(bytes);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, 54);
    equal(result.error.message.includes("256"), true);
  }
});

test("a palette index outside the declared entries is refused at the pixel", () => {
  const bytes = bmpFile({
    width: 2,
    height: 1,
    bits: 8,
    palette: [
      [1, 1, 1],
      [2, 2, 2],
    ],
    pixels: new Uint8Array(padded([0, 5])),
  });
  const result = decodeTexture(bytes);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, 54 + 2 * 4 + 1);
    equal(result.error.message.includes("5"), true);
  }
});

// ------------------------------------------------------------------ RLE8 errors

test("an RLE8 run past the row end is refused", () => {
  const bytes = bmpFile({
    width: 2,
    height: 1,
    bits: 8,
    compression: 1,
    palette: [[0, 0, 0]],
    pixels: new Uint8Array([0x03, 0x00, 0x00, 0x01]),
  });
  const result = decodeTexture(bytes);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.message.includes("crosses the row end"), true);
  }
});

test("an RLE8 delta outside the image is refused", () => {
  const bytes = bmpFile({
    width: 2,
    height: 1,
    bits: 8,
    compression: 1,
    palette: [[0, 0, 0]],
    pixels: new Uint8Array([0x00, 0x02, 0x00, 0x05, 0x00, 0x01]),
  });
  const result = decodeTexture(bytes);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.message.includes("outside the"), true);
  }
});

test("an RLE8 stream without an end-of-bitmap escape is refused", () => {
  const bytes = bmpFile({
    width: 2,
    height: 1,
    bits: 8,
    compression: 1,
    palette: [[0, 0, 0]],
    pixels: new Uint8Array([0x02, 0x00]),
  });
  const result = decodeTexture(bytes);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.message.includes("end-of-bitmap"), true);
  }
});

test("an odd absolute run with no padding byte is refused", () => {
  const bytes = bmpFile({
    width: 3,
    height: 1,
    bits: 8,
    compression: 1,
    palette: [[0, 0, 0], [1, 1, 1], [2, 2, 2], [3, 3, 3]],
    // The absolute run of 3 bytes ends the file, so its padding byte is missing.
    pixels: new Uint8Array([0x00, 0x03, 0x01, 0x02, 0x03]),
  });
  const result = decodeTexture(bytes);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.message.includes("padding"), true);
  }
});

// ------------------------------------------------------------- robustness loops

test("every truncation and one-byte change of a bitmap returns a Result", () => {
  // An asset is untrusted input: a decoder that throws takes the whole game down
  // on one corrupt file.
  const bmp = authored("bmp-rgb24.bmp");
  for (let cut = 0; cut <= bmp.length; cut += 1) {
    const result = decodeTexture(bmp.subarray(0, cut));
    equal(result.ok, cut === bmp.length, `truncated to ${cut} bytes`);
    if (!result.ok) {
      equal(result.error.section, "docs/spec/formats/images.md#the-shared-decode-contract", `truncated to ${cut} bytes`);
      equal(result.error.offset >= 0, true, `truncated to ${cut} bytes`);
    }
  }
  for (let at = 0; at < bmp.length; at += 1) {
    const mutated = bmp.slice();
    mutated[at] = mutated[at]! ^ 0xff;
    const result = decodeTexture(mutated);
    if (!result.ok) {
      equal(result.error.section, "docs/spec/formats/images.md#the-shared-decode-contract", `byte ${at} changed`);
      equal(result.error.offset >= 0, true, `byte ${at} changed`);
    }
  }
});
