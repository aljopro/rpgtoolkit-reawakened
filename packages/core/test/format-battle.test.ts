// The battle-data formats of format-spec §8 (AD-18): special moves (§8.1),
// status effects (§8.2) and battle backgrounds (§8.3). The tests cover the
// magic/major/minor header, each field's documented width and signedness, the
// signed per-round amounts of a status effect, empty versus non-empty strings,
// the text-form detection byte, located errors and byte-identical round-trips,
// plus the sample battle background when the fixtures have been fetched.
//
// The readers never throw, so the tests assert on values and on the error's
// offset and section rather than on exceptions.
import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BATTLE_BACKGROUND_MAGIC,
  BATTLE_BACKGROUND_SECTION,
  BinaryReader,
  BinaryWriter,
  SPECIAL_MOVE_MAGIC,
  SPECIAL_MOVE_SECTION,
  STATUS_EFFECT_MAGIC,
  STATUS_EFFECT_SECTION,
  readBattleBackground,
  readSpecialMove,
  readStatusEffect,
  writeBattleBackground,
  writeSpecialMove,
  writeStatusEffect,
} from "../src/index.ts";
import type { BattleBackground, Result, SpecialMove, StatusEffect } from "../src/index.ts";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "..", "..", "..");

/** Unwrap a result the test expects to succeed. */
function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`expected ok, got: ${result.error.message}`);
  }
  return result.value;
}

/** A 7-bit-ASCII byte array for building a text-form file in a test. */
function ascii(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    bytes[i] = text.charCodeAt(i);
  }
  return bytes;
}

/** The fields a synthetic special move lets a test vary. */
interface SpcOptions {
  readonly magic?: string;
  readonly major?: number;
  readonly minor?: number;
  readonly name?: string;
  readonly damage?: number;
  readonly smpCost?: number;
  readonly program?: string;
  readonly targetSmpDrain?: number;
  readonly usableInBattle?: number;
  readonly usableFromMenu?: number;
  readonly statusEffect?: string;
  readonly animation?: string;
  readonly description?: string;
}

/** Serialise a synthetic special move. */
function buildSpc(options: SpcOptions = {}): Uint8Array {
  const writer = new BinaryWriter();
  writer.str(options.magic ?? SPECIAL_MOVE_MAGIC);
  writer.i16(options.major ?? 2);
  writer.i16(options.minor ?? 0);
  writer.str(options.name ?? "Fireball");
  writer.i32(options.damage ?? 40);
  writer.i32(options.smpCost ?? 5);
  writer.str(options.program ?? "");
  writer.i32(options.targetSmpDrain ?? 0);
  writer.i8(options.usableInBattle ?? 1);
  writer.i8(options.usableFromMenu ?? 0);
  writer.str(options.statusEffect ?? "");
  writer.str(options.animation ?? "fire.anm");
  writer.str(options.description ?? "A ball of fire");
  return writer.toBytes();
}

/** The fields a synthetic status effect lets a test vary. */
interface SteOptions {
  readonly magic?: string;
  readonly major?: number;
  readonly minor?: number;
  readonly name?: string;
  readonly rounds?: number;
  readonly speedUp?: number;
  readonly slowDown?: number;
  readonly disable?: number;
  readonly hpEnabled?: number;
  readonly hpPerRound?: number;
  readonly smpEnabled?: number;
  readonly smpPerRound?: number;
  readonly runProgram?: number;
  readonly program?: string;
}

/** Serialise a synthetic status effect. */
function buildSte(options: SteOptions = {}): Uint8Array {
  const writer = new BinaryWriter();
  writer.str(options.magic ?? STATUS_EFFECT_MAGIC);
  writer.i16(options.major ?? 2);
  writer.i16(options.minor ?? 0);
  writer.str(options.name ?? "Poison");
  writer.i16(options.rounds ?? 3);
  writer.i16(options.speedUp ?? 0);
  writer.i16(options.slowDown ?? -2);
  writer.i16(options.disable ?? 0);
  writer.i16(options.hpEnabled ?? 1);
  writer.i16(options.hpPerRound ?? -5);
  writer.i16(options.smpEnabled ?? 0);
  writer.i16(options.smpPerRound ?? 0);
  writer.i16(options.runProgram ?? 0);
  writer.str(options.program ?? "");
  return writer.toBytes();
}

