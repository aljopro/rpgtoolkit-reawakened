// The reference rasteriser (AD-4) and AD-3's pixel pipeline: key and
// format-transparent skipping on the untinted source, the one clamped tint, the
// native-alpha times command-alpha rule (format-spec §15, RND-21), the three
// blends, nearest-neighbour scaling, clipping, and a PNG that decodes back to
// the same pixels. The commands entry 2 and 6 add are refused by name.
import { equal, deepEqual } from "node:assert/strict";
import { test } from "node:test";
import {
  blitSurface,
  clampChannel,
  createSurface,
  decodeTexture,
  encodePng,
  fillSurface,
  pixelAt,
  rasteriseDrawList,
  UnsupportedRasterFeatureError,
} from "../src/index.ts";
import type { AssetKey, BlitCommand, DrawList, Rgb, Surface } from "../src/index.ts";

const KEY: Rgb = { r: 0, g: 1, b: 2 };

/** A surface from `width × height` RGBA quadruples, row-major. */
function surfaceOf(width: number, height: number, pixels: readonly (readonly number[])[]): Surface {
  const rgba = new Uint8Array(width * height * 4);
  pixels.forEach((pixel, index) => {
    rgba[index * 4] = pixel[0] ?? 0;
    rgba[index * 4 + 1] = pixel[1] ?? 0;
    rgba[index * 4 + 2] = pixel[2] ?? 0;
    rgba[index * 4 + 3] = pixel[3] ?? 255;
  });
  return { width, height, rgba };
}

/** A `blit` with AD-3's defaults, overridden per test. */
function blit(overrides: Partial<BlitCommand> = {}): BlitCommand {
  return {
    kind: "blit",
    source: { asset: "tiles/char.tst" as AssetKey, tile: 1 },
    src: { x: 0, y: 0, w: 2, h: 2 },
    dst: { x: 0, y: 0, w: 2, h: 2 },
    key: null,
    tint: { r: 0, g: 0, b: 0 },
    alpha: 255,
    blend: "normal",
    iso2d: false,
    ...overrides,
  };
}

/** The `UnsupportedRasterFeatureError` a call throws, so its feature and entry can be asserted. */
function unsupported(run: () => unknown): UnsupportedRasterFeatureError {
  let caught: unknown;
  try {
    run();
  } catch (error) {
    caught = error;
  }
  if (!(caught instanceof UnsupportedRasterFeatureError)) {
    throw new Error(`expected an UnsupportedRasterFeatureError, got ${String(caught)}`);
  }
  return caught;
}

test("fill paints every pixel opaque and pixelAt reads them back", () => {
  const surface = createSurface(2, 2);

  fillSurface(surface, { r: 10, g: 20, b: 30 });

  deepEqual(pixelAt(surface, 0, 0), { r: 10, g: 20, b: 30, a: 255 });
  deepEqual(pixelAt(surface, 1, 1), { r: 10, g: 20, b: 30, a: 255 });
  equal(pixelAt(surface, 2, 0), null);
  equal(pixelAt(surface, 0, -1), null);
});

test("a keyed blit skips the key and a format-transparent pixel and copies the rest", () => {
  const source = surfaceOf(2, 1, [
    [0, 1, 2, 255], // the tileset key (RND-A1)
    [9, 9, 9, 0], // format-transparent: alpha 0
  ]);
  const target = surfaceOf(2, 1, [
    [1, 1, 1, 255],
    [1, 1, 1, 255],
  ]);

  blitSurface(target, blit({ src: { x: 0, y: 0, w: 2, h: 1 }, dst: { x: 0, y: 0, w: 2, h: 1 }, key: KEY }), source);

  deepEqual(pixelAt(target, 0, 0), { r: 1, g: 1, b: 1, a: 255 });
  deepEqual(pixelAt(target, 1, 0), { r: 1, g: 1, b: 1, a: 255 });
});

test("the tint is clamped once and the key is judged on the untinted source", () => {
  const source = surfaceOf(1, 1, [[200, 100, 5, 255]]);
  const target = createSurface(1, 1);

  blitSurface(target, blit({ src: { x: 0, y: 0, w: 1, h: 1 }, dst: { x: 0, y: 0, w: 1, h: 1 }, tint: { r: 100, g: -50, b: -10 } }), source);

  deepEqual(pixelAt(target, 0, 0), { r: 255, g: 50, b: 0, a: 255 });

  // 100 + 100 would be a key candidate only if the key were tested after the
  // tint; on the untinted source it is not the key, so it draws.
  const keyed = createSurface(1, 1);
  blitSurface(keyed, blit({ src: { x: 0, y: 0, w: 1, h: 1 }, dst: { x: 0, y: 0, w: 1, h: 1 }, key: { r: 244, g: 100, b: 5 }, tint: { r: 100, g: 0, b: 0 } }), source);
  deepEqual(pixelAt(keyed, 0, 0), { r: 255, g: 100, b: 5, a: 255 });
});

test("the source's own alpha multiplies the command alpha (RND-21)", () => {
  const source = surfaceOf(1, 1, [[10, 20, 30, 128]]);
  const target = createSurface(1, 1);

  blitSurface(target, blit({ src: { x: 0, y: 0, w: 1, h: 1 }, dst: { x: 0, y: 0, w: 1, h: 1 }, alpha: 255 }), source);

  equal(pixelAt(target, 0, 0)?.a, 128);

  const half = createSurface(1, 1);
  blitSurface(half, blit({ src: { x: 0, y: 0, w: 1, h: 1 }, dst: { x: 0, y: 0, w: 1, h: 1 }, alpha: 128 }), source);
  equal(pixelAt(half, 0, 0)?.a, Math.floor((128 * 128 + 127) / 255));
});

