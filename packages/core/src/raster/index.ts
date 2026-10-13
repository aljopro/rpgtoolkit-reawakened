/**
 * The reference rasteriser (AD-4): one surface type, one pixel pipeline, one
 * PNG encoder, and the frame entry point that replays a draw list.
 *
 * Nothing here reaches the host (G2): a caller supplies textures as surfaces and
 * gets pixels back, so the same code serves the golden images, the script's
 * `canvasGetScreen` read-back and the editor's image export (AD-4, AD-29).
 */

export * from "./surface.ts";
export * from "./rasterise.ts";
export * from "./png.ts";
