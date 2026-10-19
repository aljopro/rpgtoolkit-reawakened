export const CORE_VOICE_CAP = 32;

export interface VoiceSlot {
  readonly track: string;
  readonly index: number;
  readonly priority: number;
  readonly startTick: number;
  readonly paused: boolean;
}

export interface VoiceAllocation {
  readonly index: number;
  readonly stolen: VoiceSlot | null;
}

/** Runner-side voice allocation matching the core priority/age/index order. */
export class VoicePool {
  readonly capacity: number;
  private readonly configured = new Map<string, number>();
  private readonly active = new Map<string, VoiceSlot>();

  constructor(capacity = CORE_VOICE_CAP) {
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > CORE_VOICE_CAP) throw new RangeError("voice pool capacity must be 1..32");
    this.capacity = capacity;
  }

  configure(track: string, voices: number): void {
    if (!Number.isInteger(voices) || voices < 1) throw new RangeError("voice count must be positive");
    const total = voices + [...this.configured].reduce((sum, [name, count]) => name === track ? sum : sum + count, 0);
    if (total > this.capacity) throw new RangeError("configured voices exceed the core 32-voice cap");
    for (const slot of this.active.values()) {
      if (slot.track === track && slot.index >= voices) throw new RangeError("cannot reduce below an active voice index");
    }
    this.configured.set(track, voices);
  }

  configuredCount(track: string): number {
    return this.configured.get(track) ?? 1;
  }

  allocate(track: string, priority: number, startTick: number, requestedIndex: number | null = null, paused = false): VoiceAllocation {
    const count = this.configuredCount(track);
    if (requestedIndex !== null && (!Number.isInteger(requestedIndex) || requestedIndex < 0 || requestedIndex >= count)) {
      throw new RangeError("voice index is outside the configured track slots");
    }
    let index = requestedIndex;
    if (index === null) {
      for (let candidate = 0; candidate < count; candidate++) {
        if (!this.active.has(this.key(track, candidate))) { index = candidate; break; }
      }
    }
    let stolen: VoiceSlot | null = null;
    if (index === null) {
      const candidates = [...this.active.values()].filter((slot) => slot.track === track);
      candidates.sort((a, b) => a.priority - b.priority || a.startTick - b.startTick || a.index - b.index);
      stolen = candidates[0] ?? null;
      if (stolen !== null) {
        index = stolen.index;
        this.active.delete(this.key(stolen.track, stolen.index));
      }
    }
    if (index === null) throw new RangeError("no voice slot is available");
    if (!this.active.has(this.key(track, index)) && this.active.size >= this.capacity) {
      const global = [...this.active.values()].sort(
        (a, b) => a.priority - b.priority || a.startTick - b.startTick || a.index - b.index || a.track.localeCompare(b.track),
      )[0];
      if (global !== undefined) {
        stolen = global;
        this.active.delete(this.key(global.track, global.index));
      }
    } else {
      const occupant = this.active.get(this.key(track, index));
      if (occupant !== undefined) {
        stolen = occupant;
        this.active.delete(this.key(track, index));
      }
    }
    const slot: VoiceSlot = { track, index, priority, startTick, paused };
    this.active.set(this.key(track, index), slot);
    return { index, stolen };
  }

  release(track: string, index: number): void {
    this.active.delete(this.key(track, index));
  }

  slot(track: string, index: number): VoiceSlot | null {
    return this.active.get(this.key(track, index)) ?? null;
  }

  activeSlots(): readonly VoiceSlot[] {
    return [...this.active.values()].sort((a, b) => a.track.localeCompare(b.track) || a.index - b.index);
  }

  private key(track: string, index: number): string {
    return `${track}\u0000${index}`;
  }
}
