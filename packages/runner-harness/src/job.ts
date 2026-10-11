import type { Engine } from "@tk-reawakened/core";
import { createNullAudio } from "./audio.ts";
import { createTestEngine } from "./double/test-engine.ts";
import { runLog } from "./driver.ts";
import {
  compareGolden,
  formatGolden,
  parseGolden,
  parseRun,
  type StepRecord,
} from "./golden.ts";
import { checkVectors } from "./vectors.ts";

export type GoldenTexts = {
  readonly vectors?: string | undefined;
  readonly run?: string | undefined;
  readonly golden?: string | undefined;
};

export type GoldenOutcome =
  | { readonly ok: true; readonly lines: string[]; readonly golden?: string | undefined }
  | { readonly ok: false; readonly lines: string[] };

export function goldenJob(
  texts: GoldenTexts,
  record?: boolean,
  engineFactory: () => Engine = createTestEngine,
): GoldenOutcome {
  const lines: string[] = [];

  try {
    // Stage 1: vectors
    if (texts.vectors === undefined) {
      throw new Error("hash-vectors.json is absent");
    }
    const { count } = checkVectors(texts.vectors);
    lines.push(`vectors: ${count} rows ok`);

    // Stage 2: run
    if (texts.run === undefined) {
      throw new Error("run.json is absent");
    }
    const run = parseRun(texts.run);
    if (run.log.length === 0) {
      throw new Error("run.json: log is empty");
    }
    lines.push(`run: ${run.steps} steps`);

    // Stage 3: batching
    // Each batching run parses the run text afresh and uses fresh engine & audio.
    const engine1 = engineFactory();
    const audio1 = createNullAudio();
    const records1 = runLog(engine1, parseRun(texts.run), 1, audio1);

    const engine3 = engineFactory();
    const audio3 = createNullAudio();
    const records3 = runLog(engine3, parseRun(texts.run), 3, audio3);

    const engineS = engineFactory();
    const audioS = createNullAudio();
    const recordsS = runLog(engineS, parseRun(texts.run), run.steps, audioS);

    // Verify shared steps between n=1 and n=3
    for (const r3 of records3) {
      const r1 = records1[r3.step - 1];
      if (!r1 || r1.state !== r3.state || r1.draw !== r3.draw) {
        throw new Error(`batching: step ${r3.step}: n=1 and n=3 mismatch`);
      }
    }

    // Verify shared steps between n=1 and n=S
    for (const rS of recordsS) {
      const r1 = records1[rS.step - 1];
      if (!r1 || r1.state !== rS.state || r1.draw !== rS.draw) {
        throw new Error(
          `batching: step ${rS.step}: n=1 and n=${run.steps} mismatch`,
        );
      }
    }

    lines.push("batching: 1,3,S ok");

    // Stage 4: golden
    if (record) {
      const formatted = formatGolden(records1);
      lines.push(`golden: ${run.steps} recorded`);
      return { ok: true, lines, golden: formatted };
    }

    if (texts.golden === undefined) {
      throw new Error("golden.json is absent");
    }
    const golden = parseGolden(texts.golden);
    if (golden.records.length === 0) {
      throw new Error("golden.json: records is empty");
    }

    const cmp = compareGolden(records1, golden.records);
    if (!cmp.ok) {
      throw new Error(cmp.message);
    }

    lines.push(`golden: ${run.steps} compared`);
    return { ok: true, lines };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    lines.push(message);
    return { ok: false, lines };
  }
}
