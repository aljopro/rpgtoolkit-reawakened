/**
 * Reading a Toolkit 2 line-oriented text board ([text-board specification](../../../../../../docs/spec/formats/legacy/text-formats.md#board-toolkit-2-text).
 *
 * Pure (G2): consumes bytes, parses the text layout into a PreVectorBoard,
 * and turns it into a vector Board through convertPreVectorBoard ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)).
 */

import { err, ok, type Result } from "../result.ts";
import { unpackColorref } from "../binary/color.ts";
import { TextLineReader } from "../text/line-reader.ts";
import { BOARD_MAGIC, BOARD_MAX_CELLS, type Board } from "./model.ts";
import {
  type PreVectorBoard,
  type PreVectorCell,
  type PreVectorDayNight,
  type PreVectorProgram,
  type PreVectorSprite,
} from "./pre-vector-reader.ts";
import { convertPreVectorBoard } from "./pre-vector-convert.ts";

export const TEXT_BOARD_SECTION = "docs/spec/formats/legacy/text-formats.md#board-toolkit-2-text";

/** Parse a Toolkit 2 text board from bytes and convert it to a vector Board. */
export function readTextBoard(bytes: Uint8Array, path?: string): Result<Board> {
  const reader = new TextLineReader(bytes, path);

  const magic = reader.nextLine("magic", TEXT_BOARD_SECTION);
  if (!magic.ok) return magic;
  if (magic.value.trim() !== BOARD_MAGIC) {
    return err({
      ...(path === undefined ? {} : { path }),
      offset: 0,
      section: TEXT_BOARD_SECTION,
      message: `not a board: magic is "${magic.value}", expected "${BOARD_MAGIC}"`,
    });
  }

  const major = reader.nextInt("major", TEXT_BOARD_SECTION);
  if (!major.ok) return major;
  const minor = reader.nextInt("minor", TEXT_BOARD_SECTION);
  if (!minor.ok) return minor;

  if (minor.value !== 0 && minor.value !== 1) {
    return err({
      ...(path === undefined ? {} : { path }),
      offset: reader.offset,
      section: TEXT_BOARD_SECTION,
      message: `unsupported text board minor version ${minor.value}: expected 0 or 1`,
    });
  }

  const regFlag = reader.nextInt("registrationFlag", TEXT_BOARD_SECTION, 0);
  if (!regFlag.ok) return regFlag;
  const regCode = reader.nextLine("registrationCode", TEXT_BOARD_SECTION);
  if (!regCode.ok) return regCode;

  let sizeX = 19;
  let sizeY = 11;
  if (minor.value === 1) {
    const w = reader.nextInt("sizeX", TEXT_BOARD_SECTION);
    if (!w.ok) return w;
    const h = reader.nextInt("sizeY", TEXT_BOARD_SECTION);
    if (!h.ok) return h;
    sizeX = w.value;
    sizeY = h.value;
  }

  const sizeL = 8;
  const totalCells = sizeX * sizeY * sizeL;
  if (sizeX <= 0 || sizeY <= 0 || totalCells > BOARD_MAX_CELLS) {
    return err({
      ...(path === undefined ? {} : { path }),
      offset: reader.offset,
      section: TEXT_BOARD_SECTION,
      message: `invalid board dimensions ${sizeX}×${sizeY}×${sizeL} (${totalCells} cells)`,
    });
  }

  const lutMap = new Map<string, number>();
  const lut: string[] = [""];
  const tileMatrix: PreVectorCell[] = new Array<PreVectorCell>(totalCells);

  for (let x = 0; x < sizeX; x++) {
    for (let y = 0; y < sizeY; y++) {
      for (let layer = 1; layer <= 8; layer++) {
        const nameRes = reader.nextLine("tileName", TEXT_BOARD_SECTION);
        if (!nameRes.ok) return nameRes;
        const rRes = reader.nextInt("tileR", TEXT_BOARD_SECTION, 0);
        if (!rRes.ok) return rRes;
        const gRes = reader.nextInt("tileG", TEXT_BOARD_SECTION, 0);
        if (!gRes.ok) return gRes;
        const bRes = reader.nextInt("tileB", TEXT_BOARD_SECTION, 0);
        if (!bRes.ok) return bRes;
        const typeRes = reader.nextInt("tileType", TEXT_BOARD_SECTION, 0);
        if (!typeRes.ok) return typeRes;

        const tileName = nameRes.value.trim();
        let lutIndex = 0;
        if (tileName !== "") {
          const existing = lutMap.get(tileName);
          if (existing !== undefined) {
            lutIndex = existing;
          } else {
            lutIndex = lut.length;
            lut.push(tileName);
            lutMap.set(tileName, lutIndex);
          }
        }

        const targetIndex = ((layer - 1) * sizeY + y) * sizeX + x;
        tileMatrix[targetIndex] = {
          lutIndex,
          r: rRes.value,
          g: gRes.value,
          b: bRes.value,
          tileType: typeRes.value,
        };
      }
    }
  }

  const bg = reader.nextLine("backgroundImage", TEXT_BOARD_SECTION);
  if (!bg.ok) return bg;
  const border = reader.nextLine("borderImage", TEXT_BOARD_SECTION);
  if (!border.ok) return border;
  const boardColorRaw = reader.nextInt("boardColor", TEXT_BOARD_SECTION, 0);
  if (!boardColorRaw.ok) return boardColorRaw;
  const borderColorRaw = reader.nextInt("borderColor", TEXT_BOARD_SECTION, 0);
  if (!borderColorRaw.ok) return borderColorRaw;
  const ambient = reader.nextInt("ambientPreset", TEXT_BOARD_SECTION, 0);
  if (!ambient.ok) return ambient;

  const north = reader.nextLine("northLink", TEXT_BOARD_SECTION);
  if (!north.ok) return north;
  const south = reader.nextLine("southLink", TEXT_BOARD_SECTION);
  if (!south.ok) return south;
  const east = reader.nextLine("eastLink", TEXT_BOARD_SECTION);
  if (!east.ok) return east;
  const west = reader.nextLine("westLink", TEXT_BOARD_SECTION);
  if (!west.ok) return west;

  const battleSkill = reader.nextInt("battleSkill", TEXT_BOARD_SECTION, 0);
  if (!battleSkill.ok) return battleSkill;
  const battleBackground = reader.nextLine("battleBackground", TEXT_BOARD_SECTION);
  if (!battleBackground.ok) return battleBackground;
  const allowBattles = reader.nextInt("allowBattles", TEXT_BOARD_SECTION, 0);
  if (!allowBattles.ok) return allowBattles;

  const constants: number[] = [];
  for (let k = 0; k < 10; k++) {
    const c = reader.nextInt(`constant[${k}]`, TEXT_BOARD_SECTION, 0);
    if (!c.ok) return c;
    constants.push(c.value);
  }
  constants.push(0); // 11th constant slot

  const music = reader.nextLine("backgroundMusic", TEXT_BOARD_SECTION);
  if (!music.ok) return music;

  const layerTitles: string[] = [""];
  for (let k = 1; k <= 8; k++) {
    const t = reader.nextLine(`layerTitle[${k}]`, TEXT_BOARD_SECTION);
    if (!t.ok) return t;
    layerTitles.push(t.value);
  }

  const programs: PreVectorProgram[] = [];
  for (let k = 0; k < 51; k++) {
    const file = reader.nextLine("program.file", TEXT_BOARD_SECTION);
    if (!file.ok) return file;
    const x = reader.nextInt("program.x", TEXT_BOARD_SECTION, 0);
    if (!x.ok) return x;
    const y = reader.nextInt("program.y", TEXT_BOARD_SECTION, 0);
    if (!y.ok) return y;
    const layer = reader.nextInt("program.layer", TEXT_BOARD_SECTION, 1);
    if (!layer.ok) return layer;
    const graphic = reader.nextLine("program.graphic", TEXT_BOARD_SECTION);
    if (!graphic.ok) return graphic;
    const activate = reader.nextInt("program.activate", TEXT_BOARD_SECTION, 0);
    if (!activate.ok) return activate;
    const initialVar = reader.nextLine("program.initialVar", TEXT_BOARD_SECTION);
    if (!initialVar.ok) return initialVar;
    const finalVar = reader.nextLine("program.finalVar", TEXT_BOARD_SECTION);
    if (!finalVar.ok) return finalVar;
    const initialValue = reader.nextLine("program.initialValue", TEXT_BOARD_SECTION);
    if (!initialValue.ok) return initialValue;
    const finalValue = reader.nextLine("program.finalValue", TEXT_BOARD_SECTION);
    if (!finalValue.ok) return finalValue;
    const activationType = reader.nextInt("program.activationType", TEXT_BOARD_SECTION, 0);
    if (!activationType.ok) return activationType;

    programs.push({
      file: file.value,
      x: x.value,
      y: y.value,
      layer: layer.value,
      graphic: graphic.value,
      activate: activate.value,
      initialVar: initialVar.value,
      finalVar: finalVar.value,
      initialValue: initialValue.value,
      finalValue: finalValue.value,
      activationType: activationType.value,
    });
  }

  interface RawSprite {
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
  }
  const rawSprites: RawSprite[] = [];
  for (let k = 0; k < 11; k++) {
    const file = reader.nextLine("sprite.file", TEXT_BOARD_SECTION);
    if (!file.ok) return file;
    const x = reader.nextInt("sprite.x", TEXT_BOARD_SECTION, 0);
    if (!x.ok) return x;
    const y = reader.nextInt("sprite.y", TEXT_BOARD_SECTION, 0);
    if (!y.ok) return y;
    const layer = reader.nextInt("sprite.layer", TEXT_BOARD_SECTION, 1);
    if (!layer.ok) return layer;
    const activate = reader.nextInt("sprite.activate", TEXT_BOARD_SECTION, 0);
    if (!activate.ok) return activate;
    const initialVar = reader.nextLine("sprite.initialVar", TEXT_BOARD_SECTION);
    if (!initialVar.ok) return initialVar;
    const finalVar = reader.nextLine("sprite.finalVar", TEXT_BOARD_SECTION);
    if (!finalVar.ok) return finalVar;
    const initialValue = reader.nextLine("sprite.initialValue", TEXT_BOARD_SECTION);
    if (!initialValue.ok) return initialValue;
    const finalValue = reader.nextLine("sprite.finalValue", TEXT_BOARD_SECTION);
    if (!finalValue.ok) return finalValue;
    const activationType = reader.nextInt("sprite.activationType", TEXT_BOARD_SECTION, 0);
    if (!activationType.ok) return activationType;

    rawSprites.push({
      file: file.value,
      x: x.value,
      y: y.value,
      layer: layer.value,
      activate: activate.value,
      initialVar: initialVar.value,
      finalVar: finalVar.value,
      initialValue: initialValue.value,
      finalValue: finalValue.value,
      activationType: activationType.value,
    });
  }

  const startX = reader.nextInt("startX", TEXT_BOARD_SECTION, 0);
  if (!startX.ok) return startX;
  const startY = reader.nextInt("startY", TEXT_BOARD_SECTION, 0);
  if (!startY.ok) return startY;
  const startLayer = reader.nextInt("startLayer", TEXT_BOARD_SECTION, 1);
  if (!startLayer.ok) return startLayer;

  const itemAct: string[] = [];
  for (let k = 0; k < 11; k++) {
    const act = reader.nextLine(`itemActivationPrg[${k}]`, TEXT_BOARD_SECTION);
    if (!act.ok) return act;
    itemAct.push(act.value);
  }

  const saveFlag = reader.nextInt("disableSaving", TEXT_BOARD_SECTION, 0);
  if (!saveFlag.ok) return saveFlag;

  const itemMt: string[] = [];
  for (let k = 0; k < 11; k++) {
    const mt = reader.nextLine(`itemMultitaskPrg[${k}]`, TEXT_BOARD_SECTION);
    if (!mt.ok) return mt;
    itemMt.push(mt.value);
  }

  const sprites: PreVectorSprite[] = rawSprites.map((s, idx) => ({
    ...s,
    activationPrg: itemAct[idx] ?? "",
    multitaskPrg: itemMt[idx] ?? "",
  }));

  let dayNight: PreVectorDayNight = { a: 0, b: 0, c: 0, text: "" };
  if (reader.hasMore()) {
    const a = reader.nextInt("dayNight.a", TEXT_BOARD_SECTION, 0);
    if (!a.ok) return a;
    const b = reader.nextInt("dayNight.b", TEXT_BOARD_SECTION, 0);
    if (!b.ok) return b;
    const c = reader.nextInt("dayNight.c", TEXT_BOARD_SECTION, 0);
    if (!c.ok) return c;
    const text = reader.nextLine("dayNight.text", TEXT_BOARD_SECTION);
    if (!text.ok) return text;
    dayNight = { a: a.value, b: b.value, c: c.value, text: text.value };
  }

  const finished = reader.finish(TEXT_BOARD_SECTION);
  if (!finished.ok) return finished;

  const preVectorBoard: PreVectorBoard = {
    magic: BOARD_MAGIC,
    major: major.value,
    minor: 2,
    registrationFlag: regFlag.value,
    registrationKey: regCode.value,
    sizeX,
    sizeY,
    sizeL,
    startX: startX.value,
    startY: startY.value,
    startLayer: startLayer.value,
    disableSaving: saveFlag.value,
    lut,
    tileMatrix,
    tileRuns: [],
    backgroundImage: bg.value,
    foregroundImage: "",
    borderImage: border.value,
    backgroundColour: unpackColorref(boardColorRaw.value),
    borderColour: unpackColorref(borderColorRaw.value),
    ambientPreset: ambient.value,
    links: {
      north: north.value,
      south: south.value,
      east: east.value,
      west: west.value,
    },
    battleSkill: battleSkill.value,
    battleBackground: battleBackground.value,
    allowBattles: allowBattles.value,
    dayNight,
    constants,
    backgroundMusic: music.value,
    layerTitles,
    programs,
    enterPrg: "",
    reserved: "",
    sprites,
    threads: [],
    coordType: 0,
    residue: new Uint8Array(0),
  };

  return convertPreVectorBoard(preVectorBoard);
}
