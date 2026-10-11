/**
 * The actor models and their constants (format-spec §6 sprites, §6.1
 * characters, §6.2 items, §6.3 enemies) plus the few reader/writer helpers all
 * three formats share.
 *
 * Players (`.tem`) and items (`.itm`) share a graphics model — directional
 * movement and idle animations, battle stances, custom stances and the two
 * sprite-local polygons (§6). Enemies (`.ene`) are their own, simpler shape.
 * Everything here is plain data (G2): the readers and writers consume a
 * caller-supplied `Uint8Array` and never touch a host.
 */

import { err, ok, type Result } from "../result.ts";
import { BinaryReader } from "../binary/reader.ts";
import { BinaryWriter } from "../binary/writer.ts";

// --- §6.1 Character (`.tem`) ------------------------------------------------

/** The magic every binary character starts with (format-spec §6.1, §1.3). */
export const CHARACTER_MAGIC = "RPGTLKIT CHAR";

/** The byte §6.1 inspects to tell a 2.x text character from a binary one. */
export const CHARACTER_DETECT_OFFSET = 13;

/** The lowest minor the §6.1 conditional rows describe (format-spec §6.1). */
export const CHARACTER_MIN_MINOR = 0;

/** The newest minor §6.1 describes; higher values are unsupported (§1.4). */
export const CHARACTER_MAX_MINOR = 8;

/** The section the character reader and writer implement (G7, format-spec §6.1). */
export const CHARACTER_SECTION = "format-spec §6.1";

// --- §6.2 Item (`.itm`) -----------------------------------------------------

/** The magic every binary item starts with (format-spec §6.2, §1.3). */
export const ITEM_MAGIC = "RPGTLKIT ITEM";

/** The byte §6.2 requires to be 0 to tell a text item from a binary one. */
export const ITEM_DETECT_OFFSET = 13;

/** The lowest minor the §6.2 conditional rows describe (format-spec §6.2). */
export const ITEM_MIN_MINOR = 0;

/** The newest minor §6.2 describes; higher values are unsupported (§1.4). */
export const ITEM_MAX_MINOR = 7;

/** The section the item reader and writer implement (G7, format-spec §6.2). */
export const ITEM_SECTION = "format-spec §6.2";

/** The first item minor whose `i16` price/bonus fields widen to `i32` (§6.2). */
export const ITEM_I32_MINOR = 3;

/** The first item minor that stores movement animations and custom stances (§6.2). */
export const ITEM_MOVEMENT_MINOR = 4;

/** The first item minor that stores idle animations and speed/idleTime (§6.2). */
export const ITEM_IDLE_MINOR = 5;

/** The first item minor that stores the two vector bases (§6.2). */
export const ITEM_BASES_MINOR = 7;

// --- §6.3 Enemy (`.ene`) ----------------------------------------------------

/** The magic every binary enemy starts with (format-spec §6.3, §1.3). */
export const ENEMY_MAGIC = "RPGTLKIT ENEMY";

/** The byte §6.3 inspects to tell a 2.0 text enemy from a binary one. */
export const ENEMY_DETECT_OFFSET = 14;

/** The only binary enemy minor (2.1); minor 0 is the 2.0 text form (§6.3). */
export const ENEMY_BINARY_MINOR = 1;

/** The major every enemy carries (format-spec §6.3). */
export const ENEMY_MAJOR = 2;

/** The section the enemy reader and writer implement (G7, format-spec §6.3). */
export const ENEMY_SECTION = "format-spec §6.3";

// --- Shared slot counts (format-spec §6.1, §6.2, §6.3) ----------------------

/** The nine script-variable-name slots of a character (format-spec §6.1). */
export const CHARACTER_VARIABLE_SLOTS = 9;

/** The fixed special-move slot count of a character (format-spec §6.1). */
export const SPECIAL_MOVE_SLOTS = 201;

/** The eleven accessory-slot names of a character (format-spec §6.1). */
export const ACCESSORY_SLOT_COUNT = 11;

/** The seven body-slot flags of a character (format-spec §6.1). */
export const BODY_SLOT_COUNT = 7;

/** The eight directional slots shared by movement and idle animations (§6, §6.1). */
export const DIRECTIONAL_ANIMATION_COUNT = 8;

/** The five battle stances FIGHT, DEFEND, SPECIAL MOVE, DIE, REST (§6, §6.1). */
export const BATTLE_STANCE_COUNT = 5;

