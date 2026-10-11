// The main game file (.gam) reader, writer and project layout of format-spec
// §2 and §1.5 (AD-18).
//
// The corpus ships no `.gam` (the fixture fetch copies only `Build/game/<game>`,
// never `Main/*.gam`), so the layout is pinned entirely by synthetic buffers:
// one per minor, covering every one of §2's twelve version-dependent rows. The
// reader never throws, so the tests assert on values and on the error's offset
// and section rather than on exceptions.
import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BinaryReader,
  BinaryWriter,
  decodeGameSpeed,
  encodeGameSpeed,
  foldPath,
  MAIN_PROJECT_PATH_OFFSET,
  MAIN_SECTION,
  projectFolder,
  readMainFile,
  resolveReference,
  stripTypeFolder,
  toSlashes,
  typeFolder,
  writeMainFile,
} from "../src/index.ts";
import type { MainFile, Result } from "../src/index.ts";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "..", "..", "..");

/** Unwrap a result the test expects to succeed. */
function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`expected ok, got: ${result.error.message}`);
  }
  return result.value;
}

/** Append a string, throwing if it cannot be encoded (the fixtures are ASCII). */
function putStr(writer: BinaryWriter, value: string): void {
  const r = writer.str(value);
  if (!r.ok) {
    throw new Error(r.error.message);
  }
}

/** The fields a synthetic main file lets a test vary. */
interface BuildOptions {
  /** The raw stored `gameSpeed` byte; defaults per the minor. */
  readonly gameSpeedStored?: number;
  /** The raw stored `fightingDisabled` i16; defaults to 0 (fighting enabled). */
  readonly fightingDisabled?: number;
}

/** A built fixture: its bytes plus the offset each marked field group starts at. */
interface Built {
  readonly bytes: Uint8Array;
  readonly offsets: Readonly<Record<string, number>>;
}

const MAGIC = "RPGTLKIT MAIN";
const PARALLAX = new Uint8Array([0x11, 0x22, 0x33, 0x44]);
const MENU_FALLBACK = new Uint8Array([0x51, 0x52, 0x53, 0x54]);
const MULTITASK = new Uint8Array([0x61, 0x62, 0x63, 0x64, 0x65, 0x66]);
const FIGHT_STYLE = new Uint8Array([0x71, 0x72]);
const SCAN_CODES = [30, 31, 32, 33, 34, 35, 36, 37];

/**
 * Serialise a synthetic `.gam` for `minor`, writing the rows §2 lists for that
 * minor with distinctive sentinels and recording where each conditional group
 * begins. Built independently of `writeMainFile` so a reader/writer agreement
 * bug cannot hide behind a shared serialiser.
 */
