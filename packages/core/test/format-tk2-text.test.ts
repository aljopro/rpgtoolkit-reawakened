import test from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BinaryReader,
  readAnimation,
  readEnemy,
  readSpecialMove,
  readStatusEffect,
  readBattleBackground,
  type Result,
} from "../src/index.ts";

function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`expected ok, got error: ${result.error.message} at offset ${result.error.offset}`);
  }
  return result.value;
}

function ascii(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    bytes[i] = text.charCodeAt(i) & 0xff;
  }
  return bytes;
}
const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "..", "..", "..");
const SPEC_EXAMPLES = join(repoRoot, "docs", "spec", "examples", "versions");
test("enemy: text example parses to its last line with 0 trailing bytes", () => {
  const path = join(SPEC_EXAMPLES, "enemy/enemy_text.ene");
  const bytes = new Uint8Array(readFileSync(path));
  const reader = new BinaryReader(bytes, path);
  const enemy = unwrap(readEnemy(reader));

  equal(enemy.magic, "RPGTLKIT ENEMY");
  equal(enemy.major, 2);
  equal(enemy.minor, 0);
  equal(enemy.name, "Slime");
  equal(enemy.hp, 12);
  equal(enemy.smp, 4);
  equal(enemy.fp, 3);
  equal(enemy.dp, 1);
  equal(enemy.canRun, 1);
  equal(enemy.criticalOn, 20);
  equal(enemy.criticalBy, 30);
  equal(enemy.width, 1);
  equal(enemy.height, 1);
  equal(enemy.tileGrid?.length, 133);
  equal(enemy.tileGrid?.[0], "village.tst22");
  equal(enemy.specialMoves.length, 101);
  equal(enemy.weaknesses.length, 101);
  equal(enemy.strengths.length, 0);
  equal(enemy.aiLevel, 0);
  equal(enemy.customAi, 0);
  equal(enemy.experienceReward, 5);
  equal(enemy.goldReward, 3);
  equal(enemy.stances.length, 6);
  equal(enemy.stances[0], "");
  equal(enemy.stances[5], "");
  equal(enemy.residue.length, 0);
  equal(reader.remaining, 0, "consumed to the last line");
});

test("animation: text example parses to its last line with 0 trailing bytes", () => {
  const path = join(SPEC_EXAMPLES, "animation/animation_text.anm");
  const bytes = new Uint8Array(readFileSync(path));
  const reader = new BinaryReader(bytes, path);
  const animation = unwrap(readAnimation(reader));

  equal(animation.magic, "RPGTLKIT ANIM");
  equal(animation.major, 2);
  equal(animation.minor, 0);
  equal(animation.width, 32);
  equal(animation.height, 32);
  equal(animation.frames.length, 51);
  equal(animation.frames[0]?.image, "village.tst15");
  deepEqual(animation.frames[0]?.transparent, { r: 255, g: 255, b: 255 });
  equal(animation.frames[1]?.image, "village.tst16");
  equal(animation.delay, 0.15);
  equal(animation.residue.length, 0);
  equal(reader.remaining, 0, "consumed to the last line");
});

test("animation: handles scientific notation delay as seen in Caoquest", () => {
  const lines: string[] = [
    "RPGTLKIT ANIM",
    "2",
    "0",
    "32",
    "32",
    "0",
  ];
  for (let i = 0; i < 51; i++) {
    lines.push(`frame_${i}.png`, "16777215", "");
  }
  lines.push("6.66666666666667E-02");
  const text = lines.join("\r\n") + "\r\n";
  const reader = new BinaryReader(ascii(text));
  const animation = unwrap(readAnimation(reader));

  equal(animation.frames.length, 51);
  equal(Math.abs(animation.delay - 0.0666666666666667) < 1e-10, true);
  equal(reader.remaining, 0);
});

test("animation: handles empty delay line defaulting to 0 as in ChimeranEmpire Pollen.anm", () => {
  const lines: string[] = [
    "RPGTLKIT ANIM",
    "2",
    "0",
    "32",
    "32",
    "0",
  ];
  for (let i = 0; i < 51; i++) {
    lines.push(`frame_${i}.png`, "16777215", "");
  }
  lines.push("");
  const text = lines.join("\r\n") + "\r\n";
  const reader = new BinaryReader(ascii(text));
  const animation = unwrap(readAnimation(reader));

  equal(animation.frames.length, 51);
  equal(animation.delay, 0);
  equal(reader.remaining, 0);
});

