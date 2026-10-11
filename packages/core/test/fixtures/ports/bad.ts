// Port-contract fixtures that must FAIL to typecheck: functions, `undefined`
// and `Map` are outside `PlainData`/`PortData` (AD-1, AD-7).
import type {
  AssertPlainData,
  AssertPortData,
  AssetKey,
  AssetReply,
  AudioCue,
  BlobLoaded,
  KeyInput,
  TexRef,
} from "../../../src/index.ts";

export type FunctionFieldIsNotPortData = AssertPortData<{ readonly fn: () => void }>;
export type UndefinedFieldIsNotPortData = AssertPortData<{ readonly value: string | undefined }>;
export type MapIsNotPortData = AssertPortData<Map<string, number>>;
export type FunctionIsNotPlainData = AssertPlainData<() => number>;
export type UndefinedIsNotPlainData = AssertPlainData<undefined>;
export const badKeyInput: KeyInput = { kind: "key", name: "A", code: "KeyA", char: undefined, down: true };
export const badAudioCue: AudioCue = { cueId: 1, kind: "music.play", asset: undefined };
export const badTexRef: TexRef = { asset: "hero.png" as AssetKey, tile: undefined };
export const badAssetReply: AssetReply = { kind: "asset", reqId: 1, bytes: new Uint8Array(), missing: true };
export const badBlobLoaded: BlobLoaded = { kind: "blob.loaded", reqId: 1, bytes: new Uint8Array(), missing: true };
