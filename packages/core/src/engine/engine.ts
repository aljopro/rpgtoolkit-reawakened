import { hashDrawList, hashState } from "../canon/index.ts";
import { resolveAsset } from "../formats/resolver/resolver.ts";
import type { AssetIndex, AssetRoot } from "../formats/resolver/model.ts";
import type { DrawList } from "../ports/draw.ts";
import type { InputRecord } from "../ports/input.ts";
import type { RunnerRequest } from "../ports/requests.ts";
import type { AssetKey, SurfaceId } from "../ports/keys.ts";
import { createGameState, type GameState } from "../save/state.ts";
import { composeBoard } from "../render/compose.ts";
import { hydrateBoard } from "../world/hydrate.ts";
import type { WorldBoard } from "../world/model.ts";
import { rasterize, readSurfacePixels, replaceSurface, surfaceTextures, createSurfacesSection, type SurfacePixelCache } from "../raster/index.ts";

export type EngineInit = {
  readonly seed: number;
  readonly assetIndex: AssetIndex;
  readonly assetRoot: AssetRoot;
  readonly initialBoard: string;
  readonly width: number;
  readonly height: number;
  readonly maxTicks: number;
};
type RequestEntry = { readonly reqId: number; readonly key: AssetKey; readonly kind: "board" | "tile" };

/** Create the deterministic tracer engine; host assets arrive only as AD-14 replies. */
export function createEngine(init: EngineInit): Engine {
  const state: GameState = createGameState({ seed: init.seed });
  const resolved = resolveAsset(init.assetIndex, init.assetRoot, "boards", init.initialBoard);
  const boardKey = resolved.ok ? resolved.value : null;
  const queuedInputs: InputRecord[] = [];
  const pending = new Map<number, RequestEntry>();
  const cache = new Map<AssetKey, Uint8Array>();
  const diagnostics: Diagnostic[] = [];
  let nextRequestId = 1;
  let boardBytes: Uint8Array | null = null;
  let started = false;
  let failed = false;
  let requestsOut: RunnerRequest[] = [];
  state.surfaces = createSurfacesSection(init.width, init.height);
  const surfaceCache: SurfacePixelCache = new Map();
  let frameHash = hashDrawList({ tick: 0, width: init.width, height: init.height, commands: [] });
  if (!resolved.ok) diagnostics.push({ code: "asset.invalid", file: init.initialBoard, line: 0, message: resolved.error.message });

  function request(key: AssetKey, kind: RequestEntry["kind"]): void {
    for (const item of pending.values()) if (item.key === key) return;
    if (cache.has(key)) return;
    const entry: RequestEntry = { reqId: nextRequestId++, key, kind };
    pending.set(entry.reqId, entry);
    requestsOut.push({ kind: "asset", reqId: entry.reqId, key });
  }

  function startRequests(): void {
    if (started || boardKey === null) return;
    started = true;
    request(boardKey, "board");
  }
  function syncEngineState(): void {
    state.engine = {
      nextRequestId,
      pending: Array.from(pending.values(), (entry) => ({ reqId: entry.reqId, key: entry.key, kind: entry.kind })),
      failed,
    };
  }

  function hydrateWhenReady(): void {
    if (failed || boardKey === null || boardBytes === null) return;
    const result = hydrateBoard(boardKey, boardBytes, init.assetIndex, init.assetRoot, cache, state.time.tick);
    if (result.error !== null) {
      diagnostics.push({ code: "asset.invalid", file: result.error.path, line: result.error.offset, message: result.error.message });
      failed = true;
      return;
    }
    if (result.missing !== null) {
      request(result.missing, "tile");
      return;
    }
    state.world = { board: result.value?.board ?? null };
    if (state.world.board === null) failed = true;
  }

  function currentDrawList(alpha = 0): DrawList {
    const board: WorldBoard | null = state.world.board ?? null;
    if (board === null) return { tick: state.time.tick, width: init.width, height: init.height, commands: [] };
    return composeBoard({ board, tick: state.time.tick, camera: { x: 0, y: 0 }, viewport: { width: init.width, height: init.height }, alpha, include: { shading: false, images: false, sprites: false } });
  }

  function refreshFrame(): void {
    const list = currentDrawList(0);
    const nextHash = hashDrawList(list);
    if (nextHash === frameHash) return;
    const rendered = rasterize(list, new Map(), surfaceTextures(state.surfaces, surfaceCache));
    replaceSurface(state.surfaces, 0 as SurfaceId, rendered.width, rendered.height, rendered.rgba);
    frameHash = nextHash;
  }

  const engine: Engine = {
    advance(ticks: number, inputs: readonly InputRecord[], maxTicks?: number) {
      requestsOut = [];
      const consumed: InputRecord[] = [];
      const boardUnloadedAtStart = state.world.board === undefined || state.world.board === null;
      queuedInputs.push(...inputs);
      const deferred: InputRecord[] = [];
      for (const input of queuedInputs) {
        if (input.tick !== state.time.tick || (boardUnloadedAtStart && !failed && input.event.kind !== "asset")) {
          deferred.push(input);
          continue;
        }
        if (input.event.kind !== "asset") {
          consumed.push(input);
          continue;
        }
        const entry = pending.get(input.event.reqId);
        if (entry === undefined) continue;
        pending.delete(entry.reqId);
        consumed.push(input);
        if (input.event.bytes === null) {
          diagnostics.push({ code: "asset.missing", file: entry.key, line: 0, message: `asset not found: ${entry.key}` });
          failed = true;
          continue;
        }
        const owned = new Uint8Array(input.event.bytes);
        cache.set(entry.key, owned);
        if (entry.kind === "board") boardBytes = owned;
      }
      queuedInputs.length = 0;
      queuedInputs.push(...deferred);
      startRequests();
      const boardUnloaded = state.world.board === undefined || state.world.board === null;
      if (!failed && pending.size === 0 && boardBytes !== null && boardUnloaded) hydrateWhenReady();
      const requestedTicks = Number.isFinite(ticks) ? Math.max(0, Math.trunc(ticks)) : 0;
      const cap = maxTicks ?? init.maxTicks;
      const count = failed || boardUnloaded ? 0 : Math.min(requestedTicks, Math.max(0, Math.trunc(cap)));
      state.time.tick += count;
      syncEngineState();
      const reportDiagnostics = diagnostics.splice(0);
      return {
        ticksRun: count,
        tickAfter: state.time.tick,
        consumed,
        audioCues: [],
        requests: requestsOut,
        diagnostics: reportDiagnostics,
        loading: !failed && pending.size > 0,
        paused: null,
        stateHash: hashState(state),
      };
    },
    drawList(alpha = 0) {
      return currentDrawList(alpha);
    },
    surfacePixels(id: SurfaceId, rev: number): SurfacePixels | null {
      if (id === (0 as SurfaceId)) refreshFrame();
      return readSurfacePixels(state.surfaces, id, rev, surfaceCache);
    },
    setBreakpoints(_breakpoints: readonly Breakpoint[]) {},
  };
  return engine;
}
