/**
 * Line-based text reader for Toolkit 1 and 2 text files (format-spec §15,
 * docs/spec/formats/legacy/text-formats.md).
 *
 * Scans Windows-1252 ANSI bytes line by line, handling CRLF (\r\n), LF (\n),
 * and CR (\r). Tracks exact 0-based byte offsets and 1-based line numbers so
 * errors are accurately located without throwing (AD-18, G1).
 */

import { err, ok, type Result } from "../result.ts";
import { decodeCp1252 } from "../binary/cp1252.ts";

export class TextLineReader {
  private readonly data: Uint8Array;
  readonly path: string | undefined;
  private pos: number;
  private currentLineNumber: number;

  constructor(bytes: Uint8Array, path?: string, startOffset = 0) {
    this.data = bytes;
    this.path = path;
    this.pos = startOffset;
    this.currentLineNumber = 1;
  }

  /** Current byte offset in the buffer. */
  get offset(): number {
    return this.pos;
  }

  /** Current 1-based line number. */
  get lineNumber(): number {
    return this.currentLineNumber;
  }

  /** Remaining bytes in the buffer. */
  get remaining(): number {
    return this.data.length - this.pos;
  }

  /** True while bytes remain unconsumed. */
  hasMore(): boolean {
    return this.pos < this.data.length;
  }

  private fail(offset: number, section: string, message: string): Result<never> {
    return err({
      ...(this.path === undefined ? {} : { path: this.path }),
      offset,
      section,
      message,
    });
  }

  /**
   * Read the next line as a string.
   */
  nextLine(fieldName: string, section: string): Result<string> {
    if (this.pos >= this.data.length) {
      return this.fail(
        this.pos,
        section,
        `unexpected end of file reading ${fieldName} at line ${this.currentLineNumber}`,
      );
    }
    const lineStart = this.pos;
    let lineEnd = lineStart;
    while (lineEnd < this.data.length) {
      const b = this.data[lineEnd];
      if (b === 0x0a || b === 0x0d) {
        break;
      }
      lineEnd++;
    }
    const text = decodeCp1252(this.data, lineStart, lineEnd);
    let nextPos = lineEnd;
    if (nextPos < this.data.length) {
      if (this.data[nextPos] === 0x0d) {
        nextPos++;
        if (nextPos < this.data.length && this.data[nextPos] === 0x0a) {
          nextPos++;
        }
      } else if (this.data[nextPos] === 0x0a) {
        nextPos++;
      }
    }
    this.pos = nextPos;
    this.currentLineNumber++;
    return ok(text);
  }

  /**
   * Read the next line as an integer.
   * If the line is empty/whitespace and `defaultForEmpty` is defined, returns that default.
   */
  nextInt(fieldName: string, section: string, defaultForEmpty?: number): Result<number> {
    const at = this.pos;
    const lineNum = this.currentLineNumber;
    const lineResult = this.nextLine(fieldName, section);
    if (!lineResult.ok) {
      return lineResult;
    }
    const raw = lineResult.value.trim();
    if (raw === "") {
      if (defaultForEmpty !== undefined) {
        return ok(defaultForEmpty);
      }
      return this.fail(
        at,
        section,
        `empty line reading integer ${fieldName} at line ${lineNum}`,
      );
    }
    const val = parseInt(raw, 10);
    if (Number.isNaN(val)) {
      return this.fail(
        at,
        section,
        `invalid integer for ${fieldName} ("${lineResult.value}") at line ${lineNum}`,
      );
    }
    return ok(val);
  }

  /**
   * Read the next line as a floating-point number.
   * Handles decimals and exponential notation (e.g. 6.66666666666667E-02).
   */
  nextFloat(fieldName: string, section: string, defaultForEmpty?: number): Result<number> {
    const at = this.pos;
    const lineNum = this.currentLineNumber;
    const lineResult = this.nextLine(fieldName, section);
    if (!lineResult.ok) {
      return lineResult;
    }
    const raw = lineResult.value.trim();
    if (raw === "") {
      if (defaultForEmpty !== undefined) {
        return ok(defaultForEmpty);
      }
      return this.fail(
        at,
        section,
        `empty line reading float ${fieldName} at line ${lineNum}`,
      );
    }
    const val = Number(raw);
    if (Number.isNaN(val)) {
      return this.fail(
        at,
        section,
        `invalid float for ${fieldName} ("${lineResult.value}") at line ${lineNum}`,
      );
    }
    return ok(val);
  }

  /**
   * Finish reading. Consumes any trailing whitespace / empty lines up to EOF,
   * and reports an error if non-empty content remains unconsumed.
   */
  finish(section: string): Result<void> {
    let scan = this.pos;
    while (scan < this.data.length) {
      const b = this.data[scan];
      if (b === 0x0a || b === 0x0d || b === 0x20 || b === 0x09) {
        scan++;
      } else {
        return this.fail(
          this.pos,
          section,
          `unexpected trailing data at line ${this.currentLineNumber} (byte offset ${this.pos})`,
        );
      }
    }
    this.pos = this.data.length;
    return ok(undefined);
  }
}
