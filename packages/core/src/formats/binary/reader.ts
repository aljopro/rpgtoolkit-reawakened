/**
 * The little-endian binary reader the legacy format readers build on
 * (format-spec §1.1 primitives, §1.2 counts, §1.3 binary/text detection).
 *
 * Pure (G2): it reads a `Uint8Array` the caller supplied and never touches a
 * host file. Every read returns a `Result` and reports a `FormatError` with the
 * field's byte offset instead of throwing (AD-18), so a truncated or corrupt
 * file is data, not an exception.
 */

import { err, ok, type Result } from "../result.ts";
import { decodeCp1252 } from "./cp1252.ts";
import { type Colorref, unpackColorref } from "./color.ts";

const SECTION = "format-spec §1.1";
const COUNT_SECTION = "format-spec §1.2";
const DETECT_SECTION = "format-spec §1.3";
const VERSION_SECTION = "format-spec §1.4";

/** The width a count or upper bound is stored in (format-spec §1.2). */
export type CountWidth = "i16" | "i32";

/**
 * The magic-and-version triple a binary Toolkit file that carries a magic
 * starts with (format-spec §1.3, §1.4). `.tst`, `.iso` and a pre-compiled
 * `.prg` have no magic and do not use it.
 */
export interface FormatHeader {
  /** The ASCII magic string, e.g. `"RPGTLKIT BOARD"` (format-spec §1.3). */
  readonly magic: string;
  /** The major version (format-spec §1.4). */
  readonly major: number;
  /** The minor version; selects the layout (format-spec §1.4). */
  readonly minor: number;
}

/**
 * The upper-bound rule (format-spec §1.2): a stored `n` means the entries are
 * indexed `0..n`, so there are `n + 1` entries, and a stored `-1` means none.
 *
 * This is *not* a true count: `tileCount` (§3.1), `frameCount` (§3.5) and the
 * `.sav` counts (§11) use `trueCount` instead. Applying this rule to them is a
 * real bug class, so the two names exist to keep them apart.
 */
export function upperBoundCount(stored: number): number {
  return stored < 0 ? 0 : stored + 1;
}

/**
 * The true-count rule (format-spec §1.2, where a format says a field is a
 * count, not an upper bound): the stored value is exactly the number of
 * entries, with no `+1`.
 */
export function trueCount(stored: number): number {
  return stored;
}

/** A cursor over a byte span (format-spec §1.1). */
export class BinaryReader {
  /** The file the bytes came from, echoed in every `FormatError` when set. */
  readonly path: string | undefined;

  private readonly data: Uint8Array;
  private readonly view: DataView;
  private pos = 0;

  constructor(bytes: Uint8Array, path?: string) {
    this.data = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.path = path;
  }

  /** The current cursor position, i.e. the next byte to read. */
  get offset(): number {
    return this.pos;
  }

  /** The underlying byte array. */
  get bytes(): Uint8Array {
    return this.data;
  }

  /** How many bytes are left to read. */
  get remaining(): number {
    return this.data.length - this.pos;
  }

  /** Whether the cursor has reached the end of the data. */
  get eof(): boolean {
    return this.pos >= this.data.length;
  }

  /** Read one unsigned byte. */
  u8(): Result<number> {
    const at = this.take(1, "u8");
    return at.ok ? ok(this.view.getUint8(at.value)) : at;
  }

  /** Read one signed byte. */
  i8(): Result<number> {
    const at = this.take(1, "i8");
    return at.ok ? ok(this.view.getInt8(at.value)) : at;
  }

  /** Read a little-endian unsigned 16-bit integer. */
  u16(): Result<number> {
    const at = this.take(2, "u16");
    return at.ok ? ok(this.view.getUint16(at.value, true)) : at;
  }

  /**
   * Read a little-endian signed 16-bit integer (the legacy "Integer"). The
   * sign is preserved: negative values are run markers and `closed = -1`
   * (format-spec §1.1).
   */
  i16(): Result<number> {
    const at = this.take(2, "i16");
    return at.ok ? ok(this.view.getInt16(at.value, true)) : at;
  }

  /** Read a little-endian unsigned 32-bit integer. */
  u32(): Result<number> {
    const at = this.take(4, "u32");
    return at.ok ? ok(this.view.getUint32(at.value, true)) : at;
  }

  /** Read a little-endian signed 32-bit integer (the legacy "Long"). */
  i32(): Result<number> {
    const at = this.take(4, "i32");
    return at.ok ? ok(this.view.getInt32(at.value, true)) : at;
  }

  /** Read a little-endian IEEE-754 double. */
  f64(): Result<number> {
    const at = this.take(8, "f64");
    return at.ok ? ok(this.view.getFloat64(at.value, true)) : at;
  }

  /**
   * Read a boolean stored as an `i16` (format-spec §1.1): `0` is false and any
   * non-zero value (the legacy `-1` included) is true. On write the canonical
   * value is `1`.
   */
  bool(): Result<boolean> {
    const v = this.i16();
    return v.ok ? ok(v.value !== 0) : v;
  }

  /** Read `length` raw bytes as a fresh (non-aliasing) array. */
  readBytes(length: number): Result<Uint8Array> {
    const at = this.take(length, `byte span of ${length}`);
    return at.ok ? ok(this.data.slice(at.value, at.value + length)) : at;
  }