/** The battle-stance block including its one reserved trailing slot (§6.1). */
export const BATTLE_STANCE_SLOTS = 6;

/** The four per-level stat increases HP, DP, FP, SMP (format-spec §6.1). */
export const LEVEL_INCREASE_COUNT = 4;

/** The four obsolete battle-sound slots of a minor < 5 character (§6.1). */
export const BATTLE_SOUND_COUNT = 4;

/** The 51 allowed-character handle slots of an item (format-spec §6.2). */
export const ITEM_CHARACTER_SLOTS = 51;

/** The eight equipment-slot flags head … accessory of an item (§6.2). */
export const EQUIP_SLOT_COUNT = 8;

/** The four equip-bonus stats HP, DP, FP, SMP of an item (§6.2). */
export const EQUIP_BONUS_COUNT = 4;

/** The five `i8` item use flags: equipable, menu, board, battle, usedBy (§6.2). */
export const ITEM_USE_FLAG_COUNT = 5;

/** The sixteen legacy two-tile-tall walk frames of a minor < 4 item (§6.2). */
export const LEGACY_WALK_FRAME_COUNT = 16;

/** The two legacy rest tiles of a minor < 4 item (format-spec §6.2). */
export const LEGACY_REST_TILE_COUNT = 2;

/**
 * The seven body-slot names of a character (format-spec §6.1). Index 0 is the
 * unused padding byte the VB6 1-based `armorType(6)` array left behind; bytes
 * 1..6 are head, neck, left hand, right hand, body, legs.
 */
export const BODY_SLOT_NAMES = [
  "padding",
  "head",
  "neck",
  "leftHand",
  "rightHand",
  "body",
  "legs",
] as const;

// --- Shared model types (format-spec §6) ------------------------------------

/** An `(x, y)` position in sprite-local pixels, relative to the anchor (§6). */
export interface ActorPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * One closed vector polygon in sprite-local pixels (format-spec §6). A sprite
 * stores two: the collision base (the solid footprint) first, then the
 * activation base (the area the player must touch to interact).
 */
export interface ActorBase {
  readonly points: readonly ActorPoint[];
}

/** One (animation → handle) custom stance (format-spec §6.1, §6.2, §6.3). */
export interface ActorStance {
  readonly animation: string;
  readonly handle: string;
}

/** One special-move slot of a character and its learn condition (§6.1). */
export interface CharacterSpecialMove {
  /** The move's animation/program file. */
  readonly file: string;
  /** The minimum experience needed to learn the move. */
  readonly minExp: number;
  /** The minimum level needed to learn the move. */
  readonly minLevel: number;
  /** The script variable the learn condition tests. */
  readonly condVar: string;
  /** The value the condition must equal. */
  readonly condValue: string;
}

/** The eight initial stats of a character in file order (format-spec §6.1). */
export interface CharacterStats {
  readonly experience: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly dp: number;
  readonly fp: number;
  readonly smp: number;
  readonly maxSmp: number;
  readonly level: number;
}

/**
 * A whole player character (format-spec §6.1).
 *
 * The conditional fields are `undefined` when the character's `minor` does not
 * store them; the writer keys every conditional row on `minor`, so a model
 * built by `readCharacter` always writes back byte for byte. `maxLevel === 0`
 * means level progression is disabled: the level-up condition (`level >=
 * maxLevel`) is satisfied immediately (§6.1).
 */
