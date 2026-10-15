// Anonymise a legacy sample into a neutral, committable fixture (ticket 2.22).
//
//   node tools/fixtures/author/anonymise.mjs spc --in <file.spc> --name "Sample Move" --out <file>
//   node tools/fixtures/author/anonymise.mjs ste --in <file.ste> --name "Sample Status" --out <file>
//   node tools/fixtures/author/anonymise.mjs setup-excerpt --in <bundle.zip> [--entries 6] --out <file>
//
// Rules (the owner's, 2026-10-14): keep the binary layout byte for byte, but
// replace every name, description, program/script text and asset filename with a
// neutral placeholder, and replace every file's content with a synthetic
// pattern. Nothing from the source game may remain recognisable. The tool is
// generic and holds no game name: the source paths are supplied on the command
// line at run time and are never committed (the plan file records them), so a
// committed fixture is a neutral derivative of an uncommitted legacy file.
//
// The `.spc`/`.ste` rewrite drops any bytes after the last documented field
// (§1.7 residue), because residue is exactly where unidentified game text would
// hide. The output is deterministic: the same input and placeholders always give
// the same bytes.

import { readFileSync, writeFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { ascii, buildZip, concat, le16, le32 } from "./zip.mjs";

// --------------------------------------------------------------- tiny readers

/** A little-endian cursor over `bytes`, local so the tool shares no core code. */
function cursor(bytes) {
  let at = 0;
  const need = (count) => {
    if (at + count > bytes.length) throw new Error(`short file: wanted ${count} byte(s) at ${at}`);
  };
  return {
    get offset() {
      return at;
    },
    get remaining() {
      return bytes.length - at;
    },
    byte() {
      need(1);
      return bytes[at++];
    },
    i8() {
      need(1);
      const value = (bytes[at++] << 24) >> 24;
      return value;
    },
    i16() {
      need(2);
      const value = (bytes[at] | (bytes[at + 1] << 8)) << 16 >> 16;
      at += 2;
      return value;
    },
    i32() {
      need(4);
      const value = bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24);
      at += 4;
      return value;
    },
    str() {
      const start = at;
      while (at < bytes.length && bytes[at] !== 0) at += 1;
      if (at >= bytes.length) throw new Error(`unterminated string starting at ${start}`);
      const text = String.fromCharCode(...bytes.subarray(start, at));
      at += 1;
      return text;
    },
    rest() {
      return bytes.subarray(at);
    },
  };
}

/** A little-endian byte builder, local so the tool shares no core code. */
function builder() {
  const parts = [];
  return {
    i16(value) {
      parts.push(le16(value & 0xffff));
    },
    i32(value) {
      parts.push(le32(value >>> 0));
    },
    i8(value) {
      parts.push(new Uint8Array([value & 0xff]));
    },
    str(value) {
      parts.push(ascii(value), new Uint8Array([0]));
    },
    bytes() {
      return concat(parts);
    },
  };
}

// ------------------------------------------------------------ .spc / .ste

/** Read the documented binary fields of a `.spc` (§8.1), refusing the text form. */
function readSpc(bytes) {
  if (bytes.length > 16 && bytes[16] !== 0) throw new Error("this is the text form; only the binary form is anonymised");
  const reader = cursor(bytes);
  const magic = reader.str();
  if (magic !== "RPGTLKIT SPLMOVE") throw new Error(`not a special move: "${magic}"`);
  const major = reader.i16();
  const minor = reader.i16();
  reader.str(); // name (replaced)
  const damage = reader.i32();
  const smpCost = reader.i32();
  reader.str(); // program (replaced)
  const targetSmpDrain = reader.i32();
  const usableInBattle = reader.i8();
  const usableFromMenu = reader.i8();
  reader.str(); // statusEffect (replaced)
  reader.str(); // animation (replaced)
  reader.str(); // description (replaced)
  return { major, minor, damage, smpCost, targetSmpDrain, usableInBattle, usableFromMenu };
}

