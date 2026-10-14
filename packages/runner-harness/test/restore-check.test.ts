// The shared snapshot→restore→hash check (decisions Q5/Q12): the seeded split
// point and the first-mismatch error.
import { equal } from "node:assert/strict";
import { test } from "node:test";
import {
  checkSnapshotRestore,
  createNullAudio,
  createScriptHost,
  randomSplit,
  restoreScriptHost,
  runLog,
  type Run,
} from "../src/index.ts";

function messageOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("expected the call to throw");
}

test("randomSplit is deterministic and inside 0..ticks", () => {
  for (const seed of [0, 1, 2, 42, 1000]) {
    const first = randomSplit(seed, 7);
    const second = randomSplit(seed, 7);
    equal(first, second, `seed ${seed} is deterministic`);
    equal(Number.isInteger(first), true);
    equal(first >= 0 && first <= 7, true);
  }

  const spread = new Set<number>([0, 1, 2, 3, 4].map((seed) => randomSplit(seed, 4)));
  equal(spread.size > 1, true);
});

test("a restored host driven from the split matches every tick", () => {
  const TRACER = 'greeting = "hi"\ncount = 2\nsleep(count)\ncount = 3\nend()\n';
  const total = 3;
  const split = randomSplit(0, total);

  const host = createScriptHost({ program: TRACER, seed: 0 });
  const run: Run = { schema: 1, ticks: split, log: [] };
  runLog(host, run, 1, createNullAudio());

  const restored = restoreScriptHost(host.snapshot(), {});
  checkSnapshotRestore({ fresh: host, fromSnapshot: restored }, { ticks: 2, split });
});

test("a diverging restored run throws naming the first mismatching tick", () => {
  const program = "x = 1\nend()\n";
  const fresh = createScriptHost({ program, seed: 0 });
  const fromSnapshot = createScriptHost({ program, seed: 0 });
  fresh.advance(2, []);
  fromSnapshot.advance(2, []);
  fromSnapshot.state().vm.globals.x = 999;

  const message = messageOf(() =>
    checkSnapshotRestore({ fresh, fromSnapshot }, { ticks: 2, split: 2 }),
  );
  equal(message.includes("tick 3"), true, message);

  // A host that does not start at the split is rejected before any comparison.
  const atZero = createScriptHost({ program, seed: 0 });
  const alsoZero = createScriptHost({ program, seed: 0 });
  const startMessage = messageOf(() =>
    checkSnapshotRestore({ fresh: atZero, fromSnapshot: alsoZero }, { ticks: 1, split: 5 }),
  );
  equal(startMessage.includes("must start at tick 5"), true, startMessage);
});
