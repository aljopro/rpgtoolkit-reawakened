import { hashDrawList, hashState } from "../canon/index.ts";
import { resolveAsset } from "../formats/resolver/resolver.ts";
import type { AssetIndex, AssetRoot } from "../formats/resolver/model.ts";
import type { DrawList } from "../ports/draw.ts";
import type { Engine, Diagnostic, Breakpoint, SurfacePixels } from "../ports/engine.ts";
import type { InputRecord } from "../ports/input.ts";
import type { RunnerRequest } from "../ports/requests.ts";
import type { AssetKey, SurfaceId } from "../ports/keys.ts";
import { createGameState, type GameState, type SectionKey } from "../save/state.ts";
import { composeBoard } from "../render/compose.ts";
import { hydrateBoard } from "../world/hydrate.ts";
import type { WorldBoard } from "../world/model.ts";
import { applyInputEvent, createInputSection, inputView, pruneClaimed } from "../input/index.ts";
import { applyWorldEffect, expireProgramTileEdits } from "../world/effects.ts";
import { EffectBus, type EffectApplier } from "./effects.ts";
import type { EngineSection } from "../save/sections/engine.ts";
import {
  CATALOGUE_PLUGIN,
  COMPILER_VERSION,
  CORE_PLUGIN,
  createScriptServices,
  defaultWaitPoll,
  drainDiagnostics,
  ENGINE_DEFAULT_MANIFEST,
  NATIVE_PACK_TABLE,
  runThreadsPhase,
  runWaitsPhase,
  startProgram,
  STEP_BUDGET,
  type ProgramRef,
  type ResolvedPlugin,
} from "../script/index.ts";
import type { WaitView } from "../ports/wait.ts";
import { runTimePhase } from "../time/time.ts";
import { rasterize, readSurfacePixels, replaceSurface, surfaceTextures, createSurfacesSection, type SurfacePixelCache } from "../raster/index.ts";

/** AD-26's immutable phase order. */
export const ENGINE_PHASES = [
  "input",
  "waits",
  "threads",
  "movement",
  "edges",
  "triggers",
  "battle",
  "animation",
  "audio",
  "time",
] as const;
export type EnginePhase = (typeof ENGINE_PHASES)[number];

export type EnginePhaseRegistration = {
  readonly phase: EnginePhase;
  readonly rank?: number;
  readonly run: (state: GameState) => void;
};

export type EngineInit = {
  readonly seed: number;
  readonly assetIndex: AssetIndex;
  readonly assetRoot: AssetRoot;
  readonly initialBoard: string;
  readonly width: number;
  readonly height: number;
  readonly maxTicks: number;
  readonly program?: string | ProgramRef;
  readonly plugins?: readonly ResolvedPlugin[];
  readonly phaseRegistrations?: readonly EnginePhaseRegistration[];
  readonly effectAppliers?: readonly { readonly section: SectionKey; readonly applier: EffectApplier }[];
};
type RequestEntry = { readonly reqId: number; readonly key: AssetKey; readonly kind: "board" | "tile" };

const DEFAULT_ENGINE_PLUGINS: readonly ResolvedPlugin[] = ENGINE_DEFAULT_MANIFEST.flatMap((entry) => {
  const definition = entry.id === "core"
    ? CORE_PLUGIN
    : entry.id === "catalogue"
      ? CATALOGUE_PLUGIN
      : NATIVE_PACK_TABLE[entry.id];
  return definition === undefined ? [] : [{ definition }];
});

