---
title: 'Headless project dump tool (runner-headless dump)'
type: 'chore'
ticket: '11'
created: '2026-10-11'
status: 'done'
baseline_revision: 'acf48f83c0ddf6ea9e3d909a6653f2cefd4fdf37'
route: 'full'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 1
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/format-spec.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 2 now reads every legacy format with a `core` reader, but nothing exercises all of them against the real sample games in one repeatable pass, so Epic 2's Done-when 1 — "the dump tool parses every file in `demo` and `Basic` without error and prints it as readable data" — has no implementation and no enforcement. Running it by hand would also prove only that the readers did not *throw*: a reader that silently started returning a wrong value would still print a plausible line.

**Approach:** Add a `dump` subcommand to `packages/runner-headless` (the Node host shell). It loads a project in any of format-spec §13's three forms — an extracted project or game folder, a `.tpk`, or a standalone EXE — by handing the bytes to `core`'s package loader, then dispatches **every** file by extension to the reader that extension names, prints one readable line per file, reports text, media, plugin files and no-reader-yet formats as *skipped with a reason*, and exits non-zero when a data-format file fails to parse, printing the reader's located `FormatError`. Its `--json` mode carries a per-file digest (`core`'s FNV-1a over the canonical JSON of the parsed model, or over the decoded RGBA for an image), and a committed expectation (`golden/legacy-corpus.json`) is compared inside the existing required `golden` CI job — so **Done-when 1 is a CI-enforced check, not a local habit**, and a drifting parser or decoder fails the build naming the file.

## Boundaries & Constraints

**Always:** every byte of file-system work lives in `runner-headless`, which is a host shell (G2 constrains `core` only) — `core` is not touched at all by this ticket. Every dispatch row cites the `docs/format-spec.md` section its reader implements (G7). The digests stay deterministic: no `Date`, no clock, no dependence on map iteration order or on the directory listing order (G3's spirit, and required for a committed expectation to be comparable at all). `kebab-case.ts` file names, `PascalCase` types, `camelCase` functions. No new dependency (`node:fs`/`node:path` and `node:test` are host/test facilities, and the digest reuses `core`'s `canon`/`fnv1a64`, AD-11).

**Never:** add a new CI job or make a second required check depend on the network — the dump gate runs inside the `golden` job, which already runs `pnpm fixtures:fetch`. Never run `--record` in CI: regenerating the expectation is a deliberate act like `pnpm golden:record` (G5). Never modify the existing golden tree (`golden/test-double/**`, `golden/hash-vectors.json`). Never treat a non-format file (`.prg` text, `.mid`, `.wav`, `.txt`, `.dll`, plugin files) as a failure.

</frozen-after-approval>

## Tasks & Acceptance

