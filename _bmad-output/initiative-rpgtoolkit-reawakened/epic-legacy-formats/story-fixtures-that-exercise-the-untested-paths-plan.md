---
title: 'Fixtures that exercise the untested paths'
type: 'chore'
ticket: '22'
created: '2026-10-14'
status: 'built'
baseline_revision: '07bcd38fe02d9726af0e7fa131c9111315f49df6'
risk: 'medium'
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/format-spec.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/epic-legacy-formats/epic-legacy-formats.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 2 landed a reader for every legacy format, but several of those readers have only ever been fed buffers the test itself built with the same primitives the reader uses (`BinaryWriter`, `writeTileset`, `writeDistributionPackage`). A reader and a writer that share one wrong field width, order or header would agree with each other and the test would still pass. Worse, whole paths of the formats have **no evidence at all**: the corpus is two sample games (`.tst` at detail 1 and 2, `.bkg` at minor 3) plus a whole-archive crawl of the surviving Mystic Software games, and that crawl found **no isometric `.iso`, no detail-4, -5 or -6 tileset, and no package of any kind** (no `.tpk`, no Setup ZIP, no standalone EXE). The `.spc`/`.ste` readers were proven only against synthetic bytes.

**Approach:** Author the missing samples from `docs/format-spec.md`'s byte layouts with an **independent** script that imports no `core` code, and derive the rest from real legacy files by **anonymising** them (layout kept, every string and content byte replaced) — so every committed fixture is either authored by us or a neutral derivative, never a legacy file. Commit those small fixtures under `packages/core/test/fixtures/`, add tests that parse them with the landed readers, and replace the self-built test buffers wherever an independent fixture now covers the same behaviour. Then make the TK2 standalone-EXE refusal say what a reader should do about it (§13.1).

</frozen-after-approval>

## Boundaries & Constraints

**Always:** every fixture is either (a) bytes written from `docs/format-spec.md` alone by `tools/fixtures/author/generate.mjs`, which imports no `packages/core` code and uses no `BinaryWriter`/`writeTileset`; (b) a tiny file an editor produced; or (c) an anonymised derivative of a real file, produced by the committed `tools/fixtures/author/anonymise.mjs`. Anything committed must be tiny and neutral: the whole-image/audio content of an anonymised file is replaced with a synthetic pattern and its strings with placeholders. Regeneration of the authored set is deterministic (no clock, no random, a fixed ZIP timestamp) so CI can prove it byte-identical.

**Never:** never commit a legacy game file, a whole game, or the generator's inputs (the archive under `../rpgtoolkit-archive` and the owner's Downloads stay outside the repo). Never open `../rpgtoolkit` or copy/translate legacy source (G7). Never add a dependency (G6). Never weaken coverage: a synthetic test is only removed when an independent fixture exercises strictly the same behaviour, never when it pins an error path or a field variation the fixture cannot. Never run `pnpm fixtures:author` in CI as a side effect — a rewrite is a deliberate act like `pnpm golden:record` (G5).

## Key Decisions

- **Provenance and hosting.** Three committed folders, all under `packages/core/test/fixtures/` (the fixtures check keeps `packages/*/test/fixtures/` tracked while `/fixtures/` stays ignored):
  - `authored/` — `tools/fixtures/author/generate.mjs` output: `detail4.tst`, `detail5.tst`, `detail6.tst`, `iso.iso`, `package.tpk`, `setup.zip`, `backslash.zip`, `package-cmp1.exe`, `exe-tk2-stub.exe`, `exe-pe-zip.exe`.
  - `real/` — the owner's own tiny editor output: `256.tst` (detail 3), `16x16.tst` (detail 2), `16m.tst` and `16c.tst` (both detail 1 — the "16 colours" mode still saves detail 1), and `animatedTile.tan` + `v1tile.gph`, held for ticket 16.7 (no reader is added here).
  - `anonymised/` — `spc-1..3.spc`, `ste-1..3.ste` and `setup-excerpt.zip`, derived from real files from six different games, by the committed anonymiser.
