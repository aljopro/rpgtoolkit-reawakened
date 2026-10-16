/**
 * The `dump` subcommand of the headless shell.
 *
 * ```
 * dump [--json] <path>                              # one project, human or JSON
 * dump --check <expectation.json> <games-dir>       # the corpus gate (CI)
 * dump --record <expectation.json> <games-dir>      # regenerate the expectation
 * ```
 *
 * `<path>` is an extracted project folder, a game folder, or a `.tpk`/standalone
 * EXE (see `docs/spec/formats/packaging-and-paths.md#distribution-package-this-projects-own`).
 * The exit code is 0 if and only if every data-format file parsed; a non-format
 * file is skipped, never a failure.
 *
 * `--check` is the epic's Done-when 1 as a CI gate: it re-runs the `--json`
 * report for every game named in the expectation and fails, naming the file,
 * when a digest differs — or naming the folder when the corpus holds one the
 * expectation does not. `--record` rewrites the expectation and is a deliberate
 * act, like `golden:record` (G5) — never a CI step.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PACKAGE_ROOT, type AssetResolver } from "@tk-reawakened/core";
import {
  buildExpectation,
  compareGame,
  driftLines,
  hasResidue,
  parseExpectation,
  serializeExpectation,
  toExpectationGame,
  type Expectation,
  type ExpectationGame,
} from "./expectation.ts";
import { loadRoot } from "./fs.ts";
import { buildReport, formatReport, serializeReport, type DumpReport } from "./report.ts";

/** The wrong-arguments message, kept in one place. */
const USAGE =
  "usage: dump [--json] <path> | dump --check <expectation.json> <games-dir> | dump --record <expectation.json> <games-dir>";

/** A fresh report for a path, or the located failure that stopped it loading. */
function reportOf(
  path: string,
): { readonly ok: true; readonly report: DumpReport } | { readonly ok: false; readonly message: string } {
  const loaded = loadRoot(path);
  if (!loaded.ok) {
    const error = loaded.error;
    return { ok: false, message: `${error.section} at offset ${error.offset}: ${error.message}` };
  }
  const context: AssetResolver = { index: loaded.value.index, root: PACKAGE_ROOT };
  return { ok: true, report: buildReport(loaded.value.files, context) };
}

/** `dump <path>`: the readable summary, or the JSON report, and the exit verdict. */
function dumpOne(path: string, json: boolean): number {
  const result = reportOf(path);
  if (!result.ok) {
    console.error(`dump: error: ${result.message}`);
    return 1;
  }
  if (json) {
    process.stdout.write(serializeReport(result.report));
  } else {
    for (const line of formatReport(result.report)) {
      console.log(line);
    }
  }
  return result.report.counts.failed === 0 ? 0 : 1;
}

/** `dump --check`: compare every game named in the expectation with a fresh report. */
function checkCorpus(expectationPath: string, gamesDir: string): number {
  const expectation = parseExpectation(readFileSync(expectationPath, "utf8"), expectationPath);
  const names = Object.keys(expectation.games).sort();
  if (names.length === 0) {
    console.error(`dump: ${expectationPath} names no games to check`);
    return 1;
  }
  const ignore = new Set(expectation.ignore ?? []);
  const unlisted = readdirSync(gamesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !names.includes(entry.name) && !ignore.has(entry.name))
    .map((entry) => entry.name)
    .sort();
  if (unlisted.length > 0) {
    console.error(
      `dump: check failed: ${gamesDir} holds game folder(s) the expectation does not name: ${unlisted.join(", ")}`,
    );
    return 1;
  }
  let failed = false;
  for (const name of names) {
    const expected = expectation.games[name];
    if (expected === undefined) continue;
    const result = reportOf(join(gamesDir, name));
    if (!result.ok) {
      console.error(`dump: check failed: ${name}: ${result.message}`);
      failed = true;
      continue;
    }
    const drift = driftLines(compareGame(name, expected, result.report));
    if (drift.length > 0) {
      for (const line of drift) {
        console.error(line);
      }
      failed = true;
      continue;
    }
    const { parsed, skipped } = result.report.counts;
    const failCount = Object.keys(expected.expectedFailures ?? {}).length;
    const failMsg = failCount > 0 ? `, ${failCount} expected failure(s)` : ", 0 failed";
    console.log(
      `${name}: ${parsed} parsed, ${skipped} skipped${failMsg}, ${Object.keys(expected.digests).length} digests match`,
    );
  }
  return failed ? 1 : 0;
}