/** Create the deterministic fixed-tick engine; host assets arrive only as AD-14 replies. */
export function createEngine(init: EngineInit): Engine {
  const state: GameState = createGameState({ seed: init.seed });
  state.input = createInputSection();
  state.engine = { claims: [] };
  const resolved = resolveAsset(init.assetIndex, init.assetRoot, "boards", init.initialBoard);
  const boardKey = resolved.ok ? resolved.value : null;
  const pending = new Map<number, RequestEntry>();
  const queuedInputs: InputRecord[] = [];
  const cache = new Map<AssetKey, Uint8Array>();
  const requestsOut: RunnerRequest[] = [];
  const diagnostics: Diagnostic[] = [];
  const registrations = [...(init.phaseRegistrations ?? [])].sort((left, right) => (left.rank ?? 0) - (right.rank ?? 0));
  const registrationByPhase = new Map<EnginePhase, EnginePhaseRegistration[]>();
  for (const registration of registrations) {
    const list = registrationByPhase.get(registration.phase) ?? [];
    list.push(registration);
    registrationByPhase.set(registration.phase, list);
  }
  const bus = new EffectBus(state, (diagnostic) => diagnostics.push(diagnostic));
  bus.register("world", (effect) => applyWorldEffect(state, effect));
  for (const registration of init.effectAppliers ?? []) bus.register(registration.section, registration.applier);
  let nextRequestId = 1;
  let boardBytes: Uint8Array | null = null;
  let started = false;
  let failed = false;
  let breakpoints: readonly Breakpoint[] = [];
  state.surfaces = createSurfacesSection(init.width, init.height);
  const surfaceCache: SurfacePixelCache = new Map();
  let frameHash = hashDrawList({ tick: 0, width: init.width, height: init.height, commands: [] });
  if (!resolved.ok) diagnostics.push({ code: "asset.invalid", file: init.initialBoard, line: 0, message: resolved.error.message });

  const services = createScriptServices(
    state,
    init.plugins ?? DEFAULT_ENGINE_PLUGINS,
    undefined,
    undefined,
    undefined,
    "engine",
    (section, effect) => bus.dispatchRecorded(section, effect),
  );
  if (init.program !== undefined) {
    const ref: ProgramRef = typeof init.program === "string"
      ? { kind: "inline", text: init.program, compiler: COMPILER_VERSION, dialect: "tk3" }
      : init.program;
    startProgram(state.vm, ref);
  }

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
    const next: EngineSection = {
      nextRequestId,
      pending: Array.from(pending.values(), (entry) => ({ reqId: entry.reqId, key: entry.key, kind: entry.kind })),
      failed,
      claims: state.engine.claims ?? [],
      ...(state.engine.phase === undefined ? {} : { phase: state.engine.phase }),
    };
    if (state.engine.pendingEffects !== undefined) next.pendingEffects = state.engine.pendingEffects;
    if (state.engine.effectDropped !== undefined) next.effectDropped = state.engine.effectDropped;
    if (state.engine.effectDiagnostics !== undefined) next.effectDiagnostics = state.engine.effectDiagnostics;
    state.engine = next;
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
  function consumeAsset(record: InputRecord, consumed: InputRecord[]): void {
    if (record.event.kind !== "asset") return;
    const entry = pending.get(record.event.reqId);
    if (entry === undefined) return;
    pending.delete(entry.reqId);
    consumed.push(record);
    if (record.event.bytes === null) {
      diagnostics.push({ code: "asset.missing", file: entry.key, line: 0, message: `asset not found: ${entry.key}` });
      failed = true;
      return;
    }
    const owned = new Uint8Array(record.event.bytes);
    cache.set(entry.key, owned);
    if (entry.kind === "board") boardBytes = owned;
  }
  function phaseView(): WaitView {
    return { tick: state.time.tick, input: inputView(state.input), ui: state.ui, claims: state.engine.claims ?? [] };
  }
  function runPhase(phase: EnginePhase, consumed: InputRecord[]): void {
    state.engine.phase = phase;
    switch (phase) {
      case "input": {
        const records = takeQueuedInputs(state.time.tick);
        for (const record of records) {
          if (record.event.kind === "asset") {
            consumeAsset(record, consumed);
            continue;
          }
          applyInputEvent(state.input, record.event);
          consumed.push(record);
        }
        return;
      }
      case "waits":
        for (const thread of state.vm.threads) {
          if (thread.wait?.kind === "input.key" && thread.wait.parkSeq === undefined) thread.wait.parkSeq = state.input.nextSeq;
        }
        state.engine.claims = [];
        runWaitsPhase(state.vm, phaseView(), defaultWaitPoll, (seq) => {
          if (!(state.engine.claims ?? []).includes(seq)) (state.engine.claims ??= []).push(seq);
        });
        pruneClaimed(state.input, state.engine.claims ?? []);
        return;
      case "threads":
        runThreadsPhase(state.vm, services, STEP_BUDGET);
        expireProgramTileEdits(state);
        return;
      case "time":
        runTimePhase(state.time);
        return;
      case "movement":
      case "edges":
      case "triggers":
      case "battle":
      case "animation":
      case "audio":
        for (const registration of registrationByPhase.get(phase) ?? []) registration.run(state);
        return;
      default: {
        const neverPhase: never = phase;
        return neverPhase;
      }
    }
  }
  function takeQueuedInputs(tick: number): InputRecord[] {
    const ready: InputRecord[] = [];
    const deferred: InputRecord[] = [];
    for (const record of queuedInputs) {
      if (record.tick === tick) ready.push(record);
      else deferred.push(record);
    }
    queuedInputs.length = 0;
    queuedInputs.push(...deferred);
    return ready;
  }
  function processPreTickEvents(consumed: InputRecord[]): void {
    const records = takeQueuedInputs(state.time.tick);
    const deferred: InputRecord[] = [];
    for (const record of records) {
      if (record.event.kind === "asset") {
        consumeAsset(record, consumed);
      } else if (record.event.kind === "focus") {
        applyInputEvent(state.input, record.event);
        consumed.push(record);
      } else {
        deferred.push(record);
      }
    }
    queuedInputs.unshift(...deferred);
  }

  function consumeStoppedInputs(consumed: InputRecord[]): void {
    if (!failed) return;
    const records = takeQueuedInputs(state.time.tick);
    for (const record of records) {
      applyInputEvent(state.input, record.event);
      consumed.push(record);
    }
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
      requestsOut.length = 0;
      const consumed: InputRecord[] = [];
      const failedAtStart = failed;
      for (const input of inputs) queuedInputs.push(input);
      startRequests();
      processPreTickEvents(consumed);
      const boardUnloaded = state.world.board === undefined || state.world.board === null;
      if (!failed && pending.size === 0 && boardBytes !== null && boardUnloaded) hydrateWhenReady();
      if (failedAtStart) consumeStoppedInputs(consumed);
      const requestedTicks = Number.isFinite(ticks) ? Math.max(0, Math.trunc(ticks)) : 0;
      const cap = maxTicks ?? init.maxTicks;
      const bounded = Math.min(requestedTicks, Math.max(0, Math.trunc(cap)));
      let ticksRun = 0;
      while (!failed && pending.size === 0 && state.world.board !== undefined && state.world.board !== null && state.input.focused && ticksRun < bounded) {
        runPhase("input", consumed);
        if (!state.input.focused) break;
        for (const phase of ENGINE_PHASES) {
          if (phase !== "input") runPhase(phase, consumed);
        }
        ticksRun += 1;
      }
      syncEngineState();
      const reportDiagnostics = [...diagnostics.splice(0), ...drainDiagnostics(services)];
      return {
        ticksRun,
        tickAfter: state.time.tick,
        consumed,
        audioCues: [],
        requests: [...requestsOut],
        diagnostics: reportDiagnostics,
        loading: !failed && pending.size > 0,
        paused: null,
        stateHash: hashState(state),
      };
    },
    drawList(alpha = 0) {
      const board: WorldBoard | null = state.world.board ?? null;
      if (board === null) return { tick: state.time.tick, width: init.width, height: init.height, commands: [] };
      const presentationAlpha = Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 0;
      return composeBoard({ board, tick: state.time.tick, camera: { x: 0, y: 0 }, viewport: { width: init.width, height: init.height }, alpha: presentationAlpha, include: { shading: false, images: false, sprites: false } });
    },
    surfacePixels(id: SurfaceId, rev: number): SurfacePixels | null {
      if (id === (0 as SurfaceId)) refreshFrame();
      return readSurfacePixels(state.surfaces, id, rev, surfaceCache);
    },
    setBreakpoints(next: readonly Breakpoint[]) { breakpoints = next; },
  };
  void breakpoints;
  return engine;
}