/** The fields a synthetic battle background lets a test vary. */
interface BkgOptions {
  readonly magic?: string;
  readonly major?: number;
  readonly minor?: number;
  readonly image?: string;
  readonly music?: string;
  readonly menuMoveSound?: string;
  readonly menuChooseSound?: string;
  readonly readySound?: string;
  readonly cantDoSound?: string;
}

/** Serialise a synthetic battle background. */
function buildBkg(options: BkgOptions = {}): Uint8Array {
  const writer = new BinaryWriter();
  writer.str(options.magic ?? BATTLE_BACKGROUND_MAGIC);
  writer.i16(options.major ?? 2);
  writer.i16(options.minor ?? 0);
  writer.str(options.image ?? "field.bmp");
  writer.str(options.music ?? "battle.mid");
  writer.str(options.menuMoveSound ?? "move.wav");
  writer.str(options.menuChooseSound ?? "");
  writer.str(options.readySound ?? "ready.wav");
  writer.str(options.cantDoSound ?? "cant.wav");
  return writer.toBytes();
}

// --- Special moves (§8.1) ---------------------------------------------------

test("reads a special move's header and every field", () => {
  const reader = new BinaryReader(buildSpc());
  const move = unwrap(readSpecialMove(reader));
  equal(move.magic, SPECIAL_MOVE_MAGIC);
  equal(move.major, 2);
  equal(move.minor, 0);
  equal(move.name, "Fireball");
  equal(move.damage, 40);
  equal(move.smpCost, 5);
  equal(move.program, "");
  equal(move.targetSmpDrain, 0);
  equal(move.usableInBattle, 1);
  equal(move.usableFromMenu, 0);
  equal(move.statusEffect, "");
  equal(move.animation, "fire.anm");
  equal(move.description, "A ball of fire");
  equal(reader.remaining, 0);
});

test("a special move keeps i32 and i8 signedness", () => {
  const move = unwrap(
    readSpecialMove(
      new BinaryReader(
        buildSpc({
          damage: -2147483648,
          smpCost: 2147483647,
          targetSmpDrain: -7,
          usableInBattle: -1,
          usableFromMenu: 1,
        }),
      ),
    ),
  );
  equal(move.damage, -2147483648);
  equal(move.smpCost, 2147483647);
  equal(move.targetSmpDrain, -7);
  equal(move.usableInBattle, -1);
  equal(move.usableFromMenu, 1);
});

test("a special move distinguishes empty from non-empty strings", () => {
  const move = unwrap(
    readSpecialMove(
      new BinaryReader(
        buildSpc({ name: "", program: "prg", statusEffect: "poison.ste", description: "" }),
      ),
    ),
  );
  equal(move.name, "");
  equal(move.program, "prg");
  equal(move.statusEffect, "poison.ste");
  equal(move.description, "");
});

test("a wrong special-move magic is an error at offset 0", () => {
  const bytes = buildSpc({ magic: "RPGTLKIT SPLMOVX" });
  const result = readSpecialMove(new BinaryReader(bytes));
  equal(result.ok, false);
  if (result.ok) {
    return;
  }
  equal(result.error.offset, 0);
  equal(result.error.section, SPECIAL_MOVE_SECTION);
});

test("a text-form special move is refused at the detection byte", () => {
  const bytes = ascii("RPGTLKIT SPLMOVE\r\n2\r\n0\r\nFireball\r\n");
  const result = readSpecialMove(new BinaryReader(bytes));
  equal(result.ok, false);
  if (result.ok) {
    return;
  }
  equal(result.error.offset, 16);
  equal(result.error.section, SPECIAL_MOVE_SECTION);
  equal(result.error.message.includes("text form"), true);
});

