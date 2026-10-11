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
 * - matching is case-insensitive, so `foldPath` lower-cases a path for lookup;
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
 * Case-fold a path for the case-insensitive lookup §1.5 requires, with the
 * separators normalised first. The asset resolver keys its index on this.
 */
export function foldPath(path: string): string {
  return toSlashes(path).toLowerCase();
}

/**
 * Strip a leading type-folder prefix from a reference, case-insensitively
 * (§1.5): `Item\npc.itm` under the `items` kind becomes `npc.itm`. A reference
 * that is only the folder becomes the empty string; one with no prefix is
 * returned with its separators normalised.
 */
export function stripTypeFolder(kind: AssetKind, reference: string): string {
  const folder = ASSET_FOLDERS[kind].toLowerCase();
  const normalised = toSlashes(reference);
  const lower = normalised.toLowerCase();
  if (lower === folder) {
    return "";
  }
  const withSlash = `${folder}/`;
  return lower.startsWith(withSlash) ? normalised.slice(withSlash.length) : normalised;
}

/**
 * The project folder `<root>/Game/<projectPath>/` (format-spec §1.5). The root
 * has any trailing separator removed and the project path any leading or
 * trailing one, so the result is well-formed whatever the caller passes.
 */
export function projectFolder(root: string, project: MainFileProject): string {
  const base = toSlashes(root).replace(/\/+$/, "");
  const projectPath = toSlashes(project.projectPath).replace(/^\/+|\/+$/g, "");
  const prefix = base === "" ? "" : `${base}/`;
  return projectPath === "" ? `${prefix}Game/` : `${prefix}Game/${projectPath}/`;
}

/**
 * Resolve a stored reference of `kind` to its full path under the project
 * folder: `<root>/Game/<projectPath>/<TypeFolder>/<reference>`, with the
 * separators normalised and any leading type-folder prefix stripped (§1.5).
 * `lookup` the result with `foldPath` for the case-insensitive match.
 */
export function resolveReference(
  root: string,
  project: MainFileProject,
  kind: AssetKind,
  reference: string,
): string {
  return `${projectFolder(root, project)}${ASSET_FOLDERS[kind]}/${stripTypeFolder(kind, reference)}`;
}
