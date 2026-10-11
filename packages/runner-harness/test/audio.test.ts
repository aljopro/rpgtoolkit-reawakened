import { deepEqual, throws } from "node:assert/strict";
import { test } from "node:test";
import type { AudioCue, AudioCueKind } from "@rpgtoolkit/core";
import { createNullAudio } from "../src/audio.ts";

test("createNullAudio records all valid audio cue kinds in order", () => {
  const audio = createNullAudio();

  const sampleCues: Record<AudioCueKind, AudioCue> = {
    "music.play": { cueId: 1, kind: "music.play", asset: "bgm/intro" as never, loop: true },
    "music.stop": { cueId: 2, kind: "music.stop" },
    "music.pause": { cueId: 3, kind: "music.pause" },
    "music.resume": { cueId: 4, kind: "music.resume" },
    "sfx.play": { cueId: 5, kind: "sfx.play", asset: "sfx/click" as never },
    "sfx.stop": { cueId: 6, kind: "sfx.stop" },
    "volume.set": { cueId: 7, kind: "volume.set", volume: 80 },
  };

  const cueList = Object.values(sampleCues);
  for (const cue of cueList) {
    audio.handle(cue);
  }

  deepEqual(audio.cues, cueList);
});

test("createNullAudio throws TypeError on unknown cue kind", () => {
  const audio = createNullAudio();
  const unknownCue = { cueId: 8, kind: "unknown.kind" } as unknown as AudioCue;

  throws(
    () => audio.handle(unknownCue),
    (err: unknown) => {
      return (
        err instanceof TypeError &&
        err.message.includes("unknown audio cue kind unknown.kind")
      );
    },
  );
});
