// The pre-vector board layout of format-spec §4.1 (dispatch) and §4.8
// (minors 2–3) and its conversion to the vector model of §4.2. The sample
// corpus ships no minor 2–3 board (all three fixture `.brd` files are minor 4),
// so the layout and the conversion are pinned by synthetic boards built byte
// by byte here, including runs that wrap rows and layers.
//
// The reader never throws, so the tests assert on values and on the error's
// offset and section rather than on exceptions. Conversion is deterministic
// (G3), so the same bytes are converted twice and compared deep-equal.
import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BOARD_MAGIC,
  BinaryReader,
  BinaryWriter,
  convertPreVectorBoard,
  readPreVectorBoard,
  TT_SOLID,
  TT_STAIRS,
  TT_UNDER,
} from "../src/index.ts";
import type { Board, Colorref, PreVectorBoard, Result } from "../src/index.ts";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "..", "..", "..");

/** Unwrap a result the test expects to succeed. */
function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`expected ok, got: ${result.error.message}`);
  }
  return result.value;
}

/** The stored upper bound for `count` entries (format-spec §1.2). */
function bound(count: number): number {
  return count === 0 ? -1 : count - 1;
}

const BLACK: Colorref = { r: 0, g: 0, b: 0 };

/**
 * One tile-matrix record as the builder writes it (format-spec §4.8): `count`
 * 1 is a bare cell, anything else a run marker covering that many cells.
 */
interface CellSpec {
  readonly count: number;
  readonly index: number;
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly tileType: number;
}

/** One pre-vector program as the builder writes it (format-spec §4.8). */
interface ProgramSpec {
  readonly file: string;
  readonly x: number;
  readonly y: number;
  readonly layer: number;
  readonly graphic: string;
  readonly activate: number;
  readonly initialVar: string;
  readonly finalVar: string;
  readonly initialValue: string;
  readonly finalValue: string;
  readonly activationType: number;
}

/** One pre-vector sprite as the builder writes it (format-spec §4.8). */
interface SpriteSpec {
  readonly file: string;
  readonly x: number;
  readonly y: number;
  readonly layer: number;
  readonly activate: number;
  readonly initialVar: string;
  readonly finalVar: string;
  readonly initialValue: string;
  readonly finalValue: string;
  readonly activationType: number;
  readonly activationPrg: string;
  readonly multitaskPrg: string;
}

/** The fields a synthetic pre-vector board lets a test vary. */
interface BuildOptions {
  readonly magic?: string;
  readonly major?: number;
  readonly minor?: number;
  readonly registrationFlag?: number;
  readonly registrationKey?: string;
  readonly sizeX?: number;
  readonly sizeY?: number;
  readonly sizeL?: number;
  readonly startX?: number;
  readonly startY?: number;
  readonly startLayer?: number;
  readonly disableSaving?: number;
  readonly lut?: readonly string[];
  readonly cells?: readonly CellSpec[];
  readonly backgroundImage?: string;
  readonly backgroundColour?: Colorref;
  readonly ambientPreset?: number;
  readonly links?: readonly [string, string, string, string];
  readonly battleSkill?: number;
  readonly battleBackground?: string;
  readonly allowBattles?: number;
  readonly constants?: readonly number[];
  readonly backgroundMusic?: string;
  readonly layerTitles?: readonly string[];
  readonly programs?: readonly ProgramSpec[];
  readonly enterPrg?: string;
  readonly sprites?: readonly SpriteSpec[];
  readonly threads?: readonly string[];
  readonly coordType?: number;
  /** Extra bytes after the last field, to prove they survive as residue. */
  readonly tail?: readonly number[];
}

