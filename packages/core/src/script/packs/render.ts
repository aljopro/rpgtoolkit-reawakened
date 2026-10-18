import { effectCommand, pack } from "./common.ts";
import { GRAPHICS_COMMANDS } from "./graphics.ts";

/** Rendering owner pack: camera, UI, effects and surfaces are separate command layers. */
export const RENDER_PLUGIN = pack("render", "Deterministic rendering, camera, UI and visual-effect commands.", [
  ...GRAPHICS_COMMANDS,
  effectCommand("text", "ui"),
  effectCommand("msgbox", "ui", "mixed", "msgBox"),
  effectCommand("fade", "fx", "draw-audio-cue"),
]);
