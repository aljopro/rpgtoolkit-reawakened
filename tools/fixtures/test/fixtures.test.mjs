// Fixture tests for tools/fixtures/fetch.mjs and tools/fixtures/check.mjs
// (guard-rail G5 rule 4): at least one test per row of the story's I/O &
// edge-case matrix. Every source repository, project root and stub is built at
// run time in temp directories; the pin points at a local git repository, so
// no test touches the network. Every test that runs a fetch uses a temp root
// that is itself a git repository with `/fixtures/` ignored, and no test runs a
// fetch against this repository. The scanner also scans this file (it lives
// under tools/), so it holds no legacy marker.
import { after, test } from "node:test";
import { deepEqual, equal, match, notEqual, ok, throws } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { checkFixtures } from "../check.mjs";
import { SourcesError, fetchFixtures, loadSources } from "../fetch.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fetchTool = resolve(here, "..", "fetch.mjs");
const checkTool = resolve(here, "..", "check.mjs");
const committedPin = resolve(here, "..", "sources.json");
const repoRoot = resolve(here, "..", "..", "..");

// ------------------------------------------------------------------- helpers

const scratch = [];
after(() => {
  for (const directory of scratch) rmSync(directory, { recursive: true, force: true });
});

function makeDir(label) {
  const directory = mkdtempSync(join(tmpdir(), `fixtures-${label}-`));
  scratch.push(directory);
  return directory;
}

