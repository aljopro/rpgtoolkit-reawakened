import { deepEqual } from "node:assert/strict";
import { test } from "node:test";
import * as harness from "../src/index.ts";

test("runner-harness public surface matches the pinned export list with no double", () => {
  const actualExports = Object.keys(harness).sort();
  const pinnedExports = [
    "CLOSING_BASELINE_PATH",
    "CLOSING_PLAN_PATH",
    "buildCorpus",
    "buildFetchedCorpus",
    "checkClosingSuite",
    "checkSceneGolden",
    "checkSnapshotRestore",
    "checkVectors",
    "closingLedgerRows",
    "compareGolden",
    "comparePngPixels",
    "compareRgbaWithPng",
    "compareScriptsGolden",
    "createMemoryLoader",
    "createNullAudio",
    "createScriptHost",
    "encodeRgbaPng",
    "formatClosingBaseline",
    "formatGolden",
    "formatScriptsGolden",
    "goldenJob",
    "parseClosingPlan",
    "parseGolden",
    "parseRun",
    "randomSplit",
    "resolvePluginManifest",
    "restoreScriptHost",
    "runAllCorpusPrograms",
    "runClosingGame",
    "runClosingSuite",
    "runCorpusProgram",
    "runFetchedCorpus",
    "runLog",
    "runTracerScene",
    "verifyCatalogueCompleteness",
  ].sort();

  deepEqual(actualExports, pinnedExports);
});
