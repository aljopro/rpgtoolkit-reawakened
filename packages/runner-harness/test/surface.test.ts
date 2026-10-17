import { deepEqual } from "node:assert/strict";
import { test } from "node:test";
import * as harness from "../src/index.ts";

test("runner-harness public surface matches the pinned export list with no double", () => {
  const actualExports = Object.keys(harness).sort();
  const pinnedExports = [
    "buildCorpus",
    "buildFetchedCorpus",
    "checkSceneGolden",
    "checkSnapshotRestore",
    "checkVectors",
    "compareGolden",
    "comparePngPixels",
    "compareScriptsGolden",
    "createMemoryLoader",
    "createNullAudio",
    "createScriptHost",
    "encodeRgbaPng",
    "formatGolden",
    "formatScriptsGolden",
    "goldenJob",
    "parseGolden",
    "parseRun",
    "randomSplit",
    "resolvePluginManifest",
    "restoreScriptHost",
    "runAllCorpusPrograms",
    "runCorpusProgram",
    "runFetchedCorpus",
    "runLog",
    "runTracerScene",
    "verifyCatalogueCompleteness",
  ].sort();

  deepEqual(actualExports, pinnedExports);
});