test("special move: text example parses to its last line with 0 trailing bytes", () => {
  const path = join(SPEC_EXAMPLES, "special-move/special_text.spc");
  const bytes = new Uint8Array(readFileSync(path));
  const reader = new BinaryReader(bytes, path);
  const move = unwrap(readSpecialMove(reader));

  equal(move.magic, "RPGTLKIT SPLMOVE");
  equal(move.major, 2);
  equal(move.minor, 0);
  equal(move.name, "Fireball");
  equal(move.damage, 12);
  equal(move.smpCost, 5);
  equal(move.program, "fireball.prg");
  equal(move.targetSmpDrain, 0);
  equal(move.usableInBattle, 1);
  equal(move.usableFromMenu, 0);
  equal(move.statusEffect, "burn.ste");
  equal(move.animation, "");
  equal(move.description, "");
  equal(move.residue.length, 0);
  equal(reader.remaining, 0, "consumed to the last line");
});

test("status effect: text example parses to its last line with 0 trailing bytes", () => {
  const path = join(SPEC_EXAMPLES, "status-effect/status_text.ste");
  const bytes = new Uint8Array(readFileSync(path));
  const reader = new BinaryReader(bytes, path);
  const effect = unwrap(readStatusEffect(reader));

  equal(effect.magic, "RPGTLKIT STATUSE");
  equal(effect.major, 2);
  equal(effect.minor, 0);
  equal(effect.name, "Burn");
  equal(effect.rounds, 3);
  equal(effect.speedUp, 0);
  equal(effect.slowDown, 0);
  equal(effect.disable, 0);
  equal(effect.hpEnabled, 1);
  equal(effect.hpPerRound, 2);
  equal(effect.smpEnabled, 0);
  equal(effect.smpPerRound, 0);
  equal(effect.runProgram, 0);
  equal(effect.program, "");
  equal(effect.residue.length, 0);
  equal(reader.remaining, 0, "consumed to the last line");
});

test("fight background: text example parses to its last line with 0 trailing bytes", () => {
  const path = join(SPEC_EXAMPLES, "fight-background/background_text.bkg");
  const bytes = new Uint8Array(readFileSync(path));
  const reader = new BinaryReader(bytes, path);
  const bkg = unwrap(readBattleBackground(reader));

  equal(bkg.magic, "RPGTLKIT BKG");
  equal(bkg.major, 2);
  equal(bkg.minor, 0);
  equal(bkg.tiles?.length, 209);
  equal(bkg.tiles?.[0], "village.tst5");
  equal(bkg.music, "battle.mid");
  equal(bkg.tints?.length, 209);
  deepEqual(bkg.tints?.[0], { r: 0, g: 0, b: 0 });
  equal(bkg.residue.length, 0);
  equal(reader.remaining, 0, "consumed to the last line");
});

test("refusals: invalid headers or versions report located FormatError", () => {
  const badMagicEne = readEnemy(new BinaryReader(ascii("RPGTLKIT BADMAGIC\r\n2\r\n0\r\n")));
  equal(badMagicEne.ok, false);
  if (!badMagicEne.ok) {
    equal(badMagicEne.error.offset, 0);
  }

  const badMinorEne = readEnemy(new BinaryReader(ascii("RPGTLKIT ENEMY\r\n2\r\n9\r\n")));
  equal(badMinorEne.ok, false);

  const badMagicAnm = readAnimation(new BinaryReader(ascii("RPGTLKIT NOTANM\r\n2\r\n0\r\n")));
  equal(badMagicAnm.ok, false);
  if (!badMagicAnm.ok) {
    equal(badMagicAnm.error.offset, 0);
  }

  const badMagicSpc = readSpecialMove(new BinaryReader(ascii("RPGTLKIT BADSPC\r\n2\r\n0\r\n")));
  equal(badMagicSpc.ok, false);
  if (!badMagicSpc.ok) {
    equal(badMagicSpc.error.offset, 0);
  }

  const badMagicSte = readStatusEffect(new BinaryReader(ascii("RPGTLKIT BADSTE\r\n2\r\n0\r\n")));
  equal(badMagicSte.ok, false);
  if (!badMagicSte.ok) {
    equal(badMagicSte.error.offset, 0);
  }

  const badMagicBkg = readBattleBackground(new BinaryReader(ascii("RPGTLKIT BADBKG\r\n2\r\n0\r\n")));
  equal(badMagicBkg.ok, false);
  if (!badMagicBkg.ok) {
    equal(badMagicBkg.error.offset, 0);
  }
});
