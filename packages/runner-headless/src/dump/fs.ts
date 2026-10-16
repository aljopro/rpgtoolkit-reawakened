/**
 * The only file-system code `dump` has: turn a path on the command line into a
 * `LoadedPackage` of `PackageFile`s.
 *
 * The epic's deliverable says the dump opens "an extracted project folder, a
 * game folder, or a `.tpk`/standalone-EXE package", so this module resolves the
 * three forms documented in `docs/spec/formats/packaging-and-paths.md#distribution-package-this-projects-own`
 * exactly as `core`'s loader expects them: a directory becomes a `folder` input
 * (the host lists the entries, because `core` performs no I/O — G2), and a
 * `.tpk`/`.exe` file is read whole and handed to the `tpk`/`exe` input. `core`
 * then applies every untrusted-input limit (AD-17).
 *
 * `runner-headless` is the Node host shell, so `node:fs`/`node:path` are allowed
 * here; G2 restricts `core` only. `node:fs` throws, so this is the one module
 * that catches: a missing path or an unreadable file becomes a located
 * `FormatError` like any reader's. Every file's `stat` size is checked against
 * `PACKAGE_LIMITS` *before* it is read whole, so a file `core` would refuse is
 * refused without ever being loaded (AD-17).
 */

import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import {
  err,
  loadPackage,
  ok,
  PACKAGE_LIMITS,
  type FolderEntry,
  type FormatError,
  type LoadedPackage,
  type Result,
} from "@tk-reawakened/core";

/** The spec section every failure here cites: the three package forms. */
const SECTION = "docs/spec/formats/packaging-and-paths.md#distribution-package-this-projects-own";

/** A located failure for a path `dump` cannot load (see `SECTION`). */
function failure(path: string, offset: number, message: string): FormatError {
  return { path, offset, section: SECTION, message };
}

/** The message of a thrown value, for a host error that is not ours. */
function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * List a directory tree as `loadPackage`'s folder entries (see `SECTION` and
 * `docs/spec/formats/packaging-and-paths.md#resolving-names`).
 *
 * Paths are POSIX and relative to `root`; names are sorted so the listing is
 * deterministic. A symbolic link is reported as a `link` entry, which the loader
 * rejects — links could point outside the game folder (L23) — so this tool never
 * follows one. A file above the per-entry limit (L25) is refused by its `stat`
 * size before it is read, so an oversized file is never loaded into memory.
 */
function walkEntries(root: string): Result<FolderEntry[]> {
  const entries: FolderEntry[] = [];
  const oversize: { error?: FormatError } = {};
  const visit = (directory: string, prefix: string): void => {
    for (const name of readdirSync(directory).sort()) {
      if (oversize.error !== undefined) return;
      const child = join(directory, name);
      const path = prefix === "" ? name : `${prefix}/${name}`;
      const stat = lstatSync(child);
      if (stat.isSymbolicLink()) {
        entries.push({ kind: "link", path });
      } else if (stat.isDirectory()) {
        entries.push({ kind: "directory", path });
        visit(child, path);
      } else if (stat.isFile()) {
        if (stat.size > PACKAGE_LIMITS.maxEntryUncompressedBytes) {
          oversize.error = failure(
            path,
            0,
            `File "${path}" is ${stat.size} bytes; the limit is ${PACKAGE_LIMITS.maxEntryUncompressedBytes} (max entry size, L25)`,
          );
          return;
        }
        entries.push({ kind: "file", path, bytes: new Uint8Array(readFileSync(child)) });
      } else {
        // A socket, FIFO or device node has no bytes to read; treat it like a link.
        entries.push({ kind: "link", path });
      }
    }
  };
  visit(root, "");
  if (oversize.error !== undefined) {
    return err(oversize.error);
  }
  return ok(entries);
}

/**
 * The bytes of a `.tpk` or standalone EXE, refused by its `stat` size before the
 * read when it is above the compressed-input limit (L1, AD-17).
 */
function readPackageBytes(absolute: string, path: string, size: number): Result<Uint8Array> {
  if (size > PACKAGE_LIMITS.maxCompressedInputBytes) {
    return err(
      failure(
        path,
        0,
        `"${path}" is ${size} bytes; the limit is ${PACKAGE_LIMITS.maxCompressedInputBytes} bytes (max compressed input, L1)`,
      ),
    );
  }
  return ok(new Uint8Array(readFileSync(absolute)));
}

/**
 * Load the project at `path`: an extracted project or game folder, a `.tpk`
 * ZIP archive, or a standalone EXE with an appended ZIP (see `SECTION`).
 *
 * A `.exe` is only treated as a package by extension — `SECTION`'s `CMP1`
 * trailer is part of the format, not a guess — and a path that is none of the
 * three is a located error naming what was expected.
 */
export function loadRoot(path: string): Result<LoadedPackage> {
  try {
    const absolute = resolve(path);
    const stat = lstatSync(absolute);
    if (stat.isSymbolicLink()) {
      return err(failure(path, 0, `"${path}" is a symbolic link; dump wants the folder or package itself (symbolic links, L23)`));
    }
    if (stat.isDirectory()) {
      const entries = walkEntries(absolute);
      if (!entries.ok) return entries;
      return loadPackage({ kind: "folder", name: basename(absolute), entries: entries.value });
    }
    if (stat.isFile()) {
      const extension = extname(absolute).toLowerCase();
      if (extension === ".tpk") {
        const bytes = readPackageBytes(absolute, path, stat.size);
        if (!bytes.ok) return bytes;
        return loadPackage({ kind: "tpk", name: basename(absolute), bytes: bytes.value });
      }
      if (extension === ".exe") {
        const bytes = readPackageBytes(absolute, path, stat.size);
        if (!bytes.ok) return bytes;
        return loadPackage({ kind: "exe", name: basename(absolute), bytes: bytes.value });
      }
      return err(
        failure(
          path,
          0,
          `"${path}" is not a project folder, a .tpk or a .exe; dump reads the three forms documented in ${SECTION}`,
        ),
      );
    }
    return err(failure(path, 0, `"${path}" is neither a file nor a directory`));
  } catch (cause) {
    return err(failure(path, 0, `cannot read "${path}": ${messageOf(cause)}`));
  }
}
