// Sample-game fixture fetch (guard-rail G5 rule 4, docs/guardrails.md).
//
//   node tools/fixtures/fetch.mjs [root] [--sources <file>]
//
// Fills `<root>/fixtures/legacy/<game>/…` with the legacy sample games named in
// the pin file (`tools/fixtures/sources.json`, or `--sources <file>`: the tests
// point it at a local git repository) and writes `fixtures/legacy/.fetched.json`
// (url, rev, gamesPath, a file count per game and, when the pin names them,
// mainPath and mainFiles). `root` defaults to this repository. The games are
// test fixtures for the golden job: `fixtures/` is ignored by git and
// `tools/fixtures/check.mjs` fails if any of it is tracked.
//
// A pin may also name `mainPath` and `mainFiles` (both or neither): the shipped
// demo's main file(s) under `build/main/*.gam`, one per game (the name without
// `.gam` names the game, ignoring case). Each is copied byte for byte into its
// game's folder (`build/main/demo.gam` -> `fixtures/legacy/demo/demo.gam`)
// after checkout and before the counts are taken, so the corpus holds one
// folder per game and that game's count includes it. A game folder that already
// holds a file of that name at `rev` is a named error, never overwritten.
//
// The pin is validated before any git command runs. A change of pin is a pull
// request that edits only the pin file.
//
// Cache: when `.fetched.json` matches the pin (url, rev, gamesPath, games and
// the main keys, present in both or neither) and every game folder holds the
// file count recorded in it, the tool prints `cached` and runs no git command.
//
// Otherwise it fetches exactly `rev`, shallow, blobless and sparse, into
// `fixtures/.staging-<pid>/` and renames the finished folder over
// `fixtures/legacy`; a failure removes the staging folder and leaves an earlier
// good `fixtures/legacy` as it was. Staging folders left by an interrupted run
// are removed first.
//
// Isolation: the staging folder sits inside this project's own git work tree,
// so every git command names the staging repository with `--git-dir` and
// `--work-tree`, the repository-local GIT_* variables are removed from the
// child environment, and the staging repository's own top level is checked
// (by real path) before anything is configured or checked out. The project's
// HEAD, index, config and files are never touched.
//
// Output (stdout): one `<game>: <n> files` line per game, then `fetched` or
// `cached`. Failures go to stderr as `tools/fixtures/fetch.mjs: <step> …` and
// set exit code 1.
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(here, "..", "..");
export const defaultSourcesPath = join(here, "sources.json");

const TOOL = "tools/fixtures/fetch.mjs";
const STAMP_NAME = ".fetched.json";
const STAGING_PREFIX = ".staging-";
const MIN_GIT = { major: 2, minor: 25 };

// The staging repository must hold the commit's bytes exactly: no end-of-line,
// ident, filter or encoding conversion, whatever the source repository's own
// attribute files or the user's git configuration say.
const STAGING_ATTRIBUTES = "* -text -ident -filter -working-tree-encoding\n";

// The variables `git rev-parse --local-env-vars` lists. A caller that sets any
// of them (a git hook, `git -c`) would aim our git commands at another
// repository, object store or index.
const GIT_LOCAL_VARIABLES = [
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_COMMON_DIR",
  "GIT_CONFIG",
  "GIT_CONFIG_COUNT",
  "GIT_CONFIG_PARAMETERS",
  "GIT_DIR",
  "GIT_GRAFT_FILE",
  "GIT_IMPLICIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_NO_REPLACE_OBJECTS",
  "GIT_OBJECT_DIRECTORY",
  "GIT_PREFIX",
  "GIT_REPLACE_REF_BASE",
  "GIT_SHALLOW_FILE",
  "GIT_WORK_TREE",
];

/** A named, user-facing failure: the message says which step failed. */
export class FixturesError extends Error {
  constructor(message) {
    super(message);
    this.name = "FixturesError";
  }
}

/** The pin file failed validation; `problems` names every defect found. */
export class SourcesError extends Error {
  constructor(path, problems) {
    super(`invalid pin ${path}: ${problems.join("; ")}`);
    this.name = "SourcesError";
    this.path = path;
    this.problems = problems;
  }
}

// ------------------------------------------------------------------- the pin

const PIN_KEYS = ["url", "rev", "gamesPath", "games", "mainPath", "mainFiles"];
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const GLOB_CHARACTERS = /[*?[\]\\]/;

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

