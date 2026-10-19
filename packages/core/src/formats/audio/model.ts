/**
 * The audio metadata model and the helpers the WAV and MIDI decoders share
 * (docs/spec/engine/audio-media.md#audio-info-seam,
 * docs/spec/engine/audio-media.md#audio-wav-midi-length).
 *
 * Core never decodes sound: it learns how long a file is and whether it needs
 * an instrument bank, because the end tick of a track depends on the length. A
 * decoder produces one `AudioInfo` from the file's bytes and nothing else, so
 * the record is plain data (G1, AD-7) with every key present and `null` for
 * "not applicable or unknown" (AD-14).
 */

import type { AssertPlainData } from "../../ports/plain-data.ts";
import { err, type Result } from "../result.ts";

/** The decoder id of the built-in WAV decoder; reserved for the built-ins (S1). */
export const AUDIO_WAV_ID = "audio.wav";

/** The decoder id of the built-in Standard MIDI File decoder; reserved for the built-ins (S1). */
export const AUDIO_MIDI_ID = "audio.midi";

/** The specification section both decoders implement (G7). */
export const AUDIO_SECTION = "docs/spec/engine/audio-media.md#audio-wav-midi-length";

/** The record contract, for errors about the shape rather than about a length rule. */
export const AUDIO_INFO_SECTION = "docs/spec/engine/audio-media.md#audio-info-seam";

/** The bank dialect a MIDI file's system-exclusive data points at (F5). */
export type AudioBankDialect = "gm" | "gs" | "xg";

/**
 * The instrument bank a file needs (F5): a pure byte scan that informs editors,
 * prefetch and diagnostics and never changes playback.
 */
export type AudioBank = {
  /** The bank kind a source must have; `"soundfont"` for MIDI. */
  readonly kind: string;
  /** `"xg"` when XG system-exclusive data is found, else `"gs"` for GS data, else `"gm"`. */
  readonly dialect: AudioBankDialect;
  /** True when a non-zero bank-select controller (CC0 or CC32) is found. */
  readonly bankSelect: boolean;
};

/**
 * What a core decoder knows about one audio file
 * (docs/spec/engine/audio-media.md#audio-info-seam).
 */
export type AudioInfo = {
  /** The decoder id: `"audio.wav"`, `"audio.midi"` or a pack's id. */
  readonly format: string;
  /** The exact length in 60 Hz ticks (`max(1, round-half-up)`), or `null` when unknown. */
  readonly lengthTicks: number | null;
  /** Sample frames per second, or `null` for a format without a sample rate (MIDI). */
  readonly sampleRateHz: number | null;
  /** 1 or 2, or `null` for a format without channels (MIDI). */
  readonly channels: number | null;
  /** The bank the file needs, or `null` for a format that needs none (WAV). */
  readonly bank: AudioBank | null;
};

/** Compile-time proof that `AudioInfo` is plain data (G1, AD-7). */
export type AudioInfoIsPlainData = AssertPlainData<AudioInfo>;

/** Where a decoder failed: a byte offset and a message; the section is the decoder's own. */
export function audioError<T>(offset: number, message: string): Result<T> {
  return err({ offset, section: AUDIO_SECTION, message });
}

/**
 * `floor(numerator / denominator)` for non-negative integers below 2^53,
 * exactly. The remainder form never relies on a rounded quotient, so a
 * quotient just under an integer cannot round up to it (G3: whole-number
 * arithmetic only).
 */
export function floorDiv(numerator: number, denominator: number): number {
  return (numerator - (numerator % denominator)) / denominator;
}