export interface Character {
  readonly magic: string;
  readonly major: number;
  readonly minor: number;
  readonly name: string;
  /**
   * The nine script-variable names in exact order (experience, DP, FP, HP, max
   * HP, name, SMP, max SMP, level). Kept verbatim, including the legacy VB type
   * tag (`!`/`$`) that §6.1 says callers strip.
   */
  readonly variableNames: readonly string[];
  readonly stats: CharacterStats;
  readonly profilePicture: string;
  /** The fixed 201 special-move slots; empty slots are kept (§6.1). */
  readonly specialMoves: readonly CharacterSpecialMove[];
  readonly specialMoveCategory: string;
  /** The stored `i8` flag: 0 = the character has special moves, 1 = not (§6.1). */
  readonly hasSpecialMoves: number;
  /** The eleven accessory-slot names (format-spec §6.1). */
  readonly accessorySlots: readonly string[];
  /** The seven body-slot flags; index 0 is padding, 1..6 are the slots (§6.1). */
  readonly bodySlots: readonly number[];
  /** Initial experience for the first level-up; `i8` at minor 3, else `i32` (§6.1). */
  readonly firstLevelExp: number;
  /** Experience increase per level: percent or points (§6.1). */
  readonly experienceIncrease: number;
  /** The maximum level; 0 disables level progression (format-spec §6.1). */
  readonly maxLevel: number;
  /** Per-level increase of HP, DP, FP, SMP (format-spec §6.1). */
  readonly levelIncreases: readonly number[];
  /** The four obsolete battle sounds; only present at `minor < 5` (§6.1). */
  readonly battleSounds: readonly string[] | undefined;
  readonly levelUpProgram: string;
  /** The stored `i8`: 0 = exponential/percent, 1 = linear/points (§6.1). */
  readonly levelUpType: number;
  /** The stored legacy size type: 0 = 32×32, 1 = 64×32 (§6.1). */
  readonly sizeType: number;
  /** Movement animations S, N, E, W, NW, NE, SW, SE; `minor >= 5` (§6.1). */
  readonly movementAnimations: readonly string[] | undefined;
  /**
   * FIGHT, DEFEND, SPECIAL MOVE, DIE, REST then one reserved slot; six strings,
   * `minor >= 5` (format-spec §6.1).
   */
  readonly battleStances: readonly string[] | undefined;
  /** Idle animations, same direction order; `minor >= 6` (§6.1). */
  readonly idleAnimations: readonly string[] | undefined;
  /** Seconds before idle animations begin; `minor >= 7` (§6.1). */
  readonly idleTime: number | undefined;
  /** Seconds per animation frame / step; `minor >= 7` (§6.1). */
  readonly speed: number | undefined;
  /** The custom-stance pairs; `minor >= 5` (§6.1). */
  readonly customStances: readonly ActorStance[] | undefined;
  /**
   * The two vector bases, collision then activation; `minor >= 8` (§6.1). The
   * stored upper bound is what decides the count: stored `1` means two bases,
   * stored `-1` means none.
   */
  readonly vectorBases: readonly ActorBase[] | undefined;
  /**
   * Trailing bytes the §6.1 layout did not cover, kept verbatim so a writer
   * reproduces the input exactly (AD-18). A non-empty residue is a warning.
   */
  readonly residue: Uint8Array;
}

/** One legacy two-tile-tall walk frame of a minor < 4 item (§6.2). */
export interface LegacyWalkFrame {
  readonly top: string;
  readonly bottom: string;
}

/**
 * The legacy walk frames of a minor < 4 item (§6.2): sixteen frames (four per
 * direction S, E, N, W), each a top and a bottom tile, then two rest tiles. A
 * consumer synthesises 1×2 tile bitmaps and 4-frame animations from these.
 */
export interface LegacyWalk {
  readonly frames: readonly LegacyWalkFrame[];
  readonly restTiles: readonly string[];
}

/**
 * A whole item — an inventory object, a piece of equipment or a board NPC
 * (format-spec §6.2).
 *
 * The conditional fields are `undefined` when the item's `minor` does not store
 * them. Note the delivery-order trap of §6.2: items store `speed` then
 * `idleTime`, the opposite order from characters, and the custom-stance block
 * sits right after the ten movement strings at `minor = 4` but after the idle
 * animations and speed/idleTime at `minor >= 5`.
 */