function buildGam(minor: number, options: BuildOptions = {}): Built {
  const writer = new BinaryWriter();
  const offsets: Record<string, number> = {};
  const mark = (name: string): void => {
    offsets[name] = writer.toBytes().length;
  };

  putStr(writer, MAGIC);
  writer.i16(2);
  writer.i16(minor);
  mark("registrationFlag");
  writer.i16(1);
  mark("registrationCode");
  putStr(writer, "NOCODE");
  mark("projectPath");
  putStr(writer, "demo");
  putStr(writer, "Demo Game");
  writer.i16(2);
  writer.i16(1);
  writer.i16(1);
  if (minor < 3) {
    mark("parallax");
    writer.writeBytes(PARALLAX);
  }
  writer.i16(7);
  putStr(writer, "lang.txt");
  putStr(writer, "start.prg");
  putStr(writer, "start.brd");
  putStr(writer, "hero.tem");
  putStr(writer, "rt.prg");
  writer.i16(82);
  writer.i16(77);
  writer.i16(32);
  writer.i16(1); // extKeys upper bound: two entries
  writer.i16(65);
  putStr(writer, "a.prg");
  writer.i16(66);
  putStr(writer, "");
  if (minor >= 3) {
    mark("menuPlugin");
    putStr(writer, "menu.plg");
    putStr(writer, "fight.plg");
  } else {
    mark("menuPluginFallback");
    writer.writeBytes(MENU_FALLBACK);
  }
  if (minor <= 2) {
    mark("multitask");
    writer.writeBytes(MULTITASK);
  }
  writer.i16(options.fightingDisabled ?? 0);
  writer.i16(1); // enemy upper bound: two entries
  putStr(writer, "slime.ene");
  writer.i16(3);
  putStr(writer, "bat.ene");
  writer.i16(-1);
  writer.i16(1);
  writer.i32(25);
  writer.i16(1);
  putStr(writer, "fight.prg");
  if (minor < 3) {
    mark("fightStyle");
    writer.writeBytes(FIGHT_STYLE);
  }
  putStr(writer, "over.prg");
  putStr(writer, "btn.png");
  putStr(writer, "win.png");
  writer.i16(1); // plugin upper bound: two entries
  if (minor <= 2) {
    writer.i16(1);
    writer.i16(-1);
  } else {
    putStr(writer, "plug1.dll");
    putStr(writer, "plug2.dll");
  }
  writer.i16(1);
  writer.i16(1);
  writer.i32(1440);
  if (minor >= 3) {
    mark("cursorMoveSound");
    putStr(writer, "cm.wav");
    putStr(writer, "cs.wav");
    putStr(writer, "cc.wav");
    writer.u8(1);
    writer.u8(24);
  }
  if (minor >= 4) {
    mark("gameSpeed");
    writer.u8(options.gameSpeedStored ?? (minor >= 8 ? 125 : 2));
    writer.u8(1);
  }
  if (minor === 5) {
    mark("cursorEnabled");
    writer.u8(1);
  }
  if (minor >= 6) {
    mark("mouseCursor");
    putStr(writer, "TK DEFAULT");
    mark("hotSpotX");
    writer.u8(3);
    mark("hotSpotY");
    writer.u8(4);
    mark("transparent");
    writer.color({ r: 0xff, g: 0x00, b: 0x00 });
  }
  if (minor >= 7) {
    mark("resX");
    writer.i32(1280);
    mark("resY");
    writer.i32(720);
  }
  if (minor >= 8) {
    mark("showFpsInTitle");
    writer.u8(1);
  }
  if (minor >= 9) {
    mark("pathfindHeuristic");
    writer.i16(1);
    mark("drawVectorsFlags");
    writer.i32(11);
    mark("pathColor");
    writer.color({ r: 0x00, g: 0x00, b: 0xff });
    mark("movementControls");
    writer.i32(5);
    mark("movementScanCodes");
    for (const scan of SCAN_CODES) {
      writer.i16(scan);
    }
  }

  return { bytes: writer.toBytes(), offsets };
}

/** Read a fixture and assert it consumed every byte. */
function readBuilt(built: Built): MainFile {
  const reader = new BinaryReader(built.bytes);
  const model = unwrap(readMainFile(reader));
  equal(reader.remaining, 0, "the reader must consume the whole file");
  return model;
}

test("the header, registration rows and always-present fields read back", () => {
  const built = buildGam(9);
  const model = readBuilt(built);
  equal(model.magic, MAGIC);
  equal(model.major, 2);
  equal(model.minor, 9);
  equal(model.registrationFlag, 1);
  equal(model.registrationCode, "NOCODE");
  equal(model.projectPath, "demo");
  equal(model.gameTitle, "Demo Game");
  equal(model.screenType, 2);
  equal(model.extendToFullScreen, 1);
  equal(model.resolution, 1);
  equal(model.disableProtectReg, 7);
  equal(model.languageFile, "lang.txt");
  equal(model.startupPrg, "start.prg");
  equal(model.initBoard, "start.brd");
  equal(model.initChar, "hero.tem");
  equal(model.runTimePrg, "rt.prg");
  equal(model.runTimeKey, 82);
  equal(model.menuKey, 77);
  equal(model.activationKey, 32);
  equal(model.fightType, 1);
  equal(model.chances, 25);
  equal(model.useCustomFightPrg, 1);
  equal(model.customFightPrg, "fight.prg");
  equal(model.gameOverPrg, "over.prg");
  equal(model.skinButton, "btn.png");
  equal(model.skinWindow, "win.png");
  equal(model.useDayNight, 1);
  equal(model.dayNightType, 1);
  equal(model.dayLengthMinutes, 1440);
});

test("the upper-bound lists keep empty entries and round-trip", () => {
  const model = readBuilt(buildGam(9));
  deepEqual(model.extKeys, [
    { asciiKey: 65, program: "a.prg" },
    { asciiKey: 66, program: "" },
  ]);
  deepEqual(model.enemies, [
    { enemyFile: "slime.ene", skillLevel: 3 },
    { enemyFile: "bat.ene", skillLevel: -1 },
  ]);
});

