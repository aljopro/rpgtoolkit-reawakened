import { deepEqual } from "node:assert/strict";
import { test } from "node:test";
import * as harness from "../src/index.ts";

test("runner-harness public surface matches the pinned export list with no double", () => {
  const actualExports = Object.keys(harness).sort();
  const pinnedExports = [
    "checkVectors",
    "compareGolden",
    "createNullAudio",
    "formatGolden",
    "goldenJob",
    "parseGolden",
    "parseRun",
    "runLog",
  ].sort();

  deepEqual(actualExports, pinnedExports);
});
