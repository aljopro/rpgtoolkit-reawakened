// The contract type constraints (CAP-12, AD-1, AD-7).
//
// Positive assertions live in the `fixtures/ports/good.ts` fixture and the
// negative ones in `fixtures/ports/bad.ts`; both are compiled here with the
// real `tsc`, so `pnpm test` proves the constraints fire rather than trusting
// a `@ts-expect-error` comment.
import { test } from "node:test";
import { equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const testDir = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(testDir, "fixtures", "ports");

test("state types satisfy AssertPlainData and port types satisfy AssertPortData", () => {
  const tsc = createRequire(import.meta.url).resolve("typescript/lib/tsc.js");
  const good = spawnSync(process.execPath, [tsc, "-p", join(fixtureDir, "tsconfig.good.json")], {
    encoding: "utf8",
  });
  equal(good.status, 0, `the port-contract fixtures should typecheck:\n${good.stdout}${good.stderr}`);
});

test("non-plain and undefined fields fail the port constraints", () => {
  const tsc = createRequire(import.meta.url).resolve("typescript/lib/tsc.js");
  const badSource = readFileSync(join(fixtureDir, "bad.ts"), "utf8");
  const expectedLines = badSource
    .split("\n")
    .map((line, idx) => (line.startsWith("export ") ? idx + 1 : null))
    .filter((n): n is number => n !== null);

  const bad = spawnSync(process.execPath, [tsc, "-p", join(fixtureDir, "tsconfig.bad.json")], {
    encoding: "utf8",
  });
  equal(
    bad.status !== null && bad.status !== 0,
    true,
    `the non-plain fixtures must fail to typecheck:\n${bad.stdout}${bad.stderr}`,
  );
  const output = `${bad.stdout}${bad.stderr}`;

  const errorLines: number[] = [];
  const re = /bad\.ts\((\d+),\d+\): error/g;
  let match: RegExpExecArray | null = null;
  while ((match = re.exec(output)) !== null) {
    errorLines.push(Number.parseInt(match[1]!, 10));
  }

  equal(
    errorLines.length,
    expectedLines.length,
    `expected ${expectedLines.length} errors, got ${errorLines.length}:\n${output}`,
  );
  for (let i = 0; i < expectedLines.length; i++) {
    equal(
      errorLines[i],
      expectedLines[i],
      `error at index ${i} should be on line ${expectedLines[i]}, got ${errorLines[i]}`,
    );
  }
});