export interface Item {
  readonly magic: string;
  readonly major: number;
  readonly minor: number;
  /** The item's name / board handle (format-spec §6.2). */
  readonly name: string;
  readonly description: string;
  /** The stored `i8` equipable flag (0 = all, 1 = listed) (format-spec §6.2). */
  readonly equipable: number;
  /** The stored `i8` menu-usable flag (format-spec §6.2). */
  readonly menuUsable: number;
  /** The stored `i8` board-usable flag (format-spec §6.2). */
  readonly boardUsable: number;
  /** The stored `i8` battle-usable flag (format-spec §6.2). */
  readonly battleUsable: number;
  /** The stored `i8` usedBy flag (0 = all, 1 = the 51 listed handles) (§6.2). */
  readonly usedBy: number;
  /** The 51 allowed-character handle slots; empty slots are kept (§6.2). */
  readonly allowedCharacters: readonly string[];
  /** Buy price; `i32` at `minor >= 3`, else `i16` (format-spec §6.2). */
  readonly buyPrice: number;
  /** Sell price; `i32` at `minor >= 3`, else `i16` (format-spec §6.2). */
  readonly sellPrice: number;
  /** The stored `i8` key-item flag (cannot be dropped) (§6.2). */
  readonly keyItem: number;
  /** The eight equipment-slot flags head … accessory (format-spec §6.2). */
  readonly equipSlots: readonly number[];
  readonly accessoryName: string;
  /** Equip bonus HP, DP, FP, SMP; `i32` at `minor >= 3`, else `i16` (§6.2). */
  readonly equipBonus: readonly number[];
  readonly onEquipProgram: string;
  readonly onRemoveProgram: string;
  /** Menu use +HP, +SMP; `i32` at `minor >= 3`, else `i16` (§6.2). */
  readonly menuUseHp: number;
  readonly menuUseSmp: number;
  readonly menuUseProgram: string;
  /** Battle use +HP, +SMP; `i32` at `minor >= 3`, else `i16` (§6.2). */
  readonly battleUseHp: number;
  readonly battleUseSmp: number;
  readonly battleUseProgram: string;
  readonly battleAnimation: string;
  /** The thread that runs while the item is on the board (format-spec §6.2). */
  readonly multitaskProgram: string;
  /** The program that runs when the player interacts (format-spec §6.2). */
  readonly activationProgram: string;
  /** The stored legacy size type (format-spec §6.2). */
  readonly sizeType: number;
  /** Movement animations S, N, E, W, NW, NE, SW, SE; `minor >= 4` (§6.2). */
  readonly movementAnimations: readonly string[] | undefined;
  /** The legacy rest animation; at `minor < 6` it is the idle-South one (§6.2). */
  readonly restAnimation: string | undefined;
  /** The one reserved string after the movement block; `minor >= 4` (§6.2). */
  readonly reservedAnimation: string | undefined;
  /** Idle animations, same direction order; `minor >= 5` (§6.2). */
  readonly idleAnimations: readonly string[] | undefined;
  /** Seconds per animation frame / step; `minor >= 5` (items store speed first). */
  readonly speed: number | undefined;
  /** Seconds before idle animations begin; `minor >= 5` (§6.2). */
  readonly idleTime: number | undefined;
  /** The custom-stance pairs; `minor >= 4` (placement differs by minor) (§6.2). */
  readonly customStances: readonly ActorStance[] | undefined;
  /**
   * The two vector bases, collision then activation; `minor >= 7` (§6.2). Same
   * upper-bound rule as characters: stored `1` means two bases.
   */
  readonly vectorBases: readonly ActorBase[] | undefined;
  /** The legacy two-tile-tall walk frames; only present at `minor < 4` (§6.2). */
  readonly legacyWalk: LegacyWalk | undefined;
  /** Trailing bytes the §6.2 layout did not cover, kept verbatim (AD-18). */
  readonly residue: Uint8Array;
}

/**
 * A whole enemy (format-spec §6.3).
 *
 * Only the binary minor 1 form is represented; the 2.0 text form is rejected.
 * The stance list keeps its six slots so the indices stay stable: slot 0 REST,
 * 1 FIGHT/ATTACK, 2 DEFEND, 3 SPECIAL MOVE, 4 DIE, 5 unused padding.
 */
export interface Enemy {
  readonly magic: string;
  readonly major: number;
  readonly minor: number;
  readonly name: string;
  /** The `i32` HP, stored equal to the maximum (format-spec §6.3). */
  readonly hp: number;
  /** The `i32` SMP, stored equal to the maximum (format-spec §6.3). */
  readonly smp: number;
  readonly fp: number;
  readonly dp: number;
  /** The stored `i8` flag: 0 = the player cannot run (format-spec §6.3). */
  readonly canRun: number;
  /** 1-in-N chance of a critical hit **on** this enemy (defence ignored) (§6.3). */
  readonly criticalOn: number;
  /** 1-in-N chance of a critical hit **by** this enemy (format-spec §6.3). */
  readonly criticalBy: number;
  /** Special-move files (upper bound, then files) (format-spec §6.3). */
  readonly specialMoves: readonly string[];
  /** Special moves that hurt this enemy more (format-spec §6.3). */
  readonly weaknesses: readonly string[];
  /** Special moves this enemy resists (format-spec §6.3). */
  readonly strengths: readonly string[];
  /** AI level 0–3 (low, medium, high, very high) (format-spec §6.3). */
  readonly aiLevel: number;
  /** The stored `i8` flag to use the custom AI program (format-spec §6.3). */
  readonly customAi: number;
  readonly aiProgram: string;
  readonly experienceReward: number;
  readonly goldReward: number;
  readonly defeatProgram: string;
  readonly runAwayProgram: string;
  /** The six stance slots 0..5 (stored bound 5); slot 5 is unused (§6.3). */
  readonly stances: readonly string[];
  /** The custom-stance pairs; the bound is an `i32`, not an `i16` (§6.3). */
  readonly customStances: readonly ActorStance[];
  /** Trailing bytes the §6.3 layout did not cover, kept verbatim (AD-18). */
  readonly residue: Uint8Array;
}

