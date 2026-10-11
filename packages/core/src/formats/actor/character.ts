/**
 * Reading and writing a player character (format-spec §6.1, magic
 * `RPGTLKIT CHAR`).
 *
 * Pure (G2): both functions consume/produce a caller-supplied byte buffer and
 * never touch a host. The reader never throws (AD-18): a wrong magic, an
 * unsupported minor, the 2.x text form and a truncated file all come back as a
 * located `FormatError`. The writer emits the version the model carries and
 * reproduces the bytes `readCharacter` consumed exactly, so an unmodified
 * character writes back byte for byte.
 */

import { ok, type Result } from "../result.ts";
import { BinaryReader } from "../binary/reader.ts";
import { BinaryWriter } from "../binary/writer.ts";
import {
  ACCESSORY_SLOT_COUNT,
  BATTLE_SOUND_COUNT,
  BATTLE_STANCE_SLOTS,
  BODY_SLOT_COUNT,
  CHARACTER_DETECT_OFFSET,
  CHARACTER_MAGIC,
  CHARACTER_MAX_MINOR,
  CHARACTER_MIN_MINOR,
  CHARACTER_SECTION,
  CHARACTER_VARIABLE_SLOTS,
  DIRECTIONAL_ANIMATION_COUNT,
  LEVEL_INCREASE_COUNT,
  SPECIAL_MOVE_SLOTS,
  actorError,
  readBases,
  readBytes,
  readStances,
  readStrings,
  writeBases,
  writeFixedBytes,
  writeFixedStrings,
  writeStances,
  writerError,
  type ActorBase,
  type ActorStance,
  type Character,
  type CharacterStats,
  type CharacterSpecialMove,
} from "./model.ts";

/** The minor whose first-level-exp field is an `i8` rather than an `i32` (§6.1). */
const FIRST_LEVEL_EXP_I8_MINOR = 3;

/** Read one special-move slot (format-spec §6.1). */
function readSpecialMove(reader: BinaryReader): Result<CharacterSpecialMove> {
  const file = reader.str();
  if (!file.ok) {
    return file;
  }
  const minExp = reader.i32();
  if (!minExp.ok) {
    return minExp;
  }
  const minLevel = reader.i32();
  if (!minLevel.ok) {
    return minLevel;
  }
  const condVar = reader.str();
  if (!condVar.ok) {
    return condVar;
  }
  const condValue = reader.str();
  if (!condValue.ok) {
    return condValue;
  }
  return ok({
    file: file.value,
    minExp: minExp.value,
    minLevel: minLevel.value,
    condVar: condVar.value,
    condValue: condValue.value,
  });
}

/** Read the eight `i32` initial stats in file order (format-spec §6.1). */
function readStats(reader: BinaryReader): Result<CharacterStats> {
  const order: ("experience" | "hp" | "maxHp" | "dp" | "fp" | "smp" | "maxSmp" | "level")[] = [
    "experience",
    "hp",
    "maxHp",
    "dp",
    "fp",
    "smp",
    "maxSmp",
    "level",
  ];
  const stats: Record<string, number> = {};
  for (const name of order) {
    const value = reader.i32();
    if (!value.ok) {
      return value;
    }
    stats[name] = value.value;
  }
  return ok(stats as unknown as CharacterStats);
}

