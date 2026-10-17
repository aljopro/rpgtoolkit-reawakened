/**
 * The shared snapshot→restore→hash check (decision Q5/Q12; docs/spec/engine/rpgcode-runtime.md THR-3).
 *
 * `checkSnapshotRestore` drives two hosts one tick at a time and compares
 * `TickReport.stateHash` at every tick after the split, throwing with the first
 * mismatching tick named. Its unit is the host's advance unit, which for
 * `ScriptHost` is the tick; THR-3's snapshot "step" is a VM instruction, and no
 * VM-step counter exists in `GameState` (docs/spec/engine/rpgcode-language.md#open-questions follow-up 7), so a
 * VM-step-granular variant waits for that counter.
 *
 * `randomSplit` picks a split point through `core/rng`, never `Math.random`, so
 * a fuzz run is reproducible from its seed.
 */

import {
  createRngPort,
  seedRng,
  type InputRecord,
  type TickReport,
} from "@tk-reawakened/core";

/** The part of a host this check needs: report a tick, and snapshot. */
export type SnapshotHost = {
  advance(ticks: number, inputs: readonly InputRecord[]): TickReport;
  snapshot(): string;
};

/**
 * Advance both hosts one tick at a time and compare their state hashes; throw
 * naming the first tick where they differ. Both hosts must already be at tick
 * `options.split` (the snapshot point), or the start check throws.
 */
export type CheckSnapshotRestoreOptions = {
  readonly ticks: number;
  readonly split: number;
  readonly inputsForTick?: ((tick: number) => readonly InputRecord[]) | undefined;
};

export function checkSnapshotRestore(
  pair: { readonly fresh: SnapshotHost; readonly fromSnapshot: SnapshotHost },
  options: CheckSnapshotRestoreOptions,
): void {
  // A zero-tick advance reports each host's current tick without advancing it,
  // so the start check runs even when `ticks` is 0.
  const freshStart = pair.fresh.advance(0, []);
  const restoredStart = pair.fromSnapshot.advance(0, []);
  if (freshStart.tickAfter !== options.split || restoredStart.tickAfter !== options.split) {
    throw new Error(
      `checkSnapshotRestore: both hosts must start at tick ${options.split} ` +
        `(fresh at ${freshStart.tickAfter}, restored at ${restoredStart.tickAfter})`,
    );
  }

  for (let step = 0; step < options.ticks; step++) {
    const tickNumber = options.split + step;
    const inputs = options.inputsForTick ? options.inputsForTick(tickNumber) : [];
    const fresh = pair.fresh.advance(1, inputs);
    const restored = pair.fromSnapshot.advance(1, inputs);
    if (fresh.stateHash !== restored.stateHash) {
      throw new Error(
        `checkSnapshotRestore: state diverged at tick ${fresh.tickAfter} ` +
          `(${fresh.stateHash} !== ${restored.stateHash})`,
      );
    }
  }
}

/** A deterministic split point in `0 … ticks`, drawn from the seeded RNG. */
export function randomSplit(seed: number, ticks: number): number {
  const port = createRngPort(seedRng(seed));
  return port.nextUint32() % (ticks + 1);
}
