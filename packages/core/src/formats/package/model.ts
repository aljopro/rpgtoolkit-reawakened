/**
 * What a loaded package is (docs/spec/formats/packaging-and-paths.md, AD-6).
 *
 * A game reaches the core in one of three forms: a loose folder, a `.tpk`
 * (a ZIP archive), or a standalone EXE whose last 12 bytes are a `CMP1` trailer
 * naming an appended ZIP. All three load to the same shape — a list of files
 * with their bytes and an `AssetIndex` the resolver answers references from —
 * so nothing downstream cares which form the game came in.
 *
 * Games are untrusted input (AD-17): the loader only ever reads the bytes the
 * host hands it, bounds them with `PACKAGE_LIMITS`, and never writes, never
 * recurses and never touches a file system or a clock.
 */

import type { AssetIndex } from "../resolver/model.ts";

/** Which of docs/spec/formats/packaging-and-paths.md's three forms a package came in. */
export type PackageFormat = "folder" | "tpk" | "exe";

/** One file of a loaded package: its path and its bytes(docs/spec/formats/packaging-and-paths.md). */
export interface PackageFile {
  /** The path as stored, with `\` normalised to `/`(docs/spec/formats/README.md#paths-inside-files); case is preserved. */
  readonly path: string;
  /** The file's bytes, exactly as the package holds them. */
  readonly bytes: Uint8Array;
}

/** A package that passed every limit, ready to serve assets. */
export interface LoadedPackage {
  /** The package's name, as the caller supplied it; used in every failure message. */
  readonly name: string;
  /** Which form it came in. */
  readonly format: PackageFormat;
  /** The files, in package order; directories are not listed. */
  readonly files: readonly PackageFile[];
  /** The resolver's lookup over `files` (AD-5). */
  readonly index: AssetIndex;
}

/**
 * One item a host reports from a loose folder (docs/spec/formats/packaging-and-paths.md).
 *
 * The core performs no I/O (G2), so the host lists the folder's entries: a file
 * with its bytes, a directory (which counts toward the entry limit but is not
 * served), or a link (rejected — a link could point outside the folder).
 */
export type FolderEntry =
  | { readonly kind: "file"; readonly path: string; readonly bytes: Uint8Array }
  | { readonly kind: "directory"; readonly path: string }
  | { readonly kind: "link"; readonly path: string };

/**
 * The input to `loadPackage`: the three forms of docs/spec/formats/packaging-and-paths.md.
 *
 * A loose folder is a list of entries; a `.tpk` and a standalone EXE are bytes.
 * An EXE is only ever an EXE when the caller says so, because its `CMP1`
 * trailer is part of the format, not a guess.
 */
export type PackageInput =
  | {
      readonly kind: "folder";
      readonly name: string;
      readonly entries: readonly FolderEntry[];
    }
  | { readonly kind: "tpk"; readonly name: string; readonly bytes: Uint8Array }
  | { readonly kind: "exe"; readonly name: string; readonly bytes: Uint8Array };
