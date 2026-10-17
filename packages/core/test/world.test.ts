import { equal } from "node:assert/strict";
import { test } from "node:test";
import { createAssetIndex, PACKAGE_ROOT } from "../src/index.ts";
import { assetKey } from "../src/formats/resolver/resolver.ts";
import { hydrateBoard } from "../src/world/hydrate.ts";

test("hydrateBoard rejects malformed board bytes without partial world state", () => {
  const index = createAssetIndex(["Boards/village.brd", "Tiles/village.tst", "Tiles/water.tan"]);
  const result = hydrateBoard(assetKey("boards/village.brd"), new Uint8Array([0]), index, PACKAGE_ROOT, new Map());
  equal(result.value, null);
  equal(result.error !== null, true);
  equal(result.missing, null);
});
