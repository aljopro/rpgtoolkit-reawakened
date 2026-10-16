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

import { canon, type PlainData } from "@tk-reawakened/core";
import { digestsOf, type DumpCounts, type DumpEntryParsed, type DumpReport } from "./report.ts";

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
  /**
   * Expected failures, mapped to the entry/ticket that clears them (e.g. "16.4").
   * A file listed here must fail to parse; if it parses, the check fails.
   */
  readonly expectedFailures?: { readonly [path: string]: string };
  /**
   * Expected residue, mapped to the entry/ticket that clears it (e.g. "16.6").
   * A file listed here must parse with residue; if it parses with 0 residue, the check fails.
   */
  readonly expectedResidue?: { readonly [path: string]: string };
}

/** The committed corpus expectation. */
export interface Expectation {
  readonly schema: 1;
  readonly comment: string;
  readonly ignore?: readonly string[];
  readonly games: { readonly [game: string]: ExpectationGame };
}

/** What one game's digests are expected to be, taken from a fresh report. */
export function toExpectationGame(
  report: DumpReport,
  expectedFailures?: { readonly [path: string]: string },
  expectedResidue?: { readonly [path: string]: string },
): ExpectationGame {
  const game: {
    counts: DumpCounts;
    digests: { [path: string]: string };
    expectedFailures?: { [path: string]: string };
    expectedResidue?: { [path: string]: string };
  } = { counts: report.counts, digests: digestsOf(report) };
  if (expectedFailures !== undefined && Object.keys(expectedFailures).length > 0) {
    game.expectedFailures = { ...expectedFailures };
  }
  if (expectedResidue !== undefined && Object.keys(expectedResidue).length > 0) {
    game.expectedResidue = { ...expectedResidue };
  }
  return game;
}

/** Rebuild the expectation object from freshly built game reports, keys sorted by `canon`. */
export function buildExpectation(
  games: { readonly [game: string]: ExpectationGame },
  comment = EXPECTATION_COMMENT,
  ignore?: readonly string[],
): Expectation {
  const exp: {
    schema: 1;
    comment: string;
    ignore?: readonly string[];
    games: { readonly [game: string]: ExpectationGame };
  } = { schema: 1, comment, games };
  if (ignore !== undefined && ignore.length > 0) {
    exp.ignore = [...ignore];
  }
  return exp;
}

