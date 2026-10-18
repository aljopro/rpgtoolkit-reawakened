/** Deterministic pathfinding for the unified actor runtime (E-34, AD-25, AD-30). */
import type { WorldBoard, WorldVector } from "../world/model.ts";
import type { SpriteActor, SpritePoint, SpritesSection } from "./model.ts";

export const PATH_EXPANSION_CAP = 1000;
export const PATH_CELL_SIZE = 32;
const FP = 256;
const SOLID = 1;

type FixedPoint = readonly [number, number];
type Rect = readonly [number, number, number, number];

export type PathMode = 1 | 2 | 3;
export type PathCacheStatus = "hit" | "miss";
export type PathResult = {
  readonly points: SpritePoint[];
  readonly expansions: number;
  readonly capped: boolean;
  readonly goalAdjusted: SpritePoint | null;
  readonly reached: boolean;
  readonly cache: PathCacheStatus;
};
export type PathfindingInput = {
  readonly board: WorldBoard;
  readonly sprites?: SpritesSection | null;
  readonly actor: SpriteActor;
  readonly goal: SpritePoint;
  readonly mode?: PathMode;
  readonly ignoreActorIds?: readonly string[];
};
export type PathfindingOptions = Omit<PathfindingInput, "board" | "actor" | "goal">;

function fixed(value: number): number {
  return Math.floor(value * FP + 0.5);
}
function pointFixed(point: SpritePoint): FixedPoint {
  return [fixed(point.x), fixed(point.y)];
}
function toPoint(point: FixedPoint): SpritePoint {
  return { x: point[0], y: point[1] };
}
function key(cx: number, cy: number): string {
  return `${cx},${cy}`;
}
function parseKey(value: string): [number, number] {
  const comma = value.indexOf(",");
  return [Number(value.slice(0, comma)), Number(value.slice(comma + 1))];
}
function squared(dx: number, dy: number): number {
  return dx * dx + dy * dy;
}
function pointsEqual(a: FixedPoint, b: FixedPoint): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

function project(points: readonly FixedPoint[], ax: number, ay: number): [number, number] {
  let low = Infinity;
  let high = -Infinity;
  for (const point of points) {
    const value = point[0] * ax + point[1] * ay;
    if (value < low) low = value;
    if (value > high) high = value;
  }
  return [low, high];
}
function axes(points: readonly FixedPoint[], closed: boolean): FixedPoint[] {
  const out: FixedPoint[] = [];
  const count = closed ? points.length : Math.max(0, points.length - 1);
  for (let index = 0; index < count; index += 1) {
    const a = points[index]!;
    const b = points[(index + 1) % points.length]!;
    out.push([b[1] - a[1], a[0] - b[0]]);
  }
  return out;
}
function overlaps(a: readonly FixedPoint[], b: readonly FixedPoint[]): boolean {
  const all = [...axes(a, a.length > 2), ...axes(b, b.length > 2)];
  for (const [ax, ay] of all) {
    const [aLow, aHigh] = project(a, ax, ay);
    const [bLow, bHigh] = project(b, ax, ay);
    if (aHigh <= bLow || bHigh <= aLow) return false;
  }
  return true;
}
function vectorHits(shape: readonly FixedPoint[], vector: WorldVector): boolean {
  const points = vector.points.map(pointFixed);
  if (points.length < 2) return false;
  if (vector.closed !== 0) return overlaps(shape, points);
  for (let index = 0; index + 1 < points.length; index += 1) {
    if (overlaps(shape, [points[index]!, points[index + 1]!])) return true;
  }
  return false;
}
function translatedBase(actor: SpriteActor, x: number, y: number): FixedPoint[] {
  return actor.collisionBase.points.map((point) => [x + fixed(point.x), y + fixed(point.y)]);
}
function segmentsCrossOpenRect(ax: number, ay: number, bx: number, by: number, rect: Rect): boolean {
  let lowN = 0;
  let lowD = 1;
  let highN = 1;
  let highD = 1;
  const compare = (a: number, b: number, c: number, d: number): number => a * d - c * b;
  const clip = (origin: number, delta: number, lower: number, upper: number): boolean => {
    if (delta === 0) return origin > lower && origin < upper;
    let startN: number;
    let startD: number;
    let endN: number;
    let endD: number;
    if (delta > 0) {
      startN = lower - origin;
      startD = delta;
      endN = upper - origin;
      endD = delta;
    } else {
      startN = upper - origin;
      startD = delta;
      endN = lower - origin;
      endD = delta;
    }
    if (startD < 0) { startN = -startN; startD = -startD; }
    if (endD < 0) { endN = -endN; endD = -endD; }
    if (compare(startN, startD, lowN, lowD) > 0) { lowN = startN; lowD = startD; }
    if (compare(endN, endD, highN, highD) < 0) { highN = endN; highD = endD; }
    return true;
  };
  if (!clip(ax, bx - ax, rect[0], rect[2])) return false;
  if (!clip(ay, by - ay, rect[1], rect[3])) return false;
  return compare(lowN, lowD, highN, highD) < 0;
}
function actorBounds(actor: SpriteActor): { left: number; right: number; top: number; bottom: number } {
  const xs = actor.collisionBase.points.map((point) => point.x);
  const ys = actor.collisionBase.points.map((point) => point.y);
  return {
    left: -Math.min(...xs),
    right: Math.max(...xs),
    top: -Math.min(...ys),
    bottom: Math.max(...ys),
  };
}