/** Read a character from `reader` (format-spec §6.1). */
export function readCharacter(reader: BinaryReader): Result<Character> {
  const start = reader.offset;
  const header = reader.header();
  // §6.1 places the detection byte at offset 13, just past the magic; the probe
  // does not move the cursor, so the header is read first and the detection
  // checked before any header error — a text character has no binary magic.
  const detection = reader.isBinaryAt(start + CHARACTER_DETECT_OFFSET);
  if (detection.ok && !detection.value) {
    const offset = start + CHARACTER_DETECT_OFFSET;
    return actorError(
      reader,
      offset,
      CHARACTER_SECTION,
      `${CHARACTER_MAGIC}: unsupported 2.x line-oriented text character (byte at offset ${offset} is non-NUL); only the binary form is implemented`,
    );
  }
  if (!header.ok) {
    return header;
  }
  if (header.value.magic !== CHARACTER_MAGIC) {
    return actorError(
      reader,
      start,
      CHARACTER_SECTION,
      `not a character: magic is "${header.value.magic}", expected "${CHARACTER_MAGIC}"`,
    );
  }
  if (header.value.major < 0 || header.value.minor < 0) {
    return actorError(
      reader,
      reader.offset - 2,
      "format-spec §1.4",
      `invalid negative version ${header.value.major}.${header.value.minor}`,
    );
  }
  if (header.value.minor < CHARACTER_MIN_MINOR || header.value.minor > CHARACTER_MAX_MINOR) {
    return actorError(
      reader,
      reader.offset - 2,
      CHARACTER_SECTION,
      `unsupported character minor version ${header.value.minor}: this reader implements ${CHARACTER_MIN_MINOR}..${CHARACTER_MAX_MINOR}`,
    );
  }
  const minor = header.value.minor;

  const name = reader.str();
  if (!name.ok) {
    return name;
  }
  const variableNames = readStrings(reader, CHARACTER_VARIABLE_SLOTS);
  if (!variableNames.ok) {
    return variableNames;
  }
  const stats = readStats(reader);
  if (!stats.ok) {
    return stats;
  }
  const profilePicture = reader.str();
  if (!profilePicture.ok) {
    return profilePicture;
  }

  const specialMoves: CharacterSpecialMove[] = [];
  for (let i = 0; i < SPECIAL_MOVE_SLOTS; i += 1) {
    const move = readSpecialMove(reader);
    if (!move.ok) {
      return move;
    }
    specialMoves.push(move.value);
  }

  const specialMoveCategory = reader.str();
  if (!specialMoveCategory.ok) {
    return specialMoveCategory;
  }
  const hasSpecialMoves = reader.i8();
  if (!hasSpecialMoves.ok) {
    return hasSpecialMoves;
  }
  const accessorySlots = readStrings(reader, ACCESSORY_SLOT_COUNT);
  if (!accessorySlots.ok) {
    return accessorySlots;
  }
  const bodySlots = readBytes(reader, BODY_SLOT_COUNT);
  if (!bodySlots.ok) {
    return bodySlots;
  }

  let firstLevelExp: number;
  if (minor === FIRST_LEVEL_EXP_I8_MINOR) {
    const value = reader.i8();
    if (!value.ok) {
      return value;
    }
    firstLevelExp = value.value;
  } else {
    const value = reader.i32();
    if (!value.ok) {
      return value;
    }
    firstLevelExp = value.value;
  }

  const experienceIncrease = reader.i16();
  if (!experienceIncrease.ok) {
    return experienceIncrease;
  }
  const maxLevel = reader.i32();
  if (!maxLevel.ok) {
    return maxLevel;
  }
  const levelIncreases: number[] = [];
  for (let i = 0; i < LEVEL_INCREASE_COUNT; i += 1) {
    const value = reader.i16();
    if (!value.ok) {
      return value;
    }
    levelIncreases.push(value.value);
  }

  let battleSounds: string[] | undefined;
  if (minor < 5) {
    const sounds = readStrings(reader, BATTLE_SOUND_COUNT);
    if (!sounds.ok) {
      return sounds;
    }
    battleSounds = sounds.value;
  }

  const levelUpProgram = reader.str();
  if (!levelUpProgram.ok) {
    return levelUpProgram;
  }
  const levelUpType = reader.i8();
  if (!levelUpType.ok) {
    return levelUpType;
  }
  const sizeType = reader.i8();
  if (!sizeType.ok) {
    return sizeType;
  }

  let movementAnimations: string[] | undefined;
  let battleStances: string[] | undefined;
  let idleAnimations: string[] | undefined;
  let idleTime: number | undefined;
  let speed: number | undefined;
  let customStances: ActorStance[] | undefined;
  let vectorBases: ActorBase[] | undefined;

  if (minor >= 5) {
    const movements = readStrings(reader, DIRECTIONAL_ANIMATION_COUNT);
    if (!movements.ok) {
      return movements;
    }
    movementAnimations = movements.value;
    const stances = readStrings(reader, BATTLE_STANCE_SLOTS);
    if (!stances.ok) {
      return stances;
    }
    battleStances = stances.value;
  }
  if (minor >= 6) {
    const idle = readStrings(reader, DIRECTIONAL_ANIMATION_COUNT);
    if (!idle.ok) {
      return idle;
    }
    idleAnimations = idle.value;
  }
  if (minor >= 7) {
    const idleSeconds = reader.f64();
    if (!idleSeconds.ok) {
      return idleSeconds;
    }
    idleTime = idleSeconds.value;
    const speedSeconds = reader.f64();
    if (!speedSeconds.ok) {
      return speedSeconds;
    }
    speed = speedSeconds.value;
  }
  if (minor >= 5) {
    const stances = readStances(reader, CHARACTER_SECTION);
    if (!stances.ok) {
      return stances;
    }
    customStances = stances.value;
  }
  if (minor >= 8) {
    const bases = readBases(reader, CHARACTER_SECTION);
    if (!bases.ok) {
      return bases;
    }
    vectorBases = bases.value;
  }

  const residue = reader.readBytes(reader.remaining);
  if (!residue.ok) {
    return residue;
  }
  const warnings: string[] = [];
  if (residue.value.length > 0) {
    warnings.push(
      `${residue.value.length} trailing byte(s) after the character were kept as residue (format-spec §6.1)`,
    );
  }

  return ok(
    {
      magic: header.value.magic,
      major: header.value.major,
      minor,
      name: name.value,
      variableNames: variableNames.value,
      stats: stats.value,
      profilePicture: profilePicture.value,
      specialMoves,
      specialMoveCategory: specialMoveCategory.value,
      hasSpecialMoves: hasSpecialMoves.value,
      accessorySlots: accessorySlots.value,
      bodySlots: bodySlots.value,
      firstLevelExp,
      experienceIncrease: experienceIncrease.value,
      maxLevel: maxLevel.value,
      levelIncreases,
      battleSounds,
      levelUpProgram: levelUpProgram.value,
      levelUpType: levelUpType.value,
      sizeType: sizeType.value,
      movementAnimations,
      battleStances,
      idleAnimations,
      idleTime,
      speed,
      customStances,
      vectorBases,
      residue: residue.value,
    },
    warnings,
  );
}

