import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import { assetKey, composeBoard, rasterize, type WorldBoard } from "../src/index.ts";

const board: WorldBoard = { key: assetKey("boards/test.brd"), coordType: 0, sizeX: 2, sizeY: 1, sizeL: 1, width: 64, height: 32, background: { r: 4, g: 5, b: 6 }, ambient: { r: 0, g: 0, b: 0 }, layers: [{ tiles: [{ asset: assetKey("tiles/test.tst"), tile: 1 }, { asset: assetKey("tiles/test.tst"), tile: 2 }] }] };

test("composeBoard emits fill then visible cells in layer/y/x order", () => {
  const list = composeBoard({ board, tick: 0, camera: { x: 0, y: 0 }, viewport: { width: 32, height: 32 }, alpha: 0, include: { shading: false, images: false, sprites: false } });
  equal(list.commands.length, 2);
  equal(list.commands[0]?.kind, "fill");
  const blit = list.commands[1];
  if (blit?.kind !== "blit") throw new Error("expected tile blit");
  deepEqual(blit.source, { asset: assetKey("tiles/test.tst"), tile: 1 });
  deepEqual(blit.key, { r: 0, g: 1, b: 2 });
  deepEqual(blit.tint, { r: 0, g: 0, b: 0 });
});

test("rasterize fills RGBA and leaves keyed source pixels transparent", () => {
  const key = assetKey("tiles/test.tst");
  const list = composeBoard({ board: { ...board, sizeX: 1, width: 32, layers: [{ tiles: [{ asset: key, tile: 1 }] }] }, tick: 0, camera: { x: 0, y: 0 }, viewport: { width: 1, height: 1 }, alpha: 0, include: { shading: false, images: false, sprites: false } });
  const pixels = new Uint8Array(32 * 32 * 4);
  pixels.set([0, 1, 2, 255], 0);
  pixels.set([9, 8, 7, 255], 4);
  const result = rasterize(list, new Map([[key, { w: 32, h: 32, rgba: pixels }]]));
  equal(result.error, null);
  deepEqual(Array.from(result.rgba), [4, 5, 6, 255]);
});