class OpenList {
  private readonly items: { f: number; x: number; y: number; key: string; insertion: number }[] = [];
  private insertion = 0;
  push(f: number, x: number, y: number, nodeKey: string): void {
    this.items.push({ f, x, y, key: nodeKey, insertion: this.insertion });
    this.insertion += 1;
  }
  pop(): { f: number; x: number; y: number; key: string; insertion: number } | undefined {
    if (this.items.length === 0) return undefined;
    let best = 0;
    for (let index = 1; index < this.items.length; index += 1) {
      const a = this.items[index]!;
      const b = this.items[best]!;
      if (a.f !== b.f ? a.f < b.f : a.x !== b.x ? a.x < b.x : a.y !== b.y ? a.y < b.y : a.insertion < b.insertion) best = index;
    }
    return this.items.splice(best, 1)[0];
  }
  get size(): number { return this.items.length; }
}

function heuristic(mode: PathMode, ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return mode === 1 ? 10 * (dx + dy) : 10 * Math.max(dx, dy) + 4 * Math.min(dx, dy);
}

type SearchContext = {
  readonly board: WorldBoard;
  readonly actor: SpriteActor;
  readonly solids: WorldVector[];
  readonly sprites: SpriteActor[];
  readonly width: number;
  readonly height: number;
};
function blockedAt(ctx: SearchContext, x: number, y: number): boolean {
  const base = translatedBase(ctx.actor, fixed(x), fixed(y));
  for (const vector of ctx.solids) if (vectorHits(base, vector)) return true;
  for (const other of ctx.sprites) {
    if (overlaps(base, translatedBase(other, fixed(other.x), fixed(other.y)))) return true;
  }
  return false;
}
function sweepBlocked(ctx: SearchContext, a: FixedPoint, b: FixedPoint): boolean {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const steps = Math.max(1, Math.ceil(Math.sqrt(squared(dx, dy)) / 4));
  for (let index = 1; index <= steps; index += 1) {
    const x = a[0] + Math.trunc(dx * index / steps);
    const y = a[1] + Math.trunc(dy * index / steps);
    if (blockedAt(ctx, x, y)) return true;
  }
  return false;
}
function gridNode(cx: number, cy: number): FixedPoint {
  return [cx * PATH_CELL_SIZE + 16, cy * PATH_CELL_SIZE + 31];
}
function gridSearch(ctx: SearchContext, mode: 1 | 2, startPx: SpritePoint, goalPx: SpritePoint): Omit<PathResult, "cache"> {
  const cols = Math.floor(ctx.width / PATH_CELL_SIZE);
  const rows = Math.floor(ctx.height / PATH_CELL_SIZE);
  const inside = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < cols && y < rows;
  const start: [number, number] = [Math.floor(startPx.x / PATH_CELL_SIZE), Math.floor(startPx.y / PATH_CELL_SIZE)];
  let goal: [number, number] = [Math.floor(goalPx.x / PATH_CELL_SIZE), Math.floor(goalPx.y / PATH_CELL_SIZE)];
  const result = { points: [] as SpritePoint[], expansions: 0, capped: false, goalAdjusted: null as SpritePoint | null, reached: false };
  const free = (x: number, y: number): boolean => inside(x, y) && !blockedAt(ctx, ...gridNode(x, y));
  if (!inside(goal[0], goal[1]) || !free(goal[0], goal[1])) {
    let best: { d: number; x: number; y: number } | null = null;
    for (let x = 0; x < cols; x += 1) for (let y = 0; y < rows; y += 1) {
      if (!free(x, y)) continue;
      const node = gridNode(x, y);
      const distance = squared(node[0] - goalPx.x, node[1] - goalPx.y);
      if (best === null || distance < best.d) best = { d: distance, x, y };
    }
    if (best === null) return result;
    goal = [best.x, best.y];
    result.goalAdjusted = toPoint(gridNode(goal[0], goal[1]));
  }
  const directions = mode === 1 ? [0, 2, 4, 6] : [0, 1, 2, 3, 4, 5, 6, 7];
  const vectors: FixedPoint[] = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const open = new OpenList();
  const scores = new Map<string, number>();
  const parents = new Map<string, string>();
  const closed = new Set<string>();
  const startKey = key(start[0], start[1]);
  scores.set(startKey, 0);
  open.push(heuristic(mode, start[0], start[1], goal[0], goal[1]), start[0], start[1], startKey);
  let reached = false;
  while (open.size > 0) {
    const node = open.pop();
    if (node === undefined || closed.has(node.key)) continue;
    if (node.x === goal[0] && node.y === goal[1]) { reached = true; break; }
    if (result.expansions >= PATH_EXPANSION_CAP) { result.capped = true; break; }
    closed.add(node.key);
    result.expansions += 1;
    for (const direction of directions) {
      const vector = vectors[direction]!;
      const nx = node.x + vector[0];
      const ny = node.y + vector[1];
      if (!free(nx, ny)) continue;
      if (sweepBlocked(ctx, gridNode(node.x, node.y), gridNode(nx, ny))) continue;
      const step = mode === 1 ? 10 : direction % 2 === 0 ? 10 : 14;
      const cost = scores.get(node.key)! + step;
      const nextKey = key(nx, ny);
      if (closed.has(nextKey) || (scores.has(nextKey) && scores.get(nextKey)! <= cost)) continue;
      scores.set(nextKey, cost);
      parents.set(nextKey, node.key);
      open.push(cost + heuristic(mode, nx, ny, goal[0], goal[1]), nx, ny, nextKey);
    }
  }
  let end: [number, number] = goal;
  if (!reached) {
    let best: { h: number; x: number; y: number } | null = null;
    for (const closedKey of closed) {
      const [x, y] = parseKey(closedKey);
      const h = heuristic(mode, x, y, goal[0], goal[1]);
      if (best === null || h < best.h || (h === best.h && (x < best.x || (x === best.x && y < best.y)))) best = { h, x, y };
    }
    if (best === null) return result;
    end = [best.x, best.y];
  }
  const chain: FixedPoint[] = [];
  for (let current: string | undefined = key(end[0], end[1]); current !== undefined; current = parents.get(current)) {
    const [x, y] = parseKey(current);
    chain.push(gridNode(x, y));
  }
  chain.reverse();
  chain.shift();
  result.points = chain.map(toPoint);
  result.reached = reached;
  if (reached && result.goalAdjusted === null) {
    if (result.points.length === 0) result.points = [{ ...goalPx }];
    else result.points[result.points.length - 1] = { ...goalPx };
  }
  return result;
}

