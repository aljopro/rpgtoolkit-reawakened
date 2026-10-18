import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { deflateSync } from "node:zlib";
import {
  checkClosingSuite,
  CLOSING_BASELINE_PATH,
  CLOSING_PLAN_PATH,
  closingLedgerRows,
  encodeRgbaPng,
  formatClosingBaseline,
  parseClosingPlan,
  runClosingSuite,
  type ClosingFiles,
} from "@tk-reawakened/runner-harness";

const PNG_DIRECTORY = "golden/regression/closing";
const LEDGER_PATH = "golden/ledger.json";

function readOrUndefined(path: string): string | undefined {
  return existsSync(path) ? readFileSync(path, "utf8") : undefined;
}

function writeAtomic(path: string, bytes: string | Uint8Array): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp.${process.pid}`;
  writeFileSync(temporary, bytes);
  renameSync(temporary, path);
}

/** Every file under `gameRoot`, keyed by its `/`-separated path relative to it. */
export function loadGameFiles(gameRoot: string): ClosingFiles {
  const files = new Map<string, Uint8Array>();
  for (const entry of readdirSync(gameRoot, { recursive: true, encoding: "utf8" }).map((path) => path.split("\\").join("/")).sort()) {
    const full = join(gameRoot, entry);
    if (statSync(full).isFile()) files.set(entry, new Uint8Array(readFileSync(full)));
  }
  return files;
}

type LedgerFile = { readonly schema: number; readonly goldens: readonly Readonly<Record<string, unknown>>[] };

/** The ledger in its committed one-row-per-line layout, with the closing rows replaced by `rows`. */
function formatLedger(ledgerText: string, rows: readonly Readonly<Record<string, unknown>>[]): string {
  const ledger: LedgerFile = JSON.parse(ledgerText);
  const kept = ledger.goldens.filter((row) => row.suite !== "closing");
  const line = (row: Readonly<Record<string, unknown>>): string => `    { ${Object.entries(row).map(([key, value]) => `${JSON.stringify(key)}: ${JSON.stringify(value)}`).join(", ")} }`;
  return `{\n  "schema": ${ledger.schema},\n  "goldens": [\n${[...kept, ...rows].map(line).join(",\n")}\n  ]\n}\n`;
}

/**
 * `closing [<root>] [--record]`: boot every fetched sample game through the real engine and compare frames, hashes and
 * diagnostics with the committed regression baselines (or write them with `--record`).
 */
export function runClosing(argv: string[]): number {
  try {
    let record = false;
    const positionals: string[] = [];
    for (const arg of argv) {
      if (!arg.startsWith("-")) positionals.push(arg);
      else if (arg === "--record") record = true;
      else {
        console.error(`closing: unknown flag: ${arg}`);
        return 1;
      }
    }
    if (positionals.length > 1) {
      console.error(`closing: unexpected argument '${positionals[1] as string}'`);
      return 1;
    }
    const root = positionals[0] ?? process.cwd();
    const legacy = join(root, "fixtures", "legacy");
    if (!existsSync(legacy)) {
      console.error(`closing: fixtures directory not found at '${legacy}'. Run 'pnpm fixtures:fetch' first.`);
      return 1;
    }
    const planText = readOrUndefined(join(root, CLOSING_PLAN_PATH));
    if (planText === undefined) {
      console.error(`closing: ${CLOSING_PLAN_PATH} is absent`);
      return 1;
    }
    const plan = parseClosingPlan(planText);
    const bundled = new Map<string, Uint8Array>();
    for (const folder of plan.bundled) {
      for (const [path, bytes] of loadGameFiles(join(root, folder))) bundled.set(`${folder}/${path}`, bytes);
    }
    const runs = runClosingSuite(plan, (name) => {
      const gameRoot = join(legacy, name);
      if (!existsSync(gameRoot)) throw new Error(`${name}: not found under ${legacy}; run 'pnpm fixtures:fetch'`);
      return loadGameFiles(gameRoot);
    }, bundled);
    const ledgerText = readOrUndefined(join(root, LEDGER_PATH));

    if (record) {
      if (ledgerText === undefined) throw new Error(`${LEDGER_PATH} is absent`);
      const problems = runs.flatMap((run) => run.batchProblems.map((problem) => `${run.name}: ${problem}`));
      const unexpected = plan.games.flatMap((game) => {
        const run = runs.find((candidate) => candidate.name === game.name);
        return run !== undefined && run.record.outcome !== game.expect.outcome ? [`${game.name}: outcome is ${run.record.outcome} but the plan expects ${game.expect.outcome}`] : [];
      });
      if (problems.length + unexpected.length > 0) {
        for (const problem of [...problems, ...unexpected]) console.error(`closing: ${problem}`);
        return 1;
      }
      const wanted = new Set(runs.flatMap((run) => [...run.images.keys()]));
      const directory = join(root, PNG_DIRECTORY);
      if (existsSync(directory)) for (const name of readdirSync(directory)) if (!wanted.has(`${PNG_DIRECTORY}/${name}`)) rmSync(join(directory, name));
      for (const run of runs) {
        for (const [path, image] of run.images) writeAtomic(join(root, path), encodeRgbaPng(image, (scanlines) => new Uint8Array(deflateSync(scanlines, { level: 9 }))));
      }
      writeAtomic(join(root, CLOSING_BASELINE_PATH), formatClosingBaseline(runs));
      writeAtomic(join(root, LEDGER_PATH), formatLedger(ledgerText, closingLedgerRows(runs)));
      console.log(`closing: recorded ${runs.length} games, ${wanted.size} PNGs`);
      return 0;
    }

    const result = checkClosingSuite(
      plan,
      runs,
      readOrUndefined(join(root, CLOSING_BASELINE_PATH)),
      (path) => (existsSync(join(root, path)) ? new Uint8Array(readFileSync(join(root, path))) : undefined),
      ledgerText,
    );
    for (const line of result.lines) (result.ok ? console.log : console.error)(line);
    if (!result.ok) return 1;
    const clean = runs.filter((run) => run.record.outcome === "boots").length;
    console.log(`closing: ${runs.length}/${runs.length} games match their baselines (${clean} boot clean, ${runs.length - clean} expected failures with located diagnostics; batching ${plan.batches.join("/")} identical)`);
    return 0;
  } catch (err: unknown) {
    console.error(`closing: error: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}