**Execution:**
- [x] `packages/runner-headless/src/dump/formats.ts` — the extension → reader dispatch table (`classify`), each row naming its format-spec section; the skip rows carry their reason, and `.prg` additionally reports size and line count; `boardLayout(minor)` is §4.1's version dispatch (vector ≥ 4, pre-vector 2–3, obsolete 0–1) — §1.5, §2, §3.1, §4.1, §6.1–§6.3, §7.1, §8.1–§8.3, §10, §12.
- [x] `packages/runner-headless/src/dump/digest.ts` — `digestModel` = `fnv1a64(canon(model))` with a `Uint8Array` → hex and `undefined`-dropping `toPlainData`, and `digestRgba` = `fnv1a64(rgba)` — AD-11.
- [x] `packages/runner-headless/src/dump/parse.ts` — `parseFile(file) → parsed | skipped | failed`, with the §4.1 board branch (peek the header, then `readBoard` or `readPreVectorBoard` + `convertPreVectorBoard`) and the per-format one-line summaries.
- [x] `packages/runner-headless/src/dump/report.ts` — `buildReport(files)` (sorted by path, counts, fixed key order), `formatReport` (readable lines), `serializeReport` (JSON), `digestsOf`.
- [x] `packages/runner-headless/src/dump/fs.ts` — `loadRoot(path)`: folder walk → `loadPackage({ kind: "folder" })`, `.tpk`/`.exe` → the matching §13 form, anything else a located error; links are reported, never followed (L23).
- [x] `packages/runner-headless/src/dump/expectation.ts` — the expectation shape, `parseExpectation` (validating, names the file), `serializeExpectation` (through `canon`, so keys are sorted), `compareGame`/`driftLines` naming each missing, new or drifted file.
- [x] `packages/runner-headless/src/dump/cli.ts` — `dump [--json] <path>`, `dump --check <expectation.json> <games-dir>`, `dump --record <expectation.json> <games-dir>`.
- [x] `packages/runner-headless/src/index.ts` — `main` now dispatches subcommands (`golden`, `dump`); the existing `golden` behaviour and its messages are unchanged.
- [x] `packages/runner-headless/package.json`, `tsconfig.json`, root `pnpm-lock.yaml` — depend on `@rpgtoolkit/core` (`workspace:*`) and reference its project; `tools/deps/edges.json` gains `["core", "runner-headless"]` (G2 rule 5, AD-22), and `pnpm graph:write` regenerated the spine diagram.
- [x] `golden/legacy-corpus.json` — the committed expectation for the pinned fixture corpus (45 digests over `demo` + `Basic`).
- [x] `.github/workflows/ci.yml` — the `golden` job runs `pnpm dump:check` after `pnpm fixtures:fetch`/`fixtures:check`/`golden`; root `package.json` gains `dump`, `dump:check`, `dump:record`.
- [x] `CONTRIBUTING.md` — documents the command, that the corpus digest gate runs in the `golden` job, and that regeneration is deliberate.
- [x] `packages/runner-headless/test/dump.test.ts` — 22 `node:test` cases (below).

**Acceptance Criteria:**
- Given `fixtures/legacy/demo` or `fixtures/legacy/Basic`, `dump` prints one line per file and exits 0: demo 29 parsed, 46 skipped, 0 failed; Basic 16 parsed, 42 skipped, 0 failed.
- Given a data-format file that will not parse, `dump` names the file, the format-spec section, the byte offset and the message, and exits non-zero; the other files still report.
- Given a file that is text, media, a plugin or a format with no reader, `dump` reports it as skipped with a reason and never counts it as a failure.
- Given `--json` on the same corpus twice, the output is byte-identical; the report's files are sorted by path and no machine-specific value (an absolute path, a clock) reaches it.
- Given a deliberately drifted digest in `golden/legacy-corpus.json`, `pnpm dump:check` fails and names the file and both digests.
- Given a reader or decoder change, the per-file digest changes, so `pnpm dump:check` in the `golden` job fails: **epic 2's Done-when 1 is now CI-enforced rather than local.**

## Implementation Notes

- **The dispatch is by extension, by design.** The ticket names the extensions, and the legacy corpus is what it is: the table maps one extension to one reader family, and every row cites the format-spec section (G7). The `.brd` row is the only one that needs a second decision, because §4.1 makes the *minor* version choose the layout: the cli peeks the header with a non-consuming `BinaryReader` and routes minor 2–3 to the §4.8 pre-vector reader, converted to the §4.2 model with `convertPreVectorBoard`, so one board model — and one digest — comes out either way.
- **The digest is the canonical model, not the re-encoded bytes.** `canon` (AD-11) already gives a deterministic, key-order-independent serialisation, and `fnv1a64` is already the repo's hash, so the digest is `fnv1a64(canon(model))` and needs no new machinery. Re-encoding would also have coupled the gate to the writers, and the §4.8 pre-vector path has no writer to re-encode with. A model holds `Uint8Array` residue and tile pixels, which `canon` rejects, so `toPlainData` folds those to lowercase hex and drops `undefined` (a reader's conditional fields are `undefined` at the minors that do not carry them).
- **Images digest their pixels.** `digestRgba` is `fnv1a64` over the `decodeTexture` RGBA bytes, so a decoder that returns one wrong pixel fails the gate.
- **Skipping is explicit, not a fallback.** `.prg`, `.gph`, `.tan`, `.tbm`, `.sav`, media, fonts, text and plugin libraries each have their own row and reason, so an unexpected file is a visible "unrecognised extension" skip rather than a silent pass. Formats the spec describes but `core` has no reader for (`.gph` §3.2, `.tan` §3.5, `.tbm` §3.6, `.sav` §11) are skipped with that stated, because counting them as failures would fail every game that ships one.
- **Determinism by construction.** Files are sorted by path before parsing; `buildReport` builds every object with a fixed literal key order; the report carries no root path, no host name and no clock. The expectation is serialised through `canon`, so its key order is the serialiser's, not insertion order.
- **The gate lives in `golden`, not in `unit`.** `unit` never fetches fixtures; making it fetch would couple a second required check to network availability. `golden` already runs `pnpm fixtures:fetch`, so that is where the corpus comparison belongs.
- **`--record` refuses a broken corpus.** It exits non-zero rather than writing digests for a game that has a parse failure, so the expectation can never launder a regression into a "new baseline".

