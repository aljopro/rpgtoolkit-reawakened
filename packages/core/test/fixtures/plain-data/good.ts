// Plain-data fixtures that must satisfy the `PlainData` constraint (G1.2, AD-7).
import type { AssertPlainData, GameState, PlainData, VmState } from "../../../src/index.ts";
import { createGameState } from "../../../src/index.ts";

export const value: PlainData = {
  name: "x",
  count: 3,
  flags: [true, false, null],
  nested: { deep: "y" },
};

// The real AD-7/AD-10 shapes are plain data; importing them in place of the
// earlier stand-ins proves the production types satisfy AssertPlainData.
export type VmStateIsPlainData = AssertPlainData<VmState>;
export type GameStateIsPlainData = AssertPlainData<GameState>;

// A mid-yield game state: the `time` section is a plain tick counter (AD-2).
export const midYieldState: GameState = {
  ...createGameState({ seed: 1 }),
  time: { tick: 2 },
};
