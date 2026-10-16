// The GIF decoder of format-spec §10 (AD-28,
// docs/spec/formats/images.md#gif): synthetic and authored GIFs pin GIF87a and
// GIF89a, global and local colour tables, the four-pass interlace, the graphic
// control extension (transparency, delay, disposal 0 to 3), the LZW stream
// (clear code, end code, deferred clear at 4096 entries, the one-behind code),
// R-10's animation adoption rules, and decodeTexture's first-page-only view. The
// four committed authored fixtures (packages/core/test/fixtures/authored/gif-*.gif)
// decode to their exact documented pixels, page counts and delays. Located
// errors cover the signature, screen geometry, page geometry, missing colour
// tables, oversized allocations, sub-block boundaries, minimum code size,
// out-of-range codes, premature stream ends, and pixel count mismatches; and
// every truncation or one-byte mutation of a valid GIF returns a Result rather
// than throwing.
import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";
function ok(value: unknown): void {
  equal(Boolean(value), true);
}
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeGif, decodeTexture } from "../src/index.ts";
import type { Result } from "../src/index.ts";

/** Unwrap a result the test expects to succeed. */
function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`expected ok, got: ${result.error.message}`);
  }
  return result.value;
}

/** The RGBA of one pixel of a decoded texture or frame. */
function rgbaAt(rgba: Uint8Array, width: number, x: number, y: number): number[] {
  const at = (y * width + x) * 4;
  return [rgba[at]!, rgba[at + 1]!, rgba[at + 2]!, rgba[at + 3]!];
}

const testDir = dirname(fileURLToPath(import.meta.url));
const authored = (name: string): Uint8Array =>
  new Uint8Array(readFileSync(join(testDir, "fixtures", "authored", name)));

/** Join byte chunks end to end. */
function concat(parts: readonly Uint8Array[]): Uint8Array {
  let length = 0;
  for (const part of parts) length += part.length;
  const out = new Uint8Array(length);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

function u16(value: number): Uint8Array {
  return new Uint8Array([value & 0xff, (value >> 8) & 0xff]);
}

function ascii(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i);
  return bytes;
}

/** Encode `indices` with a deterministic LZW stream. */
function lzwStream(indices: ReadonlyArray<number>, minimum: number): Uint8Array {
  const clearCode = 1 << minimum;
  const endCode = clearCode + 1;
  const bytes: number[] = [];
  let width = minimum + 1;
  let hi = clearCode + 1;
  let overflow = clearCode << 1;
  let acc = 0;
  let bits = 0;

  const emit = (code: number): void => {
    acc |= code << bits;
    bits += width;
    while (bits >= 8) {
      bytes.push(acc & 0xff);
      acc >>>= 8;
      bits -= 8;
    }
  };
  const incHi = (): void => {
    if (hi < 4096) {
      hi += 1;
      if (hi === overflow && width < 12) {
        width += 1;
        overflow <<= 1;
      }
    }
  };

  emit(clearCode);
  if (indices.length > 0) {
    let code = indices[0]!;
    const table = new Map<number, number>();
    for (let i = 1; i < indices.length; i += 1) {
      const literal = indices[i]!;
      const key = (code << 16) | literal;
      const hit = table.get(key);
      if (hit !== undefined) {
        code = hit;
        continue;
      }
      emit(code);
      code = literal;
      incHi();
      if (hi < 4096) {
        table.set(key, hi);
      }
    }
    emit(code);
    incHi();
  }
  emit(endCode);
  if (bits > 0) bytes.push(acc & 0xff);
  return new Uint8Array(bytes);
}

function subBlocks(payload: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [];
  for (let at = 0; at < payload.length; at += 255) {
    const chunk = payload.subarray(at, at + 255);
    parts.push(new Uint8Array([chunk.length]), chunk);
  }
  parts.push(new Uint8Array([0]));
  return concat(parts);
}

function colorTable(colors: ReadonlyArray<readonly [number, number, number]>): Uint8Array {
  const bytes = new Uint8Array(colors.length * 3);
  colors.forEach(([r, g, b], i) => {
    bytes[i * 3] = r;
    bytes[i * 3 + 1] = g;
    bytes[i * 3 + 2] = b;
  });
  return bytes;
}

function tableBits(count: number): number {
  let b = 0;
  while (1 << (b + 1) < count) b += 1;
  return b;
}

interface TestPage {
  left?: number;
  top?: number;
  width: number;
  height: number;
  indices: ReadonlyArray<number>;
  minimum?: number;
  colors?: ReadonlyArray<readonly [number, number, number]>;
  interlaced?: boolean;
  disposal?: number;
  delay?: number;
  transparent?: number;
}