test("minor 2 reads every reserved run of the pre-3 layout", () => {
  const built = buildGam(2);
  const model = readBuilt(built);
  deepEqual(model.residue.parallax, PARALLAX);
  deepEqual(model.residue.menuPluginFallback, MENU_FALLBACK);
  deepEqual(model.residue.multitask, MULTITASK);
  deepEqual(model.residue.fightStyle, FIGHT_STYLE);
  // The minor ≥ 3 rows are absent: their models hold the defaults.
  equal(model.menuPlugin, "");
  equal(model.fightPlugin, "");
  equal(model.cursorMoveSound, "");
  equal(model.gameSpeed, 0);
  equal(model.cursorEnabled, 0);
  equal(model.mouseCursor, "");
  equal(model.resX, 0);
  equal(model.showFpsInTitle, 0);
  equal(model.pathfindHeuristic, 0);
  equal(model.movementScanCodes.length, 0);
  // The plugin list stores the implied-name form at minor ≤ 2.
  deepEqual(model.plugins, [
    { enabled: 1, pluginFile: "" },
    { enabled: -1, pluginFile: "" },
  ]);
  deepEqual(unwrap(writeMainFile(model)), built.bytes);
});

test("minors 0 and 1 read the same pre-3 rows as minor 2", () => {
  for (const minor of [0, 1, 2]) {
    const model = readBuilt(buildGam(minor));
    deepEqual(model.residue.parallax, PARALLAX);
    deepEqual(model.residue.multitask, MULTITASK);
    deepEqual(model.residue.fightStyle, FIGHT_STYLE);
    equal(model.minor, minor);
  }
});

test("minor 3 switches on the plugin names and the cursor block", () => {
  const built = buildGam(3);
  const model = readBuilt(built);
  equal(model.menuPlugin, "menu.plg");
  equal(model.fightPlugin, "fight.plg");
  deepEqual(model.residue.parallax, new Uint8Array(0));
  deepEqual(model.residue.menuPluginFallback, new Uint8Array(0));
  deepEqual(model.residue.multitask, new Uint8Array(0));
  deepEqual(model.residue.fightStyle, new Uint8Array(0));
  equal(model.cursorMoveSound, "cm.wav");
  equal(model.cursorSelectSound, "cs.wav");
  equal(model.cursorCancelSound, "cc.wav");
  equal(model.useJoystick, 1);
  equal(model.colorDepth, 24);
  deepEqual(model.plugins, [
    { enabled: 0, pluginFile: "plug1.dll" },
    { enabled: 0, pluginFile: "plug2.dll" },
  ]);
  // Rows keyed on minor ≥ 4 are absent.
  equal(model.gameSpeed, 0);
  equal(model.pixelMovement, 0);
  equal(model.cursorEnabled, 0);
  equal(model.mouseCursor, "");
  equal(model.resX, 0);
  equal(model.pathfindHeuristic, 0);
  deepEqual(unwrap(writeMainFile(model)), built.bytes);
});

test("minor 4 adds gameSpeed and pixelMovement, un-biased below minor 8", () => {
  const built = buildGam(4, { gameSpeedStored: 2 });
  const model = readBuilt(built);
  equal(model.gameSpeed, 2);
  equal(model.pixelMovement, 1);
  equal(model.mouseCursor, "");
  equal(model.resX, 0);
  deepEqual(unwrap(writeMainFile(model)), built.bytes);
});

test("below minor 8 the stored gameSpeed byte is the raw speed", () => {
  const model = readBuilt(buildGam(6, { gameSpeedStored: 200 }));
  equal(model.gameSpeed, 200);
  equal(decodeGameSpeed(6, 200), 200);
  equal(encodeGameSpeed(6, 200), 200);
});

test("minor 5 stores cursorEnabled and no mouse-cursor block", () => {
  const built = buildGam(5);
  const model = readBuilt(built);
  equal(model.cursorEnabled, 1);
  equal(model.mouseCursor, "");
  equal(model.hotSpotX, 0);
  equal(model.gameSpeed, 2);
  deepEqual(unwrap(writeMainFile(model)), built.bytes);
});

