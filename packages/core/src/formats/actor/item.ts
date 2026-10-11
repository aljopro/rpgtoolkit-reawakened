/**
 * Reading and writing an item — an inventory object, a piece of equipment or a
 * board NPC (format-spec §6.2, magic `RPGTLKIT ITEM`).
 *
 * Pure (G2). The reader never throws (AD-18) and the writer reproduces the
 * bytes `readItem` consumed exactly, including empty slots and any residue.
 * §6.2 carries two traps this file pins: items store `speed` before `idleTime`
 * (the reverse of characters, §6.1), and the custom-stance block sits right
 * after the ten movement strings at `minor = 4` but after the idle animations
 * and speed/idleTime at `minor >= 5`.
 */

import { ok, type Result } from "../result.ts";
import { BinaryReader } from "../binary/reader.ts";
import { BinaryWriter } from "../binary/writer.ts";
import {
  DIRECTIONAL_ANIMATION_COUNT,
  EQUIP_BONUS_COUNT,
  EQUIP_SLOT_COUNT,
  ITEM_BASES_MINOR,
  ITEM_CHARACTER_SLOTS,
  ITEM_DETECT_OFFSET,
  ITEM_I32_MINOR,
  ITEM_IDLE_MINOR,
  ITEM_MAGIC,
  ITEM_MAX_MINOR,
  ITEM_MIN_MINOR,
  ITEM_MOVEMENT_MINOR,
  ITEM_SECTION,
  ITEM_USE_FLAG_COUNT,
  LEGACY_REST_TILE_COUNT,
  LEGACY_WALK_FRAME_COUNT,
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
  type Item,
  type LegacyWalk,
  type LegacyWalkFrame,
} from "./model.ts";

/** Read the legacy two-tile-tall walk frames of a minor < 4 item (§6.2). */
function readLegacyWalk(reader: BinaryReader): Result<LegacyWalk> {
  const frames: LegacyWalkFrame[] = [];
  for (let i = 0; i < LEGACY_WALK_FRAME_COUNT; i += 1) {
    const top = reader.str();
    if (!top.ok) {
      return top;
    }
    const bottom = reader.str();
    if (!bottom.ok) {
      return bottom;
    }
    frames.push({ top: top.value, bottom: bottom.value });
  }
  const restTiles = readStrings(reader, LEGACY_REST_TILE_COUNT);
  if (!restTiles.ok) {
    return restTiles;
  }
  return ok({ frames, restTiles: restTiles.value });
}