/** Serialise a synthetic pre-vector board in the §4.8 order. */
function buildPreVectorBoard(options: BuildOptions = {}): Uint8Array {
  const sizeX = options.sizeX ?? 2;
  const sizeY = options.sizeY ?? 2;
  const sizeL = options.sizeL ?? 1;
  const minor = options.minor ?? 3;
  const writer = new BinaryWriter();

  writer.str(options.magic ?? BOARD_MAGIC);
  writer.i16(options.major ?? 2);
  writer.i16(minor);
  writer.i16(options.registrationFlag ?? 0);
  writer.str(options.registrationKey ?? "");
  writer.i16(sizeX);
  writer.i16(sizeY);
  writer.i16(sizeL);
  writer.i16(options.startX ?? 1);
  writer.i16(options.startY ?? 1);
  writer.i16(options.startLayer ?? 1);
  writer.i16(options.disableSaving ?? 0);

  const lut = options.lut ?? ["", "default.tst1"];
  writer.i16(bound(lut.length));
  for (const reference of lut) {
    writer.str(reference);
  }

  const total = sizeX * sizeY * sizeL;
  const cells =
    options.cells ?? (total > 0 ? [{ count: total, index: 1, r: 0, g: 0, b: 0, tileType: 0 }] : []);
  for (const cell of cells) {
    if (cell.count > 1) {
      writer.i16(-cell.count);
    }
    writer.i16(cell.index);
    writer.i16(cell.r);
    writer.i16(cell.g);
    writer.i16(cell.b);
    writer.i8(cell.tileType);
  }

  writer.str(options.backgroundImage ?? "");
  writer.str(""); // foreground image (unused)
  writer.str(""); // border image (unused)
  writer.color(options.backgroundColour ?? BLACK);
  writer.color(BLACK); // border colour (unused)
  writer.i16(options.ambientPreset ?? 0);

  const links = options.links ?? ["", "", "", ""];
  for (const link of links) {
    writer.str(link);
  }

  writer.i16(options.battleSkill ?? 0);
  writer.str(options.battleBackground ?? "");
  writer.i16(options.allowBattles ?? 0);
  writer.i16(0);
  writer.i16(0);
  writer.i16(0);
  writer.str(""); // day/night text (unused)

  const constants = options.constants ?? [];
  for (let i = 0; i < 11; i += 1) {
    writer.i16(constants[i] ?? 0);
  }

  writer.str(options.backgroundMusic ?? "");
  const titles = options.layerTitles ?? [];
  for (let i = 0; i < 9; i += 1) {
    writer.str(titles[i] ?? "");
  }

  const programs = options.programs ?? [];
  writer.i16(bound(programs.length));
  for (const program of programs) {
    writer.str(program.file);
    writer.i16(program.x);
    writer.i16(program.y);
    writer.i16(program.layer);
    writer.str(program.graphic);
    writer.i16(program.activate);
    writer.str(program.initialVar);
    writer.str(program.finalVar);
    writer.str(program.initialValue);
    writer.str(program.finalValue);
    writer.i16(program.activationType);
  }

  writer.str(options.enterPrg ?? "");
  writer.str(""); // reserved

  const sprites = options.sprites ?? [];
  writer.i16(bound(sprites.length));
  for (const sprite of sprites) {
    writer.str(sprite.file);
    writer.i16(sprite.x);
    writer.i16(sprite.y);
    writer.i16(sprite.layer);
    writer.i16(sprite.activate);
    writer.str(sprite.initialVar);
    writer.str(sprite.finalVar);
    writer.str(sprite.initialValue);
    writer.str(sprite.finalValue);
    writer.i16(sprite.activationType);
    writer.str(sprite.activationPrg);
    writer.str(sprite.multitaskPrg);
  }

  if (minor >= 3) {
    const threads = options.threads ?? [];
    writer.i32(bound(threads.length));
    for (const thread of threads) {
      writer.str(thread);
    }
    writer.i8(options.coordType ?? 0);
  }

  if (options.tail !== undefined) {
    writer.writeBytes(new Uint8Array(options.tail));
  }
  return writer.toBytes();
}

/** Read a synthetic board and convert it, unwrapping both results. */
function readAndConvert(bytes: Uint8Array): { board: PreVectorBoard; converted: Board } {
  const reader = new BinaryReader(bytes);
  const board = unwrap(readPreVectorBoard(reader));
  equal(reader.remaining, 0, "the reader consumes the whole file");
  return { board, converted: unwrap(convertPreVectorBoard(board)) };
}

test("minor 3 carries the thread list and the coordinate type", () => {
  const bytes = buildPreVectorBoard({
    minor: 3,
    coordType: 1,
    threads: ["a.prg", "b.prg"],
  });
  const { board, converted } = readAndConvert(bytes);
  equal(board.minor, 3);
  equal(board.coordType, 1);
  deepEqual(board.threads, ["a.prg", "b.prg"]);
  equal(converted.minor, 4);
  equal(converted.coordType, 1);
  deepEqual(converted.threads, ["a.prg", "b.prg"]);
});

