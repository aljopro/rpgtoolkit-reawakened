/**
 * What `dump` does with a file, by extension (G7).
 *
 * The **data** side is not a table here any more: it is `core`'s format
 * registry (AD-31). Every extension a core decoder claims is a file this tool
 * parses, and the decoder itself names the reader family (`CoreFormatId`) and
 * the `docs/format-spec.md` section it implements, so the dispatch lives in one
 * place. What stays here is the **skip** side: a file the spec describes but
 * this tool deliberately does not read here (text, media, plugins, and the
 * formats no core reader has been written for yet). A skip is never a failure.
 */

import { CORE_DECODERS, CORE_REGISTRY, type AssetDecoder, type CoreFormatId } from "@tk-reawakened/core";

/** The data formats `dump` parses, one id per reader family: the core decoder ids. */
export type DataFormatId = CoreFormatId;

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
 * Extension (lowercase, no dot) → why `dump` skips it.
 *
 * A file with no extension, or one not listed, is skipped as unrecognised. The
 * `.prg`, `.gph`, `.tan`, `.tbm`, `.sav`, `.bmp` and `.gif` rows are skipped
 * *by design*: §9 programs are text for a later epic, and §3.2/§3.5/§3.6/§11
 * plus §10's BMP and GIF have no core decoder yet, so reporting them as
 * failures would fail every game that ships one.
 */
const SKIP_TABLE: Readonly<Record<string, SkipFormatClass>> = {
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
 * The data-format class of a core decoder, or `undefined` for a decoder whose
 * id is not a core format.
 *
 * `classify` and `parse.ts` know only the core formats, so a decoder a host
 * registered with an id of its own has no reader here: its claims fall back to
 * the skip table rather than becoming an id `parse.ts` cannot decode. The
 * assertion below is sound because the id is checked against `CORE_DECODERS`'s
 * own keys first.
 */
function dataClass(decoder: AssetDecoder): DataFormatClass | undefined {
  if (!Object.hasOwn(CORE_DECODERS, decoder.id)) {
    return undefined;
  }
  return { kind: "data", format: decoder.id as DataFormatId, section: decoder.section };
}

/**
 * The dispatch for `path`: the data format to parse, or the reason to skip it.
 *
 * The extension is the last `.`-separated segment, lowercased, so the legacy
 * uppercase names (`.MID`, `.BMP`) land on the same row as their lowercase
 * form. A core decoder for the extension wins; otherwise the skip table decides.
 */
export function classify(path: string): FileClass {
  const dot = path.lastIndexOf(".");
  if (dot < 0 || dot === path.length - 1) {
    return UNRECOGNISED;
  }
  const extension = path.slice(dot + 1).toLowerCase();
  const decoder = CORE_REGISTRY.byExtension(extension);
  const data = decoder === undefined ? undefined : dataClass(decoder);
  return data ?? SKIP_TABLE[extension] ?? UNRECOGNISED;
}
