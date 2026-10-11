/**
 * The battle-data models and their constants (format-spec §8): special moves
 * (§8.1), status effects (§8.2) and battle backgrounds (§8.3).
 *
 * Each of the three is a magic-and-version header (`str magic`, `i16 major`,
 * `i16 minor`, §1.3/§1.4) followed by a fixed field list. The models keep every
 * field verbatim plus any bytes after the last documented one as `residue`, so
 * a parsed file writes back byte-for-byte (AD-18, §1.7).
 *
 * Each format also has a 2.x-era line-oriented text form. Its presence is
 * detected by the byte at a documented offset — `0x00` means binary, a CR/LF
 * means text (§1.3, §8.1–§8.3). This ticket implements the binary layout only;
 * the readers refuse the text form rather than mis-parsing it.
 */

import type { BinaryReader } from "../binary/reader.ts";
import type { FormatError } from "../result.ts";

/** The magic every binary special move starts with (format-spec §8.1). */
export const SPECIAL_MOVE_MAGIC = "RPGTLKIT SPLMOVE";

/**
 * The offset of the binary/text detection byte for `.spc` (format-spec §8.1):
 * `0x00` means binary, non-zero means the 2.x text form.
 */
export const SPECIAL_MOVE_DETECT_OFFSET = 16;

/** The format-spec section the special-move reader and writer implement (G7). */
export const SPECIAL_MOVE_SECTION = "format-spec §8.1";

/** The magic every binary status effect starts with (format-spec §8.2). */
export const STATUS_EFFECT_MAGIC = "RPGTLKIT STATUSE";

/**
 * The offset of the binary/text detection byte for `.ste` (format-spec §8.2):
 * `0x00` means binary, non-zero means the 2.x text form.
 */
export const STATUS_EFFECT_DETECT_OFFSET = 16;

/** The format-spec section the status-effect reader and writer implement (G7). */
export const STATUS_EFFECT_SECTION = "format-spec §8.2";

/** The magic every binary battle background starts with (format-spec §8.3). */
export const BATTLE_BACKGROUND_MAGIC = "RPGTLKIT BKG";

/**
 * The offset of the binary/text detection byte for `.bkg` (format-spec §8.3):
 * `0x00` means binary, non-zero means the 2.x text form.
 */
export const BATTLE_BACKGROUND_DETECT_OFFSET = 12;

/** The format-spec section the battle-background reader and writer implement (G7). */
export const BATTLE_BACKGROUND_SECTION = "format-spec §8.3";

/** A parsed special move (format-spec §8.1). */
export interface SpecialMove {
  /** The magic string, `"RPGTLKIT SPLMOVE"` in a binary file (§1.3, §8.1). */
  readonly magic: string;
  /** The major version; informational only (§1.4). */
  readonly major: number;
  /** The minor version (§1.4). */
  readonly minor: number;
  /** The move's name / handle (§8.1). */
  readonly name: string;
  /** The FP damage dealt (an `i32`, §8.1). */
  readonly damage: number;
  /** The SMP the move costs its user (an `i32`, §8.1). */
  readonly smpCost: number;
  /** The RPGCode program the move runs (§8.1). */
  readonly program: string;
  /** The SMP drained from the target (an `i32`, §8.1). */
  readonly targetSmpDrain: number;
  /** Whether the move may be used in battle: the raw `i8` is kept verbatim, non-zero is true and `-1` is possible (§1.1, §8.1). */
  readonly usableInBattle: number;
  /** Whether the move may be used from the menu: the raw `i8` is kept verbatim, non-zero is true and `-1` is possible (§1.1, §8.1). */
  readonly usableFromMenu: number;
  /** The status effect the move applies, by handle (§8.1). */
  readonly statusEffect: string;
  /** The animation the move plays, by reference (§8.1). */
  readonly animation: string;
  /** The move's one-line description (§8.1). */
  readonly description: string;
  /**
   * Bytes after the last documented field, kept so a write is byte-identical
   * (AD-18, §1.7). The spec defines no trailing data, so a non-empty residue is
   * reported as a warning rather than dropped.
   */
  readonly residue: Uint8Array;
}

