// The audio oracle scenes of ticket 6.4 through the real core audio runtime (ticket 6.6;
// docs/spec/engine/audio-media.md#audio-core-pins): every case's per-tick track states, cues (every key, ids
// included), settings, script bank and facts equal the independent reference timeline's, tick by tick. The `music`
// virtual variable is read at every tick too: it shows the music track's file, kept by a stop (Q19).
import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import { createDefaultVirtuals } from "../src/script/virtuals.ts";
import { loadScene, runCase } from "./audio-oracle.ts";

const SCENES = [
  "board-music-boot",
  "animation-frame-sfx",
  "track-transport",
  "loop-and-end-ticks",
  "same-file-rules",
  "settings-versus-save",
  "soundfont-setting",
  "battle-music-handoff",
  "voices-and-stealing",
  "fades",
  "synced-start",
  "late-start-catch-up",
];

for (const name of SCENES) {
  const scene = loadScene(name);
  equal(scene.scene, name);
  for (const sceneCase of scene.cases) {
    test(`${name}: ${sceneCase.name}`, () => {
      const run = runCase(sceneCase, {
        afterTick: (tick, row, live) => {
          const music = (row.tr as readonly (readonly unknown[])[]).find((track) => track[0] === "music");
          equal(createDefaultVirtuals(live.state).read("music"), music === undefined ? "" : music[3] ?? "", `${name}/${sceneCase.name} tick ${tick}: the music virtual`);
        },
      });
      equal(run.rows.length, sceneCase.expect.length, "one row per tick");
      for (const [tick, row] of run.rows.entries()) deepEqual(row, sceneCase.expect[tick], `${name}/${sceneCase.name} tick ${tick}`);
      deepEqual({ cueId: run.state.audio.cueId, soundFont: run.state.audio.soundFont, master: run.state.audio.settings.masterVolume }, sceneCase.end);
    });
  }
}
