import { equal, throws } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  assetKey,
  createAssetIndex,
  createGameState,
  createScriptServices,
  fileProgramRef,
  PACKAGE_ROOT,
  utf8Encode,
  CORE_PLUGIN,
  CATALOGUE_PLUGIN,
  type ProgramLoader,
} from "@tk-reawakened/core";
import { TK2_COMPAT_PLUGIN } from "@tk-reawakened/plugin-tk2-compat";
import {
  buildCorpus,
  compareScriptsGolden,
  formatScriptsGolden,
  runAllCorpusPrograms,
  runCorpusProgram,
  verifyCatalogueCompleteness,
} from "../src/corpus.ts";
import { checkSnapshotRestore } from "../src/restore-check.ts";
import { createScriptHost, restoreScriptHost } from "../src/script-host.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");

function loadCatalogueNames(): readonly string[] {
  const jsonPath = join(
    REPO_ROOT,
    "_bmad-output",
    "initiative-rpgtoolkit-reawakened",
    "epic-rpgcode-vm",
    "discovery",
    "command-effect-catalogue.json",
  );
  const raw = readFileSync(jsonPath, "utf8");
  const parsed = JSON.parse(raw) as { names: readonly { name: string }[] };
  return parsed.names.map((n) => n.name);
}

function loadMappedTk2Commands(): readonly { name: string; mapsTo?: string }[] {
  const csvPath = join(
    REPO_ROOT,
    "_bmad-output",
    "initiative-rpgtoolkit-reawakened",
    "epic-rpgcode-vm",
    "discovery",
    "tk2-rpgcode-commands.csv",
  );
  const raw = readFileSync(csvPath, "utf8");
  const lines = raw.trim().split("\n");
  const result: { name: string; mapsTo?: string }[] = [];
  for (const line of lines.slice(1)) {
    const parts = line.split(",");
    const name = parts[0]?.trim();
    const mapsTo = parts[3]?.trim();
    const cls = parts[4]?.trim();
    if (cls === "mapped" && name) {
      result.push({ name, ...(mapsTo ? { mapsTo } : {}) });
    }
  }
  return result;
}

test("verifyCatalogueCompleteness: all 282 catalogue names resolve", () => {
  const names = loadCatalogueNames();
  equal(names.length, 282);
  const mapped = loadMappedTk2Commands();
  const summary = verifyCatalogueCompleteness(names, mapped);
  equal(summary.catalogueCount, 282);
  equal(summary.mappedCount, mapped.length);
});

test("verifyCatalogueCompleteness: missing catalogue name throws with diagnostic", () => {
  const mapped = loadMappedTk2Commands();
  throws(
    () => verifyCatalogueCompleteness(["nonexistentCommandName123"], mapped),
    /Catalogue completeness failed: 1 names did not resolve: nonexistentCommandName123/,
  );
});

test("verifyCatalogueCompleteness: missing mapped TK2 command throws with diagnostic", () => {
  const names = loadCatalogueNames();
  throws(
    () => verifyCatalogueCompleteness(names, [{ name: "badCmd", mapsTo: "unmappedTargetCmd" }]),
    /TK2 mapped completeness failed: 1 commands did not resolve: badCmd -> unmappedtargetcmd/,
  );
});

test("corpus: all 14 programs run to completion and pass random-step snapshot restore", () => {
  const programs = buildCorpus();
  equal(programs.length, 14);

  const results = runAllCorpusPrograms(42);
  equal(results.length, 14);

  for (const result of results) {
    equal(typeof result.stateHash === "string" && result.stateHash.length === 16, true);
    equal(result.ticks > 0, true);
  }
});

test("corpus: start.prg runs headlessly to completion in 3 ticks with scripted input", () => {
  const programs = buildCorpus();
  const demoStart = programs.find((p) => p.id === "sample-start-demo");
  if (!demoStart) throw new Error("sample-start-demo missing");

  const host = demoStart.createHost(0);
  equal(host.state().vm.threads[0]?.status, "ready"); // tick 0 initial start
  host.advance(1, []);
  equal(host.state().vm.threads[0]?.status, "waiting"); // after cursorMapRun wait
  host.advance(1, demoStart.inputsForTick ? demoStart.inputsForTick(1) : []);
  equal(host.state().vm.threads[0]?.status, "waiting"); // after intro() wait
  host.advance(1, demoStart.inputsForTick ? demoStart.inputsForTick(2) : []);
  equal(host.state().vm.threads[0]?.status, "finished"); // after end()
});

test("corpus: synthetic-9-mismatch restarts thread from updated source with fresh frame", () => {
  const v1 = "x = 1\nsleep(1)\ny = 2\nend()\n";
  const v2 = "x = 10\ny = 20\nend()\n";

  const loader1: ProgramLoader = {
    index: createAssetIndex(["Prg/main.prg"]),
    root: PACKAGE_ROOT,
    read: (k) => (k === assetKey("Prg/main.prg") ? utf8Encode(v1) : undefined),
  };
  const loader2: ProgramLoader = {
    index: createAssetIndex(["Prg/main.prg"]),
    root: PACKAGE_ROOT,
    read: (k) => (k === assetKey("Prg/main.prg") ? utf8Encode(v2) : undefined),
  };

  const ref = fileProgramRef(loader1, "main.prg");
  const host1 = createScriptHost({ program: ref, loader: loader1, seed: 0 });
  host1.advance(1, []);
  equal(host1.state().vm.globals.x, 1);
  const snap = host1.snapshot();

  // Restore into host where loader2 holds updated source v2
  const restoredHost = restoreScriptHost(snap, { loader: loader2 });
  restoredHost.advance(1, []);
  equal(restoredHost.state().vm.globals.x, 10);
  equal(restoredHost.state().vm.globals.y, 20);
  equal(restoredHost.state().vm.threads[0]?.status, "finished");
});

test("scripts golden compare: detects hash mismatch and missing entries", () => {
  const results = runAllCorpusPrograms(0);
  const formatted = formatScriptsGolden(results);

  // Success case
  const cmpGood = compareScriptsGolden(results, formatted);
  equal(cmpGood.ok, true);

  // Mismatch case
  const mutated = formatted.replace(
    results[0]!.stateHash,
    "0000000000000000",
  );
  const cmpBad = compareScriptsGolden(results, mutated);
  equal(cmpBad.ok, false);
  if (!cmpBad.ok) {
    equal(cmpBad.message.includes("hash mismatch"), true);
  }

  // Missing entry case
  const missing = JSON.stringify({ schema: 1, programs: [] });
  const cmpMissing = compareScriptsGolden(results, missing);
  equal(cmpMissing.ok, false);
  if (!cmpMissing.ok) {
    equal(cmpMissing.message.includes("lacks entry"), true);
  }
});
