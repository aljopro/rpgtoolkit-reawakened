/**
 * Time is the tick counter (AD-2, AD-10).
 */

export {
  createClockPort,
  createTimeState,
  MAX_TICK,
  runTimePhase,
  secondsToTicks,
  TICKS_PER_SECOND,
} from "./time.ts";
export type { TimeState } from "./time.ts";