test("minor 6 adds the mouse cursor, hot spot and transparent colour", () => {
  const built = buildGam(6);
  const model = readBuilt(built);
  equal(model.mouseCursor, "TK DEFAULT");
  equal(model.hotSpotX, 3);
  equal(model.hotSpotY, 4);
  deepEqual(model.transparent, { r: 0xff, g: 0x00, b: 0x00 });
  equal(model.cursorEnabled, 0);
  equal(model.resX, 0);
  equal(model.showFpsInTitle, 0);
  // Widths: `"TK DEFAULT\0"` is 11 bytes, then two u8s, then a 4-byte colour.
  equal(built.offsets.hotSpotX! - built.offsets.mouseCursor!, 11);
  equal(built.offsets.hotSpotY! - built.offsets.hotSpotX!, 1);
  equal(built.offsets.transparent! - built.offsets.hotSpotY!, 1);
  deepEqual(unwrap(writeMainFile(model)), built.bytes);
});

test("minor 7 adds the custom resolution as two i32s", () => {
  const built = buildGam(7);
  const model = readBuilt(built);
  equal(model.resX, 1280);
  equal(model.resY, 720);
  equal(built.offsets.resY! - built.offsets.resX!, 4);
  equal(model.showFpsInTitle, 0);
  equal(model.pathfindHeuristic, 0);
  deepEqual(unwrap(writeMainFile(model)), built.bytes);
});

test("minor 8 biases the stored gameSpeed byte by +128, negative speeds included", () => {
  const built = buildGam(8, { gameSpeedStored: 125 });
  const model = readBuilt(built);
  equal(model.gameSpeed, -3);
  equal(model.showFpsInTitle, 1);
  equal(model.pathfindHeuristic, 0);
  // The stored byte really is speed + 128.
  equal(built.bytes[built.offsets.gameSpeed!], 125);
  deepEqual(unwrap(writeMainFile(model)), built.bytes);

  equal(decodeGameSpeed(8, 124), -4);
  equal(decodeGameSpeed(8, 132), 4);
  equal(encodeGameSpeed(8, -4), 124);
});

test("minor 9 adds pathfinding, debug vectors and the eight scan codes", () => {
  const built = buildGam(9);
  const model = readBuilt(built);
  equal(model.pathfindHeuristic, 1);
  equal(model.drawVectorsFlags, 11);
  deepEqual(model.pathColor, { r: 0x00, g: 0x00, b: 0xff });
  equal(model.movementControls, 5);
  deepEqual(model.movementScanCodes, SCAN_CODES);
  // Order and widths: i16 heuristic, i32 flags, colour, i32 controls, 8 × i16.
  equal(built.offsets.drawVectorsFlags! - built.offsets.pathfindHeuristic!, 2);
  equal(built.offsets.pathColor! - built.offsets.drawVectorsFlags!, 4);
  equal(built.offsets.movementControls! - built.offsets.pathColor!, 4);
  equal(built.offsets.movementScanCodes! - built.offsets.movementControls!, 4);
  deepEqual(unwrap(writeMainFile(model)), built.bytes);
});

test("the conditional rows are absent at the minors the spec omits them from", () => {
  const present: Record<string, (minor: number) => boolean> = {
    parallax: (minor) => minor < 3,
    menuPluginFallback: (minor) => minor < 3,
    multitask: (minor) => minor <= 2,
    fightStyle: (minor) => minor < 3,
    menuPlugin: (minor) => minor >= 3,
    cursorMoveSound: (minor) => minor >= 3,
    gameSpeed: (minor) => minor >= 4,
    cursorEnabled: (minor) => minor === 5,
    mouseCursor: (minor) => minor >= 6,
    resX: (minor) => minor >= 7,
    showFpsInTitle: (minor) => minor >= 8,
    pathfindHeuristic: (minor) => minor >= 9,
  };
  for (const [name, expected] of Object.entries(present)) {
    for (let minor = 0; minor <= 9; minor += 1) {
      const built = buildGam(minor);
      equal(built.offsets[name] !== undefined, expected(minor), `${name} at minor ${minor}`);
    }
  }
});

