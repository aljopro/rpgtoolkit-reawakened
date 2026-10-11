/**
 * The main game file (`.gam`) model and its constants (format-spec §2).
 *
 * A main file is the one file a game cannot boot without (§1.5): it carries
 * `projectPath`, the startup program and board, the window settings and the
 * active plugins. §2 documents 43 logical rows across minors 0–9, twelve of
 * them version-dependent; this model holds every row, including the reserved
 * runs, so an unchanged file writes back byte-for-byte (AD-18).
 *
 * The reserved runs are kept as raw bytes rather than as parsed numbers: they
 * are unmodelled for the minor that wrote them (the "unknown minor" residue),
 * so re-emitting the exact bytes is the only way to guarantee a byte-identical
 * round-trip (AD-18).
 */

import type { Colorref } from "../binary/color.ts";

/** The magic every binary main file starts with (format-spec §2 row 1). */
export const MAIN_MAGIC = "RPGTLKIT MAIN";

/** The format-spec section the main-file reader, writer and model implement (G7). */
export const MAIN_SECTION = "format-spec §2";

/** The lowest minor version this reader accepts (format-spec §2). */
export const MAIN_MIN_MINOR = 0;

/** The highest minor version this reader accepts (9 = 3.1.0, format-spec §2). */
export const MAIN_MAX_MINOR = 9;

/**
 * The offset `projectPath` starts at when the registration rows are written the
 * way the editor writes them and the registration code is the default
 * `"NOCODE"` (format-spec §2 rows 3–4): magic (13 + NUL) + two `i16` versions +
 * the `i16` flag + `"NOCODE\0"` = 0x1B.
 */
export const MAIN_PROJECT_PATH_OFFSET = 0x1b;

/** The minor from which `gameSpeed` is stored biased by +128 (format-spec §2 row 38). */
export const GAME_SPEED_BIAS_MINOR = 8;

/** The bias `gameSpeed` carries at minor ≥ 8 (format-spec §2 row 38). */
export const GAME_SPEED_BIAS = 128;

/**
 * Decode the stored `gameSpeed` byte (format-spec §2 row 38). At minor ≥ 8 the
 * byte is `speed + 128`, so the speed is in −4…+4 (each step ±10 %); below 8 the
 * byte is the raw speed and is returned unchanged.
 */
export function decodeGameSpeed(minor: number, stored: number): number {
  return minor >= GAME_SPEED_BIAS_MINOR ? stored - GAME_SPEED_BIAS : stored;
}

/** Encode a `gameSpeed` back to its stored byte (format-spec §2 row 38). */
export function encodeGameSpeed(minor: number, speed: number): number {
  return minor >= GAME_SPEED_BIAS_MINOR ? speed + GAME_SPEED_BIAS : speed;
}

/** One extra run-time key: an ASCII key code plus the program it runs (§2 row 19). */
export interface MainFileExtKey {
  /** The ASCII code of the key (an uppercase letter or digit, §2 row 19). */
  readonly asciiKey: number;
  /** The program bound to the key; empty entries are kept but skipped at runtime. */
  readonly program: string;
}

/** One entry of the random-encounter pool (§2 row 21). */
export interface MainFileEnemy {
  /** The enemy file reference, relative to `Enemy/` (§1.5, §2 row 21). */
  readonly enemyFile: string;
  /** The enemy's skill level. */
  readonly skillLevel: number;
}

/**
 * One plugin-list entry (§2 row 29). The layout differs by minor: at minor ≤ 2
 * each entry is an `i16 enabled` and the plugin name is implied as `tkplug<N>`;
 * at minor ≥ 3 each entry is a `str pluginFile`. Both fields are carried, and
 * the writer emits the one the file's minor stores, so no entry can be written
 * at the wrong width.
 */
export interface MainFilePlugin {
  /** The stored `i16 enabled` at minor ≤ 2; `0` when the minor stores a name. */
  readonly enabled: number;
  /** The stored `str pluginFile` at minor ≥ 3; `""` when the minor stores a flag. */
  readonly pluginFile: string;
}

/**
 * The reserved runs the spec says to ignore, kept verbatim so the writer can
 * reproduce them (AD-18). Each is empty when the minor does not carry it.
 */
export interface MainFileResidue {
  /** Row 10, minor < 3: an `i32` between `resolution` and `disableProtectReg`. */
  readonly parallax: Uint8Array;
  /** Row 21, minor < 3: the `i32` in place of `menuPlugin`/`fightPlugin`. */
  readonly menuPluginFallback: Uint8Array;
  /** Row 22, minor ≤ 2: the `i32` + `i16` multitask-speed / memory-protection run. */
  readonly multitask: Uint8Array;
  /** Row 29, minor < 3: the `i16` old fight style after `customFightPrg`. */
  readonly fightStyle: Uint8Array;
}

