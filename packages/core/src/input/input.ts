/**
 * Deterministic raw-input owner (AD-10/AD-14; docs/spec/engine/display-input-audio.md#e-110).
 * Movement bindings and buttons are layered on this state by the movement epic.
 */

import type { InputEvent, KeyInput, PointerInput } from "../ports/input.ts";
import type { InputSection } from "../save/sections/input.ts";

export type InputKey = {
  readonly seq: number;
  readonly name: string;
  readonly code: string;
  readonly char: string | null;
};
export type InputView = {
  readonly nextSeq: number;
  readonly keys: readonly InputKey[];
  readonly held: { readonly [name: string]: boolean };
  readonly pointer: { readonly x: number; readonly y: number; readonly buttons: number };
  readonly focused: boolean;
};

export function createInputSection(): InputSection {
  return {
    nextSeq: 1,
    keys: [],
    held: {},
    pointer: { x: 0, y: 0, buttons: 0 },
    focused: true,
  };
}

export function inputView(state: InputSection): InputView {
  return state;
}

export function applyInputEvent(state: InputSection, event: InputEvent): void {
  switch (event.kind) {
    case "key":
      applyKey(state, event);
      return;
    case "pointer":
      applyPointer(state, event);
      return;
    case "focus":
      state.focused = event.state === "gained";
      return;
    case "gamepad":
    case "asset":
    case "blob.loaded":
    case "blob.saved":
    case "blob.listed":
    case "extension.result":
    case "audio.ended":
    case "video.ended":
      return;
    default: {
      const neverEvent: never = event;
      return neverEvent;
    }
  }
}

function applyKey(state: InputSection, event: KeyInput): void {
  const seq = state.nextSeq;
  state.nextSeq += 1;
  state.keys.push({ seq, name: event.name, code: event.code, char: event.char });
  state.held[event.name] = event.down;
  if (event.code !== event.name) state.held[event.code] = event.down;
}

function applyPointer(state: InputSection, event: PointerInput): void {
  state.pointer = { x: event.x, y: event.y, buttons: event.buttons };
}

/** Remove only claims made by the engine; an unclaimed key remains for later waiters. */
export function pruneClaimed(state: InputSection, claimed: readonly number[]): void {
  if (claimed.length === 0) return;
  const used = new Set(claimed);
  state.keys = state.keys.filter((key) => !used.has(key.seq));
}


