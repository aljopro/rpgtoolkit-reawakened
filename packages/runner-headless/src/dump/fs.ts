/**
 * The only file-system code `dump` has: turn a path on the command line into a
 * `LoadedPackage` of `PackageFile`s.
 *
 * The epic's deliverable says the dump opens "an extracted project folder, a
 * game folder, or a `.tpk`/standalone-EXE package", so this module resolves the
 * three forms of format-spec §13 exactly as `core`'s loader expects them: a
 * directory becomes a `folder` input (the host lists the entries, because `core`
 * performs no I/O — G2), and a `.tpk`/`.exe` file is read whole and handed to
 * the `tpk`/`exe` input. `core` then applies every untrusted-input limit (AD-17).
 *
 * `runner-headless` is the Node host shell, so `node:fs`/`node:path` are allowed
 * here; G2 restricts `core` only. `node:fs` throws, so this is the one module
 * that catches: a missing path or an unreadable file becomes a located
 * `FormatError` like any reader's.
 */

import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import {
  err,
  loadPackage,
  type FolderEntry,
  type FormatError,
  type LoadedPackage,
  type Result,
} from "@rpgtoolkit/core";

/** The format-spec section every failure here cites: the three package forms. */
const SECTION = "format-spec §13";

/** A located failure for a path `dump` cannot load (§13). */
function failure(path: string, offset: number, message: string): FormatError {
  return { path, offset, section: SECTION, message };
}

/** The message of a thrown value, for a host error that is not ours. */
function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * List a directory tree as `loadPackage`'s folder entries (§13, §1.5).
 *
 * Paths are POSIX and relative to `root`; names are sorted so the listing is
 * deterministic. A symbolic link is reported as a `link` entry, which the loader
 * rejects — links could point outside the game folder (L23) — so this tool never
 * follows one.
 */
function walkEntries(root: string): FolderEntry[] {
  const entries: FolderEntry[] = [];
  const visit = (directory: string, prefix: string): void => {
    for (const name of readdirSync(directory).sort()) {
      const child = join(directory, name);
      const path = prefix === "" ? name : `${prefix}/${name}`;
      const stat = lstatSync(child);
      if (stat.isSymbolicLink()) {
        entries.push({ kind: "link", path });
      } else if (stat.isDirectory()) {
        entries.push({ kind: "directory", path });
        visit(child, path);
      } else if (stat.isFile()) {
        entries.push({ kind: "file", path, bytes: new Uint8Array(readFileSync(child)) });
      } else {
        // A socket, FIFO or device node has no bytes to read; treat it like a link.
        entries.push({ kind: "link", path });
      }
    }
  };
  visit(root, "");
  return entries;
}

/**
 * Load the project at `path`: an extracted project or game folder, a `.tpk`
 * ZIP archive, or a standalone EXE with an appended ZIP (format-spec §13).
 *
 * A `.exe` is only treated as a package by extension — §13's `CMP1` trailer is
 * part of the format, not a guess — and a path that is none of the three is a
 * located error naming what was expected.
 */
export function loadRoot(path: string): Result<LoadedPackage> {
  try {
    const absolute = resolve(path);
    const stat = lstatSync(absolute);
    if (stat.isSymbolicLink()) {
      return err(failure(path, 0, `"${path}" is a symbolic link; dump wants the folder or package itself (symbolic links, L23)`));
    }
    if (stat.isDirectory()) {
      return loadPackage({ kind: "folder", name: basename(absolute), entries: walkEntries(absolute) });
    }
    if (stat.isFile()) {
      const extension = extname(absolute).toLowerCase();
      if (extension === ".tpk") {
        const bytes = new Uint8Array(readFileSync(absolute));
        return loadPackage({ kind: "tpk", name: basename(absolute), bytes });
      }
      if (extension === ".exe") {
        const bytes = new Uint8Array(readFileSync(absolute));
        return loadPackage({ kind: "exe", name: basename(absolute), bytes });
      }
      return err(
        failure(
          path,
          0,
          `"${path}" is not a project folder, a .tpk or a .exe; dump reads the three forms of format-spec §13`,
        ),
      );
    }
    return err(failure(path, 0, `"${path}" is neither a file nor a directory`));
  } catch (cause) {
    return err(failure(path, 0, `cannot read "${path}": ${messageOf(cause)}`));
  }
}
