/**
 * The little-endian binary writer that round-trips the reader ([formats/README.md#primitive-encoding]). It appends to an internal buffer and hands back the bytes
 * with `toBytes`.
 *
 * Pure (G2): it owns nothing but a `Uint8Array` and never touches a host. Only
 * `str` can fail — an unencodable Windows-1252 character is reported as a
 * `FormatError`, never silently mangled — so it alone returns a `Result`.
 */

import { ok, type Result } from "../result.ts";
import { encodeCp1252 } from "./cp1252.ts";
import { type Colorref, packColorref } from "./color.ts";

/** An append-only little-endian byte writer ([formats/README.md#primitive-encoding]). */
export class BinaryWriter {
  private buf = new Uint8Array(64);
  private view = new DataView(this.buf.buffer);
  private len = 0;

  /** Append one unsigned byte. */
  u8(value: number): void {
    this.reserve(1);
    this.view.setUint8(this.len, value & 0xff);
    this.len += 1;
  }

  /** Append one signed byte. */
  i8(value: number): void {
    this.reserve(1);
    this.view.setInt8(this.len, value);
    this.len += 1;
  }

  /** Append a little-endian unsigned 16-bit integer. */
  u16(value: number): void {
    this.reserve(2);
    this.view.setUint16(this.len, value, true);
    this.len += 2;
  }

  /** Append a little-endian signed 16-bit integer. */
  i16(value: number): void {
    this.reserve(2);
    this.view.setInt16(this.len, value, true);
    this.len += 2;
  }

  /** Append a little-endian unsigned 32-bit integer. */
  u32(value: number): void {
    this.reserve(4);
    this.view.setUint32(this.len, value, true);
    this.len += 4;
  }

  /** Append a little-endian signed 32-bit integer. */
  i32(value: number): void {
    this.reserve(4);
    this.view.setInt32(this.len, value, true);
    this.len += 4;
  }

  /** Append a little-endian IEEE-754 double. */
  f64(value: number): void {
    this.reserve(8);
    this.view.setFloat64(this.len, value, true);
    this.len += 8;
  }

  /**
   * Append a boolean as an `i16` ([formats/README.md#primitive-encoding]). The canonical value is
   * `1`; the reader accepts any non-zero (including the legacy `-1`) as true,
   * but new files always write `1` rather than `-1`.
   */
  bool(value: boolean): void {
    this.i16(value ? 1 : 0);
  }

  /** Append raw bytes verbatim (an already-serialised span). */
  writeBytes(value: Uint8Array): void {
    this.reserve(value.length);
    this.buf.set(value, this.len);
    this.len += value.length;
  }

  /**
   * Append a NUL-terminated Windows-1252 string ([formats/README.md#primitive-encoding]). Fails if
   * any character has no code-page byte; `FormatError.offset` is then the
   * character's index within `value`.
   */
  str(value: string): Result<void> {
    const encoded = encodeCp1252(value);
    if (!encoded.ok) {
      return encoded;
    }
    const bytes = encoded.value;
    this.reserve(bytes.length + 1);
    this.buf.set(bytes, this.len);
    this.len += bytes.length;
    this.view.setUint8(this.len, 0);
    this.len += 1;
    return ok(undefined);
  }

  /** Append a Windows COLORREF (`0x00BBGGRR`, red in the low byte). */
  color(value: Colorref): void {
    this.u32(packColorref(value));
  }

  /** The bytes written so far, as a fresh array. */
  toBytes(): Uint8Array {
    return this.buf.slice(0, this.len);
  }

  /** Grow the buffer so `size` more bytes fit. */
  private reserve(size: number): void {
    if (this.len + size <= this.buf.length) {
      return;
    }
    let cap = this.buf.length;
    while (cap < this.len + size) {
      cap *= 2;
    }
    const next = new Uint8Array(cap);
    next.set(this.buf.subarray(0, this.len));
    this.buf = next;
    this.view = new DataView(next.buffer);
  }
}
