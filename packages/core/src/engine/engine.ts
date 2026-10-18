import { hashDrawList, hashState } from "../canon/index.ts";
import { resolveAsset, assetKey } from "../formats/resolver/resolver.ts";
import { BinaryReader } from "../formats/binary/reader.ts";
import { readMainFile } from "../formats/main-file/reader.ts";
import type { MainFile } from "../formats/main-file/model.ts";
import { gateTrueType } from "../formats/font/truetype.ts";
import type { AssetIndex, AssetRoot } from "../formats/resolver/model.ts";
import type { DrawList, Tint } from "../ports/draw.ts";
import type { Engine, Diagnostic, Breakpoint, DrawListInclude, ResumeMode, SurfacePixels } from "../ports/engine.ts";
import type { InputRecord } from "../ports/input.ts";
import type { PlainData } from "../ports/plain-data.ts";
import type { RunnerRequest } from "../ports/requests.ts";
import type { StartupPorts } from "../ports/startup.ts";
import type { AssetKey, SurfaceId } from "../ports/keys.ts";
import { createGameState, type GameState, type SectionKey } from "../save/state.ts";
import { composeBoard, type SpriteDraw } from "../render/compose.ts";
import { applyFxDrawList, advanceFx, applyFxEffect } from "../render/fx.ts";
import { hydrateBoard } from "../world/hydrate.ts";
import { coordLayout, tileToPixel } from "../world/coords.ts";
import type { WorldBoard } from "../world/model.ts";
import { applyInputEvent, createInputSection, inputView, pruneClaimed } from "../input/index.ts";
import { applyWorldEffect, expireProgramTileEdits } from "../world/effects.ts";
import { applyCameraEffect, createCameraSection, initCameraForBoard, positionAt, realignCamera, updateCamera } from "../world/camera.ts";
import type { CameraPoint, CameraTarget } from "../ports/camera.ts";
import { EffectBus, type EffectApplier } from "./effects.ts";
import { engineEffect, pluginManifestFor, privateFontKeys, programKeys, resolveManifestPlugins } from "./boot.ts";
import type { EngineRequestKind, EngineSection } from "../save/sections/engine.ts";
import {
  COMPILER_VERSION,
  createScriptServices,
  defaultWaitPoll,
  drainDiagnostics,
  ENGINE_DEFAULT_MANIFEST,
  endBoardThreads,
  fileProgramRef,
  runThreadsPhase,
  runWaitsPhase,
  ScriptError,
  startProgram,
  startThread,
  STEP_BUDGET,
  stepThread,
  type EffectRecord,
  type ProgramLoader,
  type ProgramRef,
  type ResolvedPlugin,
  type ScriptServices,
  createVmState,
} from "../script/index.ts";
import type { Thread } from "../script/state.ts";
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

/** A section owner reset callback (E-06; docs/spec/engine/main-loop-and-startup.md#reawakened-reset-sections). */
export type EngineResetRegistration = {
  readonly section: SectionKey;
  readonly rank?: number;
  readonly reset: (state: GameState) => void;
};

type EngineCommonInit = {
  readonly seed: number;
  readonly assetIndex: AssetIndex;
  readonly assetRoot: AssetRoot;
  readonly width: number;
  readonly height: number;
  readonly maxTicks: number;
  /** Resolved plugin layers; when absent boot builds them from the main file (E-02 step 3). */
  readonly plugins?: readonly ResolvedPlugin[];
  readonly resetRegistrations?: readonly EngineResetRegistration[];
  readonly phaseRegistrations?: readonly EnginePhaseRegistration[];
  readonly effectAppliers?: readonly { readonly section: SectionKey; readonly applier: EffectApplier }[];
  readonly cameraTarget?: CameraTarget;
  readonly include?: { readonly shading: boolean; readonly images: boolean; readonly sprites: boolean };
  /** Sprites composed over the board until the sprites section feeds the compositor (movement-triggers owns that). */
  readonly sprites?: readonly SpriteDraw[];
  /** Script ambient summed with the board's once per tile blit (E-17). */
  readonly globalAmbient?: Tint;
};

/**
 * Scene mode: load one board and optionally run one program, with no start-up
 * sequence. The tracer bullet, the golden scenes and the editor previews use it.
 */