// Why `name` cannot be one path segment of a sparse-checkout pattern, or null.
// Patterns are gitignore-style, so glob characters, a leading `!` or `#` and
// edge whitespace would change what they match.
function segmentProblem(name) {
  if (name === "") return "must not be empty";
  if (CONTROL_CHARACTERS.test(name)) return "must not contain control characters";
  if (GLOB_CHARACTERS.test(name)) return "must not contain the glob characters * ? [ ] or a backslash";
  if (name === "." || name === "..") return `must not be "${name}"`;
  if (name !== name.trim()) return "must not start or end with whitespace";
  if (name.startsWith("!") || name.startsWith("#")) return "must not start with ! or #";
  return null;
}

function validatePin(value, problems) {
  if (!isObject(value)) {
    problems.push("the pin must be a JSON object");
    return null;
  }
  for (const key of Object.keys(value)) {
    if (!PIN_KEYS.includes(key)) problems.push(`unknown key "${key}" (allowed: ${PIN_KEYS.join(", ")})`);
  }

  const { url, rev, gamesPath, games, mainPath, mainFiles } = value;

  if (typeof url !== "string" || url === "") {
    problems.push("url: must be a non-empty string");
  } else if (url.startsWith("-")) {
    problems.push(`url: must not start with "-" (git would read it as an option), got ${JSON.stringify(url)}`);
  } else if (url !== url.trim() || CONTROL_CHARACTERS.test(url)) {
    problems.push("url: must not contain control characters or edge whitespace");
  }

  if (typeof rev !== "string" || !/^[0-9a-f]{40}$/.test(rev)) {
    problems.push(
      `rev: must be a full commit id, 40 lowercase hex characters (a branch, tag or short id is rejected), got ${JSON.stringify(rev)}`,
    );
  }

  if (typeof gamesPath !== "string" || gamesPath === "") {
    problems.push("gamesPath: must be a non-empty string");
  } else if (gamesPath.startsWith("/")) {
    problems.push(`gamesPath: must be relative, with no leading "/", got ${JSON.stringify(gamesPath)}`);
  } else {
    for (const segment of gamesPath.split("/")) {
      const problem = segment === "." ? 'must not contain a "." segment' : segmentProblem(segment);
      if (problem !== null) {
        problems.push(`gamesPath: every "/"-separated segment ${problem}, got ${JSON.stringify(gamesPath)}`);
        break;
      }
    }
  }

  if (mainPath !== undefined) {
    if (typeof mainPath !== "string" || mainPath === "") {
      problems.push("mainPath: must be a non-empty string");
    } else if (mainPath.startsWith("/")) {
      problems.push(`mainPath: must be relative, with no leading "/", got ${JSON.stringify(mainPath)}`);
    } else {
      for (const segment of mainPath.split("/")) {
        const problem = segment === "." ? 'must not contain a "." segment' : segmentProblem(segment);
        if (problem !== null) {
          problems.push(`mainPath: every "/"-separated segment ${problem}, got ${JSON.stringify(mainPath)}`);
          break;
        }
      }
    }
  }

  if (!Array.isArray(games) || games.length === 0) {
    problems.push("games: must be a non-empty array of folder names");
  } else {
    const seen = new Set();
    games.forEach((game, index) => {
      const field = `games[${index}]`;
      if (typeof game !== "string") {
        problems.push(`${field}: must be a string, got ${JSON.stringify(game)}`);
        return;
      }
      const problem = segmentProblem(game);
      if (problem !== null) {
        problems.push(`${field}: ${problem}, got ${JSON.stringify(game)}`);
      } else if (game.includes("/")) {
        problems.push(`${field}: must be one folder name, not a path, got ${JSON.stringify(game)}`);
      } else if (game.startsWith(".")) {
        problems.push(`${field}: must not start with ".", got ${JSON.stringify(game)}`);
      } else if (seen.has(game.toLowerCase())) {
        problems.push(`${field}: duplicate game ${JSON.stringify(game)}`);
      }
      seen.add(game.toLowerCase());
    });
  }

  if (mainFiles !== undefined) {
    if (!Array.isArray(mainFiles) || mainFiles.length === 0) {
      problems.push("mainFiles: must be a non-empty array of file names");
    } else {
      const seen = new Set();
      mainFiles.forEach((file, index) => {
        const field = `mainFiles[${index}]`;
        if (typeof file !== "string") {
          problems.push(`${field}: must be a string, got ${JSON.stringify(file)}`);
          return;
        }
        const problem = segmentProblem(file);
        const stem = file.slice(0, -4).toLowerCase();
        if (problem !== null) {
          problems.push(`${field}: ${problem}, got ${JSON.stringify(file)}`);
        } else if (file.includes("/")) {
          problems.push(`${field}: must be one file name, not a path, got ${JSON.stringify(file)}`);
        } else if (file.startsWith(".")) {
          problems.push(`${field}: must not start with ".", got ${JSON.stringify(file)}`);
        } else if (!file.toLowerCase().endsWith(".gam")) {
          problems.push(`${field}: must end in ".gam", got ${JSON.stringify(file)}`);
        } else if (!Array.isArray(games) || !games.some((game) => typeof game === "string" && game.toLowerCase() === stem)) {
          problems.push(`${field}: the name must name a game, got ${JSON.stringify(file)}`);
        } else if (seen.has(file.toLowerCase())) {
          problems.push(`${field}: duplicate main file ${JSON.stringify(file)}`);
        }
        seen.add(file.toLowerCase());
      });
    }
  }

  // mainPath and mainFiles go together: one without the other is a defect.
  if (mainPath !== undefined && mainFiles === undefined) problems.push("mainFiles: required when mainPath is set");
  if (mainFiles !== undefined && mainPath === undefined) problems.push("mainPath: required when mainFiles is set");

  if (problems.length !== 0) return null;
  const main = mainPath === undefined ? {} : { mainPath, mainFiles: [...mainFiles] };
  return { url, rev, gamesPath, games: [...games], ...main };
}

