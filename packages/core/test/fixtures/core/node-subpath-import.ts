// expect-rule: no-restricted-imports
import { readFile } from "fs/promises";

export const read = readFile;