export type SceneInit = EngineCommonInit & {
  readonly initialBoard: string;
  readonly program?: string | ProgramRef;
  readonly mainFile?: never;
  readonly startup?: never;
};

/**
 * Boot mode: run E-02 from the main file at the index path `mainFile`
 * (docs/spec/engine/main-loop-and-startup.md#reawakened-boot-sequence).
 */
export type BootInit = EngineCommonInit & {
  readonly mainFile: string;
  readonly startup: StartupPorts;
  readonly initialBoard?: never;
  readonly program?: never;
};

export type EngineInit = SceneInit | BootInit;
type RequestEntry = { readonly reqId: number; readonly key: AssetKey; readonly kind: EngineRequestKind };
type SourceLocation = { file: string; line: number };
type Paused = { thread: number; frame: number; line: number };
type Arrival = { readonly x: number; readonly y: number; readonly layer: number; readonly unit: "pixel" | "tile" };

const DEFAULT_ENGINE_PLUGINS: readonly ResolvedPlugin[] = resolveManifestPlugins(ENGINE_DEFAULT_MANIFEST).plugins;

/** Create the deterministic fixed-tick engine; host assets arrive only as AD-14 replies. */
export function createEngine(init: EngineInit): Engine {
  const index = init.assetIndex;
  const state: GameState = createGameState({ seed: init.seed });
  state.input = createInputSection();
  state.engine = { claims: [] };
  let root: AssetRoot = init.assetRoot;
  let mainFile: MainFile | null = null;
  let loader: ProgramLoader | null = null;
  let sceneBoardKey: AssetKey | null = null;
  let mainKey: AssetKey | null = null;
  const installedFonts = new Map<AssetKey, Uint8Array>();
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
  bus.register("camera", (effect) => applyCameraEffect(state, effect));
  bus.register("fx", (effect) => applyFxEffect(state, effect));
  bus.register("engine", (effect) => applyEngineEffect(effect));
  for (const registration of init.effectAppliers ?? []) bus.register(registration.section, registration.applier);
  let nextRequestId = 1;
  let failed = false;
  let quitRequested = false;
  let breakpoints: readonly Breakpoint[] = [];
  state.surfaces = createSurfacesSection(init.width, init.height);
  state.camera = createCameraSection(init.width, init.height);
  const surfaceCache: SurfacePixelCache = new Map();
  let frameHash = hashDrawList({ tick: 0, width: init.width, height: init.height, commands: [] });
  // Sprites and script ambient reach the compositor through the same plain-data view fields the editor and export use (AD-29).
  const presentation = {
    ...(init.sprites === undefined ? {} : { sprites: init.sprites }),
    ...(init.globalAmbient === undefined ? {} : { globalAmbient: init.globalAmbient }),
  };
  if (init.mainFile === undefined) {
    const resolved = resolveAsset(index, root, "boards", init.initialBoard);
    if (resolved.ok) sceneBoardKey = resolved.value;
    else diagnostics.push({ code: "asset.invalid", file: init.initialBoard, line: 0, message: resolved.error.message });
  } else {
    const found = index.byKey.get(assetKey(init.mainFile));
    if (found === undefined) {
      diagnostics.push({ code: "asset.invalid", file: init.mainFile, line: 0, message: `main file "${init.mainFile}" is not in the asset index` });
      failed = true;
      state.engine.boot = { stage: "stopped", main: "", fonts: [] };
    } else {
      mainKey = found;
      state.engine.boot = { stage: "main", main: found, fonts: [] };
    }
  }

  function makeServices(plugins: readonly ResolvedPlugin[], programLoader?: ProgramLoader): ScriptServices {
    return createScriptServices(state, plugins, undefined, undefined, programLoader, "engine", (section, effect) => bus.dispatchRecorded(section, effect));
  }
  let services = makeServices(init.plugins ?? DEFAULT_ENGINE_PLUGINS);
  if (init.mainFile === undefined && init.program !== undefined) {
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
  function syncEngineState(): void {
    const next: EngineSection = {
      nextRequestId,
      pending: Array.from(pending.values(), (entry) => ({ reqId: entry.reqId, key: entry.key, kind: entry.kind })),
      failed,
      claims: state.engine.claims ?? [],
      ...(state.engine.phase === undefined ? {} : { phase: state.engine.phase }),
    };
    if (state.engine.openTick !== undefined) next.openTick = state.engine.openTick;
    if (state.engine.pendingEffects !== undefined) next.pendingEffects = state.engine.pendingEffects;
    if (state.engine.effectDropped !== undefined) next.effectDropped = state.engine.effectDropped;
    if (state.engine.effectDiagnostics !== undefined) next.effectDiagnostics = state.engine.effectDiagnostics;
    if (state.engine.boot !== undefined) next.boot = state.engine.boot;
    if (state.engine.transition !== undefined) next.transition = state.engine.transition;
    if (state.engine.musicAsset !== undefined) next.musicAsset = state.engine.musicAsset;
    state.engine = next;
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
      if (state.engine.boot !== undefined) state.engine.boot.stage = "stopped";
      return;
    }
    cache.set(entry.key, new Uint8Array(record.event.bytes));
  }

  /** `send` posts its request here; the engine swaps boards between ticks (E-19). A later send replaces an earlier one. */
  function applyEngineEffect(effect: EffectRecord): void {
    const [, second] = effect.args;
    if (effect.name === "send") {
      const [board, x, y, layer] = effect.args;
      if (typeof board === "string" && typeof x === "number" && typeof y === "number" && typeof layer === "number") state.engine.transition = { board, x, y, layer };
      return;
    }
    if (effect.name === "reset") {
      resetLifecycle();
      return;
    }
    if (effect.name === "mainFile" && typeof second === "string") {
      resetLifecycle(second);
      return;
    }
    if (effect.name === "quit" && !quitRequested) {
      quitRequested = true;
      requestsOut.push({ kind: "quit", reqId: nextRequestId++ });
    }
  }
  function resetLifecycle(nextMain?: string): void {
    const rng = state.rng;
    const time = state.time;
    const fresh = createGameState({ seed: 0 });
    state.world = fresh.world;
    state.sprites = fresh.sprites;
    state.party = fresh.party;
    state.inventory = fresh.inventory;
    state.triggers = fresh.triggers;
    state.vm = createVmState();
    state.battle = fresh.battle;
    state.menu = fresh.menu;
    state.input = createInputSection();
    state.ui = fresh.ui;
    state.camera = createCameraSection(init.width, init.height);
    state.fx = fresh.fx;
    state.audio = fresh.audio;
    state.surfaces = createSurfacesSection(init.width, init.height);
    state.rng = rng;
    state.time = time;
    pending.clear();
    queuedInputs.length = 0;
    installedFonts.clear();
    quitRequested = false;
    failed = false;
    state.engine = mainKey === null ? { claims: [] } : { claims: [], boot: { stage: "assets", main: mainKey, fonts: [] } };
    for (const registration of [...(init.resetRegistrations ?? [])].sort((left, right) => (left.rank ?? 0) - (right.rank ?? 0))) registration.reset(state);
    if (nextMain !== undefined) {
      const found = index.byKey.get(assetKey(nextMain));
      if (found === undefined) {
        failed = true;
        state.engine.boot = { stage: "stopped", main: "", fonts: [] };
        diagnostics.push({ code: "asset.invalid", file: nextMain, line: 0, message: `main file "${nextMain}" is not in the asset index` });
      } else {
        mainKey = found;
        mainFile = null;
        root = init.assetRoot;
        state.engine.boot = { stage: "main", main: found, fonts: [] };
      }
    }
    services = makeServices(init.plugins ?? DEFAULT_ENGINE_PLUGINS, loader ?? undefined);
  }
  function fail(diagnostic: Diagnostic): void {
    diagnostics.push(diagnostic);
    failed = true;
    if (state.engine.boot !== undefined) state.engine.boot.stage = "stopped";
  }
  function blockingAlive(): boolean {
    return state.vm.threads.some((thread) => thread.kind === "blocking" && thread.status !== "finished");
  }

  /** Hydrate board `key`, requesting its file and then each missing tile asset in turn. */
  function loadBoard(key: AssetKey): "pending" | WorldBoard | null {
    const bytes = cache.get(key);
    if (bytes === undefined) {
      request(key, "board");
      return "pending";
    }
    const result = hydrateBoard(key, bytes, index, root, cache, state.time.tick);
    if (result.error !== null) {
      fail({ code: "asset.invalid", file: result.error.path, line: result.error.offset, message: result.error.message });
      return null;
    }
    if (result.missing !== null) {
      request(result.missing, "tile");
      return "pending";
    }
    const board = result.value?.board ?? null;
    if (board === null) failed = true;
    return board;
  }

  /**
   * Compile `name` from the fetched sources and start it as a thread. A missing,
   * pre-compiled or syntactically wrong program is a located diagnostic and no
   * thread, never a throw out of `advance`.
   */
  function startFileProgram(name: string, owner: string, kind: "board" | "blocking"): void {
    if (loader === null) return;
    try {
      const ref = fileProgramRef(loader, name);
      services.programs.get(ref);
      startThread(state.vm, { ref, kind, owner: kind === "blocking" ? "script" : "world" });
    } catch (error) {
      if (!(error instanceof ScriptError)) throw error;
      diagnostics.push({ code: error.code, file: error.pos?.file ?? owner, line: error.pos?.line ?? 0, message: error.message });
    }
  }
  function postBoardMusic(board: WorldBoard): void {
    const name = board.backgroundMusic ?? "";
    if (name === "") return;
    const music = resolveAsset(index, root, "media", name);
    if (!music.ok) {
      diagnostics.push({ code: "asset.missing", file: board.key, line: 0, message: `board music "${name}" is not in the asset index` });
      return;
    }
    if (state.engine.musicAsset === music.value) return;
    state.engine.musicAsset = music.value;
    bus.postEffect("audio", engineEffect("audio", "music.play", [music.value, true, null, board.key], "draw-audio-cue"));
  }
  /** The player's position when a sprites owner supplies one, else the arrival point converted by the board's own layout (E-11). */
  function cameraAim(board: WorldBoard, arrival: Arrival): CameraPoint {
    const player = init.cameraTarget?.getPlayerPosition() ?? null;
    if (player !== null) return player;
    if (arrival.unit === "pixel") return { x: arrival.x, y: arrival.y };
    return tileToPixel(coordLayout(board.coordType), board.sizeX, arrival.x, arrival.y);
  }
  /** Board entry (E-19, E-47; docs/spec/engine/main-loop-and-startup.md#reawakened-board-entry). */
  function arrive(board: WorldBoard, arrival: Arrival, fromSend: boolean): void {
    if (fromSend) endBoardThreads(state.vm);
    state.world = { board };
    const placement: PlainData[] = [arrival.x, arrival.y, arrival.layer, arrival.unit];
    bus.postEffect("sprites", engineEffect("sprites", "placeplayer", placement));
    state.camera = realignCamera(state.camera, board, cameraAim(board, arrival));
    bus.postEffect("triggers", engineEffect("triggers", "deactivateat", placement));
    postBoardMusic(board);
    for (const name of board.threads ?? []) startFileProgram(name, board.key, "board");
    if (board.enterPrg !== undefined && board.enterPrg !== "") startFileProgram(board.enterPrg, board.key, blockingAlive() ? "board" : "blocking");
  }

  /** E-02 step 9's tail: the main file's `initBoard` entered at the board's start position. */
  function bootBoardKey(main: MainFile): AssetKey | null {
    if (main.initBoard === "") {
      fail({ code: "startup.no-board", file: mainKey ?? "", line: 0, message: "the main file names no initBoard" });
      return null;
    }
    const resolved = resolveAsset(index, root, "boards", main.initBoard);
    if (!resolved.ok) {
      fail({ code: "asset.missing", file: mainKey ?? "", line: 0, message: `initBoard "${main.initBoard}" is not in the asset index` });
      return null;
    }
    return resolved.value;
  }
  function startBoot(boot: NonNullable<EngineSection["boot"]>): boolean {
    if (mainKey === null) return false;
    if (boot.stage === "main") {
      const bytes = cache.get(mainKey);
      if (bytes === undefined) {
        request(mainKey, "main");
        return false;
      }
      const parsed = readMainFile(new BinaryReader(bytes, mainKey));
      if (!parsed.ok) {
        fail({ code: "asset.invalid", file: mainKey, line: parsed.error.offset, message: parsed.error.message });
        return false;
      }
      mainFile = parsed.value;
      if (root.kind === "game") root = { kind: "game", projectPath: mainFile.projectPath };
      for (const key of [...privateFontKeys(index, root), ...programKeys(index, root)]) request(key, key.endsWith(".ttf") ? "font" : "program");
      boot.stage = "assets";
      return true;
    }
    if (boot.stage === "assets") {
      if (mainFile === null) return false;
      const fonts = privateFontKeys(index, root);
      const programs = programKeys(index, root);
      if (![...fonts, ...programs].every((key) => cache.has(key))) return false;
      for (const key of fonts) {
        const gated = gateTrueType(cache.get(key) ?? new Uint8Array(), key);
        if (!gated.ok) {
          diagnostics.push({ code: "font.rejected", file: key, line: gated.error.offset, message: gated.error.message });
          continue;
        }
        installedFonts.set(key, cache.get(key) ?? new Uint8Array());
        boot.fonts.push(key);
      }
      const manifest = pluginManifestFor(mainFile, mainKey);
      diagnostics.push(...manifest.diagnostics);
      const resolvedPlugins = resolveManifestPlugins(manifest.manifest, mainKey);
      diagnostics.push(...resolvedPlugins.diagnostics);
      loader = { index, root, read: (key) => cache.get(key) };
      services = makeServices(init.plugins ?? resolvedPlugins.plugins, loader);
      if (mainFile.initChar !== "") {
        const player = resolveAsset(index, root, "characters", mainFile.initChar);
        if (player.ok) bus.postEffect("sprites", engineEffect("sprites", "createplayer", [player.value]));
        else diagnostics.push({ code: "asset.missing", file: mainKey, line: 0, message: `initChar "${mainFile.initChar}" is not in the asset index` });
      }
      if (mainFile.startupPrg !== "") startFileProgram(mainFile.startupPrg, mainKey, "blocking");
      boot.stage = "startup";
      return true;
    }
    return false;
  }
  function stepBoot(boot: NonNullable<EngineSection["boot"]>): boolean {
    if (boot.stage === "main" || boot.stage === "assets") return startBoot(boot);
    if (boot.stage === "startup") {
      if (blockingAlive()) return false;
      const ports = init.startup;
      if (mainFile === null || ports === undefined) return false;
      if (!ports.presence.hasPlayer()) {
        fail({ code: "startup.no-player", file: mainKey ?? "", line: 0, message: "an initial character must be defined" });
        return false;
      }
      if (ports.savedGame.restored()) {
        boot.stage = "running";
        return false;
      }
      boot.stage = "board";
      return true;
    }
    if (boot.stage === "board") {
      if (mainFile === null) return false;
      const key = bootBoardKey(mainFile);
      if (key === null) return false;
      const loaded = loadBoard(key);
      if (loaded === "pending" || loaded === null) return false;
      arrive(loaded, { x: loaded.start?.x ?? 64, y: loaded.start?.y ?? 64, layer: loaded.start?.layer ?? 1, unit: "pixel" }, false);
      boot.stage = "running";
      return true;
    }
    return false;
  }
  function stepTransition(transition: NonNullable<EngineSection["transition"]>): boolean {
    const target = resolveAsset(index, root, "boards", transition.board);
    if (!target.ok) {
      diagnostics.push({ code: "asset.missing", file: transition.board, line: 0, message: `send: board "${transition.board}" is not in the asset index` });
      delete state.engine.transition;
      return true;
    }
    const loaded = loadBoard(target.value);
    if (loaded === "pending" || loaded === null) return false;
    delete state.engine.transition;
    arrive(loaded, { x: transition.x, y: transition.y, layer: transition.layer, unit: "tile" }, true);
    return true;
  }
  function stepScene(): boolean {
    if (sceneBoardKey === null || state.world.board !== undefined && state.world.board !== null) return false;
    const loaded = loadBoard(sceneBoardKey);
    if (loaded === "pending" || loaded === null) return false;
    state.world = { board: loaded };
    state.camera = initCameraForBoard(state.camera, loaded, init.cameraTarget);
    return true;
  }
  /**
   * Run every engine-owned step that needs no tick (start-up stages, a pending
   * `send`, the scene board) until one waits for a host reply or a tick.
   */
  function drive(): void {
    for (let guard = 0; guard < 64; guard += 1) {
      if (failed || pending.size > 0 || state.engine.openTick !== undefined) return;
      const boot = state.engine.boot;
      const transition = state.engine.transition;
      let progressed: boolean;
      if (boot === undefined) progressed = transition !== undefined ? stepTransition(transition) : stepScene();
      else if (transition !== undefined && boot.stage !== "main" && boot.stage !== "assets") progressed = stepTransition(transition);
      else progressed = stepBoot(boot);
      if (!progressed) return;
    }
  }
  /** Ticks run once nothing is outstanding: a scene needs its board, boot needs the start-up program or the main loop. */
  function canTick(): boolean {
    if (failed || pending.size > 0 || state.engine.transition !== undefined) return false;
    const boot = state.engine.boot;
    if (boot === undefined) return state.world.board !== undefined && state.world.board !== null;
    return boot.stage === "startup" || boot.stage === "running";
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
        state.camera = updateCamera(state.camera, state.world.board ?? null, init.cameraTarget);
        for (const registration of registrationByPhase.get(phase) ?? []) registration.run(state);
        return;
      case "edges":
      case "triggers":
      case "battle":
        for (const registration of registrationByPhase.get(phase) ?? []) registration.run(state);
        return;
      case "animation":
        advanceFx(state);
        for (const registration of registrationByPhase.get(phase) ?? []) registration.run(state);
        return;
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
    const empty = { tick: state.time.tick, width: init.width, height: init.height, commands: [] as DrawList["commands"] };
    if (board === null) return applyFxDrawList(empty, state.fx);
    const presentationAlpha = Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 0;
    const cameraPos = positionAt(state.camera, presentationAlpha);
    const include = init.include ?? { shading: false, images: false, sprites: false };
    return applyFxDrawList(composeBoard({
      board,
      tick: state.time.tick,
      camera: cameraPos,
      viewport: { width: init.width, height: init.height },
      alpha: presentationAlpha,
      include,
      ...presentation,
    }), state.fx);
  }
  function refreshFrame(): void {
    const list = currentDrawList(0);
    const nextHash = hashDrawList(list);
    if (nextHash === frameHash) return;
    const rendered = rasterize(list, installedFonts, surfaceTextures(state.surfaces, surfaceCache));
    replaceSurface(state.surfaces, 0 as SurfaceId, rendered.width, rendered.height, rendered.rgba);
    frameHash = nextHash;
  }
  function threadLocation(thread: Thread): SourceLocation | null {
    const frame = thread.frames[thread.frames.length - 1];
    if (frame === undefined) return null;
    const program = services.programs.get(frame.program);
    return program.ops[frame.ip]?.pos ?? program.ops[frame.ip - 1]?.pos ?? null;
  }
  function breakpointAt(location: SourceLocation | null): boolean {
    if (location === null) return false;
    return breakpoints.some((breakpoint) => breakpoint.file === location.file && breakpoint.line === location.line);
  }
  function pauseAt(thread: Thread, location: SourceLocation | null): Paused | null {
    if (location === null) return null;
    return { thread: thread.id, frame: Math.max(0, thread.frames.length - 1), line: location.line };
  }
  function beginOpenTick(): void {
    const readyThreads = state.vm.threads
      .filter((thread) => thread.status === "ready")
      .sort((left, right) => left.id - right.id)
      .map((thread) => thread.id);
    state.engine.openTick = { readyThreads, readyIndex: 0, currentThread: readyThreads[0] ?? 0, stepsUsed: 0 };
  }
  function nextOpenThread(): void {
    const cursor = state.engine.openTick;
    if (cursor === undefined) return;
    cursor.readyIndex += 1;
    const next = cursor.readyThreads[cursor.readyIndex];
    if (next === undefined) delete state.engine.openTick;
    else cursor.currentThread = next;
  }
  function runOpenThreads(mode: ResumeMode): Paused | null {
    if (state.engine.openTick === undefined) beginOpenTick();
    const cursor = state.engine.openTick;
    if (cursor === undefined) return null;
    while (state.engine.openTick !== undefined) {
      const active = state.vm.threads.find((thread) => thread.id === cursor.currentThread);
      if (active === undefined || active.status !== "ready") {
        nextOpenThread();
        continue;
      }
      const before = threadLocation(active);
      const suppressed = cursor.skip !== undefined && before !== null && cursor.skip.file === before.file && cursor.skip.line === before.line;
      if (!suppressed && breakpointAt(before)) {
        if (before !== null) cursor.skip = { file: before.file, line: before.line };
        return pauseAt(active, before);
      }
      const steps = stepThread(active, state.vm, services, 1);
      cursor.stepsUsed += steps;
      const after = threadLocation(active);
      if (after === null || before === null || after.file !== before.file || after.line !== before.line) delete cursor.skip;
      else if (before !== null) cursor.skip = { file: before.file, line: before.line };
      if (mode === "step" && steps > 0) {
        const paused = pauseAt(active, after ?? before);
        if (active.status !== "ready") nextOpenThread();
        return paused;
      }
      if (active.status !== "ready") nextOpenThread();
    }
    return null;
  }
  function finishOpenTick(consumed: InputRecord[], mode: ResumeMode): Paused | null {
    const paused = runOpenThreads(mode);
    if (paused !== null || state.engine.openTick !== undefined) return paused;
    for (const phase of ENGINE_PHASES) {
      if (phase !== "input" && phase !== "waits" && phase !== "threads") runPhase(phase, consumed);
    }
    return null;
  }

  const engine: Engine = {
    advance(ticks: number, inputs: readonly InputRecord[], maxTicks?: number, resume: ResumeMode = "continue") {
      requestsOut.length = 0;
      const consumed: InputRecord[] = [];
      const failedAtStart = failed;
      for (const input of inputs) queuedInputs.push(input);
      processPreTickEvents(consumed);
      drive();
      if (failedAtStart) consumeStoppedInputs(consumed);
      const requestedTicks = Number.isFinite(ticks) ? Math.max(0, Math.trunc(ticks)) : 0;
      const cap = maxTicks ?? init.maxTicks;
      const bounded = Math.min(requestedTicks, Math.max(0, Math.trunc(cap)));
      let ticksRun = 0;
      let paused: Paused | null = null;
      while (canTick() && state.input.focused && (state.engine.openTick !== undefined || ticksRun < bounded)) {
        if (state.engine.openTick === undefined) {
          runPhase("input", consumed);
          if (!state.input.focused) break;
          runPhase("waits", consumed);
        }
        if (state.engine.openTick === undefined && breakpoints.length === 0 && resume !== "step") {
          runPhase("threads", consumed);
          for (const phase of ENGINE_PHASES) {
            if (phase !== "input" && phase !== "waits" && phase !== "threads") runPhase(phase, consumed);
          }
        } else {
          paused = finishOpenTick(consumed, resume);
          if (paused !== null) break;
        }
        ticksRun += 1;
        resume = "continue";
        drive();
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
        paused,
        stateHash: hashState(state),
      };
    },
    drawList(alpha = 0, include: DrawListInclude = { shading: false, images: false, sprites: false }) {
      const board: WorldBoard | null = state.world.board ?? null;
      const empty = { tick: state.time.tick, width: init.width, height: init.height, commands: [] as DrawList["commands"] };
      if (board === null) return applyFxDrawList(empty, state.fx);
      const presentationAlpha = Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 0;
      const cameraPos = positionAt(state.camera, presentationAlpha);
      return applyFxDrawList(composeBoard({ board, tick: state.time.tick, camera: cameraPos, viewport: { width: init.width, height: init.height }, alpha: presentationAlpha, include, ...presentation }), state.fx);
    },
    surfacePixels(id: SurfaceId, rev: number): SurfacePixels | null {
      if (id === (0 as SurfaceId)) refreshFrame();
      return readSurfacePixels(state.surfaces, id, rev, surfaceCache);
    },
    setBreakpoints(next: readonly Breakpoint[]) { breakpoints = next; },
  };
  return engine;
}
