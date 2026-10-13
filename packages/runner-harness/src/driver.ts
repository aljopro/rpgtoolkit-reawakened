import {
  canon,
  encodeLog,
  hashDrawList,
  type Engine,
  type InputRecord,
} from "@tk-reawakened/core";
import type { AudioSink } from "./audio.ts";
import type { Run, TickRecord } from "./golden.ts";

export function runLog(
  engine: Engine,
  run: Run,
  n: number,
  audio: AudioSink,
): TickRecord[] {
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError("runLog: n must be an integer >= 1");
  }

  const records: TickRecord[] = [];
  let currentTick = 0;
  let callIndex = 0;
  let inputIndex = 0;

  while (currentTick < run.ticks) {
    const ticksToRun = Math.min(n, run.ticks - currentTick);
    const before = currentTick;
    const endWindow = before + ticksToRun;

    const fedInputs: InputRecord[] = [];
    while (
      inputIndex < run.log.length &&
      run.log[inputIndex]!.tick < endWindow
    ) {
      const rec = run.log[inputIndex]!;
      if (rec.tick < before) {
        throw new RangeError(
          `runLog: call ${callIndex}: record tick ${rec.tick} is before window [${before}, ${endWindow})`,
        );
      }
      fedInputs.push(rec);
      inputIndex++;
    }

    const fedCanon = canon(encodeLog(fedInputs));
    const report = engine.advance(ticksToRun, fedInputs, n);

    if (report.ticksRun !== ticksToRun) {
      throw new Error(
        `runLog: call ${callIndex}: ticksRun ${report.ticksRun} does not match expected ${ticksToRun}`,
      );
    }
    if (report.tickAfter !== before + report.ticksRun) {
      throw new Error(
        `runLog: call ${callIndex}: tickAfter ${report.tickAfter} does not match expected ${before + report.ticksRun}`,
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
      tick: report.tickAfter,
      state: report.stateHash,
      draw: hashDrawList(engine.drawList(0)),
    });

    currentTick = report.tickAfter;
    callIndex++;
  }

  if (inputIndex < run.log.length) {
    throw new Error(
      `runLog: unconsumed inputs remaining after run: ${run.log.length - inputIndex} records`,
    );
  }

  return records;
}
