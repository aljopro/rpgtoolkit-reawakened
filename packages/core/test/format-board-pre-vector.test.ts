// The pre-vector board layout of format-spec §4.1 (dispatch) and §4.8
// (minors 2–3) and its conversion to the vector model of §4.2. The sample
// corpus ships no minor 2–3 board (all three fixture `.brd` files are minor 4),
// so the layout and the conversion are pinned by synthetic boards built byte
// by byte here, including runs that wrap rows and layers, and the §4.2 cell
// limit the reader applies to the declared grid.
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
  BOARD_MAX_CELLS,
  BinaryReader,
  BinaryWriter,
  convertPreVectorBoard,
  readBoard,
  readPreVectorBoard,
  TT_SOLID,
  TT_STAIRS,
  TT_UNDER,
  writeBoard,
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
  // One 5 × 1 layer: two solid tiles, one under tile, one stair to layer 3 and
  // one normal tile, which emits no vector at all.
  const bytes = buildPreVectorBoard({
    sizeX: 5,
    sizeY: 1,
    sizeL: 1,
    cells: [
      { count: 1, index: 1, r: 0, g: 0, b: 0, tileType: 1 },
      { count: 1, index: 1, r: 0, g: 0, b: 0, tileType: 1 },
      { count: 1, index: 2, r: 0, g: 0, b: 0, tileType: 2 },
      { count: 1, index: 3, r: 0, g: 0, b: 0, tileType: 13 },
      { count: 1, index: 0, r: 0, g: 0, b: 0, tileType: 0 },
    ],
  });
  const { converted } = readAndConvert(bytes);
  equal(converted.vectors.length, 3, "the normal tile (type 0) emits no vector");
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
    { lutIndex: 0, count: 1, marker: false },
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

