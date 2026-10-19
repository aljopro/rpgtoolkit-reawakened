import { deepEqual, throws } from "node:assert/strict";
import { test } from "node:test";
import type { AudioCue, AudioCueKind } from "@tk-reawakened/core";
import { createNullAudio } from "../src/audio.ts";

/** A cue with every key present; fields a kind does not use are `null` (AD-16). */
function cue(cueId: number, kind: AudioCueKind, fields: Partial<Omit<AudioCue, "cueId" | "kind">> = {}): AudioCue {
  return {
    cueId,
    tick: 0,
    kind,
    track: null,
    voice: null,
    asset: null,
    loop: null,
    flags: null,
    positionTicks: null,
    volume: null,
    targetVolume: null,
    durationTicks: null,
    ...fields,
  };
}

test("createNullAudio records all valid audio cue kinds in order", () => {
  const audio = createNullAudio();

  const sampleCues: Record<AudioCueKind, AudioCue> = {
    "media.load": cue(1, "media.load", { track: "music", asset: "media/intro.mid" as never }),
    "media.play": cue(2, "media.play", { track: "music", voice: 0, asset: "media/intro.mid" as never, loop: true, flags: 1, positionTicks: 0, volume: 100 }),
    "media.stop": cue(3, "media.stop", { track: "music", voice: 0 }),
    "media.pause": cue(4, "media.pause", { track: "music", voice: 0 }),
    "media.resume": cue(5, "media.resume", { track: "music", voice: 0 }),
    "media.seek": cue(6, "media.seek", { track: "music", voice: 0, positionTicks: 15 }),
    "media.volume": cue(7, "media.volume", { volume: 80 }),
    "media.fade": cue(8, "media.fade", { track: "music", volume: 100, targetVolume: 30, durationTicks: 30 }),
    "media.flags": cue(9, "media.flags", { track: "music", voice: 0, loop: false, flags: 0 }),
    "soundfont.set": cue(10, "soundfont.set", { asset: "media/town.sf2" as never }),
  };

  const cueList = Object.values(sampleCues);
  for (const item of cueList) {
    audio.handle(item);
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