function vectorSearch(ctx: SearchContext, startPx: SpritePoint, goalPx: SpritePoint): Omit<PathResult, "cache"> {
  const bounds = actorBounds(ctx.actor);
  const grown: Rect[] = [];
  const addRect = (points: readonly SpritePoint[]): void => {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    grown.push([Math.min(...xs) - bounds.right, Math.min(...ys) - bounds.bottom, Math.max(...xs) + bounds.left, Math.max(...ys) + bounds.top]);
  };
  for (const vector of ctx.solids) if (vector.closed !== 0) addRect(vector.points);
  for (const other of ctx.sprites) addRect(other.collisionBase.points.map((point) => ({ x: other.x + point.x, y: other.y + point.y })));
  const inGrown = (x: number, y: number): boolean => grown.some((rectangle) => x > rectangle[0] && x < rectangle[2] && y > rectangle[1] && y < rectangle[3]);
  const nodes: SpritePoint[] = [];
  const add = (x: number, y: number): void => {
    if (x < bounds.left || y < bounds.top || x > ctx.width - bounds.right || y > ctx.height - bounds.bottom || inGrown(x, y)) return;
    if (!nodes.some((node) => node.x === x && node.y === y)) nodes.push({ x, y });
  };
  for (const rectangle of grown) {
    add(rectangle[0], rectangle[1]); add(rectangle[2], rectangle[1]); add(rectangle[2], rectangle[3]); add(rectangle[0], rectangle[3]);
  }
  add(startPx.x, startPx.y); add(goalPx.x, goalPx.y);
  nodes.sort((a, b) => a.x - b.x || a.y - b.y);
  const visible = (a: SpritePoint, b: SpritePoint): boolean => !grown.some((rectangle) => segmentsCrossOpenRect(a.x, a.y, b.x, b.y, rectangle));
  const distance = (a: SpritePoint, b: SpritePoint): number => Math.round(Math.sqrt(squared(a.x - b.x, a.y - b.y)) * FP);
  const indexOf = (point: SpritePoint): number => nodes.findIndex((node) => node.x === point.x && node.y === point.y);
  const result = { points: [] as SpritePoint[], expansions: 0, capped: false, goalAdjusted: null as SpritePoint | null, reached: false };
  const startIndex = indexOf(startPx);
  let targetIndex = indexOf(goalPx);
  if (startIndex < 0 || targetIndex < 0) return result;
  if (inGrown(goalPx.x, goalPx.y)) {
    let best = -1;
    let bestDistance = Infinity;
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index]!;
      const candidateDistance = squared(node.x - goalPx.x, node.y - goalPx.y);
      if (!inGrown(node.x, node.y) && (candidateDistance < bestDistance || (candidateDistance === bestDistance && (best < 0 || node.x < nodes[best]!.x || (node.x === nodes[best]!.x && node.y < nodes[best]!.y))))) { best = index; bestDistance = candidateDistance; }
    }
    if (best < 0) return result;
    targetIndex = best;
    const adjusted = nodes[best]!;
    result.goalAdjusted = { x: adjusted.x, y: adjusted.y };
  }
  const open = new OpenList();
  const scores = new Map<number, number>();
  const parents = new Map<number, number>();
  const closed = new Set<number>();
  scores.set(startIndex, 0);
  open.push(distance(nodes[startIndex]!, nodes[targetIndex]!), nodes[startIndex]!.x, nodes[startIndex]!.y, String(startIndex));
  let reached = false;
  while (open.size > 0) {
    const node = open.pop();
    if (node === undefined) continue;
    const current = Number(node.key);
    if (closed.has(current)) continue;
    if (current === targetIndex) { reached = true; break; }
    if (result.expansions >= PATH_EXPANSION_CAP) { result.capped = true; break; }
    closed.add(current);
    result.expansions += 1;
    for (let next = 0; next < nodes.length; next += 1) {
      if (next === current || closed.has(next) || !visible(nodes[current]!, nodes[next]!)) continue;
      const cost = scores.get(current)! + distance(nodes[current]!, nodes[next]!);
      if (scores.has(next) && scores.get(next)! <= cost) continue;
      scores.set(next, cost);
      parents.set(next, current);
      open.push(cost + distance(nodes[next]!, nodes[targetIndex]!), nodes[next]!.x, nodes[next]!.y, String(next));
    }
  }
  let end = targetIndex;
  if (!reached) {
    let best: { h: number; index: number } | null = null;
    for (const current of closed) {
      const h = distance(nodes[current]!, nodes[targetIndex]!);
      if (best === null || h < best.h || (h === best.h && (nodes[current]!.x < nodes[best.index]!.x || (nodes[current]!.x === nodes[best.index]!.x && nodes[current]!.y < nodes[best.index]!.y)))) best = { h, index: current };
    }
    if (best === null) return result;
    end = best.index;
  }
  const chain: SpritePoint[] = [];
  for (let current: number | undefined = end; current !== undefined; current = parents.get(current)) chain.push({ ...nodes[current]! });
  chain.reverse();
  chain.shift();
  result.points = chain;
  result.reached = reached;
  return result;
}

