// Reference path-finders for the movement oracle (ticket 5.2): axial A*,
// diagonal A* and a vector visibility-graph search, from
// docs/spec/engine/movement-and-collision.md#e-34 and the ratified total order
// (path ties by node coordinate, then insertion index; 1000 expansions).
// Imports nothing from packages/core.
//
// Conventions the spec leaves open are marked `PROPOSED` and are listed in the
// plan under "Proposed ruling (pending owner review)".

import { FP, FACINGS, hitsVector, overlaps, rect, segmentCrossesOpenRect, translate } from "./geometry.mjs";

export const EXPANSION_CAP = 1000;
const CELL = 32;
/** PROPOSED P-2: a grid node is the tile's bottom-centre reference point (16, 31). */
const nodePos = (cx, cy) => [cx * CELL + 16, cy * CELL + 31];

/** Is the base, standing at px point (x, y), blocked by a solid vector or a sprite base? */
function blockedAt(ctx, x, y) {
  const base = translate(ctx.base, x * FP, y * FP);
  for (const vector of ctx.solids) if (hitsVector(base, vector)) return true;
  for (const other of ctx.sprites) if (overlaps(base, other)) return true;
  return false;
}

/** Sweep the base between two px points in 4 px samples (the movement advance). */
function sweepBlocked(ctx, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const steps = Math.max(1, Math.ceil(Math.sqrt(dx * dx + dy * dy) / 4));
  for (let index = 1; index <= steps; index += 1) {
    const x = a[0] + (dx * index) / steps;
    const y = a[1] + (dy * index) / steps;
    if (blockedAt(ctx, x, y)) return true;
  }
  return false;
}

class Open {
  constructor() {
    this.items = [];
    this.serial = 0;
  }
  push(f, cx, cy, key) {
    this.items.push({ f, cx, cy, key, ins: this.serial });
    this.serial += 1;
  }
  pop() {
    let best = 0;
    for (let index = 1; index < this.items.length; index += 1) {
      const a = this.items[index];
      const b = this.items[best];
      if (a.f !== b.f ? a.f < b.f : a.cx !== b.cx ? a.cx < b.cx : a.cy !== b.cy ? a.cy < b.cy : a.ins < b.ins) best = index;
    }
    return this.items.splice(best, 1)[0];
  }
  get size() {
    return this.items.length;
  }
}

function heuristic(mode, ax, ay, bx, by) {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return mode === 1 ? 10 * (dx + dy) : 10 * Math.max(dx, dy) + 4 * Math.min(dx, dy);
}

function gridSearch(ctx, mode, startPx, goalPx) {
  const cols = Math.floor(ctx.w / CELL);
  const rows = Math.floor(ctx.h / CELL);
  const inside = (cx, cy) => cx >= 0 && cy >= 0 && cx < cols && cy < rows;
  const start = [Math.floor(startPx[0] / CELL), Math.floor(startPx[1] / CELL)];
  let goal = [Math.floor(goalPx[0] / CELL), Math.floor(goalPx[1] / CELL)];
  const result = { points: [], expansions: 0, capped: false, goalAdjusted: null, reached: false };
  const free = (cx, cy) => inside(cx, cy) && !blockedAt(ctx, ...nodePos(cx, cy));
  if (!inside(goal[0], goal[1]) || !free(goal[0], goal[1])) {
    // Blocked goal: the nearest free node; ties by (x, y) node coordinate (E-34, ratified total order).
    let best = null;
    for (let cx = 0; cx < cols; cx += 1) {
      for (let cy = 0; cy < rows; cy += 1) {
        if (!free(cx, cy)) continue;
        const [nx, ny] = nodePos(cx, cy);
        const d = (nx - goalPx[0]) ** 2 + (ny - goalPx[1]) ** 2;
        if (best === null || d < best.d) best = { d, cx, cy };
      }
    }
    if (best === null) return result;
    goal = [best.cx, best.cy];
    result.goalAdjusted = nodePos(goal[0], goal[1]);
  }
  const dirs = mode === 1 ? [0, 2, 4, 6] : [0, 1, 2, 3, 4, 5, 6, 7];
  const DV = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const open = new Open();
  const g = new Map();
  const parent = new Map();
  const closed = new Set();
  const key = (cx, cy) => `${cx},${cy}`;
  g.set(key(...start), 0);
  open.push(heuristic(mode, start[0], start[1], goal[0], goal[1]), start[0], start[1]);
  let reachedGoal = false;
  while (open.size > 0) {
    const node = open.pop();
    const k = key(node.cx, node.cy);
    if (closed.has(k)) continue;
    if (node.cx === goal[0] && node.cy === goal[1]) {
      reachedGoal = true;
      break;
    }
    if (result.expansions >= EXPANSION_CAP) {
      result.capped = true;
      break;
    }
    closed.add(k);
    result.expansions += 1;
    for (const d of dirs) {
      const nx = node.cx + DV[d][0];
      const ny = node.cy + DV[d][1];
      if (!free(nx, ny)) continue;
      if (sweepBlocked(ctx, nodePos(node.cx, node.cy), nodePos(nx, ny))) continue;
      const step = mode === 1 ? 10 : d % 2 === 0 ? 10 : 14;
      const cost = g.get(k) + step;
      const nk = key(nx, ny);
      if (closed.has(nk) || (g.has(nk) && g.get(nk) <= cost)) continue;
      g.set(nk, cost);
      parent.set(nk, k);
      open.push(cost + heuristic(mode, nx, ny, goal[0], goal[1]), nx, ny);
    }
  }
  let end = goal;
  if (!reachedGoal) {
    // Unreachable or capped: approach the expanded node with the least heuristic (ties: node coordinate).
    let best = null;
    for (const k of closed) {
      const [cx, cy] = k.split(",").map(Number);
      const h = heuristic(mode, cx, cy, goal[0], goal[1]);
      if (best === null || h < best.h || (h === best.h && (cx < best.cx || (cx === best.cx && cy < best.cy)))) best = { h, cx, cy };
    }
    end = [best.cx, best.cy];
  }
  const chain = [];
  for (let k = key(...end); k !== undefined; k = parent.get(k)) {
    const [cx, cy] = k.split(",").map(Number);
    chain.push([cx, cy]);
  }
  chain.reverse();
  chain.shift(); // the start node is where the actor already is
  result.points = chain.map(([cx, cy]) => nodePos(cx, cy));
  result.reached = reachedGoal;
  if (reachedGoal && result.goalAdjusted === null) {
    if (result.points.length === 0) result.points = [[goalPx[0], goalPx[1]]];
    else result.points[result.points.length - 1] = [goalPx[0], goalPx[1]];
  }
  return result;
}

