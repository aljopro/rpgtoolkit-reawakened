/**
 * The `Logger` port (AD-24; ADR 0004 decisions 2 and 6).
 *
 * AD-24 rules that `core` emits diagnostics through a `Logger` port with
 * levels and plain-data records and never through `console` (lint bans
 * `console` under `core`). This is the minimal port entry 3 needs — `warn` and
 * `error` only, carrying a `{ level, code, message, data }` record — because
 * the registry's override warning needs a destination. Entry 7 adds the rest
 * (the remaining levels, the located script diagnostics and the sinks).
 *
 * The `level` field is part of the record rather than the method so one sink
 * can receive every level through one shape; the level is also the method name,
 * which is why a sink may read either.
 */

import type { PlainData } from "./plain-data.ts";

/** The diagnostic levels this port carries (entry 7 adds the rest). */
export type LogLevel = "warn" | "error";

/**
 * One diagnostic record: its level, a stable machine-readable `code`, a
 * human-readable `message` and plain data. `code` is the contract (a test and
 * a sink both match on it); `message` is for a human reading a log.
 */
export type LogRecord = {
  readonly level: LogLevel;
  readonly code: string;
  readonly message: string;
  readonly data: PlainData;
};

/** Where `core` sends diagnostics (AD-24). Entry 7 adds the sinks. */
export type Logger = {
  warn(record: LogRecord): void;
  error(record: LogRecord): void;
};
