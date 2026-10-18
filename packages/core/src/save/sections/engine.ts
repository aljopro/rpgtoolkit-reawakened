/** Owner: core/engine; request sequencing, effect dispatch and loading diagnostics. */
import type { Diagnostic } from "../../ports/engine.ts";
import type { EffectRecord } from "../../script/effects.ts";
import type { SectionKey } from "../state.ts";

export type EngineEffectQueue = Partial<Record<SectionKey, EffectRecord[]>>;

export type EngineSection = {
  readonly nextRequestId?: number;
  readonly pending?: { readonly reqId: number; readonly key: string; readonly kind: "board" | "tile" }[];
  readonly failed?: boolean;
  pendingEffects?: EngineEffectQueue;
  effectDropped?: Partial<Record<SectionKey, number>>;
  effectDiagnostics?: Diagnostic[];
};
