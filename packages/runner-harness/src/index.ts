export { createNullAudio, type AudioSink, type NullAudio } from "./audio.ts";
export { runLog, type ReportObservation, type ReportObserver } from "./driver.ts";
export {
  compareGolden,
  formatGolden,
  parseGolden,
  parseRun,
  type Golden,
  type Run,
  type TickRecord,
} from "./golden.ts";
export { checkVectors } from "./vectors.ts";
export { createScriptHost, restoreScriptHost } from "./script-host.ts";
export type { ScriptHost, ScriptHostInit, ScriptHostRestore } from "./script-host.ts";
export { checkSnapshotRestore, randomSplit } from "./restore-check.ts";
export type { SnapshotHost } from "./restore-check.ts";
export {
  goldenJob,
  type GoldenOutcome,
  type GoldenTexts,
} from "./job.ts";