function buildGif(options: {
  version?: string;
  width: number;
  height: number;
  colors?: ReadonlyArray<readonly [number, number, number]>;
  background?: number;
  pages?: ReadonlyArray<TestPage>;
  trailer?: boolean;
  afterTrailer?: Uint8Array;
}): Uint8Array {
  const version = options.version ?? "GIF89a";
  const colors = options.colors;
  const hasGlobal = colors !== undefined;
  const gctBits = hasGlobal ? tableBits(colors.length) : 0;
  const screenPacked = (hasGlobal ? 0x80 : 0) | (gctBits << 4) | gctBits;

  const parts: Uint8Array[] = [
    ascii(version),
    u16(options.width),
    u16(options.height),
    new Uint8Array([screenPacked, options.background ?? 0, 0]),
  ];
  if (hasGlobal) parts.push(colorTable(colors));

  for (const page of options.pages ?? []) {
    if (page.disposal !== undefined || page.delay !== undefined || page.transparent !== undefined) {
      const disp = page.disposal ?? 0;
      const trans = page.transparent !== undefined;
      parts.push(
        new Uint8Array([0x21, 0xf9, 0x04, ((disp & 0x07) << 2) | (trans ? 0x01 : 0)]),
        u16(page.delay ?? 0),
        new Uint8Array([trans ? page.transparent! : 0, 0]),
      );
    }
    const local = page.colors !== undefined;
    const lctBits = local ? tableBits(page.colors!.length) : 0;
    const pagePacked = (local ? 0x80 : 0) | (page.interlaced ? 0x40 : 0) | lctBits;
    parts.push(
      new Uint8Array([0x2c]),
      u16(page.left ?? 0),
      u16(page.top ?? 0),
      u16(page.width),
      u16(page.height),
      new Uint8Array([pagePacked]),
    );
    if (local) parts.push(colorTable(page.colors!));

    const min = page.minimum ?? Math.max(2, (local ? lctBits : gctBits) + 1);
    parts.push(new Uint8Array([min]), subBlocks(lzwStream(page.indices, min)));
  }

  if (options.trailer !== false) parts.push(new Uint8Array([0x3b]));
  if (options.afterTrailer) parts.push(options.afterTrailer);
  return concat(parts);
}

// ------------------------------------------------------------- authored fixtures

test("the authored still GIF87a decodes to its documented pixels and 0 delay", () => {
  const gif = unwrap(decodeGif(authored("gif-still87a.gif")));
  equal(gif.w, 3);
  equal(gif.h, 2);
  equal(gif.frames.length, 1);
  equal(gif.frames[0]!.delay, 0);
  equal(gif.frames[0]!.rgba.length, 3 * 2 * 4);
  // Indices [0, 1, 2, 3, 0, 1] into colors:
  // [10, 20, 30], [40, 50, 60], [70, 80, 90], [100, 110, 120]
  deepEqual(rgbaAt(gif.frames[0]!.rgba, 3, 0, 0), [10, 20, 30, 255]);
  deepEqual(rgbaAt(gif.frames[0]!.rgba, 3, 1, 0), [40, 50, 60, 255]);
  deepEqual(rgbaAt(gif.frames[0]!.rgba, 3, 2, 0), [70, 80, 90, 255]);
  deepEqual(rgbaAt(gif.frames[0]!.rgba, 3, 0, 1), [100, 110, 120, 255]);
  deepEqual(rgbaAt(gif.frames[0]!.rgba, 3, 1, 1), [10, 20, 30, 255]);
  deepEqual(rgbaAt(gif.frames[0]!.rgba, 3, 2, 1), [40, 50, 60, 255]);
});

test("a second decode of a GIF is byte-identical and the buffer is fresh", () => {
  const bytes = authored("gif-still87a.gif");
  const first = unwrap(decodeGif(bytes));
  const second = unwrap(decodeGif(bytes));
  equal(first.frames[0]!.rgba === second.frames[0]!.rgba, false);
  deepEqual(first.frames[0]!.rgba, second.frames[0]!.rgba);
  first.frames[0]!.rgba[0] = 200;
  deepEqual(rgbaAt(second.frames[0]!.rgba, 3, 0, 0), [10, 20, 30, 255]);
});