/** A parsed status effect (format-spec §8.2). */
export interface StatusEffect {
  /** The magic string, `"RPGTLKIT STATUSE"` in a binary file (§1.3, §8.2). */
  readonly magic: string;
  /** The major version; informational only (§1.4). */
  readonly major: number;
  /** The minor version (§1.4). */
  readonly minor: number;
  /** The effect's name / handle (§8.2). */
  readonly name: string;
  /** How many rounds the effect lasts (an `i16`, §8.2). */
  readonly rounds: number;
  /** The speed bonus (an `i16`, §8.2). */
  readonly speedUp: number;
  /** The speed penalty (an `i16`, §8.2). */
  readonly slowDown: number;
  /** The raw `disable` value (an `i16`, §8.2), kept verbatim: the spec does not make it a flag, so any signed value, `-1` included, is stored as-is (§1.1). */
  readonly disable: number;
  /** Whether HP is affected: the raw `i16` is kept verbatim, non-zero is true and `-1` is possible (§1.1, §8.2). */
  readonly hpEnabled: number;
  /** HP changed per round; negative heals (an `i16`, §8.2). */
  readonly hpPerRound: number;
  /** Whether SMP is affected: the raw `i16` is kept verbatim, non-zero is true and `-1` is possible (§1.1, §8.2). */
  readonly smpEnabled: number;
  /** SMP changed per round; negative heals (an `i16`, §8.2). */
  readonly smpPerRound: number;
  /** Whether the program runs: the raw `i16` is kept verbatim, non-zero is true and `-1` is possible (§1.1, §8.2). */
  readonly runProgram: number;
  /** The RPGCode program the effect runs (§8.2). */
  readonly program: string;
  /**
   * Bytes after the last documented field, kept so a write is byte-identical
   * (AD-18, §1.7). The spec defines no trailing data, so a non-empty residue is
   * reported as a warning rather than dropped.
   */
  readonly residue: Uint8Array;
}

/** A parsed battle background (format-spec §8.3). */
export interface BattleBackground {
  /** The magic string, `"RPGTLKIT BKG"` in a binary file (§1.3, §8.3). */
  readonly magic: string;
  /** The major version; informational only (§1.4). */
  readonly major: number;
  /** The minor version (§1.4). */
  readonly minor: number;
  /** The background image reference (§8.3). */
  readonly image: string;
  /** The music reference (§8.3). */
  readonly music: string;
  /** The menu-move sound cue (§8.3). */
  readonly menuMoveSound: string;
  /** The menu-choose sound cue (§8.3). */
  readonly menuChooseSound: string;
  /** The "ready" sound cue (§8.3). */
  readonly readySound: string;
  /** The "can't do that" sound cue (§8.3). */
  readonly cantDoSound: string;
  /**
   * Bytes after the last documented field, kept so a write is byte-identical
   * (AD-18, §1.7). The spec defines no trailing data, so a non-empty residue is
   * reported as a warning rather than dropped.
   */
  readonly residue: Uint8Array;
}

/**
 * Build the located `FormatError` a reader returns when the detection byte at
 * `offset` says the file is the 2.x line-oriented text form (format-spec §1.3,
 * §8.1–§8.3). The error names the form as unsupported so the caller never
 * mis-parses text as binary (AD-18).
 */
export function unsupportedTextForm(
  reader: BinaryReader,
  offset: number,
  section: string,
  magic: string,
): FormatError {
  return {
    ...(reader.path === undefined ? {} : { path: reader.path }),
    offset,
    section,
    message: `${magic}: unsupported 2.x line-oriented text form (byte at offset ${offset} is non-NUL); only the binary 3.x layout is implemented`,
  };
}
