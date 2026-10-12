/**
 * Every landed reader wrapped as an `AssetDecoder` (AD-31), and the registry
 * over them — the core format registry the epic's Description names.
 *
 * One entry per reader family, keyed by its `CoreFormatId`: the main game file
 * (§2), boards (§4, with §4.1's branch decided here and a pre-vector board
 * converted to the §4.2 model), tilesets (§3.1), animations (§7.1), characters,
 * items and enemies (§6.1–§6.3), special moves, status effects and battle
 * backgrounds (§8.1–§8.3), and images (§10). The dump reads its data-format rows
 * from `CORE_REGISTRY` and decodes through `CORE_DECODERS`, so the project has
 * one dispatch.
 *
 * The decode context (AD-31's `AssetResolver`) is part of the interface but no
 * landed reader follows a reference while reading, so every decoder here ignores
 * it; a decoder that needs it reads it from the parameter.
 */

import { BinaryReader } from "../binary/reader.ts";
import { decodeTexture } from "../image/index.ts";
import { readTileset } from "../tileset/tileset.ts";
import { readMainFile, MAIN_MAGIC, type MainFile } from "../main-file/index.ts";
import { readAnimation, ANIMATION_MAGIC, type Animation } from "../animation/index.ts";
import {
  readBattleBackground,
  readSpecialMove,
  readStatusEffect,
  BATTLE_BACKGROUND_MAGIC,
  SPECIAL_MOVE_MAGIC,
  STATUS_EFFECT_MAGIC,
  type BattleBackground,
  type SpecialMove,
  type StatusEffect,
} from "../battle/index.ts";
import {
  readCharacter,
  readEnemy,
  readItem,
  CHARACTER_MAGIC,
  ENEMY_MAGIC,
  ITEM_MAGIC,
  type Character,
  type Enemy,
  type Item,
} from "../actor/index.ts";
import { convertPreVectorBoard } from "../board/pre-vector-convert.ts";
import { readPreVectorBoard } from "../board/pre-vector-reader.ts";
import { readBoard } from "../board/reader.ts";
import { BOARD_MAGIC } from "../board/model.ts";
import { boardLayout, type DecodedBoard } from "../board/layout.ts";
import type { DecodedTexture } from "../image/model.ts";
import type { Tileset } from "../tileset/tileset.ts";
import type { Result } from "../result.ts";
import type { AssetDecoder } from "./decoder.ts";
import { createAssetRegistry } from "./registry.ts";

/** The PNG signature `89 50 4E 47 0D 0A 1A 0A` (format-spec §10). */
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

/** The JPEG SOI marker plus the start of any following segment: `FF D8 FF` (§10). */
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff] as const;

/** The `i16` version bytes a `.tst` (20) or `.iso` (30) starts with, little-endian (§3.1). */
const TILESET_VERSION_BYTES = [0x14, 0x1e] as const;

/** Whether `bytes` begins with `magic`, matched as ASCII byte for byte. */
function startsWithAscii(bytes: Uint8Array, magic: string): boolean {
  if (bytes.length < magic.length) {
    return false;
  }
  for (let i = 0; i < magic.length; i += 1) {
    if (bytes[i] !== magic.charCodeAt(i)) {
      return false;
    }
  }
  return true;
}

/** Whether `bytes` begins with the byte sequence `signature`. */
function startsWithBytes(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) {
    return false;
  }
  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[i] !== signature[i]) {
      return false;
    }
  }
  return true;
}

/** The magic-header test for a reader whose file starts with an ASCII magic string. */
function magicIs(magic: string): (header: Uint8Array) => boolean {
  return (header) => startsWithAscii(header, magic);
}

/** Read a board of either §4.1 branch, converting a §4.8 pre-vector board (§4.2 model). */
function decodeBoard(bytes: Uint8Array): Result<DecodedBoard> {
  const header = new BinaryReader(bytes).header();
  if (header.ok && boardLayout(header.value.minor) === "pre-vector") {
    const pre = readPreVectorBoard(new BinaryReader(bytes));
    if (!pre.ok) {
      return pre;
    }
    const converted = convertPreVectorBoard(pre.value);
    if (!converted.ok) {
      return converted;
    }
    return {
      ok: true,
      value: { board: converted.value, layout: "pre-vector" },
      warnings: [...pre.warnings, ...converted.warnings],
    };
  }
  const read = readBoard(new BinaryReader(bytes));
  return read.ok ? { ok: true, value: { board: read.value, layout: "vector" }, warnings: read.warnings } : read;
}

