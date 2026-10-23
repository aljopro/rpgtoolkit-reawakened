/**
 * Standard media controls (AD-8/AD-10; docs/spec/engine/audio-media.md).
 *
 * Commands only validate arguments and report plain audio effects.  The audio
 * runtime is the sole owner of `GameState.audio`; this pack never mutates it.
 */

import { assetKey } from "../../formats/resolver/resolver.ts";
import { MEDIA_HOST_TYPES, type MediaPlayOptions } from "../../audio/script.ts";
import type { MediaVoiceRef } from "../../audio/model.ts";
import {
  MEDIA_LOOP,
  MEDIA_ONCE,
  MEDIA_RESTART,
  MEDIA_TRACK_NAME,
  MEDIA_WAIT,
  asciiFold,
  findTrack,
  voicePass,
  voicePosition,
  type AudioStateV2,
  type AudioTrackState,
  type AudioVoiceState,
} from "../../audio/model.ts";
import { secondsToTicks } from "../../time/time.ts";
import type { NamedWait } from "../../ports/wait.ts";
import type { Arg, BuiltinDoc, BuiltinSpec } from "../builtins.ts";
import { ScriptError } from "../errors.ts";
import type { CommandEffect, CommandView, PluginDefinition } from "../plugin.ts";
import { truthy } from "../values.ts";

/** Query state constants (distinct from the media flag bits). */
export const tkMD_STOPPED = 0;
export const tkMD_PLAYING = 1;
export const tkMD_PAUSED = 2;
/** The four flags exposed by the TK media API. */
export const tkMD_ONCE = MEDIA_ONCE;
export const tkMD_LOOP = MEDIA_LOOP;
export const tkMD_WAIT = MEDIA_WAIT;
export const tkMD_RESTART = MEDIA_RESTART;
/** Sync is a request bit accepted by the media family. */
export const tkMD_SYNC = 8;

/** A read-only structural view reused by media query commands. */
export type AudioReadView = Readonly<AudioStateV2>;

/** Return the audio state without giving a command a writable section handle. */
export function readAudioView(view: CommandView): AudioReadView | undefined {
  return view.state?.audio;
}

function doc(summary: string, behaviour: string, waits?: BuiltinDoc["waits"]): BuiltinDoc {
  return {
    summary,
    behaviour,
    groups: ["audio-23"],
    ...(waits === undefined ? {} : { waits }),
    see: ["docs/spec/engine/audio-media.md#media-command-family"],
  };
}

function stringArg(args: readonly Arg[], index: number, name: string): string {
  const value = args[index]?.value;
  if (typeof value !== "string") throw new ScriptError("builtin.bad-arg", `${name}: argument ${index + 1} must be a string`);
  return value;
}

function numberArg(args: readonly Arg[], index: number, name: string): number {
  const value = args[index]?.value;
  if (typeof value !== "number" || !Number.isFinite(value)) throw new ScriptError("builtin.bad-arg", `${name}: argument ${index + 1} must be a finite number`);
  return value;
}

function wholeArg(args: readonly Arg[], index: number, name: string): number {
  const value = numberArg(args, index, name);
  if (!Number.isInteger(value)) throw new ScriptError("builtin.bad-arg", `${name}: argument ${index + 1} must be a whole number`);
  return value;
}

function optionalVoice(args: readonly Arg[], index: number, name: string): number | undefined {
  if (args.length <= index) return undefined;
  const voice = wholeArg(args, index, name);
  if (voice < 0) throw new ScriptError("builtin.bad-arg", `${name}: voice must not be negative`);
  return voice;
}

function optionalTrack(args: readonly Arg[], index: number, fallback: string, name: string): string {
  return args.length > index ? stringArg(args, index, name) : fallback;
}

function mediaAsset(file: string): string {
  const normalized = file.replaceAll("\\", "/");
  const folded = asciiFold(normalized);
  return assetKey(folded.startsWith("media/") ? folded : `media/${folded}`);
}

function video(name: "playavi" | "playavismall", presentation: "full" | "small"): BuiltinSpec {
  const label = presentation === "full" ? "full screen" : "actual size, centred";
  return {
    name,
    aliases: [],
    params: [{ name: "file", optional: false, byRef: false, variadic: false }],
    doc: {
      summary: presentation === "full" ? "Play a movie full screen. Supported types are *.avi, *.mpg, and *.mov." : "Play a movie at actual size, centred.",
      behaviour: `Resolves the Media-folder video key, stops music while the video plays, posts one ${presentation} video request, and waits unskippably for its matching video.ended reply. Music restarts from tick 0 after the reply.`,
      groups: ["graphics-canvases-animation-video-31"],
      waits: { kind: "other", summary: "The calling thread waits for the matching video.ended reply; game time does not advance while the video is held." },
      see: ["docs/spec/engine/audio-media.md#video-wait-hold", "docs/spec/engine/audio-media.md#video-music"],
    },
    call: (view, args) => {
      if (view.state?.engine.video !== undefined) throw new ScriptError("media.video-busy", `${name}: another video is already playing`);
      const key = mediaAsset(stringArg(args, 0, name));
      return {
        value: null,
        effects: [effect("media.stop", ["music", null])],
        request: { kind: "playVideo", key, presentation },
      };
    },
  };
}

