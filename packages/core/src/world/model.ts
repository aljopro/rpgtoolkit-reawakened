import type { AssetKey } from "../ports/keys.ts";
import type { Rgb } from "../ports/draw.ts";

/** Hydrated, JSON-safe board data used by the 2D compositor. */
export type WorldTile = { readonly asset: AssetKey; readonly tile: number };
export type WorldLayer = { readonly tiles: (WorldTile | null)[] };
export type WorldBoard = {
  readonly key: AssetKey;
  readonly coordType: number;
  readonly sizeX: number;
  readonly sizeY: number;
  readonly sizeL: number;
  readonly width: number;
  readonly height: number;
  readonly background: Rgb;
  readonly ambient: { readonly r: number; readonly g: number; readonly b: number };
  readonly layers: WorldLayer[];
};
