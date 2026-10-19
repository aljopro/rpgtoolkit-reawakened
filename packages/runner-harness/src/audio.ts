import type { AudioCue } from "@tk-reawakened/core";

export interface AudioSink {
  handle(cue: AudioCue): void;
}

export type NullAudio = AudioSink & {
  readonly cues: readonly AudioCue[];
};

/** The null audio sink: records every cue in order and makes no sound (docs/spec/engine/audio-media.md#audio-headless). */
export function createNullAudio(): NullAudio {
  const recordedCues: AudioCue[] = [];

  return {
    handle(cue: AudioCue): void {
      switch (cue.kind) {
        case "media.load":
        case "media.play":
        case "media.stop":
        case "media.pause":
        case "media.resume":
        case "media.seek":
        case "media.volume":
        case "media.fade":
        case "media.flags":
        case "soundfont.set":
          recordedCues.push(cue);
          break;
        default: {
          const _never: never = cue.kind;
          throw new TypeError(`createNullAudio: unknown audio cue kind ${_never as string}`);
        }
      }
    },
    get cues(): readonly AudioCue[] {
      return recordedCues;
    },
  };
}
