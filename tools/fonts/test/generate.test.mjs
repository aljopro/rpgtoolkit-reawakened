import { deepEqual, equal, match, notEqual } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { check, generate, parseSource, sourcePath, outputPath } from "../generate.mjs";

test("authored source has every printable ASCII glyph and replacement", () => {
  const cells = parseSource(readFileSync(sourcePath, "utf8"));
  equal(cells.size, 96);
  for (let code = 0x20; code <= 0x7e; code += 1) equal(cells.has(code), true, `U+${code.toString(16)}`);
  equal(cells.has(0xfffd), true);
});

test("generator emits the TK2 shape and is deterministic", () => {
  const source = readFileSync(sourcePath, "utf8");
  const first = generate(source);
  const second = generate(source);
  equal(first, second);
  equal(first.split("\r\n").length, 2052);
  match(first, /^RPGTLKIT FONT\r\n2\r\n0\r\n/);
  equal(first.endsWith("\r\n"), true);
});

test("committed generated asset matches the authored source", () => {
  deepEqual(check(), [], outputPath);
});

test("replacement glyph is emitted in byte-code slot 255", () => {
  const rows = generate(readFileSync(sourcePath, "utf8"))
    .split("\r\n")
    .slice(3, 2051)
    .map((line) => Number.parseInt(line.trim(), 10));
  notEqual(rows.slice(255 * 8, 256 * 8).every((value) => value === 0), true);
});
