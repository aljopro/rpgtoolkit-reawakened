/**
 * Loading a game package (format-spec §13, AD-6).
 *
 * §13 gives three forms — a loose folder, a `.tpk` (a ZIP archive) and a
 * standalone EXE with an appended ZIP behind a `CMP1` trailer — and this module
 * turns all three into one `LoadedPackage`: the files plus the `AssetIndex` the
 * resolver answers references from. Loose folders enforce the same rules as
 * archives, so a game behaves identically whichever form it arrived in. A
 * Toolkit 2 Professional standalone EXE has no `CMP1` trailer, so it is refused
 * by L21 with a message telling its author to extract the assets themselves
 * (§13.1).
 *
 * Games are untrusted input (AD-17): no file system, no recursion into nested
 * archives, no unbounded allocation, and no path that escapes the package root.
 * Every rejection is a located `FormatError` naming the §13 rule it hit
 * (AD-18); nothing here throws.
 */

import { foldPath } from "../main-file/layout.ts";
import { createAssetIndex } from "../resolver/resolver.ts";
import { err, ok, type FormatError, type Result } from "../result.ts";
import { PACKAGE_LIMITS } from "./limits.ts";
import { canonicalEntryPath, checkEntryPath } from "./path-rules.ts";
import { readZip } from "./zip.ts";
import type { FolderEntry, LoadedPackage, PackageFile, PackageInput } from "./model.ts";

/** The format-spec section every failure here cites. */
const SECTION = "format-spec §13";

/** The `CMP1` marker of §13's appended-ZIP trailer, byte by byte. */
const CMP1_MARKER: readonly number[] = [0x43, 0x4d, 0x50, 0x31];

/** A located failure citing §13 (AD-18). */
function failure(offset: number, message: string): FormatError {
  return { offset, section: SECTION, message };
}

/**
 * Why a file with no `CMP1` trailer is refused, in the words of §13.1.
 *
 * The game is almost always a Toolkit 2 Professional standalone EXE (or a
 * self-extracting installer like its `zip.exe`), which packs its data in a
 * private format with no appended ZIP at all. The loader declines to
 * reverse-engineer that packer and tells the reader what to do instead.
 */
const NO_TRAILER_HELP =
  "a Toolkit 2 standalone EXE is not supported, and the game's author must extract the assets themselves (from the original project folder, its Setup ZIP or its .tpk)";

/**
 * The ZIP appended to a standalone EXE (format-spec §13).
 *
 * The file's last 12 bytes are the trailer: `CMP1`, then `i32 offsetOfZip` and
 * `i32 zipLength` little-endian. The extracted range is returned; a trailer that
 * is absent, has a negative offset or length, or overlaps the trailer itself is
 * a located error naming L20 or L21.
 */
export function readAppendedZip(file: Uint8Array, name: string): Result<Uint8Array> {
  const length = file.length;
  const marker = length >= PACKAGE_LIMITS.trailerBytes;
  if (!marker) {
    return err(
      failure(
        0,
        `EXE "${name}" is ${length} bytes and has no CMP1 trailer — ${NO_TRAILER_HELP} (missing CMP1 trailer, L21).`,
      ),
    );
  }
  for (let index = 0; index < CMP1_MARKER.length; index += 1) {
    if (file[length - PACKAGE_LIMITS.trailerBytes + index] !== CMP1_MARKER[index]) {
      return err(
        failure(
          length - PACKAGE_LIMITS.trailerBytes,
          `EXE "${name}" has no CMP1 trailer — ${NO_TRAILER_HELP} (missing CMP1 trailer, L21).`,
        ),
      );
    }
  }
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  const offset = view.getInt32(length - 8, true);
  const zipLength = view.getInt32(length - 4, true);
  const trailerStart = length - PACKAGE_LIMITS.trailerBytes;
  if (offset < 0 || zipLength < 0 || offset + zipLength > trailerStart) {
    return err(
      failure(
        trailerStart,
        `EXE "${name}" trailer is invalid: offset ${offset}, length ${zipLength}, file ${length} bytes (CMP1 trailer, L20).`,
      ),
    );
  }
  return ok(file.subarray(offset, offset + zipLength));
}

/**
 * Validate a loose folder's entries (L22–L26) and return its files in the order
 * the host listed them. The host does the I/O (G2); this only applies the limits
 * the archive path applies, so both forms accept the same games.
 */
function loadFolder(
  name: string,
  entries: readonly FolderEntry[],
): Result<readonly PackageFile[]> {
  if (entries.length > PACKAGE_LIMITS.maxEntries) {
    return err(
      failure(
        0,
        `Folder "${name}" has ${entries.length} entries; the limit is ${PACKAGE_LIMITS.maxEntries} (max entry count, L22).`,
      ),
    );
  }
  const files: PackageFile[] = [];
  const foldedPaths = new Map<string, string>();
  let total = 0;
  for (const entry of entries) {
    const path = canonicalEntryPath(entry.path);
    if (entry.kind === "link") {
      return err(
        failure(0, `"${path}" is a symbolic link; links are not allowed in game folders (symbolic links, L23).`),
      );
    }
    const pathProblem = checkEntryPath(entry.path);
    if (pathProblem !== null) {
      return err(failure(0, `${pathProblem}.`));
    }
    const folded = foldPath(path);
    const first = foldedPaths.get(folded);
    if (first !== undefined) {
      return err(
        failure(
          0,
          `Entries "${first}" and "${path}" are the same path after case and separator folding; the package is ambiguous (case-insensitive duplicates, L10).`,
        ),
      );
    }
    foldedPaths.set(folded, path);
    if (entry.kind === "directory") continue;
    if (entry.bytes.length > PACKAGE_LIMITS.maxEntryUncompressedBytes) {
      return err(
        failure(
          0,
          `File "${path}" is ${entry.bytes.length} bytes; the limit is ${PACKAGE_LIMITS.maxEntryUncompressedBytes} (max entry size, L25).`,
        ),
      );
    }
    total += entry.bytes.length;
    files.push({ path, bytes: entry.bytes });
  }
  if (total > PACKAGE_LIMITS.maxTotalUncompressedBytes) {
    return err(
      failure(
        0,
        `Folder "${name}" totals ${total} bytes; the limit is ${PACKAGE_LIMITS.maxTotalUncompressedBytes} (max total size, L24).`,
      ),
    );
  }
  return ok(files);
}

/**
 * Load a game from any of §13's three forms: a loose folder, a `.tpk` ZIP
 * archive, or a standalone EXE with an appended ZIP.
 *
 * The result is one `LoadedPackage` — files plus the resolver's index — so
 * nothing downstream depends on the form. Every limit is enforced and every
 * failure is located and named; the loader never throws and never returns
 * partial content.
 */
export function loadPackage(input: PackageInput): Result<LoadedPackage> {
  let files: readonly PackageFile[];
  if (input.kind === "folder") {
    const loaded = loadFolder(input.name, input.entries);
    if (!loaded.ok) return loaded;
    files = loaded.value;
  } else {
    const zip = input.kind === "exe" ? readAppendedZip(input.bytes, input.name) : ok(input.bytes);
    if (!zip.ok) return zip;
    const unpacked = readZip(zip.value, input.name);
    if (!unpacked.ok) return unpacked;
    files = unpacked.value;
  }
  return ok({
    name: input.name,
    format: input.kind,
    files,
    index: createAssetIndex(files.map((file) => file.path)),
  });
}