/** Read an item from `reader` (format-spec §6.2). */
export function readItem(reader: BinaryReader): Result<Item> {
  const start = reader.offset;
  const header = reader.header();
  // §6.2 requires the byte at offset 13 to be 0 to mark the binary form; the
  // probe does not move the cursor, so the header is read first and the
  // detection checked before any header error.
  const detection = reader.isBinaryAt(start + ITEM_DETECT_OFFSET);
  if (detection.ok && !detection.value) {
    const offset = start + ITEM_DETECT_OFFSET;
    return actorError(
      reader,
      offset,
      ITEM_SECTION,
      `${ITEM_MAGIC}: unsupported 2.x line-oriented text item (byte at offset ${offset} is non-NUL); only the binary form is implemented`,
    );
  }
  if (!header.ok) {
    return header;
  }
  if (header.value.magic !== ITEM_MAGIC) {
    return actorError(
      reader,
      start,
      ITEM_SECTION,
      `not an item: magic is "${header.value.magic}", expected "${ITEM_MAGIC}"`,
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
  if (header.value.minor < ITEM_MIN_MINOR || header.value.minor > ITEM_MAX_MINOR) {
    return actorError(
      reader,
      reader.offset - 2,
      ITEM_SECTION,
      `unsupported item minor version ${header.value.minor}: this reader implements ${ITEM_MIN_MINOR}..${ITEM_MAX_MINOR}`,
    );
  }
  const minor = header.value.minor;
  const wide = minor >= ITEM_I32_MINOR;

  const name = reader.str();
  if (!name.ok) {
    return name;
  }
  const description = reader.str();
  if (!description.ok) {
    return description;
  }
  const flags = readBytes(reader, ITEM_USE_FLAG_COUNT);
  if (!flags.ok) {
    return flags;
  }
  const allowedCharacters = readStrings(reader, ITEM_CHARACTER_SLOTS);
  if (!allowedCharacters.ok) {
    return allowedCharacters;
  }

  const buy = wide ? reader.i32() : reader.i16();
  if (!buy.ok) {
    return buy;
  }
  const buyPrice = buy.value;
  const sell = wide ? reader.i32() : reader.i16();
  if (!sell.ok) {
    return sell;
  }
  const sellPrice = sell.value;

  const keyItem = reader.i8();
  if (!keyItem.ok) {
    return keyItem;
  }
  const equipSlots = readBytes(reader, EQUIP_SLOT_COUNT);
  if (!equipSlots.ok) {
    return equipSlots;
  }
  const accessoryName = reader.str();
  if (!accessoryName.ok) {
    return accessoryName;
  }

  const equipBonus: number[] = [];
  for (let i = 0; i < EQUIP_BONUS_COUNT; i += 1) {
    const value = wide ? reader.i32() : reader.i16();
    if (!value.ok) {
      return value;
    }
    equipBonus.push(value.value);
  }

  const onEquipProgram = reader.str();
  if (!onEquipProgram.ok) {
    return onEquipProgram;
  }
  const onRemoveProgram = reader.str();
  if (!onRemoveProgram.ok) {
    return onRemoveProgram;
  }

  const menuUseHp = wide ? reader.i32() : reader.i16();
  if (!menuUseHp.ok) {
    return menuUseHp;
  }
  const menuUseSmp = wide ? reader.i32() : reader.i16();
  if (!menuUseSmp.ok) {
    return menuUseSmp;
  }
  const menuUseProgram = reader.str();
  if (!menuUseProgram.ok) {
    return menuUseProgram;
  }

  const battleUseHp = wide ? reader.i32() : reader.i16();
  if (!battleUseHp.ok) {
    return battleUseHp;
  }
  const battleUseSmp = wide ? reader.i32() : reader.i16();
  if (!battleUseSmp.ok) {
    return battleUseSmp;
  }
  const battleUseProgram = reader.str();
  if (!battleUseProgram.ok) {
    return battleUseProgram;
  }

  const battleAnimation = reader.str();
  if (!battleAnimation.ok) {
    return battleAnimation;
  }
  const multitaskProgram = reader.str();
  if (!multitaskProgram.ok) {
    return multitaskProgram;
  }
  const activationProgram = reader.str();
  if (!activationProgram.ok) {
    return activationProgram;
  }
  const sizeType = reader.i8();
  if (!sizeType.ok) {
    return sizeType;
  }

  let movementAnimations: string[] | undefined;
  let restAnimation: string | undefined;
  let reservedAnimation: string | undefined;
  let idleAnimations: string[] | undefined;
  let speed: number | undefined;
  let idleTime: number | undefined;
  let customStances: ActorStance[] | undefined;
  let vectorBases: ActorBase[] | undefined;
  let legacyWalk: LegacyWalk | undefined;

  if (minor >= ITEM_MOVEMENT_MINOR) {
    const movements = readStrings(reader, DIRECTIONAL_ANIMATION_COUNT);
    if (!movements.ok) {
      return movements;
    }
    movementAnimations = movements.value;
    const rest = reader.str();
    if (!rest.ok) {
      return rest;
    }
    restAnimation = rest.value;
    const reserved = reader.str();
    if (!reserved.ok) {
      return reserved;
    }
    reservedAnimation = reserved.value;
  }
  if (minor >= ITEM_IDLE_MINOR) {
    const idle = readStrings(reader, DIRECTIONAL_ANIMATION_COUNT);
    if (!idle.ok) {
      return idle;
    }
    idleAnimations = idle.value;
    // Items store speed first, then idleTime — the opposite of characters.
    const speedSeconds = reader.f64();
    if (!speedSeconds.ok) {
      return speedSeconds;
    }
    speed = speedSeconds.value;
    const idleSeconds = reader.f64();
    if (!idleSeconds.ok) {
      return idleSeconds;
    }
    idleTime = idleSeconds.value;
  }
  if (minor >= ITEM_MOVEMENT_MINOR) {
    const stances = readStances(reader, ITEM_SECTION);
    if (!stances.ok) {
      return stances;
    }
    customStances = stances.value;
  }
  if (minor >= ITEM_BASES_MINOR) {
    const bases = readBases(reader, ITEM_SECTION);
    if (!bases.ok) {
      return bases;
    }
    vectorBases = bases.value;
  }
  if (minor < ITEM_MOVEMENT_MINOR) {
    const walk = readLegacyWalk(reader);
    if (!walk.ok) {
      return walk;
    }
    legacyWalk = walk.value;
  }

  const residue = reader.readBytes(reader.remaining);
  if (!residue.ok) {
    return residue;
  }
  const warnings: string[] = [];
  if (residue.value.length > 0) {
    warnings.push(
      `${residue.value.length} trailing byte(s) after the item were kept as residue (format-spec §6.2)`,
    );
  }

  return ok(
    {
      magic: header.value.magic,
      major: header.value.major,
      minor,
      name: name.value,
      description: description.value,
      equipable: flags.value[0] ?? 0,
      menuUsable: flags.value[1] ?? 0,
      boardUsable: flags.value[2] ?? 0,
      battleUsable: flags.value[3] ?? 0,
      usedBy: flags.value[4] ?? 0,
      allowedCharacters: allowedCharacters.value,
      buyPrice,
      sellPrice,
      keyItem: keyItem.value,
      equipSlots: equipSlots.value,
      accessoryName: accessoryName.value,
      equipBonus,
      onEquipProgram: onEquipProgram.value,
      onRemoveProgram: onRemoveProgram.value,
      menuUseHp: menuUseHp.value,
      menuUseSmp: menuUseSmp.value,
      menuUseProgram: menuUseProgram.value,
      battleUseHp: battleUseHp.value,
      battleUseSmp: battleUseSmp.value,
      battleUseProgram: battleUseProgram.value,
      battleAnimation: battleAnimation.value,
      multitaskProgram: multitaskProgram.value,
      activationProgram: activationProgram.value,
      sizeType: sizeType.value,
      movementAnimations,
      restAnimation,
      reservedAnimation,
      idleAnimations,
      speed,
      idleTime,
      customStances,
      vectorBases,
      legacyWalk,
      residue: residue.value,
    },
    warnings,
  );
}

/**
 * Append a `wide ? i32 : i16` value (format-spec §6.2: `i32` at `minor >= 3`,
 * applied to prices, equip bonuses and the menu/battle use deltas).
 */
function writeWide(writer: BinaryWriter, value: number, wide: boolean): void {
  if (wide) {
    writer.i32(value);
  } else {
    writer.i16(value);
  }
}

/** Serialise `model` to the item layout (format-spec §6.2). */
export function writeItem(model: Item): Result<Uint8Array> {
  const writer = new BinaryWriter();
  writer.str(model.magic);
  writer.i16(model.major);
  writer.i16(model.minor);
  const wide = model.minor >= ITEM_I32_MINOR;

  writer.str(model.name);
  writer.str(model.description);
  const flags = writeFixedBytes(
    writer,
    [model.equipable, model.menuUsable, model.boardUsable, model.battleUsable, model.usedBy],
    ITEM_USE_FLAG_COUNT,
    ITEM_SECTION,
    "use flags",
  );
  if (!flags.ok) {
    return flags;
  }
  const characters = writeFixedStrings(
    writer,
    model.allowedCharacters,
    ITEM_CHARACTER_SLOTS,
    ITEM_SECTION,
    "allowed character handles",
  );
  if (!characters.ok) {
    return characters;
  }

  writeWide(writer, model.buyPrice, wide);
  writeWide(writer, model.sellPrice, wide);
  writer.i8(model.keyItem);
  const slots = writeFixedBytes(
    writer,
    model.equipSlots,
    EQUIP_SLOT_COUNT,
    ITEM_SECTION,
    "equip slots",
  );
  if (!slots.ok) {
    return slots;
  }
  writer.str(model.accessoryName);
  if (model.equipBonus.length !== EQUIP_BONUS_COUNT) {
    return writerError(
      writer,
      ITEM_SECTION,
      `equip bonuses need exactly ${EQUIP_BONUS_COUNT} entries but the model has ${model.equipBonus.length}`,
    );
  }
  for (const value of model.equipBonus) {
    writeWide(writer, value, wide);
  }

  writer.str(model.onEquipProgram);
  writer.str(model.onRemoveProgram);
  writeWide(writer, model.menuUseHp, wide);
  writeWide(writer, model.menuUseSmp, wide);
  writer.str(model.menuUseProgram);
  writeWide(writer, model.battleUseHp, wide);
  writeWide(writer, model.battleUseSmp, wide);
  writer.str(model.battleUseProgram);

  writer.str(model.battleAnimation);
  writer.str(model.multitaskProgram);
  writer.str(model.activationProgram);
  writer.i8(model.sizeType);

  if (model.minor >= ITEM_MOVEMENT_MINOR) {
    const movements = writeFixedStrings(
      writer,
      model.movementAnimations ?? [],
      DIRECTIONAL_ANIMATION_COUNT,
      ITEM_SECTION,
      "movement animations",
    );
    if (!movements.ok) {
      return movements;
    }
    writer.str(model.restAnimation ?? "");
    writer.str(model.reservedAnimation ?? "");
  }
  if (model.minor >= ITEM_IDLE_MINOR) {
    const idle = writeFixedStrings(
      writer,
      model.idleAnimations ?? [],
      DIRECTIONAL_ANIMATION_COUNT,
      ITEM_SECTION,
      "idle animations",
    );
    if (!idle.ok) {
      return idle;
    }
    writer.f64(model.speed ?? 0);
    writer.f64(model.idleTime ?? 0);
  }
  if (model.minor >= ITEM_MOVEMENT_MINOR) {
    const stances = writeStances(writer, model.customStances ?? [], ITEM_SECTION);
    if (!stances.ok) {
      return stances;
    }
  }
  if (model.minor >= ITEM_BASES_MINOR) {
    const bases = writeBases(writer, model.vectorBases ?? [], ITEM_SECTION);
    if (!bases.ok) {
      return bases;
    }
  }
  if (model.minor < ITEM_MOVEMENT_MINOR) {
    const walk = model.legacyWalk;
    if (walk === undefined || walk.frames.length !== LEGACY_WALK_FRAME_COUNT) {
      return writerError(
        writer,
        ITEM_SECTION,
        `a minor < 4 item needs exactly ${LEGACY_WALK_FRAME_COUNT} legacy walk frames`,
      );
    }
    for (const frame of walk.frames) {
      writer.str(frame.top);
      writer.str(frame.bottom);
    }
    const rest = writeFixedStrings(
      writer,
      walk.restTiles,
      LEGACY_REST_TILE_COUNT,
      ITEM_SECTION,
      "legacy rest tiles",
    );
    if (!rest.ok) {
      return rest;
    }
  }

  writer.writeBytes(model.residue);
  return ok(writer.toBytes());
}
