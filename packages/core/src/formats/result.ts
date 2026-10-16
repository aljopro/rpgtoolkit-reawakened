/**
 * The shared result contract for legacy-format readers and writers (AD-18).
 *
 * Every reader returns `Result<Model, FormatError>` and never throws for bad
 * data (AD-18, docs/spec/formats/README.md#primitive-encoding). `section` cites the format specification section the
 * error was detected under, e.g. `"docs/spec/formats/README.md#primitive-encoding"`, so a message always
 * points at the bytes it is about.
 */

/** A located failure while reading or writing a legacy format (AD-18). */
export interface FormatError {
  /** The file the error came from, when the caller supplied one. */
  readonly path?: string;
  /** The byte offset the error is about (the field's first byte). */
  readonly offset: number;
  /** The format specification section the reader was applying, e.g. `"docs/spec/formats/README.md#primitive-encoding"`. */
  readonly section: string;
  /** A human-readable description of what went wrong. */
  readonly message: string;
}

/**
 * Either a value plus any non-fatal warnings, or a single error (AD-18).
 *
 * Readers never throw: an EOF, a short read or an unencodable character is an
 * `ok: false` result, so callers decide how bad it is.
 */
export type Result<T, E = FormatError> =
  | { readonly ok: true; readonly value: T; readonly warnings: string[] }
  | { readonly ok: false; readonly error: E };

/** A successful result, carrying any non-fatal warnings the reader collected. */
export function ok<T>(value: T, warnings: string[] = []): Result<T> {
  return { ok: true, value, warnings };
}

/** A failed result. The error type defaults to `FormatError`. */
export function err<T = never, E = FormatError>(error: E): Result<T, E> {
  return { ok: false, error };
}
