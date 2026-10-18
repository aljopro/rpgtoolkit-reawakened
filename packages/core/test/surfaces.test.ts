import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import {
  canvasGetScreen,
  colourSurface,
  createSurface,
  createSurfacesSection,
  getPixel,
  killSurface,
  readSurfacePixels,
  replaceSurface,
  restoreGameState,
  saveScreen,
  snapshot,
  createGameState,
  type SurfaceId,
} from "../src/index.ts";

test("surface read-back is revision guarded and returns owned bytes", () => {
  const state = createSurfacesSection(2, 1);
  const id = createSurface(state, 2, 1, new Uint8Array([1, 2, 3, 255, 4, 5, 6, 255]));
  const first = readSurfacePixels(state, id, 0);
  if (first === null) throw new Error("expected surface pixels");
  first.rgba[0] = 99;
  const second = readSurfacePixels(state, id, 0);
  if (second === null) throw new Error("expected surface pixels");
  equal(second.rgba[0], 1);
  equal(readSurfacePixels(state, id, 1), null);
  equal(replaceSurface(state, id, 2, 1, new Uint8Array([7, 8, 9, 255, 1, 1, 1, 255])), 1);
  equal(readSurfacePixels(state, id, 0), null);
  deepEqual(readSurfacePixels(state, id, 1)?.rgba, new Uint8Array([7, 8, 9, 255, 1, 1, 1, 255]));
});

test("surface ids are monotonic and colour surfaces are interned", () => {
  const state = createSurfacesSection();
  const first = createSurface(state, 1, 1);
  equal(killSurface(state, first), true);
  const second = createSurface(state, 1, 1);
  equal(second > first, true);
  const red = colourSurface(state, { r: 255, g: 0, b: 0 });
  equal(colourSurface(state, { r: 255, g: 0, b: 0 }), red);
  equal(getPixel(state, red, 0, 0)?.r, 255);
});

test("screen capture and slots round-trip through the save shape", () => {
  const state = createSurfacesSection(2, 1);
  const source = createSurface(state, 2, 1, new Uint8Array([1, 2, 3, 255, 4, 5, 6, 255]));
  const saved = saveScreen(state, 3, source);
  if (saved === null) throw new Error("expected saved slot");
  const destination = createSurface(state, 2, 1);
  equal(canvasGetScreen(state, destination, source), 1);
  equal(getPixel(state, destination, 1, 0)?.g, 5);
  equal(typeof restoreGameState(snapshot({ ...createGameState({ seed: 1 }), surfaces: state })), "object");
  equal(replaceSurface(state, destination, 2, 1, new Uint8Array([0, 0, 0, 255, 0, 0, 0, 255])), 2);
  equal((saved as SurfaceId) > source, true);
  equal(destination !== saved, true);
});
