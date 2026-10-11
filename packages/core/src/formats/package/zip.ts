/**
 * The ZIP reader behind `.tpk` packages and appended-ZIP EXEs
 * (format-spec §13, AD-6).
 *
 * A `.tpk` is a standard ZIP archive; a standalone EXE is one appended to a
 * program, located by the `CMP1` trailer of §13. Both end up here as bytes,
 * which are parsed as a ZIP: the end-of-central-directory record, the central
 * directory, and each entry's local header.
 *
 * Games are untrusted input (AD-17), and `fflate` trusts an entry's declared
 * sizes — a probe in the discovery report measured `unzipSync` returning 1,000
 * bytes, with no error, for an entry declaring 1,000 but holding 10,000,000. So
 * this reader does the work `fflate` will not:
 *
 * 1. every structural limit and path rule of `PACKAGE_LIMITS` is checked while
 *    the headers are parsed, before anything is allocated;
 * 2. the declared uncompressed size is checked *before* inflating, through
 *    `unzipSync`'s `filter` hook;
 * 3. each deflate entry's own stream is inflated independently and must yield
 *    exactly the declared number of bytes, so a silently truncated decode
 *    cannot pass;
 * 4. the decoded bytes' CRC-32 must match the header.
 *
 * Every rejection names the rule it hit. Nothing is written, nothing recurses
 * (a nested archive is an ordinary file, L14), and nothing throws: a malformed
 * package is a located `FormatError` (AD-18).
 */

import { inflateSync, strFromU8, unzipSync } from "fflate/browser";
import type { Unzipped, UnzipFileInfo } from "fflate/browser";
import { crc32 } from "../image/crc32.ts";
import { foldPath } from "../main-file/layout.ts";
import { err, ok, type FormatError, type Result } from "../result.ts";
import { PACKAGE_LIMITS } from "./limits.ts";
import { canonicalEntryPath, checkEntryPath } from "./path-rules.ts";
import type { PackageFile } from "./model.ts";

/** The format-spec section every failure here cites. */
const SECTION = "format-spec §13";

// ZIP structure constants (PKZIP APPNOTE 4.3, §13). Signatures are the four
// bytes `PK\x03\x04` and friends, read little-endian.
const LOCAL_SIGNATURE = 0x04034b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const EOCD_SIGNATURE = 0x06054b50;
const ZIP64_LOCATOR_SIGNATURE = 0x07064b50;
const SENTINEL_16 = 0xffff;
const SENTINEL_32 = 0xffffffff;
const LOCAL_HEADER_BYTES = 30;
const CENTRAL_HEADER_BYTES = 46;
const EOCD_BYTES = 22;
// General-purpose flags and the DOS attribute byte of the external attributes.
const FLAG_ENCRYPTED = 0x0001;
const FLAG_DATA_DESCRIPTOR = 0x0008;
const FLAG_UTF8_NAME = 0x0800;
const DOS_DIRECTORY = 0x10;
// The only methods AD-6's `fflate` surface supports (L12).
const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;

/** One entry of the central directory, as parsed (§13). */
interface CentralEntry {
  /** The name decoded exactly as `fflate` decodes it, so keys match. */
  readonly storedName: string;
  /** The name with `\` normalised to `/` (§1.5). */
  readonly path: string;
  /** A directory: counted, path-checked, never served. */
  readonly directory: boolean;
  readonly method: number;
  readonly flags: number;
  readonly crc: number;
  readonly compressedSize: number;
  readonly uncompressedSize: number;
  readonly localOffset: number;
}

/** A located failure citing §13 (AD-18). */
function failure(offset: number, message: string): FormatError {
  return { offset, section: SECTION, message };
}

/**
 * Find the end-of-central-directory record (L15, §13). It sits in the last
 * 65,557 bytes — 22 bytes plus a possible 65,535-byte comment — and the record
 * whose comment length reaches the end of the file is the one that counts.
 */
function findEocd(view: DataView, length: number): number | undefined {
  const lowest = length > PACKAGE_LIMITS.eocdSearchBytes ? length - PACKAGE_LIMITS.eocdSearchBytes : 0;
  for (let offset = length - EOCD_BYTES; offset >= lowest; offset -= 1) {
    if (view.getUint32(offset, true) !== EOCD_SIGNATURE) continue;
    if (offset + EOCD_BYTES + view.getUint16(offset + 20, true) === length) return offset;
  }
  return undefined;
}

/**
 * Parse the central directory, applying every limit that does not need an
 * allocation (L1, L2, L4, L5, L6–L13). Entries come back in directory order;
 * `fflate` will decode them in the same order under the same names.
 */
