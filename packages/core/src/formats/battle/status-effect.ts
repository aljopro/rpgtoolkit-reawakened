/**
 * Reading and writing a status effect (format-spec §8.2): the binary layout of
 * `RPGTLKIT STATUSE`.
 *
 * Pure (G2): the reader consumes a `BinaryReader` the caller positioned and
 * the writer fills a `BinaryWriter`; neither touches a host. A wrong magic, a
 * text-form file or a short read is a `Result` carrying a located `FormatError`
 * and is never thrown (AD-18). The per-round amounts stay signed — a negative
 * `hpPerRound` or `smpPerRound` heals (§8.2).
 */

import { err, ok, type Result } from "../result.ts";
import { BinaryReader } from "../binary/reader.ts";
import { BinaryWriter } from "../binary/writer.ts";
import {
  BATTLE_MAX_MINOR,
  BATTLE_MIN_MINOR,
  STATUS_EFFECT_DETECT_OFFSET,
  STATUS_EFFECT_MAGIC,
  STATUS_EFFECT_SECTION,
  type StatusEffect,
  unsupportedBattleMinor,
  unsupportedTextForm,
} from "./model.ts";

/**
 * Read a status effect from `reader` (format-spec §8.2).
 *
 * §8.2 lists the detection byte at offset 16 before the header; the probe does
 * not move the cursor, so the header is read first and the detection checked
 * before any header error — a text file has no NUL-terminated magic to read,
 * and a file too short to carry the detection byte reports the header's own
 * short read rather than the probe's out-of-range error. A non-NUL detection
 * byte means the 2.x text form, which is refused with a located `FormatError`
 * rather than parsed as binary. Otherwise the magic, the `minor`-range check
 * and the §8.2 field list are read in order; bytes after the program are kept
 * as `residue` (§1.7).
 */
export function readStatusEffect(reader: BinaryReader): Result<StatusEffect> {
  const start = reader.offset;
  const header = reader.header();
  const detectAt = start + STATUS_EFFECT_DETECT_OFFSET;
  const probe = reader.isBinaryAt(detectAt);
  if (probe.ok && !probe.value) {
    return err(unsupportedTextForm(reader, detectAt, STATUS_EFFECT_SECTION, STATUS_EFFECT_MAGIC));
  }
  if (!header.ok) {
    return header;
  }
  if (header.value.magic !== STATUS_EFFECT_MAGIC) {
    return err({
      ...(reader.path === undefined ? {} : { path: reader.path }),
      offset: start,
      section: STATUS_EFFECT_SECTION,
      message: `not a status effect: magic is "${header.value.magic}", expected "${STATUS_EFFECT_MAGIC}"`,
    });
  }
  if (header.value.minor < BATTLE_MIN_MINOR || header.value.minor > BATTLE_MAX_MINOR) {
    return err(
      unsupportedBattleMinor(
        reader,
        reader.offset - 2,
        STATUS_EFFECT_SECTION,
        STATUS_EFFECT_MAGIC,
        header.value.minor,
      ),
    );
  }

  const name = reader.str();
  if (!name.ok) {
    return name;
  }
  const rounds = reader.i16();
  if (!rounds.ok) {
    return rounds;
  }
  const speedUp = reader.i16();
  if (!speedUp.ok) {
    return speedUp;
  }
  const slowDown = reader.i16();
  if (!slowDown.ok) {
    return slowDown;
  }
  const disable = reader.i16();
  if (!disable.ok) {
    return disable;
  }
  const hpEnabled = reader.i16();
  if (!hpEnabled.ok) {
    return hpEnabled;
  }
  const hpPerRound = reader.i16();
  if (!hpPerRound.ok) {
    return hpPerRound;
  }
  const smpEnabled = reader.i16();
  if (!smpEnabled.ok) {
    return smpEnabled;
  }
  const smpPerRound = reader.i16();
  if (!smpPerRound.ok) {
    return smpPerRound;
  }
  const runProgram = reader.i16();
  if (!runProgram.ok) {
    return runProgram;
  }
  const program = reader.str();
  if (!program.ok) {
    return program;
  }

  const residue = reader.readBytes(reader.remaining);
  if (!residue.ok) {
    return residue;
  }
  const warnings: string[] = [];
  if (residue.value.length > 0) {
    warnings.push(
      `${residue.value.length} trailing byte(s) after the status effect were kept as residue (format-spec §8.2, §1.7)`,
    );
  }

  return ok(
    {
      magic: header.value.magic,
      major: header.value.major,
      minor: header.value.minor,
      name: name.value,
      rounds: rounds.value,
      speedUp: speedUp.value,
      slowDown: slowDown.value,
      disable: disable.value,
      hpEnabled: hpEnabled.value,
      hpPerRound: hpPerRound.value,
      smpEnabled: smpEnabled.value,
      smpPerRound: smpPerRound.value,
      runProgram: runProgram.value,
      program: program.value,
      residue: residue.value,
    },
    warnings,
  );
}

/**
 * Serialise `model` to the status-effect layout (format-spec §8.2), reproducing
 * the bytes a `readStatusEffect` of the same model consumed. Only an
 * unencodable string can fail.
 */
export function writeStatusEffect(model: StatusEffect): Result<Uint8Array> {
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
  writer.i16(model.rounds);
  writer.i16(model.speedUp);
  writer.i16(model.slowDown);
  writer.i16(model.disable);
  writer.i16(model.hpEnabled);
  writer.i16(model.hpPerRound);
  writer.i16(model.smpEnabled);
  writer.i16(model.smpPerRound);
  writer.i16(model.runProgram);
  const program = writer.str(model.program);
  if (!program.ok) {
    return program;
  }

  writer.writeBytes(model.residue);
  return ok(writer.toBytes());
}
