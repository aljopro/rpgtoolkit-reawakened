/**
 * Writing a main game file (format-spec §2): the binary layout of
 * `RPGTLKIT MAIN` across minors 0–9.
 *
 * It emits the minor it was given and reproduces the bytes of a model that came
 * from `readMainFile` exactly (AD-18): the version-dependent rows are written
 * under the same conditions the reader read them, the reserved runs are
 * re-emitted verbatim, and the file's `residue` follows the last row (§1.7).
 * Pure (G2): it writes into a `BinaryWriter` and never touches a host. Only an
 * unencodable string fails.
 */

import { ok, type Result } from "../result.ts";
import { BinaryWriter } from "../binary/writer.ts";
import { encodeGameSpeed, type MainFile } from "./model.ts";

/**
 * Serialise `model` to the main-file layout (format-spec §2). Which rows are
 * written is decided by `model.minor`, exactly as the reader decided which to
 * read, and `model.residue` is appended after the last row, so a file the
 * reader accepted writes back byte for byte (§1.7).
 */
export function writeMainFile(model: MainFile): Result<Uint8Array> {
  const writer = new BinaryWriter();
  const minor = model.minor;

  const magic = writer.str(model.magic);
  if (!magic.ok) {
    return magic;
  }
  writer.i16(model.major);
  writer.i16(model.minor);

  // Rows 3–4: the editor's i16 flag followed by the `"NOCODE"` str (the quirk
  // the reader explains in `model.ts`).
  writer.i16(model.registrationFlag);
  const registrationCode = writer.str(model.registrationCode);
  if (!registrationCode.ok) {
    return registrationCode;
  }

  const projectPath = writer.str(model.projectPath);
  if (!projectPath.ok) {
    return projectPath;
  }
  const gameTitle = writer.str(model.gameTitle);
  if (!gameTitle.ok) {
    return gameTitle;
  }
  writer.i16(model.screenType);
  writer.i16(model.extendToFullScreen);
  writer.i16(model.resolution);
  if (minor < 3) {
    writer.writeBytes(model.reservedRuns.parallax);
  }
  writer.i16(model.disableProtectReg);
  const languageFile = writer.str(model.languageFile);
  if (!languageFile.ok) {
    return languageFile;
  }
  const startupPrg = writer.str(model.startupPrg);
  if (!startupPrg.ok) {
    return startupPrg;
  }
  const initBoard = writer.str(model.initBoard);
  if (!initBoard.ok) {
    return initBoard;
  }
  const initChar = writer.str(model.initChar);
  if (!initChar.ok) {
    return initChar;
  }
  const runTimePrg = writer.str(model.runTimePrg);
  if (!runTimePrg.ok) {
    return runTimePrg;
  }
  writer.i16(model.runTimeKey);
  writer.i16(model.menuKey);
  writer.i16(model.activationKey);

  // Row 19: the extra run-time keys. The upper bound is derived from the list
  // length (`-1` for none, §1.2).
  writer.i16(model.extKeys.length === 0 ? -1 : model.extKeys.length - 1);
  for (const key of model.extKeys) {
    writer.i16(key.asciiKey);
    const program = writer.str(key.program);
    if (!program.ok) {
      return program;
    }
  }

  // Row 21 (conditional).
  if (minor >= 3) {
    const menuPlugin = writer.str(model.menuPlugin);
    if (!menuPlugin.ok) {
      return menuPlugin;
    }
    const fightPlugin = writer.str(model.fightPlugin);
    if (!fightPlugin.ok) {
      return fightPlugin;
    }
  } else {
    writer.writeBytes(model.reservedRuns.menuPluginFallback);
  }

  // Row 22 (conditional, minor ≤ 2).
  if (minor <= 2) {
    writer.writeBytes(model.reservedRuns.multitask);
  }

  // Row 20: the inverted fighting flag.
  writer.i16(model.fightingDisabled);

  // Row 21: the random-encounter pool.
  writer.i16(model.enemies.length === 0 ? -1 : model.enemies.length - 1);
  for (const enemy of model.enemies) {
    const enemyFile = writer.str(enemy.enemyFile);
    if (!enemyFile.ok) {
      return enemyFile;
    }
    writer.i16(enemy.skillLevel);
  }

  writer.i16(model.fightType);
  writer.i32(model.chances);
  writer.i16(model.useCustomFightPrg);
  const customFightPrg = writer.str(model.customFightPrg);
  if (!customFightPrg.ok) {
    return customFightPrg;
  }

  // Row 29 (conditional, minor < 3).
  if (minor < 3) {
    writer.writeBytes(model.reservedRuns.fightStyle);
  }

  const gameOverPrg = writer.str(model.gameOverPrg);
  if (!gameOverPrg.ok) {
    return gameOverPrg;
  }
  const skinButton = writer.str(model.skinButton);
  if (!skinButton.ok) {
    return skinButton;
  }
  const skinWindow = writer.str(model.skinWindow);
  if (!skinWindow.ok) {
    return skinWindow;
  }

  // Row 29: the plugin list; entries are `i16 enabled` at minor ≤ 2 and
  // `str pluginFile` at minor ≥ 3.
  writer.i16(model.plugins.length === 0 ? -1 : model.plugins.length - 1);
  for (const plugin of model.plugins) {
    if (minor <= 2) {
      writer.i16(plugin.enabled);
    } else {
      const pluginFile = writer.str(plugin.pluginFile);
      if (!pluginFile.ok) {
        return pluginFile;
      }
    }
  }

  writer.i16(model.useDayNight);
  writer.i16(model.dayNightType);
  writer.i32(model.dayLengthMinutes);

  // Row 37 (conditional, minor ≥ 3).
  if (minor >= 3) {
    const cursorMoveSound = writer.str(model.cursorMoveSound);
    if (!cursorMoveSound.ok) {
      return cursorMoveSound;
    }
    const cursorSelectSound = writer.str(model.cursorSelectSound);
    if (!cursorSelectSound.ok) {
      return cursorSelectSound;
    }
    const cursorCancelSound = writer.str(model.cursorCancelSound);
    if (!cursorCancelSound.ok) {
      return cursorCancelSound;
    }
    writer.u8(model.useJoystick);
    writer.u8(model.colorDepth);
  }

  // Row 38 (conditional, minor ≥ 4).
  if (minor >= 4) {
    writer.u8(encodeGameSpeed(minor, model.gameSpeed));
    writer.u8(model.pixelMovement);
  }

  // Row 39 (conditional, minor = 5).
  if (minor === 5) {
    writer.u8(model.cursorEnabled);
  }

  // Row 40 (conditional, minor ≥ 6).
  if (minor >= 6) {
    const mouseCursor = writer.str(model.mouseCursor);
    if (!mouseCursor.ok) {
      return mouseCursor;
    }
    writer.u8(model.hotSpotX);
    writer.u8(model.hotSpotY);
    writer.color(model.transparent);
  }

  // Row 41 (conditional, minor ≥ 7).
  if (minor >= 7) {
    writer.i32(model.resX);
    writer.i32(model.resY);
  }

  // Row 42 (conditional, minor ≥ 8).
  if (minor >= 8) {
    writer.u8(model.showFpsInTitle);
  }

  // Row 43 (conditional, minor ≥ 9).
  if (minor >= 9) {
    writer.i16(model.pathfindHeuristic);
    writer.i32(model.drawVectorsFlags);
    writer.color(model.pathColor);
    writer.i32(model.movementControls);
    for (let i = 0; i < 8; i += 1) {
      writer.i16(model.movementScanCodes[i] ?? 0);
    }
  }

  writer.writeBytes(model.residue);
  return ok(writer.toBytes());
}
