// A minimal, deterministic ZIP writer for the fixture authoring scripts
// (tools/fixtures/author/*.mjs).
//
// It is deliberately independent of `packages/core`: it shares no code with the
// reader or writer under test, so a fixture it produces cannot "pass by sharing
// the writer primitives" (ticket 2.22). Only STORE (method 0) entries are
// emitted, with a fixed timestamp, so the same input always yields the same
// bytes on every machine and Node version (guard-rail G3's spirit).
//
// The layout is the PKZIP APPNOTE 4.3.16 one `docs/format-spec.md` §13 assumes:
// a local header + data per entry, then a central directory, then the
// end-of-central-directory record. Entry names are written verbatim, so a
// caller can build a backslash-separated archive (`Tiles\set.tst`) as well as a
// forward-slash one.

import { deflateRawSync } from "node:zlib";

/** The DOS date for 1980-01-01 (year 0, month 1, day 1) — the ZIP epoch. */
const DOS_DATE = 0x0021;

/** The CRC-32 (IEEE 802.3) of `bytes`, computed here so the tool is standalone. */
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) !== 0 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** A little-endian 16-bit field. */
export function le16(value) {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}

/** A little-endian 32-bit field. */
export function le32(value) {
  return new Uint8Array([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ]);
}

/** An ASCII byte array (the fixture names are ASCII). */
export function ascii(text) {
  const out = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) {
    out[index] = text.charCodeAt(index) & 0xff;
  }
  return out;
}

/** Join byte arrays end to end. */
export function concat(parts) {
  let length = 0;
  for (const part of parts) length += part.length;
  const joined = new Uint8Array(length);
  let at = 0;
  for (const part of parts) {
    joined.set(part, at);
    at += part.length;
  }
  return joined;
}

/**
 * Build a ZIP archive from `entries`, each `{ name, bytes, deflate? }`. With
 * `deflate` true the entry is compressed with `deflateRawSync` (method 8),
 * otherwise it is stored (method 0).
 */
export function buildZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const name = ascii(entry.name);
    const crc = crc32(entry.bytes);
    const body = entry.deflate === true ? new Uint8Array(deflateRawSync(entry.bytes)) : entry.bytes;
    const method = entry.deflate === true ? 8 : 0;

    const local = concat([
      le32(0x04034b50),
      le16(20),
      le16(0),
      le16(method),
      le16(0),
      le16(DOS_DATE),
      le32(crc),
      le32(body.length),
      le32(entry.bytes.length),
      le16(name.length),
      le16(0),
      name,
      body,
    ]);
    localParts.push(local);

    centralParts.push(
      concat([
        le32(0x02014b50),
        le16(20),
        le16(20),
        le16(0),
        le16(method),
        le16(0),
        le16(DOS_DATE),
        le32(crc),
        le32(body.length),
        le32(entry.bytes.length),
        le16(name.length),
        le16(0),
        le16(0),
        le16(0),
        le16(0),
        le32(0),
        le32(offset),
        name,
      ]),
    );
    offset += local.length;
  }

  const local = concat(localParts);
  const central = concat(centralParts);
  const end = concat([
    le32(0x06054b50),
    le16(0),
    le16(0),
    le16(entries.length),
    le16(entries.length),
    le32(central.length),
    le32(local.length),
    le16(0),
  ]);
  return concat([local, central, end]);
}

/**
 * A standalone EXE of `docs/format-spec.md` §13: `prefix`, then `zip`, then the
 * 12-byte trailer `CMP1`, `i32 offsetOfZip`, `i32 zipLength` (little-endian).
 */
export function appendCmp1(prefix, zip) {
  return concat([prefix, zip, ascii("CMP1"), le32(prefix.length), le32(zip.length)]);
}
