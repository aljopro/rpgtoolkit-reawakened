/**
 * The extension → reader dispatch table `dump` walks a project with (G7).
 *
 * Every row names the `docs/format-spec.md` section the reader behind it
 * implements, so a summary or a failure can always be traced back to the
 * document. A row is either a **data format** — a file this tool parses, whose
 * failure to parse is a failure — or a **skip**: a file the spec describes but
 * this tool deliberately does not read here (text, media, plugins, and the
 * formats no reader has been written for yet). A skip is never a failure.
 */

import { BOARD_VECTOR_MINOR, PRE_VECTOR_MINOR_MAX, PRE_VECTOR_MINOR_MIN } from "@rpgtoolkit/core";

/** The data formats `dump` parses, one id per reader family. */
export type DataFormatId =
  | "gam"
  | "board"
  | "tileset"
  | "animation"
  | "character"
  | "item"
  | "enemy"
  | "battle-background"
  | "special-move"
  | "status-effect"
  | "image";

/** A file `dump` parses; a parse failure is a failure. */
export interface DataFormatClass {
  readonly kind: "data";
  readonly format: DataFormatId;
  /** The format-spec section the reader implements (G7). */
  readonly section: string;
}

/** A file `dump` reports as skipped, with the reason why. */
export interface SkipFormatClass {
  readonly kind: "skip";
  /** Why this tool does not parse it, naming the format-spec section. */
  readonly reason: string;
  /** Extra one-line detail computed from the bytes, e.g. a `.prg` line count. */
  readonly describe?: (bytes: Uint8Array) => string;
}

/** What `dump` does with one file, decided by its extension alone. */
export type FileClass = DataFormatClass | SkipFormatClass;

/** Count the LF-delimited lines of a byte span, counting a trailing partial line. */
export function countLines(bytes: Uint8Array): number {
  let lines = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    if (bytes[i] === 0x0a) {
      lines += 1;
    }
  }
  if (bytes.length > 0 && bytes[bytes.length - 1] !== 0x0a) {
    lines += 1;
  }
  return lines;
}

/** A skipped media or plugin file: the reason is fixed, the detail comes from the bytes. */
function skip(reason: string, describe?: (bytes: Uint8Array) => string): SkipFormatClass {
  return describe === undefined ? { kind: "skip", reason } : { kind: "skip", reason, describe };
}

/** The reason a file with no dispatch row is skipped. */
const UNRECOGNISED = skip(
  "unrecognised extension: no legacy data format here is read under this extension",
);

/**
 * Extension (lowercase, no dot) → what to do with it.
 *
 * A file with no extension, or one not listed, is skipped as unrecognised. The
 * `.prg`, `.gph`, `.tan`, `.tbm`, `.sav`, `.bmp` and `.gif` rows are skipped
 * *by design*: §9 programs are text for a later epic, and §3.2/§3.5/§3.6/§11
 * plus §10's BMP and GIF have no reader in `core` yet, so reporting them as
 * failures would fail every game that ships one.
 */
