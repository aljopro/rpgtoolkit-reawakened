/**
 * The shared snapshot→restore→hash check (decision Q5/Q12; format-spec
 * §9.15 THR-3).
 *
 * `checkSnapshotRestore` drives two hosts one tick at a time and compares
 * `TickReport.stateHash` at every tick after the split, throwing with the first
 * mismatching tick named. Its unit is the host's advance unit, which for
 * `ScriptHost` is the tick; THR-3's snapshot "step" is a VM instruction, and no
 * VM-step counter exists in `GameState` (format-spec §9.14 follow-up 7), so a
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
 * `options.split` (the snapshot point), or the first advance proves otherwise
 * and the check throws.
 */
export function checkSnapshotRestore(
  pair: { readonly fresh: SnapshotHost; readonly fromSnapshot: SnapshotHost },
  options: { readonly ticks: number; readonly split: number },
): void {
  for (let step = 0; step < options.ticks; step++) {
    const fresh = pair.fresh.advance(1, []);
    const restored = pair.fromSnapshot.advance(1, []);
    if (step === 0 && (fresh.tickAfter - 1 !== options.split || restored.tickAfter - 1 !== options.split)) {
      throw new Error(
        `checkSnapshotRestore: both hosts must start at tick ${options.split} ` +
          `(fresh at ${fresh.tickAfter - 1}, restored at ${restored.tickAfter - 1})`,
      );
    }
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
