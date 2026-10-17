import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import { decodeTexture } from "@tk-reawakened/core";
import { comparePngPixels, encodeRgbaPng } from "../src/png.ts";

test("RGBA PNG encoding is deterministic and round-trips through core's public decoder", () => {
  const image = { w: 2, h: 1, rgba: new Uint8Array([1, 2, 3, 255, 4, 5, 6, 255]) };
  const first = encodeRgbaPng(image);
  const second = encodeRgbaPng(image);
  deepEqual(first, second);
  const decoded = decodeTexture(first, "vector.png");
  if (!decoded.ok) throw new Error(decoded.error.message);
  deepEqual(decoded.value.rgba, image.rgba);
  const comparison = comparePngPixels(first, second);
  equal(comparison.equal, true);
});
