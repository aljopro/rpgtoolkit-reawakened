// Generate the project-owned TK2 bitmap fallback from authored cells.
//
//   node tools/fonts/generate.mjs [--check]
//
// The source is plain text authored for this project. This tool deliberately
// does not import core's reader/writer, so the format fixture remains an
// independent producer under G7.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(here, "..", "..");
export const sourcePath = join(repoRoot, "media", "fonts", "tkr-8x8.txt");
export const outputPath = join(repoRoot, "media", "fonts", "tkr-8x8.fnt");

const MAGIC = "RPGTLKIT FONT";
const VERSION = "2";
const SUBVERSION = "0";
const GLYPH_COUNT = 256;
const ROWS = 8;
const FIRST_ASCII = 0x20;
const LAST_ASCII = 0x7e;
const REPLACEMENT = 0xff;
const HEX = /^[0-9A-Fa-f]{2}$/;

function fail(message) {
  throw new Error(`tools/fonts/generate.mjs: ${message}`);
}

export function parseSource(text) {
  const cells = new Map();
  for (const [index, raw] of text.split(/\r\n|\r|\n/).entries()) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const fields = line.split(/\s+/);
    if (fields.length !== ROWS + 1 || !/^U\+[0-9A-Fa-f]{4,6}$/.test(fields[0] ?? "")) {
      fail(`source line ${index + 1} must be U+code followed by exactly ${ROWS} hex bytes`);
    }
    const code = Number.parseInt(fields[0].slice(2), 16);
    if ((code >= FIRST_ASCII && code <= LAST_ASCII) === false && code !== 0xfffd) {
      fail(`source line ${index + 1} code point U+${code.toString(16).toUpperCase()} is outside ASCII 32-126 and U+FFFD`);
    }
    if (cells.has(code)) fail(`duplicate source code point U+${code.toString(16).toUpperCase()}`);
    const rows = fields.slice(1).map((value) => {
      if (!HEX.test(value)) fail(`source line ${index + 1} has non-byte value ${value}`);
      return Number.parseInt(value, 16);
    });
    cells.set(code, rows);
  }
  for (let code = FIRST_ASCII; code <= LAST_ASCII; code += 1) {
    if (!cells.has(code)) fail(`source is missing U+${code.toString(16).toUpperCase()}`);
  }
  if (!cells.has(0xfffd)) fail("source is missing U+FFFD replacement glyph");
  return cells;
}

export function generate(sourceText) {
  const cells = parseSource(sourceText);
  const values = new Uint8Array(GLYPH_COUNT * ROWS);
  for (let code = FIRST_ASCII; code <= LAST_ASCII; code += 1) {
    values.set(cells.get(code), code * ROWS);
  }
  values.set(cells.get(0xfffd), REPLACEMENT * ROWS);
  const lines = [MAGIC, VERSION, SUBVERSION];
  for (const value of values) lines.push(` ${value} `);
  return `${lines.join("\r\n")}\r\n`;
}

export function check(source = sourcePath, output = outputPath) {
  const expected = generate(readFileSync(source, "utf8"));
  let actual;
  try {
    actual = readFileSync(output, "utf8");
  } catch (error) {
    return [`${output} is missing; run \'pnpm font:generate\'`];
  }
  if (actual !== expected) {
    let at = 0;
    while (at < actual.length && at < expected.length && actual[at] === expected[at]) at += 1;
    return [`${output} is out of date at byte ${at}; run \'pnpm font:generate\'`];
  }
  return [];
}

function main(argv) {
  if (argv.includes("--check")) {
    const problems = check();
    for (const problem of problems) console.error(problem);
    if (problems.length > 0) return 1;
    console.log("tools/fonts/generate.mjs: authored font matches source");
    return 0;
  }
  writeFileSync(outputPath, generate(readFileSync(sourcePath, "utf8")), "utf8");
  console.log(`tools/fonts/generate.mjs: wrote ${outputPath}`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