function waitPayload(track: AudioTrackState, voice: AudioVoiceState, tick: number, pass: boolean): Record<string, string | number | boolean | null> {
  return {
    track: track.name,
    voice: voice.index,
    cueId: voice.cueId,
    endTick: voice.endTick,
    pass,
    passIndex: pass ? voicePass(voice, tick) : null,
  };
}

function audioWait(view: CommandView, trackName: string, voiceIndex: number, id: string): NamedWait | undefined {
  const audio = readAudioView(view);
  if (audio === undefined) return undefined;
  const track = findTrack(audio, trackName);
  if (track === undefined) throw new ScriptError("media.unknown-track", `${id}: unknown track "${trackName}"`);
  if (!Number.isInteger(voiceIndex) || voiceIndex < 0 || voiceIndex >= track.voiceCount) {
    throw new ScriptError("media.unknown-voice", `${id}: unknown voice ${voiceIndex} on track "${track.name}"`);
  }
  const voice = track.voices.find((item) => item.index === voiceIndex);
  if (voice === undefined) return undefined;
  if (voice.lengthTicks === null) throw new ScriptError("media.asset-length", `${id}: the track has no known length`);
  const pass = voice.loop;
  return {
    kind: "audio.track",
    global: false,
    id: "mediaWait",
    payload: [waitPayload(track, voice, view.clock.tick(), pass)],
    resumeRefs: [],
  };
}

function playWait(view: CommandView, trackName: string, voice: number | undefined, flags: number): NamedWait | undefined {
  if ((flags & MEDIA_LOOP) !== 0 && (flags & MEDIA_WAIT) !== 0) {
    throw new ScriptError("media.wait-loop", "mediaPlay: tkMD_LOOP and tkMD_WAIT cannot be combined");
  }
  if ((flags & MEDIA_WAIT) === 0) return undefined;
  return audioWait(view, trackName, voice ?? 0, "mediaPlay");
}

function effect(name: string, args: readonly (string | number | boolean | null)[]): CommandEffect {
  return { kind: "mixed", section: "audio", args };
}

function mediaTrack(): BuiltinSpec {
  return {
    name: "mediatrack",
    aliases: [],
    params: [
      { name: "name", optional: false, byRef: false, variadic: false },
      { name: "voices", optional: true, byRef: false, variadic: false },
    ],
    doc: doc("Create or resize a named audio track.", "Validates the track name and voice count, then posts one audio configuration effect; it changes state immediately and never waits."),
    call: (_view, args) => {
      const name = stringArg(args, 0, "mediaTrack");
      const voices = args.length > 1 ? wholeArg(args, 1, "mediaTrack") : 1;
      if (voices < 1) throw new ScriptError("builtin.bad-arg", "mediaTrack: voices must be at least 1");
      return { value: null, effects: [effect("media.track", [asciiFold(name), voices])] };
    },
  };
}

function mediaLoad(): BuiltinSpec {
  return {
    name: "mediaload",
    aliases: [],
    params: [
      { name: "track", optional: false, byRef: false, variadic: false },
      { name: "file", optional: false, byRef: false, variadic: false },
    ],
    doc: doc("Load a media file for a track without starting it.", "Resolves the Media-folder file name and posts one load cue for the named track; the command is immediate and never waits."),
    call: (_view, args) => ({ value: null, effects: [effect("media.load", [asciiFold(stringArg(args, 0, "mediaLoad")), mediaAsset(stringArg(args, 1, "mediaLoad"))])] }),
  };
}

/** The handle of an object value, or `null` for any other value. */
function objectHandle(value: unknown): number | null {
  if (typeof value !== "object" || value === null || !("kind" in value) || value.kind !== "object") return null;
  if (!("handle" in value)) return null;
  return typeof value.handle === "number" ? value.handle : null;
}

/** Read one `mediaPlay` option as a whole number, or throw the located argument error. */
function wholeOption(value: unknown, name: string, op: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) throw new ScriptError("builtin.bad-arg", `${op}: option "${name}" must be a whole number`);
  return value;
}

/** Read one `mediaPlay` option as `1`/`0`, or throw the located argument error. */
function flagOption(value: unknown, name: string, op: string): boolean {
  const flag = wholeOption(value, name, op);
  if (flag !== 0 && flag !== 1) throw new ScriptError("builtin.bad-arg", `${op}: option "${name}" must be 1 or 0`);
  return flag === 1;
}

/**
 * The ruled `options` dictionary of `mediaPlay(file[, options])` (MEDIA-1):
 * `track`, `loop`, `volume`, `priority`, `sync` and `wait`, each validated
 * before any playback change. A value the contract does not allow is a located
 * call error, so no partial start happens.
 */
