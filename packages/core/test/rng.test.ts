// The one seeded generator (AD-12): SplitMix32 seed expansion and the
// xoshiro128** stream, pinned against frozen vectors and an independent BigInt
// oracle, plus snapshot continuity through `core/save` (G3, AD-11).
import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import {
  createGameState,
  createRngPort,
  nextUint32,
  restoreGameState,
  seedRng,
  snapshot,
  type RngState,
} from "../src/index.ts";

// An independent xoshiro128** implementation in BigInt, masked to 32 bits, used
// as the oracle the 32-bit `Math.imul` version must agree with.
function oracleNext(state: RngState): number {
  const mask = 0xffffffffn;
  const rotl = (value: bigint, shift: bigint): bigint => ((value << shift) | (value >> (32n - shift))) & mask;
  const s0 = BigInt(state.s0);
  const s1 = BigInt(state.s1);
  const result = (rotl((s1 * 5n) & mask, 7n) * 9n) & mask;
  const t = (s1 << 9n) & mask;
  state.s2 = Number(BigInt(state.s2) ^ s0);
  state.s3 = Number(BigInt(state.s3) ^ s1);
  state.s1 = Number(BigInt(state.s1) ^ BigInt(state.s2));
  state.s0 = Number(BigInt(state.s0) ^ BigInt(state.s3));
  state.s2 = Number(BigInt(state.s2) ^ t);
  state.s3 = Number(rotl(BigInt(state.s3), 11n));
  return Number(result);
}

test("SplitMix32 expands a fixed seed to the frozen words and never to all zeros", () => {
  deepEqual(seedRng(42), {
    s0: 551831576,
    s1: 144025891,
    s2: 322543647,
    s3: 3034809370,
  });
  deepEqual(seedRng(0), {
    s0: 1684164658,
    s1: 3653269916,
    s2: 2939563536,
    s3: 2141751570,
  });

  for (let seed = 0; seed <= 1000; seed++) {
    const state = seedRng(seed);
    equal(
      ((state.s0 | state.s1 | state.s2 | state.s3) >>> 0) === 0,
      false,
      `seed ${seed} produced the all-zero state`,
    );
  }
});

test("xoshiro128** matches the pinned vector and the reference oracle over 1000 draws", () => {
  const pinned = [
    660444221, 3652823732, 77672526, 910233633, 2297337756, 3786072677, 3123505064, 1891482476,
  ];
  const pinnedState = seedRng(42);
  for (const expected of pinned) {
    equal(nextUint32(pinnedState), expected);
  }

  const subject = seedRng(42);
  const oracle = seedRng(42);
  for (let draw = 0; draw < 1000; draw++) {
    equal(nextUint32(subject), oracleNext(oracle), `draw ${draw}`);
  }
});

test("two ports from one seed agree and a restored RngState continues the sequence", () => {
  const left = createRngPort(seedRng(7));
  const right = createRngPort(seedRng(7));
  for (let draw = 0; draw < 10; draw++) {
    equal(left.nextUint32(), right.nextUint32(), `draw ${draw}`);
  }

  const gameState = createGameState({ seed: 7 });
  const port = createRngPort(gameState.rng);
  for (let draw = 0; draw < 5; draw++) port.nextUint32();

  const restored = restoreGameState(snapshot(gameState));
  const restoredPort = createRngPort(restored.rng);
  for (let draw = 0; draw < 5; draw++) {
    equal(restoredPort.nextUint32(), port.nextUint32(), `continued draw ${draw}`);
  }
});