/** Re-emit a `.spc` (§8.1) with every string field replaced. */
function writeSpc(source, placeholders) {
  const writer = builder();
  writer.str("RPGTLKIT SPLMOVE");
  writer.i16(source.major);
  writer.i16(source.minor);
  writer.str(placeholders.name);
  writer.i32(source.damage);
  writer.i32(source.smpCost);
  writer.str(placeholders.program);
  writer.i32(source.targetSmpDrain);
  writer.i8(source.usableInBattle);
  writer.i8(source.usableFromMenu);
  writer.str(placeholders.statusEffect);
  writer.str(placeholders.animation);
  writer.str(placeholders.description);
  return writer.bytes();
}

/** Read the documented binary fields of a `.ste` (§8.2), refusing the text form. */
function readSte(bytes) {
  if (bytes.length > 16 && bytes[16] !== 0) throw new Error("this is the text form; only the binary form is anonymised");
  const reader = cursor(bytes);
  const magic = reader.str();
  if (magic !== "RPGTLKIT STATUSE") throw new Error(`not a status effect: "${magic}"`);
  const major = reader.i16();
  const minor = reader.i16();
  reader.str(); // name (replaced)
  const fields = {
    rounds: reader.i16(),
    speedUp: reader.i16(),
    slowDown: reader.i16(),
    disable: reader.i16(),
    hpEnabled: reader.i16(),
    hpPerRound: reader.i16(),
    smpEnabled: reader.i16(),
    smpPerRound: reader.i16(),
    runProgram: reader.i16(),
  };
  reader.str(); // program (replaced)
  return { major, minor, ...fields };
}

/** Re-emit a `.ste` (§8.2) with the name and program replaced. */
function writeSte(source, placeholders) {
  const writer = builder();
  writer.str("RPGTLKIT STATUSE");
  writer.i16(source.major);
  writer.i16(source.minor);
  writer.str(placeholders.name);
  for (const field of [
    "rounds",
    "speedUp",
    "slowDown",
    "disable",
    "hpEnabled",
    "hpPerRound",
    "smpEnabled",
    "smpPerRound",
    "runProgram",
  ]) {
    writer.i16(source[field]);
  }
  writer.str(placeholders.program);
  return writer.bytes();
}

// ---------------------------------------------------------------- setup ZIP

/** Read a ZIP's central directory (stored and deflated entries only). */
function readZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let at = bytes.length - 22; at >= 0; at -= 1) {
    if (view.getUint32(at, true) === 0x06054b50) {
      eocd = at;
      break;
    }
  }
  if (eocd < 0) throw new Error("no end-of-central-directory record");
  const count = view.getUint16(eocd + 10, true);
  let at = view.getUint32(eocd + 16, true);
  const entries = [];
  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new Error(`bad central-directory entry at ${at}`);
    const method = view.getUint16(at + 10, true);
    const compressed = view.getUint32(at + 20, true);
    const uncompressed = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const localAt = view.getUint32(at + 42, true);
    const name = new TextDecoder("windows-1252").decode(bytes.subarray(at + 46, at + 46 + nameLength));
    const localNameLength = view.getUint16(localAt + 26, true);
    const localExtraLength = view.getUint16(localAt + 28, true);
    const dataAt = localAt + 30 + localNameLength + localExtraLength;
    const body = bytes.subarray(dataAt, dataAt + compressed);
    entries.push({ name, method, uncompressed, bytes: method === 8 ? new Uint8Array(inflateRawSync(body)) : body });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/** The §1.5 type folders a game project uses; anything else is replaced. */
const TYPE_FOLDERS = new Set([
  "tiles", "boards", "chrs", "item", "enemy", "spcmove", "statuse", "bkrounds",
  "misc", "bitmap", "media", "prg", "font", "plugin",
]);

/**
 * A neutral path for `name`, keeping the Setup layout's `Main` and `Game`
 * folders, the type folders, the separators and the extension.
 */