// --- Shared reader/writer helpers (format-spec §1.2, §6) --------------------

/** A located failure while reading an actor (AD-18). */
export function actorError(
  reader: BinaryReader,
  offset: number,
  section: string,
  message: string,
): Result<never> {
  return err({
    ...(reader.path === undefined ? {} : { path: reader.path }),
    offset,
    section,
    message,
  });
}

/**
 * Read an `i16`-bounded list of strings (format-spec §1.2, §6). Every entry is
 * kept, empty ones included; the bound is checked against the bytes that remain
 * so a damaged file cannot make the reader loop (each string needs at least the
 * `0x00` terminator).
 */
export function readBoundedStrings(reader: BinaryReader): Result<string[]> {
  const boundResult = reader.readUpperBound();
  if (!boundResult.ok) {
    return boundResult;
  }
  const count = boundResult.value;
  if (count > reader.remaining) {
    return actorError(
      reader,
      reader.offset,
      "format-spec §1.2",
      `a string list's upper bound needs ${count} entries but only ${reader.remaining} byte(s) remain`,
    );
  }
  const values: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const value = reader.str();
    if (!value.ok) {
      return value;
    }
    values.push(value.value);
  }
  return ok(values);
}

/**
 * Read exactly `count` NUL-terminated strings (format-spec §1.1, §6). Used for
 * the fixed-size blocks (`str × 8`, `str × 51`, …) whose count is not stored.
 */
export function readStrings(reader: BinaryReader, count: number): Result<string[]> {
  const values: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const value = reader.str();
    if (!value.ok) {
      return value;
    }
    values.push(value.value);
  }
  return ok(values);
}

/** Read exactly `count` copies of a one-byte integer. */
export function readBytes(reader: BinaryReader, count: number): Result<number[]> {
  const values: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const value = reader.i8();
    if (!value.ok) {
      return value;
    }
    values.push(value.value);
  }
  return ok(values);
}

/**
 * Read a list of vector bases (format-spec §6.1, §6.2): an `i16` upper bound
 * (`1` means two bases, `-1` means none), then each base as an `i16` points
 * upper bound followed by `i32 x, i32 y` pairs.
 */
export function readBases(reader: BinaryReader, section: string): Result<ActorBase[]> {
  const countResult = reader.readUpperBound();
  if (!countResult.ok) {
    return countResult;
  }
  const bases: ActorBase[] = [];
  for (let i = 0; i < countResult.value; i += 1) {
    const pointCount = reader.readUpperBound();
    if (!pointCount.ok) {
      return pointCount;
    }
    if (pointCount.value > Math.floor(reader.remaining / 8)) {
      return actorError(
        reader,
        reader.offset,
        section,
        `a vector base needs ${pointCount.value} points (${pointCount.value * 8} bytes) but only ${reader.remaining} byte(s) remain`,
      );
    }
    const points: ActorPoint[] = [];
    for (let p = 0; p < pointCount.value; p += 1) {
      const x = reader.i32();
      if (!x.ok) {
        return x;
      }
      const y = reader.i32();
      if (!y.ok) {
        return y;
      }
      points.push({ x: x.value, y: y.value });
    }
    bases.push({ points });
  }
  return ok(bases);
}

/** A located error from a writer for a value it cannot encode (AD-18). */
export function writerError(writer: BinaryWriter, section: string, message: string): Result<never> {
  return err({ offset: writer.toBytes().length, section, message });
}

/**
 * Append exactly `count` NUL-terminated strings (format-spec §1.1, §6). A
 * fixed-size block with the wrong number of entries cannot be serialised, so a
 * mismatch is a located error rather than a silently short file.
 */
