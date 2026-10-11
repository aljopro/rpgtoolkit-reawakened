// Tests for tools/no-skips/run.mjs (the golden job's no-skips guard). The TAP
// literal below is the real output of `node --test --test-reporter=tap` over a
// file with a pass, a skip with a reason, a todo and a failure. The CLI cases
// each build a tiny `*.test.mjs` in a temp directory and run the tool over it,
// with NODE_TEST_CONTEXT removed from the environment so the nested runner is
// not mistaken for a child of this file's own runner.
import { after, test } from "node:test";
import { deepEqual, equal, match, ok } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseTap } from "../run.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const noSkipsTool = resolve(here, "..", "run.mjs");

// ------------------------------------------------------------------- helpers

const scratch = [];
after(() => {
  for (const directory of scratch) rmSync(directory, { recursive: true, force: true });
});

function makeDir(label) {
  const directory = mkdtempSync(join(tmpdir(), `no-skips-${label}-`));
  scratch.push(directory);
  return directory;
}

// A child environment without NODE_TEST_CONTEXT: this file runs under
// `node --test`, which sets it, and the nested runner must not inherit it.
function cleanEnv() {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  return env;
}

function runTool(root, patterns) {
  const result = spawnSync(process.execPath, [noSkipsTool, "--root", root, ...patterns], {
    encoding: "utf8",
    env: cleanEnv(),
  });
  result.output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  return result;
}

// Real TAP from `node --test --test-reporter=tap` over a pass, a skip, a todo
// and a failure.
const TAP = `TAP version 13
# Subtest: passes one
ok 1 - passes one
  ---
  duration_ms: 0.380167
  type: 'test'
  ...
# Subtest: is skipped
ok 2 - is skipped # SKIP no fixtures here
  ---
  duration_ms: 0.053917
  type: 'test'
  ...
# Subtest: is a todo
ok 3 - is a todo # TODO later
  ---
  duration_ms: 0.049875
  type: 'test'
  ...
# Subtest: fails one
not ok 4 - fails one
  ---
  duration_ms: 0.442291
  type: 'test'
  location: '/private/tmp/noskips-probe/a.test.mjs:6:1'
  failureType: 'testCodeFailure'
  error: |-
    Expected values to be strictly equal:

    1 !== 2

  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: 2
  actual: 1
  operator: 'strictEqual'
  stack: |-
    TestContext.<anonymous> (file:///private/tmp/noskips-probe/a.test.mjs:6:27)
    Test.runInAsyncScope (node:async_hooks:226:14)
    Test.run (node:internal/test_runner/test:1402:25)
  ...
1..4
# tests 4
# suites 0
# pass 1
# fail 1
# cancelled 0
# skipped 1
# todo 1
# duration_ms 55.621208
`;

// ================================================================ parseTap

test("parseTap reads the counts and the skipped names from real TAP", () => {
  deepEqual(parseTap(TAP), {
    tests: 4,
    pass: 1,
    fail: 1,
    cancelled: 0,
    skipped: 1,
    todo: 1,
    skippedNames: [
      { name: "is skipped", reason: "no fixtures here" },
      { name: "is a todo", reason: "later" },
    ],
  });
});

test("parseTap returns zeros for empty text", () => {
  deepEqual(parseTap(""), {
    tests: 0,
    pass: 0,
    fail: 0,
    cancelled: 0,
    skipped: 0,
    todo: 0,
    skippedNames: [],
  });
});

test("parseTap reads a skipped subtest from an indented line", () => {
  const counts = parseTap("    ok 2 - inner skip # SKIP why\n# tests 1\n# skipped 1\n");
  equal(counts.skipped, 1);
  deepEqual(counts.skippedNames, [{ name: "inner skip", reason: "why" }]);
});

// ====================================================================== CLI

test("the tool passes and prints the totals when every test runs", () => {
  const root = makeDir("pass");
  writeFileSync(
    join(root, "pass.test.mjs"),
    "import { test } from 'node:test';\nimport { equal } from 'node:assert/strict';\ntest('one', () => equal(1, 1));\ntest('two', () => equal(2, 2));\n",
  );
  const result = runTool(root, ["*.test.mjs"]);
  equal(result.status, 0, result.output);
  match(result.stdout, /no skipped tests: 2 tests, 2 passed/);
});

test("the tool fails naming a skipped test and its reason", () => {
  const root = makeDir("skip");
  writeFileSync(
    join(root, "skip.test.mjs"),
    "import { test } from 'node:test';\ntest('needs fixtures', { skip: 'the fixtures are absent' }, () => {});\n",
  );
  const result = runTool(root, ["*.test.mjs"]);
  equal(result.status, 1, result.output);
  match(
    result.stderr,
    /tools\/no-skips\/run\.mjs: 1 test\(s\) skipped or todo; the golden job must run every test/,
  );
  ok(result.stderr.includes("needs fixtures"), result.stderr);
  ok(result.stderr.includes("the fixtures are absent"), result.stderr);
});

test("the tool fails when a test fails", () => {
  const root = makeDir("fail");
  writeFileSync(
    join(root, "fail.test.mjs"),
    "import { test } from 'node:test';\nimport { equal } from 'node:assert/strict';\ntest('broken', () => equal(1, 2));\n",
  );
  const result = runTool(root, ["*.test.mjs"]);
  equal(result.status, 1, result.output);
  ok(!result.stdout.includes("no skipped tests"), result.output);
});

test("the tool fails saying no test ran when a directory holds none", () => {
  const root = makeDir("empty");
  const result = runTool(root, ["*.test.mjs"]);
  equal(result.status, 1, result.output);
  match(result.stderr, /tools\/no-skips\/run\.mjs: no test ran/);
});