/**
 * Checks a parsed pin (`url`, `rev`, `gamesPath`, `games` and, when present,
 * `mainPath` and `mainFiles`) and returns a clean copy. Throws a SourcesError
 * naming every defect found.
 */
function validateSources(value, path = "(pin)") {
  const problems = [];
  const pin = validatePin(value, problems);
  if (pin === null) throw new SourcesError(path, problems);
  return pin;
}

/**
 * Reads and validates the pin file at `path` (default: the committed
 * `tools/fixtures/sources.json`). Throws a SourcesError naming every defect;
 * no git command runs here.
 */
export function loadSources(path = defaultSourcesPath) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    throw new SourcesError(path, [`cannot read the pin file: ${error.message}`]);
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new SourcesError(path, [`the pin file is not valid JSON: ${error.message}`]);
  }
  return validateSources(value, path);
}

// ----------------------------------------------------------------------- git

/** The child environment for git: `base` without the repository-local GIT_* variables. */
export function gitEnvironment(base = process.env) {
  const env = { ...base };
  for (const name of GIT_LOCAL_VARIABLES) delete env[name];
  // A source that asks for credentials must fail the step, not wait for a terminal.
  env.GIT_TERMINAL_PROMPT = "0";
  return env;
}

/**
 * Runs `git` without a shell and returns the spawnSync result (strings, never
 * throws). `options.env` is the environment to start from (default:
 * `process.env`); tests put a stub `git` first on its PATH.
 */
