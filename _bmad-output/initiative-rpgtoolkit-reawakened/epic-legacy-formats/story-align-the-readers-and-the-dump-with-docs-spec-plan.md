---
title: 'Align the readers and the dump with docs/spec'
type: 'feature'
ticket: '24'
created: '2026-10-15'
status: 'ready-for-dev'
baseline_revision: '43189ac35038e110f4265fd4e8e93342b575dedf'
route: 'full'
route_source: 'auto'
risk: 'medium'
context: ['{project-root}/docs/guardrails.md', '{project-root}/CLAUDE.md', '{project-root}/docs/spec/formats/README.md', '{project-root}/docs/spec/formats/tiles.md', '{project-root}/docs/spec/formats/legacy/older-binary-versions.md', '{project-root}/docs/spec/formats/packaging-and-paths.md', '{project-root}/docs/spec/formats/rpgcode-program.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/discovery/docs-spec-reconciliation.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless the human renegotiates">

## Intent

**Problem:** Entry 2.23 settled the format conflicts (R-01 to R-16, R-25, R-27) and moved §1–§14 into `docs/spec/formats/`, but it changed documentation only. Six landed code paths still follow the pre-ruling behaviour, so the code and the normative spec disagree:

1. `packages/core/src/formats/tileset/vga-palette.ts:26-96` ships the standard IBM VGA mode-13h table. `docs/spec/formats/tiles.md#dos-palette` (line 98) rules that the reader must ship exactly `docs/spec/formats/dos-palette.json` instead: the two tables differ on **236 of 256 entries** (`docs-spec-reconciliation.md` R-01).
2. `packages/core/src/formats/board/pre-vector-convert.ts:281-332` (`buildShadeLayers`) sums every layer's tint, unclamped. The ruling R-02 withdraws that (entry 2.15's guess) and requires the tint of the **highest layer whose tile has a non-zero tint** per cell (`docs/spec/formats/legacy/older-binary-versions.md:66`).
3. `packages/core/src/formats/board/pre-vector-reader.ts:696-711` reads `coordType` only for minor ≥ 3. R-04 requires the editor's read: for a minor-2 file, read one byte **only when exactly one byte remains** after the sprite list, else 0 (`older-binary-versions.md`, "Minor-2 `coordType`").
4. `pre-vector-convert.ts:407-453` converts every program and sprite slot, including empty ones (inventing an empty region / the origin). R-05 rules that the converter **compacts** both lists, dropping empty slots.
5. `pre-vector-convert.ts:456-459` collapses the whole start to `(64, 64, 1)` if **either** axis is ≤ 0. R-07 rules the fallback **per axis**: `startX ≤ 0 → 64`, `startY ≤ 0 → 64`, `startL ≤ 0 → 1` (`docs/spec/formats/board.md` start fields).
6. `packages/runner-headless/src/dump/formats.ts:78-82` labels every `.prg` as text. R-12 requires a file whose **first byte is `00`** to be reported as **compiled** (`docs/spec/formats/rpgcode-program.md`, "Compiled form"); today `docs/spec/examples/versions/program/start_compiled.prg` is misreported as "RPGCode text program … 1 lines".

R-08's reader tolerance of `\` and `/` is already implemented, but nothing proves a real legacy `\`-separated `.tpk` loads to the same tree as the folder it was made from. R-03 (`backgroundDrawType = 1`) and R-09 (exact default polygons) are already satisfied by landed code; this entry pins them rather than changing them.

**Approach:** Change only the code each ruling reaches, in `core` (G2, G3, G7) and the headless dump, and pin every ruled case with a test — a synthetic board where the sample corpus has none, and the committed `docs/spec/examples/` files where one exists. Never change `docs/`, `tickets.toml` or `golden/` except deliberately under G5. The palette becomes a static table (G2: `core` does no I/O) that carries `dos-palette.json`'s exact bytes plus a provenance comment naming the file it was generated from.

</frozen-after-approval>

## Boundaries & Constraints

