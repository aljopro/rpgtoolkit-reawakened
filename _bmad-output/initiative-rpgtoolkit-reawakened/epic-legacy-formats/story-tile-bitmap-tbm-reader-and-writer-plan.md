---
title: 'Tile bitmap (.tbm) reader and writer'
type: 'feature'
ticket: '25'
created: '2026-10-15'
status: built
baseline_revision: '0fd79bfc7178d9254cb42d082268abe705482af4'
route: 'full'
route_source: 'auto'
risk: 'low'
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/spec/formats/tiles.md', '{project-root}/docs/spec/formats/README.md', '{project-root}/docs/format-spec.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/discovery/docs-spec-reconciliation.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless the human renegotiates">

## Intent

**Problem:** `.tbm` is the one current Toolkit 3 data format no entry owned. `docs/spec/formats/tiles.md#tile-bitmap-tbm` and `docs/format-spec.md` §3.6 both describe it, `core` has no reader, and `pnpm dump` reports every `.tbm` as skipped (`packages/runner-headless/src/dump/formats.ts:86`). Tile bitmaps are what multi-tile sprite frames, cursors and converted battle backgrounds point to: `.anm` frames can name a `.tbm` (§7.1), a text `.bkg` converts its 19 × 11 grid to one (§8.3, §15.9), and a text `.ene` synthesises a rest `.tbm` (§6.3, §15.6). The two reconciliation findings that touch it (R-14, and the TK2 readers that will build one) need a model and a writer to exist.

**Approach:** Add `packages/core/src/formats/tile-bitmap/` with a model, a reader and a writer for `TK3 TILEBITMAP`, built on the binary primitives of entry 1. The model keeps width and height as stored, **every** stored cell including the padding row and column, each cell's tile reference verbatim and its three tint values, and any trailing bytes as residue, so an unmodified file writes back byte for byte (§1.7). Register it in the format registry (AD-31) as a core decoder, move the dump's `.tbm` row from skipped to parsed, and add a pure helper that reads a cell by (x, y) so no caller re-derives the x-outer order.

## Boundaries & Constraints

**Always:** Implement from `docs/spec/formats/tiles.md#tile-bitmap-tbm` and `docs/format-spec.md` §3.6, and cite both (ADR 0007, entry 1.13, fixes the citation form; this entry waits on it). Return a located `FormatError` (path, offset, section, message) and never throw on bad input. Follow §1.2's upper-bound rule for `width` and `height`: `n` means `n + 1` stored entries, `-1` means none, any other negative is an error, and the count is checked against the bytes that remain before anything is allocated. Keep `core` free of DOM, Node, I/O and timers (G2) and keep the golden and the dump gate unchanged (G5). Reuse `BinaryReader`, `BinaryWriter`, `Result` and `FormatError`; add no runtime dependency. Test inputs must not come from the writer.