/** `Expectation` as `PlainData` — `interface`s need this because they carry no index signature. */
function toPlainData(expectation: Expectation): PlainData {
  const games: { [game: string]: PlainData } = {};
  for (const [game, value] of Object.entries(expectation.games)) {
    const digests: { [path: string]: PlainData } = {};
    for (const [path, digest] of Object.entries(value.digests)) {
      digests[path] = digest;
    }
    const item: { [key: string]: PlainData } = {
      counts: { parsed: value.counts.parsed, skipped: value.counts.skipped, failed: value.counts.failed },
      digests,
    };
    if (value.expectedFailures !== undefined) {
      const expFail: { [path: string]: PlainData } = {};
      for (const [path, entry] of Object.entries(value.expectedFailures)) {
        expFail[path] = entry;
      }
      item["expectedFailures"] = expFail;
    }
    if (value.expectedResidue !== undefined) {
      const expRes: { [path: string]: PlainData } = {};
      for (const [path, entry] of Object.entries(value.expectedResidue)) {
        expRes[path] = entry;
      }
      item["expectedResidue"] = expRes;
    }
    games[game] = item;
  }
  const root: { [key: string]: PlainData } = {
    schema: expectation.schema,
    comment: expectation.comment,
    games,
  };
  if (expectation.ignore !== undefined) {
    root["ignore"] = [...expectation.ignore];
  }
  return root;
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
    let expectedFailures: { [path: string]: string } | undefined;
    if ("expectedFailures" in record && record["expectedFailures"] !== undefined) {
      expectedFailures = {};
      for (const [path, ticket] of Object.entries(
        expectRecord(source, `games.${game}.expectedFailures`, record["expectedFailures"]),
      )) {
        if (typeof ticket !== "string" || ticket.trim() === "") {
          throw new ExpectationError(
            source,
            `games.${game}.expectedFailures["${path}"] must be a non-empty string ticket reference`,
          );
        }
        expectedFailures[path] = ticket;
      }
    }
    let expectedResidue: { [path: string]: string } | undefined;
    if ("expectedResidue" in record && record["expectedResidue"] !== undefined) {
      expectedResidue = {};
      for (const [path, ticket] of Object.entries(
        expectRecord(source, `games.${game}.expectedResidue`, record["expectedResidue"]),
      )) {
        if (typeof ticket !== "string" || ticket.trim() === "") {
          throw new ExpectationError(
            source,
            `games.${game}.expectedResidue["${path}"] must be a non-empty string ticket reference`,
          );
        }
        expectedResidue[path] = ticket;
      }
    }
    const gameItem: ExpectationGame = {
      counts: {
        parsed: expectCount(source, `games.${game}.counts.parsed`, counts["parsed"]),
        skipped: expectCount(source, `games.${game}.counts.skipped`, counts["skipped"]),
        failed: expectCount(source, `games.${game}.counts.failed`, counts["failed"]),
      },
      digests,
      ...(expectedFailures !== undefined ? { expectedFailures } : {}),
      ...(expectedResidue !== undefined ? { expectedResidue } : {}),
    };
    games[game] = gameItem;
  }
  let ignore: string[] | undefined;
  if ("ignore" in root && root["ignore"] !== undefined) {
    if (!Array.isArray(root["ignore"])) {
      throw new ExpectationError(source, "ignore must be an array of folder names");
    }
    ignore = [];
    for (let index = 0; index < root["ignore"].length; index += 1) {
      const item = root["ignore"][index];
      if (typeof item !== "string" || item.trim() === "") {
        throw new ExpectationError(source, `ignore[${index}] must be a non-empty string`);
      }
      ignore.push(item);
    }
  }
  return {
    schema: 1,
    comment: typeof root["comment"] === "string" ? root["comment"] : "",
    ...(ignore !== undefined ? { ignore } : {}),
    games,
  };
}

/** Whether a parsed entry left unconsumed residue bytes. */
export function hasResidue(entry: DumpEntryParsed): boolean {
  for (const warning of entry.warnings) {
    if (warning.includes("residue") || warning.includes("trailing byte")) {
      return true;
    }
  }
  return false;
}

/** One parsed file whose digest is not what the expectation says. */
export interface DigestDrift {
  readonly path: string;
  readonly expected: string;
  readonly actual: string;
}

/** A file listed in expectedFailures that started passing cleanly. */
export interface ExpectedFailurePassed {
  readonly path: string;
  readonly clearedBy: string;
}

/** A file listed in expectedResidue that parsed with 0 residue bytes. */
export interface ExpectedResidueCleared {
  readonly path: string;
  readonly clearedBy: string;
}

/** A parsed file that left unexpected residue bytes. */
export interface UnexpectedResidue {
  readonly path: string;
  readonly warning: string;
}

/** Everything about one game that does not match the expectation. */
export interface GameDrift {
  readonly game: string;
  readonly missing: readonly string[];
  /**
   * Files the expectation names that are still in the corpus but no longer
   * parse, with the new report's located failure for each — a present file that
   * broke is not "missing".
   */
  readonly failed: readonly FailedFile[];
  readonly extra: readonly string[];
  readonly drifted: readonly DigestDrift[];
  readonly expectedFailuresPassed: readonly ExpectedFailurePassed[];
  readonly expectedResidueCleared: readonly ExpectedResidueCleared[];
  readonly unexpectedResidue: readonly UnexpectedResidue[];
  readonly expectedCounts: DumpCounts;
  readonly actualCounts: DumpCounts;
}

/** A file the expectation names that is present but no longer parses. */
export interface FailedFile {
  readonly path: string;
  /** The new report's failure: its section, offset and message, in one line. */
  readonly detail: string;
}