**Always:** implement each change from `docs/spec/formats/` and the entry 2.23 rulings only (G7); cite the owning `docs/spec/formats/<page>#<anchor>` in the changed code's comment; keep `core` free of DOM, Node, I/O and timers (G2) and of `Math.random`/`Date`/`performance.now`/`Intl` (G3); keep the readers' byte-exact round trip (AD-18, §1.7) — the reader keeps every stored slot, only the **converter** compacts; update every caller and test of a changed symbol in the same change (clean cutover, no alias).

**Never:** edit `docs/`, `docs/spec/`, `tickets.toml`, `_bmad-output/` or `package.json`; add a dependency (G6); change a golden or a hash vector unless a sample corpus forces it, and if it does, say why in the commit; change the board **reader**'s stored-slot behaviour (R-06 keeps raw slots); read the palette JSON at runtime (`core` has no I/O — ship the bytes); touch `../rpgtoolkit` (G7).

## I/O & Edge-Case Matrix

| ID | Ruling (entry 2.23) | Change | Edge cases | Test |
|----|---------------------|--------|------------|------|
| R-01 | Adopt `docs/spec/formats/dos-palette.json` as the 8-bit palette (`tiles.md#dos-palette`) | Replace `vga-palette.ts` with `dos-palette.ts` holding the JSON's 256 `[R,G,B]` triples as a flat 768-byte `Uint8Array`; export `DOS_PALETTE` and `dosPaletteEntry`. Update `tileset.ts:22`, `tileset/index.ts:6`, `format-tileset.test.ts:22-23` | index 255 is transparent (alpha 0) and must stay the early return in `writePalette` (`tileset.ts:253-262`); index is a byte 0…255 so `index*3` cannot run past 768; details 3/4 use all 256 entries, details 5/6 only 0…15 (a file constraint, not a reader change) | 8-bit tile fixture decodes index 1 → `(0,0,168)`, index 2 → `(0,168,0)`; palette entry assertions use dos-palette values |
| R-02 | Highest layer whose tile has a non-zero tint (`older-binary-versions.md:66`) | Rewrite `buildShadeLayers` (`pre-vector-convert.ts:281-332`): for each layer ascending, a cell's stored value is **overwritten** by that layer's tint when any of `r,g,b` is non-zero; `castLayer` stays the highest layer that carried any non-zero tint; run-length encode the result | all-unshaded board → no shade layer (unchanged); a layer tint of exactly `(0,0,0)` does not win; a lower layer's tint survives when no higher layer tints that cell; values may be negative or above ±255 | two-layer board where layer 2 tints one cell: value is layer 2's tint, not the sum, `castLayer = 2` |
| R-03 | Background image keeps `backgroundDrawType = 1` (R-03, legacy fact) | None — already `pre-vector-convert.ts:491` | — | existing converted-board test asserts `backgroundDrawType === 1` |
| R-04 | Minor-2 `coordType` read only when exactly one byte remains (`older-binary-versions.md`, R-04) | `pre-vector-reader.ts:696-711`: after the sprite list, when `minor === 2 && reader.remaining === 1`, read one `i8` as `coordType`; minor ≥ 3 unchanged | `board_minor2.brd` has **0** trailing bytes → `coordType = 0`; a minor-2 file with 2+ trailing bytes reads none and reports them as residue (unchanged); the consumed byte leaves residue empty | `board_minor2.brd` round-trips with 0 residue and `coordType 0`; a synthetic minor-2 board with one trailing `0x01` reads `coordType 1` and 0 residue |
| R-05 | Converter compacts program and item lists (`older-binary-versions.md`, R-05) | `pre-vector-convert.ts:407-453`: filter `board.programs` and `board.sprites` to non-empty (`file !== ""`) before mapping, and drop the now-unreachable empty-slot special cases (`points: []`/`closed: 0`, `pixel = {0,0}`) | an all-empty list → empty `programs`/`sprites` array; a list with an empty slot between two filled ones → the filled slots keep their relative order and no index gap | a board whose programs `[p, "", q]` and sprites `[s, ""]` converts to `programs.length === 2` (files `p`,`q`) and `sprites.length === 1` |
| R-06 | Reader keeps every stored slot (R-06) | None — `board/reader.ts:386-402` unchanged | — | existing reader round-trip test unchanged |
| R-07 | Per-axis start fallback (`board.md` start fields) | `pre-vector-convert.ts:455-459`: `x = startX ≤ 0 ? 64 : startPixel.x`, `y = startY ≤ 0 ? 64 : startPixel.y`, `layer = startLayer > 0 ? startLayer : 1` — each axis independent | one axis ≤ 0 and the other positive → the positive axis still maps through §5; `startLayer ≤ 0` alone → layer 1 with the mapped x/y | device: `(-1, 3)` → x 64, y = mapped; `(3, -1)` → y 64, x mapped; `startLayer 0` → layer 1 |
| R-08 | Reader accepts `\` and `/`; our package writes `/` (`packaging-and-paths.md`, R-08) | No production change: `writeDistributionPackage` already normalises with `toSlashes(file.path)` (`write.ts:362`) into `buildZip`'s names (`write.ts:171`, via `ordered` at `:382`). Add a regression test only | a `\`-separated stored name and a `/`-separated one fold to the same lookup key; the writer's output holds no `\` | `example_game.tpk` (legacy `\` names) loads to the same 25 paths, `/`-separated, as the folder; a writer test feeds a `\` path and asserts the entry name is `/` |
| R-09 | Exact default polygons (`character.md:63`) | None — no reader supplies a base today (no default-polygon constants in `packages/core/src/formats/actor/`); the values are the documented default for the runtime entries | — | a test records that a character/item reader leaves no synthesised base (or the existing assertion stands) |
| R-12 | A `.prg` whose first byte is `00` is compiled (`rpgcode-program.md`, R-12) | `dump/formats.ts:78-82`: neutralise the `prg` reason ("RPGCode program … reported here as text or compiled") and make `describe` return a **compiled** detail when `bytes[0] === 0x00`, else the existing `"N bytes, M lines"` | empty bytes → not compiled → `"0 bytes, 0 lines"` (unchanged); text `PRG_TEXT` → unchanged exact string so existing assertions hold; a 0x00-first file → contains "compiled" | `.prg` describe test gains a compiled case read from `docs/spec/examples/versions/program/start_compiled.prg`; report line for it contains "compiled" |

</frozen-after-approval>

## Code Map

- `docs/spec/formats/tiles.md:94-100` — `#dos-palette`, the R-01 table and the details-5/6 first-sixteen legacy fact. `docs/spec/formats/dos-palette.json` — the 256 `[R,G,B]` triples (verified: entry 0 `[0,0,0]`, entry 1 `[0,0,168]`, entry 15 `[255,255,255]`, entry 255 `[0,0,0]`). Read-only.
- `docs/spec/formats/legacy/older-binary-versions.md` — "Board minor 2 and 3 (pre-vector)": the field table, "Minor-2 `coordType` — Reawakened rule (R-04)", "Upgrade rules applied on load" (grid, cell polygon, tile types, merge, program regions, "Empty slots — Reawakened rule (R-05)", "Shading — Reawakened rule (R-02)", "Positions — Reawakened rule (R-07, per axis)", "Background image — legacy fact (R-03)"). Read-only.
- `docs/spec/formats/packaging-and-paths.md` — "Separators — Reawakened rule (R-08)" and the PAK archive table. `docs/spec/formats/rpgcode-program.md` — "Compiled form" and "Compiled programs and the dump — Reawakened rule (R-12)". Read-only.
- `packages/core/src/formats/tileset/vga-palette.ts` — the table (`:26-96`) and `vgaPaletteEntry` (`:98`); to be replaced by `dos-palette.ts`.
- `packages/core/src/formats/tileset/tileset.ts:22` (import), `:203-224` (`expandTileToRgba`), `:253-262` (`writePalette`).
- `packages/core/src/formats/tileset/index.ts:6` — re-exports the palette module.
- `packages/core/src/formats/board/pre-vector-convert.ts:281` (`buildShadeLayers`), `:394-405` (indices/limit checks), `:407` (program map), `:430` (sprite map), `:455-459` (start), `:491` (`backgroundDrawType`).
- `packages/core/src/formats/board/pre-vector-reader.ts:696-711` (`coordType`), `:714-720` (residue).
- `packages/core/src/formats/package/write.ts:171` (`buildZip` names), `:362` (`toSlashes` normalisation), `:382`/`:412` (`ordered`).
- `packages/core/src/formats/package/path-rules.ts:58-90` (`checkEntryPath`, normalises separators), `package/manifest.ts:70-77` (`checkFilePath`).
- `packages/runner-headless/src/dump/formats.ts:17-36` (`FileClass`/`SkipFormatClass`), `:39-48` (`countLines`), `:78-82` (the `prg` row); `dump/parse.ts:parseFile` (appends `describe` to the reason).
- Tests: `packages/core/test/format-tileset.test.ts:140-157`, `packages/core/test/format-board-pre-vector.test.ts:440-520,576-660,1042-1130`, `packages/core/test/format-package.test.ts` (add the legacy-`.tpk` test), `packages/runner-headless/test/dump.test.ts:516-527,644-660`.
- Fixtures (read-only, committed, G7-authored): `docs/spec/examples/versions/board/{board_minor2,board_minor3,board_minor4}.brd`, `docs/spec/examples/versions/program/start_compiled.prg`, `docs/spec/examples/files/example_game.tpk`, `docs/spec/examples/game/Game/Example/**`, `docs/spec/examples/game/Main/example.gam`. Verified this session: the tpk holds 25 entries whose 24 non-`main.gam` members are byte-identical to `docs/spec/examples/game/Game/Example/**`, and its `main.gam` equals `docs/spec/examples/game/Main/example.gam`.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/core/src/formats/tileset/dos-palette.ts` — new module: the 256 `[R,G,B]` triples of `docs/spec/formats/dos-palette.json` as a flat 768-byte `Uint8Array` (`DOS_PALETTE`) plus `dosPaletteEntry(index)`; the doc comment states the source file and that the table is the programs' hard-coded DOS palette, not the IBM VGA default (a `#dos-palette` citation); delete `vga-palette.ts`.
- [ ] `packages/core/src/formats/tileset/tileset.ts:22,259-261` and `tileset/index.ts:6` — import `DOS_PALETTE`; keep `writePalette`'s index-255 early return.
- [ ] `packages/core/src/formats/tileset/` tests — `format-tileset.test.ts`: retarget the palette test to the DOS palette and correct the 8-bit tile's expected RGBA (`index 1 → 0,0,168`; `index 2 → 0,168,0`).
- [ ] `packages/core/src/formats/board/pre-vector-convert.ts:281-332` — rewrite `buildShadeLayers` to the highest-non-zero-layer-tint rule; reword its doc comment to cite `#shading--reawakened-rule-r-02` and note entry 2.15's withdrawn unclamped-sum rule.
- [ ] `packages/core/src/formats/board/pre-vector-convert.ts:407-453` — compact `programs` and `sprites` (drop `file === ""` slots) and delete the empty-slot special cases; reword the comments to cite R-05.
- [ ] `packages/core/src/formats/board/pre-vector-convert.ts:455-459` — per-axis start fallback.
- [ ] `packages/core/src/formats/board/pre-vector-reader.ts:696-711` — minor-2 `coordType` when exactly one byte remains; comment cites R-04.
- [ ] `packages/runner-headless/src/dump/formats.ts:78-82` — neutral `prg` reason and a compiled-aware `describe`.
- [ ] `packages/core/test/format-board-pre-vector.test.ts` — update `:440-520` (shading: highest layer, not the sum; delete the unclamped-sum case) and `:576-660` (empty slots now dropped) and the start test `:569`; add a test that reads `docs/spec/examples/versions/board/board_minor2.brd` and `board_minor3.brd`, converts them, and asserts 0 residue, `coordType 0` on both, and the ruled start.
- [ ] `packages/core/test/format-package.test.ts` — add the R-08 test: load `docs/spec/examples/files/example_game.tpk`, assert 25 `/`-separated entries, that the 24 non-`main.gam` entries are byte-identical to a recursive walk of `docs/spec/examples/game/Game/Example`, and that `main.gam` equals `docs/spec/examples/game/Main/example.gam`.
- [ ] `packages/runner-headless/test/dump.test.ts:516-527` — add the compiled `.prg` case using `docs/spec/examples/versions/program/start_compiled.prg`.
- [ ] `git diff` review before committing: changes only under `packages/`; stage with the message `feat(core): align the readers and the dump with docs/spec (epic 2.24)`.