test("decodeTexture returns the first page of a GIF", () => {
  const texture = unwrap(decodeTexture(authored("gif-anim89a.gif")));
  const gif = unwrap(decodeGif(authored("gif-anim89a.gif")));
  equal(texture.w, gif.w);
  equal(texture.h, gif.h);
  deepEqual(texture.rgba, gif.frames[0]!.rgba);
});

test("the authored animated GIF89a decodes frames, delays, sub-rectangles and disposal 2", () => {
  const gif = unwrap(decodeGif(authored("gif-anim89a.gif")));
  equal(gif.w, 4);
  equal(gif.h, 3);
  equal(gif.frames.length, 3);
  // Delays: 10 hundredths -> 0.1s, 0 -> 0s, 20 hundredths -> 0.2s
  equal(gif.frames[0]!.delay, 0.1);
  equal(gif.frames[1]!.delay, 0);
  equal(gif.frames[2]!.delay, 0.2);
  // R-10 transparent color: page 1 transparent index 1 -> GIF_COLORS[1]
  deepEqual(gif.transparent, { r: 40, g: 50, b: 60 });

  // Page 1: transparent index 1 has alpha 0 with its palette color
  deepEqual(rgbaAt(gif.frames[0]!.rgba, 4, 1, 0), [40, 50, 60, 0]);
  deepEqual(rgbaAt(gif.frames[0]!.rgba, 4, 0, 0), [10, 20, 30, 255]);

  // Page 2: 2×2 sub-rectangle at (1, 1) with local table [200, 0, 0] and [0, 200, 0]
  deepEqual(rgbaAt(gif.frames[1]!.rgba, 4, 1, 1), [200, 0, 0, 255]);
  deepEqual(rgbaAt(gif.frames[1]!.rgba, 4, 2, 1), [0, 200, 0, 255]);
  // Outside page 2's rectangle, page 1's pixels remain
  deepEqual(rgbaAt(gif.frames[1]!.rgba, 4, 0, 0), [10, 20, 30, 255]);

  // Page 2 used disposal 2 (restore to background/transparent).
  // Page 3 drew at (1, 1) with indices [1, 2, 2, 3] into global table:
  // So page 3's frame shows page 3's pixels over the restored canvas.
  deepEqual(rgbaAt(gif.frames[2]!.rgba, 4, 1, 1), [40, 50, 60, 255]);
  deepEqual(rgbaAt(gif.frames[2]!.rgba, 4, 2, 1), [70, 80, 90, 255]);
});

test("the authored interlaced GIF89a matches the same art stored non-interlaced", () => {
  const interlaced = unwrap(decodeGif(authored("gif-interlace.gif")));
  equal(interlaced.w, 5);
  equal(interlaced.h, 9);

  // Generate the exact same pixels non-interlaced
  const colors: ReadonlyArray<readonly [number, number, number]> = [
    [10, 20, 30],
    [40, 50, 60],
    [70, 80, 90],
    [100, 110, 120],
  ];
  const plainIndices: number[] = [];
  for (let y = 0; y < 9; y += 1) {
    for (let x = 0; x < 5; x += 1) {
      plainIndices.push((x * 2 + y * 3) & 3);
    }
  }
  const plainBytes = buildGif({
    width: 5,
    height: 9,
    colors,
    pages: [{ width: 5, height: 9, indices: plainIndices, interlaced: false }],
  });
  const plain = unwrap(decodeGif(plainBytes));
  deepEqual(interlaced.frames[0]!.rgba, plain.frames[0]!.rgba);
});

test("the authored full-table fixture fills the table and decodes 110 deferred-clear codes", () => {
  const gif = unwrap(decodeGif(authored("gif-table-full.gif")));
  equal(gif.w, 128);
  equal(gif.h, 64);
  equal(gif.frames.length, 1);

  // Re-generate the expected 32-bit xorshift pattern modulo 24
  let state = 49;
  for (let k = 0; k < 128 * 64; k += 1) {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    const index = state % 24;
    const grey = index * 8;
    const x = k % 128;
    const y = Math.floor(k / 128);
    deepEqual(rgbaAt(gif.frames[0]!.rgba, 128, x, y), [grey, grey, grey, 255]);
  }
});

// ------------------------------------------------------------- composition & disposal

