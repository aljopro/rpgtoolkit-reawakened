import { deepEqual, throws } from "node:assert/strict";
import { test } from "node:test";
import type { AudioCue, AudioCueKind } from "@rpgtoolkit/core";
import { createNullAudio } from "../src/audio.ts";

test("createNullAudio records all valid audio cue kinds in order", () => {
  const audio = createNullAudio();

  const sampleCues: Record<AudioCueKind, AudioCue> = {
    "music.play": { cueId: 1, kind: "music.play", asset: "bgm/intro" as never, loop: true, volume: null },
    "music.stop": { cueId: 2, kind: "music.stop", asset: null, loop: null, volume: null },
    "music.pause": { cueId: 3, kind: "music.pause", asset: null, loop: null, volume: null },
    "music.resume": { cueId: 4, kind: "music.resume", asset: null, loop: null, volume: null },
    "sfx.play": { cueId: 5, kind: "sfx.play", asset: "sfx/click" as never, loop: null, volume: null },
    "sfx.stop": { cueId: 6, kind: "sfx.stop", asset: null, loop: null, volume: null },
    "volume.set": { cueId: 7, kind: "volume.set", asset: null, loop: null, volume: 80 },
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
