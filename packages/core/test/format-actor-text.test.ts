// TK2 text character and item reader tests (docs/spec/formats/legacy/text-formats.md#character, #item)
import { test } from "node:test";
import { equal } from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
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

test("empty placeholder character and item have valid shape (Z-1)", () => {
  const char = createEmptyCharacter();
  equal(char.magic, "RPGTLKIT CHAR");
  equal(char.name, "");
  equal(char.specialMoves.length, 201);

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

test("all corpus text .tem files parse cleanly to end of file when scratch corpus is present", () => {
  const corpusDir = "/tmp/tk2-163";
  if (!existsSync(corpusDir)) return;

  function findTextTems(dir: string): string[] {
    let res: string[] = [];
    for (const f of readdirSync(dir)) {
      const p = `${dir}/${f}`;
      try {
        const b = readFileSync(p);
        if (f.toLowerCase().endsWith(".tem") && b.length > 13 && b[13] !== 0) {
          res.push(p);
        }
      } catch {
        try {
          res = res.concat(findTextTems(p));
        } catch {
          // ignore
        }
      }
    }
    return res;
  }

  const files = findTextTems(corpusDir);
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
});

test("all corpus text .itm files parse cleanly to end of file when scratch corpus is present", () => {
  const corpusDir = "/tmp/tk2-163";
  if (!existsSync(corpusDir)) return;

  function findTextItms(dir: string): string[] {
    let res: string[] = [];
    for (const f of readdirSync(dir)) {
      const p = `${dir}/${f}`;
      try {
        const b = readFileSync(p);
        if (f.toLowerCase().endsWith(".itm") && b.length > 13 && b[13] !== 0) {
          res.push(p);
        }
      } catch {
        try {
          res = res.concat(findTextItms(p));
        } catch {
          // ignore
        }
      }
    }
    return res;
  }

  const files = findTextItms(corpusDir);
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
});
