// Tests covering all matrix rows of story-licence-gate-and-third-party-notices-plan.md
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, symlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  evaluateLicense,
  loadBlueOakList,
  loadConfig,
  checkLicences,
} from "../check.mjs";

const blueOakListPath = join(import.meta.dirname, "..", "blue-oak-list.json");
const configPath = join(import.meta.dirname, "..", "config.json");

const blueOakList = loadBlueOakList(blueOakListPath);
const baseConfig = loadConfig(configPath);
const defaultPolicy = {
  ...baseConfig,
  blueOakList,
};

function withTempWorkspace(fn) {
  const dir = mkdtempSync(join(tmpdir(), "licence-test-"));
  try {
    // Copy blue-oak-list.json and config.json into temp root
    const toolsDir = join(dir, "tools", "licences");
    mkdirSync(toolsDir, { recursive: true });
    writeFileSync(
      join(toolsDir, "blue-oak-list.json"),
      JSON.stringify({
        version: blueOakList.version,
        ratings: [
          {
            name: "Model",
            licenses: [{ id: "BlueOak-1.0.0" }],
          },
          {
            name: "Gold",
            licenses: [{ id: "BSD-2-Clause-Patent" }],
          },
          {
            name: "Silver",
            licenses: [{ id: "MIT" }, { id: "Apache-2.0" }, { id: "MS-PL" }],
          },
          {
            name: "Bronze",
            licenses: [{ id: "0BSD" }, { id: "BSD-3-Clause" }],
          },
          {
            name: "Lead",
            licenses: [{ id: "WTFPL" }],
          },
        ],
      }, null, 2),
    );
    writeFileSync(
      join(toolsDir, "config.json"),
      JSON.stringify(baseConfig, null, 2),
    );
    // Default THIRD_PARTY_NOTICES
    writeFileSync(join(dir, "THIRD_PARTY_NOTICES"), "# Notices\n");

    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// -------------------------------------------------------------
// Evaluator unit tests
// -------------------------------------------------------------

test("evaluator: passing single permissive licences", () => {
  assert.equal(evaluateLicense("MIT", defaultPolicy).pass, true);
  assert.equal(evaluateLicense("Apache-2.0", defaultPolicy).pass, true);
  assert.equal(evaluateLicense("BlueOak-1.0.0", defaultPolicy).pass, true);
  assert.equal(evaluateLicense("BSD-3-Clause", defaultPolicy).pass, true);
  assert.equal(evaluateLicense("0BSD", defaultPolicy).pass, true);
});

test("evaluator: GPL fails reported as copyleft blocked by G6", () => {
  const res = evaluateLicense("GPL-3.0", defaultPolicy);
  assert.equal(res.pass, false);
  assert.match(res.reason, /Copyleft licence 'GPL-3.0' blocked by G6/);
});

test("evaluator: MS-PL fails because blocked by ADR 0003 exception list", () => {
  const res = evaluateLicense("MS-PL", defaultPolicy);
  assert.equal(res.pass, false);
  assert.match(res.reason, /blocked by policy exception list/);
});

test("evaluator: WTFPL fails because rated Lead", () => {
  const res = evaluateLicense("WTFPL", defaultPolicy);
  assert.equal(res.pass, false);
  assert.match(res.reason, /rated Lead/);
});

test("evaluator: unknown unlisted licence fails", () => {
  const res = evaluateLicense("Custom-Proprietary-1.0", defaultPolicy);
  assert.equal(res.pass, false);
  assert.match(res.reason, /not on the Blue Oak Council/);
});

test("evaluator: compound OR with >= 1 acceptable passes", () => {
  const res = evaluateLicense("(MIT OR GPL-3.0)", defaultPolicy);
  assert.equal(res.pass, true);
});

test("evaluator: compound OR with no acceptable fails", () => {
  const res = evaluateLicense("(GPL-2.0 OR GPL-3.0)", defaultPolicy);
  assert.equal(res.pass, false);
});

test("evaluator: compound AND requires all to pass", () => {
  const passRes = evaluateLicense("(MIT AND Apache-2.0)", defaultPolicy);
  assert.equal(passRes.pass, true);

  const failRes = evaluateLicense("(MIT AND GPL-3.0)", defaultPolicy);
  assert.equal(failRes.pass, false);
});

test("evaluator: complex nested expression ((MIT OR GPL-3.0) AND Apache-2.0)", () => {
  const res = evaluateLicense("((MIT OR GPL-3.0) AND Apache-2.0)", defaultPolicy);
  assert.equal(res.pass, true);
});

// -------------------------------------------------------------
// Workspace & Matrix Scenario tests
// -------------------------------------------------------------

test("matrix row: Clean tree passes with 0 violations", () => {
  withTempWorkspace((dir) => {
    const res = checkLicences(dir, {
      prodLicensesJson: {},
      allLicensesJson: {
        MIT: [{ name: "eslint", versions: ["9.0.0"], license: "MIT" }],
      },
    });
    assert.equal(res.pass, true);
    assert.equal(res.violations.length, 0);
  });
});

test("matrix row: GPL prod dep fails with copyleft block", () => {
  withTempWorkspace((dir) => {
    writeFileSync(join(dir, "THIRD_PARTY_NOTICES"), "some-gpl-pkg\n");
    const res = checkLicences(dir, {
      prodLicensesJson: {
        "GPL-3.0": [{ name: "some-gpl-pkg", versions: ["1.0.0"], license: "GPL-3.0" }],
      },
      allLicensesJson: {
        "GPL-3.0": [{ name: "some-gpl-pkg", versions: ["1.0.0"], license: "GPL-3.0" }],
      },
    });
    assert.equal(res.pass, false);
    assert.ok(
      res.violations.some(
        (v) =>
          v.type === "unapproved-prod-license" &&
          v.package === "some-gpl-pkg" &&
          /Copyleft licence 'GPL-3.0' blocked by G6/.test(v.message),
      ),
    );
  });
});

test("matrix row: MS-PL prod dep fails blocked by exception list (ADR 0003)", () => {
  withTempWorkspace((dir) => {
    writeFileSync(join(dir, "THIRD_PARTY_NOTICES"), "ms-pl-pkg\n");
    const res = checkLicences(dir, {
      prodLicensesJson: {
        "MS-PL": [{ name: "ms-pl-pkg", versions: ["1.0.0"], license: "MS-PL" }],
      },
      allLicensesJson: {
        "MS-PL": [{ name: "ms-pl-pkg", versions: ["1.0.0"], license: "MS-PL" }],
      },
    });
    assert.equal(res.pass, false);
    assert.ok(res.violations.some((v) => v.type === "unapproved-prod-license" && v.message.includes("MS-PL")));
  });
});

test("matrix row: Lead-rated dep (WTFPL) fails", () => {
  withTempWorkspace((dir) => {
    writeFileSync(join(dir, "THIRD_PARTY_NOTICES"), "wtfpl-pkg\n");
    const res = checkLicences(dir, {
      prodLicensesJson: {
        WTFPL: [{ name: "wtfpl-pkg", versions: ["1.0.0"], license: "WTFPL" }],
      },
      allLicensesJson: {
        WTFPL: [{ name: "wtfpl-pkg", versions: ["1.0.0"], license: "WTFPL" }],
      },
    });
    assert.equal(res.pass, false);
    assert.ok(res.violations.some((v) => v.type === "unapproved-prod-license" && v.message.includes("Lead")));
  });
});

test("matrix row: Unlisted licence fails", () => {
  withTempWorkspace((dir) => {
    writeFileSync(join(dir, "THIRD_PARTY_NOTICES"), "unlisted-pkg\n");
    const res = checkLicences(dir, {
      prodLicensesJson: {
        "Unknown-1.0": [{ name: "unlisted-pkg", versions: ["1.0.0"], license: "Unknown-1.0" }],
      },
      allLicensesJson: {
        "Unknown-1.0": [{ name: "unlisted-pkg", versions: ["1.0.0"], license: "Unknown-1.0" }],
      },
    });
    assert.equal(res.pass, false);
    assert.ok(res.violations.some((v) => v.type === "unapproved-prod-license"));
  });
});

test("matrix row: Missing notice in THIRD_PARTY_NOTICES fails naming the package", () => {
  withTempWorkspace((dir) => {
    // THIRD_PARTY_NOTICES does NOT mention prod-helper
    writeFileSync(join(dir, "THIRD_PARTY_NOTICES"), "# Empty notices\n");
    const res = checkLicences(dir, {
      prodLicensesJson: {
        MIT: [{ name: "prod-helper", versions: ["1.0.0"], license: "MIT" }],
      },
      allLicensesJson: {
        MIT: [{ name: "prod-helper", versions: ["1.0.0"], license: "MIT" }],
      },
    });
    assert.equal(res.pass, false);
    const v = res.violations.find((v) => v.type === "missing-notice");
    assert.ok(v);
    assert.equal(v.package, "prod-helper");
  });
});

test("matrix row: Missing notices file fails", () => {
  withTempWorkspace((dir) => {
    rmSync(join(dir, "THIRD_PARTY_NOTICES"));
    const res = checkLicences(dir, {
      prodLicensesJson: {},
      allLicensesJson: {},
    });
    assert.equal(res.pass, false);
    assert.ok(res.violations.some((v) => v.type === "missing-notices-file"));
  });
});

test("matrix row: Dev exemption allowed (ovsx with EPL-2.0)", () => {
  withTempWorkspace((dir) => {
    const res = checkLicences(dir, {
      prodLicensesJson: {},
      allLicensesJson: {
        "EPL-2.0": [{ name: "ovsx", versions: ["0.9.0"], license: "EPL-2.0" }],
      },
    });
    assert.equal(res.pass, true);
    assert.equal(res.violations.length, 0);
  });
});

test("matrix row: Dev exemption in prod fails", () => {
  withTempWorkspace((dir) => {
    writeFileSync(join(dir, "THIRD_PARTY_NOTICES"), "ovsx\n");
    const res = checkLicences(dir, {
      prodLicensesJson: {
        "EPL-2.0": [{ name: "ovsx", versions: ["0.9.0"], license: "EPL-2.0" }],
      },
      allLicensesJson: {
        "EPL-2.0": [{ name: "ovsx", versions: ["0.9.0"], license: "EPL-2.0" }],
      },
    });
    assert.equal(res.pass, false);
    assert.ok(res.violations.some((v) => v.type === "dev-exemption-in-prod" && v.package === "ovsx"));
  });
});

test("matrix row: Compound OR passing (MIT OR GPL-3.0)", () => {
  withTempWorkspace((dir) => {
    writeFileSync(join(dir, "THIRD_PARTY_NOTICES"), "dual-pkg\n");
    const res = checkLicences(dir, {
      prodLicensesJson: {
        "(MIT OR GPL-3.0)": [{ name: "dual-pkg", versions: ["1.0.0"], license: "(MIT OR GPL-3.0)" }],
      },
      allLicensesJson: {
        "(MIT OR GPL-3.0)": [{ name: "dual-pkg", versions: ["1.0.0"], license: "(MIT OR GPL-3.0)" }],
      },
    });
    assert.equal(res.pass, true);
    assert.equal(res.violations.length, 0);
  });
});

test("matrix row: Compound AND failing (MIT AND GPL-3.0)", () => {
  withTempWorkspace((dir) => {
    writeFileSync(join(dir, "THIRD_PARTY_NOTICES"), "combo-pkg\n");
    const res = checkLicences(dir, {
      prodLicensesJson: {
        "(MIT AND GPL-3.0)": [{ name: "combo-pkg", versions: ["1.0.0"], license: "(MIT AND GPL-3.0)" }],
      },
      allLicensesJson: {
        "(MIT AND GPL-3.0)": [{ name: "combo-pkg", versions: ["1.0.0"], license: "(MIT AND GPL-3.0)" }],
      },
    });
    assert.equal(res.pass, false);
    assert.ok(res.violations.some((v) => v.type === "unapproved-prod-license" && v.package === "combo-pkg"));
  });
});

test("notice check: empty THIRD_PARTY_NOTICES fails naming missing prod dependency", () => {
  withTempWorkspace((dir) => {
    writeFileSync(join(dir, "THIRD_PARTY_NOTICES"), "");
    const res = checkLicences(dir, {
      prodLicensesJson: {
        MIT: [{ name: "some-prod-pkg", versions: ["1.0.0"], license: "MIT" }],
      },
      allLicensesJson: {
        MIT: [{ name: "some-prod-pkg", versions: ["1.0.0"], license: "MIT" }],
      },
    });
    assert.equal(res.pass, false);
    assert.ok(res.violations.some((v) => v.type === "missing-notice" && v.package === "some-prod-pkg"));
  });
});

test("notice check: word boundary prevents false substring matches", () => {
  withTempWorkspace((dir) => {
    // Contains "including" and "definitions", but not package "ini" or "def"
    writeFileSync(join(dir, "THIRD_PARTY_NOTICES"), "# Notices\nIncluding all definitions.\n");
    const res = checkLicences(dir, {
      prodLicensesJson: {
        ISC: [{ name: "ini", versions: ["1.0.0"], license: "ISC" }],
      },
      allLicensesJson: {
        ISC: [{ name: "ini", versions: ["1.0.0"], license: "ISC" }],
      },
    });
    assert.equal(res.pass, false);
    assert.ok(res.violations.some((v) => v.type === "missing-notice" && v.package === "ini"));
  });
});

test("dev dependency check: exact (name, version) deduplication", () => {
  withTempWorkspace((dir) => {
    writeFileSync(join(dir, "THIRD_PARTY_NOTICES"), "shared-pkg\n");
    // shared-pkg@1.0.0 is in prod (MIT). But dev has shared-pkg@2.0.0 under GPL-3.0!
    const res = checkLicences(dir, {
      prodLicensesJson: {
        MIT: [{ name: "shared-pkg", versions: ["1.0.0"], license: "MIT" }],
      },
      allLicensesJson: {
        MIT: [{ name: "shared-pkg", versions: ["1.0.0"], license: "MIT" }],
        "GPL-3.0": [{ name: "shared-pkg", versions: ["2.0.0"], license: "GPL-3.0" }],
      },
    });
    assert.equal(res.pass, false);
    assert.ok(res.violations.some((v) => v.type === "unapproved-dev-license" && v.package === "shared-pkg" && v.version === "2.0.0"));
  });
});

test("CLI e2e: exits 0 on repo root", () => {
  const tool = join(import.meta.dirname, "..", "check.mjs");
  const repo = join(import.meta.dirname, "..", "..", "..");
  const result = spawnSync(process.execPath, [tool, repo], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Licence check PASSED/);
});

test("CLI e2e: rejects unknown flags and multiple positional arguments", () => {
  const tool = join(import.meta.dirname, "..", "check.mjs");
  const badFlag = spawnSync(process.execPath, [tool, "--foo"], {
    encoding: "utf8",
  });
  assert.equal(badFlag.status, 1);
  assert.match(badFlag.stderr, /unknown flag\(s\): --foo/);

  const multipleArgs = spawnSync(process.execPath, [tool, "dir1", "dir2"], {
    encoding: "utf8",
  });
  assert.equal(multipleArgs.status, 1);
  assert.match(multipleArgs.stderr, /expected at most one root argument/);
});

test("CLI e2e: fails on fixture root with missing THIRD_PARTY_NOTICES", () => {
  const tool = join(import.meta.dirname, "..", "check.mjs");
  withTempWorkspace((dir) => {
    rmSync(join(dir, "THIRD_PARTY_NOTICES"));
    const result = spawnSync(process.execPath, [tool, dir], {
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Licence check FAILED with 1 violation/);
    assert.match(result.stderr, /missing-notices-file/);
  });
});

test("CLI e2e: runs through a symlinked file and a symlinked directory", (t) => {
  const tool = join(import.meta.dirname, "..", "check.mjs");
  const repo = join(import.meta.dirname, "..", "..", "..");

  const dir = mkdtempSync(join(tmpdir(), "licence-symlink-"));
  try {
    const fileLink = join(dir, "check-link.mjs");
    const dirLink = join(dir, "licences-link");
    try {
      symlinkSync(tool, fileLink, "file");
      symlinkSync(dirname(tool), dirLink, "dir");
    } catch (error) {
      t.skip(`cannot create symlinks here: ${error.message}`);
      return;
    }

    const viaFile = spawnSync(process.execPath, [fileLink, repo], {
      encoding: "utf8",
    });
    assert.equal(viaFile.status, 0, `${viaFile.stdout}${viaFile.stderr}`);
    assert.match(viaFile.stdout, /Licence check PASSED\./);
    assert.match(viaFile.stdout, /Total \(prod \+ dev\) packages checked: \d+/);

    const viaDir = spawnSync(process.execPath, [join(dirLink, "check.mjs"), repo], {
      encoding: "utf8",
    });
    assert.equal(viaDir.status, 0, `${viaDir.stdout}${viaDir.stderr}`);
    assert.match(viaDir.stdout, /Licence check PASSED\./);
    assert.match(viaDir.stdout, /Total \(prod \+ dev\) packages checked: \d+/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