**Acceptance Criteria:**
- Given an 8-bit (detail 3–6) tile, when decoded with `expandTileToRgba`, then its index-1 pixel is `(0, 0, 168)`, its index-2 pixel `(0, 168, 0)`, index 15 `(255,255,255)`, and index 255 decodes to alpha 0 — the `docs/spec/formats/dos-palette.json` values, not the VGA table's.
- Given `docs/spec/examples/versions/board/board_minor2.brd` and `board_minor3.brd`, when read and converted, then both consume every byte (0 residue), both carry `coordType 0`, and their start and sprite positions follow the per-axis rules of `older-binary-versions.md`.
- Given a pre-vector board whose cells are tinted on more than one layer, when converted, then each cell's shade is the tint of the highest layer with a non-zero tint for that cell (not the sum), and `castLayer` is that highest layer.
- Given a pre-vector board with empty program and sprite slots, when converted, then both lists hold only the non-empty slots, in order, and no synthesised region or origin position appears.
- Given a start whose `startX` is ≤ 0 and `startY` is positive, when converted, then `x` is 64 and `y` is the §5 mapping of `startY` (and the mirror case); `startL ≤ 0` gives layer 1.
- Given `docs/spec/examples/files/example_game.tpk` (legacy `\` names), when loaded, then it yields 25 `/`-separated entries whose contents match `docs/spec/examples/game/Game/Example/**` plus `Main/example.gam` byte for byte.
- Given `docs/spec/examples/versions/program/start_compiled.prg` (first byte `00`), when `dump` classifies it, then its reported detail says **compiled**, while a text `.prg` still reports its byte and line counts.
- Given the 3.1 sample corpus, when `pnpm dump:check` runs, then every digest still matches (no sample is a pre-vector board and no sample uses an 8-bit tileset); `pnpm golden` is unchanged.

## Implementation Notes

- **The palette is a static table, not a runtime read.** G2 forbids `core` any I/O, so "replaced by a table read from `dos-palette.json`" (entry 2.23's matrix) means the module ships the JSON's bytes verbatim in a literal, with a provenance comment naming `docs/spec/formats/dos-palette.json`. The values were read from that file this session; a builder must copy all 256 triples from it, in order, R, G, B, and not retype the VGA table.
- **Rename `vga-palette.ts` → `dos-palette.ts`.** The shipped bytes are no longer the VGA default and the symbol `VGA_DEFAULT_PALETTE` would misdescribe them; ADR 0007's rule names the source `#dos-palette`. The module is internal (only `tileset.ts` and the tileset index import it), so a rename is a clean cutover. Entry 2.23's citation `vga-palette.ts:26-96` names where the table lives today, not a required path.
- **R-08 needs a test, not a code change.** `writeDistributionPackage` already normalises each entry with `toSlashes(file.path)` (`write.ts:362`) into the ordered list (`write.ts:382`) that `buildZip` writes (`write.ts:171`), and the reader normalises stored names (`path-rules.ts:59`, `package/model.ts:22`). Adding a second normalisation inside `buildZip` would be unreachable code. The deliverable is the legacy-`.tpk` load test plus (optionally) a writer test that a `\` input path is written as `/`.
- **R-03 and R-09 are already satisfied.** `backgroundDrawType: 1` is set at `pre-vector-convert.ts:491` (entry 2.16). No reader in `packages/core/src/formats/actor/` synthesises a base polygon (grep for the default values found none), so R-09 changes no code; the exact values belong to the runtime entries that will consume them. Record both in the commit message rather than editing code.
- **Why the goldens should not move.** The two sample boards in `golden/legacy-corpus.json` (`Boards/start.brd`, `Boards/out.brd`) are minor 4 (vector), so R-02/R-04/R-05/R-07 — all pre-vector only — cannot reach them, and the dump digests the parsed **model** (raw stored bytes), so the palette swap does not reach a `.tst` digest either. Confirm with `pnpm dump:check`; if a sample turns out pre-vector or a digest moves, stop and regenerate deliberately under G5 with the reason in the commit.
- **`describe` is the only hook R-12 has.** `classify` (`formats.ts`) keys on the extension alone, so the compiled test must live in the `prg` row's `describe(bytes)`; `parseFile` (`dump/parse.ts`) appends it after the reason, and `describeEntry` renders `skipped <reason> — <detail>`. Keep the text detail string byte-identical (`"${bytes.length} bytes, ${countLines(bytes)} lines"`) so `dump.test.ts:526` and `:659` keep passing; only change the compiled branch and the reason's "text program" wording.
- **The shading rewrite keeps the run-length encoding.** `buildShadeLayers` still returns `[]` when nothing is shaded and still chunks records at `MAX_SHADE_RUN` (32767); only the per-cell value changes from a sum to the winning layer's tint.
- **Corpus gap, not a conflict.** `older-binary-versions.md`'s evidence section states the corpus has no minor-2/3 board in the fetched samples (all example `.brd` files are minor 4); the two `board_minor2/3.brd` examples are `docs/spec`-authored. So the pre-vector cases are pinned by those examples plus synthetic boards, exactly as the ruling intends, and no sample-corpus golden can exercise them.

## Plan Change Log

- 2026-10-15 — initial plan, from entry 2.24's description, entry 2.23's ruling matrix (R-01 to R-09, R-12, R-08), the reconciliation note's section A, and a line-by-line read of the six code sites and their tests. Verified this session: `dos-palette.json`'s first/16th/256th triples; the two example boards' tail bytes and 0-residue parse through `docs/spec/tools/rpgtk_formats.py`; `example_game.tpk`'s 25 entries against `docs/spec/examples/game` (24 identical + `main.gam` = `Main/example.gam`); `writeDistributionPackage` already normalising separators (`write.ts:362,382`); `backgroundDrawType: 1` already present (`pre-vector-convert.ts:491`); no default polygons in the actor readers.

## Design Notes

Order of work: the two self-contained swaps first (`dos-palette.ts` + the tileset test; the dump `.prg` row + the dump test), then the reader (minor-2 `coordType`), then the converter's three edits (shading, compaction, per-axis start) and their board tests, and last the package test that only adds coverage. Each edit is one ruling with its own test, so a review can take them one at a time. The palette rename touches three files (module, import, index) plus the test; keep the round trip untouched — `expandTileToRgba` is a separate accessor and `writeTileset` re-emits stored bytes. The risk is concentrated in the converter's two behaviour changes (R-02, R-05), which change the converted model's geometry; that is why each gets a focused synthetic-board test and why the sample-corpus gate must stay green.

## Verification

**Commands:**
- `pnpm typecheck && pnpm lint && pnpm test:strict` — expected: all pass, no skipped tests; the focused `node --test packages/core/test/format-tileset.test.ts packages/core/test/format-board-pre-vector.test.ts packages/core/test/format-package.test.ts` and `node --test packages/runner-headless/test/dump.test.ts` pass too.
- `pnpm golden` — expected: unchanged (G5): no golden file or hash vector moves.
- `pnpm dump:check` — expected: the committed `golden/legacy-corpus.json` still matches (Basic 16 and demo 30 files, all digests).
- `pnpm graph && pnpm provenance` — expected: pass (no new dependency, no new source file outside `packages/`).
- `git diff --name-only` — expected: only paths under `packages/`; no `docs/`, `golden/` or `tickets.toml`.

**Manual checks:**
- Open `docs/spec/formats/dos-palette.json` beside `packages/core/src/formats/tileset/dos-palette.ts` and confirm all 256 triples match, in order.
- Read `buildShadeLayers` beside `older-binary-versions.md`'s R-02 block and confirm the value is the winning layer's tint (no `+`), the cast layer is the highest shaded layer, and an unshaded board returns `[]`.
- Read the minor-2 `coordType` branch beside R-04 and confirm it triggers only when `minor === 2 && reader.remaining === 1`.
- Confirm `format-tileset.test.ts` no longer imports `VGA_DEFAULT_PALETTE` and every expected palette value is a dos-palette value.
