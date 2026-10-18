import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import { createAssetIndex, createEmptyBoard, createEngine, PACKAGE_ROOT, writeBoard, type Board } from "../src/index.ts";
import { hydrateSprites } from "../src/sprites/runtime.ts";
import type { Facing } from "../src/sprites/model.ts";
import type { GameState } from "../src/save/state.ts";

type EdgeCase = "no-link-edge-is-solid" | "board-link-arrives-opposite-edge" | "arrival-clamps-along-edge" | "blocked-arrival-is-refused" | "program-link-runs-program" | "west-edge-arrives-east-edge";

type EdgeFacts = { readonly board: string | null; readonly x: number | null; readonly y: number | null; readonly pending: Facing | null };

function bytes(board: Board): Uint8Array {
  const encoded = writeBoard(board);
  if (!encoded.ok) throw new Error(encoded.error.message);
  return encoded.value;
}

function board(sizeY: number, links: Partial<Board["links"]> = {}, vectors: Board["vectors"] = [], enterPrg = ""): Board {
  const empty = createEmptyBoard();
  const cells = 10 * sizeY;
  return {
    ...empty,
    sizeX: 10,
    sizeY,
    sizeL: 1,
    tileMatrix: Array.from({ length: cells }, () => 0),
    tileRuns: [{ lutIndex: 0, count: cells, marker: cells > 1 }],
    layerTitles: ["", ""],
    links: { ...empty.links, ...links },
    vectors,
    properties: { ...empty.properties, enterPrg },
  };
}

function runEdgeCase(name: EdgeCase, batch = 1): { readonly facts: readonly EdgeFacts[]; readonly diagnostics: readonly string[]; readonly stateHashes: readonly string[] } {
  const sourceLink = name === "no-link-edge-is-solid" ? {} : name === "program-link-runs-program" ? { north: "north-gate.prg" } : { east: "east.brd", west: "east.brd" };
  const source = board(10, sourceLink);
  const blocked = [{ handle: "rubble", attributes: 0, closed: 1, layer: 0, type: 1, points: [{ x: 0, y: 64 }, { x: 64, y: 64 }, { x: 64, y: 128 }, { x: 0, y: 128 }] }];
  const destination = board(name === "arrival-clamps-along-edge" ? 5 : 10, {}, name === "blocked-arrival-is-refused" ? blocked : []);
  const direction: Facing = name === "west-edge-arrives-east-edge" ? "W" : name === "program-link-runs-program" ? "N" : name === "no-link-edge-is-solid" ? "S" : "E";
  const startY = name === "arrival-clamps-along-edge" ? 300 : 95;
  const facts: EdgeFacts[] = [];
  const stateHashes: string[] = [];
  let seeded = false;
  const engine = createEngine({
    seed: 59,
    assetIndex: createAssetIndex(["Boards/west.brd", "Boards/east.brd"]),
    assetRoot: PACKAGE_ROOT,
    initialBoard: "west.brd",
    width: 320,
    height: 320,
    maxTicks: 4,
    phaseRegistrations: [
      { phase: "movement", rank: -1, run: (state: GameState) => {
        const currentBoard = state.world.board;
        if (seeded || currentBoard === null || currentBoard === undefined) return;
        seeded = true;
        state.sprites = hydrateSprites({ board: currentBoard, players: [{ id: "hero", source: "hero.tem", kind: "player", x: direction === "W" ? 15 : direction === "E" ? 304 : 144, y: startY, layer: 0, facing: direction, controlled: true }] });
        state.sprites.players = state.sprites.players.map((actor) => ({ ...actor, state: "moving", movement: { ...actor.movement, pendingExit: direction } }));
      } },
      { phase: "audio", run: (state: GameState) => {
        const player = state.sprites.players[0];
        facts.push({ board: state.world.board?.key ?? null, x: player?.x ?? null, y: player?.y ?? null, pending: player?.movement.pendingExit ?? null });
        stateHashes.push(String(state.time.tick));
      } },
    ],
  });
  let result = engine.advance(0, []);
  let elapsed = 0;
  while (elapsed < 6) {
    const replies = result.requests.filter((request) => request.kind === "asset").map((request) => ({ tick: result.tickAfter, event: { kind: "asset" as const, reqId: request.reqId, bytes: request.key === "boards/west.brd" ? bytes(source) : bytes(destination) } }));
    const next = engine.advance(Math.min(batch, 6 - elapsed), replies);
    elapsed += next.ticksRun;
    result = next;
    if (next.ticksRun === 0 && next.requests.length === 0) break;
  }
  return { facts, diagnostics: result.diagnostics.map((diagnostic) => diagnostic.code), stateHashes };
}

test("edges-board-link-program fixture cases drive the real core edges phase", () => {
  const noLink = runEdgeCase("no-link-edge-is-solid");
  deepEqual(noLink.facts[0], { board: "boards/west.brd", x: 144, y: 95, pending: null });
  const linked = runEdgeCase("board-link-arrives-opposite-edge");
  deepEqual(linked.facts[1], { board: "boards/east.brd", x: 15, y: 95, pending: null });
  const clamped = runEdgeCase("arrival-clamps-along-edge");
  equal(clamped.facts[1]?.y, 160);
  const refused = runEdgeCase("blocked-arrival-is-refused");
  deepEqual(refused.facts[1], { board: "boards/west.brd", x: 304, y: 95, pending: null });
  const program = runEdgeCase("program-link-runs-program");
  equal(program.facts[0]?.board, "boards/west.brd");
  const west = runEdgeCase("west-edge-arrives-east-edge");
  deepEqual(west.facts[1], { board: "boards/east.brd", x: 305, y: 95, pending: null });
});

test("edge transitions have equal facts when advanced one tick or in batches", () => {
  const one = runEdgeCase("board-link-arrives-opposite-edge");
  const batched = runEdgeCase("board-link-arrives-opposite-edge", 2);
  deepEqual(one.facts.at(-1), batched.facts.at(-1));
  equal(one.diagnostics.length, 0);
});