export function writeFixedStrings(
  writer: BinaryWriter,
  values: readonly string[],
  count: number,
  section: string,
  what: string,
): Result<void> {
  if (values.length !== count) {
    return writerError(
      writer,
      section,
      `${what} needs exactly ${count} entries but the model has ${values.length}`,
    );
  }
  return writeStrings(writer, values, section, what);
}

/** Append exactly `count` copies of a one-byte integer. */
export function writeFixedBytes(
  writer: BinaryWriter,
  values: readonly number[],
  count: number,
  section: string,
  what: string,
): Result<void> {
  if (values.length !== count) {
    return writerError(
      writer,
      section,
      `${what} needs exactly ${count} entries but the model has ${values.length}`,
    );
  }
  for (const value of values) {
    writer.i8(value);
  }
  return ok(undefined);
}

/**
 * Append an `i16`-bounded list of strings (format-spec §1.2, §6). The bound is
 * derived back from the array length, so empty slots round-trip and indices
 * stay stable.
 */
export function writeBoundedStrings(
  writer: BinaryWriter,
  values: readonly string[],
  section: string,
  what: string,
): Result<void> {
  if (values.length > 32_768) {
    return writerError(
      writer,
      section,
      `${what} has ${values.length} entries but the i16 upper bound holds at most 32768`,
    );
  }
  writer.i16(values.length === 0 ? -1 : values.length - 1);
  return writeStrings(writer, values, section, what);
}

/** Append a list of strings with no bound of its own (a fixed block). */
export function writeStrings(
  writer: BinaryWriter,
  values: readonly string[],
  section: string,
  what: string,
): Result<void> {
  for (const value of values) {
    const written = writer.str(value);
    if (!written.ok) {
      return writerError(writer, section, `${what}: ${written.error.message}`);
    }
  }
  return ok(undefined);
}

/**
 * Append the `i16` bound of a list that is not a string list (vector bases,
 * custom stances): `-1` for none, else `count - 1` (format-spec §1.2).
 */
export function writeBound(writer: BinaryWriter, count: number, width: "i16" | "i32"): void {
  const stored = count === 0 ? -1 : count - 1;
  if (width === "i32") {
    writer.i32(stored);
  } else {
    writer.i16(stored);
  }
}

/** Append a list of vector bases (format-spec §6.1, §6.2). */
export function writeBases(
  writer: BinaryWriter,
  bases: readonly ActorBase[],
  section: string,
): Result<void> {
  writeBound(writer, bases.length, "i16");
  for (const base of bases) {
    writeBound(writer, base.points.length, "i16");
    for (const point of base.points) {
      writer.i32(point.x);
      writer.i32(point.y);
    }
  }
  return ok(undefined);
}

/**
 * Append a custom-stance list (format-spec §6.1, §6.2, §6.3): an `i32` upper
 * bound, then the `animation, handle` pairs. Empty pairs are written back
 * verbatim; §6.1's "skip if either is empty" is a rule for consumers.
 */
export function writeStances(
  writer: BinaryWriter,
  stances: readonly ActorStance[],
  section: string,
): Result<void> {
  writeBound(writer, stances.length, "i32");
  for (const stance of stances) {
    const animation = writer.str(stance.animation);
    if (!animation.ok) {
      return writerError(writer, section, `custom stance animation: ${animation.error.message}`);
    }
    const handle = writer.str(stance.handle);
    if (!handle.ok) {
      return writerError(writer, section, `custom stance handle: ${handle.error.message}`);
    }
  }
  return ok(undefined);
}

/** Read a custom-stance list: `i32` upper bound, then the pairs (§6.1–§6.3). */
export function readStances(reader: BinaryReader, section: string): Result<ActorStance[]> {
  const countResult = reader.readUpperBound("i32");
  if (!countResult.ok) {
    return countResult;
  }
  const count = countResult.value;
  if (count > Math.floor(reader.remaining / 2)) {
    return actorError(
      reader,
      reader.offset,
      section,
      `custom stances: ${count} pairs need at least ${count * 2} byte(s) but only ${reader.remaining} remain`,
    );
  }
  const stances: ActorStance[] = [];
  for (let i = 0; i < count; i += 1) {
    const animation = reader.str();
    if (!animation.ok) {
      return animation;
    }
    const handle = reader.str();
    if (!handle.ok) {
      return handle;
    }
    stances.push({ animation: animation.value, handle: handle.value });
  }
  return ok(stances);
}
