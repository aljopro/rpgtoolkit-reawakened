/**
 * The VM-backed test host: the tracer's `Engine` over a real script VM
 * (AD-1; decisions Q5/Q6/Q9).
 *
 * This is deliberately **not** `createEngine`: it holds no phase list, no game
 * logic and no world. `advance` runs one whole `advanceScriptTick` per
 * requested tick (clamped by `maxTicks` exactly as the test double is) and
 * reports the state hash; `drawList` is `{ tick, 320×240, commands: [] }`,
 * `surfacePixels` is `null`, and the report's `consumed`/`requests`/`audioCues`
 * are empty with `loading: false`, `paused: null`. `diagnostics` carries the
 * located runtime failures the VM collected during the batch (AD-24), so the
 * golden `runLog` driver accepts it. Epic 4's `createEngine` supersedes it
 * by calling the same phase handlers with the registry from entry 3.
 */

import {
  advanceScriptTick,
  COMPILER_VERSION,
  createGameState,
  createLogger,
  createScriptServices,
  drainDiagnostics,
  hashState,
  restoreGameState,
  snapshot,
  startProgram,
  STEP_BUDGET,
  type Breakpoint,
  type DrawList,
  type Engine,
  type GameState,
  type LogSink,
  type PluginDefinition,
  type ScriptServices,
  type SurfaceId,
  type SurfacePixels,
  type TickReport,
} from "@tk-reawakened/core";

/** How to build a fresh host: the inline program, the seed and the plugin layers. */
export type ScriptHostInit = {
  readonly program: string;
  readonly seed: number;
  /** The layers above the built-in `core` pack (ADR 0004 decision 6). */
  readonly plugins?: readonly PluginDefinition[];
  /** Where the VM's Logger records go, in order; none means they are dropped. */
  readonly sinks?: readonly LogSink[];
};

/** How to rebuild a host from a snapshot: the registry is code, not state. */
export type ScriptHostRestore = {
  /** The layers above the built-in `core` pack, as the fresh host had them. */
  readonly plugins?: readonly PluginDefinition[];
  /** Where the VM's Logger records go, in order; none means they are dropped. */
  readonly sinks?: readonly LogSink[];
};

/** The tracer's test host: the engine API plus state access for tests. */
export type ScriptHost = Engine & {
  snapshot(): string;
  stateHash(): string;
  state(): GameState;
};

function createHost(gameState: GameState, services: ScriptServices): ScriptHost {
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
        diagnostics: drainDiagnostics(services),
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

/** Start `program` (inline source) as a fresh VM in a fresh game state. */
export function createScriptHost(init: ScriptHostInit): ScriptHost {
  const gameState = createGameState({ seed: init.seed });
  const services = createScriptServices(gameState, init.plugins, createLogger(init.sinks ?? []));
  startProgram(gameState.vm, {
    kind: "inline",
    text: init.program,
    compiler: COMPILER_VERSION,
  });
  return createHost(gameState, services);
}

/** Restore a host from a snapshot, rebinding the registry from `plugins`. */
export function restoreScriptHost(json: string, init: ScriptHostRestore): ScriptHost {
  const gameState = restoreGameState(json);
  const services = createScriptServices(gameState, init.plugins, createLogger(init.sinks ?? []));
  return createHost(gameState, services);
}
