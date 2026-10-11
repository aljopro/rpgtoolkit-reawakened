/**
 * Reading a main game file (format-spec §2): the binary layout of
 * `RPGTLKIT MAIN` across minors 0–9.
 *
 * Pure (G2): it consumes a `BinaryReader` the caller positioned and never
 * touches a host. A wrong magic, a version outside 0–9, a truncated file or a
 * short read is a `Result` carrying a located `FormatError`, never a throw
 * (AD-18). The reader consumes exactly the rows §2 lists for the file's minor,
 * then keeps any bytes after them as the file's `residue` and warns once
 * (§1.7).
 *
 * The twelve version-dependent rows are read here in the order §2 lists them;
 * each is guarded by the condition the spec gives it (`minor < 3`, `minor ≤ 2`,
 * `minor ≥ 3`, `minor ≥ 4`, `minor = 5`, `minor ≥ 6`, `minor ≥ 7`, `minor ≥ 8`,
 * `minor ≥ 9`). Reserved runs are read as raw bytes and kept so the writer
 * reproduces them (AD-18).
 */

import { err, ok, type Result } from "../result.ts";
import { BinaryReader } from "../binary/reader.ts";
import type { Colorref } from "../binary/color.ts";
import {
  decodeGameSpeed,
  MAIN_MAGIC,
  MAIN_MAX_MINOR,
  MAIN_MIN_MINOR,
  MAIN_SECTION,
  type MainFile,
  type MainFileEnemy,
  type MainFileExtKey,
  type MainFilePlugin,
  type MainFileReservedRuns,
} from "./model.ts";

const NO_BYTES: Uint8Array = new Uint8Array(0);
const NO_COLOR: Colorref = { r: 0, g: 0, b: 0 };

/** A located error for a main-file field (AD-18). */
function fail(reader: BinaryReader, offset: number, message: string): Result<never> {
  return err({
    ...(reader.path === undefined ? {} : { path: reader.path }),
    offset,
    section: MAIN_SECTION,
    message,
  });
}

/**
 * Read a main game file from `reader` (format-spec §2). The header's minor must
 * be 0–9; every field §2 lists for that minor is read in order. Any bytes after
 * the last row are kept as `residue` and reported as one warning (§1.7).
 */
