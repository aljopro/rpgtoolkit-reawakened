/**
 * The wait registry: per-kind resolvers folded into AD-9's one `WaitPoll`
 * (docs/spec/engine/rpgcode-errors-and-threads.md#threads THR-1; R-32).
 *
 * AD-9 rules `poll(view, wait)` the only wake resolver. Each kind contributes
 * one resolver and `createWaitPoll` dispatches on `wait.kind`; a kind
 * registered twice is refused (`wait.duplicate-kind`), and a wait whose kind
 * nobody registered fails loudly (`wait.unknown-kind`) rather than sleeping
 * forever. Owner epics add their kinds (`menu.screen` and the like) by
 * building their own poll over `WAIT_KIND_RESOLVERS` plus theirs.
 *
 * Every resolver is pure over the wait payload and the tick: no closure, no
 * timer, nothing outside state.
 */

import type { Wait, WaitKindResolver, WaitPoll, WaitResult, WaitView } from "../ports/wait.ts";
import { ScriptError } from "./errors.ts";

/** The text a request that ran out its tick deadline resumes with. */
export const REQUEST_TIMEOUT_TEXT = "the request timed out";

const DONE: WaitResult = { value: null, ok: true };

/** `sleep`: due at `until`; `until: null` is indefinite and only a wake ends it. */
export function pollSleep(view: WaitView, wait: Wait): WaitResult | null {
  if (wait.kind !== "sleep" || wait.until === null) return null;
  return view.tick >= wait.until ? DONE : null;
}

/** `input.key`: resolve ordinary keys or cursor-map navigation/selection. */
export function pollInputKey(view: WaitView, wait: Wait): WaitResult | null {
  if (wait.kind !== "input.key") return null;
  const floor = wait.parkSeq ?? 0;
  const claimed = new Set(view.claims ?? []);
  const cursorMaps = (view.ui as { readonly cursorMaps?: readonly { readonly id: number; readonly points: readonly { readonly x: number; readonly y: number }[] }[] } | undefined)?.cursorMaps;
  const map = wait.cursorMap === undefined ? undefined : cursorMaps?.find((entry) => entry.id === wait.cursorMap);
  if (map !== undefined) {
    const count = map.points.length;
    if (count === 0) return null;
    let selected = Math.max(0, Math.min(count - 1, Math.trunc(wait.cursorSelection ?? 0)));
    const pointer = view.input?.pointer;
    if (pointer !== undefined && pointer.buttons !== 0) {
      let best = 0;
      let distance = Number.POSITIVE_INFINITY;
      for (let index = 0; index < map.points.length; index += 1) {
        const point = map.points[index]!;
        const dx = point.x - pointer.x;
        const dy = point.y - pointer.y;
        const candidate = dx * dx + dy * dy;
        if (candidate < distance) { distance = candidate; best = index; }
      }
      return { value: best, ok: true };
    }
    if (view.input !== undefined) {
      for (const key of view.input.keys) {
        if (key.seq < floor || claimed.has(key.seq)) continue;
        const normalized = key.name.toLowerCase();
        if (normalized === "left" || normalized === "up") selected = (selected + count - 1) % count;
        else if (normalized === "right" || normalized === "down") selected = (selected + 1) % count;
        else if (normalized === "enter" || normalized === "return" || normalized === "space") return { value: selected, ok: true, claim: key.seq };
        else if (/^[0-9]+$/.test(normalized)) {
          const direct = Number(normalized);
          if (direct >= 0 && direct < count) return { value: direct, ok: true, claim: key.seq };
        } else continue;
        wait.cursorSelection = selected;
      }
    }
    return null;
  }
  if (view.input !== undefined) {
    for (const key of view.input.keys) {
      if (key.seq < floor || claimed.has(key.seq)) continue;
      return { value: key.name, ok: true, claim: key.seq };
    }
    return null;
  }
  if (wait.key === null) return null;
  return { value: wait.key, ok: true };
}

/** `movement`: resolved when every collected move has reached its end tick. */
export function pollMovement(view: WaitView, wait: Wait): WaitResult | null {
  if (wait.kind !== "movement") return null;
  for (const move of wait.moves) {
    if (view.tick < move.until) return null;
  }
  return DONE;
}

/** `sprite.stance`: resolve only from the animation owner completion result. */
export function pollStance(view: WaitView, wait: Wait): WaitResult | null {
  if (wait.kind !== "sprite.stance") return null;
  const actor = view.sprites?.find((value) => value.id === wait.actor);
  if (actor === undefined) return null;
  return actor.stanceComplete || actor.stance !== wait.stance ? DONE : null;
}

/** `request` and `blob`: resolved by the stored reply, else by the tick deadline. */
export function pollRequest(view: WaitView, wait: Wait): WaitResult | null {
  if (wait.kind !== "request" && wait.kind !== "blob") return null;
  if (wait.reply !== null) return { value: wait.reply.value, ok: wait.reply.ok };
  if (wait.deadline !== null && view.tick >= wait.deadline) return { value: REQUEST_TIMEOUT_TEXT, ok: false };
  return null;
}

