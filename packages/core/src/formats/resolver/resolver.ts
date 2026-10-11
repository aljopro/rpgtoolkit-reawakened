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
