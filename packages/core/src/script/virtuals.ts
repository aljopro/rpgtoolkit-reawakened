/**
 * E-92 engine-backed virtual variables (ticket 3.12; E-92, R-37; owner ruling U2).
 *
 * Exposes the 44 legacy virtual variables and Reawakened additions through
 * VirtualVariablePort. Reading checks virtuals after locals and globals; assigning
 * to a virtual writes to globals, breaking the link for the remainder of the session.
 */

import type { Value } from "../ports/value.ts";
import type { GameState } from "../save/state.ts";

export type VirtualVariablePort = {
  read(name: string): Value | undefined;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

export function createDefaultVirtuals(state: GameState): VirtualVariablePort {
  return {
    read(rawName: string): Value | undefined {
      const name = rawName.toLowerCase();
      if (name === "gametime") {
        return Math.floor(state.time.tick / 60);
      }

      const audio = asRecord(state.audio);
      if (name === "music") {
        return typeof audio?.music === "string" ? audio.music : "";
      }

      const world = asRecord(state.world);
      const board = asRecord(world?.board);
      if (name === "boardbackground") {
        return typeof board?.background === "string" ? board.background : "";
      }
      if (name === "boardskill") {
        return typeof board?.skill === "number" ? board.skill : 0;
      }

      const surfaces = asRecord(state.surfaces);
      if (name === "cnvrendernow") {
        return typeof surfaces?.renderNow === "number" ? surfaces.renderNow : 0;
      }

      const ambient = asRecord(world?.ambient);
      if (name === "ambientred") {
        if (typeof world?.ambientRed === "number") return world.ambientRed;
        return typeof ambient?.r === "number" ? ambient.r : 0;
      }
      if (name === "ambientgreen") {
        if (typeof world?.ambientGreen === "number") return world.ambientGreen;
        return typeof ambient?.g === "number" ? ambient.g : 0;
      }
      if (name === "ambientblue") {
        if (typeof world?.ambientBlue === "number") return world.ambientBlue;
        return typeof ambient?.b === "number" ? ambient.b : 0;
      }

      let m = /^playerx\[([0-4])\]$/.exec(name);
      if (m) {
        const idx = Number(m[1]);
        const sprites = asRecord(state.sprites);
        const players = Array.isArray(sprites?.players) ? sprites.players : undefined;
        const player = asRecord(players?.[idx]);
        return typeof player?.x === "number" ? player.x : 0;
      }
      m = /^playery\[([0-4])\]$/.exec(name);
      if (m) {
        const idx = Number(m[1]);
        const sprites = asRecord(state.sprites);
        const players = Array.isArray(sprites?.players) ? sprites.players : undefined;
        const player = asRecord(players?.[idx]);
        return typeof player?.y === "number" ? player.y : 0;
      }
      m = /^playerlayer\[([0-4])\]$/.exec(name);
      if (m) {
        const idx = Number(m[1]);
        const sprites = asRecord(state.sprites);
        const players = Array.isArray(sprites?.players) ? sprites.players : undefined;
        const player = asRecord(players?.[idx]);
        return typeof player?.layer === "number" ? player.layer : 0;
      }
      m = /^playerhandle\[([0-4])\]$/.exec(name);
      if (m) {
        const idx = Number(m[1]);
        const party = asRecord(state.party);
        const members = Array.isArray(party?.members) ? party.members : undefined;
        const member = asRecord(members?.[idx]);
        return typeof member?.name === "string" ? member.name : "";
      }
      m = /^boardtitle\[([1-8])\]$/.exec(name);
      if (m) {
        const idx = Number(m[1]);
        const layerTitles = asRecord(board?.layerTitles);
        const title = layerTitles?.[idx];
        return typeof title === "string" ? title : "";
      }
      m = /^constant\[(10|[0-9])\]$/.exec(name);
      if (m) {
        const idx = Number(m[1]);
        const constants = asRecord(board?.constants);
        const c = constants?.[idx];
        return typeof c === "number" ? c : 0;
      }
      m = /^threads\[([0-9]+)\]$/.exec(name);
      if (m) {
        const id = Number(m[1]);
        const thread = state.vm.threads.find((t) => t.id === id);
        return thread ? thread.id : 0;
      }

      return undefined;
    },
  };
}
