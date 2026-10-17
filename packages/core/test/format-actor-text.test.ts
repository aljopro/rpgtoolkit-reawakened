// TK2 text character and item reader tests (docs/spec/formats/legacy/text-formats.md#character, #item)
import { test } from "node:test";
import { equal } from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BinaryReader,
  readCharacter,
  readItem,
  readTextCharacter,
  readTextItem,
  createEmptyCharacter,
  createEmptyItem,
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

test("empty placeholder character and item have valid shape (Z-1)", () => {
  const char = createEmptyCharacter();
  equal(char.magic, "RPGTLKIT CHAR");
  equal(char.name, "");
  equal(char.specialMoves.length, 201);
  equal(char.legacyGraphics, undefined);

  const item = createEmptyItem();
  equal(item.magic, "RPGTLKIT ITEM");
  equal(item.name, "");
  equal(item.allowedCharacters.length, 51);
});

test("refuses text character with wrong magic", () => {
  const bytes = ascii("NOT_A_CHAR\r\n2\r\n0\r\n");
  const res = readTextCharacter(bytes);
  equal(res.ok, false);
  if (!res.ok) {
    equal(res.error.offset, 0);
  }
});

test("refuses text item with wrong magic", () => {
  const bytes = ascii("NOT_AN_ITEM\r\n2\r\n0\r\n");
  const res = readTextItem(bytes);
  equal(res.ok, false);
  if (!res.ok) {
    equal(res.error.offset, 0);
  }
});

test("committed text character version examples parse cleanly and populate legacyGraphics correctly", () => {
  for (const minor of [0, 1, 2]) {
    const file = join(repoRoot, "docs", "spec", "examples", "versions", "character", `character_text_minor${minor}.tem`);
    const bytes = new Uint8Array(readFileSync(file));
    const reader = new BinaryReader(bytes, file);
    const res = readCharacter(reader);
    equal(res.ok, true, `failed to parse ${file}: ${!res.ok ? res.error.message : ""}`);
    if (!res.ok) return;
    const char = res.value;
    equal(char.magic, "RPGTLKIT CHAR");
    equal(char.major, 2);
    equal(char.minor, minor);
    equal(char.residue.length, 0);
    equal(reader.remaining, 0);

    if (minor === 0) {
      equal(char.sizeType, 0);
      equal(char.legacyGraphics, undefined);
    } else if (minor === 1) {
      equal(char.sizeType, 1);
      equal(char.legacyGraphics !== undefined, true);
      equal(char.legacyGraphics?.walkFrames.length, 16);
      equal(char.legacyGraphics?.battleTiles.length, 32);
      equal(char.legacyGraphics?.restTiles.length, 2);
      equal(char.legacyGraphics?.customFrames.length, 10);
    } else {
      equal(char.sizeType, 1);
      equal(char.legacyGraphics !== undefined, true);
      equal(char.legacyGraphics?.walkFrames.length, 16);
      equal(char.legacyGraphics?.battleTiles.length, 64);
      equal(char.legacyGraphics?.restTiles.length, 4);
      equal(char.legacyGraphics?.customFrames.length, 10);
    }
  }
});

test("committed text item version examples parse cleanly and populate legacyWalk correctly", () => {
  for (const minor of [0, 1]) {
    const file = join(repoRoot, "docs", "spec", "examples", "versions", "item", `item_text_minor${minor}.itm`);
    const bytes = new Uint8Array(readFileSync(file));
    const reader = new BinaryReader(bytes, file);
    const res = readItem(reader);
    equal(res.ok, true, `failed to parse ${file}: ${!res.ok ? res.error.message : ""}`);
    if (!res.ok) return;
    const item = res.value;
    equal(item.magic, "RPGTLKIT ITEM");
    equal(item.major, 2);
    equal(item.minor, minor);
    equal(item.residue.length, 0);
    equal(reader.remaining, 0);

    if (minor === 0) {
      equal(item.sizeType, 0);
      equal(item.legacyWalk, undefined);
    } else {
      equal(item.sizeType, 1);
      equal(item.legacyWalk !== undefined, true);
      equal(item.legacyWalk?.frames.length, 16);
      equal(item.legacyWalk?.restTiles.length, 2);
    }
  }
});

test(
  "all fetched-corpus text .tem files parse cleanly to end of file",
  { skip: !existsSync(join(repoRoot, "fixtures", "legacy")) ? "legacy fixtures are not fetched" : false },
  () => {
    const files = findTextCorpusFiles(".tem");
    equal(files.length >= 2, true, `expected at least 2 text .tem files, found ${files.length}`);

    for (const p of files) {
      const bytes = readFileSync(p);
      const res = readCharacter(new BinaryReader(bytes, p));
      equal(res.ok, true, `failed to parse ${p}: ${!res.ok ? res.error.message : ""}`);
      if (res.ok) {
        equal(res.value.magic, "RPGTLKIT CHAR");
        equal(res.value.specialMoves.length, 201);
        equal(res.value.residue.length, 0);
      }
    }
  },
);

test(
  "all fetched-corpus text .itm files parse cleanly to end of file",
  { skip: !existsSync(join(repoRoot, "fixtures", "legacy")) ? "legacy fixtures are not fetched" : false },
  () => {
    const files = findTextCorpusFiles(".itm");
    equal(files.length >= 16, true, `expected at least 16 text .itm files, found ${files.length}`);

    for (const p of files) {
      const bytes = readFileSync(p);
      const res = readItem(new BinaryReader(bytes, p));
      equal(res.ok, true, `failed to parse ${p}: ${!res.ok ? res.error.message : ""}`);
      if (res.ok) {
        equal(res.value.magic, "RPGTLKIT ITEM");
        equal(res.value.allowedCharacters.length, 51);
        equal(res.value.residue.length, 0);
      }
    }
  },
);


/** The text-form (non-NUL byte 13) files with `suffix` under the fetched `fixtures/legacy`. */
function findTextCorpusFiles(suffix: string): string[] {
  const corpusDir = join(repoRoot, "fixtures", "legacy");
  if (!existsSync(corpusDir)) {
    throw new Error("fixtures/legacy is missing; run `pnpm fixtures:fetch`");
  }
  return readdirSync(corpusDir, { recursive: true })
    .filter((f) => f.toLowerCase().endsWith(suffix))
    .map((f) => join(corpusDir, f))
    .filter((p) => {
      const b = readFileSync(p);
      return b.length > 13 && b[13] !== 0;
    });
}
