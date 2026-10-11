import { deepEqual, equal } from "node:assert/strict";
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
import { goldenJob } from "../src/job.ts";

const VALID_VECTORS = JSON.stringify({
  canon: [
    {
      id: "rfc8785-negative-zero",
      bits: "8000000000000000",
      canonical: "0",
    },
  ],
  fnv1a64: [
    {
      id: "fnv-empty",
      utf8: "",
      hash: "cbf29ce484222325",
    },
  ],
});

const VALID_RUN = JSON.stringify({
  schema: 1,
  steps: 3,
  log: [
    { step: 0, event: { kind: "key", name: "A", code: "KeyA", char: null, down: true } },
    { step: 1, event: { kind: "pointer", x: 10, y: 20, buttons: 1 } },
    { step: 2, event: { kind: "key", name: "A", code: "KeyA", char: null, down: false } },
  ],
});

test("goldenJob records golden when record: true and subsequent compare succeeds", () => {
  const recordOutcome = goldenJob({ vectors: VALID_VECTORS, run: VALID_RUN }, true);

  equal(recordOutcome.ok, true);
  if (!recordOutcome.ok) return;

  equal(typeof recordOutcome.golden, "string");
  deepEqual(recordOutcome.lines, [
    "vectors: 2 rows ok",
    "run: 3 steps",
    "batching: 1,3,S ok",
    "golden: 3 recorded",
  ]);

  const compareOutcome = goldenJob({
    vectors: VALID_VECTORS,
    run: VALID_RUN,
    golden: recordOutcome.golden,
  });

  equal(compareOutcome.ok, true);
  if (!compareOutcome.ok) return;

  deepEqual(compareOutcome.lines, [
    "vectors: 2 rows ok",
    "run: 3 steps",
    "batching: 1,3,S ok",
    "golden: 3 compared",
  ]);
});

test("goldenJob returns ok: false with failure on last line when golden differs", () => {
  const recordOutcome = goldenJob({ vectors: VALID_VECTORS, run: VALID_RUN }, true);
  equal(recordOutcome.ok, true);
  if (!recordOutcome.ok || !recordOutcome.golden) return;

  const badGolden = recordOutcome.golden.replace(
    /"state":\s*"[0-9a-f]{16}"/,
    '"state": "0000000000000000"',
  );

  const compareOutcome = goldenJob({
    vectors: VALID_VECTORS,
    run: VALID_RUN,
    golden: badGolden,
  });

  equal(compareOutcome.ok, false);
  if (compareOutcome.ok) return;

  equal(compareOutcome.lines.length, 4);
  equal(compareOutcome.lines[0], "vectors: 2 rows ok");
  equal(compareOutcome.lines[1], "run: 3 steps");
  equal(compareOutcome.lines[2], "batching: 1,3,S ok");
  equal(
    compareOutcome.lines[3]!.includes("golden: step 1: state hash differs"),
    true,
  );
});

test("goldenJob rejects empty log, records, or vector rows without throwing", () => {
  const emptyLogOutcome = goldenJob({
    vectors: VALID_VECTORS,
    run: JSON.stringify({ schema: 1, steps: 3, log: [] }),
  });
  equal(emptyLogOutcome.ok, false);
  if (!emptyLogOutcome.ok) {
    equal(emptyLogOutcome.lines.length, 2);
    equal(emptyLogOutcome.lines[0], "vectors: 2 rows ok");
    equal(emptyLogOutcome.lines[1], "run.json: log is empty");
  }

  const emptyVectorsOutcome = goldenJob({
    vectors: JSON.stringify({ canon: [] }),
    run: VALID_RUN,
  });
  equal(emptyVectorsOutcome.ok, false);
  if (!emptyVectorsOutcome.ok) {
    equal(emptyVectorsOutcome.lines.length, 1);
    equal(emptyVectorsOutcome.lines[0], "hash-vectors.json: zero vector rows");
  }

  const emptyRecordsOutcome = goldenJob({
    vectors: VALID_VECTORS,
    run: VALID_RUN,
    golden: JSON.stringify({ schema: 1, records: [] }),
  });
  equal(emptyRecordsOutcome.ok, false);
  if (!emptyRecordsOutcome.ok) {
    equal(emptyRecordsOutcome.lines.length, 4);
    equal(emptyRecordsOutcome.lines[3], "golden.json: records is empty");
  }
});

test("goldenJob handles absent files without throwing", () => {
  const noVectors = goldenJob({});
  equal(noVectors.ok, false);
  if (!noVectors.ok) {
    equal(noVectors.lines[0], "hash-vectors.json is absent");
  }

  const noRun = goldenJob({ vectors: VALID_VECTORS });
  equal(noRun.ok, false);
  if (!noRun.ok) {
    equal(noRun.lines[1], "run.json is absent");
  }

  const noGolden = goldenJob({ vectors: VALID_VECTORS, run: VALID_RUN }, false);
  equal(noGolden.ok, false);
  if (!noGolden.ok) {
    equal(noGolden.lines[3], "golden.json is absent");
  }
});

test("goldenJob detects batching disagreement without throwing", () => {
  const createBatchDependentEngine = (): Engine => {
    let currentStep = 0;
    return {
      advance(steps: number, inputs: readonly InputRecord[], maxSteps?: number): StepReport {
        currentStep += steps;
        const stateHash = maxSteps === 3 ? "3333333333333333" : "1111111111111111";
        return {
          stepsRun: steps,
          stepAfter: currentStep,
          consumed: inputs,
          audioCues: [],
          requests: [],
          diagnostics: [],
          loading: false,
          paused: null,
          stateHash,
        };
      },
      drawList(): DrawList {
        return { step: currentStep, width: 320, height: 240, commands: [] };
      },
      surfacePixels(_id: SurfaceId, _rev: number): SurfacePixels | null {
        return null;
      },
      setBreakpoints(_breakpoints: readonly Breakpoint[]): void {},
    };
  };

  const outcome = goldenJob(
    { vectors: VALID_VECTORS, run: VALID_RUN },
    false,
    createBatchDependentEngine,
  );

  equal(outcome.ok, false);
  if (!outcome.ok) {
    equal(outcome.lines.length, 3);
    equal(outcome.lines[0], "vectors: 2 rows ok");
    equal(outcome.lines[1], "run: 3 steps");
    equal(outcome.lines[2], "batching: step 3: n=1 and n=3 mismatch");
  }
});
