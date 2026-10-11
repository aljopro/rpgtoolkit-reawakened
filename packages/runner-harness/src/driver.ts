import {
  canon,
  encodeLog,
  hashDrawList,
  type Engine,
  type InputRecord,
} from "@tk-reawakened/core";
import type { AudioSink } from "./audio.ts";
import type { Run, StepRecord } from "./golden.ts";

export function runLog(
  engine: Engine,
  run: Run,
  n: number,
  audio: AudioSink,
): StepRecord[] {
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError("runLog: n must be an integer >= 1");
  }

  const records: StepRecord[] = [];
  let currentStep = 0;
  let callIndex = 0;
  let inputIndex = 0;

  while (currentStep < run.steps) {
    const stepsToRun = Math.min(n, run.steps - currentStep);
    const before = currentStep;
    const endWindow = before + stepsToRun;

    const fedInputs: InputRecord[] = [];
    while (
      inputIndex < run.log.length &&
      run.log[inputIndex]!.step < endWindow
    ) {
      const rec = run.log[inputIndex]!;
      if (rec.step < before) {
        throw new RangeError(
          `runLog: call ${callIndex}: record step ${rec.step} is before window [${before}, ${endWindow})`,
        );
      }
      fedInputs.push(rec);
      inputIndex++;
    }

    const fedCanon = canon(encodeLog(fedInputs));
    const report = engine.advance(stepsToRun, fedInputs, n);

    if (report.stepsRun !== stepsToRun) {
      throw new Error(
        `runLog: call ${callIndex}: stepsRun ${report.stepsRun} does not match expected ${stepsToRun}`,
      );
    }
    if (report.stepAfter !== before + report.stepsRun) {
      throw new Error(
        `runLog: call ${callIndex}: stepAfter ${report.stepAfter} does not match expected ${before + report.stepsRun}`,
      );
    }
    if (report.loading !== false) {
      throw new Error(`runLog: call ${callIndex}: loading is true`);
    }
    if (report.paused !== null) {
      throw new Error(`runLog: call ${callIndex}: paused is not null`);
    }
    if (report.requests.length > 0) {
      throw new Error(
        `runLog: call ${callIndex}: requests is not empty (${report.requests.length} requests)`,
      );
    }
    if (report.diagnostics.length > 0) {
      throw new Error(
        `runLog: call ${callIndex}: diagnostics is not empty (${report.diagnostics.length} diagnostics)`,
      );
    }

    if (report.consumed.length !== fedInputs.length) {
      throw new Error(
        `runLog: call ${callIndex}: consumed length ${report.consumed.length} does not match fed length ${fedInputs.length}`,
      );
    }
    const consumedCanon = canon(encodeLog(report.consumed));
    if (consumedCanon !== fedCanon) {
      throw new Error(
        `runLog: call ${callIndex}: consumed inputs do not match fed inputs`,
      );
    }

    for (const cue of report.audioCues) {
      audio.handle(cue);
    }

    records.push({
      step: report.stepAfter,
      state: report.stateHash,
      draw: hashDrawList(engine.drawList(0)),
    });

    currentStep = report.stepAfter;
    callIndex++;
  }

  if (inputIndex < run.log.length) {
    throw new Error(
      `runLog: unconsumed inputs remaining after run: ${run.log.length - inputIndex} records`,
    );
  }

  return records;
}
