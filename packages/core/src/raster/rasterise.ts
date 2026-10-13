/**
 * Replaying one frame onto a surface (AD-4).
 *
 * `rasteriseDrawList` is the whole reference rasteriser: a `DrawList` plus a
 * resolver for its textures become pixels, with no I/O and no host object, so a
 * golden image, a script's read-back and the editor's export all come from the
 * same code (AD-4, AD-29). A source the resolver cannot find is skipped — a
 * missing asset is a normal condition (AD-5) and must not take a runner down —
 * while a command the rasteriser does not implement yet is refused loudly,
 * naming the entry that adds it, because silently skipping one would freeze a
 * wrong frame into every golden.
 */

import type { BlitSource, DrawCommand, DrawList } from "../ports/draw.ts";
import { UnsupportedRasterFeatureError } from "./surface.ts";
import { blitSurface, createSurface, fillSurface, type Surface } from "./surface.ts";

/** Resolves a `blit` source to pixels; `null` means the texture is not available. */
export type TextureResolver = (source: BlitSource) => Surface | null;

/** Replay `drawList` into a new surface of the list's logical size (AD-4). */
export function rasteriseDrawList(drawList: DrawList, resolve: TextureResolver): Surface {
  const target = createSurface(drawList.width, drawList.height);
  for (const command of drawList.commands) {
    replay(target, command, resolve);
  }
  return target;
}

/** One command onto `target`, or the named error for one the rasteriser lacks. */
function replay(target: Surface, command: DrawCommand, resolve: TextureResolver): void {
  switch (command.kind) {
    case "fill":
      fillSurface(target, command.rgb);
      return;
    case "blit": {
      const source = resolve(command.source);
      if (source !== null) {
        blitSurface(target, command, source);
      }
      return;
    }
    case "text":
      throw new UnsupportedRasterFeatureError("draw.text", "6");
    case "line":
    case "rect":
    case "ellipse":
    case "pushTarget":
    case "popTarget":
      throw new UnsupportedRasterFeatureError(`draw.${command.kind}`, "2");
  }
}
