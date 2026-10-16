/**
 * What `dump` does with a file, by extension (G7).
 *
 * The **data** side is not a table here any more: it is `core`'s format
 * registry (AD-31). Every extension a core decoder claims is a file this tool
 * parses, and the decoder itself names the reader family (`CoreFormatId`) and
 * the relevant `docs/spec/` page anchor it implements, so the dispatch lives in one
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
  /** The `docs/spec/` page anchor the reader implements (G7). */
  readonly section: string;
}

/** A file `dump` reports as skipped, with the reason why. */
export interface SkipFormatClass {
  readonly kind: "skip";
  /** Why this tool does not parse it, naming the `docs/spec/` page anchor. */
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
 * `.prg` and `.sav` rows are skipped *by design*: a later epic parses docs/spec/engine/rpgcode-language.md
 * programs (the `.prg` row still reports whether the file is source text or
 * docs/spec/engine/rpgcode-language.md's compiled form), and docs/spec/formats/save-game.md#layout-minor-4 saves are outside this tool's scope. Reporting
 * files of either extension as failures would fail games that ship them.
 */
const SKIP_TABLE: Readonly<Record<string, SkipFormatClass>> = {
  // docs/spec/engine/rpgcode-language.md — RPGCode programs are source text, or a compiled binary whose **first
  // byte is `00`** (docs/spec/formats/rpgcode-program.md#compiled-form, R-12).
  // A later epic parses either form; here the size and line count — or the fact
  // that it is compiled — are reported so a dump still shows what is there.
  prg: skip(
    "RPGCode program (docs/spec/engine/rpgcode-language.md#programs-and-encodings): parsed by a later epic, reported here as text or compiled",
    (bytes) =>
      bytes[0] === 0x00
        ? `compiled (docs/spec/formats/rpgcode-program.md#compiled-form), ${bytes.length} bytes`
        : `${bytes.length} bytes, ${countLines(bytes)} lines`,
  ),
  // A format the spec describes but no `core` reader implements yet — skipped, not failed.
  sav: skip("saved game (docs/spec/formats/save-game.md#layout-minor-4): out of scope for this epic"),
  // docs/spec/formats/images.md — media this tool does not decode.
  mid: skip("MIDI music (docs/spec/engine/display-input-audio.md#audio): audio, not a data format"),
  midi: skip("MIDI music (docs/spec/engine/display-input-audio.md#audio): audio, not a data format"),
  wav: skip("waveform audio (docs/spec/engine/display-input-audio.md#audio): audio, not a data format"),
  mp3: skip("MP3 audio (docs/spec/engine/display-input-audio.md#audio): audio, not a data format"),
  ogg: skip("Ogg audio (docs/spec/engine/display-input-audio.md#audio): audio, not a data format"),
  avi: skip("AVI video (docs/spec/engine/display-input-audio.md#video): video, not a data format"),
  ttf: skip("TrueType font (docs/spec/engine/display-input-audio.md#fonts): a font, not a data format"),
  otf: skip("OpenType font (docs/spec/engine/display-input-audio.md#fonts): a font, not a data format"),
  txt: skip("plain text (not a game data format)"),
  // docs/spec/engine/plugins-and-battle.md#plugin-roles — plugin libraries.
  dll: skip("plugin library (docs/spec/engine/plugins-and-battle.md#plugin-roles): opaque binary, never read"),
  so: skip("plugin library (docs/spec/engine/plugins-and-battle.md#plugin-roles): opaque binary, never read"),
  dylib: skip("plugin library (docs/spec/engine/plugins-and-battle.md#plugin-roles): opaque binary, never read"),
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
