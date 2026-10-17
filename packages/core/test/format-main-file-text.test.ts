// TK2 text main-file reader tests (docs/spec/formats/legacy/text-formats.md#main-file-toolkit-2-text)
import { test } from "node:test";
import { equal } from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BinaryReader,
  readMainFile,
  readTextMainFile,
  createEmptyMainFile,
} from "../src/index.ts";

function ascii(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    bytes[i] = text.charCodeAt(i);
  }
  return bytes;
}

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "..", "..", "..");
test("empty placeholder main file has valid shape", () => {
  const gam = createEmptyMainFile();
  equal(gam.magic, "RPGTLKIT MAIN");
  equal(gam.startupPrg, "");
  equal(gam.registrationCode, "NOCODE");
});

test("refuses text main file with wrong magic", () => {
  const bytes = ascii("NOT_A_MAIN\r\n2\r\n0\r\n");
  const res = readTextMainFile(bytes);
  equal(res.ok, false);
  if (!res.ok) {
    equal(res.error.offset, 0);
  }
});

test("committed main_tk2_text.gam example parses cleanly to end of file", () => {
  const file = join(repoRoot, "docs", "spec", "examples", "versions", "main", "main_tk2_text.gam");
  const bytes = new Uint8Array(readFileSync(file));
  const reader = new BinaryReader(bytes, file);
  const res = readMainFile(reader);
  equal(res.ok, true, `failed to parse ${file}: ${!res.ok ? res.error.message : ""}`);
  if (!res.ok) return;
  const gam = res.value;
  equal(gam.magic, "RPGTLKIT MAIN");
  equal(gam.major, 2);
  equal(gam.enemies.length, 501);
  equal(gam.extKeys.length, 51);
  equal(gam.residue.length, 0);
  equal(reader.remaining, 0);
});

test(
  "all fetched-corpus text .gam files parse cleanly to end of file",
  { skip: !existsSync(join(repoRoot, "fixtures", "legacy")) ? "legacy fixtures are not fetched" : false },
  () => {
    const corpusDir = join(repoRoot, "fixtures", "legacy");
    const files = readdirSync(corpusDir, { recursive: true })
      .filter((f) => f.toLowerCase().endsWith(".gam"))
      .map((f) => join(corpusDir, f))
      .filter((p) => {
        const b = readFileSync(p);
        return b.length > 13 && b[13] !== 0;
      });
    equal(files.length >= 2, true, `expected at least 2 text .gam files, found ${files.length}`);

    for (const p of files) {
      const bytes = readFileSync(p);
      const res = readMainFile(new BinaryReader(bytes, p));
      equal(res.ok, true, `failed to parse ${p}: ${!res.ok ? res.error.message : ""}`);
      if (res.ok) {
        equal(res.value.magic, "RPGTLKIT MAIN");
        equal(res.value.enemies.length, 501);
        equal(res.value.extKeys.length, 51);
        equal(res.value.residue.length, 0);
      }
    }
  },
);
