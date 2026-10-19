// Snapshots, saves and the state hash for the audio section (ticket 6.6;
// docs/spec/engine/audio-media.md#audio-core-pins items 7 to 9): a snapshot restored mid-track re-emits
// `soundfont.set` and then plays on exactly as a run that never stopped, the script volume settings travel in a
// snapshot but never in the hash or a game save, and `reset()` and a game load leave the settings alone.
import { test } from "node:test";
import { deepEqual, equal, ok } from "node:assert/strict";
import { hashState } from "../src/canon/index.ts";
import { createAudioSection, audioSaveProjection } from "../src/audio/index.ts";
import { createGameState, hashGameState, restoreGameState, snapshot, type GameState } from "../src/save/index.ts";
import { loadScene, runCase, type Row, type SceneRun } from "./audio-oracle.ts";

type Restart = { readonly scene: string; readonly name: string; readonly at: number };

/** Cases with something playing, paused, waiting, queued or set at the restart tick. */
const RESTARTS: readonly Restart[] = [
  { scene: "track-transport", name: "play-pause-resume-stop", at: 4 },
  { scene: "track-transport", name: "play-pause-resume-stop", at: 8 },
  { scene: "track-transport", name: "seek-clamps-wraps-and-rounds", at: 5 },
  { scene: "loop-and-end-ticks", name: "loop-pass-boundaries", at: 10 },
  { scene: "loop-and-end-ticks", name: "end-ticks-from-authored-files", at: 4 },
  { scene: "same-file-rules", name: "sfx-same-file-ignored-and-replaced", at: 4 },
  { scene: "animation-frame-sfx", name: "two-sfx-voices-when-the-author-raises-the-count", at: 2 },
  { scene: "settings-versus-save", name: "save-and-load-restore-playback-not-settings", at: 5 },
  { scene: "settings-versus-save", name: "save-and-load-restore-playback-not-settings", at: 14 },
  { scene: "soundfont-setting", name: "load-reemits-the-saved-bank-first", at: 5 },
  { scene: "battle-music-handoff", name: "battle-music-then-return", at: 8 },
  { scene: "fades", name: "linear-half-up", at: 4 },
  { scene: "media-wait-suspend", name: "wait-wakes-on-the-end-tick", at: 6 },
];

/** A row with the cue ids removed: ids move by the cues a restart emits, nothing else may. */
function withoutIds(row: Row | undefined): unknown {
  if (row === undefined) return undefined;
  const copy = JSON.parse(JSON.stringify(row)) as { cues?: { cueId?: number }[]; tr?: unknown[][][][]; ev?: { cueId?: number }[] };
  for (const cue of copy.cues ?? []) delete cue.cueId;
  for (const fact of copy.ev ?? []) delete fact.cueId;
  for (const track of copy.tr ?? []) for (const voice of (track as unknown[])[6] as unknown[][]) voice[2] = 0;
  return copy;
}

/** The state hash with every cue id, the one thing a restart's extra cue moves, set to zero. */
function hashWithoutIds(state: GameState): string {
  const audio = JSON.parse(JSON.stringify(state.audio)) as GameState["audio"];
  audio.cueId = 0;
  for (const track of audio.tracks) for (const voice of track.voices) voice.cueId = 0;
  return hashGameState({ ...state, audio });
}

function restart(sceneName: string, caseName: string, at: number, via: "memory" | "snapshot"): { readonly base: SceneRun; readonly run: SceneRun } {
  const sceneCase = loadScene(sceneName).cases.find((candidate) => candidate.name === caseName);
  if (sceneCase === undefined) throw new Error(`no case ${caseName} in ${sceneName}`);
  return { base: runCase(sceneCase), run: runCase(sceneCase, { restart: { at, via } }) };
}