test("disposal 3 restores the canvas as it was before the page", () => {
  const colors: ReadonlyArray<readonly [number, number, number]> = [
    [10, 10, 10],
    [20, 20, 20],
    [30, 30, 30],
    [40, 40, 40],
  ];
  const bytes = buildGif({
    width: 2,
    height: 2,
    colors,
    pages: [
      // Page 1: full 2×2, all index 1 [20, 20, 20], disposal 1
      { width: 2, height: 2, indices: [1, 1, 1, 1], disposal: 1 },
      // Page 2: 1×1 at (0, 0), index 2 [30, 30, 30], disposal 3 (restore previous)
      { left: 0, top: 0, width: 1, height: 1, indices: [2], disposal: 3 },
      // Page 3: 1×1 at (1, 1), index 3 [40, 40, 40], disposal 0
      { left: 1, top: 1, width: 1, height: 1, indices: [3], disposal: 0 },
    ],
  });
  const gif = unwrap(decodeGif(bytes));
  equal(gif.frames.length, 3);
  // Frame 2 shows page 2's modification at (0, 0)
  deepEqual(rgbaAt(gif.frames[1]!.rgba, 2, 0, 0), [30, 30, 30, 255]);
  // Frame 3 shows page 1's restored pixel at (0, 0), NOT page 2's!
  deepEqual(rgbaAt(gif.frames[2]!.rgba, 2, 0, 0), [20, 20, 20, 255]);
  deepEqual(rgbaAt(gif.frames[2]!.rgba, 2, 1, 1), [40, 40, 40, 255]);
});

test("area no page covered is transparent with RGB 0", () => {
  const colors: ReadonlyArray<readonly [number, number, number]> = [
    [100, 100, 100],
    [200, 200, 200],
  ];
  const bytes = buildGif({
    width: 4,
    height: 4,
    colors,
    pages: [
      // Page covers only (1, 1) 2×2
      { left: 1, top: 1, width: 2, height: 2, indices: [1, 1, 1, 1] },
    ],
  });
  const gif = unwrap(decodeGif(bytes));
  // Uncovered pixels outside the 2×2 are transparent with RGB 0
  deepEqual(rgbaAt(gif.frames[0]!.rgba, 4, 0, 0), [0, 0, 0, 0]);
  deepEqual(rgbaAt(gif.frames[0]!.rgba, 4, 3, 3), [0, 0, 0, 0]);
  // Covered pixels are opaque
  deepEqual(rgbaAt(gif.frames[0]!.rgba, 4, 1, 1), [200, 200, 200, 255]);
});

// ------------------------------------------------------------- R-10 transparent colour

test("R-10 transparent colour uses page 1 GCE transparent index", () => {
  const colors: ReadonlyArray<readonly [number, number, number]> = [
    [1, 2, 3],
    [0x33, 0x22, 0x11],
    [5, 6, 7],
    [8, 9, 10],
  ];
  const bytes = buildGif({
    width: 2,
    height: 1,
    colors,
    background: 2,
    pages: [{ width: 2, height: 1, indices: [0, 1], transparent: 1 }],
  });
  const gif = unwrap(decodeGif(bytes));
  deepEqual(gif.transparent, { r: 0x33, g: 0x22, b: 0x11 });
});

test("R-10 transparent colour falls back to background index in global table", () => {
  const colors: ReadonlyArray<readonly [number, number, number]> = [
    [1, 2, 3],
    [10, 20, 30],
    [50, 60, 70],
    [8, 9, 10],
  ];
  const bytes = buildGif({
    width: 2,
    height: 1,
    colors,
    background: 2,
    pages: [{ width: 2, height: 1, indices: [0, 1] }],
  });
  const gif = unwrap(decodeGif(bytes));
  deepEqual(gif.transparent, { r: 50, g: 60, b: 70 });
});

test("R-10 transparent colour falls back to magenta when background index is past table", () => {
  const colors: ReadonlyArray<readonly [number, number, number]> = [
    [1, 2, 3],
    [4, 5, 6],
  ];
  const bytes = buildGif({
    width: 2,
    height: 1,
    colors,
    background: 255, // past the 2-entry table
    pages: [{ width: 2, height: 1, indices: [0, 1] }],
  });
  const gif = unwrap(decodeGif(bytes));
  deepEqual(gif.transparent, { r: 255, g: 0, b: 255 });
});

test("R-10 transparent colour falls back to magenta when file has no global table", () => {
  const localColors: ReadonlyArray<readonly [number, number, number]> = [
    [1, 2, 3],
    [4, 5, 6],
  ];
  const bytes = buildGif({
    width: 2,
    height: 1,
    // No global table
    pages: [{ width: 2, height: 1, colors: localColors, indices: [0, 1] }],
  });
  const gif = unwrap(decodeGif(bytes));
  deepEqual(gif.transparent, { r: 255, g: 0, b: 255 });
});