function readPlayOptions(view: CommandView, value: unknown): MediaPlayOptions {
  const op = "mediaPlay";
  let track = "music";
  let loop = true;
  let volume = 100;
  let priority = 0;
  let sync: string | null = null;
  let wait = false;
  if (value !== null && value !== undefined) {
    const handle = objectHandle(value);
    if (handle === null) throw new ScriptError("builtin.bad-arg", `${op}: options must be a dictionary`);
    const members = view.objectMembers?.(handle);
    if (members === undefined) throw new ScriptError("builtin.bad-arg", `${op}: options must be a live dictionary`);
    for (const key of Object.keys(members)) {
      if (key !== "track" && key !== "loop" && key !== "volume" && key !== "priority" && key !== "sync" && key !== "wait") {
        throw new ScriptError("builtin.bad-arg", `${op}: unknown option "${key}"`);
      }
    }
    if (Object.hasOwn(members, "track")) {
      const name = members["track"];
      if (typeof name !== "string") throw new ScriptError("builtin.bad-arg", `${op}: option "track" must be a string`);
      track = asciiFold(name);
      if (!MEDIA_TRACK_NAME.test(track)) throw new ScriptError("media.invalid-track-name", `${op}: invalid track name "${name}"`);
    }
    if (Object.hasOwn(members, "loop")) loop = flagOption(members["loop"], "loop", op);
    else loop = track === "music";
    if (Object.hasOwn(members, "volume")) {
      volume = wholeOption(members["volume"], "volume", op);
      if (volume < 0 || volume > 100) throw new ScriptError("media.invalid-volume", `${op}: volume must be between 0 and 100`);
    }
    if (Object.hasOwn(members, "priority")) priority = wholeOption(members["priority"], "priority", op);
    if (Object.hasOwn(members, "sync")) {
      const source = members["sync"];
      if (typeof source !== "string") throw new ScriptError("builtin.bad-arg", `${op}: option "sync" must be a string`);
      sync = source === "" ? null : asciiFold(source);
    }
    if (Object.hasOwn(members, "wait")) wait = flagOption(members["wait"], "wait", op);
  }
  const audio = readAudioView(view);
  if (audio === undefined || findTrack(audio, track) === undefined) throw new ScriptError("media.unknown-track", `${op}: unknown track "${track}"`);
  if (loop && wait) throw new ScriptError("media.wait-loop", `${op}: a looping voice cannot be waited on`);
  return { track, loop, volume, priority, sync, wait };
}

/** The pack's one start route: a VM control action owns the object and the posted effect. */
function playEffect(file: string, options: MediaPlayOptions, returnVoice = true): CommandEffect {
  return { kind: "vm.control", args: ["mediaplay", mediaAsset(file), { ...options }, returnVoice] };
}

function mediaPlay(): BuiltinSpec {
  return {
    name: "mediaplay",
    aliases: [],
    params: [
      { name: "file", optional: false, byRef: false, variadic: false },
      { name: "options", optional: true, byRef: false, variadic: false },
    ],
    doc: {
      ...doc("Play a media file on a named track.", "Resolves the Media-folder file, validates the named options, and starts one voice through the audio applier; the value is that voice object (MEDIA-1), or null when the request starts nothing. With `wait` the calling thread parks on the voice's audio.track wait."),
      returns: { summary: "The started voice object, or null when no voice started." },
      waits: { kind: "other", summary: "With the wait option, the calling thread waits on the audio.track wait for that finite voice." },
      see: ["docs/spec/engine/audio-media.md#media-1"],
    },
    call: (view, args) => {
      const file = stringArg(args, 0, "mediaPlay");
      const options = readPlayOptions(view, args[1]?.value);
      return { value: null, effects: [playEffect(file, options)] };
    },
  };
}

/** A hydrated voice method: read the receiver's `{track, slot, cueId}`, diagnose a stale one, or act. */
function voiceRef(view: CommandView, args: readonly Arg[], op: string): MediaVoiceRef | null {
  const handle = objectHandle(args[0]?.value);
  if (handle === null) throw new ScriptError("builtin.bad-arg", `${op}: the receiver is not a voice object`);
  const members = view.objectMembers?.(handle);
  if (members === undefined) throw new ScriptError("builtin.bad-arg", `${op}: the receiver is not a live voice object`);
  const track = members["track"];
  const slot = members["slot"];
  const cueId = members["cueId"];
  if (typeof track !== "string" || !Number.isInteger(slot) || !Number.isInteger(cueId)) {
    view.media?.diagnose("media.unknown-voice", op, { track: typeof track === "string" ? track : "", voice: Number.isInteger(slot) ? (slot as number) : -1 });
    return null;
  }
  return { track, slot: slot as number, cueId: cueId as number };
}