test("the inverted fighting flag: 0 is enabled and non-zero is disabled", () => {
  equal(readBuilt(buildGam(9, { fightingDisabled: 0 })).fightingDisabled, 0);
  const disabled = readBuilt(buildGam(9, { fightingDisabled: 1 }));
  equal(disabled.fightingDisabled, 1);
  deepEqual(unwrap(writeMainFile(disabled)), buildGam(9, { fightingDisabled: 1 }).bytes);
});

test("the registration quirk: the editor and the legacy reader land at the same offset", () => {
  const built = buildGam(0);

  // The editor's shape: an i16 flag then `"NOCODE"`.
  const editor = new BinaryReader(built.bytes);
  equal(unwrap(editor.str()), MAGIC);
  unwrap(editor.i16());
  unwrap(editor.i16());
  equal(unwrap(editor.i16()), 1);
  equal(unwrap(editor.str()), "NOCODE");
  equal(editor.offset, MAIN_PROJECT_PATH_OFFSET);

  // The legacy C++ reader's shape: an i32 then a str, eating two bytes of the
  // string and reading the rest. Same landing offset.
  const legacy = new BinaryReader(built.bytes);
  unwrap(legacy.str());
  unwrap(legacy.i16());
  unwrap(legacy.i16());
  equal(unwrap(legacy.i32()), 0x4f4e0001);
  equal(unwrap(legacy.str()), "CODE");
  equal(legacy.offset, MAIN_PROJECT_PATH_OFFSET);

  // Our reader follows the editor, so the registration rows round-trip.
  const model = readBuilt(built);
  equal(model.registrationFlag, 1);
  equal(model.registrationCode, "NOCODE");
  equal(model.projectPath, "demo");
  equal(built.offsets.projectPath, MAIN_PROJECT_PATH_OFFSET);
});

test("every minor 0–9 reads with zero trailing bytes and writes back byte-for-byte", () => {
  for (let minor = 0; minor <= 9; minor += 1) {
    const built = buildGam(minor);
    const model = readBuilt(built);
    equal(model.minor, minor);
    deepEqual(unwrap(writeMainFile(model)), built.bytes, `minor ${minor} round-trip`);
  }
});

test("a wrong magic is rejected at offset 0", () => {
  const writer = new BinaryWriter();
  putStr(writer, "RPGTLKIT BOARD");
  writer.i16(2);
  writer.i16(9);
  const result = readMainFile(new BinaryReader(writer.toBytes()));
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, 0);
    equal(result.error.section, MAIN_SECTION);
    equal(result.error.message.includes("not a main file"), true);
  }
});

test("a minor above 9 is rejected at its own offset", () => {
  const result = readMainFile(new BinaryReader(buildGam(10).bytes));
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, 16);
    equal(result.error.section, MAIN_SECTION);
    equal(result.error.message.includes("minor 10"), true);
  }
});

test("a negative version is rejected", () => {
  const negativeMinor = readMainFile(new BinaryReader(buildGam(-1).bytes));
  equal(negativeMinor.ok, false);
  if (!negativeMinor.ok) {
    equal(negativeMinor.error.offset, 16);
  }
  const writer = new BinaryWriter();
  putStr(writer, MAGIC);
  writer.i16(-1);
  writer.i16(9);
  const negativeMajor = readMainFile(new BinaryReader(writer.toBytes()));
  equal(negativeMajor.ok, false);
  if (!negativeMajor.ok) {
    equal(negativeMajor.error.offset, 14);
    equal(negativeMajor.error.message.includes("negative major"), true);
  }
});

test("a truncated file reports a located error", () => {
  const full = buildGam(9).bytes;
  const result = readMainFile(new BinaryReader(full.slice(0, 40)));
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.section.startsWith("format-spec §"), true);
    equal(result.error.offset < full.length, true);
  }
});

test("an empty buffer and a garbage buffer both report clean errors", () => {
  const empty = readMainFile(new BinaryReader(new Uint8Array(0)));
  equal(empty.ok, false);
  if (!empty.ok) {
    equal(empty.error.offset, 0);
    equal(empty.error.section.startsWith("format-spec §"), true);
  }
  const garbage = readMainFile(
    new BinaryReader(new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x00, 0x02, 0x00, 0x09, 0x00])),
  );
  equal(garbage.ok, false);
  if (!garbage.ok) {
    equal(garbage.error.offset, 0);
    equal(garbage.error.message.includes("not a main file"), true);
  }
});

