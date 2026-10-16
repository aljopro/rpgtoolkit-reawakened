/**
 * The pure asset resolver (format-spec §1.5, AD-5).
 *
 * A reference stored in a game file is a path relative to the folder of that
 * file's type (`village\inn.brd` under `Boards/`), and it may repeat the type
 * folder (`Item\npc.itm`). This module turns such a reference into the
 * canonical `AssetKey` of the matching entry in a host-supplied `AssetIndex`,
 * applying §1.5's rules: `\` and `/` are equivalent, matching is
 * case-insensitive, a leading type folder is stripped, subfolders are allowed,
 * and inside a package the main file's `projectPath` is ignored (AD-5).
 *
 * There is no file system and no guessing: a reference that matches no entry in
 * the index is `ok: false` (AD-18), never a synthesised path. The resolver never
 * throws.
 */

import type { AssetKey } from "../../ports/keys.ts";
import { err, ok, type Result } from "../result.ts";
import {
  asciiLower,
  foldPath,
  projectFolder,
  stripTypeFolder,
  typeFolder,
  type AssetKind,
} from "../main-file/layout.ts";
import type { AssetIndex, AssetRoot } from "./model.ts";

/** The format-spec section these rules implement. */
const SECTION = "format-spec §1.5";

/**
 * Build the resolver's lookup over the paths a host can serve (AD-5).
 *
 * Fold each path once with `foldPath` (§1.5: separators normalised, case
 * folded) and keep the folded form as the canonical key, so a lookup is
 * insensitive to the case the caller and the host each happen to use. The
 * first path wins when two paths fold to the same key.
 */
export function createAssetIndex(paths: readonly string[]): AssetIndex {
  const keys: AssetKey[] = [];
  const byKey = new Map<string, AssetKey>();
  for (const path of paths) {
    const key = assetKey(path);
    keys.push(key);
    if (!byKey.has(key)) {
      byKey.set(key, key);
    }
  }
  return { paths: [...paths], keys, byKey };
}

/**
 * The canonical key of a path: always `/` separators and a case fold
 * (format-spec §1.5). Two references that differ only by case or separator
 * share one key, which is what makes the lookup case-insensitive (AD-5).
 */
export function assetKey(path: string): AssetKey {
  return foldPath(path) as AssetKey;
}

/**
 * The root-relative path a reference of `kind` names (§1.5, AD-5):
 * `<TypeFolder>/<reference with the type prefix stripped>`, prefixed with
 * `Game/<projectPath>/` for a game folder. A package ignores `projectPath`
 * (AD-5, §13), so its reference resolves at the package root.
 */
function referencePath(root: AssetRoot, kind: AssetKind, reference: string): string {
  const relative = stripTypeFolder(kind, reference);
  const folder = typeFolder(kind);
  const prefix = root.kind === "package" ? "" : projectFolder("", root);
  return `${prefix}${folder}/${relative}`;
}

/**
 * Resolve `kind`'s `reference` against the index (format-spec §1.5, AD-5).
 *
 * The reference is normalised (`\` to `/`, case folded, leading type folder
 * stripped) and looked up; the canonical key of the matching entry is returned,
 * so two spellings of the same file give one key. A reference with no matching
 * entry is a located failure citing §1.5 — the resolver never invents a path and
 * never throws.
 */
export function resolveAsset(
  index: AssetIndex,
  root: AssetRoot,
  kind: AssetKind,
  reference: string,
): Result<AssetKey> {
  const path = referencePath(root, kind, reference);
  const key = assetKey(path);
  const resolved = index.byKey.get(key);
  if (resolved === undefined) {
    return err({
      offset: 0,
      section: SECTION,
      message: `asset "${path}" is not in the index (missing asset)`,
    });
  }
  return ok(resolved);
}

/** A resolved tile reference (docs/spec/formats/README.md#tile-references). */
export type ResolvedTileReference =
  | { readonly kind: "empty" }
  | { readonly kind: "tileset"; readonly tileset: string; readonly tile: number; readonly asset: AssetKey }
  | { readonly kind: "isometric"; readonly tileset: string; readonly tile: number; readonly asset: AssetKey }
  | { readonly kind: "singleTile"; readonly path: string; readonly asset: AssetKey }
  | { readonly kind: "animatedTile"; readonly path: string; readonly asset: AssetKey };

/**
 * Resolve a tile reference against the index (docs/spec/formats/README.md#tile-references, format-spec §1.6).
 *
 * Tile references take four forms:
 * - `name.tstN` -> tile N of `Tiles\name.tst`
 * - `name.isoN` -> tile N of `Tiles\name.iso`
 * - `name.gph` -> single-tile file `Tiles\name.gph`
 * - `name.tan` -> animated tile `Tiles\name.tan`
 *
 * Empty strings return `{ kind: "empty" }`. References with no matching entry in
 * `index` fail with a located FormatError citing §1.5.
 */
export function resolveTileReference(
  index: AssetIndex,
  root: AssetRoot,
  reference: string,
): Result<ResolvedTileReference> {
  if (reference === "") {
    return ok({ kind: "empty" });
  }
  const dot = reference.lastIndexOf(".");
  if (dot < 0) {
    return err({
      offset: 0,
      section: SECTION,
      message: `invalid tile reference "${reference}": no extension found (docs/spec/formats/README.md#tile-references)`,
    });
  }
  const ext = asciiLower(reference.slice(dot + 1, dot + 4));
  const rest = reference.slice(dot + 4);

  if ((ext === "tst" || ext === "iso") && rest.length > 0 && /^\d+$/.test(rest)) {
    const tilesetName = reference.slice(0, dot + 4);
    const tileIndex = parseInt(rest, 10);
    const resolved = resolveAsset(index, root, "tiles", tilesetName);
    if (!resolved.ok) {
      return resolved;
    }
    return ok({
      kind: ext === "tst" ? "tileset" : "isometric",
      tileset: tilesetName,
      tile: tileIndex,
      asset: resolved.value,
    });
  }

  if (ext === "gph" && rest === "") {
    const resolved = resolveAsset(index, root, "tiles", reference);
    if (!resolved.ok) {
      return resolved;
    }
    return ok({
      kind: "singleTile",
      path: reference,
      asset: resolved.value,
    });
  }

  if (ext === "tan" && rest === "") {
    const resolved = resolveAsset(index, root, "tiles", reference);
    if (!resolved.ok) {
      return resolved;
    }
    return ok({
      kind: "animatedTile",
      path: reference,
      asset: resolved.value,
    });
  }

  return err({
    offset: 0,
    section: SECTION,
    message: `unrecognised tile reference "${reference}" (docs/spec/formats/README.md#tile-references)`,
  });
}