/**
 * Every core decoder, one per id (`CoreFormatId` is its keys).
 *
 * The order is also the magic-header scan order of `CORE_REGISTRY`; the landed
 * magics do not overlap, so the order changes nothing today.
 */
export interface CoreDecoders {
  /** §2 — the main game file. */
  gam: AssetDecoder<MainFile>;
  /** §4 — boards; the branch of §4.1 is decided inside. */
  board: AssetDecoder<DecodedBoard>;
  /** §3.1 — tilesets (`.tst` version 20, `.iso` version 30). */
  tileset: AssetDecoder<Tileset>;
  /** §7.1 — animations. */
  animation: AssetDecoder<Animation>;
  /** §6.1 — characters. */
  character: AssetDecoder<Character>;
  /** §6.2 — items. */
  item: AssetDecoder<Item>;
  /** §6.3 — enemies. */
  enemy: AssetDecoder<Enemy>;
  /** §8.1 — special moves. */
  "special-move": AssetDecoder<SpecialMove>;
  /** §8.2 — status effects. */
  "status-effect": AssetDecoder<StatusEffect>;
  /** §8.3 — battle backgrounds. */
  "battle-background": AssetDecoder<BattleBackground>;
  /** §10 — images (`decodeTexture` matches the PNG and JPEG signatures). */
  image: AssetDecoder<DecodedTexture>;
}

/** The id of a core decoder: the data formats `dump` parses, one per reader family. */
export type CoreFormatId = keyof CoreDecoders;

export const CORE_DECODERS: CoreDecoders = {
  gam: {
    id: "gam",
    section: "format-spec §2",
    extensions: ["gam"],
    detect: magicIs(MAIN_MAGIC),
    decode: (bytes) => readMainFile(new BinaryReader(bytes)),
  },
  board: {
    id: "board",
    section: "format-spec §4",
    extensions: ["brd"],
    detect: magicIs(BOARD_MAGIC),
    decode: (bytes) => decodeBoard(bytes),
  },
  tileset: {
    id: "tileset",
    section: "format-spec §3.1",
    extensions: ["tst", "iso"],
    detect: (header) =>
      header.length >= 2 && header[1] === 0 && TILESET_VERSION_BYTES.some((value) => header[0] === value),
    decode: (bytes) => readTileset(bytes),
  },
  animation: {
    id: "animation",
    section: "format-spec §7.1",
    extensions: ["anm"],
    detect: magicIs(ANIMATION_MAGIC),
    decode: (bytes) => readAnimation(new BinaryReader(bytes)),
  },
  character: {
    id: "character",
    section: "format-spec §6.1",
    extensions: ["tem"],
    detect: magicIs(CHARACTER_MAGIC),
    decode: (bytes) => readCharacter(new BinaryReader(bytes)),
  },
  item: {
    id: "item",
    section: "format-spec §6.2",
    extensions: ["itm"],
    detect: magicIs(ITEM_MAGIC),
    decode: (bytes) => readItem(new BinaryReader(bytes)),
  },
  enemy: {
    id: "enemy",
    section: "format-spec §6.3",
    extensions: ["ene"],
    detect: magicIs(ENEMY_MAGIC),
    decode: (bytes) => readEnemy(new BinaryReader(bytes)),
  },
  "special-move": {
    id: "special-move",
    section: "format-spec §8.1",
    extensions: ["spc"],
    detect: magicIs(SPECIAL_MOVE_MAGIC),
    decode: (bytes) => readSpecialMove(new BinaryReader(bytes)),
  },
  "status-effect": {
    id: "status-effect",
    section: "format-spec §8.2",
    extensions: ["ste"],
    detect: magicIs(STATUS_EFFECT_MAGIC),
    decode: (bytes) => readStatusEffect(new BinaryReader(bytes)),
  },
  "battle-background": {
    id: "battle-background",
    section: "format-spec §8.3",
    extensions: ["bkg"],
    detect: magicIs(BATTLE_BACKGROUND_MAGIC),
    decode: (bytes) => readBattleBackground(new BinaryReader(bytes)),
  },
  image: {
    id: "image",
    section: "format-spec §10",
    extensions: ["png", "jpg", "jpeg"],
    detect: (header) => startsWithBytes(header, PNG_SIGNATURE) || startsWithBytes(header, JPEG_SIGNATURE),
    decode: (bytes) => decodeTexture(bytes),
  },
};

/** The core format registry: the landed decoders, ready to dispatch (AD-31). */
export const CORE_REGISTRY = createAssetRegistry(Object.values(CORE_DECODERS));
