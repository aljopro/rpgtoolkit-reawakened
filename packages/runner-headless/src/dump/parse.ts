/**
 * One file → one outcome: parse it, skip it with a reason, or report a located
 * failure (epic 2 Done-when 1).
 *
 * Every reader call is `core`'s and never throws (AD-18): an `ok: false` from a
 * reader *is* the failure outcome, and the one throw this module guards is the
 * digest's — `canon` rejects a value a reader accepted, which fails that file
 * alone. The dispatch is `classify` (formats.ts); the digest is `digestModel`
 * / `digestRgba` (digest.ts).
 *
 * `runner-headless` is the Node host shell, so nothing here is subject to G2 —
 * but nothing here touches the file system either: bytes arrive from
 * `loadRoot` (fs.ts) as `PackageFile`s, so the whole module is pure and easy to
 * test.
 */

import {
  BinaryReader,
  decodeTexture,
  readAnimation,
  readBattleBackground,
  readBoard,
  readCharacter,
  readEnemy,
  readItem,
  readMainFile,
  readPreVectorBoard,
  readSpecialMove,
  readStatusEffect,
  readTileset,
  convertPreVectorBoard,
  type Board,
  type FormatError,
  type MainFile,
  type PackageFile,
  type Result,
} from "@tk-reawakened/core";
import { digestModel, digestRgba } from "./digest.ts";
import { boardLayout, classify, type DataFormatClass, type DataFormatId } from "./formats.ts";

/** The facts a parsed file contributes to the report. */
export interface ParsedModel {
  /** A readable one-line summary of the parsed model. */
  readonly summary: string;
  /** The FNV-1a 64-bit digest of the model, or of the decoded RGBA for an image. */
  readonly digest: string;
  /** Non-fatal warnings the reader collected. */
  readonly warnings: readonly string[];
}

/** What `dump` did with one file. */
export type FileOutcome =
  | ({ readonly status: "parsed"; readonly format: DataFormatId; readonly section: string } & ParsedModel)
  | { readonly status: "skipped"; readonly reason: string }
  | {
      readonly status: "failed";
      readonly format: DataFormatId;
      readonly section: string;
      readonly error: FormatError;
    };

/** A parsed non-image model with its digest and the reader's warnings. */
function modelOutcome(model: unknown, warnings: readonly string[], summary: string): Result<ParsedModel> {
  return { ok: true, value: { summary, digest: digestModel(model), warnings }, warnings: [] };
}

/** A decoded image, digested over its RGBA bytes. */
function imageOutcome(
  summary: string,
  rgba: Uint8Array,
  warnings: readonly string[],
): Result<ParsedModel> {
  return { ok: true, value: { summary, digest: digestRgba(rgba), warnings }, warnings: [] };
}

/** The extension a dispatch row was chosen by, lowercased, for a summary line. */
function extensionOf(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot < 0 ? "" : path.slice(dot + 1).toLowerCase();
}

/** The §2 main-file facts worth printing (§2 rows 3–43). */
function gamSummary(model: MainFile): string {
  return (
    `main file ${model.major}.${model.minor}, project "${model.projectPath}", ` +
    `title "${model.gameTitle}", resolution ${model.resolution}, ` +
    `startup ${model.startupPrg === "" ? "-" : model.startupPrg}, init board ${model.initBoard}, ` +
    `init char ${model.initChar}, ${model.plugins.length} plugin slots, ` +
    `${model.enemies.length} enemy slots, ${model.extKeys.length} extra keys`
  );
}

/** The §4 board facts: size, layers, and how much geometry the board carries (§4.2). */
function boardSummary(model: Board, layout: "vector" | "pre-vector"): string {
  return (
    `board ${model.major}.${model.minor}${layout === "pre-vector" ? " (pre-vector, converted to vectors)" : ""}, ` +
    `${model.sizeX}×${model.sizeY} tiles ×${model.sizeL} layers, coord type ${model.coordType}, ` +
    `${model.lut.length} LUT slots, ${model.tileMatrix.length} tiles, ` +
    `${model.vectors.length} vectors, ${model.programs.length} programs, ${model.sprites.length} sprites, ` +
    `${model.images.length} images, ${model.shadeLayers.length} shade layers, ${model.lights.length} lights, ` +
    `${model.threads.length} threads, ${model.constants.length} constants`
  );
}

