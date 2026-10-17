import type { AssetKey } from "../ports/keys.ts";
import { frameAt } from "../time/index.ts";
import { BinaryReader } from "../formats/binary/reader.ts";
import { resolveTileReference } from "../formats/resolver/resolver.ts";
import type { AssetIndex, AssetRoot } from "../formats/resolver/model.ts";
import { readBoard } from "../formats/board/reader.ts";
import { readTileAnimation } from "../formats/tile-animation/reader.ts";
import type { WorldBoard } from "./model.ts";

export type HydratedBoard = { readonly board: WorldBoard; readonly dependencies: readonly AssetKey[] };
export type HydrationError = { readonly path: string; readonly offset: number; readonly section: string; readonly message: string };

/** Expand vector-board references in stable LUT order; bytes are retained by the caller, never state. */
export function hydrateBoard(key: AssetKey, bytes: Uint8Array, index: AssetIndex, root: AssetRoot, assets: ReadonlyMap<AssetKey, Uint8Array>, tick = 0): { readonly value: HydratedBoard | null; readonly error: HydrationError | null; readonly missing: AssetKey | null } {
  const parsed = readBoard(new BinaryReader(bytes, key));
  if (!parsed.ok) return { value: null, error: { ...parsed.error, path: parsed.error.path ?? key }, missing: null };
  const board = parsed.value;
  if ((board.coordType & 3) !== 0) return { value: null, error: { path: key, offset: 0, section: "docs/spec/formats/board.md#coordinates", message: "isometric boards are unsupported by the 2D tracer" }, missing: null };
  const dependencies: AssetKey[] = [];
  const depSet = new Set<AssetKey>();
  const resolved: ({ asset: AssetKey; tile: number } | null)[] = [];
  for (const reference of board.lut) {
    if (reference === "") { resolved.push(null); continue; }
    const r = resolveTileReference(index, root, reference);
    if (!r.ok) return { value: null, error: { ...r.error, path: reference }, missing: null };
    if (r.value.kind === "empty") { resolved.push(null); continue; }
    let asset = r.value.asset;
    let tile = r.value.kind === "tileset" || r.value.kind === "isometric" ? r.value.tile : 1;
    if (r.value.kind === "animatedTile") {
      const animationBytes = assets.get(asset);
      if (!animationBytes) { if (!depSet.has(asset)) {depSet.add(asset); dependencies.push(asset);} resolved.push(null); continue; }
      const anim = readTileAnimation(new BinaryReader(animationBytes, asset));
      if (!anim.ok) return { value: null, error: { ...anim.error, path: anim.error.path ?? asset }, missing: null };
      const ticksPerFrame = Math.max(1, Math.floor(60000 / anim.value.speed + 0.5));
      const frameIndex = frameAt(0, tick, ticksPerFrame, anim.value.frames.length, true);
      const frame = frameIndex < 0 ? "" : anim.value.frames[frameIndex] ?? "";
      if (!frame) { resolved.push(null); continue; }
      const fr = resolveTileReference(index, root, frame);
      if (!fr.ok) return { value: null, error: { ...fr.error, path: frame }, missing: null };
      if (fr.value.kind === "empty") { resolved.push(null); continue; }
      asset = fr.value.asset;
      tile = fr.value.kind === "tileset" || fr.value.kind === "isometric" ? fr.value.tile : 1;
    }
    if (!depSet.has(asset)) { depSet.add(asset); dependencies.push(asset); }
    resolved.push({ asset, tile });
  }
  if (dependencies.some((dependency) => !assets.has(dependency))) return { value: null, error: null, missing: dependencies.find((dependency) => !assets.has(dependency)) ?? null };
  const gridWidth = board.sizeX;
  const gridHeight = board.sizeY;
  const layers = Array.from({ length: board.sizeL }, (_, layer) => ({ tiles: Array.from({ length: gridWidth * gridHeight }, (_, cell) => {
    const lutIndex = board.tileMatrix[layer * gridWidth * gridHeight + cell] ?? 0;
    return resolved[lutIndex] ?? null;
  }) }));
  const background = board.properties.backgroundColour;
  return { value: { board: { key, coordType: board.coordType, sizeX: board.sizeX, sizeY: board.sizeY, sizeL: board.sizeL, width: board.sizeX * 32, height: board.sizeY * 32, background, ambient: board.properties.ambient, layers }, dependencies }, error: null, missing: null };
}
