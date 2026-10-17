import type { AudioCue } from "@tk-reawakened/core";

export interface AudioSink {
  handle(cue: AudioCue): void;
}

export type NullAudio = AudioSink & {
  readonly cues: readonly AudioCue[];
};

export function createNullAudio(): NullAudio {
  const recordedCues: AudioCue[] = [];

  return {
    handle(cue: AudioCue): void {
      switch (cue.kind) {
        case "music.play":
        case "music.stop":
        case "music.pause":
        case "music.resume":
        case "sfx.play":
        case "sfx.stop":
        case "volume.set":
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
