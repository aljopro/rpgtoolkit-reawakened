import { effectCommand, pack } from "./common.ts";

/** World owner pack: board, layer and tile commands report world effects synchronously. */
export const WORLD_PLUGIN = pack("world", "Deterministic board, layer and tile operations for game worlds.", [
  effectCommand("viewbrd", "world", "state-write", "viewBrd"),
  effectCommand("put", "world"),
  effectCommand("layerput", "world", "state-write", "layerPut"),
  effectCommand("getboardtile", "world", "pure", "getBoardTile"),
  effectCommand("boardgettile", "world", "pure", "boardGetTile"),
  effectCommand("setconstants", "world", "state-write", "setConstants"),
  effectCommand("animation", "world"),
]);