test("minor 2 has no thread list and defaults to 2D", () => {
  const bytes = buildPreVectorBoard({ minor: 2 });
  const { board, converted } = readAndConvert(bytes);
  equal(board.minor, 2);
  equal(board.coordType, 0, "minor 2 defaults coordType to 0 (2D)");
  deepEqual(board.threads, []);
  equal(converted.coordType, 0);
});

test("a run marker wraps a row end and one wraps a layer boundary", () => {
  // 3 × 2 cells per layer, two layers: layer 2 starts at cell 6.
  const bytes = buildPreVectorBoard({
    sizeX: 3,
    sizeY: 2,
    sizeL: 2,
    cells: [
      { count: 1, index: 1, r: 0, g: 0, b: 0, tileType: 0 },
      { count: 4, index: 3, r: 0, g: 0, b: 0, tileType: 0 },
      { count: 3, index: 6, r: 0, g: 0, b: 0, tileType: 0 },
      { count: 4, index: 2, r: 0, g: 0, b: 0, tileType: 0 },
    ],
  });
  const { board } = readAndConvert(bytes);
  deepEqual(
    board.tileMatrix.map((cell) => cell.lutIndex),
    [1, 3, 3, 3, 3, 6, 6, 6, 2, 2, 2, 2],
  );
  deepEqual(
    board.tileRuns.map((run) => [run.count, run.lutIndex, run.marker]),
    [
      [1, 1, false],
      [4, 3, true],
      [3, 6, true],
      [4, 2, true],
    ],
  );
  // The run of index 3 starts at cell 1 and ends at cell 4: it crosses y1x3 → y2x1.
  equal(board.tileMatrix[2]?.lutIndex, board.tileMatrix[3]?.lutIndex);
  // The run of index 6 starts at cell 5 (layer 1) and ends at cell 7 (layer 2).
  equal(board.tileMatrix[5]?.lutIndex, board.tileMatrix[6]?.lutIndex);
});

test("each legacy tile type vectorizes to the §4.8 shape", () => {
  // One 4 × 1 layer: two solid tiles, one under tile, one stair to layer 3.
  const bytes = buildPreVectorBoard({
    sizeX: 4,
    sizeY: 1,
    sizeL: 1,
    cells: [
      { count: 1, index: 1, r: 0, g: 0, b: 0, tileType: 1 },
      { count: 1, index: 1, r: 0, g: 0, b: 0, tileType: 1 },
      { count: 1, index: 2, r: 0, g: 0, b: 0, tileType: 2 },
      { count: 1, index: 3, r: 0, g: 0, b: 0, tileType: 13 },
    ],
  });
  const { converted } = readAndConvert(bytes);
  deepEqual(converted.vectors, [
    {
      points: [
        { x: 0, y: 0 },
        { x: 64, y: 0 },
        { x: 64, y: 32 },
        { x: 0, y: 32 },
      ],
      attributes: 0,
      closed: -1,
      layer: 1,
      type: TT_SOLID,
      handle: "",
    },
    {
      points: [
        { x: 64, y: 0 },
        { x: 96, y: 0 },
        { x: 96, y: 32 },
        { x: 64, y: 32 },
      ],
      attributes: 1,
      closed: -1,
      layer: 1,
      type: TT_UNDER,
      handle: "",
    },
    {
      points: [
        { x: 96, y: 0 },
        { x: 128, y: 0 },
        { x: 128, y: 32 },
        { x: 96, y: 32 },
      ],
      attributes: 3,
      closed: -1,
      layer: 1,
      type: TT_STAIRS,
      handle: "",
    },
  ]);
  deepEqual(converted.tileRuns, [
    { lutIndex: 1, count: 2, marker: true },
    { lutIndex: 2, count: 1, marker: false },
    { lutIndex: 3, count: 1, marker: false },
  ]);
});

