/**
 * Reading and writing a battle background (format-spec §8.3): the binary layout
 * of `RPGTLKIT BKG`.
 *
 * Pure (G2): the reader consumes a `BinaryReader` the caller positioned and
 * the writer fills a `BinaryWriter`; neither touches a host. A wrong magic, a
 * text-form file or a short read is a `Result` carrying a located `FormatError`
 * and is never thrown (AD-18).
 */

import { err, ok, type Result } from "../result.ts";
import { BinaryReader } from "../binary/reader.ts";
import { BinaryWriter } from "../binary/writer.ts";
import {
  BATTLE_BACKGROUND_DETECT_OFFSET,
  BATTLE_BACKGROUND_MAGIC,
  BATTLE_BACKGROUND_SECTION,
  BATTLE_MAX_MINOR,
  BATTLE_MIN_MINOR,
  type BattleBackground,
  unsupportedBattleMinor,
  unsupportedTextForm,
} from "./model.ts";

/**
 * Read a battle background from `reader` (format-spec §8.3).
 *
 * §8.3 lists the detection byte at offset 12 before the header; the probe does
 * not move the cursor, so the header is read first and the detection checked
 * before any header error — a text file has no NUL-terminated magic to read,
 * and a file too short to carry the detection byte reports the header's own
 * short read rather than the probe's out-of-range error. A non-NUL detection
 * byte means the 2.x text form, which is refused with a located `FormatError`
 * rather than parsed as binary. Otherwise the magic, the `minor`-range check
 * and the six `str` fields of §8.3 are read in order; bytes after the last sound
 * are kept as `residue` (§1.7).
 */
export function readBattleBackground(reader: BinaryReader): Result<BattleBackground> {
  const start = reader.offset;
  const header = reader.header();
  const detectAt = start + BATTLE_BACKGROUND_DETECT_OFFSET;
  const probe = reader.isBinaryAt(detectAt);
  if (probe.ok && !probe.value) {
    return err(
      unsupportedTextForm(reader, detectAt, BATTLE_BACKGROUND_SECTION, BATTLE_BACKGROUND_MAGIC),
    );
  }
  if (!header.ok) {
    return header;
  }
  if (header.value.magic !== BATTLE_BACKGROUND_MAGIC) {
    return err({
      ...(reader.path === undefined ? {} : { path: reader.path }),
      offset: start,
      section: BATTLE_BACKGROUND_SECTION,
      message: `not a battle background: magic is "${header.value.magic}", expected "${BATTLE_BACKGROUND_MAGIC}"`,
    });
  }
  if (header.value.minor < BATTLE_MIN_MINOR || header.value.minor > BATTLE_MAX_MINOR) {
    return err(
      unsupportedBattleMinor(
        reader,
        reader.offset - 2,
        BATTLE_BACKGROUND_SECTION,
        BATTLE_BACKGROUND_MAGIC,
        header.value.minor,
      ),
    );
  }

  const image = reader.str();
  if (!image.ok) {
    return image;
  }
  const music = reader.str();
  if (!music.ok) {
    return music;
  }
  const menuMoveSound = reader.str();
  if (!menuMoveSound.ok) {
    return menuMoveSound;
  }
  const menuChooseSound = reader.str();
  if (!menuChooseSound.ok) {
    return menuChooseSound;
  }
  const readySound = reader.str();
  if (!readySound.ok) {
    return readySound;
  }
  const cantDoSound = reader.str();
  if (!cantDoSound.ok) {
    return cantDoSound;
  }

  const residue = reader.readBytes(reader.remaining);
  if (!residue.ok) {
    return residue;
  }
  const warnings: string[] = [];
  if (residue.value.length > 0) {
    warnings.push(
      `${residue.value.length} trailing byte(s) after the battle background were kept as residue (format-spec §8.3, §1.7)`,
    );
  }

  return ok(
    {
      magic: header.value.magic,
      major: header.value.major,
      minor: header.value.minor,
      image: image.value,
      music: music.value,
      menuMoveSound: menuMoveSound.value,
      menuChooseSound: menuChooseSound.value,
      readySound: readySound.value,
      cantDoSound: cantDoSound.value,
      residue: residue.value,
    },
    warnings,
  );
}

/**
 * Serialise `model` to the battle-background layout (format-spec §8.3),
 * reproducing the bytes a `readBattleBackground` of the same model consumed.
 * Only an unencodable string can fail.
 */
export function writeBattleBackground(model: BattleBackground): Result<Uint8Array> {
  const writer = new BinaryWriter();

  const magic = writer.str(model.magic);
  if (!magic.ok) {
    return magic;
  }
  writer.i16(model.major);
  writer.i16(model.minor);
  for (const value of [
    model.image,
    model.music,
    model.menuMoveSound,
    model.menuChooseSound,
    model.readySound,
    model.cantDoSound,
  ]) {
    const written = writer.str(value);
    if (!written.ok) {
      return written;
    }
  }

  writer.writeBytes(model.residue);
  return ok(writer.toBytes());
}
