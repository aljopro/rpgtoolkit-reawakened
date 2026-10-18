import type { DrawCommand, DrawList, Tint } from "../ports/draw.ts";
import { cellTint } from "./shade.ts";
import type { WorldBoard } from "../world/model.ts";

const NO_TINT: Tint = { r: 0, g: 0, b: 0 };

export type BoardView = {
  readonly board: WorldBoard;
  readonly tick: number;
  readonly camera: { readonly x: number; readonly y: number };
  readonly viewport: { readonly width: number; readonly height: number };
  readonly alpha: number;
  readonly include: { readonly shading: boolean; readonly images: boolean; readonly sprites: boolean };
  /** Script ambient is summed with board ambient once per tile blit (E-17). */
  readonly globalAmbient?: Tint;
};

/** Compose the tracer's 2D board in background, layer, row, column order (E-52). */
export function composeBoard(view: BoardView): DrawList {
  const { board, viewport, camera } = view;
  const commands: DrawCommand[] = [{ kind: "fill", rgb: board.background }];
  for (let layerIndex = 0; layerIndex < board.layers.length; layerIndex += 1) {
    const layer = board.layers[layerIndex];
    if (layer === undefined) continue;
    for (let y = 0; y < board.sizeY; y += 1) {
      for (let x = 0; x < board.sizeX; x += 1) {
        const tile = layer.tiles[y * board.sizeX + x];
        if (tile === null || tile === undefined) continue;
        const dx = x * 32 - camera.x;
        const dy = y * 32 - camera.y;
        if (dx + 32 <= 0 || dy + 32 <= 0 || dx >= viewport.width || dy >= viewport.height) continue;
        const tint = view.include.shading
          ? cellTint(board, layerIndex + 1, x, y, view.globalAmbient)
          : NO_TINT;
        commands.push({ kind: "blit", source: { asset: tile.asset, tile: tile.tile }, src: { x: 0, y: 0, w: 32, h: 32 }, dst: { x: dx, y: dy, w: 32, h: 32 }, key: { r: 0, g: 1, b: 2 }, tint, alpha: 255, blend: "normal", iso2d: false });
      }
    }
  }
  return { tick: view.tick, width: viewport.width, height: viewport.height, commands };
}