function anonymiseName(name, index) {
  const separator = name.includes("\\") ? "\\" : "/";
  const parts = name.split(/[\\/]/);
  const last = parts[parts.length - 1];
  const dot = last.lastIndexOf(".");
  const extension = dot >= 0 ? last.slice(dot) : "";
  const renamed = parts.map((part, position) => {
    if (position === parts.length - 1) {
      return parts.length === 1 ? `engine${index}${extension}` : `asset${index}${extension}`;
    }
    const lower = part.toLowerCase();
    if (lower === "main") return "Main";
    if (lower === "game") return "Game";
    // Under `Game`, the second segment is the project folder: give it a neutral
    // name rather than a placeholder index.
    if (position === 1 && parts[0].toLowerCase() === "game") return "Demo";
    if (TYPE_FOLDERS.has(lower)) return part;
    return `Sample${position}`;
  });
  return renamed.join(separator);
}

/** Deterministic synthetic content of at most 48 bytes, never the source bytes. */
function syntheticBytes(index, size) {
  const length = Math.min(Math.max(size, 1), 48);
  const out = new Uint8Array(length);
  for (let at = 0; at < length; at += 1) out[at] = (index * 17 + at * 31) & 0xff;
  return out;
}

/**
 * An anonymised excerpt of a real Setup bundle's layout: the `Main/` file and
 * the first `Game/<project>/…` entries, so the fixture keeps §13.1's Setup shape
 * (and its backslash separators) with neutral names and synthetic content.
 */
function anonymiseBundle(bytes, limit) {
  const entries = readZip(bytes);
  const top = (name) => name.split(/[\\/]/)[0].toLowerCase();
  const files = entries.filter((entry) => !/[\\/]$/.test(entry.name));
  const picked = [
    ...files.filter((entry) => top(entry.name) === "main"),
    ...files.filter((entry) => top(entry.name) === "game"),
  ].slice(0, limit);
  if (!picked.some((entry) => top(entry.name) === "main") || !picked.some((entry) => top(entry.name) === "game")) {
    throw new Error("the bundle has no Main/ or Game/ entry to excerpt");
  }
  return buildZip(
    picked.map((entry, index) => ({
      name: anonymiseName(entry.name, index),
      bytes: syntheticBytes(index, entry.uncompressed),
    })),
  );
}

// -------------------------------------------------------------------- CLI

function parseArguments(argv) {
  const kind = argv[0];
  const options = {};
  const positional = [];
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--in") options.in = argv[++index];
    else if (argument === "--out") options.out = argv[++index];
    else if (argument === "--name") options.name = argv[++index];
    else if (argument === "--description") options.description = argv[++index];
    else if (argument === "--entries") options.entries = Number(argv[++index]);
    else positional.push(argument);
  }
  if (positional.length > 0) throw new Error(`unexpected argument(s): ${positional.join(" ")}`);
  return { kind, options };
}

function anonymise(kind, options) {
  const placeholders = {
    name: options.name ?? "Sample",
    description: options.description ?? "Authored placeholder text.",
    program: "",
    statusEffect: "",
    animation: "",
  };
  const bytes = new Uint8Array(readFileSync(options.in));
  if (kind === "spc") return writeSpc(readSpc(bytes), placeholders);
  if (kind === "ste") return writeSte(readSte(bytes), placeholders);
  if (kind === "setup-excerpt") return anonymiseBundle(bytes, options.entries ?? 6);
  throw new Error(`unknown kind: ${kind} (expected spc, ste or setup-excerpt)`);
}

const USAGE =
  "usage: anonymise.mjs <spc|ste|setup-excerpt> --in <file> [--out <file>] [--name <text>] [--description <text>] [--entries <n>]";

function main(argv) {
  let parsed;
  try {
    parsed = parseArguments(argv);
    if (parsed.options.in === undefined) throw new Error("--in is required");
  } catch (error) {
    console.error(`${USAGE}\n${error.message}`);
    return 1;
  }
  let out;
  try {
    out = anonymise(parsed.kind, parsed.options);
  } catch (error) {
    console.error(`anonymise.mjs: ${error.message}`);
    return 1;
  }
  if (parsed.options.out === undefined) {
    process.stdout.write(Buffer.from(out));
  } else {
    writeFileSync(parsed.options.out, out);
    console.log(`wrote ${out.length} anonymised byte(s) to ${parsed.options.out}`);
  }
  return 0;
}

if (process.argv[1] !== undefined && process.argv[1].endsWith("anonymise.mjs")) {
  process.exitCode = main(process.argv.slice(2));
}