- **The anonymisation rules (the owner's, 2026-10-14).** Keep the binary/text layout byte for byte; replace every name, description, author string, asset filename and program/script text with a neutral placeholder; drop any §1.7 residue (exactly where unidentified text would hide); replace every file's content with a synthetic pattern; keep files tiny. After anonymising, the files were grepped for the source games' names (Little Man, Chimeran, School, Caoquest, Devil, Fantasyes, Final Destiny and the sampling games) and every hit count was zero — see Verification. The generator's source paths are recorded in this plan only; they are never committed.
- **Toolkit 2 standalone EXEs are refused (spec §13.1, already committed).** No real TK2 Pro EXE is committed (they are megabytes of legacy code); instead `authored/exe-tk2-stub.exe` is a ~100-byte `MZ` image with no trailer, and `authored/exe-pe-zip.exe` is a PE-ish prefix followed by a ZIP with no trailer (the shape of the real self-extracting `zip.exe`). The L21 message in `packages/core/src/formats/package/package.ts` now says the form is **not supported** and that the game's author must **extract the assets themselves** (project folder, Setup ZIP or `.tpk`); the rule id stays **L21** and the message still contains "missing CMP1 trailer" so the existing assertion holds.
- **Detail 5 and 6 are authored from the spec and unverified.** No real detail-4/5/6 sample exists anywhere in the archive or the owner's files. `detail4.tst`, `detail5.tst` and `detail6.tst` are labelled "authored from the spec, unverified against a real file" here and in a comment in the generator. Detail 4 also appears inside the authored packages as `Tiles/set.tst`, so a package fixture carries a real tileset.
- **Determinism (G3's spirit).** The authoring script emits a fixed ZIP timestamp and closed-form pixel patterns, and `packages/core/test/format-fixtures.test.ts` re-runs it via `--check` and asserts byte-identical output, so a drifting generator fails `pnpm test`.
- **ZIP entries cover all the shapes §13.1 lists.** `package.tpk` puts the project folder at the archive root with `main.gam` at the root (a legacy pak); `setup.zip` is a plain ZIP of `Main/` and `Game/demo/…`; `backslash.zip` is the same project with `\` separators in every entry name; `package-cmp1.exe` is a stub + the ZIP + the 12-byte `CMP1` trailer. `setup-excerpt.zip` keeps the root-engine-files + `Game\<project>\…` *shape* of a real Setup bundle with anonymised names.

## Ticket rows — where each sample comes from

The nine paths the ticket names, and the fixture that covers each:

| # | Ticket row | Fixture(s) | Kind |
|---|---|---|---|
| 1 | Isometric tileset (`.iso`, version 30, detail 150) | `authored/iso.iso` | authored from §3.1/§3.3 (no real sample exists) |
| 2 | Detail-2 tileset | `real/16x16.tst` | real (editor output) |
| 3 | Detail-4 tileset | `authored/detail4.tst` | authored from §3.1 |
| 4 | Detail-6 tileset | `authored/detail6.tst` | authored from §3.1 |
| 5 | Palette tileset | `real/256.tst` (detail 3, 8-bit VGA palette) | real (editor output) |
| 6 | `.spc` and `.ste` files | `anonymised/spc-1..3.spc`, `anonymised/ste-1..3.ste` | anonymised real (three games each) |
| 7 | Real `.tpk` | `authored/package.tpk`, and `anonymised/setup-excerpt.zip` for a real-derived layout | authored (no sample package was ever shipped) |
| 8 | EXE | `authored/package-cmp1.exe` (positive) and `authored/exe-tk2-stub.exe` + `authored/exe-pe-zip.exe` (negative, L21) | authored |
| 9 | Setup ZIP | `authored/setup.zip` (`Main/` + `Game/`), `authored/backslash.zip` | authored |

Rows beyond the ticket's nine, added on the owner's direction or for completeness: `authored/detail5.tst` (detail 5 has no real sample either); `real/16m.tst` + `real/16c.tst` (both detail 1, showing the "16 colours" mode still saves detail 1); `real/animatedTile.tan` + `real/v1tile.gph` (samples for ticket 16.7 — no reader is added here).

## Acceptance

- Every row above has a committed fixture, and each one is parsed by the landed reader that owns its format: `readTileset` + `expandTileToRgba` for the tilesets (detail 2/3/4/5/6 and the isometric diamond), `readSpecialMove`/`readStatusEffect` for the anonymised battle files, and `loadPackage` for the `.tpk`, Setup ZIP, backslash ZIP, `CMP1` EXE and the anonymised Setup excerpt.
- Both negative EXEs are refused with rule **L21** and the new "not supported … extract the assets themselves (from the original project folder, its Setup ZIP or its .tpk)" wording.
- The self-built buffers that shared the readers' primitives are replaced where an independent fixture covers the same behaviour, and only there (see Implementation Notes).
- Nothing legacy is tracked: `pnpm fixtures:check` reports zero tracked files under `fixtures/`, and the widest fixture is 3,078 bytes.
- The authoring script reproduces the committed `authored/` bytes exactly (`pnpm fixtures:author:check`), and a test asserts it.

## Verification

**Commands (all in the worktree, baseline `07bcd38`):**

- `pnpm typecheck` — exit 0.
- `pnpm test` — exit 0; **536 tests, 525 pass, 0 fail, 11 skipped** (the 11 are the sample-game cases that need `pnpm fixtures:fetch`, unchanged).
- `pnpm lint` — exit 0; `check-core-deps: 1 core runtime dependency matches the allowlist`.
- `pnpm provenance` — exit 0; `scanned 262 files`, `0 violations`.
- `pnpm licence` — `Licence check PASSED`; 1 production package, 135 total, 0 violations.
- `pnpm fixtures:check` — `0 tracked files under fixtures/`; the ignore rule is still the anchored `/fixtures/`.
- `pnpm fixtures:author:check` — `authored fixtures … match a fresh run`.

**The anonymised fixtures carry no source-game string.** The `.spc`/`.ste` files were read back with the landed readers and every string field is a placeholder (`Move One/Two/Three`, `Status One/Two/Three`, `Authored placeholder description.`, empty program/status/animation), asserted in `format-fixtures.test.ts`. A case-insensitive `grep` for `little man`, `littleman`, `chimeran`, `school`, `caoquest`, `devil`, `fantasyes`, `final destiny`, `crystalo`, `eternalblade`, `silversky`, `schoolsout`, `osirus`, `toughdragon` and `annihilacja` returns **zero hits under `packages/core/test/fixtures/`** and only `_bmad-output/` (plan/research prose) and `docs/` elsewhere.

**The spec was not contradicted.** Every spec-conformant fixture parses: no reader had to be changed to accept one, so no doc-first amendment was needed for this ticket (the only spec change, §13.1's TK2 ruling, was already committed on this branch before the fixtures).

## Implementation Notes

**What was replaced, and why nothing was weakened.** The ticket asks to replace test buffers that "only pass because they share the writer primitives". Four sites did, and each was replaced by an independent fixture that exercises strictly the same behaviour:

1. `format-registry.test.ts` — `TILESET_BYTES` was `writeTileset(TILESET)`, then fed to the decoder; it is now `fixtures/authored/detail4.tst`, and the test asserts the fixture's documented model (version 20, detail 4, one tile). The decoder-vs-reader equivalence loop (`SAMPLES`) uses the same fixture bytes.
2. `format-battle.test.ts` — "a parsed special move/status effect writes back byte-for-byte" were fed by `buildSpc()`/`buildSte()` (`BinaryWriter`); they now read `anonymised/spc-1.spc` and `anonymised/ste-1.ste`. The field-variation coverage those builders provided (signed extremes, empty vs non-empty, residue) stays in the untouched tests that use them.
3. `format-tileset.test.ts` — the two happy-path round-trips (a detail-1 `.tst` pair and a detail-150 `.iso`) now read `real/16x16.tst` and `authored/iso.iso`. `tilesetBytes()`/`indexedPixels()` stay for the error, bounds, column-major and palette tests, which no valid fixture can cover.
4. `format-package.test.ts` — the positive arm of the `CMP1` test now uses `authored/package-cmp1.exe` + `authored/package.tpk`, and the "no trailer" arm uses the two authored negative stubs. The L20 arms (offset past the end, length into the trailer, negative offset) stay synthetic: the fixtures deliberately have valid trailers, so nothing else can pin those errors.

`format-package-writer.test.ts` and the writer side of `format-manifest.test.ts` keep using `writeDistributionPackage`: those tests are *about* the writer, and a read-only fixture cannot replace them.

**Why the anonymiser is a CLI and not a manifest.** A committed manifest of source paths would carry the legacy game names into the repo. Instead `anonymise.mjs` is generic (`spc|ste|setup-excerpt`, `--in`, `--name`, `--out`, …) and the source paths live only in this plan. `--in` sources used: the chimeran-era Setup bundle's `SpcMove\Web.spc` and `StatusE\Haste.ste`, `crystal_of_immortality.zip`'s `SpcMove\bolt1.spc`, `SilverSky_Demo1.ZIP`'s `StatusE\Sleep1.ste`, `eternalblade.zip`'s `StatusE\venom.ste` and `School2Demo.zip`'s `SpcMove\Poison Pin.spc`; the Setup excerpt came from the same chimeran-era `zip.zip` bundle. All under `../rpgtoolkit-archive/wayback/mysticsoftware.net/`, none committed.

**Why a hand-written ZIP writer in the tool.** The fixtures must not share the reader's assumptions, so `tools/fixtures/author/zip.mjs` holds its own CRC-32, little-endian fields and STORE-mode local/central/EOCD records (plus `deflateRawSync` for an optional method-8 entry), independent of `packages/core/src/formats/package/zip.ts`.

**CI wiring.** `pnpm fixtures:author` / `pnpm fixtures:author:check` are new root scripts; the generated `authored/` tree is *committed*, so nothing in CI runs the generator except the determinism assertion inside `pnpm test`. CONTRIBUTING.md gains a "Committed fixtures" section and the two commands.

## Plan Change Log

- 2026-10-14 — initial plan; the authored/anonymised/real fixture layout, the L21 message change, and the four test-buffer replacements above.