// ------------------------------------------------------------- LZW edge cases

test("LZW clear code mid-stream resets table and width", () => {
  // Build a stream manually: clear, literals..., clear mid-stream, literals...
  // A clear code resets table to clear+2 and width to min+1.
  const min = 2;
  const clear = 4;
  const end = 5;
  // codes: clear(3), 0(3), 1(3), clear(3), 2(3), 3(3), end(3)
  // Indices emitted: 0, 1, 2, 3
  const bits: number[] = [];
  const pushCode = (code: number, w: number): void => {
    for (let i = 0; i < w; i += 1) bits.push((code >> i) & 1);
  };
  pushCode(clear, 3);
  pushCode(0, 3);
  pushCode(1, 3);
  pushCode(clear, 3); // mid-stream clear
  pushCode(2, 3);
  pushCode(3, 3);
  pushCode(end, 3);
  while (bits.length % 8 !== 0) bits.push(0);

  const payload = new Uint8Array(bits.length / 8);
  for (let b = 0; b < bits.length; b += 1) {
    const byteIndex = b >> 3;
    payload[byteIndex] = (payload[byteIndex] ?? 0) | (bits[b]! << (b & 7));
  }

  const colors: ReadonlyArray<readonly [number, number, number]> = [
    [1, 1, 1],
    [2, 2, 2],
    [3, 3, 3],
    [4, 4, 4],
  ];
  const gif = concat([
    ascii("GIF87a"),
    u16(2),
    u16(2),
    new Uint8Array([0x80 | 1 | (1 << 4), 0, 0]),
    colorTable(colors),
    new Uint8Array([0x2c]),
    u16(0),
    u16(0),
    u16(2),
    u16(2),
    new Uint8Array([0]),
    new Uint8Array([min]),
    subBlocks(payload),
    new Uint8Array([0x3b]),
  ]);
  const decoded = unwrap(decodeGif(gif));
  deepEqual(rgbaAt(decoded.frames[0]!.rgba, 2, 0, 0), [1, 1, 1, 255]);
  deepEqual(rgbaAt(decoded.frames[0]!.rgba, 2, 1, 0), [2, 2, 2, 255]);
  deepEqual(rgbaAt(decoded.frames[0]!.rgba, 2, 0, 1), [3, 3, 3, 255]);
  deepEqual(rgbaAt(decoded.frames[0]!.rgba, 2, 1, 1), [4, 4, 4, 255]);
});

test("the LZW one-behind code (code == nextCode) decodes correctly", () => {
  // A pattern that triggers the one-behind code: 0, 0, 0, 0, 0
  // 1. emit clear(4)
  // 2. emit 0, add (0, 0) -> 6
  // 3. emit 6 (which is nextCode at the decoder!), adds (6, 0) -> 7
  // Decodes to [0, 0, 0, 0, 0]
  const colors: ReadonlyArray<readonly [number, number, number]> = [
    [10, 20, 30],
    [40, 50, 60],
    [70, 80, 90],
    [100, 110, 120],
  ];
  const indices = [0, 0, 0, 0, 0];
  const bytes = buildGif({
    width: 5,
    height: 1,
    colors,
    pages: [{ width: 5, height: 1, indices }],
  });
  const decoded = unwrap(decodeGif(bytes));
  for (let x = 0; x < 5; x += 1) {
    deepEqual(rgbaAt(decoded.frames[0]!.rgba, 5, x, 0), [10, 20, 30, 255]);
  }
});

// ------------------------------------------------------------- extensions and trailer

test("a missing 3B trailer returns the picture with a warning", () => {
  const bytes = buildGif({
    width: 2,
    height: 1,
    colors: [
      [1, 2, 3],
      [4, 5, 6],
    ],
    pages: [{ width: 2, height: 1, indices: [0, 1] }],
    trailer: false, // walk ends right after page data
  });
  const result = decodeGif(bytes);
  equal(result.ok, true);
  if (result.ok) {
    equal(result.warnings.length, 1);
    ok(result.warnings[0]!.includes("no 3B trailer"));
    deepEqual(rgbaAt(result.value.frames[0]!.rgba, 2, 0, 0), [1, 2, 3, 255]);
  }
});

