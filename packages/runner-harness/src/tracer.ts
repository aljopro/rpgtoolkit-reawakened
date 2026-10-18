import { assetKey, createAssetIndex, createEngine, expandTileToRgba, hashDrawList, readTileset, rasterize, tileDimensions, PACKAGE_ROOT } from "@tk-reawakened/core";
import type { AssetKey, DecodedTexture, DrawList, SpriteDraw } from "@tk-reawakened/core";
import { encodeRgbaPng } from "./png.ts";

export type TracerScene = {
  readonly schema: number;
  readonly name: string;
  readonly boardFiles: readonly string[];
  readonly ambient: readonly [number, number, number];
  readonly view: { readonly viewport: readonly [number, number]; readonly camera: readonly [number, number]; readonly include: { readonly shading: boolean; readonly images: boolean; readonly sprites: boolean } };
  readonly tick: number;
  readonly sprites?: readonly SpriteDraw[];
};
export type TracerResult = { readonly scene: string; readonly drawList: DrawList; readonly drawHash: string; readonly stateHash: string; readonly pixels: Uint8Array; readonly png: Uint8Array; readonly error: string | null };

function scenePath(path: string): string {
  if (path.includes("/Boards/")) return `Boards/${path.split("/Boards/")[1] ?? ""}`;
  if (path.includes("/Tiles/")) return `Tiles/${path.split("/Tiles/")[1] ?? ""}`;
  if (path.includes("/fixtures/authored/")) {
    const basename = path.split("/").at(-1) ?? path;
    if (basename.endsWith(".brd")) return `Boards/${basename}`;
    if (basename.endsWith(".tst") || basename.endsWith(".iso")) return `Tiles/${basename}`;
  }
  return path;
}

/** Run an authored scene through the real core engine and rasterizer with no host I/O. */
export function runTracerScene(scene: TracerScene, files: ReadonlyMap<string, Uint8Array>): TracerResult {
  if (scene.schema !== 1 || scene.boardFiles.length === 0) throw new Error("invalid tracer scene schema");
  const logicalPaths = scene.boardFiles.map(scenePath);
  const index = createAssetIndex(logicalPaths);
  const available = new Map<AssetKey, Uint8Array>();
  for (let i = 0; i < scene.boardFiles.length; i += 1) {
    const source = files.get(scene.boardFiles[i] ?? "");
    if (source) available.set(assetKey(logicalPaths[i] ?? ""), new Uint8Array(source));
  }
  // The scene's camera is where the viewport's top-left should sit, so the tracked point is its centre; the engine clamps it to the board.
  const cameraTarget = {
    getPlayerPosition: () => ({ x: scene.view.camera[0] + Math.floor(scene.view.viewport[0] / 2), y: scene.view.camera[1] + Math.floor(scene.view.viewport[1] / 2) }),
    getEntityPosition: () => null,
  };
  const engine = createEngine({
    seed: 0,
    assetIndex: index,
    assetRoot: PACKAGE_ROOT,
    initialBoard: logicalPaths[0] ?? "",
    width: scene.view.viewport[0],
    height: scene.view.viewport[1],
    maxTicks: 60,
    cameraTarget,
    globalAmbient: { r: scene.ambient[0], g: scene.ambient[1], b: scene.ambient[2] },
    ...(scene.sprites === undefined ? {} : { sprites: scene.sprites }),
  });
  let report = engine.advance(0, []);
  let guard = 0;
  while (report.loading && guard++ < scene.boardFiles.length + 16) {
    const records = report.requests.filter((request) => request.kind === "asset").map((request) => ({ tick: report.tickAfter, event: { kind: "asset" as const, reqId: request.reqId, bytes: available.get(request.key) ?? null } }));
    report = engine.advance(0, records);
  }
  if (report.loading) return { scene: scene.name, drawList: engine.drawList(0, scene.view.include), drawHash: "", stateHash: report.stateHash, pixels: new Uint8Array(), png: new Uint8Array(), error: "engine remained loading after asset replies" };
  const drawList = engine.drawList(0, scene.view.include);
  const textures = new Map<AssetKey, DecodedTexture>();
  for (const [key, bytes] of available) {
    if (!key.endsWith(".tst") && !key.endsWith(".iso")) continue;
    const parsed = readTileset(bytes, key);
    if (!parsed.ok) return { scene: scene.name, drawList, drawHash: hashDrawList(drawList), stateHash: report.stateHash, pixels: new Uint8Array(), png: new Uint8Array(), error: parsed.error.message };
    const model = parsed.value;
    const { width: storedWidth, height: storedHeight } = tileDimensions(model.detail);
    const scale = model.detail.size === 16 ? 2 : 1;
    const tileWidth = storedWidth * scale;
    const tileHeight = storedHeight * scale;
    const rgba = new Uint8Array(tileWidth * model.tiles.length * tileHeight * 4);
    for (let tile = 1; tile <= model.tiles.length; tile += 1) {
      const expanded = expandTileToRgba(model, tile - 1);
      if (!expanded.ok) return { scene: scene.name, drawList, drawHash: hashDrawList(drawList), stateHash: report.stateHash, pixels: new Uint8Array(), png: new Uint8Array(), error: expanded.error.message };
      for (let y = 0; y < tileHeight; y += 1) for (let x = 0; x < tileWidth; x += 1) {
        const from = ((Math.floor(x / scale) * storedHeight + Math.floor(y / scale)) * 4);
        const to = (y * tileWidth * model.tiles.length + (tile - 1) * tileWidth + x) * 4;
        rgba.set(expanded.value.subarray(from, from + 4), to);
      }
    }
    textures.set(key, { w: tileWidth * model.tiles.length, h: tileHeight, rgba });
  }
  const raster = rasterize(drawList, textures);
  if (raster.error) return { scene: scene.name, drawList, drawHash: hashDrawList(drawList), stateHash: report.stateHash, pixels: raster.rgba, png: new Uint8Array(), error: raster.error };
  const image: DecodedTexture = { w: raster.width, h: raster.height, rgba: raster.rgba };
  return { scene: scene.name, drawList, drawHash: hashDrawList(drawList), stateHash: report.stateHash, pixels: raster.rgba, png: encodeRgbaPng(image), error: null };
}