test("a short special move reports the field offset", () => {
  const bytes = buildSpc().slice(0, 30);
  const result = readSpecialMove(new BinaryReader(bytes));
  equal(result.ok, false);
  if (result.ok) {
    return;
  }
  equal(result.error.offset, 30);
  equal(typeof result.error.section, "string");
});

test("a special move too short to probe reports a located error", () => {
  const result = readSpecialMove(new BinaryReader(new Uint8Array([82, 80, 71])));
  equal(result.ok, false);
  if (result.ok) {
    return;
  }
  equal(result.error.offset, 16);
});

test("a parsed special move writes back byte-for-byte", () => {
  const bytes = buildSpc({ name: "Ice", damage: -3, usableFromMenu: -1, description: "" });
  const move = unwrap(readSpecialMove(new BinaryReader(bytes)));
  deepEqual(unwrap(writeSpecialMove(move)), bytes);
});

test("an unencodable special-move string fails the writer", () => {
  const model: SpecialMove = {
    magic: SPECIAL_MOVE_MAGIC,
    major: 2,
    minor: 0,
    name: "bad\u0100",
    damage: 1,
    smpCost: 1,
    program: "",
    targetSmpDrain: 0,
    usableInBattle: 1,
    usableFromMenu: 1,
    statusEffect: "",
    animation: "",
    description: "",
  };
  equal(writeSpecialMove(model).ok, false);
});

// --- Status effects (§8.2) --------------------------------------------------

test("reads a status effect's header and every field", () => {
  const reader = new BinaryReader(buildSte());
  const effect = unwrap(readStatusEffect(reader));
  equal(effect.magic, STATUS_EFFECT_MAGIC);
  equal(effect.major, 2);
  equal(effect.minor, 0);
  equal(effect.name, "Poison");
  equal(effect.rounds, 3);
  equal(effect.speedUp, 0);
  equal(effect.slowDown, -2);
  equal(effect.disable, 0);
  equal(effect.hpEnabled, 1);
  equal(effect.hpPerRound, -5);
  equal(effect.smpEnabled, 0);
  equal(effect.smpPerRound, 0);
  equal(effect.runProgram, 0);
  equal(effect.program, "");
  equal(reader.remaining, 0);
});

test("negative per-round amounts are preserved (they heal)", () => {
  const effect = unwrap(
    readStatusEffect(new BinaryReader(buildSte({ hpPerRound: -12, smpPerRound: -34 }))),
  );
  equal(effect.hpPerRound, -12);
  equal(effect.smpPerRound, -34);
  const out = unwrap(writeStatusEffect(effect));
  deepEqual(out, buildSte({ hpPerRound: -12, smpPerRound: -34 }));
});

test("an i16 field's signedness is preserved at the extremes", () => {
  const effect = unwrap(
    readStatusEffect(new BinaryReader(buildSte({ rounds: -32768, speedUp: 32767 }))),
  );
  equal(effect.rounds, -32768);
  equal(effect.speedUp, 32767);
});

test("a wrong status-effect magic is an error at offset 0", () => {
  const bytes = buildSte({ magic: "RPGTLKIT STATUSX" });
  const result = readStatusEffect(new BinaryReader(bytes));
  equal(result.ok, false);
  if (result.ok) {
    return;
  }
  equal(result.error.offset, 0);
  equal(result.error.section, STATUS_EFFECT_SECTION);
});

test("a text-form status effect is refused at the detection byte", () => {
  const bytes = ascii("RPGTLKIT STATUSE\r\n2\r\n0\r\nPoison\r\n");
  const result = readStatusEffect(new BinaryReader(bytes));
  equal(result.ok, false);
  if (result.ok) {
    return;
  }
  equal(result.error.offset, 16);
  equal(result.error.section, STATUS_EFFECT_SECTION);
  equal(result.error.message.includes("text form"), true);
});

test("a parsed status effect writes back byte-for-byte", () => {
  const bytes = buildSte({ name: "", rounds: 1, hpPerRound: -1, program: "poison.prg" });
  const effect = unwrap(readStatusEffect(new BinaryReader(bytes)));
  deepEqual(unwrap(writeStatusEffect(effect)), bytes);
});

