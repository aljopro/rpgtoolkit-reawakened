import { equal, throws } from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
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
  buildFetchedCorpus,
  compareScriptsGolden,
  formatScriptsGolden,
  runAllCorpusPrograms,
  runCorpusProgram,
  runFetchedCorpus,
  verifyCatalogueCompleteness,
  type FetchedGameFiles,
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

test("verifyCatalogueCompleteness: all legacy and Reawakened catalogue names resolve", () => {
  const names = loadCatalogueNames();
  equal(names.length, 283);
  const mapped = loadMappedTk2Commands();
  const summary = verifyCatalogueCompleteness(names, mapped);
  equal(summary.catalogueCount, 283);
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

test("corpus: all 20 programs run to completion and pass random-step snapshot restore", () => {
  const programs = buildCorpus();
  equal(programs.length, 20);

  const results = runAllCorpusPrograms(42);
  equal(results.length, 20);

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

test("corpus: whole fetched corpus suite over fixtures/legacy runs all 10 programs headlessly with scripted inputs", () => {
  const fixturesRoot = join(REPO_ROOT, "fixtures", "legacy");
  if (!existsSync(fixturesRoot)) return; // skip only if fixtures not fetched locally

  const demoPrg = join(fixturesRoot, "demo", "Prg");
  const basicPrg = join(fixturesRoot, "Basic", "Prg");
  const demoFiles: Record<string, Uint8Array> = {};
  for (const f of readdirSync(demoPrg).sort()) {
    if (f.endsWith(".prg")) demoFiles[f] = readFileSync(join(demoPrg, f));
  }
  const basicFiles: Record<string, Uint8Array> = {};
  for (const f of readdirSync(basicPrg).sort()) {
    if (f.endsWith(".prg")) basicFiles[f] = readFileSync(join(basicPrg, f));
  }

  const fetchedCorpus: FetchedGameFiles = { demo: demoFiles, basic: basicFiles };
  const results = runFetchedCorpus(fetchedCorpus, 0);
  equal(results.length, 10);

  const expectedHashes: Record<string, string> = {
    "sample-start-demo": "cf1eff002a295c51",
    "sample-system-demo": "77ea790a87e7819d",
    "sample-sys-test-demo": "77ea790a87e7819d",
    "sample-win-demo": "4e036c0c50414d2b",
    "sample-oldman-demo": "f1521276019371da",
    "sample-man-demo": "4592a1b263387977",
    "sample-man-wander-demo": "81a9b1dcf6cefe3a",
    "sample-start-basic": "162494f8ee551f3e",
    "sample-system-basic": "77ea790a87e7819d",
    "sample-wander-basic": "21bdb6f1b785d878",
  };

  for (const res of results) {
    equal(res.stateHash, expectedHashes[res.id], `hash mismatch for ${res.id}`);
  }
});

test("corpus: defined finish line for programs that never end (Basic/Prg/wander.prg)", () => {
  const programs = buildCorpus();
  const wander = programs.find((p) => p.id === "sample-wander-basic");
  if (!wander) throw new Error("sample-wander-basic missing");

  equal(wander.ticks, 5);
  const host1 = wander.createHost(0);
  for (let i = 0; i < 5; i++) host1.advance(1, []);
  const hash1 = host1.stateHash();

  const host2 = wander.createHost(0);
  for (let i = 0; i < 5; i++) host2.advance(1, []);
  const hash2 = host2.stateHash();

  equal(hash1, hash2);
  equal(hash1, "21bdb6f1b785d878");

  for (let split = 0; split <= 5; split++) {
    const fresh = wander.createHost(0);
    for (let t = 0; t < split; t++) fresh.advance(1, []);
    const snap = fresh.snapshot();
    const restored = wander.restoreHost(snap);
    checkSnapshotRestore({ fresh, fromSnapshot: restored }, { ticks: 5 - split, split });
    equal(fresh.stateHash(), hash1);
    equal(restored.stateHash(), hash1);
  }
});

test("corpus: man_wander.prg transfers control to man.prg via run() and completes headlessly", () => {
  const programs = buildCorpus();
  const manWander = programs.find((p) => p.id === "sample-man-wander-demo");
  if (!manWander) throw new Error("sample-man-wander-demo missing");

  const host = manWander.createHost(0);
  equal(host.state().vm.threads[0]?.status, "ready");
  host.advance(1, []); // tick 0 -> itemPath movement wait
  equal(host.state().vm.threads[0]?.wait?.kind, "movement");
  host.advance(1, []); // tick 1 -> intercept, run("man.prg") yields
  equal(host.state().vm.threads[0]?.status, "ready");
  const prog = host.state().vm.threads[0]?.frames[0]?.program;
  equal(prog?.kind === "file" ? prog.path : undefined, "man.prg");
  host.advance(1, []); // tick 2 -> man.prg runs, waits on input.key
  equal(host.state().vm.threads[0]?.wait?.kind, "input.key");
  host.advance(1, manWander.inputsForTick ? manWander.inputsForTick(3) : []); // tick 3 -> ENTER completes wait() and program
  equal(host.state().vm.threads[0]?.status, "finished");
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
