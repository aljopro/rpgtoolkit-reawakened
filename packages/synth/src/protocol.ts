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

export const AUDIO_MESSAGE_SHAPES = {
  load: { kind: "load", voice: "positiveInteger", track: "track", asset: "asset", data: "bytes" },
  play: { kind: "play", voice: "positiveInteger", cue: "positiveInteger", loop: "boolean", volume: "volume", positionTicks: "nonNegativeInteger" },
  pause: { kind: "pause", voice: "positiveInteger" },
  resume: { kind: "resume", voice: "positiveInteger" },
  stop: { kind: "stop", voice: "positiveInteger" },
  seek: { kind: "seek", voice: "positiveInteger", positionTicks: "nonNegativeInteger" },
  setLoop: { kind: "setLoop", voice: "positiveInteger", loop: "boolean" },
  setVolume: { kind: "setVolume", scope: "scope", voice: "nullablePositiveInteger", bus: "nullableTrack", volume: "volume" },
  fade: { kind: "fade", scope: "scope", voice: "nullablePositiveInteger", bus: "nullableTrack", fromVolume: "volume", targetVolume: "volume", durationTicks: "nonNegativeInteger" },
  setBank: { kind: "setBank", bankKind: "bankKind", bank: "nullableBank" },
} as const;

export const AUDIO_EVENT_SHAPES = {
  ready: { kind: "ready", voice: "positiveInteger", lengthTicks: "nullableNonNegativeInteger" },
  ended: { kind: "ended", voice: "positiveInteger", cue: "positiveInteger" },
  error: { kind: "error", voice: "nullablePositiveInteger", cue: "nullablePositiveInteger", code: "errorCode", detail: "string" },
} as const;

export const AUDIO_VOICE_STATES = [
  "loading",
  "ready",
  "playing",
  "paused",
  "ended",
  "stopped",
  "failed",
] as const;

type FieldValue<F> =
  F extends "load" ? "load" :
  F extends "play" ? "play" :
  F extends "pause" ? "pause" :
  F extends "resume" ? "resume" :
  F extends "stop" ? "stop" :
  F extends "seek" ? "seek" :
  F extends "setLoop" ? "setLoop" :
  F extends "setVolume" ? "setVolume" :
  F extends "fade" ? "fade" :
  F extends "setBank" ? "setBank" :
  F extends "ready" ? "ready" :
  F extends "ended" ? "ended" :
  F extends "error" ? "error" :
  F extends "positiveInteger" ? number :
  F extends "nullablePositiveInteger" ? number | null :
  F extends "nonNegativeInteger" ? number :
  F extends "nullableNonNegativeInteger" ? number | null :
  F extends "boolean" ? boolean :
  F extends "track" ? string :
  F extends "nullableTrack" ? string | null :
  F extends "asset" ? AssetKey :
  F extends "bytes" ? Uint8Array :
  F extends "volume" ? number :
  F extends "scope" ? VolumeScope :
  F extends "bankKind" ? string :
  F extends "nullableBank" ? BankRef | null :
  F extends "errorCode" ? AudioErrorCode :
  F extends "string" ? string :
  never;

type ShapeRecord<S extends Record<string, string>> = {
  readonly [K in keyof S]: FieldValue<S[K]>;
};
type Same<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;
type Must<T extends true> = T;

type _LoadShape = Must<Same<LoadMessage, ShapeRecord<typeof AUDIO_MESSAGE_SHAPES.load>>>;
type _PlayShape = Must<Same<PlayMessage, ShapeRecord<typeof AUDIO_MESSAGE_SHAPES.play>>>;
type _PauseShape = Must<Same<PauseMessage, ShapeRecord<typeof AUDIO_MESSAGE_SHAPES.pause>>>;
type _ResumeShape = Must<Same<ResumeMessage, ShapeRecord<typeof AUDIO_MESSAGE_SHAPES.resume>>>;
type _StopShape = Must<Same<StopMessage, ShapeRecord<typeof AUDIO_MESSAGE_SHAPES.stop>>>;
type _SeekShape = Must<Same<SeekMessage, ShapeRecord<typeof AUDIO_MESSAGE_SHAPES.seek>>>;
type _SetLoopShape = Must<Same<SetLoopMessage, ShapeRecord<typeof AUDIO_MESSAGE_SHAPES.setLoop>>>;
type _SetVolumeShape = Must<Same<SetVolumeMessage, ShapeRecord<typeof AUDIO_MESSAGE_SHAPES.setVolume>>>;
type _FadeShape = Must<Same<FadeMessage, ShapeRecord<typeof AUDIO_MESSAGE_SHAPES.fade>>>;
type _SetBankShape = Must<Same<SetBankMessage, ShapeRecord<typeof AUDIO_MESSAGE_SHAPES.setBank>>>;
type _ReadyShape = Must<Same<ReadyEvent, ShapeRecord<typeof AUDIO_EVENT_SHAPES.ready>>>;
type _EndedShape = Must<Same<EndedEvent, ShapeRecord<typeof AUDIO_EVENT_SHAPES.ended>>>;
type _ErrorShape = Must<Same<ErrorEvent, ShapeRecord<typeof AUDIO_EVENT_SHAPES.error>>>;

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

type _VoiceStateShape = Must<Same<VoiceState, typeof AUDIO_VOICE_STATES[number]>>;