**Never:** Interpret or resolve a tile reference (resolution is the resolver's, §1.5); keep it as written. Drop, clamp or rewrite the padding row and column, or any tint value. Draw, composite or shade anything (board-rendering owns §4.5). Change `golden/legacy-corpus.json`. Commit a game from the fetched corpus. Open `../rpgtoolkit` (G7).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Current file | `docs/spec/examples/versions/tile-bitmap/tilebitmap.tbm` (89 bytes, width 2, height 1) | 6 cells, x outer, `village.tst8`, empty, `village.tst9`, empty, empty, empty; 0 residue; no warning | — |
| Padded grid | `docs/spec/examples/game/Game/Example/Bitmap/house.tbm` (135 bytes, width 2, height 2) | 9 cells, 4 drawn (x < 2, y < 2), 5 padding; 0 residue | — |
| Round trip | Any parsed file | `write(read(bytes))` equals `bytes` | — |
| Width 0 | `width = 0`, `height = 0` | One stored cell, none drawn | — |
| No cells | `width = -1` or `height = -1` | Zero cells; the file ends after the two `i16` | — |
| Bad bound | `width < -1` or `height < -1` | Refused | Located error at the field's offset, section `docs/spec/formats/tiles.md#tile-bitmap-tbm` |
| Huge bound | `width = 32767`, `height = 32767`, few bytes left | Refused before allocating | Located error naming the bound and the bytes that remain |
| Truncated | File ends inside a cell | Refused | Located error at the cell's first byte |
| Wrong magic | First bytes are not `TK3 TILEBITMAP` | Refused | Located error at offset 0 |
| Other version | `major` or `minor` other than 3 and 0 | Read as the same layout and kept | One warning (docs/spec says both are ignored) |
| Out-of-range tint | A tint value outside −255…255 | Kept verbatim | One warning per file |
| Trailing bytes | Bytes after the last cell | Kept as residue | One warning (§1.7) |
| Writer, inconsistent model | `cells.length` is not `(width + 1) × (height + 1)` | Refused | Located error naming both numbers |
| Writer, unencodable string | A tile reference that cannot encode in Windows-1252 | Refused | Located error |

</frozen-after-approval>

## Code Map

- `docs/spec/formats/tiles.md:78-95` — the layout: header `TK3 TILEBITMAP`, `short` major and minor ("3, 0; ignored"), `short` width and height, then `(width + 1) × (height + 1)` cells, x outer and y inner, each a tile reference `string` and three `short` tints; only x < width and y < height are drawn, and "the extra row and column must still be written and read".
- `docs/format-spec.md:255-269` — §3.6 states the same layout with the shade range −255…+255; `:56` states major 3 and minor 0; `:42-44` §1.2 is the upper-bound rule; `:106-108` §1.7 residue.
- `docs/spec/formats/README.md:27-52` — primitive encoding (`short` is signed 16-bit little-endian, `string` is NUL-terminated and has no length prefix) and the header rule.
- `docs/spec/examples/versions/tile-bitmap/tilebitmap.tbm` (89 bytes) and `docs/spec/examples/game/Game/Example/Bitmap/{house,forest}.tbm` (135 and 89 bytes) — committed, authored under G7 and parsed to the last byte by the independent reader in `docs/spec/tools/rpgtk_formats.py` (`parse_tbm`, `:345-350`). Their annotated listings are `docs/spec/examples/listings/house.tbm.txt` and `…/versions/tile-bitmap/tilebitmap.tbm.txt`.
- `packages/core/src/formats/animation/{model,reader,writer,index}.ts` — the house shape to copy: a constants-and-model file with the section string, a reader returning `Result`, a writer, and an `index.ts` that re-exports them; the model keeps residue so a write is byte-identical.
- `packages/core/src/formats/binary/{reader,writer}.ts` — `BinaryReader` (`i16`, `str`, `header`, `readBytes`, `offset`, `remaining`) and `BinaryWriter` (`i16`, `str`, `writeBytes`, `toBytes`).
- `packages/core/src/formats/result.ts:11-38` — `FormatError`, `Result`, `ok`, `err`.
- `packages/core/src/formats/registry/core-decoders.ts:92-94, 124-152` — `magicIs`, the `CoreDecoders` interface and `CORE_DECODERS`. `.tbm` is **absent** from both today. Add an entry with id `tile-bitmap`, extension `tbm`, `detect: magicIs(…)`; the existing magics do not overlap `TK3 TILEBITMAP`.
- `packages/core/src/formats/index.ts` — export the new folder.
- `packages/runner-headless/src/dump/formats.ts:66-69, 86` — the comment and the `tbm: skip(…)` row to remove; `classify` (`:128-137`) then routes `.tbm` to the registry on its own. `packages/runner-headless/src/dump/parse.ts` — one `switch (format)` case per core id (`:111-218`); add `tile-bitmap` with a one-line summary (width × height, stored and drawn cell counts).
- `packages/core/test/format-registry.test.ts:152-208` — the `CORE_HEADERS` and `READERS` tables that enumerate every core id; add a row each.
- `packages/core/test/format-animation.test.ts` — the house test shape (`unwrap`, `fixture`, located-error assertions).
- `golden/legacy-corpus.json` and `fixtures/legacy/{demo,Basic}/Bitmap/` — no `.tbm` in either (the only bitmaps are `bkg.jpg`, `layout.png`, `mwin.jpg`), so this entry changes no digest.
- `CONTRIBUTING.md:114` — the dump paragraph lists the readers by extension; add `.tbm`.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/core/src/formats/tile-bitmap/model.ts` — `TILE_BITMAP_MAGIC`, `TILE_BITMAP_SECTION`, `TileBitmapCell`, `TileBitmap` (magic, major, minor, width, height, cells in file order, residue), and the pure `tileBitmapCell(bitmap, x, y)` helper — one place for the x-outer order
- [ ] `packages/core/src/formats/tile-bitmap/reader.ts` — `readTileBitmap`, with the §1.2 bound check against the remaining bytes and the version, tint-range and residue warnings
- [ ] `packages/core/src/formats/tile-bitmap/writer.ts` — `writeTileBitmap`, refusing a model whose cell count disagrees with its bounds
- [ ] `packages/core/src/formats/tile-bitmap/index.ts` and `packages/core/src/formats/index.ts` — export
- [ ] `packages/core/src/formats/registry/core-decoders.ts` — the `tile-bitmap` core decoder
- [ ] `packages/runner-headless/src/dump/formats.ts` and `parse.ts` — drop the skip row and comment; parse `.tbm` with a summary line
- [ ] `packages/core/test/format-tile-bitmap.test.ts` — the matrix above; the two committed examples and hand-built byte arrays as inputs
- [ ] `packages/core/test/format-registry.test.ts` — add the `tile-bitmap` row to both tables
- [ ] `CONTRIBUTING.md` — add `.tbm` to the dump paragraph

**Acceptance Criteria:**
- Given `tilebitmap.tbm`, `house.tbm` and `forest.tbm`, when read, then each parses to the last byte with no residue and no warning, and `write(read(bytes))` equals the bytes.
- Given `house.tbm`, when its cells are read through `tileBitmapCell`, then (0,0) is `village.tst9`, (0,1) is `village.tst8`, (0,2) is the empty padding cell and (1,1) is `village.tst10`, matching the listing.
- Given `width` or `height` below −1, or a bound that needs more bytes than remain, when read, then the result is a located error and nothing is allocated for the claimed size.
- Given `width = -1`, when read, then the model has zero cells and writes back to the same bytes.
- Given a tint outside −255…255 or a version other than 3.0, when read, then the value is kept and one warning is reported.
- Given a file with trailing bytes, when read and written, then the bytes come back unchanged and one residue warning was reported.
- Given `pnpm dump docs/spec/examples/game`, when run, then both `.tbm` files are listed as parsed, not skipped, and the command exits 0; `pnpm dump:check` still matches `golden/legacy-corpus.json` untouched.
- Given the three committed examples, when `python3 docs/spec/tools/rpgtk_formats.py dump <file>` and the new reader are compared on width, height and each cell's tile and tint, then they agree (a throwaway check, not a committed test).

## Implementation Notes

- **Two docs, one layout.** `docs/spec` and §3.6 agree on every field and on the drawn region. They word the bounds differently: §3.6 says "inclusive bounds, like every other upper bound (§1.2)", docs/spec says "width in tiles" and then stores `(width + 1) × (height + 1)` cells. The arithmetic is identical (a stored 2 is 3 cells and 2 drawn), so the reader follows §1.2, including the `-1` means none rule that neither tiles page spells out for this format. That reading is an inference from §1.2, not a quoted rule: <!-- OWNER: width -1 — chose §1.2's "-1 means none" over refusing every negative, because every other upper-bound count in the spec behaves that way and no sample has a negative. Alternative: refuse any width or height below 0. Change here if you prefer that. -->
- **The editor's 1..40 is not a file rule.** docs/spec says the editor allows 1 to 40 tiles. The reader does not enforce it, since the file layout has no such limit and refusing a file the layout allows would reject something an author could have produced by another tool. The bytes-remaining check is the only size bound.
- **Warnings, not errors, for the unproven.** Version other than 3.0 and tints outside −255…255 are warnings that keep the value. The spec says the version is ignored and gives the shade range only as a description of use, and no sample breaks either, so refusing them would invent a rule. <!-- OWNER: tint range and version — alternative is an error for either. Chosen: keep and warn, in line with §1.7's "do not silently change a file the author never edited". -->
- **What 2.26 adds.** The dump gate over `docs/spec/examples` is 2.26's; it records the three `.tbm` digests. This entry only makes sure the dump parses them.
- **Citation form.** Sections are cited as `docs/spec/formats/tiles.md#tile-bitmap-tbm` with `format-spec §3.6` alongside until 3.28, which is why this entry waits on 1.13's ADR.
- **Tile reference handling.** A tile reference is a string, `name.tstN`, `name.isoN`, `name.gph`, `name.tan` or empty (`docs/spec/formats/README.md:62-67`). It is stored verbatim and an empty string is an empty cell; legacy `\` separators stay as written (the resolver folds, §1.5).

## Plan Change Log

- 2026-10-15 — initial plan, drafted from the entry, `docs/spec/formats/tiles.md`, §3.6, the committed examples and the landed registry and dump code. Two OWNER markers (width −1, tint range and version) record the reader's tolerance choices.

## Design Notes

Order of work: model and reader against the two small committed files first, since their byte offsets are listed in the annotated listings; then the writer and the round trip; then the registry and the dump, then the table rows in `format-registry.test.ts`. Run `pnpm dump:check` last: its being unchanged is the proof that the new reader did not move a digest in the 3.1 corpus.

## Verification

**Commands:**
- `pnpm typecheck && pnpm test && pnpm lint && pnpm graph && pnpm provenance && pnpm licence` — expected: all pass.
- `pnpm fixtures:fetch && pnpm test:strict && pnpm dump:check` — expected: pass, with `git diff golden/` empty.
- `pnpm dump docs/spec/examples/game` — expected: exit 0, the two `.tbm` files parsed, no `.tbm` skipped.
- `python3 docs/spec/tools/rpgtk_formats.py dump <file>` for each of the three `.tbm` examples, compared with the reader's output — expected: same width, height and cell contents (throwaway; the tool needs only the standard library).

**Manual checks:**
- Read the reader beside `docs/spec/formats/tiles.md#tile-bitmap-tbm` and confirm the loop order is x outer, y inner and the padding row and column are kept.