function vectorFingerprint(board: WorldBoard): string {
  return (board.vectors ?? []).map((vector) => `${vector.handle}:${vector.layer}:${vector.type}:${vector.closed}:${vector.points.map((point) => `${point.x},${point.y}`).join(";")}`).join("|");
}
function cacheKey(input: PathfindingInput, mode: PathMode): string {
  const sprites = (input.sprites === null || input.sprites === undefined ? [] : [...input.sprites.players, ...input.sprites.items])
    .filter((actor) => actor.id !== input.actor.id && actor.visible && actor.layer === input.actor.layer && !(input.ignoreActorIds ?? []).includes(actor.id))
    .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    .map((actor) => `${actor.id}:${actor.x},${actor.y}:${actor.layer}:${actor.collisionBase.points.map((point) => `${point.x},${point.y}`).join(";")}`).join("|");
  return `${input.board.key}|${vectorFingerprint(input.board)}|${input.actor.id}:${input.actor.x},${input.actor.y}:${input.actor.layer}:${input.actor.collisionBase.points.map((point) => `${point.x},${point.y}`).join(";")}|${mode}|${input.goal.x},${input.goal.y}|${sprites}`;
}

export class PathfindingCache {
  private readonly entries = new Map<string, PathResult>();
  clear(): void { this.entries.clear(); }
  invalidateBoard(boardKey: string): void {
    for (const cacheKey of this.entries.keys()) if (cacheKey.startsWith(`${boardKey}|`)) this.entries.delete(cacheKey);
  }
  get(keyValue: string): PathResult | undefined { return this.entries.get(keyValue); }
  set(keyValue: string, result: PathResult): void { this.entries.set(keyValue, result); }
}
export const pathfindingCache = new PathfindingCache();
export function clearPathfindingCache(): void { pathfindingCache.clear(); }
export function invalidatePathfindingCache(boardKey: string): void { pathfindingCache.invalidateBoard(boardKey); }

