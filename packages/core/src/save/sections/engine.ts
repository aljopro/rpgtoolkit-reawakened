/** Owner: core/engine; request sequencing, phase dispatch, claims and diagnostics. */
import type { Diagnostic } from "../../ports/engine.ts";
import type { EffectRecord } from "../../script/effects.ts";
import type { SectionKey } from "../state.ts";

export type EngineEffectQueue = Partial<Record<SectionKey, EffectRecord[]>>;

export type EnginePhase = "input" | "waits" | "threads" | "movement" | "edges" | "triggers" | "battle" | "animation" | "audio" | "time";

/** The resumable VM portion of a fixed tick (AD-1 breakpoint cursor). */
export type OpenTickCursor = {
  /** Ready-thread order captured before the threads phase began. */
  readyThreads: number[];
  /** Index of `currentThread` in `readyThreads`. */
  readyIndex: number;
  currentThread: number;
  /** Number of VM instructions consumed in this open tick. */
  stepsUsed: number;
  /** Suppresses re-hitting a breakpoint while its source line still runs. */
  skip?: { file: string; line: number };
};

export type EngineSection = {
  readonly nextRequestId?: number;
  readonly pending?: { readonly reqId: number; readonly key: string; readonly kind: "board" | "tile" }[];
  readonly failed?: boolean;
  phase?: EnginePhase;
  claims?: number[];
  openTick?: OpenTickCursor;
  pendingEffects?: EngineEffectQueue;
  effectDropped?: Partial<Record<SectionKey, number>>;
  effectDiagnostics?: Diagnostic[];
};
