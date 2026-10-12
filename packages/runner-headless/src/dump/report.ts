/**
 * The dump report: one entry per file, the counts, and the two renderings
 * (human lines and JSON).
 *
 * Determinism (the epic's Done-when 1 is a CI gate, so the report must be
 * byte-stable): files are sorted by path, every object is built with a fixed
 * literal key order, and nothing machine-specific (an absolute path, a clock)
 * reaches the report. `serializeReport` is therefore reproducible across
 * machines for the same corpus — the expectation file compares its per-file
 * digests.
 */

import type { PackageFile } from "@tk-reawakened/core";
import type { DataFormatId } from "./formats.ts";
import { parseFile } from "./parse.ts";

/** How many files parsed, were skipped, and failed. */
export interface DumpCounts {
  readonly parsed: number;
  readonly skipped: number;
  readonly failed: number;
}

/** A data-format file that parsed; its digest is the drift signal. */
export interface DumpEntryParsed {
  readonly path: string;
  readonly status: "parsed";
  readonly format: DataFormatId;
  readonly section: string;
  readonly digest: string;
  readonly summary: string;
  readonly warnings: readonly string[];
}

/** A file `dump` deliberately does not parse, with the reason. */
export interface DumpEntrySkipped {
  readonly path: string;
  readonly status: "skipped";
  readonly reason: string;
}

/** A data-format file that would not parse: the reader's located failure. */
export interface DumpEntryFailed {
  readonly path: string;
  readonly status: "failed";
  readonly format: DataFormatId;
  readonly section: string;
  readonly error: {
    readonly offset: number;
    readonly section: string;
    readonly message: string;
  };
}

/** One line of the report. */
export type DumpEntry = DumpEntryParsed | DumpEntrySkipped | DumpEntryFailed;

/** The whole dump of one project. */
export interface DumpReport {
  readonly schema: 1;
  readonly counts: DumpCounts;
  readonly files: readonly DumpEntry[];
}

/** Byte-order path comparison, so the report never depends on directory listing order. */
function byPath(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * Parse every file of a loaded project and collect the report.
 *
 * `files` is what `loadPackage` returned, so a folder, a `.tpk` and an appended
 * ZIP all report the same paths. The count of failures is the exit verdict.
 */
export function buildReport(files: readonly PackageFile[]): DumpReport {
  const entries: DumpEntry[] = [];
  for (const file of [...files].sort((a, b) => byPath(a.path, b.path))) {
    const outcome = parseFile(file);
    switch (outcome.status) {
      case "parsed":
        entries.push({
          path: file.path,
          status: "parsed",
          format: outcome.format,
          section: outcome.section,
          digest: outcome.digest,
          summary: outcome.summary,
          warnings: outcome.warnings,
        });
        break;
      case "skipped":
        entries.push({ path: file.path, status: "skipped", reason: outcome.reason });
        break;
      case "failed":
        entries.push({
          path: file.path,
          status: "failed",
          format: outcome.format,
          section: outcome.section,
          error: {
            offset: outcome.error.offset,
            section: outcome.error.section,
            message: outcome.error.message,
          },
        });
        break;
    }
  }
  let parsed = 0;
  let skipped = 0;
  let failed = 0;
  for (const entry of entries) {
    if (entry.status === "parsed") parsed += 1;
    else if (entry.status === "skipped") skipped += 1;
    else failed += 1;
  }
  return { schema: 1, counts: { parsed, skipped, failed }, files: entries };
}

/** The one human-readable line for an entry. */
function describeEntry(entry: DumpEntry): string {
  switch (entry.status) {
    case "parsed": {
      const warnings = entry.warnings.length === 0 ? "" : `  ! ${entry.warnings.join("; ")}`;
      return `${entry.format}  ${entry.summary}  digest=${entry.digest}${warnings}`;
    }
    case "skipped":
      return `skipped  ${entry.reason}`;
    case "failed":
      return `FAILED  ${entry.format}  ${entry.error.section} at offset ${entry.error.offset}: ${entry.error.message}`;
  }
}

/** The readable rendering: one line per file in path order, then the counts. */
export function formatReport(report: DumpReport): string[] {
  const lines = report.files.map((entry) => `${entry.path}  ${describeEntry(entry)}`);
  const { parsed, skipped, failed } = report.counts;
  lines.push(`${parsed} parsed, ${skipped} skipped, ${failed} failed`);
  return lines;
}

/** The JSON rendering: two-space indent, a trailing newline, one line per leaf. */
export function serializeReport(report: DumpReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

/** The parsed entries' `path → digest` map, the corpus gate's comparison key. */
export function digestsOf(report: DumpReport): { [path: string]: string } {
  const out: { [path: string]: string } = {};
  for (const entry of report.files) {
    if (entry.status === "parsed") {
      out[entry.path] = entry.digest;
    }
  }
  return out;
}