test("comment, application, plain text and unknown extensions are skipped", () => {
  const colors: ReadonlyArray<readonly [number, number, number]> = [
    [1, 2, 3],
    [4, 5, 6],
  ];
  // Inject comment (21 fe), application (21 ff), plain text (21 01) and unknown (21 42)
  const comment = concat([ascii("\x21\xfe"), subBlocks(ascii("A test comment"))]);
  const app = concat([ascii("\x21\xff"), subBlocks(ascii("NETSCAPE2.0\x01\x00\x00"))]);
  const plainText = concat([ascii("\x21\x01"), subBlocks(new Uint8Array(12))]);
  const unknown = concat([ascii("\x21\x42"), subBlocks(ascii("unknown extension"))]);

  const raw = buildGif({
    width: 2,
    height: 1,
    colors,
    pages: [{ width: 2, height: 1, indices: [0, 1] }],
  });
  // Insert extensions between screen descriptor (offset 13 + 6 = 19) and image descriptor
  const withExtensions = concat([
    raw.subarray(0, 19),
    comment,
    app,
    plainText,
    unknown,
    raw.subarray(19),
  ]);
  const decoded = unwrap(decodeGif(withExtensions));
  equal(decoded.frames.length, 1);
  deepEqual(rgbaAt(decoded.frames[0]!.rgba, 2, 0, 0), [1, 2, 3, 255]);
});

test("bytes after the trailer are ignored", () => {
  const bytes = buildGif({
    width: 2,
    height: 1,
    colors: [
      [1, 2, 3],
      [4, 5, 6],
    ],
    pages: [{ width: 2, height: 1, indices: [0, 1] }],
    afterTrailer: ascii("extra bytes that should be ignored entirely"),
  });
  const decoded = unwrap(decodeGif(bytes));
  equal(decoded.frames.length, 1);
});

// ------------------------------------------------------------- refusals (located errors)

test("wrong version GIF88a is refused at offset 0", () => {
  const bytes = buildGif({
    version: "GIF88a",
    width: 2,
    height: 1,
    colors: [
      [1, 2, 3],
      [4, 5, 6],
    ],
    pages: [{ width: 2, height: 1, indices: [0, 1] }],
  });
  const result = decodeGif(bytes);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, 0);
    equal(result.error.section, "format-spec §10");
    ok(result.error.message.includes("GIF88a"));
  }
});

test("zero-size screen is refused at offset 6", () => {
  for (const [w, h] of [
    [0, 10],
    [10, 0],
    [0, 0],
  ] as const) {
    const bytes = buildGif({
      width: w,
      height: h,
      colors: [
        [1, 2, 3],
        [4, 5, 6],
      ],
      pages: [],
    });
    const result = decodeGif(bytes);
    equal(result.ok, false);
    if (!result.ok) {
      equal(result.error.offset, 6);
      equal(result.error.section, "format-spec §10");
      ok(result.error.message.includes("both dimensions are positive"));
    }
  }
});

test("screen above 100,000,000 pixels is refused at offset 6", () => {
  // 20000 × 6000 = 120,000,000 > 100M
  const bytes = buildGif({
    width: 20000,
    height: 6000,
    colors: [
      [1, 2, 3],
      [4, 5, 6],
    ],
    pages: [],
  });
  const result = decodeGif(bytes);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, 6);
    ok(result.error.message.includes("exceeds 100000000 pixels"));
  }
});

test("zero-size page is refused at its descriptor", () => {
  const bytes = buildGif({
    width: 10,
    height: 10,
    colors: [
      [1, 2, 3],
      [4, 5, 6],
    ],
    pages: [{ width: 0, height: 5, indices: [] }],
  });
  const result = decodeGif(bytes);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, 19); // after 13-byte header+descriptor + 6-byte GCT
    ok(result.error.message.includes("both dimensions are positive"));
  }
});

test("page rectangle outside screen is refused at descriptor", () => {
  const bytes = buildGif({
    width: 10,
    height: 10,
    colors: [
      [1, 2, 3],
      [4, 5, 6],
    ],
    pages: [{ left: 8, top: 0, width: 5, height: 5, indices: new Array(25).fill(0) }],
  });
  const result = decodeGif(bytes);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, 19);
    ok(result.error.message.includes("leaves the 10×10 logical screen"));
  }
});

test("page with neither local nor global colour table is refused", () => {
  // Screen descriptor packed byte bit 7 is 0 (no global table)
  // and page packed byte bit 7 is 0 (no local table)
  const bytes = buildGif({
    width: 2,
    height: 1,
    // No global table
    pages: [{ width: 2, height: 1, indices: [0, 1] }],
  });
  const result = decodeGif(bytes);
  equal(result.ok, false);
  if (!result.ok) {
    ok(result.error.message.includes("neither a local nor a global colour table"));
  }
});