export function readMainFile(reader: BinaryReader): Result<MainFile> {
  const start = reader.offset;
  const header = reader.header();
  if (!header.ok) {
    return header;
  }
  const { magic, major, minor } = header.value;
  if (magic !== MAIN_MAGIC) {
    return fail(reader, start, `not a main file: magic is "${magic}", expected "${MAIN_MAGIC}"`);
  }
  if (major < 0) {
    return fail(reader, start + MAIN_MAGIC.length + 1, `negative major version ${major} (format-spec §1.4)`);
  }
  if (minor < MAIN_MIN_MINOR || minor > MAIN_MAX_MINOR) {
    return fail(
      reader,
      start + MAIN_MAGIC.length + 3,
      `unsupported main-file minor ${minor}: this layout accepts ${MAIN_MIN_MINOR}–${MAIN_MAX_MINOR}`,
    );
  }

  // Rows 3–4: the registration quirk. The editor writes an i16 flag and then
  // the `"NOCODE"` str; the legacy C++ reader read an i32 here, eating two bytes
  // of the string and then reading `"CODE"`, and both land at the same offset
  // (`projectPath`, §2 rows 3–4). Reading the editor's shape round-trips.
  const registrationFlag = reader.i16();
  if (!registrationFlag.ok) {
    return registrationFlag;
  }
  const registrationCode = reader.str();
  if (!registrationCode.ok) {
    return registrationCode;
  }

  // Row 5: projectPath.
  const projectPath = reader.str();
  if (!projectPath.ok) {
    return projectPath;
  }
  const gameTitle = reader.str();
  if (!gameTitle.ok) {
    return gameTitle;
  }
  const screenType = reader.i16();
  if (!screenType.ok) {
    return screenType;
  }
  const extendToFullScreen = reader.i16();
  if (!extendToFullScreen.ok) {
    return extendToFullScreen;
  }
  const resolution = reader.i16();
  if (!resolution.ok) {
    return resolution;
  }

  // Row 10, minor < 3: reserved i32 (old parallax value).
  let parallax = NO_BYTES;
  if (minor < 3) {
    const r = reader.readBytes(4);
    if (!r.ok) {
      return r;
    }
    parallax = r.value;
  }

  const disableProtectReg = reader.i16();
  if (!disableProtectReg.ok) {
    return disableProtectReg;
  }
  const languageFile = reader.str();
  if (!languageFile.ok) {
    return languageFile;
  }
  const startupPrg = reader.str();
  if (!startupPrg.ok) {
    return startupPrg;
  }
  const initBoard = reader.str();
  if (!initBoard.ok) {
    return initBoard;
  }
  const initChar = reader.str();
  if (!initChar.ok) {
    return initChar;
  }
  const runTimePrg = reader.str();
  if (!runTimePrg.ok) {
    return runTimePrg;
  }
  const runTimeKey = reader.i16();
  if (!runTimeKey.ok) {
    return runTimeKey;
  }
  const menuKey = reader.i16();
  if (!menuKey.ok) {
    return menuKey;
  }
  const activationKey = reader.i16();
  if (!activationKey.ok) {
    return activationKey;
  }

  // Row 19: the extra run-time keys. The upper bound is `n` meaning `n + 1`
  // entries (`-1` means none, §1.2); empty-program entries are kept so the file
  // round-trips, even though the engine skips them at runtime (§2 row 19).
  const extKeys: MainFileExtKey[] = [];
  const extBound = reader.readUpperBound("i16");
  if (!extBound.ok) {
    return extBound;
  }
  for (let i = 0; i < extBound.value; i += 1) {
    const asciiKey = reader.i16();
    if (!asciiKey.ok) {
      return asciiKey;
    }
    const program = reader.str();
    if (!program.ok) {
      return program;
    }
    extKeys.push({ asciiKey: asciiKey.value, program: program.value });
  }

  // Row 21 (conditional): menuPlugin/fightPlugin at minor ≥ 3, a reserved i32
  // below it.
  let menuPlugin = "";
  let fightPlugin = "";
  let menuPluginFallback = NO_BYTES;
  if (minor >= 3) {
    const mp = reader.str();
    if (!mp.ok) {
      return mp;
    }
    menuPlugin = mp.value;
    const fp = reader.str();
    if (!fp.ok) {
      return fp;
    }
    fightPlugin = fp.value;
  } else {
    const r = reader.readBytes(4);
    if (!r.ok) {
      return r;
    }
    menuPluginFallback = r.value;
  }

  // Row 22 (conditional, minor ≤ 2): reserved i32 + i16.
  let multitask = NO_BYTES;
  if (minor <= 2) {
    const r = reader.readBytes(6);
    if (!r.ok) {
      return r;
    }
    multitask = r.value;
  }

  // Row 20: the inverted fighting flag (0 = enabled).
  const fightingDisabled = reader.i16();
  if (!fightingDisabled.ok) {
    return fightingDisabled;
  }

  // Row 21: the random-encounter pool.
  const enemies: MainFileEnemy[] = [];
  const enemyBound = reader.readUpperBound("i16");
  if (!enemyBound.ok) {
    return enemyBound;
  }
  for (let i = 0; i < enemyBound.value; i += 1) {
    const enemyFile = reader.str();
    if (!enemyFile.ok) {
      return enemyFile;
    }
    const skillLevel = reader.i16();
    if (!skillLevel.ok) {
      return skillLevel;
    }
    enemies.push({ enemyFile: enemyFile.value, skillLevel: skillLevel.value });
  }

  const fightType = reader.i16();
  if (!fightType.ok) {
    return fightType;
  }
  const chances = reader.i32();
  if (!chances.ok) {
    return chances;
  }
  const useCustomFightPrg = reader.i16();
  if (!useCustomFightPrg.ok) {
    return useCustomFightPrg;
  }
  const customFightPrg = reader.str();
  if (!customFightPrg.ok) {
    return customFightPrg;
  }

  // Row 29, minor < 3: reserved i16 (old fight style).
  let fightStyle = NO_BYTES;
  if (minor < 3) {
    const r = reader.readBytes(2);
    if (!r.ok) {
      return r;
    }
    fightStyle = r.value;
  }

  const gameOverPrg = reader.str();
  if (!gameOverPrg.ok) {
    return gameOverPrg;
  }
  const skinButton = reader.str();
  if (!skinButton.ok) {
    return skinButton;
  }
  const skinWindow = reader.str();
  if (!skinWindow.ok) {
    return skinWindow;
  }

  // Row 29: the plugin list. Entries are `i16 enabled` at minor ≤ 2 (the name is
  // implied as `tkplug<N>`) and `str pluginFile` at minor ≥ 3.
  const plugins: MainFilePlugin[] = [];
  const pluginBound = reader.readUpperBound("i16");
  if (!pluginBound.ok) {
    return pluginBound;
  }
  for (let i = 0; i < pluginBound.value; i += 1) {
    if (minor <= 2) {
      const enabled = reader.i16();
      if (!enabled.ok) {
        return enabled;
      }
      plugins.push({ enabled: enabled.value, pluginFile: "" });
    } else {
      const pluginFile = reader.str();
      if (!pluginFile.ok) {
        return pluginFile;
      }
      plugins.push({ enabled: 0, pluginFile: pluginFile.value });
    }
  }

  const useDayNight = reader.i16();
  if (!useDayNight.ok) {
    return useDayNight;
  }
  const dayNightType = reader.i16();
  if (!dayNightType.ok) {
    return dayNightType;
  }
  const dayLengthMinutes = reader.i32();
  if (!dayLengthMinutes.ok) {
    return dayLengthMinutes;
  }

  // Row 37 (conditional, minor ≥ 3): the cursor sounds and the joystick/colour
  // settings.
  let cursorMoveSound = "";
  let cursorSelectSound = "";
  let cursorCancelSound = "";
  let useJoystick = 0;
  let colorDepth = 0;
  if (minor >= 3) {
    const cms = reader.str();
    if (!cms.ok) {
      return cms;
    }
    cursorMoveSound = cms.value;
    const css = reader.str();
    if (!css.ok) {
      return css;
    }
    cursorSelectSound = css.value;
    const ccs = reader.str();
    if (!ccs.ok) {
      return ccs;
    }
    cursorCancelSound = ccs.value;
    const joy = reader.u8();
    if (!joy.ok) {
      return joy;
    }
    useJoystick = joy.value;
    const depth = reader.u8();
    if (!depth.ok) {
      return depth;
    }
    colorDepth = depth.value;
  }

  // Row 38 (conditional, minor ≥ 4): gameSpeed (biased at minor ≥ 8) and
  // pixelMovement.
  let gameSpeed = 0;
  let pixelMovement = 0;
  if (minor >= 4) {
    const gs = reader.u8();
    if (!gs.ok) {
      return gs;
    }
    gameSpeed = decodeGameSpeed(minor, gs.value);
    const pm = reader.u8();
    if (!pm.ok) {
      return pm;
    }
    pixelMovement = pm.value;
  }

  // Row 39 (conditional, minor = 5): cursorEnabled.
  let cursorEnabled = 0;
  if (minor === 5) {
    const ce = reader.u8();
    if (!ce.ok) {
      return ce;
    }
    cursorEnabled = ce.value;
  }

  // Row 40 (conditional, minor ≥ 6): the mouse cursor and its hot spot.
  let mouseCursor = "";
  let hotSpotX = 0;
  let hotSpotY = 0;
  let transparent = NO_COLOR;
  if (minor >= 6) {
    const mc = reader.str();
    if (!mc.ok) {
      return mc;
    }
    mouseCursor = mc.value;
    const hx = reader.u8();
    if (!hx.ok) {
      return hx;
    }
    hotSpotX = hx.value;
    const hy = reader.u8();
    if (!hy.ok) {
      return hy;
    }
    hotSpotY = hy.value;
    const t = reader.color();
    if (!t.ok) {
      return t;
    }
    transparent = t.value;
  }

  // Row 41 (conditional, minor ≥ 7): the custom resolution.
  let resX = 0;
  let resY = 0;
  if (minor >= 7) {
    const x = reader.i32();
    if (!x.ok) {
      return x;
    }
    resX = x.value;
    const y = reader.i32();
    if (!y.ok) {
      return y;
    }
    resY = y.value;
  }

  // Row 42 (conditional, minor ≥ 8): showFpsInTitle.
  let showFpsInTitle = 0;
  if (minor >= 8) {
    const fps = reader.u8();
    if (!fps.ok) {
      return fps;
    }
    showFpsInTitle = fps.value;
  }

  // Row 43 (conditional, minor ≥ 9): pathfinding, debug overlays, the path
  // colour, movement controls and the eight movement scan codes.
  let pathfindHeuristic = 0;
  let drawVectorsFlags = 0;
  let pathColor = NO_COLOR;
  let movementControls = 0;
  const movementScanCodes: number[] = [];
  if (minor >= 9) {
    const heuristic = reader.i16();
    if (!heuristic.ok) {
      return heuristic;
    }
    pathfindHeuristic = heuristic.value;
    const vectors = reader.i32();
    if (!vectors.ok) {
      return vectors;
    }
    drawVectorsFlags = vectors.value;
    const colour = reader.color();
    if (!colour.ok) {
      return colour;
    }
    pathColor = colour.value;
    const controls = reader.i32();
    if (!controls.ok) {
      return controls;
    }
    movementControls = controls.value;
    for (let i = 0; i < 8; i += 1) {
      const scan = reader.i16();
      if (!scan.ok) {
        return scan;
      }
      movementScanCodes.push(scan.value);
    }
  }

  const reservedRuns: MainFileReservedRuns = { parallax, menuPluginFallback, multitask, fightStyle };

  const trailing = reader.readBytes(reader.remaining);
  if (!trailing.ok) {
    return trailing;
  }
  const warnings: string[] = [];
  if (trailing.value.length > 0) {
    warnings.push(
      `${trailing.value.length} trailing byte(s) after the main file were kept as residue (format-spec §2, §1.7)`,
    );
  }

  return ok({
    magic,
    major,
    minor,
    registrationFlag: registrationFlag.value,
    registrationCode: registrationCode.value,
    projectPath: projectPath.value,
    gameTitle: gameTitle.value,
    screenType: screenType.value,
    extendToFullScreen: extendToFullScreen.value,
    resolution: resolution.value,
    disableProtectReg: disableProtectReg.value,
    languageFile: languageFile.value,
    startupPrg: startupPrg.value,
    initBoard: initBoard.value,
    initChar: initChar.value,
    runTimePrg: runTimePrg.value,
    runTimeKey: runTimeKey.value,
    menuKey: menuKey.value,
    activationKey: activationKey.value,
    extKeys,
    menuPlugin,
    fightPlugin,
    fightingDisabled: fightingDisabled.value,
    enemies,
    fightType: fightType.value,
    chances: chances.value,
    useCustomFightPrg: useCustomFightPrg.value,
    customFightPrg: customFightPrg.value,
    gameOverPrg: gameOverPrg.value,
    skinButton: skinButton.value,
    skinWindow: skinWindow.value,
    plugins,
    useDayNight: useDayNight.value,
    dayNightType: dayNightType.value,
    dayLengthMinutes: dayLengthMinutes.value,
    cursorMoveSound,
    cursorSelectSound,
    cursorCancelSound,
    useJoystick,
    colorDepth,
    gameSpeed,
    pixelMovement,
    cursorEnabled,
    mouseCursor,
    hotSpotX,
    hotSpotY,
    transparent,
    resX,
    resY,
    showFpsInTitle,
    pathfindHeuristic,
    drawVectorsFlags,
    pathColor,
    movementControls,
    movementScanCodes,
    reservedRuns,
    residue: trailing.value,
  }, warnings);
}