/** Resolve the UI's prompt or button result from modal state or a key event. */
export function pollRenderMsgBox(view: WaitView, wait: Wait): WaitResult | null {
  if (wait.kind !== "render.msgbox") return null;
  const modal = view.ui?.modal;
  if (modal !== null && typeof modal === "object" && "result" in modal) {
    const result = modal.result;
    if (typeof result === "string" || typeof result === "number") return { value: result, ok: true };
  }
  if (view.input === undefined) return null;
  const claimed = new Set(view.claims ?? []);
  for (const key of view.input.keys) {
    if (claimed.has(key.seq)) continue;
    const normalized = key.name.toLowerCase();
    if (wait.id === "prompt") {
      if (normalized === "enter" || normalized === "return" || normalized === "space") return { value: key.char ?? "", ok: true, claim: key.seq };
      continue;
    }
    const style = wait.payload[2] === 1 ? 1 : 0;
    if (normalized === "yes" || normalized === "y") return { value: 6, ok: true, claim: key.seq };
    if (normalized === "no" || normalized === "n") return { value: 7, ok: true, claim: key.seq };
    if (normalized === "enter" || normalized === "return" || normalized === "space") return { value: style === 1 ? 6 : 1, ok: true, claim: key.seq };
  }
  return null;
}

/** The audio owner resolver for finite-end and loop-pass waits. */
export function pollAudioTrack(view: WaitView, wait: Wait): WaitResult | null {
  if (wait.kind !== "audio.track") return null;
  const raw = wait.payload[0];
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const trackName = raw.track;
  const voiceIndex = raw.voice;
  const cueId = raw.cueId;
  const pass = raw.pass;
  const passIndex = raw.passIndex;
  if (typeof trackName !== "string" || typeof voiceIndex !== "number" || typeof cueId !== "number" || typeof pass !== "boolean" || (passIndex !== null && typeof passIndex !== "number")) return null;
  const track = view.audio?.tracks.find((item) => item.name === trackName);
  const voice = track?.voices.find((item) => item.index === voiceIndex && item.cueId === cueId);
  if (voice === undefined) return DONE;
  if (voice.state === "paused") return null;
  if (pass && voice.loop && voice.lengthTicks !== null && passIndex !== null) {
    const currentPass = Math.floor((view.tick - voice.startTick) / voice.lengthTicks);
    return currentPass > passIndex ? DONE : null;
  }
  return voice.endTick !== null && view.tick >= voice.endTick ? DONE : null;
}

/** UI-owned wait kinds, kept separate so hosts can extend the VM registry without duplicate registration. */
export const UI_WAIT_KIND_RESOLVERS: readonly WaitKindResolver[] = [
  { kind: "render.msgbox", poll: pollRenderMsgBox },
];

/** The VM-owned wait kinds. */
export const WAIT_KIND_RESOLVERS: readonly WaitKindResolver[] = [
  { kind: "sleep", poll: pollSleep },
  { kind: "input.key", poll: pollInputKey },
  { kind: "movement", poll: pollMovement },
  { kind: "sprite.stance", poll: pollStance },
  { kind: "request", poll: pollRequest },
  { kind: "blob", poll: pollRequest },
  { kind: "audio.track", poll: pollAudioTrack },
];

/** Fold per-kind resolvers into the one `WaitPoll` (AD-9). Throws
 * `wait.duplicate-kind` when two resolvers claim a kind.
 */
export function createWaitPoll(resolvers: readonly WaitKindResolver[]): WaitPoll {
  const byKind = new Map<string, WaitPoll>();
  for (const resolver of resolvers) {
    if (byKind.has(resolver.kind)) {
      throw new ScriptError("wait.duplicate-kind", `the wait kind "${resolver.kind}" is registered twice (AD-9)`);
    }
    byKind.set(resolver.kind, resolver.poll);
  }
  return (view, wait) => {
    const resolve = byKind.get(wait.kind);
    if (resolve === undefined) throw new ScriptError("wait.unknown-kind", `no resolver is registered for wait kind "${wait.kind}"`);
    return resolve(view, wait);
  };
}

/** The default poll for VM and UI-owned kinds. */
export const defaultWaitPoll: WaitPoll = createWaitPoll([...WAIT_KIND_RESOLVERS, ...UI_WAIT_KIND_RESOLVERS]);

/** A short plain description of a wait, for diagnostics (deadlock reports). */
export function describeWait(wait: Wait): string {
  switch (wait.kind) {
    case "sleep":
      return wait.until === null ? "sleep(indefinite)" : `sleep(until tick ${wait.until})`;
    case "input.key":
      return "input.key";
    case "movement":
      return `movement(${wait.moves.length} move(s))`;
    case "sprite.stance":
      return `sprite.stance(${wait.actor})`;
    case "request":
    case "blob":
      return `${wait.kind}(reqId ${wait.reqId})`;
    default:
      return `${wait.kind}(${wait.id})`;
  }
}
