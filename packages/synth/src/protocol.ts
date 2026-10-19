/**
 * Runner audio protocol v1 (docs/spec/engine/audio-media.md#runner-audio-protocol).
 *
 * Plain data only: every record has exactly the keys shown and a field with no
 * value is `null`, never omitted (AD-14). Time is whole 60 Hz core ticks.
 */
import type { AssetKey } from "@tk-reawakened/core";

/** A bank of a kind a source needs (docs/spec/engine/audio-media.md#soundfont-layers). */
export interface BankRef {
  readonly source: "bundled" | "game" | "cdn" | "user";
  readonly id: string;
  /** Lower-case hex, or `null` until the runner has hashed the bank. */
  readonly sha256: string | null;
}

/** The closed set of `error` codes. */
export type AudioErrorCode =
  | "format.unsupported"
  | "format.malformed"
  | "bank.missing"
  | "bank.invalid"
  | "bank.unavailable"
  | "source.failed"
  | "output.unavailable"
  | "protocol.state";

export type VolumeScope = "voice" | "bus" | "master";

export interface LoadMessage {
  readonly kind: "load";
  readonly voice: number;
  readonly track: string;
  readonly asset: AssetKey;
  readonly data: Uint8Array;
}
export interface PlayMessage {
  readonly kind: "play";
  readonly voice: number;
  readonly cue: number;
  readonly loop: boolean;
  readonly volume: number;
  readonly positionTicks: number;
}
export interface PauseMessage {
  readonly kind: "pause";
  readonly voice: number;
}
export interface ResumeMessage {
  readonly kind: "resume";
  readonly voice: number;
}
export interface StopMessage {
  readonly kind: "stop";
  readonly voice: number;
}
export interface SeekMessage {
  readonly kind: "seek";
  readonly voice: number;
  readonly positionTicks: number;
}
export interface SetLoopMessage {
  readonly kind: "setLoop";
  readonly voice: number;
  readonly loop: boolean;
}
export interface SetVolumeMessage {
  readonly kind: "setVolume";
  readonly scope: VolumeScope;
  readonly voice: number | null;
  readonly bus: string | null;
  readonly volume: number;
}
export interface FadeMessage {
  readonly kind: "fade";
  readonly scope: VolumeScope;
  readonly voice: number | null;
  readonly bus: string | null;
  readonly fromVolume: number;
  readonly targetVolume: number;
  readonly durationTicks: number;
}
export interface SetBankMessage {
  readonly kind: "setBank";
  readonly bankKind: string;
  readonly bank: BankRef | null;
}

export type AudioMessage =
  | LoadMessage
  | PlayMessage
  | PauseMessage
  | ResumeMessage
  | StopMessage
  | SeekMessage
  | SetLoopMessage
  | SetVolumeMessage
  | FadeMessage
  | SetBankMessage;

export interface ReadyEvent {
  readonly kind: "ready";
  readonly voice: number;
  readonly lengthTicks: number | null;
}
export interface EndedEvent {
  readonly kind: "ended";
  readonly voice: number;
  readonly cue: number;
}
export interface ErrorEvent {
  readonly kind: "error";
  readonly voice: number | null;
  readonly cue: number | null;
  readonly code: AudioErrorCode;
  /** Free text for people; never compared. */
  readonly detail: string;
}

export type AudioEvent = ReadyEvent | EndedEvent | ErrorEvent;

/** The seven voice states; the last three are terminal. */
export type VoiceState =
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "ended"
  | "stopped"
  | "failed";
