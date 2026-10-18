/** Owner: core/engine; request sequencing, phase dispatch, claims and diagnostics. */
import type { Diagnostic } from "../../ports/engine.ts";
import type { EffectRecord } from "../../script/effects.ts";
import type { SectionKey } from "../state.ts";

export type EngineEffectQueue = Partial<Record<SectionKey, EffectRecord[]>>;

export type EnginePhase = "input" | "waits" | "threads" | "movement" | "edges" | "triggers" | "battle" | "animation" | "audio" | "time";

export type EngineSection = {
  readonly nextRequestId?: number;
  readonly pending?: { readonly reqId: number; readonly key: string; readonly kind: "board" | "tile" }[];
  readonly failed?: boolean;
  phase?: EnginePhase;
  claims?: number[];
  pendingEffects?: EngineEffectQueue;
  effectDropped?: Partial<Record<SectionKey, number>>;
  effectDiagnostics?: Diagnostic[];
};
