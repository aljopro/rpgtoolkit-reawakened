import type { DecodedTexture } from "../formats/image/model.ts";
import { assetKey } from "../formats/resolver/resolver.ts";
import { frameAt } from "../time/index.ts";
import type { AssetKey } from "../ports/keys.ts";
import type { DrawCommand, DrawList, Rect, Rgb, Tint } from "../ports/draw.ts";
import { addTint, cellTint } from "./shade.ts";
import type { WorldBoard, WorldImage, WorldLayer, WorldTile } from "../world/model.ts";

const TILE_SIZE = 32;
const NO_TINT: Tint = { r: 0, g: 0, b: 0 };
const TILE_KEY: Rgb = { r: 0, g: 1, b: 2 };

export type BoardBlit = {
  readonly asset: AssetKey;
  readonly src: Rect;
  readonly dst: Rect;
  readonly key?: Rgb | null;
  readonly tint?: Tint;
  readonly alpha?: number;
  readonly blend?: "normal" | "additive" | "translucent";
  readonly iso2d?: boolean;
};

export type BoardView = {
  readonly board: WorldBoard;
  readonly tick: number;
  readonly camera: { readonly x: number; readonly y: number };
  readonly viewport: { readonly width: number; readonly height: number };
  readonly alpha: number;
  readonly include: { readonly shading: boolean; readonly images: boolean; readonly sprites: boolean };
  /** Decoded textures are supplied by the core asset cache, never read here. */
  readonly assets?: ReadonlyMap<AssetKey, DecodedTexture>;
  /** Runtime layer edits replace the board's saved layer list for this frame. */
  readonly layers?: readonly WorldLayer[];
  /** Additional image commands supplied by a presentation owner. */
  readonly blits?: readonly BoardBlit[];
  /** Script ambient is summed with board ambient once per tile blit (E-17). */
  readonly globalAmbient?: Tint;
};

function visible(rect: Rect, viewport: { readonly width: number; readonly height: number }): boolean {
  return rect.w > 0 && rect.h > 0 && rect.x + rect.w > 0 && rect.y + rect.h > 0 && rect.x < viewport.width && rect.y < viewport.height;
}

function textureFor(
  assets: ReadonlyMap<AssetKey, DecodedTexture> | undefined,
  file: string,
  explicit: AssetKey | undefined,
): { readonly key: AssetKey; readonly texture: DecodedTexture } | null {
  if (assets === undefined) return null;
  const candidates = explicit === undefined
    ? [assetKey(file), assetKey(`bitmap/${file}`), assetKey(`images/${file}`)]
    : [explicit, assetKey(file), assetKey(`bitmap/${file}`), assetKey(`images/${file}`)];
  for (const key of candidates) {
    const texture = assets.get(key);
    if (texture !== undefined) return { key, texture };
  }
  return null;
}

function selectedTile(tile: WorldTile, tick: number): WorldTile {
  const animation = tile.animation;
  if (animation === undefined || animation.frames.length === 0) return tile;
  const index = frameAt(0, tick, animation.ticksPerFrame, animation.frames.length, true);
  return animation.frames[index] ?? tile;
}

function tileTint(
  board: WorldBoard,
  layer: number,
  x: number,
  y: number,
  includeShading: boolean,
  globalAmbient: Tint | undefined,
  extra: Tint | undefined,
): Tint {
  const shade = includeShading ? cellTint(board, layer, x, y, globalAmbient) : NO_TINT;
  return extra === undefined ? shade : addTint(shade, extra);
}

function tileCommand(
  board: WorldBoard,
  tile: WorldTile,
  tick: number,
  layer: number,
  x: number,
  y: number,
  dx: number,
  dy: number,
  includeShading: boolean,
  globalAmbient: Tint | undefined,
  extraTint?: Tint,
): DrawCommand {
  const selected = selectedTile(tile, tick);
  const width = selected.width ?? TILE_SIZE;
  const height = selected.height ?? TILE_SIZE;
  return {
    kind: "blit",
    source: { asset: selected.asset, tile: selected.tile },
    src: { x: 0, y: 0, w: width, h: height },
    dst: { x: dx, y: dy, w: width, h: height },
    key: TILE_KEY,
    tint: tileTint(board, layer, x, y, includeShading, globalAmbient, addTint(selected.tint ?? NO_TINT, extraTint ?? NO_TINT)),
    alpha: 255,
    blend: "normal",
    iso2d: false,
  };
}

function parallaxOffset(
  camera: number,
  imageSize: number,
  boardSize: number,
  viewportSize: number,
): number {
  const denominator = boardSize - viewportSize;
  if (denominator === 0) return 0;
  return camera * (imageSize - viewportSize) / denominator;
}
function imageCommand(
  image: WorldImage,
  board: WorldBoard,
  texture: DecodedTexture,
  resolvedAsset: AssetKey,
  camera: { readonly x: number; readonly y: number },
  viewport: { readonly width: number; readonly height: number },
): DrawCommand | null {
  const imageWidth = image.width ?? texture.w;
  const imageHeight = image.height ?? texture.h;
  let width = imageWidth;
  let height = imageHeight;
  let left = image.left - camera.x;
  let top = image.top - camera.y;
  if (image.drawType === 2) {
    width = board.width;
    height = board.height;
    left = -camera.x;
    top = -camera.y;
  } else if (image.drawType === 1) {
    left = image.left - parallaxOffset(camera.x, imageWidth, board.width, viewport.width);
    top = image.top - parallaxOffset(camera.y, imageHeight, board.height, viewport.height);
  }
  const dst = { x: left, y: top, w: width, h: height };
  if (!visible(dst, viewport)) return null;
  return {
    kind: "blit",
    source: { asset: resolvedAsset, tile: null },
    src: { x: 0, y: 0, w: texture.w, h: texture.h },
    dst,
    key: image.transparent,
    tint: NO_TINT,
    alpha: 255,
    blend: "normal",
    iso2d: false,
  };
}

