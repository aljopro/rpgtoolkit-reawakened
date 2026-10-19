import type { SourceVoice } from "./source.ts";

const TICKS_PER_SECOND = 60;

/** Ticks to frames at `rateHz`, rounding half up (docs/spec/engine/audio-media.md#runner-audio-protocol). */
export function ticksToFrames(ticks: number, rateHz: number): number {
  return Math.floor((2 * ticks * rateHz + TICKS_PER_SECOND) / (2 * TICKS_PER_SECOND));
}

/**
 * A voice that makes no sound but keeps exact time: position, loop, natural end,
 * volume and fade follow the state machine, and `render` writes silence. It is
 * the Null backend's voice and the clock a test source can reuse.
 */
export class SilentVoice implements SourceVoice {
  readonly lengthTicks: number | null;
  private readonly rateHz: number;
  private readonly lengthFrames: number | null;
  private position = 0;
  private playing = false;
  private loop = false;
  private volumeValue = 100;
  private fadeFrom = 0;
  private fadeTarget = 0;
  private fadeFrames = 0;
  private fadeElapsed = 0;

  constructor(lengthTicks: number | null, rateHz: number) {
    this.lengthTicks = lengthTicks;
    this.rateHz = rateHz;
    this.lengthFrames = lengthTicks === null ? null : ticksToFrames(lengthTicks, rateHz);
  }

  get ended(): boolean {
    return !this.loop && this.lengthFrames !== null && this.position >= this.lengthFrames;
  }

  /** Current volume 0-100 including any fade in progress. */
  get volume(): number {
    if (this.fadeFrames === 0) return this.volumeValue;
    return (
      this.fadeFrom +
      ((this.fadeTarget - this.fadeFrom) * this.fadeElapsed) / this.fadeFrames
    );
  }

  /** Position in frames from the start of the current pass or file. */
  get positionFrames(): number {
    return this.position;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  start(positionTicks: number, loop: boolean): void {
    this.loop = loop;
    this.playing = true;
    this.moveTo(ticksToFrames(positionTicks, this.rateHz));
  }

  stop(): void {
    this.playing = false;
  }

  pause(): void {
    this.playing = false;
  }

  resume(): void {
    this.playing = true;
  }

  seek(positionTicks: number): void {
    this.moveTo(ticksToFrames(positionTicks, this.rateHz));
  }

  setLoop(loop: boolean): void {
    this.loop = loop;
  }

  setVolume(volume: number): void {
    this.volumeValue = volume;
    this.fadeFrames = 0;
  }

  fade(fromVolume: number, targetVolume: number, durationTicks: number): void {
    const frames = ticksToFrames(durationTicks, this.rateHz);
    if (frames === 0) {
      this.setVolume(targetVolume);
      return;
    }
    this.fadeFrom = fromVolume;
    this.fadeTarget = targetVolume;
    this.fadeFrames = frames;
    this.fadeElapsed = 0;
  }

  render(left: Float32Array, right: Float32Array, frames: number): void {
    left.fill(0, 0, frames);
    right.fill(0, 0, frames);
    if (!this.playing) return;
    const before = this.position;
    const len = this.lengthFrames;
    if (len === null) this.position += frames;
    else if (this.loop) this.position = len === 0 ? 0 : (this.position + frames) % len;
    else this.position = Math.min(this.position + frames, len);
    const advanced = len !== null && !this.loop ? this.position - before : frames;
    this.advanceFade(advanced);
  }

  private moveTo(frames: number): void {
    const len = this.lengthFrames;
    this.position = len !== null && this.loop && len > 0 ? frames % len : frames;
  }

  private advanceFade(frames: number): void {
    if (this.fadeFrames === 0) return;
    this.fadeElapsed += frames;
    if (this.fadeElapsed >= this.fadeFrames) {
      this.volumeValue = this.fadeTarget;
      this.fadeFrames = 0;
    }
  }
}
