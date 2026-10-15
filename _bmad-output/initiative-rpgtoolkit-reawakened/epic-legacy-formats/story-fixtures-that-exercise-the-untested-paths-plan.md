---
title: 'Fixtures that exercise the untested paths'
type: 'chore'
ticket: '22'
created: '2026-10-14'
status: done
baseline_revision: '07bcd38fe02d9726af0e7fa131c9111315f49df6'
risk: 'medium'
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/format-spec.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/epic-legacy-formats/epic-legacy-formats.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 2 landed a reader for every legacy format, but several of those readers have only ever been fed buffers the test itself built with the same primitives the reader uses (`BinaryWriter`, `writeTileset`, `writeDistributionPackage`). A reader and a writer that share one wrong field width, order or header would agree with each other and the test would still pass. Worse, whole paths of the formats have **no evidence at all**: the corpus is two sample games (`.tst` at detail 1 and 2, `.bkg` at minor 3) plus a whole-archive crawl of the surviving Mystic Software games, and that crawl found **no isometric `.iso`, no detail-4, -5 or -6 tileset, no `.tpk`, no `CMP1` standalone EXE and no detail above 2 in a shipped tileset**. (Setup ZIP installers *did* ship — a real one holds 673 entries under `Main/`, `Game/` and `Resources/` — so only the `.tpk` and `CMP1` forms have no real sample.) The `.spc`/`.ste` readers were proven only against synthetic bytes.

**Approach:** Author the missing samples from `docs/format-spec.md`'s byte layouts with an **independent** script that imports no `core` code, and derive the rest from real legacy files by **anonymising** them (layout kept, every string and content byte replaced) — so every committed fixture is either authored by us or a neutral derivative, never a legacy file. Commit those small fixtures under `packages/core/test/fixtures/`, add tests that parse them with the landed readers, and replace the self-built test buffers wherever an independent fixture now covers the same behaviour. Then make the TK2 standalone-EXE refusal say what a reader should do about it (§13.1).

</frozen-after-approval>

## Boundaries & Constraints

**Always:** every fixture is either (a) bytes written from `docs/format-spec.md` alone by `tools/fixtures/author/generate.mjs`, which imports no `packages/core` code and uses no `BinaryWriter`/`writeTileset`; (b) a tiny file an editor produced; or (c) an anonymised derivative of a real file, produced by the committed `tools/fixtures/author/anonymise.mjs`. Anything committed must be tiny and neutral: the whole-image/audio content of an anonymised file is replaced with a synthetic pattern and its strings with placeholders. Regeneration of the authored set is deterministic (no clock, no random, a fixed ZIP timestamp) so CI can prove it byte-identical.

**Never:** never commit a legacy game file, a whole game, or the generator's inputs (the archive under `../rpgtoolkit-archive` and the owner's Downloads stay outside the repo). Never open `../rpgtoolkit` or copy/translate legacy source (G7). Never add a dependency (G6). Never weaken coverage: a synthetic test is only removed when an independent fixture exercises strictly the same behaviour, never when it pins an error path or a field variation the fixture cannot. Never run `pnpm fixtures:author` in CI as a side effect — a rewrite is a deliberate act like `pnpm golden:record` (G5).

## Key Decisions

- **Provenance and hosting.** Three committed folders, all under `packages/core/test/fixtures/` (the fixtures check keeps `packages/*/test/fixtures/` tracked while `/fixtures/` stays ignored):
  - `authored/` — `tools/fixtures/author/generate.mjs` output: `detail4.tst`, `detail5.tst`, `detail6.tst`, `iso.iso`, `package.tpk`, `setup.zip`, `backslash.zip`, `package-cmp1.exe`, `exe-tk2-stub.exe`, `exe-pe-zip.exe`.
  - `real/` — the owner's own tiny editor output: `256.tst` (detail 3), `16x16.tst` (detail 2), `16m.tst` and `16c.tst` (both detail 1 — the "16 colours" mode still saves detail 1), and `animatedTile.tan` + `v1tile.gph`, held for ticket 16.7 (no reader is added here).
  - `anonymised/` — `spc-1..3.spc`, `ste-1..3.ste` and `setup-excerpt.zip`, derived from real files from **five** different games, by the committed anonymiser.
