import type { DecodedTexture } from "../formats/image/model.ts";
import type { DrawList } from "../ports/draw.ts";
import type { AssetKey } from "../ports/keys.ts";

export type RasterAssets = ReadonlyMap<AssetKey, DecodedTexture>;
export type RasterResult = { readonly width: number; readonly height: number; readonly rgba: Uint8Array; readonly error: string | null };

/** Replay fill and normal texture blits to a fresh straight-RGBA target (AD-4). */
export function rasterize(list: DrawList, assets: RasterAssets): RasterResult {
  const rgba = new Uint8Array(list.width * list.height * 4);
  for (const command of list.commands) {
    if (command.kind === "fill") {
      for (let p = 0; p < rgba.length; p += 4) { rgba[p] = command.rgb.r; rgba[p + 1] = command.rgb.g; rgba[p + 2] = command.rgb.b; rgba[p + 3] = 255; }
      continue;
    }
    if (command.kind !== "blit") return { width: list.width, height: list.height, rgba, error: `unsupported draw command: ${command.kind}` };
    if (!("asset" in command.source)) return { width: list.width, height: list.height, rgba, error: "persistent-surface blit is unsupported by this tracer" };
    if (command.blend !== "normal" || command.alpha !== 255 || command.iso2d) return { width: list.width, height: list.height, rgba, error: "unsupported blit mode in 2D tracer" };
    const texture = assets.get(command.source.asset);
    if (!texture) return { width: list.width, height: list.height, rgba, error: `missing decoded texture: ${command.source.asset}` };
    const sourceX = command.source.tile === null ? 0 : (command.source.tile - 1) * 32;
    for (let y = 0; y < command.dst.h; y += 1) for (let x = 0; x < command.dst.w; x += 1) {
      const sx = command.src.x + Math.floor(x * command.src.w / command.dst.w);
      const sy = command.src.y + Math.floor(y * command.src.h / command.dst.h);
      const tx = sourceX + sx;
      if (tx < 0 || sy < 0 || tx >= texture.w || sy >= texture.h) return { width: list.width, height: list.height, rgba, error: "blit source rectangle is outside its decoded texture" };
      const si = (sy * texture.w + tx) * 4;
      const r = texture.rgba[si] ?? 0, g = texture.rgba[si + 1] ?? 0, b = texture.rgba[si + 2] ?? 0;
      if (command.key !== null && r === command.key.r && g === command.key.g && b === command.key.b) continue;
      const dx = command.dst.x + x, dy = command.dst.y + y;
      if (dx < 0 || dy < 0 || dx >= list.width || dy >= list.height) continue;
      const di = (dy * list.width + dx) * 4;
      rgba[di] = Math.max(0, Math.min(255, r + command.tint.r));
      rgba[di + 1] = Math.max(0, Math.min(255, g + command.tint.g));
      rgba[di + 2] = Math.max(0, Math.min(255, b + command.tint.b));
      rgba[di + 3] = texture.rgba[si + 3] ?? 0;
    }
  }
  return { width: list.width, height: list.height, rgba, error: null };
}