## Plan Change Log

- 2026-10-11 — initial plan; `runner-headless` gains a `dump/` module tree, the corpus expectation lands in `golden/legacy-corpus.json`, and the gate is a step in the existing `golden` job rather than a new required check.

## Review Triage Log

## Design Notes

- **Why `runner-headless` and not `core`.** Opening files, walking directories and reading `.tpk` bytes are host concerns; `core` stays pure (G2) and this ticket does not touch it. The rendering, dispatch and digest logic is written as pure functions over `PackageFile`s so it is unit-testable without a file system.
- **Why an expectation file and not a golden image.** A golden is a behaviour reference; this is a *drift* reference. It holds one 16-hex digest per parsed file and the counts, so the failure message is "this file changed", not "some bytes differ".
- **`golden/legacy-corpus.json` is a reviewed artefact.** It is committed beside the existing golden, it is written only by `--record` (which is never a CI step), and CONTRIBUTING says so.
- **The `edges.json` change.** `runner-headless` already depended on `runner-harness`, which depends on `core`; `dump` imports `core`'s readers directly, so the explicit edge `["core", "runner-headless"]` was added and the generated spine diagram regenerated with `pnpm graph:write` (AD-22).

## Verification

**Commands (all in the worktree, baseline `acf48f8`):**
- `pnpm install --frozen-lockfile` — exit 0.
- `pnpm typecheck` — exit 0.
- `pnpm test` — exit 0; 303 pass, 0 fail, 1 pre-existing skip (22 of them in `dump.test.ts`).
- `pnpm lint` — exit 0.
- `pnpm graph` — exit 0; no dependency violations.
- `pnpm provenance` — exit 0.
- `pnpm fixtures:fetch` — exit 0 (`demo: 75 files`, `Basic: 58 files`).

**The dump actually run over the fetched sample games:**
- `node packages/runner-headless/dist/cli.js dump fixtures/legacy/demo` — exit 0; `29 parsed, 46 skipped, 0 failed` (9 boards/actors, 17 animations, 3 images, 2 tilesets parsed; every `.mid`/`.wav`/`.dll`/`.txt`/`.prg` skipped).
- `node packages/runner-headless/dist/cli.js dump fixtures/legacy/Basic` — exit 0; `16 parsed, 42 skipped, 0 failed`.
- `node packages/runner-headless/dist/cli.js dump --json fixtures/legacy/demo` twice — byte-identical; same for Basic.
- `node packages/runner-headless/dist/cli.js dump --record golden/legacy-corpus.json fixtures/legacy` — exit 0; `recorded 2 game(s), 45 digests`.
- `node packages/runner-headless/dist/cli.js dump --check golden/legacy-corpus.json fixtures/legacy` — exit 0; both games report their digest counts matching.
- A deliberately corrupted copy of the corpus (`demo/Boards/start.brd` truncated to 40 bytes) — exit 1 with `Boards/start.brd  FAILED  board  format-spec §1.1 at offset 30: …` and `28 parsed, 46 skipped, 1 failed`.
- A deliberately drifted digest in a copy of the expectation — exit 1 with `dump: check failed: demo: Boards/start.brd digest 65da9ee0349bf83c differs from the expected 0000000000000000`.