test("LZW minimum code size outside 2..8 is refused", () => {
  for (const badMin of [0, 1, 9]) {
    const bytes = buildGif({
      width: 2,
      height: 1,
      colors: [
        [1, 2, 3],
        [4, 5, 6],
      ],
      pages: [{ width: 2, height: 1, minimum: badMin, indices: [0, 1] }],
    });
    const result = decodeGif(bytes);
    equal(result.ok, false);
    if (!result.ok) {
      ok(result.error.message.includes("LZW minimum code size"));
    }
  }
});

test("code at or past next free code is a located error", () => {
  // Hand-craft a stream with an out-of-range code (e.g. 7 when nextCode is 6)
  const min = 2;
  const clear = 4;
  const bits: number[] = [];
  const pushCode = (code: number, w: number): void => {
    for (let i = 0; i < w; i += 1) bits.push((code >> i) & 1);
  };
  pushCode(clear, 3);
  pushCode(0, 3);
  pushCode(7, 3); // 7 is >= nextCode (which is 6)!
  while (bits.length % 8 !== 0) bits.push(0);

  const payload = new Uint8Array(bits.length / 8);
  for (let b = 0; b < bits.length; b += 1) {
    const byteIndex = b >> 3;
    payload[byteIndex] = (payload[byteIndex] ?? 0) | (bits[b]! << (b & 7));
  }

  const bytes = concat([
    ascii("GIF87a"),
    u16(2),
    u16(2),
    new Uint8Array([0x80 | 1 | (1 << 4), 0, 0]),
    colorTable([
      [1, 1, 1],
      [2, 2, 2],
      [3, 3, 3],
      [4, 4, 4],
    ]),
    new Uint8Array([0x2c]),
    u16(0),
    u16(0),
    u16(2),
    u16(2),
    new Uint8Array([0]),
    new Uint8Array([min]),
    subBlocks(payload),
    new Uint8Array([0x3b]),
  ]);
  const result = decodeGif(bytes);
  equal(result.ok, false);
  if (!result.ok) {
    ok(result.error.message.includes("table does not hold"));
  }
});

test("image data ending before EOI code is a located error", () => {
  // A stream with clear and literals but no EOI code
  const min = 2;
  const clear = 4;
  const bits: number[] = [];
  const pushCode = (code: number, w: number): void => {
    for (let i = 0; i < w; i += 1) bits.push((code >> i) & 1);
  };
  pushCode(clear, 3);
  pushCode(0, 3);
  while (bits.length % 8 !== 0) bits.push(0);

  const payload = new Uint8Array(bits.length / 8);
  for (let b = 0; b < bits.length; b += 1) {
    const byteIndex = b >> 3;
    payload[byteIndex] = (payload[byteIndex] ?? 0) | (bits[b]! << (b & 7));
  }

  const bytes = concat([
    ascii("GIF87a"),
    u16(2),
    u16(2),
    new Uint8Array([0x80 | 1 | (1 << 4), 0, 0]),
    colorTable([
      [1, 1, 1],
      [2, 2, 2],
      [3, 3, 3],
      [4, 4, 4],
    ]),
    new Uint8Array([0x2c]),
    u16(0),
    u16(0),
    u16(2),
    u16(2),
    new Uint8Array([0]),
    new Uint8Array([min]),
    subBlocks(payload),
    new Uint8Array([0x3b]),
  ]);
  const result = decodeGif(bytes);
  equal(result.ok, false);
  if (!result.ok) {
    ok(result.error.message.includes("ends before the end-of-information code"));
  }
});

test("wrong pixel count (fewer, then more) is refused naming both counts", () => {
  // Fewer pixels: page is 2×2 (4 pixels) but stream only emits 2 pixels
  const fewer = buildGif({
    width: 2,
    height: 2,
    colors: [
      [1, 2, 3],
      [4, 5, 6],
    ],
    pages: [{ width: 2, height: 2, indices: [0, 1] }],
  });
  const fewerResult = decodeGif(fewer);
  equal(fewerResult.ok, false);
  if (!fewerResult.ok) {
    ok(fewerResult.error.message.includes("2"));
    ok(fewerResult.error.message.includes("4"));
  }

  // More pixels: page is 2×1 (2 pixels) but stream emits 4 pixels
  const more = buildGif({
    width: 2,
    height: 1,
    colors: [
      [1, 2, 3],
      [4, 5, 6],
    ],
    pages: [{ width: 2, height: 1, indices: [0, 1, 0, 1] }],
  });
  const moreResult = decodeGif(more);
  equal(moreResult.ok, false);
  if (!moreResult.ok) {
    ok(moreResult.error.message.includes("more than the page's 2 pixels"));
  }
});

