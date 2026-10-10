// Plain-data fixtures that must satisfy the `PlainData` constraint (G1.2, AD-7).
import type { AssertPlainData, PlainData } from "../../../src/index.ts";

export const value: PlainData = {
  name: "x",
  count: 3,
  flags: [true, false, null],
  nested: { deep: "y" },
};

type Thread = { id: number; status: string };
type VmState = { threads: Thread[]; globals: { [key: string]: PlainData } };

export type VmStateIsPlainData = AssertPlainData<VmState>;