/** Serialise `model` to the character layout (format-spec §6.1). */
export function writeCharacter(model: Character): Result<Uint8Array> {
  const writer = new BinaryWriter();
  writer.str(model.magic);
  writer.i16(model.major);
  writer.i16(model.minor);

  writer.str(model.name);
  const names = writeFixedStrings(
    writer,
    model.variableNames,
    CHARACTER_VARIABLE_SLOTS,
    CHARACTER_SECTION,
    "script variable names",
  );
  if (!names.ok) {
    return names;
  }

  writer.i32(model.stats.experience);
  writer.i32(model.stats.hp);
  writer.i32(model.stats.maxHp);
  writer.i32(model.stats.dp);
  writer.i32(model.stats.fp);
  writer.i32(model.stats.smp);
  writer.i32(model.stats.maxSmp);
  writer.i32(model.stats.level);

  writer.str(model.profilePicture);
  const moves = writeFixedStrings(
    writer,
    model.specialMoves.map((move) => move.file),
    SPECIAL_MOVE_SLOTS,
    CHARACTER_SECTION,
    "special-move files",
  );
  if (!moves.ok) {
    return moves;
  }
  for (const move of model.specialMoves) {
    writer.i32(move.minExp);
    writer.i32(move.minLevel);
    writer.str(move.condVar);
    writer.str(move.condValue);
  }

  writer.str(model.specialMoveCategory);
  writer.i8(model.hasSpecialMoves);
  const accessories = writeFixedStrings(
    writer,
    model.accessorySlots,
    ACCESSORY_SLOT_COUNT,
    CHARACTER_SECTION,
    "accessory slot names",
  );
  if (!accessories.ok) {
    return accessories;
  }
  const body = writeFixedBytes(
    writer,
    model.bodySlots,
    BODY_SLOT_COUNT,
    CHARACTER_SECTION,
    "body slots",
  );
  if (!body.ok) {
    return body;
  }

  if (model.minor === FIRST_LEVEL_EXP_I8_MINOR) {
    writer.i8(model.firstLevelExp);
  } else {
    writer.i32(model.firstLevelExp);
  }
  writer.i16(model.experienceIncrease);
  writer.i32(model.maxLevel);
  if (model.levelIncreases.length !== LEVEL_INCREASE_COUNT) {
    return writerError(
      writer,
      CHARACTER_SECTION,
      `per-level increases need exactly ${LEVEL_INCREASE_COUNT} entries but the model has ${model.levelIncreases.length}`,
    );
  }
  for (const value of model.levelIncreases) {
    writer.i16(value);
  }

  if (model.minor < 5) {
    const sounds = model.battleSounds ?? [];
    const written = writeFixedStrings(
      writer,
      sounds,
      BATTLE_SOUND_COUNT,
      CHARACTER_SECTION,
      "obsolete battle sounds",
    );
    if (!written.ok) {
      return written;
    }
  }

  writer.str(model.levelUpProgram);
  writer.i8(model.levelUpType);
  writer.i8(model.sizeType);

  if (model.minor >= 5) {
    const movements = writeFixedStrings(
      writer,
      model.movementAnimations ?? [],
      DIRECTIONAL_ANIMATION_COUNT,
      CHARACTER_SECTION,
      "movement animations",
    );
    if (!movements.ok) {
      return movements;
    }
    const stances = writeFixedStrings(
      writer,
      model.battleStances ?? [],
      BATTLE_STANCE_SLOTS,
      CHARACTER_SECTION,
      "battle stances",
    );
    if (!stances.ok) {
      return stances;
    }
  }
  if (model.minor >= 6) {
    const idle = writeFixedStrings(
      writer,
      model.idleAnimations ?? [],
      DIRECTIONAL_ANIMATION_COUNT,
      CHARACTER_SECTION,
      "idle animations",
    );
    if (!idle.ok) {
      return idle;
    }
  }
  if (model.minor >= 7) {
    writer.f64(model.idleTime ?? 0);
    writer.f64(model.speed ?? 0);
  }
  if (model.minor >= 5) {
    const stances = writeStances(writer, model.customStances ?? [], CHARACTER_SECTION);
    if (!stances.ok) {
      return stances;
    }
  }
  if (model.minor >= 8) {
    const bases = writeBases(writer, model.vectorBases ?? [], CHARACTER_SECTION);
    if (!bases.ok) {
      return bases;
    }
  }

  writer.writeBytes(model.residue);
  return ok(writer.toBytes());
}
