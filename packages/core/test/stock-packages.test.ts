import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TextEncoder } from "node:util";
import {
  assetKey,
  COMPILER_VERSION,
  createAssetIndex,
  createEmptyBoard,
  createEmptyMainFile,
  createEngine,
  PACKAGE_ROOT,
  writeBoard,
  writeMainFile,
} from "../src/index.ts";
import { resolveManifestPlugins } from "../src/engine/boot.ts";
import type { BuiltinSpec } from "../src/script/builtins.ts";
import type { AssetIndex, Engine, EngineInit, GameState, PackageCatalogueEntry } from "../src/index.ts";

type Files = Map<string, Uint8Array>;
type StockManifest = {
  readonly name: string;
  readonly version: string;
  readonly namespace: string;
  readonly requests: PackageCatalogueEntry["requests"];
  readonly program: string;
};

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "..", "..", "..");

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: { readonly message: string } }): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function stockPackage(name: string): { readonly manifest: StockManifest; readonly source: string } {
  const folder = join(repoRoot, "stock", name);
  const manifest = JSON.parse(readFileSync(join(folder, "manifest.json"), "utf8")) as StockManifest;
  return { manifest, source: readFileSync(join(folder, manifest.program), "utf8") };
}

const STOCK_BATTLE_FIGHTENEMY: BuiltinSpec = {
  name: "fightenemy",
  aliases: [],
  params: [{ name: "args", optional: true, byRef: false, variadic: true }],
  call: () => ({ value: null }),
};

function packageCatalogue(): readonly PackageCatalogueEntry[] {
  return [stockPackage("stock_battle"), stockPackage("stock_menu")].map(({ manifest, source }) => ({
    name: manifest.name,
    version: manifest.version,
    namespace: manifest.namespace,
    requests: manifest.requests,
    definition: {
      id: manifest.name,
      version: manifest.version,
      commands: manifest.name === "stock_battle" ? [STOCK_BATTLE_FIGHTENEMY] : [],
    },
    startup: { kind: "inline", text: source, compiler: COMPILER_VERSION, dialect: "tk3" },
  }));
}

function boardBytes(): Uint8Array {
  const empty = createEmptyBoard();
  return unwrap(writeBoard({
    ...empty,
    sizeX: 40,
    sizeY: 30,
    sizeL: 1,
    tileMatrix: Array.from({ length: 40 * 30 }, () => 0),
    tileRuns: [{ lutIndex: 0, count: 40 * 30, marker: true }],
    layerTitles: ["", ""],
    properties: { ...empty.properties, start: { x: 64, y: 64, layer: 1 } },
  }));
}

function authoredGame(packagePlugins: readonly string[] = ["stock_battle", "stock_menu"]): { readonly files: Files; readonly index: AssetIndex; readonly main: string } {
  const files: Files = new Map();
  const paths = ["main.gam", "Boards/start.brd", "Chrs/hero.tem", "Prg/start.prg"];
  const main = {
    ...createEmptyMainFile(),
    major: 2,
    minor: 9,
    startupPrg: "start.prg",
    initBoard: "start.brd",
    initChar: "hero.tem",
    packagePlugins,
  };
  files.set(assetKey("main.gam"), unwrap(writeMainFile(main)));
  files.set(assetKey("boards/start.brd"), boardBytes());
  files.set(assetKey("chrs/hero.tem"), new Uint8Array([0]));
  files.set(assetKey("prg/start.prg"), new TextEncoder().encode('fight(1, "")\nfightenemy("slime", "")\nfightenemy("slime", "bat", "")\ninternalmenu(1)\nended = 1\nend()\n'));
  return { files, index: createAssetIndex(paths), main: "main.gam" };
}

type Started = { readonly options: Pick<EngineInit, "phaseRegistrations">; state(): GameState };
function startDoubles(): Started {
  let latest: GameState | null = null;
  return {
    options: { phaseRegistrations: [{ phase: "audio", run: (state) => { latest = state; } }] },
    state: () => {
      if (latest === null) throw new Error("the engine has not advanced");
      return latest;
    },
  };
}

function run(engine: Engine, files: Files, doubles: Started): { readonly diagnostics: readonly { readonly code: string; readonly message: string }[] } {
  let replies = [] as { readonly tick: number; readonly event: { readonly kind: "asset"; readonly reqId: number; readonly bytes: Uint8Array | null } }[];
  const diagnostics: { readonly code: string; readonly message: string }[] = [];
  for (let guard = 0; guard < 100; guard += 1) {
    const report = engine.advance(20, replies);
    replies = [];
    diagnostics.push(...report.diagnostics);
    if (report.loading) {
      replies = report.requests.flatMap((request) => request.kind === "asset"
        ? [{ tick: report.tickAfter, event: { kind: "asset" as const, reqId: request.reqId, bytes: files.get(request.key) ?? null } }]
        : []);
      continue;
    }
    if (doubles.state().vm.globals.ended === 1) return { diagnostics };
  }
  throw new Error("the headless host did not settle");
}

test("stock packages load through the .gam list and keep the no-plugin behavior", () => {
  const catalogue = packageCatalogue();
  const resolved = resolveManifestPlugins(
    catalogue.map((entry) => ({
      id: entry.name,
      version: entry.version,
      ...(entry.namespace === undefined ? {} : { namespace: entry.namespace }),
      requests: entry.requests,
    })),
    "main.gam",
    catalogue,
  );
  equal(resolved.diagnostics.length, 0);
  deepEqual(resolved.plugins.map((plugin) => plugin.package), [
    { name: "stock_battle", version: "1.0.0", namespace: "stock_battle", requests: [] },
    { name: "stock_menu", version: "1.0.0", namespace: "stock_menu", requests: [] },
  ]);
  const game = authoredGame();
  const doubles = startDoubles();
  const engine = createEngine({
    seed: 11,
    assetIndex: game.index,
    assetRoot: PACKAGE_ROOT,
    mainFile: game.main,
    startup: { presence: { hasPlayer: () => true }, savedGame: { load: () => ({ kind: "missing" }), restored: () => false } },
    width: 320,
    height: 240,
    maxTicks: 600,
    packageCatalogue: catalogue,
    ...doubles.options,
  });
  const result = run(engine, game.files, doubles);
  equal(result.diagnostics.some((diagnostic) => diagnostic.code === "plugin.unresolved"), false);
  equal(result.diagnostics.some((diagnostic) => diagnostic.code.startsWith("package.startup-")), false);
  equal(doubles.state().vm.globals.ended, 1);
});

test("without stock packages, battle ends and the menu command does nothing", () => {
  const game = authoredGame([]);
  const doubles = startDoubles();
  const engine = createEngine({
    seed: 11,
    assetIndex: game.index,
    assetRoot: PACKAGE_ROOT,
    mainFile: game.main,
    startup: { presence: { hasPlayer: () => true }, savedGame: { load: () => ({ kind: "missing" }), restored: () => false } },
    width: 320,
    height: 240,
    maxTicks: 600,
    packageCatalogue: packageCatalogue(),
    ...doubles.options,
  });
  const result = run(engine, game.files, doubles);
  equal(result.diagnostics.length, 0);
  equal(doubles.state().vm.globals.ended, 1);
});
