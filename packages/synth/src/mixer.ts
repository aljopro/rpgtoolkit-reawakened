import type { BusControl } from "./machine.ts";

export interface FadeRamp {
  readonly fromVolume: number;
  readonly targetVolume: number;
  readonly startTick: number;
  readonly durationTicks: number;
}

/** Linear integer volume interpolation, rounded half-up as required by the oracle. */
export function fadeVolume(ramp: FadeRamp, tick: number): number {
  if (ramp.durationTicks <= 0 || tick <= ramp.startTick) return Math.round(ramp.fromVolume);
  const elapsed = Math.min(ramp.durationTicks, Math.max(0, tick - ramp.startTick));
  const numerator = (ramp.targetVolume - ramp.fromVolume) * elapsed;
  const rounded = numerator >= 0 ? Math.floor((numerator + ramp.durationTicks / 2) / ramp.durationTicks) : Math.ceil((numerator - ramp.durationTicks / 2) / ramp.durationTicks);
  return Math.round(ramp.fromVolume + rounded);
}

interface BusState {
  volume: number;
  fade: FadeRamp | null;
}

/** Track buses and master gain; all values are integer percentages. */
export class TrackBusMixer implements BusControl {
  private readonly buses = new Map<string, BusState>();
  private master: BusState = { volume: 100, fade: null };

  setVolume(bus: string | null, volume: number): void {
    const state = this.state(bus);
    state.volume = Math.max(0, Math.min(100, Math.round(volume)));
    state.fade = null;
  }

  fade(bus: string | null, fromVolume: number, targetVolume: number, durationTicks: number): void {
    const state = this.state(bus);
    const start = Math.max(0, Math.min(100, Math.round(fromVolume)));
    const target = Math.max(0, Math.min(100, Math.round(targetVolume)));
    const duration = Math.max(0, Math.round(durationTicks));
    if (duration === 0) {
      state.volume = target;
      state.fade = null;
      return;
    }
    state.volume = start;
    state.fade = { fromVolume: start, targetVolume: target, startTick: 0, durationTicks: duration };
  }

  /** Begin a ramp at an explicit simulation tick. */
  startFade(bus: string | null, fromVolume: number, targetVolume: number, startTick: number, durationTicks: number): void {
    const state = this.state(bus);
    state.volume = Math.max(0, Math.min(100, Math.round(fromVolume)));
    state.fade = durationTicks <= 0 ? null : {
      fromVolume: state.volume,
      targetVolume: Math.max(0, Math.min(100, Math.round(targetVolume))),
      startTick,
      durationTicks: Math.round(durationTicks),
    };
    if (state.fade === null) state.volume = Math.max(0, Math.min(100, Math.round(targetVolume)));
  }

  volume(bus: string | null, tick = 0): number {
    const state = this.state(bus);
    if (state.fade === null) return state.volume;
    const value = fadeVolume(state.fade, tick);
    if (tick >= state.fade.startTick + state.fade.durationTicks) {
      state.volume = state.fade.targetVolume;
      state.fade = null;
    }
    return value;
  }

  gain(bus: string | null, tick = 0): number {
    return this.volume(bus, tick) / 100;
  }

  /** Apply bus and master gains to an already-rendered stereo buffer. */
  apply(bus: string, left: Float32Array, right: Float32Array, tick = 0): void {
    const gain = this.gain(bus, tick) * this.gain(null, tick);
    for (let i = 0; i < left.length; i++) {
      left[i] = (left[i] ?? 0) * gain;
      right[i] = (right[i] ?? 0) * gain;
    }
  }

  private state(bus: string | null): BusState {
    if (bus === null) return this.master;
    let state = this.buses.get(bus);
    if (state === undefined) {
      state = { volume: 100, fade: null };
      this.buses.set(bus, state);
    }
    return state;
  }
}
