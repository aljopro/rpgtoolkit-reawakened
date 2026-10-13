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
review: 'thorough'
review_source: 'pinned'
lenses_ran: ['blind-hunter', 'edge-case-hunter', 'verification-gap', 'intent-alignment']
review_loop_iteration: 2
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

### Round 2 — 2026-10-13 (`review-r3-package-ci`)

| # | Lens | Finding | Verdict | Route |
|---|---|---|---|---|
| 1 | intent-alignment | At `2aa135e` `.bmp`/`.gif` were data formats, so a real BMP failed the dump instead of skipping (violates the AC and §10's listing) | confirmed (fixed in 93efb03) | rejected — STALE on re-baseline: already fixed by round 1 (`93efb03`) |
| 2 | intent-alignment | The plan's AC ("demo 29 parsed", "45 digests") contradicts the committed `golden/legacy-corpus.json` and the live gate output (30 parsed, 46 digests) | confirmed (open at HEAD) | open — needs the plan owner; the acceptance text is frozen and left unchanged |
| 3 | verification-gap | Digest reproducibility is proven on Node 26.8.1 only; CI pins 24.21.0 | unverified risk (not reproducible here) | deferred — recorded in `deferred-work.md` |
| 4 | blind-hunter | Report/expectation carry no absolute path, clock, locale comparison or listing-order dependence; `canon`/`fnv1a64` are engine-independent | verified-ok | rejected |
| 5 | blind-hunter | `["core","runner-headless"]` edge direction and `pnpm graph` | verified-ok | rejected |
| 6 | blind-hunter | The gate is deliberately self-recorded (drift reference, not an oracle) — documented, and it does catch parsed↔skipped moves via counts | verified-ok | rejected |

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

## Code Review

### 2026-10-11

**Code review complete.** 0 `decision-needed`, 10 `patch`, 0 `defer`, 17 rejected. Every patch is applied (2026-10-11).

Scope: 2aa135e; diff excludes the ticket's own plan file. Lenses run: blind-hunter, edge-case-hunter, verification-gap, intent-alignment (thorough). Decision, patch and defer counts are entries after grouping; the rejected count is findings.

- [x] [Review][Patch] A canon-rejected model value aborts the whole dump (a `.anm` NaN delay loses every other file's result) [packages/runner-headless/src/dump/parse.ts:63] — wrap the digest call and return a located `failed` outcome for that file. — applied 2026-10-11: `parseFile` wraps the reader and the digest in a try/catch, so a value `canon` rejects (a NaN `.anm` delay) fails that one file with a located error and the rest of the dump goes on. A unit test and a CLI test cover it.
- [x] [Review][Patch] `.bmp`/`.gif` are hard failures although §10 lists them and core has no decoder [packages/runner-headless/src/dump/formats.ts:102] — make the two rows skips like `.gph`/`.tan`/`.tbm`, per the acceptance criterion. — applied 2026-10-11: `.bmp` and `.gif` are skipped with a reason, like `.gph`, `.tan` and `.tbm`; a test covers both.
- [x] [Review][Patch] `dump --check` ignores a game folder the expectation does not name [packages/runner-headless/src/dump/cli.ts:70] — compare the corpus directory's names with `expectation.games` and fail naming an unlisted one. — applied 2026-10-11: `dump --check` fails, naming the folder, when the games directory holds one the expectation does not name; a test covers it.
- [x] [Review][Patch] The `.tpk` and standalone-EXE forms are run by no test [packages/runner-headless/src/dump/fs.ts:94] — add a `.tpk` (and appended-ZIP `.exe`) CLI case asserting exit 0 and a known digest. — applied 2026-10-11: CLI cases run a `.tpk` and an appended-ZIP `.exe` (a stub, the ZIP and the 12-byte format-spec §13 trailer) and assert exit 0 and the digest.
- [x] [Review][Patch] `.gam`/`.spc`/`.ste` rows are classified but parsed by nothing [packages/runner-headless/test/dump.test.ts:180] — add in-memory fixtures via `writeMainFile`/`writeSpecialMove`/`writeStatusEffect`. — applied 2026-10-11: In-memory `.gam`, `.spc` and `.ste` files, written with the core writers, are parsed by a test that checks format, summary and digest.
- [x] [Review][Patch] The §4.8 pre-vector board branch is executed by nothing [packages/runner-headless/src/dump/parse.ts:88] — add one pre-vector `.brd` case driving `readPreVectorBoard` + `convertPreVectorBoard`. — applied 2026-10-11: A minor-3 board in the §4.8 layout, built byte by byte, runs `readPreVectorBoard` and `convertPreVectorBoard` through the dump and is reported parsed. The `parse.ts` module comment, which said the module had no error handling, is corrected.
- [x] [Review][Patch] The host reads every file into memory before core's AD-17 limits apply [packages/runner-headless/src/dump/fs.ts:60] — check `stat.size` against `PACKAGE_LIMITS` before `readFileSync`. — applied 2026-10-11: The host compares `stat.size` with `PACKAGE_LIMITS` before reading: a loose file above the per-entry limit and a `.tpk` or `.exe` above the compressed-input limit are refused unread. A test uses sparse files.
- [x] [Review][Patch] Drift wording says "missing" for a file that is present but no longer parses [packages/runner-headless/src/dump/expectation.ts:170] — print the new report's `failed` entry or reword the line. — applied 2026-10-11: The drift report says a file that is present but no longer parses 'failed to parse' and shows the new failure, instead of 'missing'; a test covers it.
- [x] [Review][Patch] `boardLayout` duplicates core's §4.1 thresholds and its "obsolete" branch is unreachable [packages/runner-headless/src/dump/formats.ts:186] — build it from `BOARD_VECTOR_MINOR`/`PRE_VECTOR_MINOR_MIN`/`PRE_VECTOR_MINOR_MAX` and fix the doc comment. — applied 2026-10-11: `boardLayout` takes its thresholds from core's `BOARD_VECTOR_MINOR`, `PRE_VECTOR_MINOR_MIN` and `PRE_VECTOR_MINOR_MAX`, and its comment is corrected. The 'obsolete' outcome is reachable (minor 0 and 1, which an existing test asserts), so the branch stays.
- [x] [Review][Patch] The CI comment describes `--json` while the step runs `dump:check` [.github/workflows/ci.yml:60] — reword it to name `pnpm dump:check`. — applied 2026-10-11: The comment now names `pnpm dump:check` and says what it compares: the dump's JSON report against the committed `golden/legacy-corpus.json`.

**Rejected**
- blind-hunter: The expectation records no skipped files, skip reasons or warnings — low: the gate is deliberately a counts-and-digest model-drift reference over a SHA-pinned corpus, so gating warnings/reasons would widen the committed schema for no reachable drift.
- blind-hunter: `FormatError.path` is thrown away — low: the entry's own `path` is printed in the human line and present in JSON, so nothing is lost to the user.
- blind-hunter: The digest ignores Map/Set/Date/ArrayBuffer/DataView and symbol keys — low: no reader can return those (G1/G2); only the `digest.ts` docstring's TypeError claim is wrong, and a guard would be dead code.
- blind-hunter: A `Uint8Array` and its hex string digest identically — low: separating them needs a type tag in every digest field, for a hypothetical type change.
- blind-hunter: Image digests cover pixels but not dimensions — low: width/height are derived from the same bytes, so a same-length mislabel is contrived.
- blind-hunter: A FIFO/socket/device node is reported as a symbolic link — low: such a node cannot occur in a fetched fixture, and the mislabel is cosmetic.
- blind-hunter: `countLines` miscounts CR-only files and says "1 bytes, 1 lines" — low: CR-only is not a real legacy encoding and the grammar is a skipped file's detail.
- blind-hunter: `parseExpectation` does not check internal consistency — low: it only bites a hand-edited expectation, which `--record` documents against.
- blind-hunter: `USAGE` is unreachable and the `golden` messages lost their prefix — low: no `--help` was specified, the messages must be subcommand-neutral now, and the only fix would be to the plan's own wording.
- blind-hunter: The determinism criterion is tested vacuously and flags swallow the next argument — low: the criterion holds by construction and `dump --check --json` fails loudly.
- edge-case-hunter: A symlinked game folder is omitted by `--record` but refused by `--check` — low: contrived, the refusal is loud, and agreeing the two paths is a policy choice.
- edge-case-hunter: A control character splits a report line — low: it degrades only the human rendering of a legacy string; the JSON report and gate are unaffected.
- edge-case-hunter: `compareGame`/`driftLines` compare only digests and counts — low: same root cause as the warning/reason item; the counts check is included and there is one caller.
- intent-alignment: The "no-reader-yet" skip rows are unexercised — low: an unknown extension is also a skip, so these rows only change the reason's wording.
- intent-alignment: The gate omits the readable surface — low: the plan makes the rendering a debugging aid, not the gate's subject.
- intent-alignment: The expectation is a snapshot, not an independent oracle — false: the plan's Design Notes define it as a drift reference, so the described property is the intended design.
- intent-alignment: The digest is over a normalised model — false: the hex fold and `undefined` drop are documented in `digest.ts`, the plan and the digest tests.

### Round 2 — 2026-10-13

**Code review (round 2, independent reviewer `review-r3-package-ci`).** Verdict: PASS WITH FINDINGS. 2 live findings (1 MINOR, 1 unverified risk). The first pass ran against a stale checkout (`3ec2ab9`) and was re-baselined against `origin/main` (`9d4d336`): F1 (`.bmp`/`.gif` failing the dump) was already fixed by round 1 (`93efb03`), so it is rejected as stale. Open (needs the plan owner): the acceptance text says "demo 29 parsed, 45 digests" while the committed `golden/legacy-corpus.json` and the live gate say 30 parsed / 46 digests — left unchanged under the frozen-intent rule. Deferred and recorded in `deferred-work.md`: the digest reproducibility is proven on Node 26.8.1 only, while CI pins 24.21.0. Round 1 above is unchanged.