test("the flattened shade sums are not clamped to ±255", () => {
  // One 1×1 cell on each of two layers, both shaded: §4.8 "Shading" sums them
  // without clamping, so +255 on two layers is +510 (and −510 for two −255s).
  const positive = readAndConvert(
    buildPreVectorBoard({
      sizeX: 1,
      sizeY: 1,
      sizeL: 2,
      cells: [
        { count: 1, index: 1, r: 255, g: 0, b: 0, tileType: 0 },
        { count: 1, index: 1, r: 255, g: 0, b: 0, tileType: 0 },
      ],
    }),
  );
  deepEqual(positive.converted.shadeLayers, [
    { castLayer: 2, records: [{ runCount: 1, r: 510, g: 0, b: 0 }] },
  ]);
  const negative = readAndConvert(
    buildPreVectorBoard({
      sizeX: 1,
      sizeY: 1,
      sizeL: 2,
      cells: [
        { count: 1, index: 1, r: -255, g: 0, b: 0, tileType: 0 },
        { count: 1, index: 1, r: -255, g: 0, b: 0, tileType: 0 },
      ],
    }),
  );
  deepEqual(negative.converted.shadeLayers, [
    { castLayer: 2, records: [{ runCount: 1, r: -510, g: 0, b: 0 }] },
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

test("empty program and sprite slots invent no geometry, and keep their indices", () => {
  // The empty slots sit at a positive tile to prove the empty rule wins over a
  // §5 mapping of that tile. §4.8: an empty program slot has an empty point
  // list and `closed = 0`; an empty sprite slot is at (0, 0) on its stored layer.
  for (const coordType of [0, 1]) {
    const bytes = buildPreVectorBoard({
      minor: 3,
      coordType,
      sizeX: 4,
      sizeY: 4,
      sizeL: 2,
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
        {
          file: "",
          x: 3,
          y: 2,
          layer: 2,
          graphic: "",
          activate: 0,
          initialVar: "",
          finalVar: "",
          initialValue: "",
          finalValue: "",
          activationType: 2,
        },
      ],
      sprites: [
        {
          file: "npc.itm",
          x: 2,
          y: 2,
          layer: 1,
          activate: 0,
          initialVar: "",
          finalVar: "",
          initialValue: "",
          finalValue: "",
          activationType: 0,
          activationPrg: "",
          multitaskPrg: "",
        },
        {
          file: "",
          x: 3,
          y: 3,
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
    const { converted } = readAndConvert(bytes);
    equal(converted.programs.length, 2, "the empty program slot is kept");
    deepEqual(converted.programs[1]?.points, [], `coordType ${coordType}: no region is invented`);
    equal(converted.programs[1]?.closed, 0, `coordType ${coordType}: an empty region is open`);
    equal(
      converted.programs[1]?.activationType,
      6,
      `coordType ${coordType}: an empty slot still receives PRG_STOPS_MOVEMENT and keeps bit 2`,
    );
    equal(converted.programs[1]?.repeatDistance, 0);
    equal(converted.sprites.length, 2, "the empty sprite slot is kept");
    equal(converted.sprites[1]?.itemFile, "");
    equal(converted.sprites[1]?.x, 0, `coordType ${coordType}: the empty sprite sits at x = 0`);
    equal(converted.sprites[1]?.y, 0, `coordType ${coordType}: the empty sprite sits at y = 0`);
    equal(converted.sprites[1]?.layer, 2, `coordType ${coordType}: the empty sprite keeps its stored layer`);
  }
});

test("a legacy repeat bit is passed through with repeatDistance 0", () => {
  const bytes = buildPreVectorBoard({
    programs: [
      {
        file: "r.prg",
        x: 1,
        y: 1,
        layer: 1,
        graphic: "",
        activate: 1,
        initialVar: "",
        finalVar: "",
        initialValue: "",
        finalValue: "",
        activationType: 2,
      },
    ],
  });
  const { converted } = readAndConvert(bytes);
  equal(
    converted.programs[0]?.activationType,
    6,
    "bit 2 (repeat) stays set alongside PRG_STOPS_MOVEMENT (§4.8 chose passthrough)",
  );
  equal(converted.programs[0]?.repeatDistance, 0, "§4.8 gives the pre-vector record no distance field");
});

test("legacy tile types §4.7 does not define emit nothing and are not reported", () => {
  const types = [5, 6, 7, 8, 9, 10, 19, 25];
  const bytes = buildPreVectorBoard({
    sizeX: types.length,
    sizeY: 1,
    sizeL: 1,
    cells: types.map((tileType) => ({ count: 1, index: 1, r: 0, g: 0, b: 0, tileType })),
  });
  const result = convertPreVectorBoard(unwrap(readPreVectorBoard(new BinaryReader(bytes))));
  equal(result.ok, true);
  if (result.ok) {
    deepEqual(result.value.vectors, [], "an undefined type emits no vector");
    deepEqual(result.warnings, [], "an undefined type is not reported");
  }
});

test("the conversion generates no vector base for a sprite", () => {
  const { converted } = readAndConvert(
    buildPreVectorBoard({
      sprites: [
        {
          file: "npc.itm",
          x: 1,
          y: 1,
          layer: 1,
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
    }),
  );
  // §4.8 "Default vector bases": the vector `BoardSprite` carries no base — the
  // bases come from the actor file (§6) — so the converted sprite has exactly
  // the model's fields and no invented collision/activation base.
  deepEqual(
    Object.keys(converted.sprites[0] ?? {}).sort(),
    [
      "activate",
      "activationPrg",
      "activationType",
      "finalValue",
      "finalVar",
      "initialValue",
      "initialVar",
      "itemFile",
      "layer",
      "loadingValue",
      "loadingVar",
      "multitaskPrg",
      "reserved",
      "x",
      "y",
    ].sort(),
  );
});

test("the fields with no §4.2 home are dropped from the converted board", () => {
  const { board, converted } = readAndConvert(buildPreVectorBoard({}));
  // The pre-vector board carries them …
  equal("registrationFlag" in board, true);
  equal("foregroundImage" in board, true);
  equal("dayNight" in board, true);
  // … and the §4.2 vector board has no field for any of them (§4.8 "Dropped fields").
  for (const key of [
    "registrationFlag",
    "registrationKey",
    "foregroundImage",
    "borderImage",
    "borderColour",
    "dayNight",
    "reserved",
  ]) {
    equal(key in converted, false, `${key} is dropped`);
  }
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

test("accepts §5's combinable PX_ABSOLUTE flag and passes the value through", () => {
  for (const coordType of [4, 5]) {
    const { board, converted } = readAndConvert(buildPreVectorBoard({ minor: 3, coordType }));
    equal(board.coordType, coordType);
    equal(converted.coordType, coordType, "the stored coordType is passed through unchanged");
    equal(converted.minor, 4);
  }
  // 6 = iso rotated (2) + pixel absolute (4): the iso-rotated refusal still applies.
  const rotated = unwrap(
    readPreVectorBoard(new BinaryReader(buildPreVectorBoard({ minor: 3, coordType: 6 }))),
  );
  const result = convertPreVectorBoard(rotated);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.section, "format-spec §4.8");
    equal(result.error.message.includes("iso-rotated"), true);
  }
});

test("a uniform board over 32768 cells chunks its runs so writeBoard accepts it", () => {
  // 192 × 192 = 36864 cells in one layer, all index 1 with shade 5: one maximal
  // tile run and one maximal shade run both exceed the i16 limits.
  const bytes = buildPreVectorBoard({
    sizeX: 192,
    sizeY: 192,
    sizeL: 1,
    cells: [
      { count: 32768, index: 1, r: 5, g: 0, b: 0, tileType: 0 },
      { count: 4096, index: 1, r: 5, g: 0, b: 0, tileType: 0 },
    ],
  });
  const { converted } = readAndConvert(bytes);
  equal(converted.tileMatrix.length, 36864);
  deepEqual(
    converted.tileRuns.map((run) => [run.count, run.lutIndex, run.marker]),
    [
      [32768, 1, true],
      [4096, 1, true],
    ],
    "the tile run is split at 32768 cells",
  );
  deepEqual(converted.shadeLayers, [
    {
      castLayer: 1,
      records: [
        { runCount: 32767, r: 5, g: 0, b: 0 },
        { runCount: 4097, r: 5, g: 0, b: 0 },
      ],
    },
  ], "the shade run is split at 32767 cells");
  const written = unwrap(writeBoard(converted));
  const reread = unwrap(readBoard(new BinaryReader(written)));
  deepEqual(reread.tileRuns, converted.tileRuns, "the chunked tile runs re-read");
  deepEqual(reread.shadeLayers, converted.shadeLayers, "the chunked shade records re-read");
  deepEqual(reread.tileMatrix, converted.tileMatrix);
});

test("the ambient preset maps to its additive ambience and warns on an unknown one", () => {
  const presets: readonly (readonly [number, number, number, number])[] = [
    [0, 0, 0, 0],
    [1, 75, 75, 75],
    [2, -75, -75, -75],
    [3, 0, 0, 75],
  ];
  for (const [preset, r, g, b] of presets) {
    const { converted } = readAndConvert(buildPreVectorBoard({ ambientPreset: preset }));
    deepEqual(converted.properties.ambient, { r, g, b }, `ambient preset ${preset}`);
  }
  const unknown = convertPreVectorBoard(
    unwrap(readPreVectorBoard(new BinaryReader(buildPreVectorBoard({ ambientPreset: 7 })))),
  );
  equal(unknown.ok, true);
  if (unknown.ok) {
    deepEqual(unknown.value.properties.ambient, { r: 0, g: 0, b: 0 });
    equal(
      unknown.warnings.some((warning) => warning.includes("ambient preset 7")),
      true,
    );
  }
});

test("the converted board carries the LUT, constants, links and trailing properties", () => {
  const bytes = buildPreVectorBoard({
    lut: ["", "a.tst1", "b.tst2"],
    constants: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    layerTitles: ["sky", "ground"],
    links: ["n.brd", "s.brd", "e.prg", "w.brd"],
    backgroundImage: "bg.img",
    backgroundMusic: "song.mid",
    enterPrg: "enter.prg",
    battleSkill: 7,
    battleBackground: "fight.bkg",
    allowBattles: 1,
    disableSaving: 1,
  });
  const { converted } = readAndConvert(bytes);
  deepEqual(converted.lut, ["", "a.tst1", "b.tst2"]);
  deepEqual(converted.constants, ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]);
  deepEqual(converted.links, { north: "n.brd", south: "s.brd", east: "e.prg", west: "w.brd" });
  equal(converted.layerTitles.length, converted.sizeL + 1);
  deepEqual(converted.layerTitles, ["sky", "ground"]);
  equal(converted.properties.backgroundImage, "bg.img");
  equal(converted.properties.backgroundDrawType, 1, "§4.8 draws the background as parallax");
  equal(converted.properties.backgroundMusic, "song.mid");
  equal(converted.properties.enterPrg, "enter.prg");
  equal(converted.properties.battleSkill, 7);
  equal(converted.properties.battleBackground, "fight.bkg");
  equal(converted.properties.allowBattles, 1);
  equal(converted.properties.disableSaving, 1);
});

test("a converted board writes back with writeBoard and re-reads unchanged", () => {
  const bytes = buildPreVectorBoard({
    sizeX: 4,
    sizeY: 3,
    sizeL: 1,
    cells: [
      { count: 1, index: 1, r: 4, g: 0, b: 0, tileType: 1 },
      { count: 5, index: 1, r: 0, g: 0, b: 0, tileType: 0 },
      { count: 3, index: 2, r: -2, g: 3, b: 0, tileType: 2 },
      { count: 3, index: 3, r: 0, g: 0, b: 0, tileType: 3 },
    ],
    links: ["n.brd", "s.brd", "e.prg", "w.brd"],
    constants: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    layerTitles: ["sky", "ground"],
    ambientPreset: 3,
    backgroundImage: "bg.img",
    backgroundMusic: "song.mid",
    enterPrg: "enter.prg",
    battleSkill: 7,
    battleBackground: "fight.bkg",
    allowBattles: 1,
    disableSaving: 1,
    programs: [
      {
        file: "p.prg",
        x: 2,
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
    sprites: [
      {
        file: "npc.itm",
        x: 3,
        y: 1,
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
  const written = unwrap(writeBoard(converted));
  const reread = unwrap(readBoard(new BinaryReader(written)));
  deepEqual(reread, converted);
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

test("refuses a pre-vector board whose tile matrix would exceed the cell limit", () => {
  // A few bytes declare 8000 × 8000 × 1 = 64,000,000 cells — a run marker
  // expands 32,768 of them from four bytes — so the reader must refuse on the
  // dimensions before it reads or expands a single run, and must return a
  // located `FormatError` rather than allocating (or throwing). This is the
  // regression for the 21 KB file that reached ~1.4 GiB RSS.
  const bytes = buildPreVectorBoard({ sizeX: 8000, sizeY: 8000, sizeL: 1, cells: [] });
  equal(8000 * 8000, 64_000_000, "the crafted grid is far over the limit");
  const result = readPreVectorBoard(new BinaryReader(bytes));
  equal(result.ok, false, "an over-limit board is refused, not expanded");
  if (result.ok) {
    return;
  }
  equal(result.error.section, "format-spec §4.8");
  equal(result.error.offset, 22, "the sizeX field");
  equal(result.error.message.includes("64000000"), true, "the error names the declared grid");
  equal(result.error.message.includes("4194304"), true, "the error names the limit");
});

test("refuses a board one cell over the limit, at any size", () => {
  // 397 × 2113 × 5 = BOARD_MAX_CELLS + 1 cells, and the crafted file holds no
  // matrix bytes at all, so only the §4.2 "Size limits" rule can refuse it.
  equal(397 * 2113 * 5, BOARD_MAX_CELLS + 1, "the crafted grid is one cell over the limit");
  const result = readPreVectorBoard(
    new BinaryReader(buildPreVectorBoard({ sizeX: 397, sizeY: 2113, sizeL: 5, cells: [] })),
  );
  equal(result.ok, false);
  if (result.ok) {
    return;
  }
  equal(result.error.section, "format-spec §4.8");
  equal(result.error.offset, 22, "the sizeX field");
});

test("accepts a pre-vector board of exactly BOARD_MAX_CELLS cells built from 128 maximum runs", () => {
  equal(2048 * 2048, BOARD_MAX_CELLS, "2048 × 2048 × 1 is exactly the limit");
  equal(128 * 32_768, BOARD_MAX_CELLS, "128 runs of 32768 cells fill it");
  const cells = Array.from({ length: 128 }, () => ({
    count: 32_768,
    index: 1,
    r: 0,
    g: 0,
    b: 0,
    tileType: 0,
  }));
  const { board, converted } = readAndConvert(
    buildPreVectorBoard({ minor: 2, sizeX: 2048, sizeY: 2048, sizeL: 1, cells }),
  );
  equal(board.tileMatrix.length, BOARD_MAX_CELLS);
  equal(board.tileRuns.length, 128);
  equal(converted.sizeX, 2048);
  equal(converted.sizeY, 2048);
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