test("a north–south and an east–west passage become open blocking edges", () => {
  const bytes = buildPreVectorBoard({
    sizeX: 2,
    sizeY: 1,
    sizeL: 1,
    cells: [
      { count: 1, index: 1, r: 0, g: 0, b: 0, tileType: 3 },
      { count: 1, index: 1, r: 0, g: 0, b: 0, tileType: 4 },
    ],
  });
  const { converted } = readAndConvert(bytes);
  deepEqual(converted.vectors, [
    { points: [{ x: 0, y: 0 }, { x: 0, y: 32 }], attributes: 0, closed: 0, layer: 1, type: TT_SOLID, handle: "" },
    { points: [{ x: 32, y: 0 }, { x: 32, y: 32 }], attributes: 0, closed: 0, layer: 1, type: TT_SOLID, handle: "" },
    { points: [{ x: 32, y: 0 }, { x: 64, y: 0 }], attributes: 0, closed: 0, layer: 1, type: TT_SOLID, handle: "" },
    { points: [{ x: 32, y: 32 }, { x: 64, y: 32 }], attributes: 0, closed: 0, layer: 1, type: TT_SOLID, handle: "" },
  ]);
});

test("a program at a known tile becomes a closed 32×32 rectangle", () => {
  const bytes = buildPreVectorBoard({
    sizeX: 4,
    sizeY: 3,
    programs: [
      {
        file: "p.prg",
        x: 3,
        y: 2,
        layer: 1,
        graphic: "",
        activate: 1,
        initialVar: "met$",
        finalVar: "done!",
        initialValue: "",
        finalValue: "yes",
        activationType: 1,
      },
    ],
  });
  const { converted } = readAndConvert(bytes);
  equal(converted.programs.length, 1);
  deepEqual(converted.programs[0]?.points, [
    { x: 64, y: 32 },
    { x: 96, y: 32 },
    { x: 96, y: 64 },
    { x: 64, y: 64 },
  ]);
  equal(converted.programs[0]?.closed, -1);
  equal(converted.programs[0]?.repeatDistance, 0);
  equal(converted.programs[0]?.initialVar, "met", "the legacy `$` suffix is stripped");
  equal(converted.programs[0]?.finalVar, "done", "the legacy `!` suffix is stripped");
  equal(
    converted.programs[0]?.activationType,
    5,
    "§4.8 sets PRG_STOPS_MOVEMENT (bit 4) on every old program",
  );
});

test("shading on more than one layer flattens into layer 0 with the top cast layer", () => {
  // 2 × 1 cells per layer, two layers; the second layer carries shading.
  const bytes = buildPreVectorBoard({
    sizeX: 2,
    sizeY: 1,
    sizeL: 2,
    cells: [
      { count: 1, index: 1, r: 10, g: 0, b: 0, tileType: 0 },
      { count: 1, index: 0, r: 0, g: 0, b: 0, tileType: 0 },
      { count: 1, index: 1, r: 5, g: 0, b: 0, tileType: 0 },
      { count: 1, index: 0, r: 0, g: 0, b: 0, tileType: 0 },
    ],
  });
  const { converted } = readAndConvert(bytes);
  deepEqual(converted.shadeLayers, [
    {
      castLayer: 2,
      records: [
        { runCount: 1, r: 15, g: 0, b: 0 },
        { runCount: 1, r: 0, g: 0, b: 0 },
      ],
    },
  ]);
});

test("equal flattened shades merge into one record", () => {
  const bytes = buildPreVectorBoard({
    sizeX: 2,
    sizeY: 1,
    sizeL: 2,
    cells: [
      { count: 1, index: 1, r: 3, g: 0, b: 0, tileType: 0 },
      { count: 1, index: 1, r: 3, g: 0, b: 0, tileType: 0 },
      { count: 1, index: 1, r: 0, g: 0, b: 0, tileType: 0 },
      { count: 1, index: 1, r: 0, g: 0, b: 0, tileType: 0 },
    ],
  });
  const { converted } = readAndConvert(bytes);
  deepEqual(converted.shadeLayers, [
    { castLayer: 1, records: [{ runCount: 2, r: 3, g: 0, b: 0 }] },
  ]);
});

test("a board with no shading gets no shade layer", () => {
  const bytes = buildPreVectorBoard({ cells: [{ count: 4, index: 1, r: 0, g: 0, b: 0, tileType: 0 }] });
  const { converted } = readAndConvert(bytes);
  deepEqual(converted.shadeLayers, []);
});

