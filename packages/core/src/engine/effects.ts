/**
 * Synchronous section-effect dispatch (AD-10; docs/spec/engine/rpgcode-runtime.md#reawakened-effect-dispatch).
 *
 * Effects are plain-data audit records. Registered owners receive them in post
 * order; records posted before an owner exists remain in the engine section so
 * a later registration can drain them deterministically.
 */

import type { Diagnostic } from "../ports/engine.ts";
import type { GameState, SectionKey } from "../save/state.ts";
import { recordEffect, type EffectRecord } from "../script/effects.ts";
import type { EngineEffectQueue } from "../save/sections/engine.ts";

export const EFFECT_PENDING_CAP = 256;

export type EffectApplier = (effect: EffectRecord) => void;

export type PostEffect = Omit<EffectRecord, "seq" | "tick"> & { readonly tick?: number };

function queueFor(state: GameState, section: SectionKey): EffectRecord[] {
  const queues = (state.engine.pendingEffects ??= {});
  const queue = (queues[section] ??= []);
  return queue;
}

function droppedFor(state: GameState, section: SectionKey): number {
  const dropped = (state.engine.effectDropped ??= {});
  return dropped[section] ?? 0;
}

export class EffectBus {
  private readonly appliers = new Map<SectionKey, EffectApplier>();
  private readonly state: GameState;
  private readonly diagnosticSink: ((diagnostic: Diagnostic) => void) | undefined;

  public constructor(state: GameState, diagnosticSink?: (diagnostic: Diagnostic) => void) {
    this.state = state;
    this.diagnosticSink = diagnosticSink;
  }

  /** Register an owner and immediately drain its pending records in FIFO order. */
  public register(section: SectionKey, applier: EffectApplier): void {
    this.appliers.set(section, applier);
    const queue = this.state.engine.pendingEffects?.[section];
    if (queue === undefined || queue.length === 0) return;
    queue.splice(0, queue.length).forEach((effect) => applier(effect));
  }

  /**
   * Stamp a phase-posted effect, append it to the bounded VM audit log, and
   * dispatch it. Callers supply all fields except `seq`.
   */
  public postEffect(section: SectionKey, effect: PostEffect): EffectRecord {
    const stamped = recordEffect(this.state.vm, {
      ...effect,
      tick: effect.tick ?? this.state.time.tick,
    });
    this.dispatchRecorded(section, stamped);
    return stamped;
  }

  /** Dispatch a record already appended by the VM, without duplicating its audit entry. */
  public dispatchRecorded(section: SectionKey, effect: EffectRecord): void {
    const applier = this.appliers.get(section);
    if (applier !== undefined) {
      applier(effect);
      return;
    }
    const queue = queueFor(this.state, section);
    if (queue.length >= EFFECT_PENDING_CAP) {
      queue.shift();
      const dropped = droppedFor(this.state, section) + 1;
      (this.state.engine.effectDropped ??= {})[section] = dropped;
      const diagnostic: Diagnostic = {
        code: "effect.pending-dropped",
        file: "",
        line: 0,
        message: `pending ${section} effect queue reached ${EFFECT_PENDING_CAP}; oldest effect dropped`,
      };
      (this.state.engine.effectDiagnostics ??= []).push(diagnostic);
      this.diagnosticSink?.(diagnostic);
    }
    queue.push(effect);
  }

  /** Number of pending effects for one section. */
  public pendingCount(section: SectionKey): number {
    return this.state.engine.pendingEffects?.[section]?.length ?? 0;
  }

  /** Number of evicted pending effects for one section. */
  public droppedCount(section: SectionKey): number {
    return droppedFor(this.state, section);
  }

  /** Read-only pending queue view for diagnostics and tests. */
  public pending(section: SectionKey): readonly EffectRecord[] {
    return this.state.engine.pendingEffects?.[section] ?? [];
  }
}

/** Keep the queue declaration reachable to consumers without exposing mutable internals. */
export type { EngineEffectQueue };
