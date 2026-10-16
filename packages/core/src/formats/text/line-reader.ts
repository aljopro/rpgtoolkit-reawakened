/**
 * Line-oriented text reader for legacy Toolkit 1/2 text formats
 * (docs/spec/formats/legacy/text-formats.md).
 *
 * Pure (G2): consumes a Uint8Array using Windows-1252 decoding (via decodeCp1252)
 * and never touches a host. Every read returns a non-throwing Result with exact
 * byte offsets on errors (AD-18).
 */

import { err, ok, type Result } from "../result.ts";
import { decodeCp1252 } from "../binary/cp1252.ts";

export class TextLineReader {
  readonly path: string | undefined;
  private readonly lines: string[] = [];
  private readonly offsets: number[] = [];
  private pos = 0;

  constructor(bytes: Uint8Array, path?: string, startOffset = 0) {
    this.path = path;
    const len = bytes.length;
    let lineStart = 0;
    let i = 0;
    while (i < len) {
      if (bytes[i] === 0x0d && i + 1 < len && bytes[i + 1] === 0x0a) {
        this.offsets.push(startOffset + lineStart);
        this.lines.push(decodeCp1252(bytes, lineStart, i));
        i += 2;
        lineStart = i;
      } else if (bytes[i] === 0x0a) {
        this.offsets.push(startOffset + lineStart);
        this.lines.push(decodeCp1252(bytes, lineStart, i));
        i += 1;
        lineStart = i;
      } else {
        i += 1;
      }
    }
    if (lineStart < len) {
      this.offsets.push(startOffset + lineStart);
      this.lines.push(decodeCp1252(bytes, lineStart, len));
    }
  }

  /** Current byte offset in the input bytes where the current line starts. */
  get offset(): number {
    return this.offsets[this.pos] ?? (this.offsets[this.offsets.length - 1] ?? 0);
  }

  /** Current 1-based line number. */
  get lineNumber(): number {
    return this.pos + 1;
  }

  /** Total number of lines in the file. */
  get totalLines(): number {
    return this.lines.length;
  }

  /** Remaining unconsumed lines. */
  get remainingLines(): number {
    return this.lines.length - this.pos;
  }

  /** Whether unconsumed lines remain. */
  hasMore(): boolean {
    return this.pos < this.lines.length;
  }

  /** Peek at the current line without advancing. */
  peekLine(): string | undefined {
    return this.lines[this.pos];
  }

  /** Read the next raw line. */
  nextLine(fieldName: string, section: string): Result<string> {
    if (this.pos >= this.lines.length) {
      return err({
        ...(this.path === undefined ? {} : { path: this.path }),
        offset: this.offset,
        section,
        message: `unexpected end of file reading ${fieldName}`,
      });
    }
    const line = this.lines[this.pos]!;
    this.pos += 1;
    return ok(line);
  }

  /**
   * Read the next line as an integer.
   * If the line trims to empty and defaultForEmpty is provided, returns defaultForEmpty.
   */
  nextInt(fieldName: string, section: string, defaultForEmpty?: number): Result<number> {
    const at = this.offset;
    const lineRes = this.nextLine(fieldName, section);
    if (!lineRes.ok) {
      return lineRes;
    }
    const trimmed = lineRes.value.trim();
    if (trimmed === "") {
      if (defaultForEmpty !== undefined) {
        return ok(defaultForEmpty);
      }
      return err({
        ...(this.path === undefined ? {} : { path: this.path }),
        offset: at,
        section,
        message: `expected integer for ${fieldName}, found empty line`,
      });
    }
    const n = Number(trimmed);
    if (Number.isNaN(n) || !Number.isInteger(n)) {
      return err({
        ...(this.path === undefined ? {} : { path: this.path }),
        offset: at,
        section,
        message: `invalid integer "${lineRes.value}" for ${fieldName}`,
      });
    }
    return ok(n);
  }

  /**
   * Read the next line as a floating-point number.
   * If the line trims to empty and defaultForEmpty is provided, returns defaultForEmpty.
   */
  nextFloat(fieldName: string, section: string, defaultForEmpty?: number): Result<number> {
    const at = this.offset;
    const lineRes = this.nextLine(fieldName, section);
    if (!lineRes.ok) {
      return lineRes;
    }
    const trimmed = lineRes.value.trim();
    if (trimmed === "") {
      if (defaultForEmpty !== undefined) {
        return ok(defaultForEmpty);
      }
      return err({
        ...(this.path === undefined ? {} : { path: this.path }),
        offset: at,
        section,
        message: `expected number for ${fieldName}, found empty line`,
      });
    }
    const n = Number(trimmed);
    if (Number.isNaN(n)) {
      return err({
        ...(this.path === undefined ? {} : { path: this.path }),
        offset: at,
        section,
        message: `invalid number "${lineRes.value}" for ${fieldName}`,
      });
    }
    return ok(n);
  }

  /**
   * Verifies no extra non-empty lines remain after reading all expected fields.
   */
  finish(section: string): Result<void> {
    // Check if any non-empty lines remain
    while (this.pos < this.lines.length) {
      const line = this.lines[this.pos]!;
      if (line.trim() !== "") {
        return err({
          ...(this.path === undefined ? {} : { path: this.path }),
          offset: this.offset,
          section,
          message: `${this.lines.length - this.pos} unexpected trailing line(s)`,
        });
      }
      this.pos += 1;
    }
    return ok(undefined);
  }
}
