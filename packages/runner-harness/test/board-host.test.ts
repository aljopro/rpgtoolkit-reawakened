// The board host and the shared render helper (epic-board-rendering entry 1):
// compose a board, rasterise it, hash it, encode it. `golden/board-2d/golden.json`
// pins the draw and pixel hashes; `frame.png` beside it is the artefact a person
// reviews before the hash is trusted (assumption A1), and `GOLDEN_RECORD=1 pnpm test`
// rewrites both.
import { deepEqual, equal } from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { test } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createSurface, fillSurface, pixelAt, type AssetKey, type Board, type Surface } from "@tk-reawakened/core";
import { createBoardHost, renderFrame, type BoardFixture, type FixtureTexture } from "../src/board-host.ts";
import { goldenJob } from "../src/job.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const goldenDir = join(repoRoot, "golden", "board-2d");

/** A 24-bit tile of one colour, with the transparent key in its top-left pixel. */
function tileSurface(r: number, g: number, b: number, keyed: boolean): Surface {
  const surface = createSurface(32, 32);
  fillSurface(surface, { r, g, b });
  if (keyed) {
    surface.rgba[0] = 0;
    surface.rgba[1] = 1;
    surface.rgba[2] = 2;
  }
  return surface;
}

function texture(tile: number, pixels: Surface): FixtureTexture {
  return { ref: { asset: "tiles/a.tst" as AssetKey, tile }, pixels };
}

/** Three cells over two layers on a 2D board, with a colour background. */
function syntheticBoard(): Board {
  return {
    magic: "RPGTLKIT BOARD",
    major: 2,
    minor: 4,
    sizeX: 3,
    sizeY: 1,
    sizeL: 2,
    coordType: 0,
    lut: ["", "tiles/a.tst1", "tiles/a.tst2", "tiles/a.tst3"],
    // Layer 1: tiles 1, 2, 0 (the third cell is empty). Layer 2: 3, 0, 0.
    tileMatrix: [1, 2, 0, 3, 0, 0],
    tileRuns: [],
    shadeLayers: [],
    lights: [],
    vectors: [],
    programs: [],
    sprites: [],
    images: [],
    threads: [],
    constants: [],
    layerTitles: ["", ""],
    links: { north: "", south: "", east: "", west: "" },
    properties: {
      backgroundImage: "",
      backgroundDrawType: 0,
      backgroundColour: { r: 20, g: 30, b: 40 },
      backgroundMusic: "",
      enterPrg: "",
      battleBackground: "",
      battleSkill: 0,
      allowBattles: 0,
      disableSaving: 0,
      ambient: { r: 0, g: 0, b: 0 },
      start: { x: 1, y: 1, layer: 1 },
    },
    residue: new Uint8Array(0),
  };
}

function syntheticFixture(): BoardFixture {
  return {
    board: syntheticBoard(),
    view: { tile: { source: { width: 32, height: 32 }, drawn: { width: 32, height: 32 } }, layers: null },
    viewport: { width: 320, height: 240 },
    textures: {
      "tiles/a.tst1": texture(1, tileSurface(200, 0, 0, false)),
      "tiles/a.tst2": texture(2, tileSurface(0, 200, 0, true)),
      // Layer 2's tile overpaints the first cell.
      "tiles/a.tst3": texture(3, tileSurface(0, 0, 200, false)),
    },
  };
}

test("renderFrame composes, rasterises and hashes a synthetic board deterministically", () => {
  const fixture = syntheticFixture();

  const first = renderFrame(fixture);
  const second = renderFrame(fixture);

  equal(first.drawList.width, 320);
  equal(first.drawList.height, 240);
  equal(first.drawHash, second.drawHash);
  equal(first.pixelHash, second.pixelHash);
  deepEqual(first.png, second.png);

  // Cell (0, 0) is layer 2's blue tile; cell (1, 0) is layer 1's keyed green
  // tile, so the background shows through its keyed top-left pixel and the rest
  // is green; cell (2, 0) holds no tile and is background.
  deepEqual(pixelAt(first.surface, 0, 0), { r: 0, g: 0, b: 200, a: 255 });
  deepEqual(pixelAt(first.surface, 32, 0), { r: 20, g: 30, b: 40, a: 255 });
  deepEqual(pixelAt(first.surface, 33, 0), { r: 0, g: 200, b: 0, a: 255 });
  deepEqual(pixelAt(first.surface, 96, 0), { r: 20, g: 30, b: 40, a: 255 });
});

test("the board host runs whole ticks and reports the consumed log", () => {
  const engine = createBoardHost(syntheticFixture());

  const report = engine.advance(2, [{ tick: 1, event: { kind: "pointer", x: 10, y: 20, buttons: 0 } }]);

  equal(report.ticksRun, 2);
  equal(report.tickAfter, 2);
  equal(report.consumed.length, 1);
  equal(report.loading, false);
  equal(report.paused, null);
  deepEqual(report.requests, []);
  deepEqual(report.diagnostics, []);
  equal(report.stateHash.length, 16);
  equal(engine.drawList(0).tick, 2);
  equal(engine.surfacePixels(0 as never, 0), null);
});

test("the pinned board golden matches, or is recorded when GOLDEN_RECORD=1", () => {
  const frame = renderFrame(syntheticFixture());
  const recorded = { draw: frame.drawHash, pixel: frame.pixelHash };

  if (process.env.GOLDEN_RECORD === "1") {
    mkdirSync(goldenDir, { recursive: true });
    writeFileSync(join(goldenDir, "golden.json"), `${JSON.stringify(recorded, null, 2)}\n`);
    writeFileSync(join(goldenDir, "frame.png"), frame.png);
    return;
  }

  if (!existsSync(join(goldenDir, "golden.json"))) {
    throw new Error("golden/board-2d/golden.json is missing; record it with GOLDEN_RECORD=1 pnpm test");
  }
  deepEqual(JSON.parse(readFileSync(join(goldenDir, "golden.json"), "utf8")), recorded);
});

test("the board host runs through the golden job: vectors, a run, batching, then a recorded golden", () => {
  const texts = {
    vectors: readFileSync(join(repoRoot, "golden", "hash-vectors.json"), "utf8"),
    run: readFileSync(join(repoRoot, "golden", "test-double", "run.json"), "utf8"),
  };
  const factory = () => createBoardHost(syntheticFixture());

  const recorded = goldenJob(texts, true, factory);
  if (!recorded.ok || recorded.golden === undefined) {
    throw new Error(`expected the board host to record a golden: ${recorded.lines.join("; ")}`);
  }

  const compared = goldenJob({ ...texts, golden: recorded.golden }, false, factory);
  equal(compared.ok, true, compared.ok ? "" : compared.lines.join("; "));
});
