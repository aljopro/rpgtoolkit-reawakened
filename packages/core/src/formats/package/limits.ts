/**
 * The limits every loaded package must satisfy (format-spec §13, AD-6, AD-17).
 *
 * Games are untrusted input (AD-17), so the loader bounds everything a hostile
 * package could make it spend — bytes in, entry count, declared and actual
 * sizes, compression ratio, path shape and the appended-EXE trailer — before it
 * allocates or parses anything. Every rejection names the rule it hit, so a
 * message points back at a row here.
 *
 * **Every number is a PROPOSAL, not a measured requirement.** The discovery
 * report (`epic-legacy-formats/discovery/package-limits.md`, rows L1–L26)
 * derived them from a 134-file, 6.3 MB corpus of two sample games plus
 * `fflate`'s documented behaviour; neither sample ships a package, so the
 * package numbers have no corpus evidence at all. Changing a value is a
 * one-line edit here — this object is the single place they live.
 */
export const PACKAGE_LIMITS = {
  /** L1: the whole compressed input, before any parsing (256 MiB). */
  maxCompressedInputBytes: 268_435_456,
  /** L2/L22: files plus directories, in a package or a loose folder. */
  maxEntries: 10_000,
  /** L3/L16/L25: one entry's declared uncompressed size, checked before inflating (64 MiB). */
  maxEntryUncompressedBytes: 67_108_864,
  /** L4/L24: the sum of every entry's declared uncompressed size (512 MiB). */
  maxTotalUncompressedBytes: 536_870_912,
  /** L5: uncompressed ÷ compressed for one entry (a zip-bomb guard). */
  maxCompressionRatio: 100,
  /** L6/L26: a path's length after `\` becomes `/`, in UTF-8 bytes. */
  maxPathBytes: 256,
  /** L7/L26: a path's segments. */
  maxPathDepth: 16,
  /** L8/L26: the last segment's length in UTF-8 bytes. */
  maxBasenameBytes: 128,
  /** L15: how far back from the end an end-of-central-directory record may sit. */
  eocdSearchBytes: 65_557,
  /** L20: the appended-EXE trailer: `CMP1` plus two little-endian `i32`s. */
  trailerBytes: 12,
} as const;

/** The shape of `PACKAGE_LIMITS`, for callers that pass limits around. */
export type PackageLimits = typeof PACKAGE_LIMITS;