function writeFile(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

// A git environment that owns nothing of the developer's: no user or system
// configuration, no repository-local variables, a fixed identity.
const home = makeDir("home");
writeFileSync(join(home, "gitconfig"), "");
const gitEnv = {
  ...process.env,
  HOME: home,
  XDG_CONFIG_HOME: home,
  GIT_CONFIG_GLOBAL: join(home, "gitconfig"),
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "fixture",
  GIT_AUTHOR_EMAIL: "fixture@example.invalid",
  GIT_COMMITTER_NAME: "fixture",
  GIT_COMMITTER_EMAIL: "fixture@example.invalid",
};
for (const name of [
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_COMMON_DIR",
  "GIT_CONFIG",
  "GIT_CONFIG_COUNT",
  "GIT_CONFIG_PARAMETERS",
  "GIT_DIR",
  "GIT_INDEX_FILE",
  "GIT_OBJECT_DIRECTORY",
  "GIT_PREFIX",
  "GIT_WORK_TREE",
]) {
  delete gitEnv[name];
}

function git(cwd, ...args) {
  const result = spawnSync("git", args, { cwd, env: gitEnv, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed in ${cwd}: ${result.stderr}${result.error ?? ""}`);
  return result.stdout;
}

// ----------------------------------------------------------- source repository

const BIN = Buffer.from([0x61, 0x0d, 0x0a, 0x62, 0x0a, 0x63, 0x00, 0x64, 0x0d]);
const GAMES = {
  "build/game/demo/main.dat": "demo main\n",
  "build/game/demo/maps/my map.bin": BIN, // CR, LF and NUL, and a space in the name
  "build/game/demo/maps/second.txt": "second\r\nline\r\n",
  "build/game/Basic/start.txt": "basic start\n",
  "build/game/Basic/data/blob.bin": Buffer.from([0, 1, 2, 255, 254]),
  "build/game/other/skip.txt": "a folder that is not pinned\n",
  "README.txt": "outside the games\n",
};
const GAME_NAMES = ["demo", "Basic"];

// Commits `files` (path -> text or bytes) after removing `remove`; returns the new commit id.
function commit(directory, files, remove = []) {
  for (const path of remove) rmSync(join(directory, path), { recursive: true, force: true });
  for (const [path, content] of Object.entries(files)) writeFile(join(directory, path), content);
  git(directory, "add", "--all");
  git(directory, "commit", "--quiet", "--message", "fixture");
  return git(directory, "rev-parse", "HEAD").trim();
}

// A local git repository standing in for the legacy project: `{ dir, rev }`.
function makeSource(label, files = GAMES) {
  const dir = makeDir(`source-${label}`);
  git(dir, "init", "--quiet");
  git(dir, "config", "uploadpack.allowFilter", "true");
  git(dir, "config", "uploadpack.allowAnySHA1InWant", "true");
  return { dir, rev: commit(dir, files) };
}

// What `fixtures/legacy` must hold for `files`: `<game>/<path>` -> base64 bytes.
// `main`, when given, is `{ mainPath, mainFiles }`: each main file is copied
// into its game's folder, so `<game>/<name>` -> the bytes at `<mainPath>/<name>`.
function expectedTree(files, games = GAME_NAMES, main = null) {
  const prefix = "build/game/";
  const tree = {};
  for (const [path, content] of Object.entries(files)) {
    if (!path.startsWith(prefix) || !games.includes(path.slice(prefix.length).split("/")[0])) continue;
    tree[path.slice(prefix.length)] = Buffer.from(content).toString("base64");
  }
  if (main !== null) {
    for (const file of main.mainFiles) {
      const stem = file.slice(0, -".gam".length).toLowerCase();
      const game = games.find((name) => name.toLowerCase() === stem);
      tree[`${game}/${file}`] = Buffer.from(files[`${main.mainPath}/${file}`]).toString("base64");
    }
  }
  return tree;
}

function readTree(directory, prefix = "") {
  const tree = {};
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const name = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) Object.assign(tree, readTree(join(directory, entry.name), name));
    else tree[name] = readFileSync(join(directory, entry.name)).toString("base64");
  }
  return tree;
}

const legacyOf = (root) => join(root, "fixtures", "legacy");
const stampOf = (root) => join(legacyOf(root), ".fetched.json");

function legacyTree(root) {
  const tree = readTree(legacyOf(root));
  delete tree[".fetched.json"];
  return tree;
}

const stagingLeft = (root) =>
  existsSync(join(root, "fixtures")) ? readdirSync(join(root, "fixtures")).filter((name) => name.startsWith(".staging-")) : [];

// ---------------------------------------------------------------- project root

// A temp git work tree like CI's: one committed file and `/fixtures/` ignored.
function makeRoot(label) {
  const root = makeDir(`root-${label}`);
  git(root, "init", "--quiet");
  writeFile(join(root, ".gitignore"), "/fixtures/\n");
  writeFile(join(root, "README.txt"), "project file\n");
  git(root, "add", "--all");
  git(root, "commit", "--quiet", "--message", "project");
  return root;
}

// Everything a fetch must not change in a project repository.
function snapshot(root) {
  const gitDir = join(root, ".git");
  const worktree = {};
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "fixtures") continue;
    if (entry.isDirectory()) Object.assign(worktree, readTree(join(root, entry.name), entry.name));
    else worktree[entry.name] = readFileSync(join(root, entry.name)).toString("base64");
  }
  return {
    head: git(root, "rev-parse", "HEAD").trim(),
    headFile: readFileSync(join(gitDir, "HEAD"), "utf8"),
    config: readFileSync(join(gitDir, "config"), "utf8"),
    index: readFileSync(join(gitDir, "index")).toString("base64"),
    gitDirEntries: readdirSync(gitDir).sort(),
    infoEntries: readdirSync(join(gitDir, "info")).sort(),
    objects: Object.keys(readTree(join(gitDir, "objects"))).sort(),
    staged: git(root, "ls-files", "--stage"),
    worktree,
  };
}

function assertProjectUntouched(root, before) {
  deepEqual(snapshot(root), before);
  const sparse = spawnSync("git", ["config", "--get-regexp", "sparse"], { cwd: root, env: gitEnv, encoding: "utf8" });
  equal(sparse.status, 1, `the project config gained a sparse-checkout setting: ${sparse.stdout}`);
  equal(git(root, "status", "--porcelain"), "");
}

// ------------------------------------------------------------------------ pins

function writePin(url, rev, overrides = {}) {
  const file = join(makeDir("pin"), "sources.json");
  writeFileSync(file, JSON.stringify({ url, rev, gamesPath: "build/game", games: GAME_NAMES, ...overrides }));
  return file;
}

const pinFor = (source, overrides) => writePin(source.dir, source.rev, overrides);

// --------------------------------------------------------------------- running

const insideProject = (path) => {
  const real = realpathSync(path);
  const project = realpathSync(repoRoot);
  return real === project || real.startsWith(project + sep);
};

function run(script, args, env = gitEnv) {
  const result = spawnSync(process.execPath, [script, ...args], { encoding: "utf8", env });
  result.output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  return result;
}

// Runs the fetch CLI. A root inside this repository is refused: no test may touch it.
function runFetch(root, pin, options = {}) {
  if (root !== null) ok(!insideProject(root), `refusing to fetch into the project itself: ${root}`);
  return run(
    options.script ?? fetchTool,
    [...(root === null ? [] : [root]), ...(pin === null ? [] : ["--sources", pin]), ...(options.extra ?? [])],
    options.env,
  );
}

function runCheck(root, extra = [], env) {
  return run(checkTool, [...(root === null ? [] : [root]), ...extra], env);
}

// A successful first fetch of `source` into `root`.
function fetchInto(root, source) {
  const result = runFetch(root, pinFor(source));
  equal(result.status, 0, result.output);
  return result;
}

// -------------------------------------------------------------------- stub git

const posixOnly = { skip: process.platform === "win32" ? "the stub git is a POSIX shell script" : false };

// A `git` first on PATH that logs every call, runs `body` (shell) first and then
// the real git. `{ env, calls() }`.
function makeStub(label, body = "") {
  const real = spawnSync("sh", ["-c", "command -v git"], { env: gitEnv, encoding: "utf8" }).stdout.trim();
  const dir = makeDir(`stub-${label}`);
  const log = join(dir, "calls.log");
  const script = `#!/bin/sh\nprintf '%s\\n' "$*" >> '${log}'\n${body}\nexec '${real}' "$@"\n`;
  writeFileSync(join(dir, "git"), script);
  chmodSync(join(dir, "git"), 0o755);
  return {
    env: { ...gitEnv, PATH: `${dir}${delimiter}${gitEnv.PATH}` },
    calls: () => (existsSync(log) ? readFileSync(log, "utf8").split("\n").filter((line) => line !== "") : []),
  };
}

// ============================================================ matrix: first fetch

test("matrix: first fetch builds both games byte for byte, writes the stamp and leaves no staging", () => {
  const source = makeSource("first");
  const root = makeRoot("first");
  const result = runFetch(root, pinFor(source));
  equal(result.status, 0, result.output);
  equal(result.stdout, "demo: 3 files\nBasic: 2 files\nfetched\n");
  equal(result.stderr, "");
  deepEqual(legacyTree(root), expectedTree(GAMES));
  ok(BIN.equals(readFileSync(join(legacyOf(root), "demo", "maps", "my map.bin"))));
  deepEqual(JSON.parse(readFileSync(stampOf(root), "utf8")), {
    url: source.dir,
    rev: source.rev,
    gamesPath: "build/game",
    games: { demo: { files: 3 }, Basic: { files: 2 } },
  });
  deepEqual(readdirSync(join(root, "fixtures")), ["legacy"]);
  deepEqual(readdirSync(legacyOf(root)).sort(), [".fetched.json", "Basic", "demo"]);
  equal(git(root, "status", "--porcelain"), "");
});

test("the API returns the same result as the CLI prints", () => {
  const source = makeSource("api");
  const root = makeRoot("api");
  const pin = loadSources(pinFor(source));
  const first = fetchFixtures(root, pin);
  deepEqual(first, {
    status: "fetched",
    url: source.dir,
    rev: source.rev,
    games: [
      { name: "demo", files: 3 },
      { name: "Basic", files: 2 },
    ],
  });
  equal(fetchFixtures(root, pin).status, "cached");
});

test("conversion settings and in-repository attributes cannot change the bytes", () => {
  const files = {
    "build/game/demo/.gitattributes": "* text eol=crlf\n",
    "build/game/demo/lf.txt": "one\ntwo\n",
    "build/game/Basic/lf.txt": "three\nfour\n",
  };
  const source = makeSource("attributes", files);
  const root = makeRoot("attributes");
  const config = join(makeDir("autocrlf"), "gitconfig");
  writeFileSync(config, "[core]\n\tautocrlf = true\n\teol = crlf\n");
  const result = runFetch(root, pinFor(source), { env: { ...gitEnv, GIT_CONFIG_GLOBAL: config } });
  equal(result.status, 0, result.output);
  deepEqual(legacyTree(root), expectedTree(files));
});

// ============================================================ matrix: cache reuse

test("matrix: a rerun with the same pin prints cached, runs no git command and rewrites nothing", posixOnly, () => {
  const source = makeSource("cache");
  const root = makeRoot("cache");
  fetchInto(root, source);
  rmSync(source.dir, { recursive: true, force: true });

  const watched = [legacyOf(root), stampOf(root), join(legacyOf(root), "demo", "main.dat")];
  const stamps = () => watched.map((path) => statSync(path).mtimeMs);
  const before = { tree: legacyTree(root), stamps: stamps(), stamp: readFileSync(stampOf(root), "utf8") };
  const stub = makeStub("cache");

  const result = runFetch(root, writePin(source.dir, source.rev), { env: stub.env });
  equal(result.status, 0, result.output);
  equal(result.stdout, "demo: 3 files\nBasic: 2 files\ncached\n");
  equal(result.stderr, "");
  deepEqual(stub.calls(), []);
  deepEqual(legacyTree(root), before.tree);
  deepEqual(stamps(), before.stamps);
  equal(readFileSync(stampOf(root), "utf8"), before.stamp);
  deepEqual(readdirSync(join(root, "fixtures")), ["legacy"]);
});

test("a valid cache needs no git on PATH at all", () => {
  const source = makeSource("cache-nogit");
  const root = makeRoot("cache-nogit");
  fetchInto(root, source);
  const emptyPath = makeDir("empty-path");
  const result = runFetch(root, pinFor(source), { env: { ...gitEnv, PATH: emptyPath } });
  equal(result.status, 0, result.output);
  match(result.stdout, /^cached$/m);
});

// ================================================== matrix: pin moved or cache damaged

test("matrix: a moved rev refetches; new content replaces the old and stale files are gone", () => {
  const source = makeSource("moved");
  const root = makeRoot("moved");
  fetchInto(root, source);
  const changed = {
    ...GAMES,
    "build/game/demo/main.dat": "demo main, second edition\n",
    "build/game/demo/added.txt": "added\n",
    "build/game/Basic/start.txt": "basic start, second edition\n",
  };
  delete changed["build/game/demo/maps/second.txt"];
  const rev = commit(source.dir, changed, ["build/game/demo/maps/second.txt"]);
  notEqual(rev, source.rev);

  const result = runFetch(root, writePin(source.dir, rev));
  equal(result.status, 0, result.output);
  equal(result.stdout, "demo: 3 files\nBasic: 2 files\nfetched\n");
  deepEqual(legacyTree(root), expectedTree(changed));
  equal(JSON.parse(readFileSync(stampOf(root), "utf8")).rev, rev);
  deepEqual(stagingLeft(root), []);
});

test("matrix: a stamp whose rev differs refetches and restores damaged content", () => {
  const source = makeSource("stamp-rev");
  const root = makeRoot("stamp-rev");
  fetchInto(root, source);
  const stamp = JSON.parse(readFileSync(stampOf(root), "utf8"));
  writeFileSync(stampOf(root), JSON.stringify({ ...stamp, rev: "c".repeat(40) }));
  writeFileSync(join(legacyOf(root), "Basic", "start.txt"), "damaged\n");

  const result = runFetch(root, pinFor(source));
  equal(result.status, 0, result.output);
  match(result.stdout, /^fetched$/m);
  deepEqual(legacyTree(root), expectedTree(GAMES));
  equal(JSON.parse(readFileSync(stampOf(root), "utf8")).rev, source.rev);
});

test("matrix: a game folder that lost a file, or gained one, is refetched", () => {
  const source = makeSource("damaged");
  const root = makeRoot("damaged");
  fetchInto(root, source);

  rmSync(join(legacyOf(root), "demo", "main.dat"));
  const lost = runFetch(root, pinFor(source));
  equal(lost.status, 0, lost.output);
  match(lost.stdout, /^fetched$/m);
  deepEqual(legacyTree(root), expectedTree(GAMES));

  writeFile(join(legacyOf(root), "Basic", "stray.txt"), "stray\n");
  const gained = runFetch(root, pinFor(source));
  equal(gained.status, 0, gained.output);
  match(gained.stdout, /^fetched$/m);
  deepEqual(legacyTree(root), expectedTree(GAMES));

  rmSync(join(legacyOf(root), "Basic"), { recursive: true });
  const gone = runFetch(root, pinFor(source));
  equal(gone.status, 0, gone.output);
  match(gone.stdout, /^fetched$/m);
  deepEqual(legacyTree(root), expectedTree(GAMES));
});

test("matrix: a missing, unreadable or mismatched stamp is a cache miss, not an error", () => {
  const source = makeSource("stamp-bad");
  const root = makeRoot("stamp-bad");
  fetchInto(root, source);
  const stamp = JSON.parse(readFileSync(stampOf(root), "utf8"));
  const variants = [
    ["not JSON", "not json"],
    ["an array", "[]"],
    ["another url", JSON.stringify({ ...stamp, url: `${source.dir}-other` })],
    ["another gamesPath", JSON.stringify({ ...stamp, gamesPath: "build" })],
    ["a game missing", JSON.stringify({ ...stamp, games: { demo: stamp.games.demo } })],
    ["a zero count", JSON.stringify({ ...stamp, games: { demo: { files: 0 }, Basic: stamp.games.Basic } })],
    ["no games", JSON.stringify({ url: stamp.url, rev: stamp.rev, gamesPath: stamp.gamesPath })],
  ];
  for (const [label, text] of variants) {
    writeFileSync(stampOf(root), text);
    const result = runFetch(root, pinFor(source));
    equal(result.status, 0, `${label}: ${result.output}`);
    match(result.stdout, /^fetched$/m, label);
  }
  rmSync(stampOf(root));
  const gone = runFetch(root, pinFor(source));
  equal(gone.status, 0, gone.output);
  match(gone.stdout, /^fetched$/m);
  deepEqual(legacyTree(root), expectedTree(GAMES));
});

test("a changed game list is a cache miss and the dropped game is gone", () => {
  const source = makeSource("games-list");
  const root = makeRoot("games-list");
  fetchInto(root, source);
  const result = runFetch(root, pinFor(source, { games: ["Basic"] }));
  equal(result.status, 0, result.output);
  equal(result.stdout, "Basic: 2 files\nfetched\n");
  deepEqual(legacyTree(root), expectedTree(GAMES, ["Basic"]));
});

// ============================================================ matrix: game missing

test("matrix: a source without Basic exits 1 naming Basic and creates no fixtures/legacy", () => {
  const files = { ...GAMES };
  for (const path of Object.keys(files)) if (path.startsWith("build/game/Basic/")) delete files[path];
  const source = makeSource("no-basic", files);
  const root = makeRoot("no-basic");
  const result = runFetch(root, pinFor(source));
  equal(result.status, 1, result.output);
  equal(result.stdout, "");
  match(result.stderr, /tools\/fixtures\/fetch\.mjs: game folder missing at [0-9a-f]{40}: "Basic"/);
  ok(!result.stderr.includes('"demo"'), result.stderr);
  ok(!existsSync(legacyOf(root)));
  deepEqual(stagingLeft(root), []);
});

test("matrix: a game that is a file, not a folder, exits 1 naming it", () => {
  const files = { ...GAMES };
  for (const path of Object.keys(files)) if (path.startsWith("build/game/Basic/")) delete files[path];
  files["build/game/Basic"] = "a file where a folder belongs\n";
  const source = makeSource("basic-file", files);
  const root = makeRoot("basic-file");
  const result = runFetch(root, pinFor(source));
  equal(result.status, 1, result.output);
  match(result.stderr, /game folder missing at [0-9a-f]{40}: "Basic"/);
  ok(!existsSync(legacyOf(root)));
  deepEqual(stagingLeft(root), []);
});

test("matrix: every missing game is named, also when no game is there at all", () => {
  const source = makeSource("wrong-path");
  const root = makeRoot("wrong-path");
  const result = runFetch(root, pinFor(source, { gamesPath: "build/elsewhere" }));
  equal(result.status, 1, result.output);
  match(result.stderr, /"demo".*"Basic"/);
  ok(!existsSync(legacyOf(root)));
  deepEqual(stagingLeft(root), []);
});

test("matrix: a game that is missing leaves an earlier good folder untouched", () => {
  const good = makeSource("good-then-bad");
  const root = makeRoot("good-then-bad");
  fetchInto(root, good);
  const before = { tree: legacyTree(root), stamp: readFileSync(stampOf(root), "utf8") };

  const files = { ...GAMES };
  for (const path of Object.keys(files)) if (path.startsWith("build/game/Basic/")) delete files[path];
  const bad = makeSource("bad-after-good", files);
  const result = runFetch(root, pinFor(bad));
  equal(result.status, 1, result.output);
  match(result.stderr, /"Basic"/);
  deepEqual(legacyTree(root), before.tree);
  equal(readFileSync(stampOf(root), "utf8"), before.stamp);
  deepEqual(stagingLeft(root), []);
});

// ============================================================== matrix: main file

// A main file with CR, LF, NUL and a high byte: copied byte for byte, never
// converted by the checkout or the copy.
const MAIN_BYTES = Buffer.from([0x47, 0x41, 0x4d, 0x0d, 0x0a, 0x00, 0x7f]);

const MAIN = { mainPath: "build/main", mainFiles: ["demo.gam"] };

test("matrix: a pin with a main file copies it into the game folder, counts it and stamps it", () => {
  const files = { ...GAMES, "build/main/demo.gam": MAIN_BYTES };
  const source = makeSource("main", files);
  const root = makeRoot("main");
  const result = runFetch(root, pinFor(source, MAIN));
  equal(result.status, 0, result.output);
  equal(result.stdout, "demo: 4 files\nBasic: 2 files\nfetched\n");
  equal(result.stderr, "");
  deepEqual(legacyTree(root), expectedTree(files, GAME_NAMES, MAIN));
  ok(readFileSync(join(legacyOf(root), "demo", "demo.gam")).equals(MAIN_BYTES));
  deepEqual(JSON.parse(readFileSync(stampOf(root), "utf8")), {
    url: source.dir,
    rev: source.rev,
    gamesPath: "build/game",
    games: { demo: { files: 4 }, Basic: { files: 2 } },
    mainPath: "build/main",
    mainFiles: ["demo.gam"],
  });
  deepEqual(stagingLeft(root), []);
});

test("matrix: a rerun with a main file is cached and runs no git command", posixOnly, () => {
  const files = { ...GAMES, "build/main/demo.gam": MAIN_BYTES };
  const source = makeSource("main-cache", files);
  const root = makeRoot("main-cache");
  const pin = pinFor(source, MAIN);
  const first = runFetch(root, pin);
  equal(first.status, 0, first.output);
  rmSync(source.dir, { recursive: true, force: true });

  const before = { tree: legacyTree(root), stamp: readFileSync(stampOf(root), "utf8") };
  const stub = makeStub("main-cache");
  const second = runFetch(root, pin, { env: stub.env });
  equal(second.status, 0, second.output);
  equal(second.stdout, "demo: 4 files\nBasic: 2 files\ncached\n");
  equal(second.stderr, "");
  deepEqual(stub.calls(), []);
  deepEqual(legacyTree(root), before.tree);
  equal(readFileSync(stampOf(root), "utf8"), before.stamp);
});

test("matrix: a changed or dropped main file list is a cache miss and the old file is gone", () => {
  const files = { ...GAMES, "build/main/demo.gam": "demo main\n", "build/main/Basic.gam": "basic main\n" };
  const source = makeSource("main-list", files);
  const root = makeRoot("main-list");
  const first = runFetch(root, pinFor(source, { mainPath: "build/main", mainFiles: ["demo.gam"] }));
  equal(first.status, 0, first.output);
  ok(existsSync(join(legacyOf(root), "demo", "demo.gam")));

  const changed = runFetch(root, pinFor(source, { mainPath: "build/main", mainFiles: ["Basic.gam"] }));
  equal(changed.status, 0, changed.output);
  match(changed.stdout, /^fetched$/m);
  ok(!existsSync(join(legacyOf(root), "demo", "demo.gam")), "the old main file is gone");
  ok(existsSync(join(legacyOf(root), "Basic", "Basic.gam")));

  const dropped = runFetch(root, pinFor(source));
  equal(dropped.status, 0, dropped.output);
  equal(dropped.stdout, "demo: 3 files\nBasic: 2 files\nfetched\n");
  ok(!existsSync(join(legacyOf(root), "Basic", "Basic.gam")), "the copied main file is gone");
});

test("matrix: a main file absent at the pinned revision exits 1 naming it and leaves an earlier good folder untouched", () => {
  const good = makeSource("main-good-then-missing", { ...GAMES, "build/main/demo.gam": MAIN_BYTES });
  const root = makeRoot("main-good-then-missing");
  const first = runFetch(root, pinFor(good, MAIN));
  equal(first.status, 0, first.output);
  const before = { tree: legacyTree(root), stamp: readFileSync(stampOf(root), "utf8") };

  const bad = makeSource("main-missing", GAMES);
  const result = runFetch(root, pinFor(bad, MAIN));
  equal(result.status, 1, result.output);
  equal(result.stdout, "");
  match(result.stderr, /main file missing at [0-9a-f]{40}/);
  ok(result.stderr.includes('"demo.gam"'), result.stderr);
  ok(result.stderr.includes("build/main/demo.gam"), result.stderr);
  deepEqual(legacyTree(root), before.tree);
  equal(readFileSync(stampOf(root), "utf8"), before.stamp);
  deepEqual(stagingLeft(root), []);
});

test("matrix: a game folder that already holds a file with the main file's name exits 1 naming it", () => {
  const files = { ...GAMES, "build/main/demo.gam": MAIN_BYTES, "build/game/demo/demo.gam": "the corpus file\n" };
  const source = makeSource("main-collision", files);
  const root = makeRoot("main-collision");
  const result = runFetch(root, pinFor(source, MAIN));
  equal(result.status, 1, result.output);
  equal(result.stdout, "");
  match(result.stderr, /main file collides with the game corpus/);
  ok(result.stderr.includes('"demo.gam"'), result.stderr);
  ok(result.stderr.includes("build/game/demo/demo.gam"), result.stderr);
  ok(!existsSync(legacyOf(root)));
  deepEqual(stagingLeft(root), []);
});

// ============================================================= matrix: fetch fails

test("matrix: a rev absent from the source exits 1 naming git fetch; an earlier good folder is untouched", () => {
  const source = makeSource("absent-rev");
  const root = makeRoot("absent-rev");
  fetchInto(root, source);
  const before = { tree: legacyTree(root), stamp: readFileSync(stampOf(root), "utf8") };

  const result = runFetch(root, writePin(source.dir, "a".repeat(40)));
  equal(result.status, 1, result.output);
  equal(result.stdout, "");
  match(result.stderr, /tools\/fixtures\/fetch\.mjs: git fetch failed \(exit \d+\)/);
  deepEqual(legacyTree(root), before.tree);
  equal(readFileSync(stampOf(root), "utf8"), before.stamp);
  deepEqual(stagingLeft(root), []);
});

test("matrix: an unreachable source exits 1 naming git fetch and leaves no staging", () => {
  const root = makeRoot("unreachable");
  const missing = join(makeDir("nowhere"), "gone");
  const result = runFetch(root, writePin(missing, "b".repeat(40)));
  equal(result.status, 1, result.output);
  match(result.stderr, /git fetch failed \(exit \d+\)/);
  ok(!existsSync(legacyOf(root)));
  deepEqual(stagingLeft(root), []);
});

test("matrix: no git on PATH exits 1 naming the git step and leaves nothing behind", () => {
  const source = makeSource("no-git");
  const root = makeRoot("no-git");
  const result = runFetch(root, pinFor(source), { env: { ...gitEnv, PATH: makeDir("empty-path") } });
  equal(result.status, 1, result.output);
  equal(result.stdout, "");
  match(result.stderr, /tools\/fixtures\/fetch\.mjs: git --version failed: cannot run git \(ENOENT\)/);
  ok(!existsSync(legacyOf(root)));
  deepEqual(stagingLeft(root), []);
});

test("matrix: git older than 2.25 exits 1 with the version found and runs no other command", posixOnly, () => {
  const source = makeSource("old-git");
  const root = makeRoot("old-git");
  const stub = makeStub(
    "old",
    `case "$1" in --version) echo 'git version 2.24.1'; exit 0;; esac\necho 'stub git: unexpected call' >&2\nexit 99`,
  );
  const result = runFetch(root, pinFor(source), { env: stub.env });
  equal(result.status, 1, result.output);
  equal(result.stdout, "");
  match(result.stderr, /git --version failed: found "git version 2\.24\.1", but the fetch needs git >= 2\.25/);
  deepEqual(stub.calls(), ["--version"]);
  ok(!existsSync(legacyOf(root)));
  deepEqual(stagingLeft(root), []);
});

test("a git that prints no version is a named error", posixOnly, () => {
  const source = makeSource("odd-git");
  const root = makeRoot("odd-git");
  const stub = makeStub("odd", `case "$1" in --version) echo 'something else'; exit 0;; esac`);
  const result = runFetch(root, pinFor(source), { env: stub.env });
  equal(result.status, 1, result.output);
  match(result.stderr, /git --version failed: cannot read a version from "something else"/);
});

test("a fetched commit other than the pinned rev is refused", posixOnly, () => {
  const source = makeSource("wrong-head");
  const root = makeRoot("wrong-head");
  const stub = makeStub(
    "wrong-head",
    `for arg in "$@"; do if [ "$arg" = 'FETCH_HEAD^{commit}' ]; then echo ${"b".repeat(40)}; exit 0; fi; done`,
  );
  const result = runFetch(root, pinFor(source), { env: stub.env });
  equal(result.status, 1, result.output);
  match(result.stderr, /git rev-parse FETCH_HEAD failed: fetched commit b{40}, but the pin names [0-9a-f]{40}/);
  ok(!stub.calls().some((call) => call.includes(" checkout ")));
  ok(!existsSync(legacyOf(root)));
  deepEqual(stagingLeft(root), []);
});

// ====================================================== matrix: project repo untouched

test("matrix: a fetch leaves the project's HEAD, index, config and files as they were", () => {
  const source = makeSource("untouched");
  const root = makeRoot("untouched");
  const before = snapshot(root);
  fetchInto(root, source);
  assertProjectUntouched(root, before);
});

test("matrix: a fetch that fails leaves the project's HEAD, index, config and files as they were", () => {
  const source = makeSource("untouched-fail");
  const root = makeRoot("untouched-fail");
  const before = snapshot(root);
  const result = runFetch(root, writePin(source.dir, "d".repeat(40)));
  equal(result.status, 1, result.output);
  assertProjectUntouched(root, before);

  const empty = makeSource("untouched-empty", { "README.txt": "no games here\n" });
  const missing = runFetch(root, pinFor(empty));
  equal(missing.status, 1, missing.output);
  assertProjectUntouched(root, before);
});

test("matrix: GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE, GIT_COMMON_DIR and friends in the environment cannot aim git at the project", () => {
  const source = makeSource("hostile-env");
  const root = makeRoot("hostile-env");
  const before = snapshot(root);
  const gitDir = join(root, ".git");
  const env = {
    ...gitEnv,
    GIT_DIR: gitDir,
    GIT_WORK_TREE: root,
    GIT_INDEX_FILE: join(gitDir, "index"),
    GIT_COMMON_DIR: gitDir,
    GIT_OBJECT_DIRECTORY: join(gitDir, "objects"),
    GIT_PREFIX: "",
  };
  const result = runFetch(root, pinFor(source), { env });
  equal(result.status, 0, result.output);
  match(result.stdout, /^fetched$/m);
  deepEqual(legacyTree(root), expectedTree(GAMES));
  assertProjectUntouched(root, before);
});

test("matrix: a staging repository that reports another work tree stops before sparse-checkout and checkout", posixOnly, () => {
  const source = makeSource("wrong-toplevel");
  const root = makeRoot("wrong-toplevel");
  const before = snapshot(root);
  const stub = makeStub(
    "toplevel",
    `for arg in "$@"; do if [ "$arg" = '--show-toplevel' ]; then echo '/not/the/staging/folder'; exit 0; fi; done`,
  );
  const result = runFetch(root, pinFor(source), { env: stub.env });
  equal(result.status, 1, result.output);
  match(result.stderr, /git rev-parse --show-toplevel failed: git reports the work tree "\/not\/the\/staging\/folder"/);
  const calls = stub.calls();
  ok(calls.some((call) => call.includes(" init ")), calls.join("\n"));
  ok(!calls.some((call) => / (sparse-checkout|checkout|fetch|remote) /.test(call)), calls.join("\n"));
  ok(!existsSync(legacyOf(root)));
  deepEqual(stagingLeft(root), []);
  assertProjectUntouched(root, before);
});

test("every git call names the staging repository and puts -- before the url", posixOnly, () => {
  const source = makeSource("argv");
  const root = makeRoot("argv");
  const stub = makeStub("argv");
  const result = runFetch(root, pinFor(source), { env: stub.env });
  equal(result.status, 0, result.output);
  const [version, ...calls] = stub.calls();
  equal(version, "--version");
  ok(calls.length >= 8, calls.join("\n"));
  for (const call of calls) {
    match(call, /^--git-dir=\S+\/fixtures\/\.staging-\d+\/git --work-tree=\S+\/fixtures\/\.staging-\d+\/tree /, call);
    ok(call.includes("core.autocrlf=false"), call);
  }
  ok(calls.some((call) => call.endsWith(` remote add -- origin ${source.dir}`)), calls.join("\n"));
});

// ======================================================= matrix: interrupted earlier run

test("matrix: stale staging folders are removed and the fetch succeeds", () => {
  const source = makeSource("stale");
  const root = makeRoot("stale");
  writeFile(join(root, "fixtures", ".staging-1", "tree", "junk.txt"), "left by a crash\n");
  writeFile(join(root, "fixtures", ".staging-424242", "git", "HEAD"), "ref: refs/heads/main\n");
  writeFile(join(root, "fixtures", "keep", "me.txt"), "not ours\n");
  const result = runFetch(root, pinFor(source));
  equal(result.status, 0, result.output);
  match(result.stdout, /^fetched$/m);
  deepEqual(readdirSync(join(root, "fixtures")).sort(), ["keep", "legacy"]);
  deepEqual(legacyTree(root), expectedTree(GAMES));
});

// =============================================================== matrix: bad pin file

const GOOD = { gamesPath: "build/game", games: GAME_NAMES };
const badPins = [
  ["rev is a branch", { rev: "master" }, "rev: "],
  ["rev is a tag", { rev: "v1.2.3" }, "rev: "],
  ["rev is a short id", { rev: "9191b91" }, "rev: "],
  ["rev is upper case", { rev: "9191B9191C9BDA0998C6FAAE16929B3331ED2EAD" }, "rev: "],
  ["rev is 41 characters", { rev: "a".repeat(41) }, "rev: "],
  ["rev is not a string", { rev: 7 }, "rev: "],
  ["url is empty", { url: "" }, "url: "],
  ["url starts with -", { url: "--upload-pack=touch /tmp/x" }, "url: "],
  ["url is not a string", { url: ["x"] }, "url: "],
  ["gamesPath is absolute", { gamesPath: "/build/game" }, "gamesPath: "],
  ["gamesPath holds ..", { gamesPath: "build/../game" }, "gamesPath: "],
  ["gamesPath is ..", { gamesPath: ".." }, "gamesPath: "],
  ["gamesPath ends with /", { gamesPath: "build/game/" }, "gamesPath: "],
  ["gamesPath holds a glob", { gamesPath: "build/g*" }, "gamesPath: "],
  ["gamesPath is empty", { gamesPath: "" }, "gamesPath: "],
  ["a game is ..", { games: ["demo", ".."] }, "games[1]: "],
  ["a game holds /", { games: ["demo/sub"] }, "games[0]: "],
  ["a game starts with .", { games: [".hidden"] }, "games[0]: "],
  ["a game holds a glob", { games: ["de*"] }, "games[0]: "],
  ["a game is empty", { games: [""] }, "games[0]: "],
  ["a game is not a string", { games: [3] }, "games[0]: "],
  ["a game is listed twice", { games: ["demo", "demo"] }, "duplicate game"],
  ["a game is listed twice in another case", { games: ["demo", "DEMO"] }, "duplicate game"],
  ["games is empty", { games: [] }, "games: "],
  ["games is a string", { games: "demo" }, "games: "],
  ["mainFiles without mainPath", { mainFiles: ["demo.gam"] }, "mainPath: "],
  ["mainPath without mainFiles", { mainPath: "build/main" }, "mainFiles: "],
  ["mainFiles is empty", { mainPath: "build/main", mainFiles: [] }, "mainFiles: "],
  ["mainPath is absolute", { mainPath: "/build/main", mainFiles: ["demo.gam"] }, "mainPath: "],
  ["mainPath holds ..", { mainPath: "build/../main", mainFiles: ["demo.gam"] }, "mainPath: "],
  ["a main file is a path", { mainPath: "build/main", mainFiles: ["sub/demo.gam"] }, "mainFiles[0]: "],
  ["a main file has the wrong extension", { mainPath: "build/main", mainFiles: ["demo.txt"] }, "mainFiles[0]: "],
  ["a main file names no game", { mainPath: "build/main", mainFiles: ["other.gam"] }, "mainFiles[0]: "],
  ["a main file is listed twice", { mainPath: "build/main", mainFiles: ["demo.gam", "demo.gam"] }, "duplicate main file"],
  ["a main file starts with .", { mainPath: "build/main", mainFiles: [".demo.gam"] }, "mainFiles[0]: "],
  ["a main file is not a string", { mainPath: "build/main", mainFiles: [7] }, "mainFiles[0]: "],
  ["an unknown key", { extra: true }, 'unknown key "extra"'],
];

test("matrix: every bad pin exits 1 naming the field, before any git call", posixOnly, () => {
  const source = makeSource("bad-pin");
  const root = makeRoot("bad-pin");
  const stub = makeStub("bad-pin");
  for (const [label, overrides, expected] of badPins) {
    const pin = writePin(source.dir, source.rev, overrides);
    const result = runFetch(root, pin, { env: stub.env });
    equal(result.status, 1, `${label}: ${result.output}`);
    equal(result.stdout, "", label);
    ok(result.stderr.includes(`tools/fixtures/fetch.mjs: invalid pin ${pin}: `), `${label}: ${result.stderr}`);
    ok(result.stderr.includes(expected), `${label}: ${result.stderr}`);
    throws(() => loadSources(pin), (error) => error instanceof SourcesError && error.message.includes(expected), label);
  }
  deepEqual(stub.calls(), []);
  ok(!existsSync(join(root, "fixtures")));
});

test("matrix: a pin missing a key names the key", () => {
  const source = makeSource("missing-key");
  for (const key of ["url", "rev", "gamesPath", "games"]) {
    const pin = { url: source.dir, rev: source.rev, ...GOOD };
    delete pin[key];
    const file = join(makeDir("pin"), "sources.json");
    writeFileSync(file, JSON.stringify(pin));
    const result = runFetch(makeRoot("missing-key"), file);
    equal(result.status, 1, `${key}: ${result.output}`);
    ok(result.stderr.includes(`invalid pin ${file}: ${key}: `), `${key}: ${result.stderr}`);
  }
});

test("matrix: a missing, non-JSON or non-object pin file exits 1 naming the file", () => {
  const root = makeRoot("pin-file");
  const dir = makeDir("pin-file");

  const missing = join(dir, "nope.json");
  const absent = runFetch(root, missing);
  equal(absent.status, 1, absent.output);
  ok(absent.stderr.includes(`invalid pin ${missing}: cannot read the pin file`), absent.stderr);

  for (const [label, text, expected] of [
    ["not JSON", "{ rev: nope", "is not valid JSON"],
    ["empty", "", "is not valid JSON"],
    ["null", "null", "the pin must be a JSON object"],
    ["an array", "[]", "the pin must be a JSON object"],
    ["a string", '"x"', "the pin must be a JSON object"],
  ]) {
    const file = join(dir, `${label.replace(/\W/g, "-")}.json`);
    writeFileSync(file, text);
    const result = runFetch(root, file);
    equal(result.status, 1, `${label}: ${result.output}`);
    ok(result.stderr.includes(`invalid pin ${file}: `) && result.stderr.includes(expected), `${label}: ${result.stderr}`);
  }
  ok(!existsSync(join(root, "fixtures")));
});

test("matrix: every defect in a pin is named, not only the first", () => {
  const source = makeSource("many-defects");
  const root = makeRoot("many-defects");
  const result = runFetch(root, writePin(source.dir, "main", { url: "-x", gamesPath: "/abs", games: ["..", ".."] }));
  equal(result.status, 1, result.output);
  for (const field of ["url: ", "rev: ", "gamesPath: ", "games[0]: "]) ok(result.stderr.includes(field), result.stderr);
});

test("the committed pin is valid and names demo and Basic", () => {
  const pin = loadSources(committedPin);
  ok(pin.games.includes("demo") && pin.games.includes("Basic"), pin.games.join(", "));
  match(pin.rev, /^[0-9a-f]{40}$/);
  match(pin.url, /^https:\/\//);
  ok(!pin.gamesPath.startsWith("/") && !pin.gamesPath.split("/").includes(".."));
  equal(pin.mainPath, "build/main");
  deepEqual(pin.mainFiles, ["demo.gam"]);
  equal(
    JSON.stringify(Object.keys(JSON.parse(readFileSync(committedPin, "utf8")))),
    '["url","rev","gamesPath","games","mainPath","mainFiles"]',
  );
});

// ================================================================ matrix: bad CLI use

test("matrix: fetch rejects unknown flags, a second root, --sources without a value and a missing root", () => {
  const root = makeRoot("cli");
  const pin = pinFor(makeSource("cli"));
  const cases = [
    [[root, "--sources", pin, "--fix", "--bogus"], "tools/fixtures/fetch.mjs: unknown flag(s): --fix, --bogus"],
    [[root, makeRoot("cli-two"), "--sources", pin], /expected at most one root argument, got ".*", ".*"/],
    [[root, "--sources"], "--sources needs a pin file argument"],
    [[root, "--sources", "--other"], "--sources needs a pin file argument"],
    [[root, "--sources", pin, "--sources", pin], "--sources given more than once"],
    [[join(root, "does-not-exist"), "--sources", pin], /root directory .*does-not-exist does not exist/],
    [[join(root, "README.txt"), "--sources", pin], /root .*README\.txt is not a directory/],
  ];
  for (const [args, expected] of cases) {
    const result = run(fetchTool, args);
    equal(result.status, 1, `${args.join(" ")}: ${result.output}`);
    equal(result.stdout, "", args.join(" "));
    if (typeof expected === "string") ok(result.stderr.includes(expected), `${args.join(" ")}: ${result.stderr}`);
    else match(result.stderr, expected);
  }
  ok(!existsSync(join(root, "fixtures")));
});

test("matrix: check rejects unknown flags, a second root and a missing root", () => {
  const root = makeRoot("cli-check");
  const cases = [
    [[root, "--fix"], "tools/fixtures/check.mjs: unknown flag(s): --fix"],
    [[root, makeRoot("cli-check-two")], /expected at most one root argument, got ".*", ".*"/],
    [[join(root, "does-not-exist")], /root directory .*does-not-exist does not exist/],
    [[join(root, "README.txt")], /root .*README\.txt is not a directory/],
  ];
  for (const [args, expected] of cases) {
    const result = run(checkTool, args);
    equal(result.status, 1, `${args.join(" ")}: ${result.output}`);
    equal(result.stdout, "", args.join(" "));
    if (typeof expected === "string") ok(result.stderr.includes(expected), `${args.join(" ")}: ${result.stderr}`);
    else match(result.stderr, expected);
  }
});

test("the root is optional: without one the fetch stops at a bad pin before touching this repository", () => {
  const before = existsSync(join(repoRoot, "fixtures"));
  const result = run(fetchTool, ["--sources", join(makeDir("no-root"), "missing.json")]);
  equal(result.status, 1, result.output);
  match(result.stderr, /invalid pin .*missing\.json: cannot read the pin file/);
  equal(existsSync(join(repoRoot, "fixtures")), before);
});

test("importing the tools has no side effects", () => {
  const cwd = makeDir("import");
  for (const tool of [fetchTool, checkTool]) {
    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", `await import(${JSON.stringify(pathToFileURL(tool).href)});`],
      { encoding: "utf8", cwd, env: gitEnv },
    );
    equal(result.status, 0, result.stderr);
    equal(result.stdout, "");
    equal(result.stderr, "");
  }
  deepEqual(readdirSync(cwd), []);
});

// ============================================================== matrix: symlinked path

test("matrix: the fetch CLI runs, and fetches, when invoked through a symlinked directory", (t) => {
  const parent = makeDir("link-parent");
  const link = join(parent, "fixtures-link");
  try {
    symlinkSync(dirname(fetchTool), link, "dir");
  } catch (error) {
    t.skip(`cannot create symlinks here: ${error.message}`);
    return;
  }
  const source = makeSource("symlinked-tool");
  const root = makeRoot("symlinked-tool");
  const result = runFetch(root, pinFor(source), { script: join(link, "fetch.mjs") });
  equal(result.status, 0, result.output);
  equal(result.stdout, "demo: 3 files\nBasic: 2 files\nfetched\n");
  deepEqual(legacyTree(root), expectedTree(GAMES));
});

test("matrix: the check CLI runs when invoked through a symlinked directory", (t) => {
  const parent = makeDir("link-parent-check");
  const link = join(parent, "fixtures-link");
  try {
    symlinkSync(dirname(checkTool), link, "dir");
  } catch (error) {
    t.skip(`cannot create symlinks here: ${error.message}`);
    return;
  }
  const root = makeRoot("symlinked-check");
  const result = run(join(link, "check.mjs"), [root]);
  equal(result.status, 0, result.output);
  match(result.stdout, /^0 tracked files under fixtures\/$/m);
});

test("matrix: a project root reached through a symlink fetches like the real path", (t) => {
  const root = makeRoot("symlinked-root");
  const link = join(makeDir("root-link"), "project-link");
  try {
    symlinkSync(root, link, "dir");
  } catch (error) {
    t.skip(`cannot create symlinks here: ${error.message}`);
    return;
  }
  const source = makeSource("symlinked-root");
  const first = runFetch(link, pinFor(source));
  equal(first.status, 0, first.output);
  match(first.stdout, /^fetched$/m);
  deepEqual(legacyTree(root), expectedTree(GAMES));
  const second = runFetch(link, pinFor(source));
  equal(second.status, 0, second.output);
  match(second.stdout, /^cached$/m);
  equal(git(root, "status", "--porcelain"), "");
  const checked = runCheck(link);
  equal(checked.status, 0, checked.output);
});

// ================================================================== matrix: the check

test("matrix: check passes with fetched files untracked and tracked folders named fixtures elsewhere", () => {
  const source = makeSource("check-pass");
  const root = makeRoot("check-pass");
  fetchInto(root, source);
  writeFile(join(root, "packages", "a", "test", "fixtures", "x"), "x\n");
  writeFile(join(root, "tools", "fixtures", "y"), "y\n");
  git(root, "add", "--all");
  git(root, "commit", "--quiet", "--message", "tracked folders named fixtures");
  ok(git(root, "ls-files").includes("packages/a/test/fixtures/x"));

  const result = runCheck(root);
  equal(result.status, 0, result.output);
  equal(result.stderr, "");
  match(result.stdout, /^0 tracked files under fixtures\/$/m);
  match(result.stdout, /fixtures\/ is ignored by \/fixtures\//);
});

test("matrix: check passes in a fresh work tree before any fetch", () => {
  const result = runCheck(makeRoot("check-fresh"));
  equal(result.status, 0, result.output);
  match(result.stdout, /^0 tracked files under fixtures\/$/m);
});

test("matrix: a force-added fixture file exits 1 naming the file", () => {
  const root = makeRoot("check-tracked");
  writeFile(join(root, "fixtures", "legacy", "demo", "x"), "x\n");
  git(root, "add", "--force", "fixtures/legacy/demo/x");
  const staged = runCheck(root);
  equal(staged.status, 1, staged.output);
  match(staged.stdout, /^1 tracked file under fixtures\/$/m);
  ok(staged.stderr.includes("fixtures/legacy/demo/x: tracked by git"), staged.stderr);

  git(root, "commit", "--quiet", "--message", "committed by mistake");
  const committed = runCheck(root);
  equal(committed.status, 1, committed.output);
  ok(committed.stderr.includes("fixtures/legacy/demo/x: tracked by git"), committed.stderr);
});

test("matrix: every tracked fixture file is listed, names with a space included", () => {
  const root = makeRoot("check-many");
  for (const path of ["fixtures/a.txt", "fixtures/legacy/demo/my map.bin", "fixtures/legacy/Basic/z"]) {
    writeFile(join(root, path), "x\n");
    git(root, "add", "--force", path);
  }
  const result = runCheck(root);
  equal(result.status, 1, result.output);
  match(result.stdout, /^3 tracked files under fixtures\/$/m);
  for (const path of ["fixtures/a.txt", "fixtures/legacy/demo/my map.bin", "fixtures/legacy/Basic/z"]) {
    ok(result.stderr.includes(`${path}: tracked by git`), result.stderr);
  }
});

test("matrix: a lost or unanchored ignore rule exits 1 naming the rule", () => {
  const variants = [
    ["no .gitignore", null, /fixtures\/ is not ignored: .*\/fixtures\//],
    ["an empty .gitignore", "", /fixtures\/ is not ignored: .*\/fixtures\//],
    ["a narrower rule", "/fixtures/legacy/\n", /fixtures\/ is not ignored: .*\/fixtures\//],
    ["an unanchored rule", "fixtures/\n", /the ignore rule is not anchored: .*:1:fixtures\/ also ignores tools\/fixtures\/probe; the rule must be \/fixtures\//],
    ["a glob rule", "**/fixtures/\n", /the ignore rule is not anchored: .* also ignores tools\/fixtures\/probe/],
    ["a negated rule", "/fixtures/\n!/fixtures/\n", /fixtures\/ is not ignored: .*\/fixtures\//],
  ];
  for (const [label, text, expected] of variants) {
    const root = makeRoot("check-ignore");
    if (text === null) rmSync(join(root, ".gitignore"));
    else writeFileSync(join(root, ".gitignore"), text);
    const result = runCheck(root);
    equal(result.status, 1, `${label}: ${result.output}`);
    match(result.stderr, expected, label);
    match(result.stdout, /^0 tracked files under fixtures\/$/m, label);
  }
});

test("matrix: a root without .git exits 1", () => {
  const root = makeDir("check-no-git");
  writeFile(join(root, "README.txt"), "not a repository\n");
  const result = runCheck(root);
  equal(result.status, 1, result.output);
  equal(result.stdout, "");
  match(result.stderr, /tools\/fixtures\/check\.mjs: root .* is not (a git work tree|the top level of a git work tree)/);
});

test("matrix: a root that is a folder inside a work tree exits 1 naming the top level", () => {
  const outer = makeRoot("check-inner");
  const inner = join(outer, "inner");
  mkdirSync(inner);
  const result = runCheck(inner);
  equal(result.status, 1, result.output);
  match(result.stderr, /is not the top level of a git work tree \(the top level is /);
});

test("matrix: a bare repository is not a work tree", () => {
  const bare = makeDir("check-bare");
  git(bare, "init", "--quiet", "--bare");
  const result = runCheck(bare);
  equal(result.status, 1, result.output);
  match(result.stderr, /root .* is not a git work tree/);
});

test("the check names no git on PATH", () => {
  const result = runCheck(makeRoot("check-no-git-binary"), [], { ...gitEnv, PATH: makeDir("empty-path") });
  equal(result.status, 1, result.output);
  match(result.stderr, /git rev-parse failed: cannot run git \(ENOENT\)/);
});

test("the check ignores GIT_DIR and friends in the environment", () => {
  const clean = makeRoot("check-env-clean");
  const dirty = makeRoot("check-env-dirty");
  writeFile(join(dirty, "fixtures", "legacy", "demo", "x"), "x\n");
  git(dirty, "add", "--force", "fixtures/legacy/demo/x");
  const result = runCheck(clean, [], {
    ...gitEnv,
    GIT_DIR: join(dirty, ".git"),
    GIT_WORK_TREE: dirty,
    GIT_INDEX_FILE: join(dirty, ".git", "index"),
  });
  equal(result.status, 0, result.output);
  match(result.stdout, /^0 tracked files under fixtures\/$/m);
});

test("checkFixtures returns the tracked paths and the problems", () => {
  const root = makeRoot("check-api");
  writeFile(join(root, "fixtures", "legacy", "x"), "x\n");
  git(root, "add", "--force", "fixtures/legacy/x");
  writeFileSync(join(root, ".gitignore"), "fixtures/\n");
  const result = checkFixtures(root);
  deepEqual(result.tracked, ["fixtures/legacy/x"]);
  equal(result.problems.length, 2, result.problems.join("\n"));
  ok(result.problems.every((problem) => problem.includes("not anchored")), result.problems.join("\n"));
});