/** A parsed main game file (format-spec §2). */
export interface MainFile {
  /** The magic string, `"RPGTLKIT MAIN"` (§2 row 1). */
  readonly magic: string;
  /** The major version; informational only (§1.4, §2 row 2). */
  readonly major: number;
  /** The minor version; selects the layout, 0–9 (§1.4, §2 row 2). */
  readonly minor: number;
  /**
   * Row 3: the old registration flag. The editor writes it as an `i16`; the
   * legacy C++ reader read an `i32` here, consuming 2 bytes of the following
   * `"NOCODE\0"`. Both land at the same offset (§2 rows 3–4), and this reader
   * follows the editor's `i16` so the write round-trips.
   */
  readonly registrationFlag: number;
  /** Row 4: the old registration code, default `"NOCODE"`. */
  readonly registrationCode: string;
  /** Row 5: the project folder under `Game/` (§1.5). */
  readonly projectPath: string;
  /** Row 6: the window title. */
  readonly gameTitle: string;
  /** Row 7: `0`/`1` full-screen accelerated, `2` windowed. */
  readonly screenType: number;
  /** Row 8: `0`/`1`. */
  readonly extendToFullScreen: number;
  /** Row 9: `0` = 640×480, `1` = 800×600, `2` = 1024×768, other = custom. */
  readonly resolution: number;
  /** Row 10: obsolete. */
  readonly disableProtectReg: number;
  /** Row 11: obsolete language file. */
  readonly languageFile: string;
  /** Row 12: the program run at boot. */
  readonly startupPrg: string;
  /** Row 13: the first board. */
  readonly initBoard: string;
  /** Row 14: the first player character (`.tem`). */
  readonly initChar: string;
  /** Row 15: the program bound to the run-time key. */
  readonly runTimePrg: string;
  /** Row 16: the ASCII code of the run-time key. */
  readonly runTimeKey: number;
  /** Row 17: the ASCII code of the menu key. */
  readonly menuKey: number;
  /** Row 18: the ASCII code of the "interact" key. */
  readonly activationKey: number;
  /** Row 19: the extra run-time keys, in file order (the upper bound is derived). */
  readonly extKeys: readonly MainFileExtKey[];
  /** Row 21, minor ≥ 3: the menu plugin; empty when the minor does not carry it. */
  readonly menuPlugin: string;
  /** Row 21, minor ≥ 3: the fight plugin; empty when the minor does not carry it. */
  readonly fightPlugin: string;
  /**
   * Row 20: the inverted fighting flag — **0 = fighting enabled**, non-zero =
   * disabled (§2). Kept as stored, so the legacy `-1` round-trips.
   */
  readonly fightingDisabled: number;
  /** Row 21: the random-encounter pool (the upper bound is derived). */
  readonly enemies: readonly MainFileEnemy[];
  /** Row 22: `0` = random, `1` = planned. */
  readonly fightType: number;
  /** Row 23: the encounter chance / tile interval. */
  readonly chances: number;
  /** Row 24: `0`/`1`. */
  readonly useCustomFightPrg: number;
  /** Row 25: the RPGCode run instead of the built-in battle. */
  readonly customFightPrg: string;
  /** Row 26: the program run when the party is defeated. */
  readonly gameOverPrg: string;
  /** Row 27: legacy UI skin image. */
  readonly skinButton: string;
  /** Row 28: legacy UI skin image. */
  readonly skinWindow: string;
  /** Row 29: the plugin list (the upper bound is derived). */
  readonly plugins: readonly MainFilePlugin[];
  /** Row 30: `0`/`1`. */
  readonly useDayNight: number;
  /** Row 31: `0` = real clock, `1` = game clock. */
  readonly dayNightType: number;
  /** Row 32: minutes per day. */
  readonly dayLengthMinutes: number;
  /** Row 37, minor ≥ 3. */
  readonly cursorMoveSound: string;
  /** Row 37, minor ≥ 3. */
  readonly cursorSelectSound: string;
  /** Row 37, minor ≥ 3. */
  readonly cursorCancelSound: string;
  /** Row 37, minor ≥ 3: `u8`. */
  readonly useJoystick: number;
  /** Row 37, minor ≥ 3: `u8`. */
  readonly colorDepth: number;
  /**
   * Row 38, minor ≥ 4: the decoded speed. At minor ≥ 8 the stored byte is
   * `speed + 128` (range −4…+4); below 8 it is the raw speed (§2).
   */
  readonly gameSpeed: number;
  /** Row 38, minor ≥ 4: `0` = tile steps, `1` = pixel steps. */
  readonly pixelMovement: number;
  /** Row 39, minor = 5: `u8`; the cursor is `"TK DEFAULT"` or none. */
  readonly cursorEnabled: number;
  /** Row 40, minor ≥ 6: `"TK DEFAULT"`, `""` (none) or an image/tile reference. */
  readonly mouseCursor: string;
  /** Row 40, minor ≥ 6: `u8`. */
  readonly hotSpotX: number;
  /** Row 40, minor ≥ 6: `u8`. */
  readonly hotSpotY: number;
  /** Row 40, minor ≥ 6: the transparent colour. */
  readonly transparent: Colorref;
  /** Row 41, minor ≥ 7: custom resolution width. */
  readonly resX: number;
  /** Row 41, minor ≥ 7: custom resolution height. */
  readonly resY: number;
  /** Row 42, minor ≥ 8: `u8`. */
  readonly showFpsInTitle: number;
  /** Row 43, minor ≥ 9: axial / diagonal / vector. */
  readonly pathfindHeuristic: number;
  /** Row 43, minor ≥ 9: debug-overlay bit flags. */
  readonly drawVectorsFlags: number;
  /** Row 43, minor ≥ 9: the path colour. */
  readonly pathColor: Colorref;
  /** Row 43, minor ≥ 9: movement-control bits (1 = keyboard, 2 = mouse, 4 = diagonals). */
  readonly movementControls: number;
  /** Row 43, minor ≥ 9: eight scan codes, ordered E, SE, S, SW, W, NW, N, NE. */
  readonly movementScanCodes: readonly number[];
  /** The reserved runs, kept verbatim (AD-18). */
  readonly residue: MainFileResidue;
}
