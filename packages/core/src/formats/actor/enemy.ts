/**
 * Reading and writing an enemy (format-spec §6.3, magic `RPGTLKIT ENEMY`).
 *
 * Pure (G2). Only the binary 2.1 form, minor 1, is represented; minor 0 is the
 * 2.0 line-oriented text form, which the reader reports rather than converts.
 * The reader never throws (AD-18) and the writer reproduces the bytes
 * `readEnemy` consumed exactly, including the unused stance slot 5 and the
 * empty files of the bounded lists.
 */

import { ok, type Result } from "../result.ts";
import { BinaryReader } from "../binary/reader.ts";
import { BinaryWriter } from "../binary/writer.ts";
import {
  ENEMY_BINARY_MINOR,
  ENEMY_DETECT_OFFSET,
  ENEMY_MAGIC,
  ENEMY_SECTION,
  actorError,
  readBoundedStrings,
  readStances,
  writeBoundedStrings,
  writeStances,
  type Enemy,
} from "./model.ts";

/** Read an enemy from `reader` (format-spec §6.3). */
export function readEnemy(reader: BinaryReader): Result<Enemy> {
  const start = reader.offset;
  const header = reader.header();
  // §6.3 places the detection byte at offset 14, just past the magic; the probe
  // does not move the cursor, so the header is read first and the detection
  // checked before any header error.
  const detection = reader.isBinaryAt(start + ENEMY_DETECT_OFFSET);
  if (detection.ok && !detection.value) {
    const offset = start + ENEMY_DETECT_OFFSET;
    return actorError(
      reader,
      offset,
      ENEMY_SECTION,
      `${ENEMY_MAGIC}: unsupported 2.0 line-oriented text enemy (byte at offset ${offset} is non-NUL); only the binary 2.1 form is implemented`,
    );
  }
  if (!header.ok) {
    return header;
  }
  if (header.value.magic !== ENEMY_MAGIC) {
    return actorError(
      reader,
      start,
      ENEMY_SECTION,
      `not an enemy: magic is "${header.value.magic}", expected "${ENEMY_MAGIC}"`,
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
  if (header.value.minor !== ENEMY_BINARY_MINOR) {
    return actorError(
      reader,
      reader.offset - 2,
      ENEMY_SECTION,
      `unsupported enemy minor version ${header.value.minor}: only the binary 2.1 form (minor ${ENEMY_BINARY_MINOR}) exists`,
    );
  }

  const name = reader.str();
  if (!name.ok) {
    return name;
  }
  const hp = reader.i32();
  if (!hp.ok) {
    return hp;
  }
  const smp = reader.i32();
  if (!smp.ok) {
    return smp;
  }
  const fp = reader.i32();
  if (!fp.ok) {
    return fp;
  }
  const dp = reader.i32();
  if (!dp.ok) {
    return dp;
  }
  const canRun = reader.i8();
  if (!canRun.ok) {
    return canRun;
  }
  const criticalOn = reader.i16();
  if (!criticalOn.ok) {
    return criticalOn;
  }
  const criticalBy = reader.i16();
  if (!criticalBy.ok) {
    return criticalBy;
  }

  const specialMoves = readBoundedStrings(reader);
  if (!specialMoves.ok) {
    return specialMoves;
  }
  const weaknesses = readBoundedStrings(reader);
  if (!weaknesses.ok) {
    return weaknesses;
  }
  const strengths = readBoundedStrings(reader);
  if (!strengths.ok) {
    return strengths;
  }

  const aiLevel = reader.i8();
  if (!aiLevel.ok) {
    return aiLevel;
  }
  const customAi = reader.i8();
  if (!customAi.ok) {
    return customAi;
  }
  const aiProgram = reader.str();
  if (!aiProgram.ok) {
    return aiProgram;
  }
  const experienceReward = reader.i32();
  if (!experienceReward.ok) {
    return experienceReward;
  }
  const goldReward = reader.i32();
  if (!goldReward.ok) {
    return goldReward;
  }
  const defeatProgram = reader.str();
  if (!defeatProgram.ok) {
    return defeatProgram;
  }
  const runAwayProgram = reader.str();
  if (!runAwayProgram.ok) {
    return runAwayProgram;
  }

  // The stance upper bound is stored as 5, yielding six slots 0..5; slot 5 is
  // unused, kept so the indices stay stable (format-spec §6.3).
  const stances = readBoundedStrings(reader);
  if (!stances.ok) {
    return stances;
  }

  // The custom-stance bound is an `i32`, not the `i16` legacy readers used
  // (format-spec §6.3).
  const customStances = readStances(reader, ENEMY_SECTION);
  if (!customStances.ok) {
    return customStances;
  }

  const residue = reader.readBytes(reader.remaining);
  if (!residue.ok) {
    return residue;
  }
  const warnings: string[] = [];
  if (residue.value.length > 0) {
    warnings.push(
      `${residue.value.length} trailing byte(s) after the enemy were kept as residue (format-spec §6.3)`,
    );
  }

  return ok(
    {
      magic: header.value.magic,
      major: header.value.major,
      minor: header.value.minor,
      name: name.value,
      hp: hp.value,
      smp: smp.value,
      fp: fp.value,
      dp: dp.value,
      canRun: canRun.value,
      criticalOn: criticalOn.value,
      criticalBy: criticalBy.value,
      specialMoves: specialMoves.value,
      weaknesses: weaknesses.value,
      strengths: strengths.value,
      aiLevel: aiLevel.value,
      customAi: customAi.value,
      aiProgram: aiProgram.value,
      experienceReward: experienceReward.value,
      goldReward: goldReward.value,
      defeatProgram: defeatProgram.value,
      runAwayProgram: runAwayProgram.value,
      stances: stances.value,
      customStances: customStances.value,
      residue: residue.value,
    },
    warnings,
  );
}

/** Serialise `model` to the enemy layout (format-spec §6.3). */
export function writeEnemy(model: Enemy): Result<Uint8Array> {
  const writer = new BinaryWriter();
  writer.str(model.magic);
  writer.i16(model.major);
  writer.i16(model.minor);

  writer.str(model.name);
  writer.i32(model.hp);
  writer.i32(model.smp);
  writer.i32(model.fp);
  writer.i32(model.dp);
  writer.i8(model.canRun);
  writer.i16(model.criticalOn);
  writer.i16(model.criticalBy);

  const moves = writeBoundedStrings(writer, model.specialMoves, ENEMY_SECTION, "special moves");
  if (!moves.ok) {
    return moves;
  }
  const weaknesses = writeBoundedStrings(writer, model.weaknesses, ENEMY_SECTION, "weaknesses");
  if (!weaknesses.ok) {
    return weaknesses;
  }
  const strengths = writeBoundedStrings(writer, model.strengths, ENEMY_SECTION, "strengths");
  if (!strengths.ok) {
    return strengths;
  }

  writer.i8(model.aiLevel);
  writer.i8(model.customAi);
  writer.str(model.aiProgram);
  writer.i32(model.experienceReward);
  writer.i32(model.goldReward);
  writer.str(model.defeatProgram);
  writer.str(model.runAwayProgram);

  const stances = writeBoundedStrings(writer, model.stances, ENEMY_SECTION, "stance animations");
  if (!stances.ok) {
    return stances;
  }
  const custom = writeStances(writer, model.customStances, ENEMY_SECTION);
  if (!custom.ok) {
    return custom;
  }

  writer.writeBytes(model.residue);
  return ok(writer.toBytes());
}