/** Parse one **data-format** file with the reader its dispatch row names (G7). */
function parseData(cls: DataFormatClass, file: PackageFile): Result<ParsedModel> {
  const { bytes, path } = file;
  switch (cls.format) {
    case "gam": {
      const read = readMainFile(new BinaryReader(bytes, path));
      return read.ok ? modelOutcome(read.value, read.warnings, gamSummary(read.value)) : read;
    }
    case "board": {
      // §4.1 version dispatch: peek the header, then pick §4.2 or the §4.8
      // pre-vector reader (and convert its model, so one board model comes out).
      const header = new BinaryReader(bytes, path).header();
      if (header.ok && boardLayout(header.value.minor) === "pre-vector") {
        const pre = readPreVectorBoard(new BinaryReader(bytes, path));
        if (!pre.ok) return pre;
        const converted = convertPreVectorBoard(pre.value);
        if (!converted.ok) return converted;
        return modelOutcome(
          converted.value,
          [...pre.warnings, ...converted.warnings],
          boardSummary(converted.value, "pre-vector"),
        );
      }
      const read = readBoard(new BinaryReader(bytes, path));
      return read.ok ? modelOutcome(read.value, read.warnings, boardSummary(read.value, "vector")) : read;
    }
    case "tileset": {
      const read = readTileset(bytes, path);
      if (!read.ok) return read;
      const { version, detail, tiles, residue } = read.value;
      return modelOutcome(
        read.value,
        read.warnings,
        `tileset version ${version}, detail ${detail.code} (${detail.size}×${detail.size}, ` +
          `${detail.bytesPerPixel} bytes/pixel${detail.isometric ? ", isometric" : ""}), ` +
          `${tiles.length} tiles, ${residue.length} trailing bytes`,
      );
    }
    case "animation": {
      const read = readAnimation(new BinaryReader(bytes, path));
      if (!read.ok) return read;
      const model = read.value;
      const filled = model.frames.filter((frame) => frame.image !== "").length;
      return modelOutcome(
        model,
        read.warnings,
        `animation ${model.major}.${model.minor}, ${model.width}×${model.height}, ` +
          `${model.frames.length} frame slots (${filled} with an image), delay ${model.delay}s`,
      );
    }
    case "character": {
      const read = readCharacter(new BinaryReader(bytes, path));
      if (!read.ok) return read;
      const model = read.value;
      return modelOutcome(
        model,
        read.warnings,
        `character ${model.major}.${model.minor} "${model.name}", hp ${model.stats.hp}/${model.stats.maxHp}, ` +
          `smp ${model.stats.smp}/${model.stats.maxSmp}, level ${model.stats.level}, ` +
          `${model.specialMoves.length} special-move slots, ` +
          `${model.movementAnimations?.length ?? 0} movement animations, residue ${model.residue.length} bytes`,
      );
    }
    case "item": {
      const read = readItem(new BinaryReader(bytes, path));
      if (!read.ok) return read;
      const model = read.value;
      return modelOutcome(
        model,
        read.warnings,
        `item ${model.major}.${model.minor} "${model.name}", buy ${model.buyPrice} / sell ${model.sellPrice}, ` +
          `${model.allowedCharacters.length} allowed-character slots, ` +
          `${model.movementAnimations?.length ?? 0} movement animations, residue ${model.residue.length} bytes`,
      );
    }
    case "enemy": {
      const read = readEnemy(new BinaryReader(bytes, path));
      if (!read.ok) return read;
      const model = read.value;
      return modelOutcome(
        model,
        read.warnings,
        `enemy ${model.major}.${model.minor} "${model.name}", hp ${model.hp}, smp ${model.smp}, ` +
          `fp ${model.fp}, dp ${model.dp}, ${model.specialMoves.length} special moves, ` +
          `${model.stances.length} stances, residue ${model.residue.length} bytes`,
      );
    }
    case "special-move": {
      const read = readSpecialMove(new BinaryReader(bytes, path));
      return read.ok
        ? modelOutcome(
            read.value,
            read.warnings,
            `special move "${read.value.name}", damage ${read.value.damage}, smp cost ${read.value.smpCost}, ` +
              `program ${read.value.program === "" ? "-" : read.value.program}`,
          )
        : read;
    }
    case "status-effect": {
      const read = readStatusEffect(new BinaryReader(bytes, path));
      return read.ok
        ? modelOutcome(
            read.value,
            read.warnings,
            `status effect "${read.value.name}", ${read.value.rounds} rounds, ` +
              `hp ${read.value.hpPerRound}/round, smp ${read.value.smpPerRound}/round, ` +
              `program ${read.value.program === "" ? "-" : read.value.program}`,
          )
        : read;
    }
    case "battle-background": {
      const read = readBattleBackground(new BinaryReader(bytes, path));
      return read.ok
        ? modelOutcome(
            read.value,
            read.warnings,
            `battle background image "${read.value.image}", music "${read.value.music}", ` +
              `${read.value.readySound === "" ? "-" : read.value.readySound} ready cue`,
          )
        : read;
    }
    case "image": {
      // §10: `decodeTexture` matches the PNG/JPEG signature and returns straight RGBA.
      const read = decodeTexture(bytes, path);
      if (!read.ok) return read;
      const { w, h, rgba } = read.value;
      return imageOutcome(
        `image ${extensionOf(path)} ${w}×${h} (${rgba.length} RGBA bytes)`,
        rgba,
        read.warnings,
      );
    }
  }
}

/**
 * Decide one file's outcome: parse it (a data format), skip it with a reason
 * (text, media, a plugin, or a format with no reader yet), or fail with the
 * reader's located `FormatError` (a data format that would not parse).
 *
 * A reader never throws (AD-18), so the only throw here is the digest: `canon`
 * rejects a value a reader accepted — a NaN delay in a `.anm`, say. That is
 * this one file's failure, never the whole dump's.
 */
export function parseFile(file: PackageFile): FileOutcome {
  const cls = classify(file.path);
  if (cls.kind === "skip") {
    const detail = cls.describe?.(file.bytes);
    return { status: "skipped", reason: detail === undefined ? cls.reason : `${cls.reason} — ${detail}` };
  }
  try {
    const parsed = parseData(cls, file);
    if (!parsed.ok) {
      return { status: "failed", format: cls.format, section: cls.section, error: parsed.error };
    }
    return { status: "parsed", format: cls.format, section: cls.section, ...parsed.value };
  } catch (cause) {
    return {
      status: "failed",
      format: cls.format,
      section: cls.section,
      error: {
        path: file.path,
        offset: 0,
        section: cls.section,
        message: `the parsed model could not be digested: ${cause instanceof Error ? cause.message : String(cause)}`,
      },
    };
  }
}