test("translucent and additive blends follow AD-3's integer formulas", () => {
  const source = surfaceOf(1, 1, [[255, 255, 255, 255]]);
  const translucent = surfaceOf(1, 1, [[0, 0, 0, 255]]);
  const additive = surfaceOf(1, 1, [[1, 2, 3, 255]]);

  blitSurface(translucent, blit({ src: { x: 0, y: 0, w: 1, h: 1 }, dst: { x: 0, y: 0, w: 1, h: 1 }, alpha: 128, blend: "translucent" }), source);
  blitSurface(additive, blit({ src: { x: 0, y: 0, w: 1, h: 1 }, dst: { x: 0, y: 0, w: 1, h: 1 }, alpha: 128, blend: "additive" }), source);

  const expectedTranslucent = Math.floor((0 * (255 - 128) + 255 * 128 + 127) / 255);
  equal(pixelAt(translucent, 0, 0)?.r, expectedTranslucent);
  equal(pixelAt(additive, 0, 0)?.r, Math.min(255, 1 + Math.floor((255 * 128 + 127) / 255)));
  equal(pixelAt(additive, 0, 0)?.g, Math.min(255, 2 + Math.floor((255 * 128 + 127) / 255)));
});

test("a destination outside the surface is clipped and a scaled blit repeats pixels", () => {
  const source = surfaceOf(1, 1, [[7, 8, 9, 255]]);
  const target = createSurface(3, 3);

  blitSurface(target, blit({ src: { x: 0, y: 0, w: 1, h: 1 }, dst: { x: 2, y: 2, w: 2, h: 2 } }), source);

  deepEqual(pixelAt(target, 2, 2), { r: 7, g: 8, b: 9, a: 255 });
  // (3, 3) is outside; nothing wraps.
  equal(pixelAt(target, 0, 0)?.a, 0);

  const doubled = createSurface(2, 2);
  blitSurface(doubled, blit({ src: { x: 0, y: 0, w: 1, h: 1 }, dst: { x: 0, y: 0, w: 2, h: 2 } }), source);
  deepEqual(pixelAt(doubled, 1, 1), { r: 7, g: 8, b: 9, a: 255 });
});

test("an isometric blit is refused by name until entry 3", () => {
  const error = unsupported(() =>
    blitSurface(createSurface(1, 1), blit({ iso2d: true, src: { x: 0, y: 0, w: 1, h: 1 }, dst: { x: 0, y: 0, w: 1, h: 1 } }), createSurface(1, 1)),
  );

  equal(error.feature, "blit.iso2d");
  equal(error.entry, "3");
});

test("rasteriseDrawList fills, blits what it can resolve and refuses what it cannot draw", () => {
  const texture = surfaceOf(1, 1, [[5, 6, 7, 255]]);
  const drawList: DrawList = {
    tick: 0,
    width: 2,
    height: 1,
    commands: [
      { kind: "fill", rgb: { r: 1, g: 2, b: 3 } },
      blit({ src: { x: 0, y: 0, w: 1, h: 1 }, dst: { x: 1, y: 0, w: 1, h: 1 } }),
    ],
  };

  const surface = rasteriseDrawList(drawList, () => texture);

  deepEqual(pixelAt(surface, 0, 0), { r: 1, g: 2, b: 3, a: 255 });
  deepEqual(pixelAt(surface, 1, 0), { r: 5, g: 6, b: 7, a: 255 });

  const missing = rasteriseDrawList(drawList, () => null);
  deepEqual(pixelAt(missing, 1, 0), { r: 1, g: 2, b: 3, a: 255 });

  const withLine: DrawList = {
    tick: 0,
    width: 2,
    height: 1,
    commands: [{ kind: "line", x1: 0, y1: 0, x2: 1, y2: 0, rgb: { r: 0, g: 0, b: 0 } }],
  };
  equal(unsupported(() => rasteriseDrawList(withLine, () => null)).entry, "2");
});

test("clampChannel holds a channel inside a byte", () => {
  equal(clampChannel(-1), 0);
  equal(clampChannel(0), 0);
  equal(clampChannel(254.7), 254);
  equal(clampChannel(255), 255);
  equal(clampChannel(300), 255);
});

test("encodePng writes a PNG that decodes back to the same pixels, byte-for-byte", () => {
  const surface = surfaceOf(2, 2, [
    [10, 20, 30, 255],
    [40, 50, 60, 128],
    [70, 80, 90, 0],
    [1, 2, 3, 255],
  ]);

  const first = encodePng(surface);
  const second = encodePng(surface);

  deepEqual(first, second);
  // The 8-byte PNG signature, then an `IHDR` chunk: this is a real PNG, not a
  // private format.
  deepEqual(Array.from(first.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
  equal(String.fromCharCode(...first.subarray(12, 16)), "IHDR");

  const decoded = decodeTexture(first, "golden.png");
  if (!decoded.ok) {
    throw new Error(`expected the encoded PNG to decode, got: ${decoded.error.message}`);
  }
  equal(decoded.value.w, 2);
  equal(decoded.value.h, 2);
  deepEqual(Array.from(decoded.value.rgba), Array.from(surface.rgba));
});
