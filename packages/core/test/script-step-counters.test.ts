import { deepEqual, equal, ok } from "node:assert/strict";
import { test } from "node:test";
import {
  createGameState,
  hashGameState,
  isCallableValue,
  readStepCounters,
  restoreGameState,
  snapshot,
  startProgram,
  startThread,
  stepThread,
  verifyRestoredHandles,
  withOwner,
  type GameState,
  type ProgramRef,
} from "../src/index.ts";
import type { Value } from "../src/ports/value.ts";
import { createScriptServices } from "./script-test-services.ts";

const compiler = "2";

function packageRef(text: string, owner: string): ProgramRef {
  return withOwner({ kind: "inline", text, compiler }, owner);
}

function makeState(): GameState {
  const state = createGameState({ seed: 0 });
  startProgram(state.vm, packageRef("f = (x) => x + 1\nr = f(1)\n", "alpha"));
  startThread(state.vm, { ref: packageRef("g = (x) => x * 2\ns = g(2)\n", "beta"), kind: "item", owner: "world" });
  return state;
}

function finish(state: GameState): number {
  const services = createScriptServices(state);
  let total = 0;
  for (const thread of state.vm.threads) {
    total += stepThread(thread, state.vm, services, 1000);
  }
  return total;
}

function ownerOf(value: Value | undefined): string | undefined {
  return isCallableValue(value) ? value.owner : undefined;
}

test("per-package counters attribute direct and callable instructions and sum to thread steps", () => {
  const state = makeState();
  const steps = finish(state);

  deepEqual(readStepCounters(state.vm), {
    alpha: state.vm.stepCounters!.alpha,
    beta: state.vm.stepCounters!.beta,
  });
  equal((state.vm.stepCounters?.alpha ?? 0) + (state.vm.stepCounters?.beta ?? 0), steps);
  equal(state.vm.globals.r, 2);
  equal(state.vm.globals.s, 4);
  equal(ownerOf(state.vm.globals.f), "alpha");
  equal(ownerOf(state.vm.globals.g), "beta");
});

test("per-package counters are deterministic across runs, snapshots and restore", () => {
  const first = makeState();
  const second = makeState();
  finish(first);
  finish(second);
  equal(snapshot(first), snapshot(second));
  equal(hashGameState(first), hashGameState(second));

  const resumed = makeState();
  for (const thread of resumed.vm.threads) stepThread(thread, resumed.vm, createScriptServices(resumed), 1);
  const restored = restoreGameState(snapshot(resumed));
  const services = createScriptServices(restored);
  verifyRestoredHandles(restored.vm, services);
  finish(restored);
  finish(resumed);
  equal(snapshot(restored), snapshot(resumed));
  deepEqual(readStepCounters(restored.vm), readStepCounters(resumed.vm));
});

test("step counters are excluded from the game-state hash", () => {
  const plain = createGameState({ seed: 0 });
  const counted = createGameState({ seed: 0 });
  counted.vm.stepCounters = { alpha: 17, beta: 4 };
  equal(hashGameState(counted), hashGameState(plain));
  ok(snapshot(counted).includes('"stepCounters"'));
});
