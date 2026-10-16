/**
 * The script error channel (AD-24; format-spec §9.8 ERR-1/ERR-2).
 *
 * A `ScriptError` is thrown, never stored in state, so it is an ordinary class
 * (guard-rail G1 rule 2 binds saveable state only). It carries a stable
 * machine-readable `code` and an optional source position `pos`.
 *
 * docs/adr/0004; format-spec §9.8 (ERR-1/ERR-2).
 */

import type { SourcePos } from "./ops.ts";

/** A script failure with a stable machine-readable `code` and optional source position. */
export class ScriptError extends Error {
  readonly code: string;
  readonly pos: SourcePos | null;

  constructor(code: string, message: string, pos: SourcePos | null = null) {
    super(message);
    this.name = "ScriptError";
    this.code = code;
    this.pos = pos;
  }
}
