/**
 * Reading and writing a special move (format-spec §8.1): the binary layout of
 * `RPGTLKIT SPLMOVE`.
 *
 * Pure (G2): the reader consumes a `BinaryReader` the caller positioned and
 * the writer fills a `BinaryWriter`; neither touches a host. A wrong magic, a
 * text-form file or a short read is a `Result` carrying a located `FormatError`
 * and is never thrown (AD-18). The reader consumes the whole file, keeping any
 * bytes after the last field as `residue` (§1.7), so a caller sees
 * `remaining === 0`.
 */

import { err, ok, type Result } from "../result.ts";
import { BinaryReader } from "../binary/reader.ts";
import { BinaryWriter } from "../binary/writer.ts";
import {
  BATTLE_MAX_MINOR,
  BATTLE_MIN_MINOR,
  SPECIAL_MOVE_DETECT_OFFSET,
  SPECIAL_MOVE_MAGIC,
  SPECIAL_MOVE_SECTION,
  type SpecialMove,
  unsupportedBattleMinor,
  unsupportedTextForm,
} from "./model.ts";

/**
 * Read a special move from `reader` (format-spec §8.1).
 *
 * The header is read first and the detection byte at offset 16 (§1.3, §8.1)
 * probed without moving the cursor: a non-NUL byte means the 2.x text form,
 * which is refused with a located `FormatError` rather than parsed as binary.
 * A file too short to carry the detection byte is not an error here — the
 * header's own error is reported instead. Otherwise the `minor`-range check and
 * the §8.1 field list are read in order; bytes after the description are kept as
 * `residue` (§1.7).
 */
export function readSpecialMove(reader: BinaryReader): Result<SpecialMove> {
  const start = reader.offset;
  // §8.1 lists the detection byte first and the header second; the probe does
  // not move the cursor, so the header is read first and the detection checked
  // before any header error — a text file has no NUL-terminated magic to read.
  const header = reader.header();
  const detectAt = start + SPECIAL_MOVE_DETECT_OFFSET;
  const detection = reader.isBinaryAt(detectAt);

  if (detection.ok && !detection.value) {
    return err(unsupportedTextForm(reader, detectAt, SPECIAL_MOVE_SECTION, SPECIAL_MOVE_MAGIC));
  }
  if (!header.ok) {
    return header;
  }
  if (header.value.magic !== SPECIAL_MOVE_MAGIC) {
    return err({
      ...(reader.path === undefined ? {} : { path: reader.path }),
      offset: start,
      section: SPECIAL_MOVE_SECTION,
      message: `not a special move: magic is "${header.value.magic}", expected "${SPECIAL_MOVE_MAGIC}"`,
    });
  }
  if (header.value.minor < BATTLE_MIN_MINOR || header.value.minor > BATTLE_MAX_MINOR) {
    return err(
      unsupportedBattleMinor(
        reader,
        reader.offset - 2,
        SPECIAL_MOVE_SECTION,
        SPECIAL_MOVE_MAGIC,
        header.value.minor,
      ),
    );
  }

  const name = reader.str();
  if (!name.ok) {
    return name;
  }
  const damage = reader.i32();
  if (!damage.ok) {
    return damage;
  }
  const smpCost = reader.i32();
  if (!smpCost.ok) {
    return smpCost;
  }
  const program = reader.str();
  if (!program.ok) {
    return program;
  }
  const targetSmpDrain = reader.i32();
  if (!targetSmpDrain.ok) {
    return targetSmpDrain;
  }
  const usableInBattle = reader.i8();
  if (!usableInBattle.ok) {
    return usableInBattle;
  }
  const usableFromMenu = reader.i8();
  if (!usableFromMenu.ok) {
    return usableFromMenu;
  }
  const statusEffect = reader.str();
  if (!statusEffect.ok) {
    return statusEffect;
  }
  const animation = reader.str();
  if (!animation.ok) {
    return animation;
  }
  const description = reader.str();
  if (!description.ok) {
    return description;
  }

  const residue = reader.readBytes(reader.remaining);
  if (!residue.ok) {
    return residue;
  }
  const warnings: string[] = [];
  if (residue.value.length > 0) {
    warnings.push(
      `${residue.value.length} trailing byte(s) after the special move were kept as residue (format-spec §8.1, §1.7)`,
    );
  }

  return ok(
    {
      magic: header.value.magic,
      major: header.value.major,
      minor: header.value.minor,
      name: name.value,
      damage: damage.value,
      smpCost: smpCost.value,
      program: program.value,
      targetSmpDrain: targetSmpDrain.value,
      usableInBattle: usableInBattle.value,
      usableFromMenu: usableFromMenu.value,
      statusEffect: statusEffect.value,
      animation: animation.value,
      description: description.value,
      residue: residue.value,
    },
    warnings,
  );
}

/**
 * Serialise `model` to the special-move layout (format-spec §8.1), reproducing
 * the bytes a `readSpecialMove` of the same model consumed. Only an
 * unencodable string can fail.
 */
export function writeSpecialMove(model: SpecialMove): Result<Uint8Array> {
  const writer = new BinaryWriter();

  const magic = writer.str(model.magic);
  if (!magic.ok) {
    return magic;
  }
  writer.i16(model.major);
  writer.i16(model.minor);
  const name = writer.str(model.name);
  if (!name.ok) {
    return name;
  }
  writer.i32(model.damage);
  writer.i32(model.smpCost);
  const program = writer.str(model.program);
  if (!program.ok) {
    return program;
  }
  writer.i32(model.targetSmpDrain);
  writer.i8(model.usableInBattle);
  writer.i8(model.usableFromMenu);
  for (const value of [model.statusEffect, model.animation, model.description]) {
    const written = writer.str(value);
    if (!written.ok) {
      return written;
    }
  }

  writer.writeBytes(model.residue);
  return ok(writer.toBytes());
}
