import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { main } from "./index.ts";

const entry = process.argv[1];
if (entry !== undefined && realpathSync(entry) === fileURLToPath(import.meta.url)) {
  const exitCode = main(process.argv.slice(2));
  process.exitCode = exitCode;
}