/** The hydrated voice methods (MEDIA-1): each acts on the voice identity the object names. */
function voiceMethod(name: string): BuiltinSpec {
  const number = name === "mediavoicefade" ? 2 : name === "mediavoiceseek" ? 1 : 0;
  const params = [{ name: "voice", optional: false, byRef: false, variadic: false }];
  if (name === "mediavoiceseek") params.push({ name: "seconds", optional: false, byRef: false, variadic: false });
  if (name === "mediavoicefade") {
    params.push({ name: "percent", optional: false, byRef: false, variadic: false });
    params.push({ name: "seconds", optional: false, byRef: false, variadic: false });
  }
  return {
    name,
    aliases: [],
    params,
    doc: {
      ...doc(
        name === "mediavoicestop" ? "Stop a voice object." : name === "mediavoicepause" ? "Pause a voice object." : name === "mediavoiceresume" ? "Resume a voice object." : name === "mediavoiceseek" ? "Move a voice object to a time position." : name === "mediavoicefade" ? "Fade a voice object to a volume." : "Wait for a voice object to finish.",
        "Hydrated voice method: reads the object's track, slot and cue id and applies the same deterministic audio operation as the procedural command; a stale voice diagnoses and changes nothing.",
      ),
      access: "internal",
      see: ["docs/spec/engine/audio-media.md#media-1"],
    },
    call: (view, args) => {
      const ref = voiceRef(view, args, name);
      if (ref === null) return { value: 0 };
      const media = view.media;
      if (media === undefined) throw new ScriptError("unknown.command", `${name}: the media owner is not installed`);
      if (name === "mediavoicestop") media.stop(ref);
      else if (name === "mediavoicepause") media.pause(ref);
      else if (name === "mediavoiceresume") media.resume(ref);
      else if (name === "mediavoiceseek") {
        const ticks = secondsToTicks(numberArg(args, 1, name));
        if (ticks === null) throw new ScriptError("media.invalid-time", `${name}: seconds must be finite and non-negative`);
        media.seek(ref, ticks);
      } else if (name === "mediavoicefade") {
        const percent = wholeArg(args, 1, name);
        if (percent < 0 || percent > 100) throw new ScriptError("media.invalid-volume", `${name}: percent must be between 0 and 100`);
        const ticks = secondsToTicks(numberArg(args, 2, name));
        if (ticks === null) throw new ScriptError("media.invalid-time", `${name}: seconds must be finite and non-negative`);
        media.fade(ref, percent, ticks);
      } else {
        const wait = media.voiceWait(ref);
        return wait === null ? { value: 0 } : { value: 0, wait };
      }
      return { value: 0 };
    },
  };
}

function mediaTrackGet(): BuiltinSpec {
  return {
    name: "mediatrackget",
    aliases: [],
    params: [
      { name: "media", optional: false, byRef: false, variadic: false },
      { name: "name", optional: false, byRef: false, variadic: false },
    ],
    doc: {
      ...doc("Reach a configured audio track object.", "Hydrated `media.track(name)` method: folds the name, requires a configured track, and returns that track's one host object; an unknown name diagnoses and returns null."),
      access: "internal",
      see: ["docs/spec/engine/audio-media.md#media-1"],
    },
    call: (view, args) => {
      const name = asciiFold(stringArg(args, 1, "media.track"));
      const audio = readAudioView(view);
      if (audio === undefined || findTrack(audio, name) === undefined) {
        view.media?.diagnose("media.unknown-track", "media.track", { track: name });
        return { value: null };
      }
      return { value: null, effects: [{ kind: "vm.control", args: ["mediaTrackObject", name] }] };
    },
  };
}

function mediaTrackFade(): BuiltinSpec {
  return {
    name: "mediatrackfade",
    aliases: [],
    params: [
      { name: "track", optional: false, byRef: false, variadic: false },
      { name: "percent", optional: false, byRef: false, variadic: false },
      { name: "seconds", optional: false, byRef: false, variadic: false },
    ],
    doc: {
      ...doc("Fade a track object to a volume percentage.", "Hydrated `track.fade(percent, seconds)` method: validates the percentage and duration and posts the track-wide fade effect; the track keeps playing when the fade reaches zero."),
      access: "internal",
      see: ["docs/spec/engine/audio-media.md#media-1"],
    },
    call: (view, args) => {
      const handle = objectHandle(args[0]?.value);
      const members = handle === null ? undefined : view.objectMembers?.(handle);
      const name = members?.["name"];
      if (typeof name !== "string") throw new ScriptError("builtin.bad-arg", "track.fade: the receiver is not a track object");
      const percent = wholeArg(args, 1, "track.fade");
      if (percent < 0 || percent > 100) throw new ScriptError("media.invalid-volume", "track.fade: percent must be between 0 and 100");
      const ticks = secondsToTicks(numberArg(args, 2, "track.fade"));
      if (ticks === null) throw new ScriptError("media.invalid-time", "track.fade: seconds must be finite and non-negative");
      if (view.media === undefined) throw new ScriptError("unknown.command", "track.fade: the media owner is not installed");
      view.media.trackFade(name, percent, ticks);
      return { value: 0 };
    },
  };
}

function mediaTransport(name: string): BuiltinSpec {
  return {
    name,
    aliases: [],
    params: [
      { name: "track", optional: true, byRef: false, variadic: false },
      { name: "voice", optional: true, byRef: false, variadic: false },
    ],
    doc: doc(name === "mediastop" ? "Stop a track or voice." : name === "mediapause" ? "Pause a track or voice." : "Resume a paused track or voice.", `Posts the deterministic ${name} audio effect for the selected track and voice; the command is immediate and never waits.`),
    call: (_view, args) => {
      const track = asciiFold(optionalTrack(args, 0, "music", name));
      const voice = optionalVoice(args, 1, name);
      const effectName = name === "mediastop" ? "media.stop" : name === "mediapause" ? "media.pause" : "media.resume";
      return { value: null, effects: [effect(effectName, [track, voice ?? null])] };
    },
  };
}

