/**
 * The committed corpus expectation and the comparison the golden CI job runs
 * (epic 2 Done-when 1: the corpus is a gate, not a local habit).
 *
 * The expectation holds, per pinned fixture game, the digest of every parsed
 * file (report.ts) plus the counts. A reader or a decoder that drifts changes a
 * digest, and the check names the file. Regenerating it is a deliberate act, in
 * the same sense a golden is (G5): run `pnpm dump:record` and review the diff.
 *
 * The file is written through `core`'s `canon` (AD-11), so its key order is
 * fixed by the serialiser rather than by insertion order (G3), then pretty
 * printed for a readable diff.
 */

import { canon, type PlainData } from "@rpgtoolkit/core";
import { digestsOf, type DumpCounts, type DumpReport } from "./report.ts";

/** The one line every recorded expectation carries, explaining the file. */
export const EXPECTATION_COMMENT =
  "Per-file digests of the pinned legacy sample games (tools/fixtures/sources.json), " +
  "the corpus gate the golden CI job runs. Regenerating is a deliberate act like a " +
  "golden (G5, CONTRIBUTING.md): run `pnpm dump:record` and review the diff. A changed " +
  "digest means a reader or a decoder drifted.";

/** One game's expectations: what it parsed and each parsed file's digest. */
export interface ExpectationGame {
  readonly counts: DumpCounts;
  readonly digests: { readonly [path: string]: string };
}

/** The committed corpus expectation. */
export interface Expectation {
  readonly schema: 1;
  readonly comment: string;
  readonly games: { readonly [game: string]: ExpectationGame };
}

/** What one game's digests are expected to be, taken from a fresh report. */
export function toExpectationGame(report: DumpReport): ExpectationGame {
  return { counts: report.counts, digests: digestsOf(report) };
}

/** Rebuild the expectation object from freshly built game reports, keys sorted by `canon`. */
export function buildExpectation(games: { readonly [game: string]: ExpectationGame }): Expectation {
  return { schema: 1, comment: EXPECTATION_COMMENT, games };
}

/** `Expectation` as `PlainData` — `interface`s need this because they carry no index signature. */
function toPlainData(expectation: Expectation): PlainData {
  const games: { [game: string]: PlainData } = {};
  for (const [game, value] of Object.entries(expectation.games)) {
    const digests: { [path: string]: PlainData } = {};
    for (const [path, digest] of Object.entries(value.digests)) {
      digests[path] = digest;
    }
    games[game] = {
      counts: { parsed: value.counts.parsed, skipped: value.counts.skipped, failed: value.counts.failed },
      digests,
    };
  }
  return { schema: expectation.schema, comment: expectation.comment, games };
}

/** The committed form: canonical JSON (keys sorted, G3), then a two-space indent. */
export function serializeExpectation(expectation: Expectation): string {
  return `${JSON.stringify(JSON.parse(canon(toPlainData(expectation))), null, 2)}\n`;
}

/** A malformed expectation, thrown with the file that held it. */
export class ExpectationError extends Error {
  constructor(source: string, detail: string) {
    super(`${source}: ${detail}`);
    this.name = "ExpectationError";
  }
}

/** A value that must be a `{ [key: string]: T }` record. */
function expectRecord(source: string, where: string, value: unknown): { [key: string]: unknown } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ExpectationError(source, `${where} must be an object`);
  }
  return value as { [key: string]: unknown };
}

/** A value that must be an integer count. */
function expectCount(source: string, where: string, value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ExpectationError(source, `${where} must be a non-negative integer`);
  }
  return value;
}

/** Parse and validate a committed expectation, naming the file in every failure. */
export function parseExpectation(text: string, source: string): Expectation {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (cause) {
    throw new ExpectationError(source, `not JSON: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
  const root = expectRecord(source, "the expectation", raw);
  if (root["schema"] !== 1) {
    throw new ExpectationError(source, `schema must be 1, found ${JSON.stringify(root["schema"])}`);
  }
  const rawGames = expectRecord(source, "games", root["games"]);
  const games: { [game: string]: ExpectationGame } = {};
  for (const [game, rawGame] of Object.entries(rawGames)) {
    const record = expectRecord(source, `games.${game}`, rawGame);
    const counts = expectRecord(source, `games.${game}.counts`, record["counts"]);
    const digests: { [path: string]: string } = {};
    for (const [path, digest] of Object.entries(expectRecord(source, `games.${game}.digests`, record["digests"]))) {
      if (typeof digest !== "string" || !/^[0-9a-f]{16}$/.test(digest)) {
        throw new ExpectationError(source, `games.${game}.digests["${path}"] must be a 16-hex digest`);
      }
      digests[path] = digest;
    }
    games[game] = {
      counts: {
        parsed: expectCount(source, `games.${game}.counts.parsed`, counts["parsed"]),
        skipped: expectCount(source, `games.${game}.counts.skipped`, counts["skipped"]),
        failed: expectCount(source, `games.${game}.counts.failed`, counts["failed"]),
      },
      digests,
    };
  }
  return { schema: 1, comment: typeof root["comment"] === "string" ? root["comment"] : "", games };
}

/** One parsed file whose digest is not what the expectation says. */
export interface DigestDrift {
  readonly path: string;
  readonly expected: string;
  readonly actual: string;
}

/** Everything about one game that does not match the expectation. */
export interface GameDrift {
  readonly game: string;
  readonly missing: readonly string[];
  readonly extra: readonly string[];
  readonly drifted: readonly DigestDrift[];
  readonly expectedCounts: DumpCounts;
  readonly actualCounts: DumpCounts;
}

/** Compare a fresh report with one game's expectation. */
export function compareGame(game: string, expected: ExpectationGame, actual: DumpReport): GameDrift {
  const digests = digestsOf(actual);
  const missing = Object.keys(expected.digests).filter((path) => !(path in digests)).sort();
  const extra = Object.keys(digests).filter((path) => !(path in expected.digests)).sort();
  const drifted: DigestDrift[] = [];
  for (const path of Object.keys(expected.digests).sort()) {
    const actualDigest = digests[path];
    if (actualDigest !== undefined && actualDigest !== expected.digests[path]) {
      drifted.push({ path, expected: expected.digests[path] as string, actual: actualDigest });
    }
  }
  return { game, missing, extra, drifted, expectedCounts: expected.counts, actualCounts: actual.counts };
}

/**
 * The drift as `dump: check failed: …` lines that name the file and both
 * digests — empty when the game matches its expectation exactly.
 */
export function driftLines(drift: GameDrift): string[] {
  const prefix = "dump: check failed: ";
  const lines = drift.drifted.map(
    (item) => `${prefix}${drift.game}: ${item.path} digest ${item.actual} differs from the expected ${item.expected}`,
  );
  for (const path of drift.missing) {
    lines.push(`${prefix}${drift.game}: ${path} is missing (the expectation has it, the corpus does not)`);
  }
  for (const path of drift.extra) {
    lines.push(`${prefix}${drift.game}: ${path} parsed but the expectation does not list it`);
  }
  const expected = drift.expectedCounts;
  const actual = drift.actualCounts;
  if (expected.parsed !== actual.parsed || expected.skipped !== actual.skipped || expected.failed !== actual.failed) {
    lines.push(
      `${prefix}${drift.game}: counts parsed/skipped/failed are ` +
        `${actual.parsed}/${actual.skipped}/${actual.failed}, expected ` +
        `${expected.parsed}/${expected.skipped}/${expected.failed}`,
    );
  }
  return lines;
}
