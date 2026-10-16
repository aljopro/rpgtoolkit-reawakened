// TK2 text board reader tests (docs/spec/formats/legacy/text-formats.md#board-toolkit-2-text, docs/spec/formats/legacy/text-formats.md#board-toolkit-2-text)
import { test } from "node:test";
import { equal } from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import {
  BinaryReader,
  readBoard,
  readTextBoard,
  createEmptyBoard,
} from "../src/index.ts";

function ascii(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    bytes[i] = text.charCodeAt(i);
  }
  return bytes;
}

test("empty placeholder board created by createEmptyBoard has valid vector board shape", () => {
  const board = createEmptyBoard();
  equal(board.magic, "RPGTLKIT BOARD");
  equal(board.sizeX, 0);
  equal(board.sizeY, 0);
  equal(board.sizeL, 0);
  equal(board.tileMatrix.length, 0);
  equal(board.lut.length, 1);
  equal(board.links.north, "");
});

test("refuses text board with wrong magic", () => {
  const bytes = ascii("NOT_A_BOARD\r\n2\r\n1\r\n");
  const res = readTextBoard(bytes);
  equal(res.ok, false);
  if (!res.ok) {
    equal(res.error.offset, 0);
    equal(res.error.message.includes("not a board"), true);
  }
});

test("refuses text board with unsupported minor", () => {
  const bytes = ascii("RPGTLKIT BOARD\r\n2\r\n9\r\n0\r\nNOCODE\r\n");
  const res = readTextBoard(bytes);
  equal(res.ok, false);
  if (!res.ok) {
    equal(res.error.message.includes("unsupported text board minor version"), true);
  }
});

test("throws no uncaught error on truncated text board", () => {
  const bytes = ascii("RPGTLKIT BOARD\r\n2\r\n1\r\n0\r\nNOCODE\r\n19\r\n11\r\n");
  const res = readTextBoard(bytes);
  equal(res.ok, false);
});

test("all corpus text .brd files parse cleanly to end of file when scratch corpus is present", () => {
  const corpusDir = "/tmp/tk2-163";
  if (!existsSync(corpusDir)) return;

  function findTextBrds(dir: string): string[] {
    let res: string[] = [];
    for (const f of readdirSync(dir)) {
      const p = `${dir}/${f}`;
      try {
        const b = readFileSync(p);
        if (f.toLowerCase().endsWith(".brd") && b.length > 14 && b[14] !== 0) {
          res.push(p);
        }
      } catch {
        try {
          res = res.concat(findTextBrds(p));
        } catch {
          // ignore
        }
      }
    }
    return res;
  }

  const files = findTextBrds(corpusDir);
  equal(files.length >= 17, true, `expected at least 17 text .brd files, found ${files.length}`);

  for (const p of files) {
    const bytes = readFileSync(p);
    const res = readBoard(new BinaryReader(bytes, p));
    equal(res.ok, true, `failed to parse ${p}: ${!res.ok ? res.error.message : ""}`);
    if (res.ok) {
      equal(res.value.magic, "RPGTLKIT BOARD");
      equal(res.value.sizeX > 0, true);
      equal(res.value.sizeY > 0, true);
      equal(res.value.residue.length, 0);
    }
  }
});