test("palette index outside table is refused", () => {
  // 2-entry table (indices 0..1 valid), but minimum code size 3 allows literal 2
  const min = 3;
  const clear = 8;
  const end = 9;
  const bits: number[] = [];
  const pushCode = (code: number, w: number): void => {
    for (let i = 0; i < w; i += 1) bits.push((code >> i) & 1);
  };
  pushCode(clear, 4);
  pushCode(2, 4); // index 2 is outside the 2-entry table!
  pushCode(end, 4);
  while (bits.length % 8 !== 0) bits.push(0);

  const payload = new Uint8Array(bits.length / 8);
  for (let b = 0; b < bits.length; b += 1) {
    const byteIndex = b >> 3;
    payload[byteIndex] = (payload[byteIndex] ?? 0) | (bits[b]! << (b & 7));
  }

  const bytes = concat([
    ascii("GIF87a"),
    u16(1),
    u16(1),
    new Uint8Array([0x80 | 0, 0, 0]), // 2-entry table
    colorTable([
      [1, 1, 1],
      [2, 2, 2],
    ]),
    new Uint8Array([0x2c]),
    u16(0),
    u16(0),
    u16(1),
    u16(1),
    new Uint8Array([0]),
    new Uint8Array([min]),
    subBlocks(payload),
    new Uint8Array([0x3b]),
  ]);
  const result = decodeGif(bytes);
  equal(result.ok, false);
  if (!result.ok) {
    ok(result.error.message.includes("outside the page's 2-entry colour table"));
  }
});

test("file with no page at all is refused at the trailer", () => {
  const bytes = buildGif({
    width: 2,
    height: 2,
    colors: [
      [1, 2, 3],
      [4, 5, 6],
    ],
    pages: [],
  });
  const result = decodeGif(bytes);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, 19); // offset of 0x3b trailer
    ok(result.error.message.includes("no image page"));
  }
});

test("sub-block declaring length past EOF is refused at length byte", () => {
  const bytes = buildGif({
    width: 2,
    height: 1,
    colors: [
      [1, 2, 3],
      [4, 5, 6],
    ],
    pages: [{ width: 2, height: 1, indices: [0, 1] }],
  });
  // Mutate sub-block length byte to 255 (which runs past the end of the file)
  const mutated = bytes.slice();
  // Image descriptor is at 19, ends at 29, minCodeSize is at 29, sub-block length is at 30
  mutated[30] = 255;
  const result = decodeGif(mutated);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, 30);
    ok(result.error.message.includes("runs past the end of the file"));
  }
});

test("GCE with block size other than 4 is refused", () => {
  const raw = buildGif({
    width: 2,
    height: 1,
    colors: [
      [1, 2, 3],
      [4, 5, 6],
    ],
    pages: [{ width: 2, height: 1, indices: [0, 1], delay: 10 }],
  });
  // GCE starts at 19 (21 f9 04 ...). Byte at 21 is block size 04.
  const mutated = raw.slice();
  mutated[21] = 5;
  const result = decodeGif(mutated);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, 21);
    ok(result.error.message.includes("block size is 5; it is always 4"));
  }
});

// ------------------------------------------------------------- robustness loops

test("every truncation and one-byte mutation of a GIF returns a Result, never throws", () => {
  const gif = authored("gif-still87a.gif");
  for (let cut = 0; cut <= gif.length; cut += 1) {
    const result = decodeGif(gif.subarray(0, cut));
    // Missing the 3B trailer (cut === gif.length - 1) is accepted with a warning;
    // shorter truncations are located errors.
    const expectedOk = cut >= gif.length - 1;
    equal(result.ok, expectedOk, `truncated to ${cut} bytes`);
    if (!result.ok) {
      equal(result.error.section, "format-spec §10", `truncated to ${cut} bytes`);
      equal(result.error.offset >= 0, true, `truncated to ${cut} bytes`);
    } else if (cut < gif.length) {
      equal(result.warnings.length, 1, "missing trailer emitted a warning");
    }
  }
  for (let at = 0; at < gif.length; at += 1) {
    const mutated = gif.slice();
    mutated[at] = mutated[at]! ^ 0xff;
    const result = decodeGif(mutated);
    if (!result.ok) {
      equal(result.error.section, "format-spec §10", `byte ${at} mutated`);
      equal(result.error.offset >= 0, true, `byte ${at} mutated`);
    }
  }
});
