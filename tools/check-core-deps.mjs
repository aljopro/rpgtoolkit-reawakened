// G2 rule 3: `core`'s runtime npm dependencies must match an explicit allowlist
// exactly. The runtime set is the union of `dependencies`, `optionalDependencies`
// and `peerDependencies`. Run from the root `lint` script; exits non-zero naming
// any mismatch. An optional argument overrides the repository root (used by the
// core lint-rule test to exercise fixture roots).
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = process.argv[2] ? resolve(process.argv[2]) : defaultRoot;
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const pkg = readJson(join(repoRoot, "packages", "core", "package.json"));
const allowlist = readJson(
  join(repoRoot, "packages", "core", "dependency-allowlist.json"),
);

if (!Array.isArray(allowlist) || allowlist.some((name) => typeof name !== "string")) {
  console.error(
    "check-core-deps: packages/core/dependency-allowlist.json must be an array of package names.",
  );
  process.exit(1);
}

const runtimeSections = [
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
];
const dependencies = [
  ...new Set(
    runtimeSections.flatMap((section) => Object.keys(pkg[section] ?? {})),
  ),
].sort();
const allowed = [...allowlist].sort();

const unlisted = dependencies.filter((name) => !allowed.includes(name));
const stale = allowed.filter((name) => !dependencies.includes(name));

if (unlisted.length > 0 || stale.length > 0) {
  console.error(
    "check-core-deps: core runtime dependencies do not match the allowlist (dependencies, optionalDependencies, peerDependencies).",
  );
  for (const name of unlisted) {
    console.error(
      `  not allowed: ${name} (add it to packages/core/dependency-allowlist.json or remove the dependency)`,
    );
  }
  for (const name of stale) {
    console.error(
      `  allowlisted but not a dependency: ${name} (remove it from packages/core/dependency-allowlist.json)`,
    );
  }
  process.exit(1);
}

console.log(
  `check-core-deps: ${dependencies.length} core runtime ${dependencies.length === 1 ? "dependency" : "dependencies"} matches the allowlist.`,
);
