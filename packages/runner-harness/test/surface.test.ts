import { deepEqual } from "node:assert/strict";
import { test } from "node:test";
import * as harness from "../src/index.ts";

test("runner-harness public surface matches the pinned export list with no double", () => {
  const actualExports = Object.keys(harness).sort();
  const pinnedExports = [
    "checkSnapshotRestore",
    "checkVectors",
    "compareGolden",
    "createNullAudio",
    "createScriptHost",
    "formatGolden",
    "goldenJob",
    "parseGolden",
    "parseRun",
    "randomSplit",
    "resolvePluginManifest",
    "restoreScriptHost",
    "runLog",
  ].sort();

  deepEqual(actualExports, pinnedExports);
});
