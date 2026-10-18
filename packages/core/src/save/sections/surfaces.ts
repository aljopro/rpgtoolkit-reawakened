/**
 * Persistent core-owned bitmaps (AD-27).
 *
 * Save state stores straight RGBA as a tagged base64 payload. Decoded bytes
 * belong to the raster cache and are never placed in this section.
 */
import type { SurfaceId } from "../../ports/keys.ts";

export type RgbaSnapshot = {
  readonly t: "rgba";
  readonly w: number;
  readonly h: number;
  readonly b64: string;
};

export type SurfaceState = {
  id: SurfaceId;
  rev: number;
  bitmap: RgbaSnapshot;
};

export type SurfacesSection = {
  nextId: number;
  entries: Record<string, SurfaceState>;
  slots: Record<string, SurfaceId>;
  colours: Record<string, SurfaceId>;
  /** Reserved `renderNow` overlay canvas handle; zero means disabled. */
  renderNow?: SurfaceId;
};