- **The anonymisation rules (the owner's, 2026-10-14).** Keep the binary/text layout byte for byte; replace every name, description, author string, asset filename and program/script text with a neutral placeholder; drop any §1.7 residue (exactly where unidentified text would hide); replace every file's content with a synthetic pattern; keep files tiny. After anonymising, the files were grepped for the source games' names (Little Man, Chimeran, School, Caoquest, Devil, Fantasyes, Final Destiny and the sampling games) and every hit count was zero — see Verification. The generator's source paths are recorded in this plan only; they are never committed.
- **Two trailer-less EXE shapes are refused (spec §13.1, corrected in its own doc commit `10dca20`).** No real EXE is committed (they are megabytes of legacy code). Instead `authored/exe-tk2-stub.exe` is a ~100-byte `MZ` image with a private payload and no trailer (a Toolkit 2 Pro single-file export), and `authored/exe-pe-zip.exe` is the shape of the real self-extracting `zip.exe`: a launcher prefix, then a ZIP embedded at a fixed offset behind it, with no trailer locating the archive. (Measured on the real sample: the ZIP begins at byte 24,054 of a 1,791,022-byte file and its end-of-central-directory record is the last 22 bytes — the file simply has no `CMP1` trailer.) The L21 message in `packages/core/src/formats/package/package.ts` now says the file **is not a standalone game this loader reads (Toolkit 2 standalone EXEs are not supported)** and that the reader must **extract the assets themselves** (project folder, Setup ZIP or `.tpk`); the rule id stays **L21** and the message still contains "missing CMP1 trailer" so the existing assertion holds.
- **Detail 4, 5 and 6 are authored from spec, unverified against a real file.** No real detail-4/5/6 sample exists anywhere in the archive or the owner's files. `detail4.tst`, `detail5.tst` and `detail6.tst` carry that literal label here, in the table rows below, and in `generate.mjs`'s comments for each. `detail4.tst` holds **two** tiles with a 64-pixel pattern shift, so the reader's and writer's per-tile stride stay covered even when the sample games are not fetched; it also appears inside the authored packages as `Tiles/set.tst`.
- **Determinism (G3's spirit).** The authoring script emits a fixed ZIP timestamp and closed-form pixel patterns, and `packages/core/test/format-fixtures.test.ts` re-runs it via `--check` and asserts byte-identical output, so a drifting generator fails `pnpm test`.
- **ZIP entries cover all the shapes §13.1 lists.** `package.tpk` puts the project folder at the archive root with `main.gam` at the root (a legacy pak); `setup.zip` is a plain ZIP of `Main/` and `Game/demo/…`; `backslash.zip` is the same project with `\` separators in every entry name; `package-cmp1.exe` is a stub + the ZIP + the 12-byte `CMP1` trailer. `package-deflated.tpk` is the same tree with every entry **deflated** (method 8), because real `.tpk` and Setup files are deflated — the tool emulates it with DEFLATE *stored* blocks so the bytes stay runtime-independent. `setup-excerpt.zip` is a real Setup bundle's own `Main\<game>.gam` plus `Game\<project>\…` entries (its separators are backslashes), with neutral names and synthetic content.

## Ticket rows — where each sample comes from

The nine paths the ticket names, and the fixture that covers each:

| # | Ticket row | Fixture(s) | Kind |
|---|---|---|---|
| 1 | Isometric tileset (`.iso`, version 30, detail 150) | `authored/iso.iso` | authored from §3.1/§3.3 (no real sample exists) |
| 2 | Detail-2 tileset | `real/16x16.tst` | real (editor output) |
| 3 | Detail-4 tileset | `authored/detail4.tst` (two tiles) | **authored from spec, unverified against a real file** |
| 4 | Detail-6 tileset | `authored/detail6.tst` | **authored from spec, unverified against a real file** |
| 5 | Palette tileset | `real/256.tst` (detail 3, 8-bit VGA palette) | real (editor output) |
| 6 | `.spc` and `.ste` files | `anonymised/spc-1..3.spc`, `anonymised/ste-1..3.ste` | anonymised real (three games each) |
| 7 | Real `.tpk` | `authored/package.tpk` + `authored/package-deflated.tpk`, and `anonymised/setup-excerpt.zip` for a real-derived Setup layout | authored (no real `.tpk` exists in the archive) |
| 8 | EXE | `authored/package-cmp1.exe` (positive) and `authored/exe-tk2-stub.exe` + `authored/exe-pe-zip.exe` (negative, L21) | authored |
| 9 | Setup ZIP | `authored/setup.zip` (`Main/` + `Game/`), `authored/backslash.zip` | authored |

Rows beyond the ticket's nine, added on the owner's direction or for completeness: `authored/detail5.tst` (**authored from spec, unverified against a real file** — detail 5 has no real sample either); `real/16m.tst` + `real/16c.tst` (both detail 1, showing the "16 colours" mode still saves detail 1); `real/animatedTile.tan` + `real/v1tile.gph` (samples for ticket 16.7 — no reader is added here).

## Acceptance

- Every row above has a committed fixture, and each one is parsed by the landed reader that owns its format: `readTileset` + `expandTileToRgba` for the tilesets (detail 2/3/4/5/6 and the isometric diamond), `readSpecialMove`/`readStatusEffect` for the anonymised battle files, and `loadPackage` for the `.tpk`, Setup ZIP, backslash ZIP, `CMP1` EXE and the anonymised Setup excerpt.
- Both negative EXEs are refused with rule **L21** and the new "not supported … extract the assets themselves (from the original project folder, its Setup ZIP or its .tpk)" wording.
- The self-built buffers that shared the readers' primitives are replaced by independent fixtures, and every variation they alone covered (multi-tile sets, signed extremes, a non-empty program) is kept as an additional test (see Implementation Notes).
- Nothing legacy is tracked: `pnpm fixtures:check` reports zero tracked files under `fixtures/`, and the widest fixture is 3,078 bytes.
- The authoring script reproduces the committed `authored/` bytes exactly (`pnpm fixtures:author:check`), and a test asserts it.

## Verification

**Commands (all in the worktree, baseline `07bcd38`):**

- `pnpm typecheck` — exit 0.
- `pnpm test` — exit 0; **540 tests, 529 pass, 0 fail, 11 skipped** (the 11 are the sample-game cases that need `pnpm fixtures:fetch`, unchanged).
- `pnpm lint` — exit 0; `check-core-deps: 1 core runtime dependency matches the allowlist`.
- `pnpm provenance` — exit 0; `scanned 262 files`, `0 violations`.
- `pnpm licence` — `Licence check PASSED`; 1 production package, 135 total, 0 violations.
- `pnpm fixtures:check` — `0 tracked files under fixtures/`; the ignore rule is still the anchored `/fixtures/`.
- `pnpm fixtures:author:check` — `authored fixtures … match a fresh run`.

**The anonymised fixtures carry no source-game string.** The `.spc`/`.ste` files were read back with the landed readers and every string field is a placeholder (`Move One/Two/Three`, `Status One/Two/Three`, `Authored placeholder description.`, empty program/status/animation), asserted in `format-fixtures.test.ts`. A case-insensitive `grep` for `little man`, `littleman`, `chimeran`, `school`, `caoquest`, `devil`, `fantasyes`, `final destiny`, `firesword`, `aljo`, `crystal`, `silversky`, `eternal`, `venom`, `poison`, `haste`, `bolt`, `sleep`, `web`, `mystic`, `matthews`, `toolkit`, `trans2`, `actkrt`, `osirus`, `toughdragon` and `annihilacja` returns **zero hits under `packages/core/test/fixtures/`** (this was re-run after the Setup excerpt was regenerated) and only `_bmad-output/` (plan/research prose) and `docs/` elsewhere. The regenerated excerpt's entries are `Main\asset0.gam` and `Game\Demo\Tiles\asset1..5.*`, with 48-byte synthetic bodies.

**Open policy point for the owner (not resolved here).** G7 rule 3 says "no legacy … assets are committed" and G5 rule 4 keeps the fetched games out of git; the owner's 2026-10-14 allowance for **anonymised derivatives** of legacy files therefore rests only on this plan and CONTRIBUTING, while `CLAUDE.md` says a guard-rail exception needs its own ADR. It is arguable whether a neutralised derivative (layout only) is a "legacy asset" at all. Flagged for the owner; no doc or ADR was changed by this ticket.

**The spec was not contradicted.** Every spec-conformant fixture parses: no reader had to be changed to accept one, so no doc-first amendment was needed for this ticket (the only spec change, §13.1's TK2 ruling, was already committed on this branch before the fixtures).

## Implementation Notes

**What was replaced, and why nothing was weakened.** The ticket asks to replace test buffers that "only pass because they share the writer primitives". Four sites did; each is now covered by an independent fixture, and wherever a variation the old buffer carried could not be reproduced from a fixture (a two-tile set, a negative field, a non-empty program) the synthetic case was **kept as well**, not deleted:

1. `format-registry.test.ts` — `TILESET_BYTES` was `writeTileset(TILESET)`, then fed to the decoder; it is now `fixtures/authored/detail4.tst`, and the test asserts the fixture's documented model (version 20, detail 4, two tiles). The decoder-vs-reader equivalence loop (`SAMPLES`) uses the same fixture bytes.
2. `format-battle.test.ts` — "a parsed special move/status effect writes back byte-for-byte" were fed by `buildSpc()`/`buildSte()` (`BinaryWriter`); they now read `anonymised/spc-1.spc` and `anonymised/ste-1.ste`. Review round 1 found that the deleted builders were the only round-trip that pinned a non-zero `smpEnabled`/`runProgram` and a non-empty `program` (and, for `.spc`, a negative `i32`/`i8`), so both were **restored alongside** the fixture test: "a field-varying synthetic special move/status effect writes back byte-for-byte".
3. `format-tileset.test.ts` — the two happy-path round-trips (a detail-1/2 `.tst` and a detail-150 `.iso`) now read `real/16x16.tst` and `authored/iso.iso`, and a new case reads `authored/detail4.tst` to pin a **two-tile** set (the per-tile stride), which no single-tile fixture covers. `tilesetBytes()`/`indexedPixels()` stay for the error, bounds, column-major and palette tests, which no valid fixture can cover.
4. `format-package.test.ts` — the positive arm of the `CMP1` test now uses `authored/package-cmp1.exe` + `authored/package.tpk`, and the "no trailer" arm uses the two authored negative stubs. The L20 arms (offset past the end, length into the trailer, negative offset) stay synthetic: the fixtures deliberately have valid trailers, so nothing else can pin those errors.

`format-package-writer.test.ts` and the writer side of `format-manifest.test.ts` keep using `writeDistributionPackage`: those tests are *about* the writer, and a read-only fixture cannot replace them.

**Why the anonymiser is a CLI and not a manifest.** A checked-in manifest would put the source paths into a machine-readable file beside the fixtures; keeping them in this plan instead (docs prose, where the archive's game titles already appear, e.g. `docs/format-spec.md` §13.1) leaves the fixture folder itself free of any source identifier. `anonymise.mjs` is therefore generic (`spc|ste|setup-excerpt`, `--in`, `--name`, `--out`, …) with no built-in source list. `--in` sources used: the chimeran-era Setup bundle's `SpcMove\Web.spc` and `StatusE\Haste.ste`, `crystal_of_immortality.zip`'s `SpcMove\bolt1.spc`, `SilverSky_Demo1.ZIP`'s `StatusE\Sleep1.ste`, `eternalblade.zip`'s `StatusE\venom.ste` and `School2Demo.zip`'s `SpcMove\Poison Pin.spc`; the Setup excerpt came from the same chimeran-era `zip.zip` bundle. All under `../rpgtoolkit-archive/wayback/mysticsoftware.net/`, none committed.

**Why a hand-written ZIP writer in the tool.** The fixtures must not share the reader's assumptions, so `tools/fixtures/author/zip.mjs` holds its own CRC-32, little-endian fields and local/central/EOCD records, and writes method-8 entries as DEFLATE *stored* blocks (no zlib, so the bytes are identical on every runtime), independent of `packages/core/src/formats/package/zip.ts`.

**CI wiring.** `pnpm fixtures:author` / `pnpm fixtures:author:check` are new root scripts; the generated `authored/` tree is *committed*, so nothing in CI runs the generator except the determinism assertion inside `pnpm test`. CONTRIBUTING.md gains a "Committed fixtures" section and the two commands.

## Plan Change Log

- 2026-10-14 — initial plan; the authored/anonymised/real fixture layout, the L21 message change, and the four test-buffer replacements above.
- 2026-10-14 — review round 1: the Setup excerpt now really carries `Main\` + `Game\Demo\…`, `detail4.tst` holds two tiles, a deflated `.tpk` joins the authored set, the field-varying `.spc`/`.ste` round-trips were restored, the L21 wording no longer calls every trailer-less file a Toolkit 2 EXE, and the plan's false "no Setup ZIP shipped" and "six games" claims were corrected.