function search(input: PathfindingInput, mode: PathMode): PathResult {
  const sprites = (input.sprites === null || input.sprites === undefined ? [] : [...input.sprites.players, ...input.sprites.items])
    .filter((actor) => actor.id !== input.actor.id && actor.visible && actor.layer === input.actor.layer && !(input.ignoreActorIds ?? []).includes(actor.id));
  const ctx: SearchContext = {
    board: input.board,
    actor: input.actor,
    solids: (input.board.vectors ?? []).filter((vector) => vector.layer === input.actor.layer && vector.type === SOLID),
    sprites,
    width: input.board.width,
    height: input.board.height,
  };
  const start = { x: input.actor.x, y: input.actor.y };
  return { ...(mode === 3 ? vectorSearch(ctx, start, input.goal) : gridSearch(ctx, mode, start, input.goal)), cache: "miss" };
}

export function findPath(input: PathfindingInput): PathResult;
export function findPath(board: WorldBoard, sprites: SpritesSection | null, actor: SpriteActor, goal: SpritePoint, mode?: PathMode, options?: Pick<PathfindingOptions, "ignoreActorIds">): PathResult;
export function findPath(first: PathfindingInput | WorldBoard, sprites?: SpritesSection | null, actor?: SpriteActor, goal?: SpritePoint, mode: PathMode = 1, options: Pick<PathfindingOptions, "ignoreActorIds"> = {}): PathResult {
  const input: PathfindingInput = "actor" in first && "goal" in first
    ? first as PathfindingInput
    : {
      board: first,
      actor: actor!,
      goal: goal!,
      mode,
      ...(sprites === undefined ? {} : { sprites }),
      ...(options.ignoreActorIds === undefined ? {} : { ignoreActorIds: options.ignoreActorIds }),
    };
  const selectedMode = input.mode ?? mode;
  const cacheKeyValue = cacheKey(input, selectedMode);
  const cached = pathfindingCache.get(cacheKeyValue);
  if (cached !== undefined) return { ...cached, cache: "hit", points: cached.points.map((point) => ({ ...point })) };
  const result = search(input, selectedMode);
  pathfindingCache.set(cacheKeyValue, result);
  return { ...result, points: result.points.map((point) => ({ ...point })) };
}

export const pathfind = findPath;
