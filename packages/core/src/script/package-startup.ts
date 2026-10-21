/**
 * Package start-up: the one run that establishes the layers a package registers
 * (MOD-4 lifecycle and point 3, PKG-5; entry 19.8;
 * docs/spec/engine/rpgcode-modules-and-objects.md#registerplugin-layers-entry-198).
 *
 * The owner rules that package layers are rebuilt at every start-up and are not
 * saved, so a host runs every package's start-up program, in manifest order, on a
 * fresh state before it uses the game: a new game does so on its own fresh state,
 * and a restore does so on a scratch fresh state and then loads the saved state,
 * keeping the layer table the start-up built. Start-up is deterministic and runs
 * on a fresh state both times, so it makes the same layer ids and the same closure
 * cells (`cell<n>`) both times, and the loaded state's cells and handles agree with
 * the rebuilt table.
 *
 * It runs the threads phase only, never the clock: a start-up program registers and
 * does not wait, so the clock does not move and a new game's state has no residue
 * of it but the cells, definition owners and variables the program made. The thread
 * is removed when it ends. A program that waits, or that has not finished after
 * `MAX_STARTUP_SLICES` slices of the step budget, stops the run with
 * `package.startup-unfinished`; it is a load-time failure, never catchable by a script.
 */

import type { GameState } from "../save/state.ts";
import { registerPackageBehaviours } from "../actors/behaviour.ts";
import { ScriptError } from "./errors.ts";
import type { ProgramRef } from "./program.ts";
import { findThread, killThread, startProgram } from "./state.ts";
import type { ResolvedPlugin } from "./plugin.ts";
import { runThreadsPhase, STEP_BUDGET, type ScriptServices } from "./vm.ts";

/** The most budget-sized slices one start-up program may take before the run is refused. */
export const MAX_STARTUP_SLICES = 100;

/**
 * Run package startup contributions on a fresh session. Each package's
 * behaviour-startup callback receives a namespace-scoped registrar before its
 * RPGCode startup program runs. `state` must be a fresh state, `services` the
 * services made over it, and `plugins` the exact resolved package list.
 */
export function runPackageStartup(
  state: GameState,
  services: ScriptServices,
  startups: readonly ProgramRef[],
  plugins: readonly ResolvedPlugin[],
): void {
  registerPackageBehaviours(services.behaviours, plugins);
  for (const ref of startups) {
    const thread = startProgram(state.vm, ref);
    const id = thread.id;
    for (let slice = 0; slice < MAX_STARTUP_SLICES; slice += 1) {
      runThreadsPhase(state.vm, services, STEP_BUDGET);
      const running = findThread(state.vm, id);
      if (running === undefined || running.status !== "ready") break;
    }
    const last = findThread(state.vm, id);
    if (last !== undefined && last.status !== "finished") {
      throw new ScriptError(
        "package.startup-unfinished",
        `a package start-up program ${last.status === "waiting" ? "waits" : "did not finish"}; start-up registers layers and neither waits nor runs on (PKG-5)`,
      );
    }
    killThread(state.vm, id);
  }
}
