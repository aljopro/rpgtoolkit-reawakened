/** E-92 engine-backed virtual variables, including board data (R-37). */
import type { Value } from "../ports/value.ts";
import { musicFile } from "../audio/model.ts";
import { GAME_EMITTER } from "../events/model.ts";
import { registerEmitter } from "../events/emitter.ts";
import type { GameState } from "../save/state.ts";
import { TICKS_PER_SECOND } from "../time/time.ts";
import { ScriptError } from "./errors.ts";

export type VirtualVariablePort = {
  read(name: string): Value | undefined;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;
}

function requiresBoard(name: string): boolean {
  return name === "boardbackground" || name === "boardskill" || name.startsWith("boardtitle[") || name.startsWith("constant[") || name === "ambientred" || name === "ambientgreen" || name === "ambientblue";
}

/** Read the board-backed virtuals from the hydrated world section. */
export function createDefaultVirtuals(state: GameState): VirtualVariablePort {
  return {
    read(rawName: string): Value | undefined {
      const name = rawName.toLowerCase();
      if (name === "gametime") return Math.floor(state.time.tick / TICKS_PER_SECOND);
      if (name === "music") return musicFile(state.audio) ?? "";
      if (name === GAME_EMITTER) {
        // EMIT-19: `game` reads as the game emitter, an object made the first time anything needs it.
        const game = registerEmitter(state.vm, state.events, GAME_EMITTER);
        return { kind: "object", handle: game.handle, className: game.className };
      }
      const world = asRecord(state.world);
      const board = asRecord(world?.board);
      if (requiresBoard(name) && board === undefined) throw new ScriptError("world.no-board", `virtual variable "${rawName}" requires a loaded board`);
      if (name === "boardbackground") return typeof board?.battleBackground === "string" ? board.battleBackground : typeof board?.background === "string" ? board.background : "";
      if (name === "boardskill") return typeof board?.battleSkill === "number" ? board.battleSkill : typeof board?.skill === "number" ? board.skill : 0;
      const surfaces = asRecord(state.surfaces);
      if (name === "cnvrendernow") return typeof surfaces?.renderNow === "number" ? surfaces.renderNow : 0;
      const ambient = asRecord(board?.ambient);
      if (name === "ambientred") return typeof ambient?.r === "number" ? ambient.r : 0;
      if (name === "ambientgreen") return typeof ambient?.g === "number" ? ambient.g : 0;
      if (name === "ambientblue") return typeof ambient?.b === "number" ? ambient.b : 0;
      let match = /^playerx\[([0-4])\]$/.exec(name);
      if (match !== null) {
        const players = asRecord(state.sprites)?.players;
        const player = asRecord(Array.isArray(players) ? players[Number(match[1])] : undefined);
        return typeof player?.x === "number" ? player.x : 0;
      }
      match = /^playery\[([0-4])\]$/.exec(name);
      if (match !== null) {
        const players = asRecord(state.sprites)?.players;
        const player = asRecord(Array.isArray(players) ? players[Number(match[1])] : undefined);
        return typeof player?.y === "number" ? player.y : 0;
      }
      match = /^playerlayer\[([0-4])\]$/.exec(name);
      if (match !== null) {
        const players = asRecord(state.sprites)?.players;
        const player = asRecord(Array.isArray(players) ? players[Number(match[1])] : undefined);
        return typeof player?.layer === "number" ? player.layer : 0;
      }
      match = /^playerhandle\[([0-4])\]$/.exec(name);
      if (match !== null) {
        const members = asRecord(state.party)?.members;
        const member = asRecord(Array.isArray(members) ? members[Number(match[1])] : undefined);
        return typeof member?.name === "string" ? member.name : "";
      }
      match = /^boardtitle\[([1-8])\]$/.exec(name);
      if (match !== null) {
        const titles = board?.layerTitles;
        const title = Array.isArray(titles) ? titles[Number(match[1])] : undefined;
        return typeof title === "string" ? title : "";
      }
      match = /^constant\[(10|[0-9])\]$/.exec(name);
      if (match !== null) {
        const constants = board?.constants;
        const value = Array.isArray(constants) ? constants[Number(match[1])] : asRecord(constants)?.[match[1] ?? ""];
        return typeof value === "string" || typeof value === "number" ? value : 0;
      }
      match = /^threads\[([0-9]+)\]$/.exec(name);
      if (match !== null) {
        const id = Number(match[1]);
        const thread = state.vm.threads.find((entry) => entry.id === id);
        return thread ? thread.id : 0;
      }
      return undefined;
    },
  };
}
