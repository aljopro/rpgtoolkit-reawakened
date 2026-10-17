import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import { assetKey, rasterize } from "../src/index.ts";

test("normal RGBA blits preserve source order and color-key alpha deterministically", () => {
  const key = assetKey("tiles/tiny.tst");
  const drawList = { tick: 0, width: 2, height: 1, commands: [
    { kind: "fill" as const, rgb: { r: 0, g: 0, b: 0 } },
    { kind: "blit" as const, source: { asset: key, tile: 1 }, src: { x: 0, y: 0, w: 2, h: 1 }, dst: { x: 0, y: 0, w: 2, h: 1 }, key: { r: 0, g: 1, b: 2 }, tint: { r: 0, g: 0, b: 0 }, alpha: 255, blend: "normal" as const, iso2d: false },
  ] };
  const texture = { w: 2, h: 1, rgba: new Uint8Array([0, 1, 2, 255, 7, 8, 9, 255]) };
  const first = rasterize(drawList, new Map([[key, texture]]));
  const second = rasterize(drawList, new Map([[key, texture]]));
  equal(first.error, null);
  deepEqual(first.rgba, second.rgba);
  deepEqual(first.rgba, new Uint8Array([0, 0, 0, 255, 7, 8, 9, 255]));
});
