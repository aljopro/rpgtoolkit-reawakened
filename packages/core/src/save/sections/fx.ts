/** Owner: core/render (E-59; docs/spec/engine/rpgcode-functions.md#e-59). */
import type { AssetKey } from "../../ports/keys.ts";

export type FxColor = { r: number; g: number; b: number };

export type FadeState = {
  kind: "fade";
  type: 0 | 1 | 2 | 3 | 4 | 5;
  elapsedTicks: number;
  totalTicks: 30;
};

export type WipeState = {
  kind: "wipe";
  file: string;
  asset: AssetKey | null;
  effect: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  speed: number;
  elapsedTicks: number;
  progress: number;
  total: number;
};

export type ZoomState = {
  kind: "zoom";
  from: number;
  target: number;
  elapsedTicks: number;
  totalTicks: 30;
};

export type EarthquakeState = {
  kind: "earthquake";
  intensity: number;
  pass: number;
};

export type FxSection = {
  borderColor: FxColor;
  fade: FadeState | null;
  wipe: WipeState | null;
  zoomPercent: number;
  zoom: ZoomState | null;
  earthquake: EarthquakeState | null;
};

export function createFxSection(): FxSection {
  return {
    borderColor: { r: 0, g: 0, b: 0 },
    fade: null,
    wipe: null,
    zoomPercent: 0,
    zoom: null,
    earthquake: null,
  };
}