function vectorSearch(ctx, startPx, goalPx) {
  const l = -ctx.base[0][0] / FP;
  const r = ctx.base[1][0] / FP;
  const u = -ctx.base[0][1] / FP;
  const d = ctx.base[2][1] / FP;
  const grown = [];
  const addRect = (points) => {
    const xs = points.map((p) => p[0] / FP);
    const ys = points.map((p) => p[1] / FP);
    grown.push([Math.min(...xs) - r, Math.min(...ys) - d, Math.max(...xs) + l, Math.max(...ys) + u]);
  };
  for (const vector of ctx.solids) if (vector.closed !== false) addRect(vector.points);
  for (const other of ctx.sprites) addRect(other);
  const inGrown = (x, y) => grown.some(([x0, y0, x1, y1]) => x > x0 && x < x1 && y > y0 && y < y1);
  const nodes = [];
  const add = (x, y) => {
    // A reference point is valid only where the whole collision base lies on the board.
    if (x < l || y < u || x > ctx.w - r || y > ctx.h - d || inGrown(x, y)) return;
    if (!nodes.some((n) => n[0] === x && n[1] === y)) nodes.push([x, y]);
  };
  for (const [x0, y0, x1, y1] of grown) {
    add(x0, y0);
    add(x1, y0);
    add(x1, y1);
    add(x0, y1);
  }
  add(startPx[0], startPx[1]);
  add(goalPx[0], goalPx[1]);
  nodes.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const visible = (a, b) => !grown.some(([x0, y0, x1, y1]) => segmentCrossesOpenRect(a[0], a[1], b[0], b[1], x0, y0, x1, y1));
  const dist = (a, b) => Math.round(Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) * FP);
  const index = (p) => nodes.findIndex((n) => n[0] === p[0] && n[1] === p[1]);
  const result = { points: [], expansions: 0, capped: false, goalAdjusted: null, reached: false };
  const s = index(startPx);
  const t = index(goalPx);
  if (s < 0 || t < 0) return result;
  const open = new Open();
  const gScore = new Map([[s, 0]]);
  const parent = new Map();
  const closed = new Set();
  open.push(dist(nodes[s], nodes[t]), nodes[s][0], nodes[s][1], s);
  let reachedGoal = false;
  while (open.size > 0) {
    const node = open.pop();
    const k = node.key;
    if (closed.has(k)) continue;
    if (k === t) {
      reachedGoal = true;
      break;
    }
    if (result.expansions >= EXPANSION_CAP) {
      result.capped = true;
      break;
    }
    closed.add(k);
    result.expansions += 1;
    for (let n = 0; n < nodes.length; n += 1) {
      if (n === k || closed.has(n) || !visible(nodes[k], nodes[n])) continue;
      const cost = gScore.get(k) + dist(nodes[k], nodes[n]);
      if (gScore.has(n) && gScore.get(n) <= cost) continue;
      gScore.set(n, cost);
      parent.set(n, k);
      open.push(cost + dist(nodes[n], nodes[t]), nodes[n][0], nodes[n][1], n);
    }
  }
  let end = t;
  if (!reachedGoal) {
    let best = null;
    for (const k of closed) {
      const h = dist(nodes[k], nodes[t]);
      if (best === null || h < best.h || (h === best.h && (nodes[k][0] < nodes[best.k][0] || (nodes[k][0] === nodes[best.k][0] && nodes[k][1] < nodes[best.k][1])))) best = { h, k };
    }
    end = best.k;
  }
  const chain = [];
  for (let k = end; k !== undefined; k = parent.get(k)) chain.push(nodes[k]);
  chain.reverse();
  chain.shift();
  result.points = chain;
  result.reached = reachedGoal;
  return result;
}

/**
 * Find a path. `ctx`: `{ w, h, base, solids, sprites }` in board px / fixed-point polygons.
 * `mode`: 1 axial, 2 diagonal, 3 vector (the main file's `pfHeuristic`). Points are px.
 */
export function findPath(ctx, mode, startPx, goalPx) {
  return mode === 3 ? vectorSearch(ctx, startPx, goalPx) : gridSearch(ctx, mode, startPx, goalPx);
}

export { FACINGS, rect };
