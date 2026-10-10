// expect-rule: no-restricted-imports
import { readFileSync } from "node:fs";

export const read = readFileSync;