for (const { scene, name, at } of RESTARTS) {
  test(`${scene}/${name}: a snapshot restored at tick ${at} re-emits soundfont.set and plays on as an uninterrupted run`, () => {
    const memory = restart(scene, name, at, "memory");
    const restored = restart(scene, name, at, "snapshot");
    const { base, run } = restored;

    // The restart is an engine start: its first cue is the bank, with the effective bank in `asset` (A3).
    const first = run.rows[at]?.cues as readonly { kind: string; asset: string | null }[] | undefined;
    equal(first?.[0]?.kind, "soundfont.set", "the restart tick's first cue");
    const effectiveBank = (base.rows[at - 1]?.sf as string | undefined) ?? loadScene(scene).cases.find((candidate) => candidate.name === name)?.setup.defaultSoundFont ?? null;
    equal(first?.[0]?.asset, effectiveBank, "the bank in force before the restart");

    // Restoring through a snapshot loses nothing: every row and the final hash equal the in-memory restart's.
    deepEqual(run.rows, memory.run.rows);
    equal(hashGameState(run.state), hashGameState(memory.run.state));
    deepEqual(run.state.audio.settings, memory.run.state.audio.settings);
    deepEqual(run.state.audio.settings, base.state.audio.settings, "the settings come through untouched");

    // Later cues and rows equal the uninterrupted run's; only the one cue id the restart consumed moves.
    equal(run.state.audio.cueId, base.state.audio.cueId + 1, "the restart consumed exactly one id, the bank cue");
    for (let tick = 0; tick < base.rows.length; tick += 1) {
      const row = run.rows[tick];
      if (tick === at && row !== undefined) {
        const trimmed = { ...row, cues: (row.cues as unknown[]).slice(1) };
        if (trimmed.cues.length === 0) delete (trimmed as { cues?: unknown }).cues;
        deepEqual(withoutIds(trimmed), withoutIds(base.rows[tick]), `tick ${tick}`);
      } else deepEqual(withoutIds(row), withoutIds(base.rows[tick]), `tick ${tick}`);
    }
    equal(hashWithoutIds(run.state), hashWithoutIds(base.state), "equal state hash apart from the cue ids");
  });
}

test("a restored snapshot's later cue ids continue from the counter, and a voice's own id still names it", () => {
  const sceneCase = loadScene("loop-and-end-ticks").cases.find((candidate) => candidate.name === "loop-pass-boundaries");
  if (sceneCase === undefined) throw new Error("no such case");
  const run = runCase(sceneCase, { restart: { at: 10, via: "snapshot" } });
  // The loop voice started at tick 3 as cue 2; the restart's bank cue is 3 and the parked waits (made from cue 2) still wake.
  const wakes = run.rows.flatMap((row) => (row.ev as { e: string; cueId?: number }[] | undefined) ?? []).filter((fact) => fact.e === "wake");
  deepEqual(wakes.map((fact) => fact.cueId), [2, 2]);
  equal((run.rows[10]?.cues as { cueId: number }[])[0]?.cueId, 3);
});

test("the state hash never sees the script volume settings, and a snapshot always carries them", () => {
  const plain = createGameState({ seed: 3 });
  const loud = createGameState({ seed: 3 });
  loud.audio.settings.masterVolume = 30;
  loud.audio.settings.trackVolumes.push({ name: "music", volume: 10, fade: null });
  equal(hashGameState(loud), hashGameState(plain));
  ok(hashState(loud) !== hashState(plain), "the raw tree hash does see them, which is why the engine uses hashGameState");
  const counted = createGameState({ seed: 3 });
  counted.audio.cueId = 9;
  ok(hashGameState(counted) !== hashGameState(plain), "the cue counter is state");
  const played = createGameState({ seed: 3 });
  played.audio.tracks[0]!.file = "media/town.mid" as never;
  ok(hashGameState(played) !== hashGameState(plain), "a track's file is state");
  const restored = restoreGameState(snapshot(loud));
  deepEqual(restored.audio.settings, loud.audio.settings);
  equal(snapshot(restored), snapshot(loud));
  equal(hashGameState(restored), hashGameState(loud));
});

test("a game save keeps the tracks, counter and script bank and never the settings or the player's mix", () => {
  const state = createGameState({ seed: 0 });
  state.audio.soundFont = "media/boss.sf2" as never;
  state.audio.cueId = 12;
  state.audio.settings.masterVolume = 40;
  state.audio.settings.trackVolumes.push({ name: "sfx", volume: 25, fade: null });
  const saved = audioSaveProjection(state.audio, 77);
  deepEqual(Object.keys(saved), ["tick", "cueId", "soundFont", "tracks"]);
  equal(saved.tick, 77);
  equal(saved.cueId, 12);
  equal(saved.soundFont, "media/boss.sf2");
  deepEqual(saved.tracks, createAudioSection().tracks);
  const text = JSON.stringify(saved);
  ok(!text.includes("masterVolume") && !text.includes("trackVolumes") && !text.includes("settings"), "no settings in the save");
  state.audio.tracks[0]!.voiceCount = 3;
  equal(saved.tracks[0]?.voiceCount, 1, "the projection is a copy, not a view of the live state");
});

test("an empty restore keeps the section at its schema and a fresh state hashes the same on every restore", () => {
  const fresh = createGameState({ seed: 1 });
  const again = restoreGameState(snapshot(fresh));
  deepEqual(again.audio, createAudioSection());
  equal(hashGameState(again), hashGameState(fresh));
});
