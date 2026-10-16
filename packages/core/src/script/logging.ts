/**
 * The ordered-sink `Logger` adapter (AD-24; docs/spec/engine/rpgcode-errors-and-threads.md#error-handling ERR-2).
 *
 * `core` never touches `console`: a host passes sinks, and `createLogger`
 * fans each plain-data record out to every sink in order, dropping records
 * below an optional minimum level. No sink is required; with none, every
 * record is a no-op.
 */

import type { LogLevel, LogRecord, LogSink, Logger } from "../ports/logger.ts";

/** The level order, lowest first; a `minLevel` drops everything below it. */
export const LOG_LEVELS: readonly LogLevel[] = ["debug", "info", "warn", "error"];

/**
 * Build a `Logger` over `sinks`. Each record reaches every sink in the order
 * given, with its level normalised to the method it arrived on. `minLevel`
 * (default `debug`) filters records below it.
 */
export function createLogger(sinks: readonly LogSink[] = [], minLevel: LogLevel = "debug"): Logger {
  const floor = LOG_LEVELS.indexOf(minLevel);
  const emit = (level: LogLevel, record: LogRecord): void => {
    if (LOG_LEVELS.indexOf(level) < floor) return;
    const stamped: LogRecord = record.level === level ? record : { ...record, level };
    for (const sink of sinks) sink(stamped);
  };
  return {
    debug: (record) => emit("debug", record),
    info: (record) => emit("info", record),
    warn: (record) => emit("warn", record),
    error: (record) => emit("error", record),
  };
}

/** A logger with no sinks: every record is dropped. */
export const NULL_LOGGER: Logger = createLogger([]);

/** A sink that appends every record to a plain array (tests and tooling). */
export function createCollectingSink(): { readonly sink: LogSink; readonly records: LogRecord[] } {
  const records: LogRecord[] = [];
  return {
    sink: (record) => {
      records.push(record);
    },
    records,
  };
}