/** `dump --record`: rebuild the expectation from every game folder under `gamesDir`. */
function recordCorpus(expectationPath: string, gamesDir: string): number {
  let existing: Expectation | undefined;
  if (existsSync(expectationPath)) {
    try {
      existing = parseExpectation(readFileSync(expectationPath, "utf8"), expectationPath);
    } catch {
      // Re-record without existing expectation if it was missing or unparseable.
    }
  }
  const ignore = new Set(existing?.ignore ?? []);
  const names = readdirSync(gamesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !ignore.has(entry.name))
    .map((entry) => entry.name)
    .sort();
  if (names.length === 0) {
    console.error(`dump: ${gamesDir} holds no game folders to record`);
    return 1;
  }
  const games: { [game: string]: ExpectationGame } = {};
  let digestCount = 0;
  for (const name of names) {
    const result = reportOf(join(gamesDir, name));
    if (!result.ok) {
      console.error(`dump: error: ${name}: ${result.message}`);
      return 1;
    }
    const expectedFailures = existing?.games[name]?.expectedFailures;
    const expectedResidue = existing?.games[name]?.expectedResidue;
    const unexpectedFailures = result.report.files.filter(
      (entry) => entry.status === "failed" && (expectedFailures === undefined || !(entry.path in expectedFailures)),
    );
    if (unexpectedFailures.length > 0) {
      console.error(
        `dump: refusing to record ${name}: ${unexpectedFailures.length} file(s) failed unexpectedly to parse`,
      );
      for (const entry of unexpectedFailures) {
        if (entry.status === "failed") {
          console.error(`  ${entry.path}: ${entry.error.section} at offset ${entry.error.offset}: ${entry.error.message}`);
        }
      }
      return 1;
    }
    const failedPaths = new Set(
      result.report.files.filter((entry) => entry.status === "failed").map((entry) => entry.path),
    );
    const activeFailures =
      expectedFailures === undefined
        ? undefined
        : Object.fromEntries(
            Object.entries(expectedFailures).filter(([path]) => failedPaths.has(path)),
          );
    const residuePaths = new Set(
      result.report.files
        .filter((entry) => entry.status === "parsed" && hasResidue(entry))
        .map((entry) => entry.path),
    );
    const activeResidue =
      expectedResidue === undefined
        ? undefined
        : Object.fromEntries(
            Object.entries(expectedResidue).filter(([path]) => residuePaths.has(path)),
          );
    const game = toExpectationGame(result.report, activeFailures, activeResidue);
    games[name] = game;
    digestCount += Object.keys(game.digests).length;
  }
  mkdirSync(dirname(expectationPath), { recursive: true });
  const temporary = `${expectationPath}.tmp.${process.pid}`;
  const recorded = buildExpectation(games, existing?.comment, existing?.ignore);
  writeFileSync(temporary, serializeExpectation(recorded), "utf8");
  renameSync(temporary, expectationPath);
  console.log(`dump: recorded ${names.length} game(s), ${digestCount} digests to ${expectationPath}`);
  return 0;
}

/**
 * Run the `dump` subcommand and return its exit code.
 *
 * `argv` is everything after `dump`. The caller (`main`) owns the outer
 * try/catch that turns an unexpected throw into `dump: error: …` and exit 1.
 */
export function runDump(argv: string[]): number {
  let json = false;
  let checkPath: string | undefined;
  let recordPath: string | undefined;
  const positionals: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === undefined) continue;
    if (arg === "--json") {
      json = true;
    } else if (arg === "--check" || arg === "--record") {
      const value = argv[index + 1];
      if (value === undefined) {
        console.error(`dump: ${arg} needs a file: ${USAGE}`);
        return 1;
      }
      if (arg === "--check") checkPath = value;
      else recordPath = value;
      index += 1;
    } else if (arg.startsWith("-")) {
      console.error(`dump: unknown flag: ${arg}`);
      return 1;
    } else {
      positionals.push(arg);
    }
  }

  if (checkPath !== undefined && recordPath !== undefined) {
    console.error(`dump: --check and --record cannot be combined: ${USAGE}`);
    return 1;
  }
  if (json && (checkPath !== undefined || recordPath !== undefined)) {
    console.error(`dump: --json is for a single project: ${USAGE}`);
    return 1;
  }
  if (positionals.length === 0) {
    console.error(`dump: missing path: ${USAGE}`);
    return 1;
  }
  if (positionals.length > 1) {
    console.error(`dump: unexpected argument '${positionals[1] as string}'`);
    return 1;
  }
  const target = positionals[0] as string;
  if (checkPath !== undefined) {
    return checkCorpus(checkPath, target);
  }
  if (recordPath !== undefined) {
    return recordCorpus(recordPath, target);
  }
  return dumpOne(target, json);
}
