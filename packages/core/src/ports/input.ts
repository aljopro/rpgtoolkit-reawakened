/**
 * Everything from outside is an input (AD-5, AD-14).
 *
 * Inputs are `{ step, event }`, where `step` is `time.step` at the start of
 * the consuming step; inputs apply in array order within a step. The core
 * returns the consumed list in `StepReport.consumed` and that concatenation is
 * the canonical replay log.
 */

import type { Bytes, PortData } from "./bytes.ts";

/**
 * A key press or release. `name` is the legacy logical name (`"ENTER"`,
 * `"LEFT"`, `"A"`); `code` is the physical scan code; `char` is the typed
 * character when there is one (AD-14).
 */
export type KeyInput = {
  readonly kind: "key";
  readonly name: string;
  readonly code: string;
  readonly char?: string;
  readonly down: boolean;
};

/** A pointer event in logical integer pixels (AD-14). */
export type PointerInput = {
  readonly kind: "pointer";
  readonly x: number;
  readonly y: number;
  readonly buttons: number;
};

/**
 * A gamepad event (E-112). AD-14 fixes the event name only; the payload is
 * defined by the input epic (CAP-8).
 */
export type GamepadInput = {
  readonly kind: "gamepad";
};

/**
 * The window gained or lost focus. The core owns the E-03 pause: after
 * `focus.lost` `advance` consumes no steps until `focus.gained` (AD-14).
 */
export type FocusInput = {
  readonly kind: "focus";
  readonly state: "lost" | "gained";
};

/** The reply to an `asset` request: the bytes, or that the key is missing (AD-5). */
export type AssetReply =
  | {
      readonly kind: "asset";
      readonly reqId: number;
      readonly bytes: Bytes;
      readonly missing?: never;
    }
  | {
      readonly kind: "asset";
      readonly reqId: number;
      readonly missing: true;
      readonly bytes?: never;
    };

/** The reply to a `loadBlob` request: the bytes, or that the blob is missing (AD-5). */
export type BlobLoaded =
  | {
      readonly kind: "blob.loaded";
      readonly reqId: number;
      readonly bytes: Bytes;
      readonly missing?: never;
    }
  | {
      readonly kind: "blob.loaded";
      readonly reqId: number;
      readonly missing: true;
      readonly bytes?: never;
    };

/** The reply to a `saveBlob` request (AD-5). */
export type BlobSaved = {
  readonly kind: "blob.saved";
  readonly reqId: number;
  readonly ok: boolean;
};

/** The reply to a `listBlobs` request (AD-5). */
export type BlobListed = {
  readonly kind: "blob.listed";
  readonly reqId: number;
  readonly names: readonly string[];
};

/**
 * The reply to an `extension.call` request (AD-5). The E-99 API itself is
 * deferred, so the result stays `PortData`.
 */
export type ExtensionResult = {
  readonly kind: "extension.result";
  readonly reqId: number;
  readonly result: PortData;
};

/** A stream audio cue finished; an unknown `cueId` is ignored (AD-16). */
export type AudioEnded = {
  readonly kind: "audio.ended";
  readonly cueId: number;
};

/** A stream video finished (AD-14). */
export type VideoEnded = {
  readonly kind: "video.ended";
};

/** The one published input event union (AD-14). */
export type InputEvent =
  | KeyInput
  | PointerInput
  | GamepadInput
  | FocusInput
  | AssetReply
  | BlobLoaded
  | BlobSaved
  | BlobListed
  | ExtensionResult
  | AudioEnded
  | VideoEnded;

/** One external input, stamped with the step that consumes it (AD-14). */
export type InputRecord = {
  readonly step: number;
  readonly event: InputEvent;
};