export function runGit(args, options = {}) {
  return spawnSync("git", args, {
    cwd: options.cwd,
    env: gitEnvironment(options.env ?? process.env),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

const gist = (text) =>
  text
    .trim()
    .split(/\r?\n/)
    .filter((line) => line !== "")
    .slice(0, 5)
    .join("; ");

/** Runs one named git step and returns its stdout; throws a FixturesError naming the step. */
export function gitStep(step, args, options = {}) {
  const result = runGit(args, options);
  if (result.error) {
    throw new FixturesError(`${step} failed: cannot run git (${result.error.code ?? result.error.message})`);
  }
  if (result.status !== 0) {
    const how = result.status === null ? `signal ${result.signal}` : `exit ${result.status}`;
    throw new FixturesError(`${step} failed (${how}): ${gist(result.stderr) || gist(result.stdout) || "no output"}`);
  }
  return result.stdout;
}

function requireGit(env) {
  const output = gitStep("git --version", ["--version"], { env }).trim();
  const found = /^git version (\d+)\.(\d+)/.exec(output);
  if (found === null) {
    throw new FixturesError(`git --version failed: cannot read a version from ${JSON.stringify(output)}`);
  }
  const major = Number(found[1]);
  const minor = Number(found[2]);
  if (major < MIN_GIT.major || (major === MIN_GIT.major && minor < MIN_GIT.minor)) {
    throw new FixturesError(
      `git --version failed: found ${JSON.stringify(output)}, but the fetch needs git >= ${MIN_GIT.major}.${MIN_GIT.minor} (sparse-checkout --no-cone)`,
    );
  }
}

// --------------------------------------------------------------------- paths

function realOrResolved(path) {
  try {
    return realpathSync(path);
  } catch {
    return resolve(path);
  }
}

/** Whether two paths are the same place once symlinks are resolved. */
export const samePath = (a, b) => realOrResolved(a) === realOrResolved(b);

/** Throws a FixturesError unless `root` is an existing directory. */
export function requireDirectory(root) {
  let info;
  try {
    info = statSync(root);
  } catch (error) {
    if (error.code === "ENOENT") throw new FixturesError(`root directory ${root} does not exist`);
    throw new FixturesError(`cannot access root directory ${root}: ${error.message}`);
  }
  if (!info.isDirectory()) throw new FixturesError(`root ${root} is not a directory`);
}

function isRealDirectory(path) {
  try {
    return lstatSync(path).isDirectory();
  } catch {
    return false;
  }
}

// Files below `directory`, symlinks not followed; 0 when it is not readable.
function countFiles(directory) {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return 0;
  }
  let count = 0;
  for (const entry of entries) count += entry.isDirectory() ? countFiles(join(directory, entry.name)) : 1;
  return count;
}

// The files of `game` under `base`: 0 unless it is a real folder.
const gameFileCount = (base, game) => (isRealDirectory(join(base, game)) ? countFiles(join(base, game)) : 0);

// -------------------------------------------------------------------- cache

const isCount = (value) => Number.isInteger(value) && value >= 1;

// The recorded file count per game when `legacy` is a complete fetch of `pin`, else null.
function cachedCounts(legacy, pin) {
  let stamp;
  try {
    stamp = JSON.parse(readFileSync(join(legacy, STAMP_NAME), "utf8"));
  } catch {
    return null;
  }
  if (!isObject(stamp) || stamp.url !== pin.url || stamp.rev !== pin.rev || stamp.gamesPath !== pin.gamesPath) {
    return null;
  }
  // The main keys must match too, present in both or neither, so a pin that
  // gained or lost them (or changed them) refetches.
  if (pin.mainPath !== undefined) {
    if (stamp.mainPath !== pin.mainPath) return null;
    if (
      !Array.isArray(stamp.mainFiles) ||
      stamp.mainFiles.length !== pin.mainFiles.length ||
      !stamp.mainFiles.every((file, index) => file === pin.mainFiles[index])
    ) {
      return null;
    }
  } else if (stamp.mainPath !== undefined || stamp.mainFiles !== undefined) {
    return null;
  }
  if (!isObject(stamp.games)) return null;
  const names = Object.keys(stamp.games);
  if (names.length !== pin.games.length || !pin.games.every((game) => names.includes(game))) return null;
  const counts = {};
  for (const game of pin.games) {
    const recorded = isObject(stamp.games[game]) ? stamp.games[game].files : undefined;
    if (!isCount(recorded) || gameFileCount(legacy, game) !== recorded) return null;
    counts[game] = recorded;
  }
  return counts;
}

// ------------------------------------------------------------------- staging

function removeLeftovers(fixtures) {
  let names;
  try {
    names = readdirSync(fixtures);
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  for (const name of names) {
    if (name.startsWith(STAGING_PREFIX)) rmSync(join(fixtures, name), { recursive: true, force: true });
  }
}

// Builds `<staging>/out` (the games and the stamp) from a sparse checkout of the pinned commit.
function stageGames(staging, pin, env) {
  const gitDir = join(staging, "git");
  const tree = join(staging, "tree");
  const out = join(staging, "out");
  mkdirSync(tree);
  const mainFiles = pin.mainFiles ?? [];

  const git = (step, ...args) =>
    gitStep(
      step,
      [
        `--git-dir=${gitDir}`,
        `--work-tree=${tree}`,
        "-c",
        "core.autocrlf=false",
        "-c",
        `core.hooksPath=${join(gitDir, "hooks")}`,
        ...args,
      ],
      { cwd: tree, env },
    );

  git("git init", "init", "--quiet", "--template=");
  const top = git("git rev-parse --show-toplevel", "rev-parse", "--show-toplevel").trim();
  if (!samePath(top, tree)) {
    throw new FixturesError(
      `git rev-parse --show-toplevel failed: git reports the work tree ${JSON.stringify(top)}, expected the staging folder ${JSON.stringify(tree)}; refusing to run sparse-checkout or checkout`,
    );
  }
  mkdirSync(join(gitDir, "info"), { recursive: true });
  writeFileSync(join(gitDir, "info", "attributes"), STAGING_ATTRIBUTES);

  git("git remote add", "remote", "add", "--", "origin", pin.url);
  git("git sparse-checkout init", "sparse-checkout", "init", "--no-cone");
  git(
    "git sparse-checkout set",
    "sparse-checkout",
    "set",
    "--",
    ...pin.games.map((game) => `/${pin.gamesPath}/${game}/`),
    ...mainFiles.map((file) => `/${pin.mainPath}/${file}`),
  );
  git(
    "git fetch",
    "fetch",
    "--quiet",
    "--depth",
    "1",
    "--filter=blob:none",
    "--no-tags",
    "--no-recurse-submodules",
    "origin",
    pin.rev,
  );
  const fetched = git("git rev-parse FETCH_HEAD", "rev-parse", "--verify", "FETCH_HEAD^{commit}").trim();
  if (fetched !== pin.rev) {
    throw new FixturesError(
      `git rev-parse FETCH_HEAD failed: fetched commit ${fetched}, but the pin names ${pin.rev}`,
    );
  }

  // The trees are all here (only blobs were left out), so a game that is absent
  // or is a file, a missing main file, and a main file that collides with a
  // file already in its game folder are named before anything is checked out.
  const listed = (path) => git("git ls-tree", "ls-tree", "-r", "--name-only", "-z", "FETCH_HEAD", "--", path);
  const absent = pin.games.filter((game) => listed(`${pin.gamesPath}/${game}/`) === "");
  if (absent.length > 0) throw absentGames(absent, pin);

  const missingMain = mainFiles.filter(
    (file) => !listed(`${pin.mainPath}/${file}`).split("\0").includes(`${pin.mainPath}/${file}`),
  );
  if (missingMain.length > 0) throw absentMainFiles(missingMain, pin);

  const collidingMain = mainFiles.filter((file) => listed(`${pin.gamesPath}/${mainGame(pin, file)}/${file}`) !== "");
  if (collidingMain.length > 0) throw collidingMainFiles(collidingMain, pin);

  git("git checkout", "checkout", "--quiet", "--detach", "FETCH_HEAD");

  const base = join(tree, ...pin.gamesPath.split("/"));
  for (const file of mainFiles) {
    copyFileSync(join(tree, ...pin.mainPath.split("/"), file), join(base, mainGame(pin, file), file));
  }
  const counts = {};
  for (const game of pin.games) counts[game] = gameFileCount(base, game);
  const empty = pin.games.filter((game) => counts[game] === 0);
  if (empty.length > 0) throw absentGames(empty, pin);

  mkdirSync(out);
  for (const game of pin.games) renameSync(join(base, game), join(out, game));
  const stamp = {
    url: pin.url,
    rev: pin.rev,
    gamesPath: pin.gamesPath,
    games: Object.fromEntries(pin.games.map((game) => [game, { files: counts[game] }])),
  };
  if (pin.mainPath !== undefined) {
    stamp.mainPath = pin.mainPath;
    stamp.mainFiles = [...pin.mainFiles];
  }
  writeFileSync(join(out, STAMP_NAME), `${JSON.stringify(stamp, null, 2)}\n`);
  return counts;
}

const absentGames = (games, pin) =>
  new FixturesError(
    `game folder missing at ${pin.rev}: ${games
      .map((game) => `${JSON.stringify(game)} (${pin.gamesPath}/${game} must be a folder holding at least one file)`)
      .join(", ")}`,
  );

// The game folder a main file belongs to: its name without `.gam` names a game
// (the pin is validated, so one always matches).
const mainGame = (pin, file) => pin.games.find((game) => game.toLowerCase() === file.slice(0, -4).toLowerCase());

const absentMainFiles = (files, pin) =>
  new FixturesError(
    `main file missing at ${pin.rev}: ${files
      .map((file) => `${JSON.stringify(file)} (${pin.mainPath}/${file} must be a main file)`)
      .join(", ")}`,
  );

const collidingMainFiles = (files, pin) =>
  new FixturesError(
    `main file collides with the game corpus at ${pin.rev}: ${files
      .map(
        (file) =>
          `${JSON.stringify(file)} (${pin.gamesPath}/${mainGame(pin, file)}/${file} already holds a file of that name, refusing to overwrite it)`,
      )
      .join(", ")}`,
  );

// Moves `<staging>/out` to `legacy`, keeping the old folder until the new one is in place.
function install(staging, legacy) {
  const out = join(staging, "out");
  const old = join(staging, "old");
  let hadOld = true;
  try {
    lstatSync(legacy);
  } catch (error) {
    if (error.code !== "ENOENT") throw new FixturesError(`install failed: cannot inspect ${legacy}: ${error.message}`);
    hadOld = false;
  }
  try {
    if (hadOld) renameSync(legacy, old);
  } catch (error) {
    throw new FixturesError(`install failed: cannot move ${legacy} aside: ${error.message}`);
  }
  try {
    renameSync(out, legacy);
  } catch (error) {
    if (hadOld) renameSync(old, legacy);
    throw new FixturesError(`install failed: cannot move the fetched games to ${legacy}: ${error.message}`);
  }
}

// ----------------------------------------------------------------------- API

/**
 * Makes `<root>/fixtures/legacy` match `sources` (a pin as read by
 * `loadSources`) and returns `{ status, url, rev, games }` where `status` is
 * `"cached"` or `"fetched"` and `games` is `[{ name, files }]` in pin order.
 * `options.env` is the environment the git commands start from (default:
 * `process.env`). Throws a FixturesError naming the failed step, and leaves an
 * earlier good `fixtures/legacy` untouched.
 */
export function fetchFixtures(root, sources, options = {}) {
  const pin = validateSources(sources);
  const env = options.env ?? process.env;
  const rootPath = resolve(root);
  requireDirectory(rootPath);
  const fixtures = join(rootPath, "fixtures");
  const legacy = join(fixtures, "legacy");
  const summary = (status, counts) => ({
    status,
    url: pin.url,
    rev: pin.rev,
    games: pin.games.map((name) => ({ name, files: counts[name] })),
  });

  const cached = cachedCounts(legacy, pin);
  if (cached !== null) return summary("cached", cached);

  removeLeftovers(fixtures);
  requireGit(env);

  mkdirSync(fixtures, { recursive: true });
  const staging = join(fixtures, `${STAGING_PREFIX}${process.pid}`);
  try {
    mkdirSync(staging);
    const counts = stageGames(staging, pin, env);
    install(staging, legacy);
    return summary("fetched", counts);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

// ------------------------------------------------------------------------ CLI

function parseArguments(argv) {
  const positional = [];
  const unknown = [];
  let sourcesPath;
  for (let position = 0; position < argv.length; position += 1) {
    const argument = argv[position];
    if (argument === "--sources") {
      const value = argv[position + 1];
      if (value === undefined || value.startsWith("-")) {
        throw new Error("--sources needs a pin file argument");
      }
      if (sourcesPath !== undefined) throw new Error("--sources given more than once");
      sourcesPath = resolve(value);
      position += 1;
    } else if (argument.startsWith("-")) {
      unknown.push(argument);
    } else {
      positional.push(argument);
    }
  }
  if (unknown.length > 0) throw new Error(`unknown flag(s): ${unknown.join(", ")}`);
  if (positional.length > 1) {
    throw new Error(
      `expected at most one root argument, got ${positional
        .map((argument) => JSON.stringify(argument))
        .join(", ")}`,
    );
  }
  return {
    root: positional.length === 1 ? resolve(positional[0]) : repoRoot,
    sourcesPath: sourcesPath ?? defaultSourcesPath,
  };
}

function main(argv) {
  let args;
  try {
    args = parseArguments(argv);
  } catch (error) {
    console.error(`${TOOL}: ${error.message}`);
    return 1;
  }

  let pin;
  try {
    requireDirectory(args.root);
    pin = loadSources(args.sourcesPath);
  } catch (error) {
    if (!(error instanceof SourcesError)) {
      console.error(`${TOOL}: ${error.message}`);
      return 1;
    }
    for (const problem of error.problems) console.error(`${TOOL}: invalid pin ${error.path}: ${problem}`);
    return 1;
  }

  let result;
  try {
    result = fetchFixtures(args.root, pin);
  } catch (error) {
    console.error(`${TOOL}: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  for (const { name, files } of result.games) console.log(`${name}: ${files} ${files === 1 ? "file" : "files"}`);
  console.log(result.status);
  return 0;
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

// Only run when invoked as a script, so the tests and check.mjs can import it.
if (isEntryPoint(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
