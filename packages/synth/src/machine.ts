/**
 * The runner-side voice state machine
 * (docs/spec/engine/audio-media.md#voice-state-machine).
 *
 * It owns the seven voice states, turns `AudioMessage`s into `AudioEvent`s and
 * drives a `SourceVoice` per voice. A failure is a diagnostic event and silence,
 * never a throw. Bus and master volume and fades are forwarded to an optional
 * `BusControl`; the mixer itself is entry 6.12's.
 */
import type {
  AudioErrorCode,
  AudioEvent,
  AudioMessage,
  BankRef,
  VoiceState,
} from "./protocol.ts";
import type { AudioSourceRegistry, SourceVoice } from "./source.ts";

/** Receives bus and master volume messages (`bus` is `null` for master). */
export interface BusControl {
  setVolume(bus: string | null, volume: number): void;
  fade(bus: string | null, fromVolume: number, targetVolume: number, durationTicks: number): void;
}

export interface VoiceMachineOptions {
  readonly outputRateHz: number;
  readonly mixer?: BusControl;
}

interface VoiceEntry {
  state: VoiceState;
  voice: SourceVoice | null;
  readonly track: string;
  cue: number | null;
}

function extensionOf(asset: string): string | null {
  const dot = asset.lastIndexOf(".");
  return dot < 0 ? null : asset.slice(dot + 1).toLowerCase();
}

export class VoiceMachine {
  private readonly registry: AudioSourceRegistry;
  private readonly options: VoiceMachineOptions;
  private readonly voices = new Map<number, VoiceEntry>();
  private readonly banks = new Map<string, BankRef | null>();
  private left = new Float32Array(0);
  private right = new Float32Array(0);

  constructor(registry: AudioSourceRegistry, options: VoiceMachineOptions) {
    this.registry = registry;
    this.options = options;
  }

  /** The state of a voice; `undefined` for an id that was never loaded. */
  stateOf(voice: number): VoiceState | undefined {
    return this.voices.get(voice)?.state;
  }

  /** The bank currently selected for a bank kind. */
  bankOf(bankKind: string): BankRef | null {
    return this.banks.get(bankKind) ?? null;
  }

  /** Applies one message and returns the events it caused, in order. */
  handle(message: AudioMessage): AudioEvent[] {
    switch (message.kind) {
      case "setBank":
        return this.setBank(message.bankKind, message.bank);
      case "setVolume":
        return message.scope === "voice"
          ? this.onLive(message.voice, (e, v) => {
              if (this.live(e)) v.setVolume(message.volume);
              return [];
            })
          : this.forwardBus(message.scope, message.bus, (bus) =>
              this.options.mixer?.setVolume(bus, message.volume),
            );
      case "fade":
        if (message.scope === "master") {
          return [this.diagnostic(null, null, "protocol.state", "master has no fade")];
        }
        return message.scope === "voice"
          ? this.onLive(message.voice, (e, v) => {
              if (this.live(e)) {
                v.fade(message.fromVolume, message.targetVolume, message.durationTicks);
              }
              return [];
            })
          : this.forwardBus(message.scope, message.bus, (bus) =>
              this.options.mixer?.fade(bus, message.fromVolume, message.targetVolume, message.durationTicks),
            );
      case "load":
        return this.load(message.voice, message.track, message.asset, message.data);
      default:
        return this.voiceMessage(message);
    }
  }

  /**
   * Renders `frames` stereo frames of every playing voice, summed, into `left`
   * and `right` (zeros if nothing plays), and returns an `ended` event for each
   * voice that reached its natural end.
   */
  render(left: Float32Array, right: Float32Array, frames: number): AudioEvent[] {
    left.fill(0, 0, frames);
    right.fill(0, 0, frames);
    if (this.left.length < frames) {
      this.left = new Float32Array(frames);
      this.right = new Float32Array(frames);
    }
    const events: AudioEvent[] = [];
    for (const [id, entry] of this.voices) {
      if (entry.state !== "playing" || entry.voice === null) continue;
      entry.voice.render(this.left, this.right, frames);
      for (let i = 0; i < frames; i++) {
        left[i] = (left[i] ?? 0) + (this.left[i] ?? 0);
        right[i] = (right[i] ?? 0) + (this.right[i] ?? 0);
      }
      if (entry.voice.ended) events.push(this.finish(id, entry));
    }
    return events;
  }

