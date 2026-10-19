/** Null-audio cue goldens for sample-game boot and the synthetic battle hand-off (ticket 6.16, G5). */
import type { AudioCue } from "@tk-reawakened/core";
import {
  runClosingGame,
  type ClosingFiles,
  type ClosingGamePlan,
  type ClosingGameRun,
  type ClosingPlan,
} from "./closing.ts";

export type AudioGoldenRun = {
  readonly game: string;
  readonly cues: readonly AudioCue[];
  readonly batchProblems: readonly string[];
};

export type AudioGoldenRecord = {
  readonly schema: 1;
  readonly comment: string;
  readonly games: Readonly<Record<string, readonly AudioCue[]>>;
  readonly syntheticBattle: {
    readonly game: string;
    readonly source: "battle";
    readonly cues: readonly AudioCue[];
  };
};

export type AudioGoldenRuns = {
  readonly runs: readonly AudioGoldenRun[];
  readonly synthetic: AudioGoldenRun;
};

export type AudioGoldenCheck = { readonly ok: boolean; readonly lines: readonly string[] };

const COMMENT = "Ticket 6.16 null-audio cue streams: each fetched sample game boots to its first board, and the synthetic battle hand-off posts music.play with source battle. These are deliberate G5 additions; null audio records cues without rendering device output.";


function run(game: ClosingGamePlan, plan: ClosingPlan, load: (name: string) => ClosingFiles, bundled: ClosingFiles, syntheticBattle: boolean): AudioGoldenRun {
  const result: ClosingGameRun = runClosingGame(plan, game, load(game.name), bundled, { captureAudio: true, syntheticBattle });
  return { game: game.name, cues: result.audioCues, batchProblems: result.batchProblems };
}

export function runAudioGoldens(plan: ClosingPlan, load: (name: string) => ClosingFiles, bundled: ClosingFiles): AudioGoldenRuns {
  const runs = plan.games.map((game) => run(game, plan, load, bundled, false));
  const candidate = plan.games.find((game) => game.expect.outcome === "boots") ?? plan.games[0];
  if (candidate === undefined) throw new Error("closing plan has no games for synthetic battle audio golden");
  return { runs, synthetic: run(candidate, plan, load, bundled, true) };
}

export function formatAudioGolden(runs: readonly AudioGoldenRun[], synthetic: AudioGoldenRun): string {
  const games: Record<string, readonly AudioCue[]> = {};
  for (const run of runs) games[run.game] = run.cues;
  const record: AudioGoldenRecord = {
    schema: 1,
    comment: COMMENT,
    games,
    syntheticBattle: { game: synthetic.game, source: "battle", cues: synthetic.cues },
  };
  return `${JSON.stringify(record, null, 2)}\n`;
}

export function checkAudioGoldens(runs: readonly AudioGoldenRun[], synthetic: AudioGoldenRun, expectedText: string): AudioGoldenCheck {
  try {
    const expected = JSON.parse(expectedText) as AudioGoldenRecord;
    if (expected.schema !== 1 || typeof expected.comment !== "string" || expected.syntheticBattle?.source !== "battle") return { ok: false, lines: ["audio golden: schema or synthetic battle metadata is invalid"] };
    const problems: string[] = [];
    const lines: string[] = [];
    for (const run of runs) {
      if (run.batchProblems.length > 0) problems.push(`${run.game}: ${run.batchProblems.join("; ")}`);
      const recorded = expected.games[run.game];
      if (recorded === undefined) problems.push(`${run.game}: no committed cue stream`);
      else if (JSON.stringify(recorded) !== JSON.stringify(run.cues)) problems.push(`${run.game}: cue stream drifted`);
      else lines.push(`${run.game}: ${run.cues.length} null-audio cues stable`);
    }
    for (const name of Object.keys(expected.games)) if (!runs.some((run) => run.game === name)) problems.push(`${name}: committed cue stream has no run`);
    if (synthetic.batchProblems.length > 0) problems.push(`synthetic battle (${synthetic.game}): ${synthetic.batchProblems.join("; ")}`);
    if (expected.syntheticBattle.game !== synthetic.game || JSON.stringify(expected.syntheticBattle.cues) !== JSON.stringify(synthetic.cues)) problems.push(`synthetic battle (${synthetic.game}): cue stream drifted`);
    else lines.push(`synthetic battle (${synthetic.game}, source=battle): ${synthetic.cues.length} null-audio cues stable`);
    return problems.length === 0 ? { ok: true, lines } : { ok: false, lines: [...lines, ...problems.map((problem) => `audio-golden: ${problem}`)] };
  } catch (error) {
    return { ok: false, lines: [error instanceof Error ? error.message : String(error)] };
  }
}
