/**
 * Branded identifiers (AD-5, AD-17, AD-27).
 *
 * Ids are branded so a `SurfaceId` cannot be passed where a `ScratchId` is
 * expected and a canonical asset key cannot be confused with a logical path.
 * The brands are type-only: at runtime each id is the underlying string or
 * number, so they stay plain data.
 */

declare const assetKeyBrand: unique symbol;
declare const surfaceIdBrand: unique symbol;
declare const scratchIdBrand: unique symbol;

/**
 * A canonical asset key: the shared resolver's output for a logical path
 * (ASCII-only case fold, `/` separators, type-folder prefix rules —
 * format-spec §1.5). Never a logical path (AD-5).
 */
export type AssetKey = string & { readonly [assetKeyBrand]: "AssetKey" };

/**
 * A persistent surface id. Core-owned, monotonic and never reused; surface 0
 * is the composed frame (AD-27).
 */
export type SurfaceId = number & { readonly [surfaceIdBrand]: "SurfaceId" };

/**
 * A frame-scoped scratch target id, cleared at `pushTarget` and dead at frame
 * end. A distinct brand from `SurfaceId` (AD-27).
 */
export type ScratchId = number & { readonly [scratchIdBrand]: "ScratchId" };