const TABLE: Readonly<Record<string, FileClass>> = {
  // §2 — the main game file.
  gam: { kind: "data", format: "gam", section: "format-spec §2" },
  // §4 — boards; the reader itself dispatches §4.1's minors (§4.2 vector, §4.8 pre-vector).
  brd: { kind: "data", format: "board", section: "format-spec §4" },
  // §3.1 — tilesets; `.iso` is the same layout, its tiles packed per §3.3.
  tst: { kind: "data", format: "tileset", section: "format-spec §3.1" },
  iso: { kind: "data", format: "tileset", section: "format-spec §3.1" },
  // §7.1 — animations.
  anm: { kind: "data", format: "animation", section: "format-spec §7.1" },
  // §6.1–§6.3 — actors.
  tem: { kind: "data", format: "character", section: "format-spec §6.1" },
  itm: { kind: "data", format: "item", section: "format-spec §6.2" },
  ene: { kind: "data", format: "enemy", section: "format-spec §6.3" },
  // §8.1–§8.3 — battle data.
  spc: { kind: "data", format: "special-move", section: "format-spec §8.1" },
  ste: { kind: "data", format: "status-effect", section: "format-spec §8.2" },
  bkg: { kind: "data", format: "battle-background", section: "format-spec §8.3" },
  // §10 — the images `decodeTexture` matches by signature: PNG and JPEG.
  png: { kind: "data", format: "image", section: "format-spec §10" },
  jpg: { kind: "data", format: "image", section: "format-spec §10" },
  jpeg: { kind: "data", format: "image", section: "format-spec §10" },
  // §10 also lists BMP and GIF, but `core` has no decoder for either, so they
  // are skipped like the other formats with no reader — never a failure.
  bmp: skip("BMP image (format-spec §10): no decoder in core yet"),
  gif: skip("GIF image (format-spec §10): no decoder in core yet"),

  // §9 — RPGCode programs are text; a later epic parses them. Size and line count
  // are reported so a dump still shows what is there.
  prg: skip(
    "RPGCode text program (format-spec §9): parsed by a later epic, reported here as text",
    (bytes) => `${bytes.length} bytes, ${countLines(bytes)} lines`,
  ),
  // Formats the spec describes but no `core` reader implements yet — skipped, not failed.
  gph: skip("single-column tile text file (format-spec §3.2): no reader in core yet"),
  tan: skip("animated tile (format-spec §3.5): no reader in core yet"),
  tbm: skip("tile bitmap (format-spec §3.6): no reader in core yet"),
  sav: skip("saved game (format-spec §11): out of scope for this epic"),
  // §10 — media this tool does not decode.
  mid: skip("MIDI music (format-spec §10): audio, not a data format"),
  midi: skip("MIDI music (format-spec §10): audio, not a data format"),
  wav: skip("waveform audio (format-spec §10): audio, not a data format"),
  mp3: skip("MP3 audio (format-spec §10): audio, not a data format"),
  ogg: skip("Ogg audio (format-spec §10): audio, not a data format"),
  avi: skip("AVI video (format-spec §10): video, not a data format"),
  ttf: skip("TrueType font (format-spec §10): a font, not a data format"),
  otf: skip("OpenType font (format-spec §10): a font, not a data format"),
  txt: skip("plain text (not a game data format)"),
  // §12 — plugin libraries.
  dll: skip("plugin library (format-spec §12): opaque binary, never read"),
  so: skip("plugin library (format-spec §12): opaque binary, never read"),
  dylib: skip("plugin library (format-spec §12): opaque binary, never read"),
};

/**
 * The dispatch for `path`: the data format to parse, or the reason to skip it.
 *
 * The extension is the last `.`-separated segment, lowercased, so the legacy
 * uppercase names (`.MID`, `.BMP`) land on the same row as their lowercase form.
 */
export function classify(path: string): FileClass {
  const dot = path.lastIndexOf(".");
  if (dot < 0 || dot === path.length - 1) {
    return UNRECOGNISED;
  }
  const extension = path.slice(dot + 1).toLowerCase();
  return TABLE[extension] ?? UNRECOGNISED;
}

/** How a `.brd` is read, from its stored minor version (format-spec §4.1). */
export type BoardLayout = "vector" | "pre-vector" | "obsolete";

/**
 * Which §4.1 branch a board minor takes, from `core`'s own thresholds: the §4.2
 * vector layout (`BOARD_VECTOR_MINOR` and above), the §4.8 pre-vector layout
 * (`PRE_VECTOR_MINOR_MIN`…`PRE_VECTOR_MINOR_MAX`), or one below those, which no
 * reader here accepts and `readBoard` refuses as obsolete.
 */
export function boardLayout(minor: number): BoardLayout {
  if (minor >= BOARD_VECTOR_MINOR) {
    return "vector";
  }
  if (minor >= PRE_VECTOR_MINOR_MIN && minor <= PRE_VECTOR_MINOR_MAX) {
    return "pre-vector";
  }
  return "obsolete";
}
