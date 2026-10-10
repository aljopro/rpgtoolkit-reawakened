// Proves the guard-rail lint rules (eslint.config.js) and the `PlainData`
// type constraint (packages/core/src/ports/plain-data.ts) actually fire.
//
// The lint fixtures are read as text and linted under a synthetic source path
// so the real flat-config scopes apply (G1 -> src/script, G2/G3 -> src) while
// the fixture folder stays out of a normal `eslint .` run. Each fixture names
// the guard-rail rules it must trigger; a fixture fails the suite if any other
// guard-rail rule fires on it or if an expected one does not.
import { test } from "node:test";
import { equal } from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { ESLint } from "eslint";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "..", "..", "..");
const fixturesDir = join(testDir, "fixtures");

// The rule ids the guard-rail configuration owns (linterOptions and custom rules).
const GUARD_RAIL_RULES: Record<string, true> = {
  "no-restricted-globals": true,
  "no-restricted-imports": true,
  "no-restricted-properties": true,
  "no-restricted-syntax": true,
  "guardrails/no-unmarked-suppression": true,
  "guardrails/no-escaping-relative-import": true,
};

// Each fixture folder is linted as though its files lived in this source folder.
const fixtureScopes: Record<string, string> = {
  core: "packages/core/src",
  script: "packages/core/src/script",
  suppress: "packages/core/src",
};

const LINT_EXTENSIONS: Record<string, true> = {
  ".ts": true,
  ".tsx": true,
  ".mts": true,
  ".cts": true,
};

const sortedJoin = (values: Set<string>): string => [...values].sort().join(",");

test("guard-rail lint rules fire on exactly the fixtures that name them", async () => {
  const eslint = new ESLint({ cwd: repoRoot });
  for (const [group, scope] of Object.entries(fixtureScopes)) {
    const dir = join(fixturesDir, group);
    for (const name of readdirSync(dir)) {
      if (!Object.hasOwn(LINT_EXTENSIONS, extname(name))) {
        continue;
      }
      const label = `${group}/${name}`;
      const code = readFileSync(join(dir, name), "utf8");
      const expected = /expect-rule:\s*([^\s*]+)/.exec(code)?.[1] ?? "";
      equal(expected !== "", true, `${label} is missing an "expect-rule:" marker`);
      const expectedProblem = /expect-problem:\s*(.+)/.exec(code)?.[1]?.trim() ?? "";

      const results = await eslint.lintText(code, {
        filePath: join(repoRoot, scope, `__fixture__${name}`),
      });
      const result = results[0];
      if (result === undefined) {
        throw new Error(`${label} produced no lint result`);
      }

      const reported = new Set<string>();
      for (const message of result.messages) {
        if (message.ruleId !== null && Object.hasOwn(GUARD_RAIL_RULES, message.ruleId)) {
          reported.add(message.ruleId);
        }
      }

      const strayErrors = result.messages.filter(
        (message) =>
          message.severity === 2 &&
          (message.ruleId === null || !Object.hasOwn(GUARD_RAIL_RULES, message.ruleId)),
      );
      equal(
        strayErrors.length,
        0,
        `${label} has unexpected non-guard-rail errors: ${JSON.stringify(strayErrors)}`,
      );

      if (expected === "none") {
        equal(
          reported.size,
          0,
          `${label} should trigger no guard-rail rule, got ${sortedJoin(reported)}`,
        );
      } else {
        const expectedRules = new Set(expected.split(","));
        for (const rule of expectedRules) {
          equal(Object.hasOwn(GUARD_RAIL_RULES, rule), true, `${label} names unknown rule ${rule}`);
        }
        equal(
          sortedJoin(reported),
          sortedJoin(expectedRules),
          `${label} should trigger exactly ${sortedJoin(expectedRules)}`,
        );
      }

      if (expectedProblem !== "") {
        equal(
          result.messages.some((message) => message.message.includes(expectedProblem)),
          true,
          `${label} should report a message containing "${expectedProblem}", got ${JSON.stringify(result.messages.map((message) => message.message))}`,
        );
      }
    }
  }
});

test("the core dependency check covers every runtime dependency section", () => {
  const script = join(repoRoot, "tools", "check-core-deps.mjs");

  const unlisted = spawnSync(
    process.execPath,
    [script, join(fixturesDir, "deps-unlisted")],
    { encoding: "utf8" },
  );
  equal(
    unlisted.status,
    1,
    `an optional/peer dependency outside the allowlist must fail:\n${unlisted.stdout}${unlisted.stderr}`,
  );
  const unlistedOutput = `${unlisted.stdout}${unlisted.stderr}`;
  for (const name of ["left-pad", "fflate"]) {
    equal(
      unlistedOutput.includes(name),
      true,
      `the failure must name the unlisted dependency "${name}":\n${unlistedOutput}`,
    );
  }

  const clean = spawnSync(
    process.execPath,
    [script, join(fixturesDir, "deps-clean")],
    { encoding: "utf8" },
  );
  equal(
    clean.status,
    0,
    `a core with no runtime dependencies must pass:\n${clean.stdout}${clean.stderr}`,
  );
});

test("PlainData rejects values that are not JSON", () => {
  const tsc = createRequire(import.meta.url).resolve("typescript/lib/tsc.js");
  const dir = join(fixturesDir, "plain-data");

  const good = spawnSync(process.execPath, [tsc, "-p", join(dir, "tsconfig.good.json")], {
    encoding: "utf8",
  });
  equal(good.status, 0, `plain-data good fixture should typecheck:\n${good.stdout}${good.stderr}`);

  const bad = spawnSync(process.execPath, [tsc, "-p", join(dir, "tsconfig.bad.json")], {
    encoding: "utf8",
  });
  equal(
    bad.status !== null && bad.status !== 0,
    true,
    `plain-data bad fixture should fail to typecheck:\n${bad.stdout}${bad.stderr}`,
  );

  const output = `${bad.stdout}${bad.stderr}`;
  for (const fragment of ["PlainData", "Map<string, number>", "Holder", "undefined", "() => number"]) {
    equal(
      output.includes(fragment),
      true,
      `expected a diagnostic mentioning "${fragment}":\n${output}`,
    );
  }
});
