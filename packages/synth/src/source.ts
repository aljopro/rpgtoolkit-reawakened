/**
 * The `AudioSource` seam and its ordered registry
 * (docs/spec/engine/audio-media.md#audio-source-seam, AD-31 practice).
 *
 * MIDI and PCM are ordinary sources on this seam; a third-party pack registers
 * the same way and needs no change in `core`.
 */
import { err } from "@tk-reawakened/core";
import type { Result } from "@tk-reawakened/core";
import type { AudioErrorCode, BankRef } from "./protocol.ts";

/** A failed open: a closed code plus free text for people. Never thrown. */
export interface SourceError {
  readonly code: AudioErrorCode;
  readonly detail: string;
}

/** What a source gets when it opens bytes. */
export interface SourceEnv {
  readonly outputRateHz: number;
  /** The current bank of the source's bank kind, or `null` for none. */
  readonly bank: BankRef | null;
}

/**
 * One decoded sound. It does what the voice state machine says: the machine
 * calls these only in legal states, so a voice keeps no message queue. `render`
 * writes `frames` stereo samples (zeros while not playing) with the voice's own
 * volume and fade applied, and advances the voice's clock by the playing frames.
 */
export interface SourceVoice {
  /** Equal to the core `AudioInfo.lengthTicks` of the same bytes, or `null`. */
  readonly lengthTicks: number | null;
  /** True once a finite, non-looping voice has reached its natural end. */
  readonly ended: boolean;
  start(positionTicks: number, loop: boolean): void;
  stop(): void;
  pause(): void;
  resume(): void;
  seek(positionTicks: number): void;
  setLoop(loop: boolean): void;
  /** Script volume 0-100. */
  setVolume(volume: number): void;
  /** Linear ramp in the voice's own playing ticks; 0 duration is an immediate set. */
  fade(fromVolume: number, targetVolume: number, durationTicks: number): void;
  render(left: Float32Array, right: Float32Array, frames: number): void;
}

/** A pluggable audio format on the runner side. `id` equals its core decoder's. */
export interface AudioSource {
  readonly id: string;
  readonly extensions: readonly string[];
  /** Pure test of the file's first bytes. */
  detect(header: Uint8Array): boolean;
  /** The bank kind this source needs (`"soundfont"` for MIDI), or `null`. */
  readonly bank: string | null;
  /** Never throws. */
  open(bytes: Uint8Array, env: SourceEnv): Result<SourceVoice, SourceError>;
}

/** An ordered set of sources, dispatched by `detect` first and extension second. */
export interface AudioSourceRegistry {
  readonly sources: readonly AudioSource[];
  /** Throws on a duplicate id, as AD-8 and AD-9 registrations do. */
  register(source: AudioSource): void;
  /** The source for `bytes`: `detect` decides; the extension only orders ties. */
  find(bytes: Uint8Array, extension?: string | null): AudioSource | null;
  /**
   * Finds a source and opens `bytes`. An unknown format is `format.unsupported`,
   * and a source that needs a bank when none is set is `bank.missing`; callers
   * turn either into a diagnostic plus silence.
   */
  open(
    bytes: Uint8Array,
    env: (source: AudioSource) => SourceEnv,
    extension?: string | null,
  ): Result<SourceVoice, SourceError>;
}

/** A successful open; `ok` from core fixes the error type to `FormatError`. */
export function opened<T>(value: T): Result<T, SourceError> {
  return { ok: true, value, warnings: [] };
}

const DETECT_WINDOW = 64;

export function createAudioSourceRegistry(
  initial: readonly AudioSource[] = [],
): AudioSourceRegistry {
  const sources: AudioSource[] = [];
  const registry: AudioSourceRegistry = {
    sources,
    register(source) {
      if (sources.some((existing) => existing.id === source.id)) {
        throw new Error(`audio source "${source.id}" is already registered`);
      }
      sources.push(source);
    },
    find(bytes, extension = null) {
      const header = bytes.subarray(0, DETECT_WINDOW);
      const ext = extension === null ? null : extension.toLowerCase();
      let first: AudioSource | null = null;
      for (const source of sources) {
        if (!source.detect(header)) continue;
        if (ext !== null && source.extensions.includes(ext)) return source;
        first ??= source;
      }
      return first;
    },
    open(bytes, env, extension = null) {
      const source = registry.find(bytes, extension);
      if (source === null) {
        return err<SourceVoice, SourceError>({
          code: "format.unsupported",
          detail: "no registered audio source recognises these bytes",
        });
      }
      const sourceEnv = env(source);
      if (source.bank !== null && sourceEnv.bank === null) {
        return err<SourceVoice, SourceError>({
          code: "bank.missing",
          detail: `source "${source.id}" needs a "${source.bank}" bank and none is set`,
        });
      }
      try {
        return source.open(bytes, sourceEnv);
      } catch (error) {
        return err<SourceVoice, SourceError>({
          code: "source.failed",
          detail: `source "${source.id}" threw: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    },
  };
  for (const source of initial) registry.register(source);
  return registry;
}