test("the start point and sprites convert from tiles to pixels with the base point", () => {
  const bytes = buildPreVectorBoard({
    sizeX: 4,
    sizeY: 4,
    startX: 2,
    startY: 3,
    startLayer: 2,
    sprites: [
      {
        file: "npc.itm",
        x: 1,
        y: 2,
        layer: 1,
        activate: 1,
        initialVar: "met$",
        finalVar: "met$",
        initialValue: "",
        finalValue: "yes",
        activationType: 1,
        activationPrg: "",
        multitaskPrg: "",
      },
    ],
  });
  const { converted } = readAndConvert(bytes);
  deepEqual(converted.properties.start, { x: 48, y: 95, layer: 2 });
  deepEqual(converted.sprites, [
    {
      itemFile: "npc.itm",
      activationPrg: "",
      multitaskPrg: "",
      initialVar: "met",
      initialValue: "",
      finalVar: "met",
      finalValue: "yes",
      loadingVar: "met",
      loadingValue: "",
      activate: 1,
      activationType: 1,
      x: 16,
      y: 63,
      layer: 1,
      reserved: -1,
    },
  ]);
});

test("the start falls back to (64, 64) on layer 1 when its tiles are ≤ 0", () => {
  const zero = readAndConvert(buildPreVectorBoard({ startX: 0, startY: 4, startLayer: 3 }));
  deepEqual(zero.converted.properties.start, { x: 64, y: 64, layer: 1 });
  const negative = readAndConvert(buildPreVectorBoard({ startX: 2, startY: -1 }));
  deepEqual(negative.converted.properties.start, { x: 64, y: 64, layer: 1 });
});

test("an iso-stacked tile and program become 64×32 diamonds", () => {
  const bytes = buildPreVectorBoard({
    minor: 3,
    coordType: 1,
    sizeX: 2,
    sizeY: 2,
    sizeL: 1,
    cells: [
      { count: 1, index: 1, r: 0, g: 0, b: 0, tileType: 1 },
      { count: 3, index: 0, r: 0, g: 0, b: 0, tileType: 0 },
    ],
    programs: [
      {
        file: "p.prg",
        x: 1,
        y: 1,
        layer: 1,
        graphic: "",
        activate: 0,
        initialVar: "",
        finalVar: "",
        initialValue: "",
        finalValue: "",
        activationType: 0,
      },
    ],
  });
  const { converted } = readAndConvert(bytes);
  const diamond = [
    { x: 32, y: -16 },
    { x: 64, y: 0 },
    { x: 32, y: 16 },
    { x: 0, y: 0 },
  ];
  deepEqual(converted.vectors[0]?.points, diamond);
  deepEqual(converted.programs[0]?.points, diamond);
});

test("converting the same bytes twice gives deep-equal boards", () => {
  const bytes = buildPreVectorBoard({
    sizeX: 3,
    sizeY: 2,
    sizeL: 2,
    cells: [
      { count: 1, index: 1, r: 4, g: 0, b: 0, tileType: 1 },
      { count: 5, index: 1, r: 0, g: 0, b: 0, tileType: 0 },
      { count: 6, index: 2, r: -2, g: 3, b: 0, tileType: 2 },
    ],
    programs: [
      {
        file: "p.prg",
        x: 2,
        y: 2,
        layer: 1,
        graphic: "",
        activate: 0,
        initialVar: "",
        finalVar: "",
        initialValue: "",
        finalValue: "",
        activationType: 0,
      },
    ],
    sprites: [
      {
        file: "npc.itm",
        x: 3,
        y: 1,
        layer: 2,
        activate: 0,
        initialVar: "",
        finalVar: "",
        initialValue: "",
        finalValue: "",
        activationType: 0,
        activationPrg: "",
        multitaskPrg: "",
      },
    ],
  });
  const first = readAndConvert(bytes).converted;
  const second = readAndConvert(bytes).converted;
  equal(first.minor, 4);
  deepEqual(first, second);
});

