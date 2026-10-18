import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import {
  addTint,
  assetKey,
  bakeLights,
  cellTint,
  composeBoard,
  rasterizeLights,
  type WorldBoard,
  type WorldLight,
} from "../src/index.ts";

const baseBoard: WorldBoard = {
  key: assetKey("boards/shade.brd"),
  coordType: 0,
  sizeX: 2,
  sizeY: 1,
  sizeL: 2,
  gridWidth: 2,
  gridHeight: 1,
  width: 64,
  height: 32,
  background: { r: 0, g: 0, b: 0 },
  ambient: { r: 5, g: 6, b: 7 },
  shadeLayers: [{ castLayer: 2, records: [{ runCount: 1, r: 10, g: 20, b: 30 }, { runCount: 1, r: -2, g: -3, b: -4 }] }],
  layers: [
    { tiles: [{ asset: assetKey("tiles/a.tst"), tile: 1 }, { asset: assetKey("tiles/a.tst"), tile: 1 }] },
    { tiles: [{ asset: assetKey("tiles/a.tst"), tile: 1 }, { asset: assetKey("tiles/a.tst"), tile: 1 }] },
  ],
};

test("cellTint sums ambient and shade layers cast onto the selected layer", () => {
  deepEqual(cellTint(baseBoard, 1, 0, 0, { r: 1, g: 2, b: 3 }), { r: 16, g: 28, b: 40 });
  deepEqual(cellTint(baseBoard, 2, 1, 0), { r: 3, g: 3, b: 3 });
});

test("ambient and tint sums are bounded by the draw contract", () => {
  deepEqual(addTint({ r: 1000, g: -1000, b: 0 }, { r: 100, g: -100, b: 2048 }), { r: 1020, g: -1020, b: 1020 });
});

test("light rasterization supports ellipse, gradient and clipped gradient", () => {
  const colours = [{ r: -100, g: -100, b: -100 }, { r: 100, g: 100, b: 100 }];
  const ellipse: WorldLight = { layer: 99, type: 0, nodes: [{ x: 16, y: 16 }, { x: 48, y: 16 }, { x: 16, y: 48 }], colours };
  const gradient: WorldLight = { layer: 99, type: 1, nodes: [{ x: 0, y: 0 }, { x: 32, y: 0 }], colours };
  const clipped: WorldLight = { layer: 99, type: 2, nodes: [{ x: 0, y: 0 }, { x: 64, y: 0 }, { x: 0, y: 0 }, { x: 64, y: 0 }, { x: 64, y: 64 }, { x: 0, y: 64 }], colours };
  const ellipseLayer = rasterizeLights([ellipse], 2, 1);
  const gradientLayer = rasterizeLights([gradient], 2, 1);
  const clippedLayer = rasterizeLights([clipped], 2, 1);
  // (48,16) lies exactly on the ellipse boundary (round-7: excluded, so unlit).
  deepEqual(ellipseLayer.records, [{ runCount: 1, r: 100, g: 100, b: 100 }, { runCount: 1, r: 0, g: 0, b: 0 }]);
  deepEqual(gradientLayer.records, [{ runCount: 1, r: 0, g: 0, b: 0 }, { runCount: 1, r: 100, g: 100, b: 100 }]);
  deepEqual(clippedLayer.records, [{ runCount: 1, r: -50, g: -50, b: -50 }, { runCount: 1, r: 50, g: 50, b: 50 }]);
});

test("ellipse light excludes its boundary and lights strictly interior cells", () => {
  const colours = [{ r: -100, g: -100, b: -100 }, { r: 100, g: 100, b: 100 }];
  // Centre (112,80), radii 96 x 64: cell centres (208,80) and (112,16) are on the boundary; (144,80) is inside.
  const light: WorldLight = { layer: 99, type: 0, nodes: [{ x: 112, y: 80 }, { x: 208, y: 80 }, { x: 112, y: 144 }], colours };
  const layer = rasterizeLights([light], 8, 4);
  const at = (x: number, y: number) => {
    let index = y * 8 + x;
    for (const record of layer.records) {
      if (index < record.runCount) return record;
      index -= record.runCount;
    }
    throw new Error("out of range");
  };
  deepEqual(at(6, 2), { runCount: at(6, 2).runCount, r: 0, g: 0, b: 0 });
  deepEqual(at(3, 0), { runCount: at(3, 0).runCount, r: 0, g: 0, b: 0 });
  equal(at(4, 2).r !== 0, true);
});

test("bakeLights consumes source light objects into reserved shading layer zero", () => {
  const light: WorldLight = { layer: 7, type: 1, nodes: [{ x: 0, y: 0 }, { x: 64, y: 0 }], colours: [{ r: 0, g: 0, b: 0 }, { r: 10, g: 20, b: 30 }] };
  const baked = bakeLights({ ...baseBoard, lights: [light] });
  equal(baked.lights?.length, 0);
  equal(baked.shadeLayers?.at(-1)?.castLayer, 0);
});

test("composeBoard applies shading only when included", () => {
  const shaded = composeBoard({ board: baseBoard, tick: 0, camera: { x: 0, y: 0 }, viewport: { width: 64, height: 32 }, alpha: 0, include: { shading: true, images: false, sprites: false }, globalAmbient: { r: 1, g: 1, b: 1 } });
  const plain = composeBoard({ board: baseBoard, tick: 0, camera: { x: 0, y: 0 }, viewport: { width: 64, height: 32 }, alpha: 0, include: { shading: false, images: false, sprites: false }, globalAmbient: { r: 99, g: 99, b: 99 } });
  equal(shaded.commands[1]?.kind, "blit");
  equal(plain.commands[1]?.kind, "blit");
  if (shaded.commands[1]?.kind !== "blit" || plain.commands[1]?.kind !== "blit") throw new Error("expected blits");
  deepEqual(shaded.commands[1].tint, { r: 16, g: 27, b: 38 });
  deepEqual(plain.commands[1].tint, { r: 0, g: 0, b: 0 });
});