function mediaSeek(): BuiltinSpec {
  return {
    name: "mediaseek",
    aliases: [],
    params: [
      { name: "track", optional: false, byRef: false, variadic: false },
      { name: "seconds", optional: false, byRef: false, variadic: false },
      { name: "voice", optional: true, byRef: false, variadic: false },
    ],
    doc: doc("Move a track or voice to a time position.", "Converts seconds to fixed 60 Hz ticks and posts one seek effect; invalid or unavailable positions raise a diagnostic and the command never waits."),
    call: (_view, args) => {
      const seconds = numberArg(args, 1, "mediaSeek");
      const ticks = secondsToTicks(seconds);
      if (ticks === null) throw new ScriptError("media.invalid-time", "mediaSeek: seconds must be finite and non-negative");
      return { value: null, effects: [effect("media.seek", [asciiFold(stringArg(args, 0, "mediaSeek")), ticks, optionalVoice(args, 2, "mediaSeek") ?? null])] };
    },
  };
}

function mediaLoop(): BuiltinSpec {
  return {
    name: "medialoop",
    aliases: [],
    params: [
      { name: "track", optional: false, byRef: false, variadic: false },
      { name: "on", optional: false, byRef: false, variadic: false },
      { name: "voice", optional: true, byRef: false, variadic: false },
    ],
    doc: doc("Turn looping on or off for a track or voice.", "Posts one loop-flag effect using the fixed boolean value and selected voice; the command is immediate and never waits."),
    call: (_view, args) => ({ value: null, effects: [effect("media.loop", [asciiFold(stringArg(args, 0, "mediaLoop")), truthy(args[1]?.value ?? null), optionalVoice(args, 2, "mediaLoop") ?? null])] }),
  };
}

function mediaFade(): BuiltinSpec {
  return {
    name: "mediafade",
    aliases: [],
    params: [
      { name: "track", optional: false, byRef: false, variadic: false },
      { name: "percent", optional: false, byRef: false, variadic: false },
      { name: "seconds", optional: false, byRef: false, variadic: false },
      { name: "voice", optional: true, byRef: false, variadic: false },
    ],
    doc: doc("Fade a track or voice to a volume percentage.", "Converts the duration to fixed 60 Hz ticks and posts one fade effect; percentages and durations are validated by the deterministic audio owner and the call never waits."),
    call: (_view, args) => {
      const percent = wholeArg(args, 1, "mediaFade");
      if (percent < 0 || percent > 100) throw new ScriptError("media.invalid-volume", "mediaFade: percent must be between 0 and 100");
      const duration = secondsToTicks(numberArg(args, 2, "mediaFade"));
      if (duration === null) throw new ScriptError("media.invalid-time", "mediaFade: seconds must be finite and non-negative");
      return { value: null, effects: [effect("media.fade", [asciiFold(stringArg(args, 0, "mediaFade")), percent, duration, optionalVoice(args, 3, "mediaFade") ?? null])] };
    },
  };
}

function mediaWait(): BuiltinSpec {
  return {
    name: "mediawait",
    aliases: [],
    params: [
      { name: "track", optional: true, byRef: false, variadic: false },
      { name: "voice", optional: true, byRef: false, variadic: false },
    ],
    doc: doc("Wait until a track or voice finishes its current sound.", "Creates a saveable audio.track wait for the selected voice; a pause suspends it, while a finish, stop or replacement wakes it.", { kind: "other", summary: "The calling thread waits on audio.track until the voice finishes or disappears." }),
    call: (view, args) => {
      const track = optionalTrack(args, 0, "sfx", "mediaWait");
      const voice = optionalVoice(args, 1, "mediaWait") ?? 0;
      const wait = audioWait(view, track, voice, "mediaWait");
      return wait === undefined ? { value: null } : { value: null, wait };
    },
  };
}

function mediaVolume(): BuiltinSpec {
  return {
    name: "mediavolume",
    aliases: [],
    params: [
      { name: "track", optional: false, byRef: false, variadic: false },
      { name: "percentOrVoice", optional: true, byRef: false, variadic: false },
      { name: "percent", optional: true, byRef: true, variadic: false },
    ],
    doc: doc("Set or read a track or voice volume.", "With a percent argument posts one volume effect; with no percent, returns the current track or voice volume and optionally writes the same value by reference without waiting."),
    call: (view, args) => {
      const trackName = asciiFold(stringArg(args, 0, "mediaVolume"));
      const isQueryWithOutput = args.length >= 3 && args[2]?.ref !== null;
      if (!isQueryWithOutput && args.length >= 2 && args[1]?.ref === null) {
        const percent = wholeArg(args, 1, "mediaVolume");
        if (percent < 0 || percent > 100) throw new ScriptError("media.invalid-volume", "mediaVolume: percent must be between 0 and 100");
        const voice = args.length > 2 ? optionalVoice(args, 2, "mediaVolume") : undefined;
        return { value: null, effects: [effect("media.volume", [trackName, percent, voice ?? null])] };
      }
      const voice = args.length >= 2 ? optionalVoice(args, 1, "mediaVolume") : undefined;
      const audio = readAudioView(view);
      const track = audio === undefined ? undefined : findTrack(audio, trackName);
      if (track === undefined) throw new ScriptError("media.unknown-track", `mediaVolume: unknown track "${trackName}"`);
      const found = voice === undefined ? undefined : track.voices.find((item) => item.index === voice);
      const value = found?.volume ?? (audio?.settings.trackVolumes.find((item) => item.name === track.name)?.volume ?? 100);
      return args.length > 2 && args[2]?.ref !== null ? { value, out: [[2, value] as const] } : { value };
    },
  };
}

