// Fixture hygiene check (guard-rail G5 rule 4, docs/guardrails.md).
//
//   node tools/fixtures/check.mjs [root]
//
// The legacy sample games are fetched into `<root>/fixtures/` at test time and
// are never committed. This check fails when
//
//   * `root` is not the top level of a git work tree;
//   * `git ls-files` lists anything under the root `fixtures/` folder;
//   * the root `fixtures/` folder is not ignored; or
//   * the ignore rule is not anchored: `tools/fixtures/` and
//     `packages/*/test/fixtures/` hold tracked source and must stay visible.
//
// The rule it expects is `/fixtures/` in `.gitignore`. `root` defaults to this
// repository.
//
// Output (stdout): `<n> tracked files under fixtures/` and, when the ignore
// rule is right, the rule. Each problem goes to stderr as
// `tools/fixtures/check.mjs: <problem>`; the exit code is 1 when there is any.
import { resolve } from "node:path";
import {
  FixturesError,
  gitStep,
  isEntryPoint,
  repoRoot,
  requireDirectory,
  runGit,
  samePath,
} from "./fetch.mjs";

const TOOL = "tools/fixtures/check.mjs";
const RULE = "/fixtures/";

// Probe paths, tested against the ignore rules only (they need not exist).
const MUST_BE_IGNORED = "fixtures/";
const MUST_STAY_VISIBLE = ["tools/fixtures/probe", "packages/probe/test/fixtures/probe"];

// `git check-ignore -v --no-index` on `path`: `{ ignored, by }`, where `by` is
// `<source>:<line>:<pattern>` when a rule matches.
function checkIgnore(root, path, env) {
  const result = runGit(["check-ignore", "-v", "--no-index", "--", path], { cwd: root, env });
  if (result.error) {
    throw new FixturesError(`git check-ignore failed: cannot run git (${result.error.code ?? result.error.message})`);
  }
  if (result.status === 0) return { ignored: true, by: result.stdout.split("\t")[0] };
  if (result.status === 1) return { ignored: false, by: "" };
  throw new FixturesError(
    `git check-ignore failed (exit ${result.status}): ${result.stderr.trim().split(/\r?\n/)[0] ?? ""}`,
  );
}

/**
 * Checks the git work tree at `root` and returns `{ root, tracked, problems }`:
 * the tracked paths under `fixtures/` and one message per ignore-rule defect.
 * Throws a FixturesError when `root` is not the top level of a git work tree
 * or git cannot be run. `options.env` is the environment git starts from
 * (default: `process.env`).
 */
export function checkFixtures(root, options = {}) {
  const env = options.env ?? process.env;
  const rootPath = resolve(root);
  requireDirectory(rootPath);

  const probe = runGit(["rev-parse", "--show-toplevel"], { cwd: rootPath, env });
  if (probe.error) {
    throw new FixturesError(`git rev-parse failed: cannot run git (${probe.error.code ?? probe.error.message})`);
  }
  if (probe.status !== 0) {
    throw new FixturesError(`root ${rootPath} is not a git work tree (${probe.stderr.trim().split(/\r?\n/)[0]})`);
  }
  const top = probe.stdout.trim();
  if (!samePath(top, rootPath)) {
    throw new FixturesError(`root ${rootPath} is not the top level of a git work tree (the top level is ${top})`);
  }

  const listing = gitStep("git ls-files", ["ls-files", "-z", "--cached", "--", "fixtures/"], {
    cwd: rootPath,
    env,
  });
  const tracked = listing.split("\0").filter((path) => path !== "");

  const problems = [];
  if (!checkIgnore(rootPath, MUST_BE_IGNORED, env).ignored) {
    problems.push(
      `fixtures/ is not ignored: .gitignore must hold the anchored rule ${RULE}, so fetched games stay out of git`,
    );
  }
  for (const path of MUST_STAY_VISIBLE) {
    const { ignored, by } = checkIgnore(rootPath, path, env);
    if (ignored) {
      problems.push(
        `the ignore rule is not anchored: ${by} also ignores ${path}; the rule must be ${RULE}, so tracked source under tools/ and packages/ stays visible`,
      );
    }
  }
  return { root: rootPath, tracked, problems };
}

// ------------------------------------------------------------------------ CLI

function parseArguments(argv) {
  const positional = [];
  const unknown = [];
  for (const argument of argv) {
    if (argument.startsWith("-")) unknown.push(argument);
    else positional.push(argument);
  }
  if (unknown.length > 0) throw new Error(`unknown flag(s): ${unknown.join(", ")}`);
  if (positional.length > 1) {
    throw new Error(
      `expected at most one root argument, got ${positional
        .map((argument) => JSON.stringify(argument))
        .join(", ")}`,
    );
  }
  return { root: positional.length === 1 ? resolve(positional[0]) : repoRoot };
}

function main(argv) {
  let args;
  try {
    args = parseArguments(argv);
  } catch (error) {
    console.error(`${TOOL}: ${error.message}`);
    return 1;
  }

  let result;
  try {
    result = checkFixtures(args.root);
  } catch (error) {
    console.error(`${TOOL}: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  const { tracked, problems } = result;
  console.log(`${tracked.length} tracked ${tracked.length === 1 ? "file" : "files"} under fixtures/`);
  for (const path of tracked) {
    console.error(`${path}: tracked by git; fetched fixtures are never committed (G5 rule 4, docs/guardrails.md)`);
  }
  for (const problem of problems) console.error(`${TOOL}: ${problem}`);
  if (tracked.length > 0 || problems.length > 0) {
    console.error(`${TOOL}: ${tracked.length} tracked, ${problems.length} ignore-rule problem(s)`);
    return 1;
  }
  console.log(`fixtures/ is ignored by ${RULE}; tools/fixtures/ and packages/*/test/fixtures/ are not`);
  return 0;
}

// Only run when invoked as a script, so the tests can import it.
if (isEntryPoint(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
