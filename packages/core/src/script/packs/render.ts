import { effectCommand, pack } from "./common.ts";

/** Rendering owner pack: camera, UI, effects and surfaces are separate command layers. */
export const RENDER_PLUGIN = pack("render", "Deterministic rendering, camera, UI and visual-effect commands.", [
  effectCommand("camerapanto", "camera", "state-write", "cameraPanTo"),
  effectCommand("camerafollow", "camera", "state-write", "cameraFollow"),
  effectCommand("camerareset", "camera", "state-write", "cameraReset"),
  effectCommand("camerashake", "fx", "draw-audio-cue", "cameraShake"),
  effectCommand("drawline", "surfaces", "state-write", "drawLine"),
  effectCommand("drawrect", "surfaces", "state-write", "drawRect"),
  effectCommand("fillrect", "surfaces", "state-write", "fillRect"),
  effectCommand("text", "ui"),
  effectCommand("msgbox", "ui", "mixed", "msgBox"),
  effectCommand("clear", "surfaces"),
  effectCommand("fade", "fx", "draw-audio-cue"),
]);
