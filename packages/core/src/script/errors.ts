/**
 * The tracer's provisional runtime/compile-error channel.
 *
 * Format-spec §9.8 (ERR-1/ERR-2, ruled by entry 3.7) makes a runtime error
 * catchable and reported, and the program continues with the unset value. The
 * tracer has no handler slot and no report path yet, so every failure it can
 * raise — the frontend's rejected constructs, dispatch's `unknown.command` and
 * `arity.mismatch`, `sleep`'s bad argument, a bad `out`, a file program, a
 * second blocking thread and a bad restore — throws a `ScriptError` carrying a
 * stable `code`. Entry 7 replaces the throw with report-and-continue plus a
 * located `Diagnostic` (AD-24).
 *
 * A `ScriptError` is thrown, never stored in state, so it is an ordinary class
 * (guard-rail G1 rule 2 binds saveable state only).
 *
 * docs/adr/0004; format-spec §9.8 (ERR-1/ERR-2).
 */

/** A script failure with a stable machine-readable `code`. */
export class ScriptError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ScriptError";
    this.code = code;
  }
}
