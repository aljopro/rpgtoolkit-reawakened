// Shared authoring helpers for the movement scenes (ticket 5.2). Imports nothing from packages/core.

import { simulate } from "./sim.mjs";

/** Board defaults: a 320 x 320 px (10 x 10 tile) open board, tile movement, game speed 0, axial path-finding. */
export const board = (o = {}) => ({ w: 320, h: 320, layers: 2, pixelMovement: 0, gameSpeed: 0, pfMode: 1, vectors: [], programs: [], items: [], links: {}, threads: [], ...o });

/** Reference point of tile (cx, cy): bottom-centre (16, 31) of the 32 x 32 tile (E-11). */
export const tile = (cx, cy) => [cx * 32 + 16, cy * 32 + 31];

export const rectPts = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
export const solid = (id, x0, y0, x1, y1, layer = 0) => ({ id, type: "solid", layer, closed: true, points: rectPts(x0, y0, x1, y1) });

export const hero = (o = {}) => ({ id: "hero", x: 48, y: 63, layer: 0, speed: 0.05, facing: "S", controlled: true, ...o });
export const npc = (id, x, y, o = {}) => ({ id, x, y, layer: 0, speed: 0.05, facing: "S", ...o });

/** Author one recorded case. The expected per-tick facts are derived by the oracle, never hand-typed. */
export function makeCase(name, note, setup, script, ticks) {
  const { boot, rows } = simulate(setup, script, ticks);
  return { name, note, setup, script, ticks, boot, expect: rows };
}
