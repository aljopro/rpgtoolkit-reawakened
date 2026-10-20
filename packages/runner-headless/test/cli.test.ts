import { equal, ok } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { main } from "../src/index.ts";

const TEST_FILE_PATH = fileURLToPath(import.meta.url);
const PACKAGE_ROOT = dirname(dirname(TEST_FILE_PATH));
const REPO_ROOT = dirname(dirname(PACKAGE_ROOT));
const CLI_PATH = join(PACKAGE_ROOT, "dist/cli.js");

function runCli(
  args: string[],
  options?: { cwd?: string; executable?: string },
) {
  const exe = options?.executable ?? CLI_PATH;
  const result = spawnSync(process.execPath, [exe, ...args], {
    encoding: "utf8",
    cwd: options?.cwd,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function createTempGoldenRoot(options?: {
  readonly committedGolden?: boolean;
}): {
  root: string;
  cleanup: () => void;
} {
  const root = mkdtempSync(join(tmpdir(), "rpg-headless-test-"));
  const goldenDir = join(root, "golden");
  const testDoubleDir = join(goldenDir, "test-double");
  mkdirSync(testDoubleDir, { recursive: true });

  copyFileSync(
    join(REPO_ROOT, "golden/hash-vectors.json"),
    join(goldenDir, "hash-vectors.json"),
  );
  copyFileSync(
    join(REPO_ROOT, "golden/test-double/run.json"),
    join(testDoubleDir, "run.json"),
  );
  if (options?.committedGolden === true) {
    copyFileSync(
      join(REPO_ROOT, "golden/test-double/golden.json"),
      join(testDoubleDir, "golden.json"),
    );
  }

  return {
    root,
    cleanup: () => {
      rmSync(root, { recursive: true, force: true });
    },
  };
}

test("replays the committed test-double golden through the CLI", () => {
  // The full committed tree (scenes, closing frames, audio cues) is replayed by
  // `pnpm golden` in the `golden` CI job. Repeating it here made every
  // `pnpm test` pay the whole G5 suite; this root carries only the committed
  // test-double so the CLI's replay path is still covered end to end.
  const temp = createTempGoldenRoot({ committedGolden: true });
  try {
    const result = runCli(["golden", temp.root]);
    equal(result.status, 0, `CLI failed with stderr: ${result.stderr}`);
    ok(result.stdout.includes("vectors: 20 rows ok"));
    ok(result.stdout.includes("run: 24 ticks"));
    ok(result.stdout.includes("batching: 1,3,"));
    ok(result.stdout.includes("golden: 24 compared"));
  } finally {
    temp.cleanup();
  }
});

test("golden differs: state mismatch at tick 7 exits 1 and names tick 7 and state hash", () => {
  const temp = createTempGoldenRoot();
  try {
    const recordResult = runCli(["golden", temp.root, "--record"]);
    equal(recordResult.status, 0);

    const goldenFile = join(temp.root, "golden/test-double/golden.json");
    const goldenContent = readFileSync(goldenFile, "utf8");

    const mutatedGolden = goldenContent.replace(
      /"tick":\s*7,\s*"state":\s*"[0-9a-f]{16}"/,
      '"tick": 7, "state": "0000000000000000"',
    );
    writeFileSync(goldenFile, mutatedGolden, "utf8");

    const result = runCli(["golden", temp.root]);
    equal(result.status, 1);
    ok(result.stdout.includes("vectors: 20 rows ok"));
    ok(result.stdout.includes("run: 24 ticks"));
    ok(result.stdout.includes("batching: 1,3,"));
    ok(result.stderr.includes("tick 7"));
    ok(result.stderr.includes("state hash differs"));
  } finally {
    temp.cleanup();
  }
});

test("golden differs: draw mismatch at tick 7 exits 1 and names tick 7 and draw-list hash", () => {
  const temp = createTempGoldenRoot();
  try {
    const recordResult = runCli(["golden", temp.root, "--record"]);
    equal(recordResult.status, 0);

    const goldenFile = join(temp.root, "golden/test-double/golden.json");
    const goldenContent = readFileSync(goldenFile, "utf8");

    const mutatedGolden = goldenContent.replace(
      /"tick":\s*7,\s*"state":\s*"([0-9a-f]{16})",\s*"draw":\s*"[0-9a-f]{16}"/,
      '"tick": 7, "state": "$1", "draw": "ffffffffffffffff"',
    );
    writeFileSync(goldenFile, mutatedGolden, "utf8");

    const result = runCli(["golden", temp.root]);
    equal(result.status, 1);
    ok(result.stderr.includes("tick 7"));
    ok(result.stderr.includes("draw-list hash differs"));
  } finally {
    temp.cleanup();
  }
});

test("golden differs: extra or missing ticks exit 1", () => {
  const temp = createTempGoldenRoot();
  try {
    const recordResult = runCli(["golden", temp.root, "--record"]);
    equal(recordResult.status, 0);

    const goldenFile = join(temp.root, "golden/test-double/golden.json");
    const golden = JSON.parse(readFileSync(goldenFile, "utf8")) as {
      schema: number;
      records: unknown[];
    };

    const shorter = { schema: golden.schema, records: golden.records.slice(0, -1) };
    writeFileSync(goldenFile, JSON.stringify(shorter), "utf8");
    const missingResult = runCli(["golden", temp.root]);
    equal(missingResult.status, 1);
    ok(missingResult.stderr.includes("the golden lacks"));

    const longer = {
      schema: golden.schema,
      records: [
        ...golden.records,
        { tick: 25, state: "1111222233334444", draw: "5555666677778888" },
      ],
    };
    writeFileSync(goldenFile, JSON.stringify(longer), "utf8");
    const extraResult = runCli(["golden", temp.root]);
    equal(extraResult.status, 1);
    ok(extraResult.stderr.includes("the run lacks"));
  } finally {
    temp.cleanup();
  }
});

test("changed log: mutating a record in run.json exits 1", () => {
  const temp = createTempGoldenRoot();
  try {
    const recordResult = runCli(["golden", temp.root, "--record"]);
    equal(recordResult.status, 0);

    const runFile = join(temp.root, "golden/test-double/run.json");
    const runContent = readFileSync(runFile, "utf8");
    const mutatedRun = runContent.replace(/"code":\s*"KeyA"/, '"code": "KeyZ"');
    writeFileSync(runFile, mutatedRun, "utf8");

    const result = runCli(["golden", temp.root]);
    equal(result.status, 1);
    ok(result.stderr.includes("tick 4"));
  } finally {
    temp.cleanup();
  }
});

test("CLI usage errors report named error to stderr and exit 1", () => {
  const missingSub = runCli([]);
  equal(missingSub.status, 1);
  ok(missingSub.stderr.includes("missing subcommand"));

  const unknownSub = runCli(["foo"]);
  equal(unknownSub.status, 1);
  ok(unknownSub.stderr.includes("unknown subcommand"));
  ok(unknownSub.stderr.includes("foo"));

  const twoRoots = runCli(["golden", "root1", "root2"]);
  equal(twoRoots.status, 1);
  ok(twoRoots.stderr.includes("root2") || twoRoots.stderr.includes("unexpected"));

  const unknownFlag = runCli(["golden", "--unknown"]);
  equal(unknownFlag.status, 1);
  ok(unknownFlag.stderr.includes("unknown flag"));
  ok(unknownFlag.stderr.includes("--unknown"));
});

test("symlink execution runs identically with exit 0", () => {
  const temp = createTempGoldenRoot();
  try {
    const recordResult = runCli(["golden", temp.root, "--record"]);
    equal(recordResult.status, 0);

    const linkPath = join(temp.root, "symlink-cli.js");
    symlinkSync(CLI_PATH, linkPath);

    const result = runCli(["golden", temp.root], { executable: linkPath });
    equal(result.status, 0, `Symlink execution failed: ${result.stderr}`);
    ok(result.stdout.includes("golden: 24 compared"));
  } finally {
    temp.cleanup();
  }
});

test("offline execution in temp root with no fixtures directory exits 0", () => {
  const temp = createTempGoldenRoot();
  try {
    const recordResult = runCli(["golden", temp.root, "--record"]);
    equal(recordResult.status, 0);

    equal(existsSync(join(temp.root, "fixtures")), false);

    const result = runCli(["golden", temp.root]);
    equal(result.status, 0);
    ok(result.stdout.includes("vectors: 20 rows ok"));
    ok(result.stdout.includes("run: 24 ticks"));
    ok(result.stdout.includes("golden: 24 compared"));
  } finally {
    temp.cleanup();
  }
});

test("record mode creates golden.json and passes subsequent replay", () => {
  const temp = createTempGoldenRoot();
  try {
    const goldenPath = join(temp.root, "golden/test-double/golden.json");
    equal(existsSync(goldenPath), false);

    const recordResult = runCli(["golden", temp.root, "--record"]);
    equal(recordResult.status, 0);
    ok(recordResult.stdout.includes("golden: 24 recorded"));
    equal(existsSync(goldenPath), true);

    const parsed = JSON.parse(readFileSync(goldenPath, "utf8")) as {
      schema: number;
      records: unknown[];
    };
    equal(parsed.schema, 1);
    equal(parsed.records.length, 24);

    const replayResult = runCli(["golden", temp.root]);
    equal(replayResult.status, 0);
    ok(replayResult.stdout.includes("golden: 24 compared"));
  } finally {
    temp.cleanup();
  }
});

test("filesystem error like EISDIR prints named error and exits 1", () => {
  const temp = createTempGoldenRoot();
  try {
    const goldenDirPath = join(temp.root, "golden/test-double/golden.json");
    mkdirSync(goldenDirPath);

    const result = runCli(["golden", temp.root]);
    equal(result.status, 1);
    ok(result.stderr.includes("golden: error:"));
  } finally {
    temp.cleanup();
  }
});

test("main function direct call behaves identically", () => {
  equal(main([]), 1);
  equal(main(["foo"]), 1);
  equal(main(["golden", "--unknown"]), 1);

  const temp = createTempGoldenRoot();
  try {
    equal(main(["golden", temp.root, "--record"]), 0);
    equal(main(["golden", temp.root]), 0);
  } finally {
    temp.cleanup();
  }
});

test("corpus: runs successfully over fetched fixtures", () => {
  const fixturesRoot = join(process.cwd(), "fixtures", "legacy", "demo", "Prg");
  if (!existsSync(fixturesRoot)) return;
  const result = runCli(["corpus"]);
  equal(result.status, 0);
  ok(result.stdout.includes("corpus: 10/10 fetched programs passed"));
});

test("corpus: reports error when fixtures directory is missing", () => {
  const temp = createTempGoldenRoot();
  try {
    const result = runCli(["corpus", join(temp.root, "nonexistent")]);
    equal(result.status, 1);
    ok(result.stderr.includes("fixtures directory not found"));
  } finally {
    temp.cleanup();
  }
});