function queryTrack(view: CommandView, name: string, trackName: string): AudioTrackState {
  const audio = readAudioView(view);
  const track = audio === undefined ? undefined : findTrack(audio, trackName);
  if (track === undefined) throw new ScriptError("media.unknown-track", `${name}: unknown track "${trackName}"`);
  return track;
}

function queryVoice(track: AudioTrackState, voice: number, name: string): AudioVoiceState | undefined {
  if (voice < 0 || voice >= track.voiceCount) throw new ScriptError("media.unknown-voice", `${name}: unknown voice ${voice} on track "${track.name}"`);
  return track.voices.find((item) => item.index === voice);
}

function queryOutput(args: readonly Arg[], index: number, value: string | number): { value: string | number; out?: readonly (readonly [number, string | number])[] } {
  const ref = args[index]?.ref;
  return ref === undefined || ref === null ? { value } : { value, out: [[index, value]] };
}

function queryDoc(summary: string, behaviour: string): BuiltinDoc {
  return {
    ...doc(summary, behaviour),
    returns: { summary: "The requested value; a by-reference ret argument receives the same value." },
  };
}

function mediaState(): BuiltinSpec {
  return {
    name: "mediastate",
    aliases: [],
    params: [
      { name: "track", optional: false, byRef: false, variadic: false },
      { name: "voice", optional: true, byRef: false, variadic: false },
      { name: "ret", optional: true, byRef: true, variadic: false },
    ],
    doc: queryDoc("Read whether a media track is stopped, playing or paused.", "Returns tkMD_PLAYING when any voice is playing, tkMD_PAUSED when none is playing but a voice is paused, otherwise tkMD_STOPPED. With an explicit voice, only that voice is considered; it never waits."),
    call: (view, args) => {
      const trackName = asciiFold(stringArg(args, 0, "mediaState"));
      const track = queryTrack(view, "mediaState", trackName);
      const voice = args.length > 1 ? optionalVoice(args, 1, "mediaState") : undefined;
      const selected = voice === undefined ? undefined : queryVoice(track, voice, "mediaState");
      const value = voice === undefined ? track.state === "playing" ? tkMD_PLAYING : track.state === "paused" ? tkMD_PAUSED : tkMD_STOPPED : selected?.state === "playing" ? tkMD_PLAYING : selected?.state === "paused" ? tkMD_PAUSED : tkMD_STOPPED;
      return queryOutput(args, 2, value);
    },
  };
}

function mediaFlags(): BuiltinSpec {
  return {
    name: "mediaflags",
    aliases: [],
    params: [
      { name: "track", optional: false, byRef: false, variadic: false },
      { name: "voice", optional: true, byRef: false, variadic: false },
      { name: "ret", optional: true, byRef: true, variadic: false },
    ],
    doc: queryDoc("Read the playback flags for a media voice.", "Returns the selected voice's loop bit and preserves the last voice-0 flags after a stop; it never waits."),
    call: (view, args) => {
      const track = queryTrack(view, "mediaFlags", asciiFold(stringArg(args, 0, "mediaFlags")));
      const voice = args.length > 1 ? optionalVoice(args, 1, "mediaFlags") : 0;
      const selected = queryVoice(track, voice ?? 0, "mediaFlags");
      const value = voice === 0 ? track.flags : selected?.loop ? MEDIA_LOOP : MEDIA_ONCE;
      return queryOutput(args, 2, value);
    },
  };
}

function mediaPlaying(): BuiltinSpec {
  return {
    name: "mediaplaying",
    aliases: [],
    params: [
      { name: "track", optional: false, byRef: false, variadic: false },
      { name: "voice", optional: true, byRef: false, variadic: false },
      { name: "ret", optional: true, byRef: true, variadic: false },
    ],
    doc: queryDoc("Check whether a media voice is playing.", "Returns 1 for a playing selected voice and 0 otherwise; it never waits."),
    call: (view, args) => {
      const track = queryTrack(view, "mediaPlaying", asciiFold(stringArg(args, 0, "mediaPlaying")));
      const voice = args.length > 1 ? optionalVoice(args, 1, "mediaPlaying") : 0;
      const value = queryVoice(track, voice ?? 0, "mediaPlaying")?.state === "playing" ? 1 : 0;
      return queryOutput(args, 2, value);
    },
  };
}

