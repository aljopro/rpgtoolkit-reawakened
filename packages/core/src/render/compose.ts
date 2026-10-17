import type { DrawCommand, DrawList } from "../ports/draw.ts";
import type { WorldBoard } from "../world/model.ts";

export type BoardView = {
  readonly board: WorldBoard;
  readonly tick: number;
  readonly camera: { readonly x: number; readonly y: number };
  readonly viewport: { readonly width: number; readonly height: number };
  readonly alpha: number;
  readonly include: { readonly shading: boolean; readonly images: boolean; readonly sprites: boolean };
};

/** Compose the tracer's 2D board in background, layer, row, column order (E-52). */
export function composeBoard(view: BoardView): DrawList {
  const { board, viewport, camera } = view;
  const commands: DrawCommand[] = [{ kind: "fill", rgb: board.background }];
  for (const layer of board.layers) {
    for (let y = 0; y < board.sizeY; y += 1) {
      for (let x = 0; x < board.sizeX; x += 1) {
        const tile = layer.tiles[y * board.sizeX + x];
        if (tile === null || tile === undefined) continue;
        const dx = x * 32 - camera.x;
        const dy = y * 32 - camera.y;
        if (dx + 32 <= 0 || dy + 32 <= 0 || dx >= viewport.width || dy >= viewport.height) continue;
        commands.push({ kind: "blit", source: { asset: tile.asset, tile: tile.tile }, src: { x: 0, y: 0, w: 32, h: 32 }, dst: { x: dx, y: dy, w: 32, h: 32 }, key: { r: 0, g: 1, b: 2 }, tint: { r: 0, g: 0, b: 0 }, alpha: 255, blend: "normal", iso2d: false });
      }
    }
  }
  return { tick: view.tick, width: viewport.width, height: viewport.height, commands };
}