// --- Project layout (format-spec §1.5) --------------------------------------

test("the type folder is the §1.5 subfolder for the kind", () => {
  equal(typeFolder("tiles"), "Tiles");
  equal(typeFolder("boards"), "Boards");
  equal(typeFolder("characters"), "Chrs");
  equal(typeFolder("items"), "Item");
  equal(typeFolder("enemies"), "Enemy");
  equal(typeFolder("specialMoves"), "SpcMove");
  equal(typeFolder("statusEffects"), "StatusE");
  equal(typeFolder("backgrounds"), "Bkrounds");
  equal(typeFolder("animations"), "Misc");
  equal(typeFolder("bitmaps"), "Bitmap");
  equal(typeFolder("media"), "Media");
  equal(typeFolder("programs"), "Prg");
  equal(typeFolder("fonts"), "Font");
  equal(typeFolder("plugins"), "Plugin");
});

test("the project folder is <root>/Game/<projectPath>/", () => {
  equal(projectFolder("/games/root", { projectPath: "demo" }), "/games/root/Game/demo/");
  equal(projectFolder("/games/root/", { projectPath: "demo" }), "/games/root/Game/demo/");
  // The legacy separator in the project path is normalised too.
  equal(projectFolder("/games/root", { projectPath: "a\\b" }), "/games/root/Game/a/b/");
});

test("a reference resolves under the project folder and its type folder", () => {
  equal(
    resolveReference("/games/root", { projectPath: "demo" }, "boards", "village\\inn.brd"),
    "/games/root/Game/demo/Boards/village/inn.brd",
  );
  equal(
    resolveReference("/games/root", { projectPath: "demo" }, "programs", "start.prg"),
    "/games/root/Game/demo/Prg/start.prg",
  );
});

test("backslash and forward slash are equivalent", () => {
  equal(toSlashes("village\\inn.brd"), "village/inn.brd");
  equal(
    resolveReference("/games/root", { projectPath: "demo" }, "boards", "village/inn.brd"),
    resolveReference("/games/root", { projectPath: "demo" }, "boards", "village\\inn.brd"),
  );
});

test("matching is case-insensitive", () => {
  equal(
    foldPath(resolveReference("/games/root", { projectPath: "demo" }, "items", "ITEM\\NPC.ITM")),
    foldPath(resolveReference("/games/root", { projectPath: "demo" }, "items", "item/npc.itm")),
  );
});

test("a leading type-folder prefix is stripped, case-insensitively", () => {
  equal(stripTypeFolder("items", "Item\\npc.itm"), "npc.itm");
  equal(stripTypeFolder("items", "ITEM/npc.itm"), "npc.itm");
  equal(stripTypeFolder("items", "Item"), "");
  equal(stripTypeFolder("items", "sub\\npc.itm"), "sub/npc.itm");
  equal(
    resolveReference("/games/root", { projectPath: "demo" }, "items", "Item\\npc.itm"),
    "/games/root/Game/demo/Item/npc.itm",
  );
  equal(
    resolveReference("/games/root", { projectPath: "demo" }, "programs", "PRG\\start.prg"),
    "/games/root/Game/demo/Prg/start.prg",
  );
});

// --- Sample fixtures (guard-rail G5 rule 4: fetched, never committed) --------

/** Every `.gam` under `root`, recursively; empty when the folder is absent. */
function collectGam(root: string): string[] {
  if (!existsSync(root)) {
    return [];
  }
  return readdirSync(root, { recursive: true })
    .filter((name) => name.toLowerCase().endsWith(".gam"))
    .map((name) => join(root, name));
}

// The fixture fetch copies only `Build/game/<game>`, so the corpus normally
// ships no `.gam` at all; this test exists for a source tree that has one.
const sampleGam = collectGam(join(repoRoot, "fixtures", "legacy"));

test(
  "every sample .gam parses with zero trailing bytes and round-trips",
  { skip: sampleGam.length === 0 ? "no .gam ships in the fixture corpus" : false },
  () => {
    for (const file of sampleGam) {
      const reader = new BinaryReader(readFileSync(file), file);
      const model = unwrap(readMainFile(reader));
      equal(reader.remaining, 0, `${file} should have no trailing bytes`);
      deepEqual(unwrap(writeMainFile(model)), new Uint8Array(readFileSync(file)), file);
    }
  },
);