function mediaFile(): BuiltinSpec {
  return {
    name: "mediafile",
    aliases: [],
    params: [
      { name: "track", optional: false, byRef: false, variadic: false },
      { name: "voice", optional: true, byRef: false, variadic: false },
      { name: "ret", optional: true, byRef: true, variadic: false },
    ],
    doc: queryDoc("Read the current or last file for a media voice.", "Returns the selected voice file, or the track's last file when no voice is active; stopped tracks return an empty string when no file is retained."),
    call: (view, args) => {
      const track = queryTrack(view, "mediaFile", asciiFold(stringArg(args, 0, "mediaFile")));
      const voice = args.length > 1 ? optionalVoice(args, 1, "mediaFile") : 0;
      const value = queryVoice(track, voice ?? 0, "mediaFile")?.file ?? track.file ?? "";
      return queryOutput(args, 2, value);
    },
  };
}

function mediaPosition(): BuiltinSpec {
  return {
    name: "mediaposition",
    aliases: [],
    params: [
      { name: "track", optional: false, byRef: false, variadic: false },
      { name: "voice", optional: true, byRef: false, variadic: false },
      { name: "ret", optional: true, byRef: true, variadic: false },
    ],
    doc: queryDoc("Read a media voice position in seconds.", "Converts the fixed 60 Hz position ticks of the selected voice to seconds; it never waits."),
    call: (view, args) => {
      const track = queryTrack(view, "mediaPosition", asciiFold(stringArg(args, 0, "mediaPosition")));
      const voice = args.length > 1 ? optionalVoice(args, 1, "mediaPosition") : 0;
      const selected = queryVoice(track, voice ?? 0, "mediaPosition");
      return queryOutput(args, 2, selected === undefined ? track.positionTicks / 60 : voicePosition(selected, view.clock.tick()) / 60);
    },
  };
}

function mediaLength(): BuiltinSpec {
  return {
    name: "medialength",
    aliases: [],
    params: [
      { name: "trackOrFile", optional: false, byRef: false, variadic: false },
      { name: "ret", optional: true, byRef: true, variadic: false },
    ],
    doc: queryDoc("Read the known length of a media track or file in seconds.", "Returns fixed 60 Hz metadata for the named track or currently loaded file, or zero when no length is known; it never waits."),
    call: (view, args) => {
      const query = stringArg(args, 0, "mediaLength");
      const audio = readAudioView(view);
      let ticks: number | null = null;
      const track = audio === undefined ? undefined : findTrack(audio, asciiFold(query));
      if (track !== undefined) {
        ticks = track.lengthTicks ?? track.voices.find((item) => item.index === 0)?.lengthTicks ?? null;
      } else if (audio !== undefined) {
        const file = mediaAsset(query);
        for (const item of audio.tracks) {
          if (item.file === file) {
            ticks = item.lengthTicks;
            break;
          }
          const voice = item.voices.find((candidate) => candidate.file === file);
          if (voice !== undefined) {
            ticks = voice.lengthTicks;
            break;
          }
        }
      }
      const value = ticks === null ? 0 : ticks / 60;
      return queryOutput(args, 1, value);
    },
  };
}

function mediaTracks(): BuiltinSpec {
  return {
    name: "mediatracks",
    aliases: [],
    params: [{ name: "ret", optional: true, byRef: true, variadic: false }],
    doc: {
      ...doc("List the ordered media track names.", "Returns the number of configured tracks and writes their ordered names to the optional string-array ret output; it never waits."),
      returns: { summary: "The number of configured tracks." },
    },
    call: (view, args) => {
      const names = readAudioView(view)?.tracks.map((track) => track.name) ?? [];
      if (args[0]?.ref === undefined || args[0]?.ref === null) return { value: names.length };
      return { value: names.length, effects: [{ kind: "vm.control", args: ["split", args[0].ref, ...names] }] };
    },
  };
}

function getVolume(): BuiltinSpec {
  return {
    name: "getvolume",
    aliases: [],
    params: [{ name: "ret", optional: true, byRef: true, variadic: false }],
    doc: queryDoc("Read the master music and sound volume.", "Returns the master volume from 0 through 100 and optionally writes it by reference; it never waits."),
    call: (view, args) => queryOutput(args, 0, readAudioView(view)?.settings.masterVolume ?? 100),
  };
}

function legacyDoc(summary: string, behaviour: string, waits?: BuiltinDoc["waits"]): BuiltinDoc {
  return {
    ...doc(summary, behaviour, waits),
    tags: ["deprecated"],
    replacedBy: { kind: "command", name: "mediaplay" },
    reason: "Retained so existing Toolkit 3.1 games continue to run; use the standard media command in new code.",
  };
}
const MEDIA_PLAY = mediaPlay();
const MEDIA_STOP = mediaTransport("mediastop");


/** A Toolkit 3.1 alias keeps its void result and playback mapping. */
function legacyPlay(name: string, track: string, loop: boolean, summary: string, wait: boolean, waits?: BuiltinDoc["waits"]): BuiltinSpec {
  const behaviour = wait
    ? `Plays once on the ${track} track and parks the calling thread until the sound ends; it returns no value.`
    : `Maps to the ${track} track with the Toolkit 3.1 loop flag and never returns a value; it preserves the original command's behavior.`;
  return {
    name,
    aliases: [],
    params: [{ name: "file", optional: false, byRef: false, variadic: false }],
    doc: { ...legacyDoc(summary, behaviour, waits), replacedBy: { kind: "command", name: "mediaplay" } },
    call: (_view, args) => {
      const file = stringArg(args, 0, name);
      if (wait) {
        return {
          value: null,
          effects: [playEffect(file, { track, loop, volume: 100, priority: 0, sync: null, wait: true }, false)],
        };
      }
      return { value: null, effects: [effect("media.play", [mediaAsset(file), track, loop, false, 0, null, null])] };
    },
  };
}

