// No-skips guard for the golden CI job (guard-rail G5, docs/guardrails.md).
//
//   node tools/no-skips/run.mjs [--root <dir>] [<file or glob>...]
//
// Runs `node --test` over the given patterns (default
// `packages/*/test/*.test.ts`) in `root` (default: this repository) with two
// reporters: `spec` to stdout, so the normal report prints, and `tap` to a temp
// file, so the counts and the skipped names can be read back. The golden job
// (`pnpm test:strict`) runs the whole suite after the fixtures are fetched, when
// the sample-game cases execute; a case that skipped instead of running would
// pass silently, so this guard fails the step.
//
// Exit code: 1 when the runner failed (the report already shows the failures),
// when no test ran, or when any test was skipped or left as a todo; otherwise 0
// with the totals printed.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(here, "..", "..");

const TOOL = "tools/no-skips/run.mjs";
const DEFAULT_PATTERNS = ["packages/*/test/*.test.ts"];

const SUMMARY = /^# (tests|pass|fail|cancelled|skipped|todo) (\d+)\s*$/;
const SKIP_OR_TODO = /^\s*(?:not )?ok \d+ - (.*?)\s+#\s+(SKIP|TODO)\b\s*(.*?)\s*$/;

/**
 * Reads the counts and the skipped names from TAP text. `tests`, `pass`, `fail`,
 * `cancelled`, `skipped` and `todo` come from the summary lines; `skippedNames`
 * holds `{ name, reason }` for every `# SKIP` or `# TODO` line (they may be
 * indented, for subtests).
 */
export function parseTap(text) {
  const counts = { tests: 0, pass: 0, fail: 0, cancelled: 0, skipped: 0, todo: 0, skippedNames: [] };
  for (const line of text.split(/\r?\n/)) {
    const summary = SUMMARY.exec(line);
    if (summary !== null) {
      counts[summary[1]] = Number(summary[2]);
      continue;
    }
    const marked = SKIP_OR_TODO.exec(line);
    if (marked !== null) counts.skippedNames.push({ name: marked[1], reason: marked[3] });
  }
  return counts;
}

/**
 * How many tests the run skipped or left as todo: the larger of the summary
 * count and the number of marked lines, so a change in either part of the TAP
 * text cannot hide one.
 */
export const markedCount = (counts) => Math.max(counts.skipped + counts.todo, counts.skippedNames.length);

/**
 * Runs `node --test` over `patterns` in `root` and returns `{ code, counts,
 * status }`: the guard's exit code, the parsed counts, and the runner's exit
 * status. The spec report is written to this process's stdout; nothing else is.
 * `options.env` is the environment the runner starts from (default:
 * `process.env`).
 */
export function run(root, patterns, options = {}) {
  const rootPath = resolve(root);
  const scratch = mkdtempSync(join(tmpdir(), "no-skips-"));
  const tapFile = join(scratch, "report.tap");
  try {
    const env = { ...(options.env ?? process.env) };
    // A nested `node --test` must not think it is a child of the outer runner.
    delete env.NODE_TEST_CONTEXT;
    const result = spawnSync(
      process.execPath,
      [
        "--test",
        "--test-reporter=spec",
        "--test-reporter-destination=stdout",
        "--test-reporter=tap",
        `--test-reporter-destination=${tapFile}`,
        ...patterns,
      ],
      { cwd: rootPath, env, stdio: ["ignore", "inherit", "inherit"] },
    );
    const status = result.status ?? 1;
    let text = "";
    try {
      text = readFileSync(tapFile, "utf8");
    } catch {
      text = "";
    }
    const counts = parseTap(text);
    const code = status !== 0 ? 1 : counts.tests === 0 || markedCount(counts) > 0 ? 1 : 0;
    return { code, counts, status };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

// ------------------------------------------------------------------------ CLI

function parseArguments(argv) {
  const positional = [];
  const unknown = [];
  let root;
  for (let position = 0; position < argv.length; position += 1) {
    const argument = argv[position];
    if (argument === "--root") {
      const value = argv[position + 1];
      if (value === undefined || value.startsWith("-")) throw new Error("--root needs a directory argument");
      if (root !== undefined) throw new Error("--root given more than once");
      root = resolve(value);
      position += 1;
    } else if (argument.startsWith("-")) {
      unknown.push(argument);
    } else {
      positional.push(argument);
    }
  }
  if (unknown.length > 0) throw new Error(`unknown flag(s): ${unknown.join(", ")}`);
  return { root: root ?? repoRoot, patterns: positional.length > 0 ? positional : DEFAULT_PATTERNS };
}

function main(argv) {
  let args;
  try {
    args = parseArguments(argv);
  } catch (error) {
    console.error(`${TOOL}: ${error.message}`);
    return 1;
  }

  const { code, counts, status } = run(args.root, args.patterns);
  if (status !== 0) return 1;
  if (counts.tests === 0) {
    console.error(`${TOOL}: no test ran`);
    return 1;
  }
  if (markedCount(counts) > 0) {
    console.error(
      `${TOOL}: ${markedCount(counts)} test(s) skipped or todo; the golden job must run every test`,
    );
    for (const { name, reason } of counts.skippedNames) console.error(`${name}: ${reason}`);
    return 1;
  }
  console.log(`no skipped tests: ${counts.tests} tests, ${counts.pass} passed`);
  return code;
}

/** Whether the module at `moduleUrl` is the script node was started with (symlinks resolved). */
export function isEntryPoint(moduleUrl) {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(moduleUrl));
  } catch {
    return false;
  }
}

// Only run when invoked as a script, so the tests can import it.
if (isEntryPoint(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
