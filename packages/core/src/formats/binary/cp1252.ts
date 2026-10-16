/**
 * Windows-1252 string encoding for legacy `str` fields ([formats/README.md#primitive-encoding]).
 *
 * The spec says a `str` is a NUL-terminated single-byte string in the Windows
 * ANSI code page, "assume Windows-1252". `core` may not import `TextDecoder`,
 * so both directions are written out here.
 *
 * Undefined-byte policy: bytes `0x80`–`0x9F` are the Windows-1252 extensions,
 * except five the code page leaves undefined — `0x81`, `0x8D`, `0x8F`, `0x90`,
 * `0x9D`. Windows and the WHATWG `windows-1252` index map each of those to its
 * own C1 control code point (`0x81` → U+0081, and so on). This decoder does
 * the same, so it is total (it never fails) and lossless (`0x81` decodes to
 * U+0081 and encodes back to `0x81`), which is what a round-trip writer needs.
 */

import { err, ok, type Result } from "../result.ts";

const SECTION = "docs/spec/formats/README.md#primitive-encoding";

// Code points for bytes 0x80..0x9F. The five undefined bytes hold their own
// C1 code point (0x80 + i), which is both the Windows mapping and the mark of
// an undefined byte for the encoder below.
const HIGH: readonly number[] = [
  0x20ac, 0x0081, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030,
  0x0160, 0x2039, 0x0152, 0x008d, 0x017d, 0x008f, 0x0090, 0x2018, 0x2019, 0x201c,
  0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x009d,
  0x017e, 0x0178,
];

/** The single byte for `codePoint`, or `undefined` if Windows-1252 has none. */
function byteOf(codePoint: number): number | undefined {
  if (codePoint < 0x80 || (codePoint >= 0xa0 && codePoint <= 0xff)) {
    return codePoint;
  }
  for (let i = 0; i < HIGH.length; i++) {
    if (HIGH[i] === codePoint) {
      return 0x80 + i;
    }
  }
  return undefined;
}

/**
 * Decode `bytes[start..end)` as Windows-1252. Bytes `0x00`–`0x7F` and
 * `0xA0`–`0xFF` are Latin-1; `0x80`–`0x9F` use the extension table above.
 */
export function decodeCp1252(bytes: Uint8Array, start: number, end: number): string {
  let out = "";
  for (let i = start; i < end; i++) {
    const b = bytes[i] ?? 0;
    out += String.fromCharCode(b >= 0x80 && b <= 0x9f ? (HIGH[b - 0x80] ?? b) : b);
  }
  return out;
}

/**
 * Encode `text` as Windows-1252. A character with no code-page byte (for
 * example U+0100, or any surrogate code unit) is reported as an error rather
 * than silently mangled; `FormatError.offset` is the UTF-16 index of the
 * offending character within `text`.
 */
export function encodeCp1252(text: string): Result<Uint8Array> {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const cp = text.charCodeAt(i);
    const b = byteOf(cp);
    if (b === undefined) {
      const hex = cp.toString(16).toUpperCase().padStart(4, "0");
      return err({
        offset: i,
        section: SECTION,
        message: `character U+${hex} has no Windows-1252 encoding`,
      });
    }
    out[i] = b;
  }
  return ok(out);
}
