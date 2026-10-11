import { deepEqual, equal, throws } from "node:assert/strict";
import { test } from "node:test";
import type {
  Breakpoint,
  DrawList,
  Engine,
  InputRecord,
  StepReport,
  SurfaceId,
  SurfacePixels,
} from "@rpgtoolkit/core";
import { createNullAudio } from "../src/audio.ts";
import { createTestEngine } from "../src/double/test-engine.ts";
import { runLog } from "../src/driver.ts";
import type { Run } from "../src/golden.ts";

test("runLog partitions steps into windows and passes maxSteps = n", () => {
  const calls: { steps: number; inputs: readonly InputRecord[]; maxSteps?: number | undefined }[] = [];

  const spyEngine: Engine = {
    advance(steps: number, inputs: readonly InputRecord[], maxSteps?: number): StepReport {
      const before = calls.reduce((acc, c) => acc + c.steps, 0);
      calls.push({ steps, inputs, maxSteps });
      return {
        stepsRun: steps,
        stepAfter: before + steps,
        consumed: inputs,
        audioCues: [],
        requests: [],
        diagnostics: [],
        loading: false,
        paused: null,
        stateHash: "0123456789abcdef",
      };
    },
    drawList(_alpha?: number): DrawList {
      return { step: 0, width: 320, height: 240, commands: [] };
    },
    surfacePixels(_id: SurfaceId, _rev: number): SurfacePixels | null {
      return null;
    },
    setBreakpoints(_breakpoints: readonly Breakpoint[]): void {},
  };

  const run: Run = {
    schema: 1,
    steps: 7,
    log: [
      { step: 0, event: { kind: "gamepad" } },
      { step: 3, event: { kind: "gamepad" } },
      { step: 6, event: { kind: "gamepad" } },
    ],
  };

  const audio = createNullAudio();
  const records = runLog(spyEngine, run, 3, audio);

  equal(records.length, 3);
  equal(calls.length, 3);

  // Call 1: steps = 3, maxSteps = 3, window [0, 3)
  equal(calls[0]!.steps, 3);
  equal(calls[0]!.maxSteps, 3);
  deepEqual(calls[0]!.inputs, [run.log[0]]);

  // Call 2: steps = 3, maxSteps = 3, window [3, 6)
  equal(calls[1]!.steps, 3);
  equal(calls[1]!.maxSteps, 3);
  deepEqual(calls[1]!.inputs, [run.log[1]]);

  // Call 3: steps = 1, maxSteps = 3, window [6, 7)
  equal(calls[2]!.steps, 1);
  equal(calls[2]!.maxSteps, 3);
  deepEqual(calls[2]!.inputs, [run.log[2]]);
});

test("runLog returns records on empty log", () => {
  const engine = createTestEngine();
  const run: Run = {
    schema: 1,
    steps: 24,
    log: [],
  };
  const audio = createNullAudio();
  const records = runLog(engine, run, 1, audio);
  equal(records.length, 24);
  equal(records[0]!.step, 1);
  equal(records[23]!.step, 24);
});

test("runLog throws on invalid n", () => {
  const engine = createTestEngine();
  const run: Run = { schema: 1, steps: 5, log: [] };
  const audio = createNullAudio();
  throws(() => runLog(engine, run, 0, audio), RangeError);
  throws(() => runLog(engine, run, -1, audio), RangeError);
  throws(() => runLog(engine, run, 1.5, audio), RangeError);
});

test("runLog throws naming call and cause for engine violations", () => {
  const run: Run = {
    schema: 1,
    steps: 5,
    log: [{ step: 0, event: { kind: "gamepad" } }],
  };

  const createFaultyEngine = (modifyReport: (base: StepReport) => StepReport): Engine => ({
    advance(steps: number, inputs: readonly InputRecord[]): StepReport {
      const base: StepReport = {
        stepsRun: steps,
        stepAfter: steps,
        consumed: inputs,
        audioCues: [],
        requests: [],
        diagnostics: [],
        loading: false,
        paused: null,
        stateHash: "0123456789abcdef",
      };
      return modifyReport(base);
    },
    drawList(): DrawList {
      return { step: 0, width: 320, height: 240, commands: [] };
    },
    surfacePixels(): SurfacePixels | null {
      return null;
    },
    setBreakpoints(): void {},
  });
  const failureCases: readonly {
    name: string;
    modifier: (b: StepReport) => StepReport;
    expectedSnippet: string;
  }[] = [
    {
      name: "drops consumed record",
      modifier: (b) => ({ ...b, consumed: [] }),
      expectedSnippet: "consumed length 0 does not match fed length 1",
    },
    {
      name: "alters consumed record",
      modifier: (b) => ({
        ...b,
        consumed: [{ step: 0, event: { kind: "video.ended" } }],
      }),
      expectedSnippet: "consumed inputs do not match fed inputs",
    },
    {
      name: "stepsRun 0",
      modifier: (b) => ({ ...b, stepsRun: 0 }),
      expectedSnippet: "stepsRun 0 does not match expected 3",
    },
    {
      name: "stepsRun below n",
      modifier: (b) => ({ ...b, stepsRun: 1 }),
      expectedSnippet: "stepsRun 1 does not match expected 3",
    },
    {
      name: "stepsRun above n",
      modifier: (b) => ({ ...b, stepsRun: 10 }),
      expectedSnippet: "stepsRun 10 does not match expected 3",
    },
    {
      name: "stepAfter mismatch",
      modifier: (b) => ({ ...b, stepAfter: 99 }),
      expectedSnippet: "stepAfter 99 does not match expected",
    },
    {
      name: "loading true",
      modifier: (b) => ({ ...b, loading: true }),
      expectedSnippet: "loading is true",
    },
    {
      name: "paused not null",
      modifier: (b) => ({ ...b, paused: { thread: 1, frame: 0, line: 1 } }),
      expectedSnippet: "paused is not null",
    },
    {
      name: "request not empty",
      modifier: (b) => ({
        ...b,
        requests: [{ kind: "asset", reqId: 1, key: "foo" as never }],
      }),
      expectedSnippet: "requests is not empty",
    },
    {
      name: "diagnostic not empty",
      modifier: (b) => ({
        ...b,
        diagnostics: [{ code: "E1", file: "main.rc", line: 1, message: "err" }],
      }),
      expectedSnippet: "diagnostics is not empty",
    },
  ];

  for (const { name, modifier, expectedSnippet } of failureCases) {
    const faultyEngine = createFaultyEngine(modifier);
    throws(
      () => runLog(faultyEngine, run, 3, createNullAudio()),
      (err: unknown) => {
        return (
          err instanceof Error &&
          err.message.startsWith("runLog: call 0:") &&
          err.message.includes(expectedSnippet)
        );
      },
      `expected error naming call and cause (${expectedSnippet}) for ${name}`,
    );
  }
});

test("runLog forwards report.audioCues to audio.handle", () => {
  const engine = createTestEngine();
  const run: Run = {
    schema: 1,
    steps: 2,
    log: [
      { step: 0, event: { kind: "key", name: "A", code: "KeyA", down: true } },
      { step: 1, event: { kind: "key", name: "B", code: "KeyB", down: true } },
    ],
  };
  const audio = createNullAudio();
  runLog(engine, run, 2, audio);
  equal(audio.cues.length, 2);
  deepEqual(audio.cues[0], { cueId: 1, kind: "volume.set", volume: 100 });
  deepEqual(audio.cues[1], { cueId: 2, kind: "volume.set", volume: 100 });
});
