import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { goldenJob } from "@rpgtoolkit/runner-harness";

function readFileOrUndefined(filePath: string): string | undefined {
  try {
    return readFileSync(filePath, "utf8");
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === "ENOENT"
    ) {
      return undefined;
    }
    throw err;
  }
}

export function main(argv: string[]): number {
  try {
    let record = false;
    const positionals: string[] = [];

    for (const arg of argv) {
      if (arg.startsWith("-")) {
        if (arg === "--record") {
          record = true;
        } else {
          console.error(`golden: unknown flag: ${arg}`);
          return 1;
        }
      } else {
        positionals.push(arg);
      }
    }

    if (positionals.length === 0) {
      console.error("golden: missing subcommand");
      return 1;
    }

    if (positionals[0] !== "golden") {
      console.error(`golden: unknown subcommand '${positionals[0]}'`);
      return 1;
    }

    if (positionals.length > 2) {
      console.error(`golden: unexpected argument '${positionals[2]}'`);
      return 1;
    }

    const root = positionals[1] ?? process.cwd();

    const vectors = readFileOrUndefined(join(root, "golden/hash-vectors.json"));
    const run = readFileOrUndefined(join(root, "golden/test-double/run.json"));
    const golden = readFileOrUndefined(join(root, "golden/test-double/golden.json"));

    const result = goldenJob({ vectors, run, golden }, record);

    if (!result.ok) {
      const completed = result.lines.slice(0, -1);
      for (const line of completed) {
        console.log(line);
      }
      const failure = result.lines[result.lines.length - 1];
      if (failure !== undefined) {
        console.error(failure);
      }
      return 1;
    }

    for (const line of result.lines) {
      console.log(line);
    }

    if (record && result.golden !== undefined) {
      const targetPath = join(root, "golden/test-double/golden.json");
      const targetDir = dirname(targetPath);
      mkdirSync(targetDir, { recursive: true });
      const tmpPath = join(targetDir, `golden.json.tmp.${process.pid}`);
      writeFileSync(tmpPath, result.golden, "utf8");
      renameSync(tmpPath, targetPath);
    }

    return 0;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`golden: error: ${message}`);
    return 1;
  }
}
