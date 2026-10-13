/**
 * Project layout and path resolution (format-spec §1.5).
 *
 * A game is a main file plus a project folder: `<root>/Main/<game>.gam` pairs
 * with `<root>/Game/<projectPath>/`, and each asset type lives in its own
 * subfolder (`Boards/`, `Prg/`, `Item/`, …). A reference stored inside one file
 * is a path relative to that type's folder.
 *
 * These functions are pure and take the root as a string: they return path
 * strings and lookup keys, never touching a file system (G2). The asset
 * resolver (a later ticket) does the actual lookup, using `foldPath` for the
 * case-insensitive match §1.5 requires.
 *
 * §1.5 rules applied here:
 * - the legacy separator is backslash; `\` and `/` are equivalent;
 * - matching is case-insensitive, so `foldPath` folds ASCII letters of a path for lookup;
 * - a saved reference may repeat the type-folder prefix (`Item\npc.itm`); a
 *   leading prefix is stripped when present.
 */

import type { MainFile } from "./model.ts";

/** A main file's project folder name; any main-file model satisfies it. */
export type MainFileProject = Pick<MainFile, "projectPath">;

/** The asset types §1.5 gives a subfolder, named by what they hold. */
export type AssetKind =
  | "tiles"
  | "boards"
  | "characters"
  | "items"
  | "enemies"
  | "specialMoves"
  | "statusEffects"
  | "backgrounds"
  | "animations"
  | "bitmaps"
  | "media"
  | "programs"
  | "fonts"
  | "plugins";

/** The subfolder each asset type lives in (format-spec §1.5). */
export const ASSET_FOLDERS: Readonly<Record<AssetKind, string>> = {
  tiles: "Tiles",
  boards: "Boards",
  characters: "Chrs",
  items: "Item",
  enemies: "Enemy",
  specialMoves: "SpcMove",
  statusEffects: "StatusE",
  backgrounds: "Bkrounds",
  animations: "Misc",
  bitmaps: "Bitmap",
  media: "Media",
  programs: "Prg",
  fonts: "Font",
  plugins: "Plugin",
};

/** The subfolder a reference of `kind` resolves under (format-spec §1.5). */
export function typeFolder(kind: AssetKind): string {
  return ASSET_FOLDERS[kind];
}

/**
 * Normalise the legacy separator: backslashes become forward slashes, so a
 * stored `village\inn.brd` and a modern `village/inn.brd` compare equal (§1.5).
 */
export function toSlashes(path: string): string {
  return path.split("\\").join("/");
}

/**
 * Fold `A`-`Z` to `a`-`z` and leave every other code point as it is (§1.5).
 * `String.prototype.toLowerCase` is not used: it follows the runtime's Unicode
 * tables, merges `U+212A` with `k` and expands `U+0130` into two code points,
 * so two runners could key one project differently (G3).
 */
export function asciiLower(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    out += code >= 0x41 && code <= 0x5a ? String.fromCharCode(code + 0x20) : text[i];
  }
  return out;
}

/**
 * Case-fold a path for the case-insensitive lookup §1.5 requires, with the
 * separators normalised first: ASCII letters only (see `asciiLower`). The
 * asset resolver keys its index on this.
 */
export function foldPath(path: string): string {
  return asciiLower(toSlashes(path));
}

/**
 * Strip a leading type-folder prefix from a reference, case-insensitively
 * (§1.5): `Item\npc.itm` under the `items` kind becomes `npc.itm`. A reference
 * that is only the folder becomes the empty string; one with no prefix is
 * returned with its separators normalised.
 */
export function stripTypeFolder(kind: AssetKind, reference: string): string {
  const folder = asciiLower(ASSET_FOLDERS[kind]);
  const normalised = toSlashes(reference);
  const lower = asciiLower(normalised);
  if (lower === folder) {
    return "";
  }
  const withSlash = `${folder}/`;
  return lower.startsWith(withSlash) ? normalised.slice(withSlash.length) : normalised;
}

/**
 * The project folder `<root>/Game/<projectPath>/` (format-spec §1.5). The root
 * has any trailing separator removed and backslashes normalised. The stored
 * project path is normalised the same way, with its leading and trailing
 * separators stripped: if its first segment is `Game` (any case) and more
 * segments follow, the path already starts at `<root>` and its remaining
 * segments are placed under `Game/`; otherwise it is a bare folder name placed
 * under `Game/`. A bare `Game` (one segment) therefore gives `<root>/Game/Game/`.
 */
export function projectFolder(root: string, project: MainFileProject): string {
  const base = toSlashes(root).replace(/\/+$/, "");
  const prefix = base === "" ? "" : `${base}/`;
  const projectPath = toSlashes(project.projectPath).replace(/^\/+|\/+$/g, "");
  if (projectPath === "") {
    return `${prefix}Game/`;
  }
  const segments = projectPath.split("/");
  if (segments.length > 1 && asciiLower(segments[0]!) === "game") {
    return `${prefix}Game/${segments.slice(1).join("/")}/`;
  }
  return `${prefix}Game/${projectPath}/`;
}

/**
 * Resolve a stored reference of `kind` under the project folder:
 * `<projectFolder>/<TypeFolder>/<reference>`, with the separators normalised and
 * any leading type-folder prefix stripped (§1.5). `lookup` the result with
 * `foldPath` for the case-insensitive match.
 */
export function resolveReference(
  root: string,
  project: MainFileProject,
  kind: AssetKind,
  reference: string,
): string {
  return `${projectFolder(root, project)}${ASSET_FOLDERS[kind]}/${stripTypeFolder(kind, reference)}`;
}