  private live(entry: VoiceEntry): boolean {
    return entry.state === "ready" || entry.state === "playing" || entry.state === "paused";
  }

  private diagnostic(
    voice: number | null,
    cue: number | null,
    code: AudioErrorCode,
    detail: string,
  ): AudioEvent {
    return { kind: "error", voice, cue, code, detail };
  }

  private setBank(bankKind: string, bank: BankRef | null): AudioEvent[] {
    if (bankKind !== "soundfont") {
      return [this.diagnostic(null, null, "protocol.state", `unknown bank kind "${bankKind}"`)];
    }
    this.banks.set(bankKind, bank);
    return [];
  }

  private forwardBus(
    scope: "bus" | "master",
    bus: string | null,
    apply: (bus: string | null) => void,
  ): AudioEvent[] {
    if (scope === "bus" && bus === null) {
      return [this.diagnostic(null, null, "protocol.state", "bus scope needs a bus name")];
    }
    apply(scope === "master" ? null : bus);
    return [];
  }

  private onLive(
    voice: number | null,
    apply: (entry: VoiceEntry, voice: SourceVoice) => AudioEvent[],
  ): AudioEvent[] {
    const entry = voice === null ? undefined : this.voices.get(voice);
    if (entry === undefined || entry.voice === null || !this.live(entry)) return [];
    return apply(entry, entry.voice);
  }

  private load(voice: number, track: string, asset: string, data: Uint8Array): AudioEvent[] {
    if (this.voices.has(voice)) {
      return [this.diagnostic(voice, null, "protocol.state", "voice id already used")];
    }
    const entry: VoiceEntry = { state: "loading", voice: null, track, cue: null };
    this.voices.set(voice, entry);
    const opened = this.registry.open(
      data,
      (source) => ({
        outputRateHz: this.options.outputRateHz,
        bank: source.bank === null ? null : this.bankOf(source.bank),
      }),
      extensionOf(asset),
    );
    if (!opened.ok) {
      entry.state = "failed";
      return [this.diagnostic(voice, null, opened.error.code, `${asset}: ${opened.error.detail}`)];
    }
    entry.voice = opened.value;
    entry.state = "ready";
    return [{ kind: "ready", voice, lengthTicks: opened.value.lengthTicks }];
  }

  private finish(id: number, entry: VoiceEntry): AudioEvent {
    entry.state = "ended";
    entry.voice = null;
    return { kind: "ended", voice: id, cue: entry.cue ?? 0 };
  }

  private voiceMessage(
    message: Exclude<AudioMessage, { kind: "load" | "setBank" | "setVolume" | "fade" }>,
  ): AudioEvent[] {
    const entry = this.voices.get(message.voice);
    // Terminal states and unknown ids ignore everything, silently.
    if (entry === undefined || !(entry.state === "loading" || this.live(entry))) return [];
    const voice = entry.voice;
    const reject = (): AudioEvent[] => [
      this.diagnostic(message.voice, entry.cue, "protocol.state", `${message.kind} is not legal while ${entry.state}`),
    ];
    if (message.kind === "stop") {
      voice?.stop();
      entry.state = "stopped";
      entry.voice = null;
      return [];
    }
    if (voice === null) return reject();
    switch (message.kind) {
      case "play":
        if (entry.state !== "ready") return reject();
        entry.cue = message.cue;
        voice.setVolume(message.volume);
        voice.start(message.positionTicks, message.loop);
        entry.state = "playing";
        return voice.ended ? [this.finish(message.voice, entry)] : [];
      case "pause":
        if (entry.state !== "playing") return reject();
        voice.pause();
        entry.state = "paused";
        return [];
      case "resume":
        if (entry.state !== "paused") return reject();
        voice.resume();
        entry.state = "playing";
        return [];
      case "seek":
        if (entry.state !== "playing" && entry.state !== "paused") return reject();
        voice.seek(message.positionTicks);
        return voice.ended ? [this.finish(message.voice, entry)] : [];
      case "setLoop":
        if (!this.live(entry)) return reject();
        voice.setLoop(message.loop);
        return [];
    }
  }
}