function readCentralDirectory(bytes: Uint8Array, view: DataView, name: string): Result<readonly CentralEntry[]> {
  const length = bytes.length;
  const eocdOffset = findEocd(view, length);
  if (eocdOffset === undefined) {
    return err(
      failure(
        0,
        `Package "${name}" has no end-of-central-directory record within the last ${PACKAGE_LIMITS.eocdSearchBytes} bytes (EOCD search window, L15).`,
      ),
    );
  }
  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdSize = view.getUint32(eocdOffset + 12, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);
  const zip64 =
    totalEntries === SENTINEL_16 ||
    cdSize === SENTINEL_32 ||
    cdOffset === SENTINEL_32 ||
    (eocdOffset >= 20 && view.getUint32(eocdOffset - 20, true) === ZIP64_LOCATOR_SIGNATURE);
  if (zip64) {
    return err(failure(eocdOffset, `Package "${name}" uses ZIP64; ZIP64 archives are not supported (ZIP64, L13).`));
  }
  if (totalEntries > PACKAGE_LIMITS.maxEntries) {
    return err(
      failure(
        eocdOffset,
        `Package "${name}" has ${totalEntries} entries; the limit is ${PACKAGE_LIMITS.maxEntries} (max entry count, L2).`,
      ),
    );
  }
  if (cdOffset + cdSize > eocdOffset) {
    return err(
      failure(
        eocdOffset,
        `Package "${name}" central directory at ${cdOffset} for ${cdSize} bytes does not fit before the record at ${eocdOffset} (central directory, L19).`,
      ),
    );
  }

  const entries: CentralEntry[] = [];
  const foldedPaths = new Map<string, string>();
  const cdEnd = cdOffset + cdSize;
  let cursor = cdOffset;
  while (cursor < cdEnd) {
    // The EOCD's count (already held to L2) bounds the work: a directory that
    // keeps going past it is refused here instead of being walked to the end of
    // a crafted `cdSize`.
    if (entries.length === totalEntries) {
      return err(
        failure(
          eocdOffset,
          `Package "${name}" end-of-central-directory record declares ${totalEntries} entries but the central directory holds more; the package is corrupt (central directory, L19).`,
        ),
      );
    }
    if (cursor + CENTRAL_HEADER_BYTES > length || view.getUint32(cursor, true) !== CENTRAL_SIGNATURE) {
      return err(
        failure(
          cursor,
          `Package "${name}" central directory entry ${entries.length + 1} has no central-directory header (central directory, L19).`,
        ),
      );
    }
    const flags = view.getUint16(cursor + 8, true);
    const method = view.getUint16(cursor + 10, true);
    const crc = view.getUint32(cursor + 16, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const diskStart = view.getUint16(cursor + 34, true);
    const externalAttributes = view.getUint32(cursor + 38, true);
    const localOffset = view.getUint32(cursor + 42, true);
    if (
      compressedSize === SENTINEL_32 ||
      uncompressedSize === SENTINEL_32 ||
      localOffset === SENTINEL_32 ||
      diskStart === SENTINEL_16
    ) {
      return err(failure(cursor, `Package "${name}" uses ZIP64; ZIP64 archives are not supported (ZIP64, L13).`));
    }
    const nameEnd = cursor + CENTRAL_HEADER_BYTES + nameLength;
    if (nameEnd + extraLength + commentLength > length) {
      return err(
        failure(
          cursor,
          `Package "${name}" entry ${entries.length + 1} has a name that runs past the archive (central directory, L19).`,
        ),
      );
    }
    const storedName = strFromU8(
      bytes.subarray(cursor + CENTRAL_HEADER_BYTES, nameEnd),
      (flags & FLAG_UTF8_NAME) === 0,
    );
    const path = canonicalEntryPath(storedName);
    if ((flags & FLAG_ENCRYPTED) !== 0) {
      return err(
        failure(
          localOffset,
          `Entry "${path}" is encrypted; encrypted package entries are not supported (encrypted entry, L11).`,
        ),
      );
    }
    if (method !== METHOD_STORED && method !== METHOD_DEFLATE) {
      return err(
        failure(
          localOffset,
          `Entry "${path}" uses compression method ${method}; only stored (0) and deflate (8) are supported (compression method, L12).`,
        ),
      );
    }
    const pathProblem = checkEntryPath(storedName);
    if (pathProblem !== null) {
      return err(failure(localOffset, `${pathProblem}.`));
    }
    const directory = path.endsWith("/") || (externalAttributes & DOS_DIRECTORY) !== 0;
    if (uncompressedSize > PACKAGE_LIMITS.maxEntryUncompressedBytes) {
      return err(
        failure(
          localOffset,
          `Entry "${path}" declares ${uncompressedSize} bytes uncompressed; the limit is ${PACKAGE_LIMITS.maxEntryUncompressedBytes} (max entry size, L3).`,
        ),
      );
    }
    const folded = foldPath(path);
    const first = foldedPaths.get(folded);
    if (first !== undefined) {
      return err(
        failure(
          localOffset,
          `Entries "${first}" and "${path}" are the same path after case and separator folding; the package is ambiguous (case-insensitive duplicates, L10).`,
        ),
      );
    }
    foldedPaths.set(folded, path);
    entries.push({
      storedName,
      path,
      directory,
      method,
      flags,
      crc,
      compressedSize,
      uncompressedSize,
      localOffset,
    });
    cursor = nameEnd + extraLength + commentLength;
  }
  if (entries.length !== totalEntries) {
    return err(
      failure(
        eocdOffset,
        `Package "${name}" end-of-central-directory record declares ${totalEntries} entries but the central directory holds ${entries.length}; the package is corrupt (central directory, L19).`,
      ),
    );
  }

  let total = 0;
  for (const entry of entries) {
    if (!entry.directory) total += entry.uncompressedSize;
  }
  if (total > PACKAGE_LIMITS.maxTotalUncompressedBytes) {
    return err(
      failure(
        eocdOffset,
        `Package "${name}" declares ${total} bytes uncompressed; the limit is ${PACKAGE_LIMITS.maxTotalUncompressedBytes} (max total size, L4).`,
      ),
    );
  }
  for (const entry of entries) {
    if (entry.directory || entry.uncompressedSize === 0) continue;
    const ratio = Math.round(entry.uncompressedSize / Math.max(entry.compressedSize, 1));
    if (ratio > PACKAGE_LIMITS.maxCompressionRatio) {
      return err(
        failure(
          entry.localOffset,
          `Entry "${entry.path}" compresses at ${ratio}:1; the limit is ${PACKAGE_LIMITS.maxCompressionRatio}:1 (zip-bomb guard, L5).`,
        ),
      );
    }
  }
  return ok(entries);
}

/**
 * Check each entry's local header against the central directory (L19) and
 * return where each entry's data starts, parallel to `entries` (0 where there
 * is none). A data-descriptor entry (flag bit 3) legitimately writes zeroes in
 * its local header, so a zero there is not a disagreement.
 */
function readLocalHeaders(
  bytes: Uint8Array,
  view: DataView,
  name: string,
  entries: readonly CentralEntry[],
): Result<readonly number[]> {
  const dataOffsets: number[] = [];
  for (const entry of entries) {
    if (entry.directory) {
      dataOffsets.push(0);
      continue;
    }
    const offset = entry.localOffset;
    const wellFormed =
      offset + LOCAL_HEADER_BYTES <= bytes.length && view.getUint32(offset, true) === LOCAL_SIGNATURE;
    if (!wellFormed) {
      return err(
        failure(offset, `Entry "${entry.path}" has no local header at ${offset} (header consistency, L19).`),
      );
    }
    const localFlags = view.getUint16(offset + 6, true);
    const localMethod = view.getUint16(offset + 8, true);
    const localCrc = view.getUint32(offset + 14, true);
    const localCompressed = view.getUint32(offset + 18, true);
    const localUncompressed = view.getUint32(offset + 22, true);
    const localNameLength = view.getUint16(offset + 26, true);
    const localExtraLength = view.getUint16(offset + 28, true);
    const nameEnd = offset + LOCAL_HEADER_BYTES + localNameLength;
    const dataOffset = nameEnd + localExtraLength;
    if (nameEnd + localExtraLength > bytes.length || dataOffset + entry.compressedSize > bytes.length) {
      return err(
        failure(
          offset,
          `Entry "${entry.path}" local header or data runs past the archive (header consistency, L19).`,
        ),
      );
    }
    const localName = strFromU8(
      bytes.subarray(offset + LOCAL_HEADER_BYTES, nameEnd),
      (localFlags & FLAG_UTF8_NAME) === 0,
    );
    const descriptor = (entry.flags & FLAG_DATA_DESCRIPTOR) !== 0;
    const sizes: readonly (readonly [string, number, number])[] = [
      ["compressed size", localCompressed, entry.compressedSize],
      ["uncompressed size", localUncompressed, entry.uncompressedSize],
      ["crc32", localCrc, entry.crc],
    ];
    let mismatch: string | null = null;
    if (localName !== entry.storedName) {
      mismatch = "name";
    } else if (localMethod !== entry.method) {
      mismatch = "method";
    } else {
      for (const [label, local, central] of sizes) {
        if (local === central || (descriptor && local === 0)) continue;
        mismatch = label;
        break;
      }
    }
    if (mismatch !== null) {
      return err(
        failure(
          offset,
          `Entry "${entry.path}" local header disagrees with the central directory (${mismatch}) (header consistency, L19).`,
        ),
      );
    }
    dataOffsets.push(dataOffset);
  }
  return ok(dataOffsets);
}

/**
 * Read a ZIP archive — a `.tpk`, or the ZIP appended to a standalone EXE
 * (format-spec §13) — and return its files in archive order.
 *
 * `bytes` is the whole ZIP region, `name` the package name used in messages.
 * Every file's declared size, actual size and CRC-32 are checked, so what comes
 * back is either every entry intact or a located error naming the §13 rule that
 * stopped it. Never throws (AD-18).
 */
export function readZip(bytes: Uint8Array, name: string): Result<readonly PackageFile[]> {
  if (bytes.length > PACKAGE_LIMITS.maxCompressedInputBytes) {
    return err(
      failure(
        0,
        `Package "${name}" is ${bytes.length} bytes; the limit is ${PACKAGE_LIMITS.maxCompressedInputBytes} bytes (max compressed input, L1).`,
      ),
    );
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const central = readCentralDirectory(bytes, view, name);
  if (!central.ok) return central;
  const entries = central.value;
  const locals = readLocalHeaders(bytes, view, name, entries);
  if (!locals.ok) return locals;
  const dataOffsets = locals.value;

  // The entry's own stream must hold exactly what its header declares (L17).
  // fflate trusts the declared size, so this is proved here, before anything is
  // decoded: a lying header is a located failure, never a silently truncated
  // buffer. `out` is one byte larger than the declared size, so a huffman
  // stream that decodes to more than it claims cannot return the declared
  // length and pass the check below; the produced length is required to be
  // exactly the declared size.
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index] as CentralEntry;
    if (entry.directory) continue;
    if (entry.method === METHOD_STORED) {
      if (entry.compressedSize !== entry.uncompressedSize) {
        return err(
          failure(
            entry.localOffset,
            `Entry "${entry.path}" is stored but its compressed size ${entry.compressedSize} differs from its declared size ${entry.uncompressedSize}; the package is corrupt (declared vs actual size, L17).`,
          ),
        );
      }
      continue;
    }
    const dataOffset = dataOffsets[index] as number;
    const span = bytes.subarray(dataOffset, dataOffset + entry.compressedSize);
    let inflated: Uint8Array;
    try {
      inflated = inflateSync(span, { out: new Uint8Array(entry.uncompressedSize + 1) });
    } catch {
      return err(
        failure(
          entry.localOffset,
          `Entry "${entry.path}" does not inflate within the ${entry.uncompressedSize} bytes it declares; the package is corrupt (declared vs actual size, L17).`,
        ),
      );
    }
    if (inflated.length !== entry.uncompressedSize) {
      return err(
        failure(
          entry.localOffset,
          `Entry "${entry.path}" inflates to ${inflated.length} bytes but its header declares ${entry.uncompressedSize}; the package is corrupt (declared vs actual size, L17).`,
        ),
      );
    }
  }

  const byStoredName = new Map<string, CentralEntry>();
  for (const entry of entries) byStoredName.set(entry.storedName, entry);
  const skipped: { name: string; declared: number }[] = [];
  let unzipped: Unzipped;
  try {
    unzipped = unzipSync(bytes, {
      filter: (file: UnzipFileInfo) => {
        if (file.originalSize > PACKAGE_LIMITS.maxEntryUncompressedBytes) {
          skipped.push({ name: file.name, declared: file.originalSize });
          return false;
        }
        const entry = byStoredName.get(file.name);
        return entry !== undefined && !entry.directory;
      },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return err(failure(0, `Package "${name}" could not be read: ${reason} (archive, L19).`));
  }

  const files: PackageFile[] = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index] as CentralEntry;
    if (entry.directory) continue;
    const decoded = unzipped[entry.storedName];
    if (decoded === undefined) {
      const limit = skipped.find((entrySkipped) => entrySkipped.name === entry.storedName);
      if (limit !== undefined) {
        return err(
          failure(
            entry.localOffset,
            `Entry "${entry.path}" declares ${limit.declared} bytes uncompressed; the limit is ${PACKAGE_LIMITS.maxEntryUncompressedBytes} (max entry size, L16).`,
          ),
        );
      }
      return err(
        failure(
          entry.localOffset,
          `Entry "${entry.path}" was not extracted; the package is corrupt (declared vs actual size, L17).`,
        ),
      );
    }
    if (decoded.length !== entry.uncompressedSize) {
      return err(
        failure(
          entry.localOffset,
          `Entry "${entry.path}" inflated to ${decoded.length} bytes but its header declares ${entry.uncompressedSize}; the package is corrupt (declared vs actual size, L17).`,
        ),
      );
    }
    const actual = crc32(decoded);
    if (actual !== entry.crc) {
      return err(
        failure(
          entry.localOffset,
          `Entry "${entry.path}" CRC-32 is ${actual}; the header says ${entry.crc}; the package is corrupt (CRC-32, L18).`,
        ),
      );
    }
    files.push({ path: entry.path, bytes: decoded });
  }
  return ok(files);
}