  /**
   * Read a NUL-terminated Windows-1252 string (format-spec §1.1). The `0x00`
   * is consumed but not part of the value; an empty string is a single `0x00`.
   * A missing terminator before the end of the data is an error at the
   * string's first byte — the scan never runs past the end and never hangs.
   */
  str(): Result<string> {
    const start = this.pos;
    let end = start;
    while (end < this.data.length && this.data[end] !== 0) {
      end += 1;
    }
    if (end >= this.data.length) {
      return err({
        ...(this.path === undefined ? {} : { path: this.path }),
        offset: start,
        section: SECTION,
        message: `unterminated string: no NUL before end of data (string starts at ${start})`,
      });
    }
    this.pos = end + 1;
    return ok(decodeCp1252(this.data, start, end));
  }

  /**
   * Read a Windows COLORREF (format-spec §1.1): a 32-bit value laid out
   * `0x00BBGGRR`, so red is the low byte. The high byte is ignored on read.
   */
  color(): Result<Colorref> {
    const at = this.take(4, "color");
    if (!at.ok) {
      return at;
    }
    return ok(unpackColorref(this.view.getInt32(at.value, true)));
  }

  /**
   * Read `str magic`, `i16 major`, `i16 minor` (format-spec §1.3, §1.4), the
   * header every magic-carrying binary Toolkit file starts with. A negative
   * version field is invalid (§1.4) and is reported at its own offset.
   */
  header(): Result<FormatHeader> {
    const magic = this.str();
    if (!magic.ok) {
      return magic;
    }
    const majorAt = this.pos;
    const major = this.i16();
    if (!major.ok) {
      return major;
    }
    const minorAt = this.pos;
    const minor = this.i16();
    if (!minor.ok) {
      return minor;
    }
    if (major.value < 0) {
      return err({
        ...(this.path === undefined ? {} : { path: this.path }),
        offset: majorAt,
        section: VERSION_SECTION,
        message: `negative major version ${major.value} (format-spec §1.4)`,
      });
    }
    if (minor.value < 0) {
      return err({
        ...(this.path === undefined ? {} : { path: this.path }),
        offset: minorAt,
        section: VERSION_SECTION,
        message: `negative minor version ${minor.value} (format-spec §1.4)`,
      });
    }
    return ok({ magic: magic.value, major: major.value, minor: minor.value });
  }

  /**
   * Read a stored upper bound of the given width and return the entry count it
   * means (format-spec §1.2). The bound is `i16` unless a format says
   * otherwise; the `.tem`/`.itm`/`.ene` custom stances use `i32`
   * (§6.1–§6.3), so readers pass `"i32"` there. A stored value below `-1` is
   * invalid (§1.2) and is reported at the bound's first byte.
   */
  readUpperBound(width: CountWidth = "i16"): Result<number> {
    const at = this.pos;
    const stored = width === "i32" ? this.i32() : this.i16();
    if (!stored.ok) {
      return stored;
    }
    if (stored.value < -1) {
      return err({
        ...(this.path === undefined ? {} : { path: this.path }),
        offset: at,
        section: COUNT_SECTION,
        message: `invalid upper bound: ${stored.value} is below -1 (only -1 means none)`,
      });
    }
    return ok(upperBoundCount(stored.value));
  }

  /**
   * Read a stored true count of the given width (format-spec §1.2). Unlike
   * `readUpperBound` there is no `+1`: the value is exactly the entry count.
   * Used by `tileCount` (§3.1), `frameCount` (§3.5) and the `.sav` counts
   * (§11), where the upper-bound rule would over-read.
   */
  readTrueCount(width: CountWidth = "i16"): Result<number> {
    const stored = width === "i32" ? this.i32() : this.i16();
    return stored.ok ? ok(trueCount(stored.value)) : stored;
  }

  /**
   * The binary-vs-text probe of format-spec §1.3 without moving the cursor:
   * the byte at `offset` is a NUL for a binary file, anything else (a CR/LF)
   * for text. Callers pass `len(magic)` or a format's fixed detection offset
   * (12/13/14/16), whichever that section names.
   */
  isBinaryAt(offset: number): Result<boolean> {
    if (!Number.isInteger(offset) || offset < 0 || offset >= this.data.length) {
      return err({
        ...(this.path === undefined ? {} : { path: this.path }),
        offset,
        section: DETECT_SECTION,
        message: `detection byte out of range: ${offset} is not within 0..${this.data.length - 1}`,
      });
    }
    return ok(this.data[offset] === 0);
  }

  /** Move the cursor to an absolute position in `0..length` (inclusive). */
  seek(offset: number): Result<void> {
    if (!Number.isInteger(offset) || offset < 0 || offset > this.data.length) {
      return err({
        ...(this.path === undefined ? {} : { path: this.path }),
        offset,
        section: SECTION,
        message: `seek out of range: ${offset} is not within 0..${this.data.length}`,
      });
    }
    this.pos = offset;
    return ok(undefined);
  }

  /** Move the cursor by `delta` bytes, reporting a target outside the data. */
  skip(delta: number): Result<void> {
    return this.seek(this.pos + delta);
  }

  /**
   * Reserve `size` bytes at the cursor, or fail. The `offset` on the error is
   * the field's first byte, which is what locates it in the file.
   */
  private take(size: number, what: string): Result<number> {
    if (size < 0 || this.pos + size > this.data.length) {
      return err({
        ...(this.path === undefined ? {} : { path: this.path }),
        offset: this.pos,
        section: SECTION,
        message:
          size < 0
            ? `cannot read ${what}: negative size (${size})`
            : `unexpected end of data reading ${what}: need ${size} byte(s), ${this.remaining} remain`,
      });
    }
    const start = this.pos;
    this.pos += size;
    return ok(start);
  }
}