function emitImage(
  commands: DrawCommand[],
  image: WorldImage,
  board: WorldBoard,
  view: BoardView,
  layer: number,
): void {
  if (image.layer !== layer) return;
  if (image.cells !== undefined) {
    for (const cell of image.cells) {
      if (cell.tile === null) continue;
      const tile = selectedTile(cell.tile, view.tick);
      const dx = image.left + cell.x * TILE_SIZE - view.camera.x;
      const dy = image.top + cell.y * TILE_SIZE - view.camera.y;
      const width = tile.width ?? TILE_SIZE;
      const height = tile.height ?? TILE_SIZE;
      if (!visible({ x: dx, y: dy, w: width, h: height }, view.viewport)) continue;
      commands.push(tileCommand(board, tile, view.tick, layer, cell.x, cell.y, dx, dy, view.include.shading, view.globalAmbient, cell.tint));
    }
    return;
  }
  const texture = textureFor(view.assets, image.file, image.asset);
  if (texture === null) return;
  const command = imageCommand(image, board, texture.texture, texture.key, view.camera, view.viewport);
  if (command !== null) commands.push(command);
}

function composeBoardView(view: BoardView): DrawList {
  const { board, viewport, camera } = view;
  const commands: DrawCommand[] = [{ kind: "fill", rgb: board.background }];
  if (view.include.images && board.backgroundImage !== undefined && board.backgroundImage !== "") {
    const texture = textureFor(view.assets, board.backgroundImage, undefined);
    if (texture !== null) {
      const image: WorldImage = {
        file: board.backgroundImage,
        left: 0,
        top: 0,
        layer: 0,
        drawType: board.backgroundDrawType ?? 0,
        transparent: TILE_KEY,
        reserved: 0,
        asset: texture.key,
      };
      const command = imageCommand(image, board, texture.texture, texture.key, camera, viewport);
      if (command !== null) commands.push(command);
    }
  }
  const layers = view.layers ?? board.layers;
  for (let layerIndex = 0; layerIndex < layers.length; layerIndex += 1) {
    const layer = layers[layerIndex];
    if (layer === undefined) continue;
    const layerNumber = layerIndex + 1;
    for (let y = 0; y < board.sizeY; y += 1) {
      for (let x = 0; x < board.sizeX; x += 1) {
        const tile = layer.tiles[y * board.sizeX + x];
        if (tile === null || tile === undefined) continue;
        const selected = selectedTile(tile, view.tick);
        const width = selected.width ?? TILE_SIZE;
        const height = selected.height ?? TILE_SIZE;
        const dx = x * TILE_SIZE - camera.x;
        const dy = y * TILE_SIZE - camera.y;
        if (!visible({ x: dx, y: dy, w: width, h: height }, viewport)) continue;
        commands.push(tileCommand(board, tile, view.tick, layerNumber, x, y, dx, dy, view.include.shading, view.globalAmbient));
      }
    }
    if (view.include.images) {
      for (const image of board.images ?? []) emitImage(commands, image, board, view, layerNumber);
    }
  }
  for (const blit of view.blits ?? []) {
    const dst = { ...blit.dst, x: blit.dst.x - camera.x, y: blit.dst.y - camera.y };
    if (!visible(dst, viewport)) continue;
    commands.push({
      kind: "blit",
      source: { asset: blit.asset, tile: null },
      src: blit.src,
      dst,
      key: blit.key ?? null,
      tint: blit.tint ?? NO_TINT,
      alpha: blit.alpha ?? 255,
      blend: blit.blend ?? "normal",
      iso2d: blit.iso2d ?? false,
    });
  }
  return { tick: view.tick, width: viewport.width, height: viewport.height, commands };
}

export type BoardComposeView = Omit<BoardView, "board" | "assets"> & {
  readonly assets?: ReadonlyMap<AssetKey, DecodedTexture>;
};

export function composeBoard(view: BoardView): DrawList;
export function composeBoard(
  board: WorldBoard,
  assets: ReadonlyMap<AssetKey, DecodedTexture>,
  view: BoardComposeView,
): DrawList;
export function composeBoard(
  first: BoardView | WorldBoard,
  second?: ReadonlyMap<AssetKey, DecodedTexture>,
  third?: BoardComposeView,
): DrawList {
  if (third !== undefined) {
    const base = { ...third, board: first as WorldBoard };
    return second === undefined ? composeBoardView(base) : composeBoardView({ ...base, assets: second });
  }
  return composeBoardView(first as BoardView);
}