/** Compare a fresh report with one game's expectation. */
export function compareGame(game: string, expected: ExpectationGame, actual: DumpReport): GameDrift {
  const digests = digestsOf(actual);
  const failedNow = new Map<string, string>();
  const parsedEntries = new Map<string, DumpEntryParsed>();
  for (const entry of actual.files) {
    if (entry.status === "failed") {
      failedNow.set(entry.path, `${entry.error.section} at offset ${entry.error.offset}: ${entry.error.message}`);
    } else if (entry.status === "parsed") {
      parsedEntries.set(entry.path, entry);
    }
  }
  const missing = Object.keys(expected.digests)
    .filter((path) => !(path in digests) && !failedNow.has(path))
    .sort();
  const failed: FailedFile[] =
    expected.expectedFailures !== undefined
      ? Array.from(failedNow.entries())
          .filter(([path]) => !(path in (expected.expectedFailures as Record<string, string>)))
          .map(([path, detail]) => ({ path, detail }))
      : Object.keys(expected.digests)
          .filter((path) => failedNow.has(path))
          .map((path) => ({ path, detail: failedNow.get(path) as string }));
  failed.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const extra = Object.keys(digests)
    .filter(
      (path) =>
        !(path in expected.digests) &&
        (expected.expectedFailures === undefined || !(path in expected.expectedFailures)),
    )
    .sort();
  const drifted: DigestDrift[] = [];
  for (const path of Object.keys(expected.digests).sort()) {
    const actualDigest = digests[path];
    if (actualDigest !== undefined && actualDigest !== expected.digests[path]) {
      drifted.push({ path, expected: expected.digests[path] as string, actual: actualDigest });
    }
  }
  const expectedFailuresPassed: ExpectedFailurePassed[] = [];
  if (expected.expectedFailures !== undefined) {
    for (const [path, clearedBy] of Object.entries(expected.expectedFailures)) {
      if (path in digests) {
        expectedFailuresPassed.push({ path, clearedBy });
      }
    }
    expectedFailuresPassed.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  }
  const unexpectedResidue: UnexpectedResidue[] = [];
  const expectedResidueCleared: ExpectedResidueCleared[] = [];
  for (const [path, entry] of parsedEntries.entries()) {
    const residue = hasResidue(entry);
    const isExpectedResidue = expected.expectedResidue !== undefined && path in expected.expectedResidue;
    if (residue && !isExpectedResidue) {
      const warning =
        entry.warnings.find((w) => w.includes("residue") || w.includes("trailing byte")) ?? "unspecified residue";
      unexpectedResidue.push({ path, warning });
    }
  }
  unexpectedResidue.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  if (expected.expectedResidue !== undefined) {
    for (const [path, clearedBy] of Object.entries(expected.expectedResidue)) {
      const entry = parsedEntries.get(path);
      if (entry !== undefined && !hasResidue(entry)) {
        expectedResidueCleared.push({ path, clearedBy });
      }
    }
    expectedResidueCleared.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  }
  return {
    game,
    missing,
    failed,
    extra,
    drifted,
    expectedFailuresPassed,
    expectedResidueCleared,
    unexpectedResidue,
    expectedCounts: expected.counts,
    actualCounts: actual.counts,
  };
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
  for (const item of drift.failed) {
    lines.push(`${prefix}${drift.game}: ${item.path} failed to parse: ${item.detail}`);
  }
  for (const item of drift.expectedFailuresPassed) {
    lines.push(
      `${prefix}${drift.game}: ${item.path} was expected to fail (cleared by ${item.clearedBy}), but parsed successfully; update the expectation`,
    );
  }
  for (const item of drift.unexpectedResidue) {
    lines.push(`${prefix}${drift.game}: ${item.path} left unconsumed residue: ${item.warning}`);
  }
  for (const item of drift.expectedResidueCleared) {
    lines.push(
      `${prefix}${drift.game}: ${item.path} was expected to leave residue (cleared by ${item.clearedBy}), but parsed with 0 residue; update the expectation`,
    );
  }
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
