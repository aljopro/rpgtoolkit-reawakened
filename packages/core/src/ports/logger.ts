/**
 * The `Logger` port (AD-24; ADR 0004 decisions 2 and 6).
 *
 * AD-24 rules that `core` emits diagnostics through a `Logger` port with
 * levels and plain-data records and never through `console` (lint bans
 * `console` under `core`). The port has four levels, `debug`, `info`, `warn`
 * and `error`, each carrying a `{ level, code, message, data }` record. The
 * ordered sink adapter that turns a list of sinks into a `Logger` is
 * `createLogger` in `script/logging.ts`; this file is the contract only.
 *
 * The `level` field is part of the record rather than the method so one sink
 * can receive every level through one shape; the level is also the method name,
 * which is why a sink may read either.
 */

import type { PlainData } from "./plain-data.ts";

/** The diagnostic levels this port carries, lowest first. */
export type LogLevel = "debug" | "info" | "warn" | "error";

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

/** Where `core` sends diagnostics (AD-24). */
export type Logger = {
  debug(record: LogRecord): void;
  info(record: LogRecord): void;
  warn(record: LogRecord): void;
  error(record: LogRecord): void;
};

/** A destination for log records; a host supplies one or more (AD-24). */
export type LogSink = (record: LogRecord) => void;
