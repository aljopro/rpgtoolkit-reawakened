/**
 * The VM-backed test host: the tracer's `Engine` over a real script VM
 * (AD-1; decisions Q5/Q6/Q9).
 *
 * This is deliberately **not** `createEngine`: it holds no phase list, no game
 * logic and no world. `advance` runs one whole `advanceScriptTick` per
 * requested tick (clamped by `maxTicks` exactly as the test double is) and
 * reports the state hash; `drawList` is `{ tick, 320×240, commands: [] }`,
 * `surfacePixels` is `null`, and the report's `consumed`/`requests`/
 * `diagnostics`/`audioCues` are empty with `loading: false`, `paused: null`, so
 * the golden `runLog` driver accepts it. Epic 4's `createEngine` supersedes it
 * by calling the same phase handlers with the registry from entry 3.
 */

import {
  advanceScriptTick,
  applyPluginManifestPatch,
  parsePluginManifest,
  COMPILER_VERSION,
  createGameState,
  createScriptServices,
  ENGINE_DEFAULT_MANIFEST,
  hashState,
  restoreGameState,
  snapshot,
  startProgram,
  STEP_BUDGET,
  type Breakpoint,
  type Diagnostic,
  type DrawList,
  type Engine,
  type GameState,
  type PluginDefinition,
  type PluginManifest,
  type PluginManifestDiagnostic,
  type PluginManifestPatch,
  type ResolvedPlugin,
  type ScriptServices,
  type SurfaceId,
  type SurfacePixels,
  type TickReport,
} from "@tk-reawakened/core";
import { CATALOGUE_STUBS_PLUGIN, CORE_PLUGIN } from "@tk-reawakened/core";
import { resolvePluginManifest } from "./script-plugin-resolver.ts";

/** How to build a fresh host: the inline program, the seed and the plugin layers. */
export type ScriptHostInit = {
  readonly program: string;
  readonly seed: number;
  /** Optional game manifest; omitted means the engine default manifest. */
  readonly manifest?: PluginManifest;
  readonly patch?: PluginManifestPatch;
  /** Host-side definitions available to the manifest resolver. */
  readonly plugins?: readonly PluginDefinition[];
};

/** How to rebuild a host from a snapshot: the registry is code, not state. */
export type ScriptHostRestore = {
  readonly manifest?: PluginManifest;
  readonly patch?: PluginManifestPatch;
  readonly plugins?: readonly PluginDefinition[];
};

/** The tracer's test host: the engine API plus state access for tests. */
export type ScriptHost = Engine & {
  snapshot(): string;
  stateHash(): string;
  state(): GameState;
};

type HostResolution = {
  readonly plugins: readonly ResolvedPlugin[];
  readonly diagnostics: readonly Diagnostic[];
};

function toRuntimeDiagnostics(
  diagnostics: readonly PluginManifestDiagnostic[],
): readonly Diagnostic[] {
  return diagnostics.map((item) => ({
    code: item.code,
    file: item.path,
    line: item.index + 1,
    message: item.message,
  }));
}

function resolveHostPlugins(
  manifest: PluginManifest | undefined,
  patch: PluginManifestPatch | undefined,
  definitions: readonly PluginDefinition[] | undefined,
): HostResolution {
  const table: Record<string, PluginDefinition> = {
    core: CORE_PLUGIN,
    catalogue: CATALOGUE_STUBS_PLUGIN,
  };
  if (definitions !== undefined) {
    for (const definition of definitions) {
      if (definition.id !== "core") table[definition.id] = definition;
    }
  }
  const parsed = parsePluginManifest(manifest ?? ENGINE_DEFAULT_MANIFEST);
  if (parsed.manifest === null) {
    return { plugins: [], diagnostics: toRuntimeDiagnostics(parsed.diagnostics) };
  }
  const operations = patch === undefined ? [] : [...patch];
  if (manifest === undefined && definitions !== undefined) {
    for (const definition of definitions) {
      operations.push({ op: "append", entry: { id: definition.id } });
    }
  }
  const patched = applyPluginManifestPatch(parsed.manifest, operations);
  const resolved = resolvePluginManifest(patched.manifest, table);
  return {
    plugins: resolved.plugins,
    diagnostics: toRuntimeDiagnostics([...patched.diagnostics, ...resolved.diagnostics]),
  };
}

function createHost(
  gameState: GameState,
  services: ScriptServices,
  diagnostics: readonly Diagnostic[],
): ScriptHost {
  let breakpoints: readonly Breakpoint[] = [];

  return {
    advance(ticks: number, _inputs, maxTicks?: number): TickReport {
      const actualTicks = maxTicks !== undefined && maxTicks < ticks ? maxTicks : ticks;
      for (let index = 0; index < actualTicks; index++) {
        advanceScriptTick(gameState, services, STEP_BUDGET);
      }
      return {
        ticksRun: actualTicks,
        tickAfter: gameState.time.tick,
        consumed: [],
        audioCues: [],
        requests: [],
        diagnostics,
        loading: false,
        paused: null,
        stateHash: hashState(gameState),
      };
    },

    drawList(_alpha?: number): DrawList {
      return { tick: gameState.time.tick, width: 320, height: 240, commands: [] };
    },

    surfacePixels(_id: SurfaceId, _rev: number): SurfacePixels | null {
      return null;
    },

    setBreakpoints(next: readonly Breakpoint[]): void {
      breakpoints = next;
      void breakpoints;
    },

    snapshot(): string {
      return snapshot(gameState);
    },

    stateHash(): string {
      return hashState(gameState);
    },

    state(): GameState {
      return gameState;
    },
  };
}

/** Start `program` (inline source) in a manifest-resolved VM. */
export function createScriptHost(init: ScriptHostInit): ScriptHost {
  const gameState = createGameState({ seed: init.seed });
  const resolution = resolveHostPlugins(init.manifest, init.patch, init.plugins);
  const services = createScriptServices(gameState, resolution.plugins);
  startProgram(gameState.vm, {
    kind: "inline",
    text: init.program,
    compiler: COMPILER_VERSION,
  });
  return createHost(gameState, services, resolution.diagnostics);
}

/** Restore a host from a snapshot, rebinding the same effective manifest. */
export function restoreScriptHost(json: string, init: ScriptHostRestore): ScriptHost {
  const gameState = restoreGameState(json);
  const resolution = resolveHostPlugins(init.manifest, init.patch, init.plugins);
  const services = createScriptServices(gameState, resolution.plugins);
  return createHost(gameState, services, resolution.diagnostics);
}
