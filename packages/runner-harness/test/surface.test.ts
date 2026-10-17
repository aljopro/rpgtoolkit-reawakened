import { deepEqual } from "node:assert/strict";
import { test } from "node:test";
import * as harness from "../src/index.ts";

test("runner-harness public surface matches the pinned export list with no double", () => {
  const actualExports = Object.keys(harness).sort();
  const pinnedExports = [
    "buildCorpus",
    "checkSnapshotRestore",
    "checkVectors",
    "compareGolden",
    "compareScriptsGolden",
    "createNullAudio",
    "createScriptHost",
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
    "runLog",
    "verifyCatalogueCompleteness",
  ].sort();

  deepEqual(actualExports, pinnedExports);
});