test("a residue after the last field is kept and warned about", () => {
  const bytes = buildPreVectorBoard({ tail: [7, 8, 9] });
  const result = readPreVectorBoard(new BinaryReader(bytes));
  const board = unwrap(result);
  deepEqual([...board.residue], [7, 8, 9]);
  equal(
    result.ok && result.warnings.some((warning) => warning.includes("residue")),
    true,
  );
  deepEqual([...unwrap(convertPreVectorBoard(board)).residue], [7, 8, 9]);
});

test("refuses minors 0 and 1 with a located error", () => {
  for (const minor of [0, 1]) {
    const result = readPreVectorBoard(new BinaryReader(buildPreVectorBoard({ minor })));
    equal(result.ok, false, `minor ${minor} is refused`);
    if (!result.ok) {
      equal(result.error.section, "format-spec §4.1");
      equal(result.error.offset, 17, "the minor field's first byte");
      equal(result.error.message.includes("obsolete"), true);
    }
  }
});

test("refuses minor 4 and above with a located error", () => {
  for (const minor of [4, 9]) {
    const result = readPreVectorBoard(new BinaryReader(buildPreVectorBoard({ minor })));
    equal(result.ok, false, `minor ${minor} is refused`);
    if (!result.ok) {
      equal(result.error.section, "format-spec §4.1");
      equal(result.error.offset, 17);
      equal(result.error.message.includes("vector layout"), true);
    }
  }
});

test("refuses a wrong magic", () => {
  // 14 characters, so byte 14 is still the NUL that marks a binary file.
  const result = readPreVectorBoard(new BinaryReader(buildPreVectorBoard({ magic: "RPGTLKIT BOARX" })));
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, 0);
    equal(result.error.section, "format-spec §4.8");
    equal(result.error.message.includes("not a board"), true);
  }
});

test("refuses a 2.x text board (non-zero byte 14)", () => {
  const bytes = buildPreVectorBoard({});
  bytes[14] = 0x0d;
  const result = readPreVectorBoard(new BinaryReader(bytes));
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.offset, 14);
    equal(result.error.message.includes("text board"), true);
  }
});

test("reports a located error for a truncated board", () => {
  const bytes = buildPreVectorBoard({});
  const result = readPreVectorBoard(new BinaryReader(bytes.slice(0, 30)));
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.section, "format-spec §1.1");
    equal(result.error.offset, 30, "the startY field has no bytes left");
  }
});

test("refuses to convert an iso-rotated board", () => {
  const bytes = buildPreVectorBoard({ minor: 3, coordType: 2 });
  const board = unwrap(readPreVectorBoard(new BinaryReader(bytes)));
  const result = convertPreVectorBoard(board);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.section, "format-spec §4.8");
    equal(result.error.message.includes("iso-rotated"), true);
  }
});

// --- Sample fixtures (guard-rail G5 rule 4: fetched, never committed) --------

/** Every `.brd` under `root`, recursively; empty when the folder is absent. */
function collectBoards(root: string): string[] {
  if (!existsSync(root)) {
    return [];
  }
  return readdirSync(root, { recursive: true })
    .filter((name) => name.toLowerCase().endsWith(".brd"))
    .map((name) => join(root, name));
}

const sampleBoards = [
  ...collectBoards(join(repoRoot, "fixtures", "legacy", "demo")),
  ...collectBoards(join(repoRoot, "fixtures", "legacy", "Basic")),
];

test(
  "the sample corpus ships no minor 2–3 board, so none is converted here",
  { skip: sampleBoards.length === 0 ? "legacy fixtures are not fetched" : false },
  (t?: { readonly diagnostic?: (message: string) => void }) => {
    const preVector: string[] = [];
    for (const path of sampleBoards) {
      const bytes = new Uint8Array(readFileSync(path));
      const minor = bytes[17]! | (bytes[18]! << 8);
      if (minor >= 2 && minor <= 3) {
        preVector.push(path);
      }
    }
    t?.diagnostic?.(`${sampleBoards.length} sample board(s), ${preVector.length} pre-vector`);
    for (const path of preVector) {
      const { converted } = readAndConvert(new Uint8Array(readFileSync(path)));
      equal(converted.minor, 4, `${path}: converts to the vector layout`);
    }
    if (preVector.length === 0) {
      equal(sampleBoards.length > 0, true, "the fixtures were fetched");
    }
  },
);