// --- Battle backgrounds (§8.3) ---------------------------------------------

test("reads a battle background's header and six string fields", () => {
  const reader = new BinaryReader(buildBkg());
  const background = unwrap(readBattleBackground(reader));
  equal(background.magic, BATTLE_BACKGROUND_MAGIC);
  equal(background.major, 2);
  equal(background.minor, 0);
  equal(background.image, "field.bmp");
  equal(background.music, "battle.mid");
  equal(background.menuMoveSound, "move.wav");
  equal(background.menuChooseSound, "");
  equal(background.readySound, "ready.wav");
  equal(background.cantDoSound, "cant.wav");
  equal(reader.remaining, 0);
});

test("a battle background distinguishes empty from non-empty strings", () => {
  const background = unwrap(
    readBattleBackground(
      new BinaryReader(
        buildBkg({ image: "", music: "m.mid", menuMoveSound: "", readySound: "r.wav" }),
      ),
    ),
  );
  equal(background.image, "");
  equal(background.music, "m.mid");
  equal(background.menuMoveSound, "");
  equal(background.readySound, "r.wav");
});

test("a wrong battle-background magic is an error at offset 0", () => {
  const bytes = buildBkg({ magic: "RPGTLKIT BKX" });
  const result = readBattleBackground(new BinaryReader(bytes));
  equal(result.ok, false);
  if (result.ok) {
    return;
  }
  equal(result.error.offset, 0);
  equal(result.error.section, BATTLE_BACKGROUND_SECTION);
});

test("a text-form battle background is refused at the detection byte", () => {
  const bytes = ascii("RPGTLKIT BKG\r\n2\r\n0\r\nfield.bmp\r\n");
  const result = readBattleBackground(new BinaryReader(bytes));
  equal(result.ok, false);
  if (result.ok) {
    return;
  }
  equal(result.error.offset, 12);
  equal(result.error.section, BATTLE_BACKGROUND_SECTION);
  equal(result.error.message.includes("text form"), true);
});

test("a short battle background reports the field offset", () => {
  const bytes = buildBkg().slice(0, 21);
  const result = readBattleBackground(new BinaryReader(bytes));
  equal(result.ok, false);
  if (result.ok) {
    return;
  }
  // magic (13) + major (2) + minor (2): the image string starts here.
  equal(result.error.offset, 17);
});

test("a parsed battle background writes back byte-for-byte", () => {
  const bytes = buildBkg({ image: "", music: "", menuChooseSound: "ch.wav" });
  const background = unwrap(readBattleBackground(new BinaryReader(bytes)));
  deepEqual(unwrap(writeBattleBackground(background)), bytes);
});

test("an unencodable battle-background string fails the writer", () => {
  const model: BattleBackground = {
    magic: BATTLE_BACKGROUND_MAGIC,
    major: 2,
    minor: 0,
    image: "",
    music: "bad\u0100.mid",
    menuMoveSound: "",
    menuChooseSound: "",
    readySound: "",
    cantDoSound: "",
  };
  equal(writeBattleBackground(model).ok, false);
});

// --- Sample fixtures (guard-rail G5 rule 4: fetched, never committed) --------

const sampleBkg = join(repoRoot, "fixtures", "legacy", "demo", "Bkrounds", "bkg.bkg");

test(
  "the sample battle background parses with zero trailing bytes and round-trips",
  { skip: existsSync(sampleBkg) ? false : "legacy fixtures are not fetched" },
  () => {
    const bytes = new Uint8Array(readFileSync(sampleBkg));
    const reader = new BinaryReader(bytes, sampleBkg);
    const background = unwrap(readBattleBackground(reader));
    equal(reader.remaining, 0, `${sampleBkg} has ${reader.remaining} trailing byte(s)`);
    deepEqual(unwrap(writeBattleBackground(background)), bytes, `${sampleBkg} did not round-trip`);
  },
);