function legacyStop(name: string, track: string, summary: string): BuiltinSpec {
  return {
    name,
    aliases: [],
    params: [],
    doc: {
      ...legacyDoc(summary, `Maps to mediastop for the ${track} track and never waits.`),
      replacedBy: { kind: "command", name: "mediastop" },
    },
    call: (view, _args, next) => MEDIA_STOP.call(view, [{ value: track, ref: null }], next),
  };
}

function setVolume(): BuiltinSpec {
  return {
    name: "setvolume",
    aliases: [],
    params: [{ name: "percent", optional: false, byRef: false, variadic: false }],
    doc: doc("Set the volume of all music and sound using a value between 0 and 100.", "Validates the master volume percentage and posts one master-volume effect; it is immediate and never waits."),
    call: (_view, args) => {
      const percent = wholeArg(args, 0, "setVolume");
      if (percent < 0 || percent > 100) throw new ScriptError("media.invalid-volume", "setVolume: percent must be between 0 and 100");
      return { value: null, effects: [effect("media.volume", [null, percent, null])] };
    },
  };
}

function soundFont(): BuiltinSpec {
  return {
    name: "soundfont",
    aliases: [],
    params: [{ name: "file", optional: false, byRef: false, variadic: false }],
    doc: doc("Choose the SoundFont used by MIDI music.", "Validates a Media-folder .sf2 or .sf3 name and posts one soundfont.set effect; the command is immediate and never waits."),
    call: (_view, args) => {
      const file = stringArg(args, 0, "soundFont");
      const folded = asciiFold(file);
      if (!folded.endsWith(".sf2") && !folded.endsWith(".sf3")) throw new ScriptError("media.soundfont-name", "soundFont: file must end in .sf2 or .sf3");
      return { value: null, effects: [effect("soundfont.set", [mediaAsset(file)])] };
    },
  };
}

function soundFontReset(): BuiltinSpec {
  return {
    name: "soundfontreset",
    aliases: [],
    params: [],
    doc: doc("Return MIDI music to the game's default SoundFont.", "Posts one soundfont.set effect with a null bank; the command is immediate and never waits."),
    call: () => ({ value: null, effects: [effect("soundfont.set", [null])] }),
  };
}

export const MEDIA_COMMANDS: readonly BuiltinSpec[] = [
  mediaTrack(),
  mediaLoad(),
  video("playavi", "full"),
  video("playavismall", "small"),
  MEDIA_PLAY,
  MEDIA_STOP,
  mediaTransport("mediapause"),
  mediaTransport("mediaresume"),
  mediaSeek(),
  mediaLoop(),
  mediaFade(),
  mediaWait(),
  mediaVolume(),
  mediaState(),
  mediaFlags(),
  mediaPlaying(),
  mediaFile(),
  mediaPosition(),
  mediaLength(),
  mediaTracks(),
  getVolume(),
  legacyPlay("midiplay", "music", true, "Play a media file on a named track.", false, { kind: "never", summary: "Never waits." }),
  legacyPlay("playmidi", "music", true, "Play a media file on a named track.", false, { kind: "never", summary: "Never waits." }),
  legacyPlay("wav", "sfx", false, "Play a wave file (e.g. a sound effect).", false, { kind: "never", summary: "Never waits." }),
  legacyPlay("mp3", "sfx", false, "Play a wave file (e.g. a sound effect).", false, { kind: "never", summary: "Never waits." }),
  legacyStop("mediarest", "music", "Stop a track or voice."),
  legacyStop("midirest", "music", "Stop a track or voice."),
  legacyStop("wavstop", "sfx", "Stop the current sound effect."),
  legacyPlay("mp3pause", "sfx", false, "Play a sound effect and pause the engine until it finishes.", true, { kind: "other", summary: "The calling thread waits on audio.track until the sound effect ends." }),
  setVolume(),
  soundFont(),
  soundFontReset(),
  mediaTrackGet(),
  mediaTrackFade(),
  voiceMethod("mediavoicestop"),
  voiceMethod("mediavoicepause"),
  voiceMethod("mediavoiceresume"),
  voiceMethod("mediavoiceseek"),
  voiceMethod("mediavoicefade"),
  voiceMethod("mediavoicewait"),
];

export const MEDIA_PLUGIN: PluginDefinition = {
  id: "media",
  version: "1.0.0",
  hostTypes: MEDIA_HOST_TYPES,
  doc: {
    summary: "Deterministic media tracks, voices and SoundFont controls.",
    groups: [{ id: "audio-23", name: "Audio", summary: "Track-based audio control at the fixed simulation tick." }],
  },
  commands: MEDIA_COMMANDS,
};
