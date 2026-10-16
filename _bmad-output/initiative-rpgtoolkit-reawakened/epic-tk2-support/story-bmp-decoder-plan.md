---
title: 'BMP decoder'
type: 'feature'
ticket: '11'
created: '2026-10-15'
status: built
baseline_revision: '3509ec22bc67524ceaf142724245cf7e254f14db'
route: 'full'
route_source: 'auto'
risk: 'medium'
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/adr/0007-docs-spec-is-the-normative-specification.md', '{project-root}/docs/format-spec.md', '{project-root}/docs/spec/formats/README.md', '{project-root}/packages/core/src/formats/image/index.ts', '{project-root}/packages/core/src/formats/registry/core-decoders.ts']
---

<frozen-after-approval reason="human-owned intent — do not modify unless the human renegotiates">

## Intent

**Problem:** BMP is the dominant picture format of the Toolkit 2 era. `docs/format-spec.md:1402` rules it **"Owed a reader"** — 178 files in the 25 community games, 18 in four of the six TK2 games, 271 script references, and one of the board-image export targets (T-32, `docs/editor-features.md:92`) — and `docs/format-spec.md:1407` says the rebuild "adds BMP and GIF readers". `core` has neither: `packages/core/src/formats/image/index.ts:51-64` dispatches PNG and JPEG only, and `packages/runner-headless/src/dump/formats.ts:74` skips every `.bmp` with "no decoder in core yet". So no TK2 game that ships a bitmap can load, and the epic's Done-when 1 (0 failures, 0 residue) cannot be reached.

**Approach:** Add `packages/core/src/formats/image/bmp.ts` behind the one entry `decodeTexture` (AD-28), dispatched by the `BM` signature and the `bmp` extension, returning the same straight RGBA `DecodedTexture` (top row first, `w × h × 4`) and the same located-error and 100-megapixel refusal contract the PNG and JPEG decoders already keep. Register it in the image decoder of the core format registry (AD-31) and move the dump's `.bmp` row from skipped to parsed. Because `docs/` states BMP's *ruling* but nowhere its *layout*, the first commit is doc-first (G7 rule 4): a BMP section in the normative spec, written from the public Microsoft layout and checked against the archive's real files, before any code.

## Boundaries & Constraints

**Always:** Implement from the new docs section; write that section first, in its own commit, and cite it from the code. Return straight RGBA — the file's own colours and its own alpha, no colour key applied (the key belongs to whatever blits the image, `docs/format-spec.md:1338`). Return a located `FormatError` (path, offset, section, message) and never throw (AD-18); take the pixel cap and the refusal-at-offset contract from §10.1 (`docs/format-spec.md:1342`). Check the claimed geometry against the bytes that remain before allocating anything, the way §1.2 requires for counts (`docs/format-spec.md:46`) and `png.ts:232-233`/`jpeg.ts:538-541` do for dimensions. Keep `core` free of DOM, Node, I/O and timers (G2) and add no runtime dependency (G6). Test with hand-built byte arrays and committed authored fixtures; never with a writer this entry adds, and no writer is added. Cite the new section as `docs/spec/formats/images.md#windows-bitmap-bmp` from code and tests.

**Never:** Apply a colour key, premultiply, or invent alpha the header does not define silently. Change `golden/legacy-corpus.json`, or run `pnpm dump:record` / `pnpm golden:record` (G5). Commit a game from the fetched corpus or from the local archive. Touch `docs/format-spec.md` (ADR 0007 decision 6: nothing is added to it). Implement a BMP *writer* (T-32's export is the editor's, not this entry's). Read `../rpgtoolkit` (G7).

## I/O & Edge-Case Matrix

Rows marked **Proposed (needs owner)** are the plan's answer where no document decides; the owner rules at the plan checkpoint.

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| 24-bit BI_RGB, bottom-up | Caoquest `Bitmap/mwin.bmp` (600×100, stride 1800, 180 054 bytes) | 600×100 straight RGBA, 240 000 bytes, top row taken from the file's last stored row; alpha 255 everywhere | — |
| 24-bit row padding | Caoquest `Bitmap/slash.bmp` (159×127, stride 480 = 477 + 3 pad) | The 3 padding bytes of each row are skipped, never read as pixels | — |
| 1-bit BI_RGB | ChimeranEmpire `Bitmap/Help Button.bmp` (720×354, `biClrUsed` 0, 32 630 bytes) | Two palette entries, 8 pixels per byte, high bit first, alpha 255 | — |
| 8-bit palette | archive `PipBoy2000/Bitmap/MenuBack.bmp` (640×480) and `llamachat/logo.bmp` (200×80) | `biClrUsed` 0 means `2^8` entries; a file that declares fewer is read from its declared count | — |
| 4-bit BI_RGB | Hand-built: 2 pixels per byte, high nibble first | 16-entry palette; alpha 255 | — |
| Top-down | Hand-built: `biHeight` negative (public layout: magnitude is the height, rows stored top-first) | Rows are copied in file order, no flip | — |
| 8-bit RLE8 (compression 1) | Hand-built: runs, an absolute run of odd length (padding byte), end-of-line, end-of-bitmap, and a delta escape | Decoded rows match the equivalent uncompressed image | A run past the row end, a delta outside the image, or a stream that ends without end-of-bitmap is a located error |
| 32-bit BI_RGB | Hand-built | Straight RGBA with alpha 255 — the header defines no alpha for BI_RGB | — |
| Trailing bytes | Bytes after the last pixel row | Ignored (an image has no residue model) | No warning |
| Wrong signature | First two bytes are not `BM` | Refused by the dispatcher at offset 0, because `decodeTexture` chooses the kind by signature | Located error, `format-spec §10` |
| Wrong DIB header | DIB header size other than 40 | Refused, naming the size read | Located error at offset 14 |
| Zero dimension | `biWidth` or `biHeight` is 0 | Refused before any allocation | Located error at the field's offset |
| Oversized | `abs(biWidth) × abs(biHeight)` above 100,000,000 | Refused, allocation not attempted | Located error naming both numbers |
| Geometry past EOF | `bfOffBits + stride × abs(biHeight)` greater than the file | Refused before allocating the RGBA buffer, naming the bytes that remain | Located error at the pixel-array offset |
| Short palette | Palette bytes between the DIB header and `bfOffBits` fewer than the indices need | Refused | Located error at the first missing palette entry |
| Unsupported variant | Planes ≠ 1; bit count outside the supported set; compression other than 0 (or 1 at 8-bit); compression 3/4/5 (BITFIELDS / JPEG / PNG) | Refused, naming the field and its value | Located error at the field's offset |
| Truncated / corrupt | Every truncation and every one-byte change of a valid file | Always a `Result`, never a throw | Located error |
| Dump row | A project holding `Bitmap/x.bmp` | Classified `data`/`image`, parsed, summarised as `image bmp W×H (N RGBA bytes)` and digested over the RGBA | An unsupported or damaged `.bmp` is now a dump **failure**, not a skip (§10.4 refuses rather than approximating) |
| Registry | `byExtension("bmp")`, `byExtension("BMP")`, `byHeader(BM)` | The image decoder each time | — |
| **Support boundary** | Which BMP kinds this reader decodes | **Proposed (needs owner):** uncompressed BI_RGB at 1, 4, 8, 24 and 32 bits, plus 8-bit RLE8, with a 40-byte DIB header and one plane; everything else refused with a located error. Evidence: the archive's 343 BMPs are 340 × 24-bit and 3 × 8-bit BI_RGB with a 40-byte header, plane 1, positive height and compression 0 — except the two TK2 files that matter, one 24-bit and one **1-bit**. No 4-bit, no 32-bit, no RLE and no other header exists in the archive. Alternative: support exactly the corpus-proven set (1, 8, 24) and refuse 4-bit, 32-bit and RLE, which is less code but leaves community art and T-32 export unreadable | — |
| **32-bit alpha** | `biBitCount` 32, compression 0 | **Proposed (needs owner):** alpha 255 for every pixel, because the header defines no alpha channel for BI_RGB and `docs/format-spec.md:1338` promises the file's own alpha, "nothing added". Alternative: read the 4th byte as alpha (Pillow's and GDI's behaviour differ), or refuse 32-bit BI_RGB outright. No archive file is 32-bit, so the corpus cannot settle it | — |
| **Where the layout lives** | The doc-first commit's target | **Proposed (needs owner):** a new page `docs/spec/formats/images.md` whose BMP heading is "Windows bitmap (`.bmp`)" (anchor `#windows-bitmap-bmp`), added to the index row `docs/spec/formats/README.md:24`. Alternative: wait for ticket 2.23 to migrate `docs/format-spec.md` §10 into `docs/spec/formats/` and append the BMP section there (that adds 2.23 to this entry's `after`). Adding to `docs/format-spec.md` is not an option: ADR 0007 decision 6 freezes it | — |
| **The 18-file gate** | The entry's verify clause "The 18 BMP files of the six TK2 games decode to their stated dimensions and a golden RGBA digest" | **Proposed (needs owner):** this entry cannot gate on those files. `tools/fixtures/sources.json:1-7` pins only `demo` and `Basic` from a git source, and their `Bitmap\` holds `bkg.jpg`, `layout.png` and `mwin.jpg` with no BMP (`golden/legacy-corpus.json:11-13`); the six TK2 games are ticket 16.9's fixtures and their fetch source and hashes are 16.9's open unknown. Proposed: this entry proves the decoder on committed authored fixtures, hand-built arrays and a throwaway cross-check against the archive copies, and 16.9 records the real digests in the corpus gate. Alternative: expand `tools/fixtures/sources.json` here and pin the games now (rejected: 16.9 owns it, and the fetch tool takes only a git source) | — |

</frozen-after-approval>

## Code Map

**The ruling (what BMP is to the project).** `docs/format-spec.md:1402` — the BMP row of the §10.4 table: "**Owed a reader.** It is the dominant TK2-era picture format, so a reader belongs beside the PNG and JPEG ones, chosen by the `BM` signature", with the counts (178 files / 18 TK2 files / 271 script references). `docs/format-spec.md:1407` — "The rebuild … adds BMP and GIF readers as above, and refuses anything else with a located error rather than approximating a picture". The ruling was made by ticket 2.19, whose ticket (epic-legacy-formats, id 19) is `done`.

**The layout (what no document states today).** `grep -rin bmp docs/spec/` returns three hits, none of them a layout: `docs/spec/formats/README.md:24` (an index row calling images "third-party formats, used as-is"), and two byte-runs inside `docs/spec/examples/files/*.tpk` where a `.bmp` name happens to appear. `docs/format-spec.md` §10 (`:1324-1408`) rules the kinds, the shared contract (`:1336-1342`) and the PNG/JPEG structures (`:1344-1392`) — no BMP header, bit depth, palette, row order or padding anywhere. That absence is why the doc-first commit exists.

**The shared contract to keep.** `docs/format-spec.md:1338` — straight 8-bit RGBA, `width × height × 4`, row-major, top row first, no key applied. `docs/format-spec.md:1340` — the kind is chosen by signature and every defect is a located error carrying path, offset and section, "never a throw and never a plausible wrong picture". `docs/format-spec.md:1342` — both readers refuse a zero dimension and more than 100,000,000 pixels, and the allocation is not attempted past that limit. `docs/format-spec.md:46` (§1.2) — an untrusted count is checked against the bytes that remain before anything is reserved.

**The corpus, measured 2026-10-15 (read-only, `~/projects/rpgtoolkit-archive`).** The 307 zip archives and the loose corpus hold 343 `.bmp` files: **340 × 24-bit BI_RGB, 3 × 8-bit BI_RGB**; every one a 40-byte DIB header, plane 1, compression 0, positive height, `bfSize` and `biSizeImage` consistent with the file. No RLE, no 4-bit, no 32-bit, no top-down, no BITMAPCOREHEADER/BITMAPV4/V5. Inside the six TK2 games I can reach, **17 BMPs**: Caoquest 15 (all 24-bit; `mwin.bmp` 600×100 = the menu window, `slash.bmp` 159×127 with a padded stride of 480, `Mbubble.bmp` 647×124), School2Demo `Bitmap/New Bitmap Image.bmp` (114×30, 24-bit) and ChimeranEmpire `Bitmap/Help Button.bmp` (**720×354, 1-bit**, 62-byte palette offset, stride 92). FinalDestiny and LittleMan hold none; BusDriver is absent from the local archive. So a **1-bit** file is a live requirement, and §10.4's count of 18 in four games could not be fully reproduced here (17 found in three games) — the exact set and count are 16.9's to pin, and the new docs page should carry the count it verifies.

**The docs target.** `docs/spec/formats/README.md:24` — the index row to change. `docs/spec/formats/README.md:28-46` — the primitive-encoding table (`short` is signed little-endian, `int` is 4-byte little-endian) the new page is written in. `docs/spec/formats/README.md:52-54` — "Counts are usually upper bounds", the convention the page distinguishes BMP from. A BMP is not a Toolkit file, so the new page states the Microsoft layout as public knowledge and cites the archive files as its evidence (ADR 0007 decisions 2 and 3); nothing comes from the legacy source, so no ADR 0006 extraction round applies.

**The code to change.**
- `packages/core/src/formats/image/index.ts` — `:25` the PNG signature, `:28` the JPEG signature, `:51-62` `decodeTexture`'s dispatch and its "unrecognised image signature" message; the entry exports `decodeTexture` and `DecodedTexture` only (AD-22), so the new decoder stays internal.
- `packages/core/src/formats/image/model.ts:17-29` — `DecodedTexture`, the type both decoders return.
- `packages/core/src/formats/image/png.ts:39, 232-233` and `jpeg.ts:34, 538-541` — `MAX_PIXELS = 100_000_000`, the zero-dimension and oversize refusals, and `fail(offset, message, path)`; the house shape for a located error.
- `packages/core/src/formats/registry/core-decoders.ts:57, 60, 79` — the signature constants and `startsWithBytes`; `:224-230` the `image` entry (`extensions: ["png", "jpg", "jpeg"]`, `detect` over the two signatures) to extend with `BM`.
- `packages/runner-headless/src/dump/formats.ts:63-75` — the skip table and the comment that says BMP has no decoder; `:128-137` `classify`, which routes a registered extension to the registry on its own. `packages/runner-headless/src/dump/parse.ts:218-229` — the `image` case, which already summarises and digests any image the registry decodes (`:60-66`, digest over the RGBA bytes), so it needs no change.
- Tests: `packages/core/test/format-image.test.ts:399-407` (an unknown signature — its sample is a 4-byte `BM` file today, which this entry makes a *BMP* file); `packages/core/test/format-registry.test.ts:152-165` (`CORE_HEADERS`, one header per decoder), `:172-183` (every declared extension resolves, upper- and lower-case), `:208-220` (`READERS`); `packages/runner-headless/test/dump.test.ts:418-439` (asserts `.bmp` is skipped and that a 2-byte `BM` file is a skip); `packages/core/test/format-image-jpeg.test.ts:1-10` — the house header comment for a decoder's own test file.
- Fixtures: `tools/fixtures/author/generate.mjs:76-92` (the `AUTHORED` table) and `:155-170` (`authoredFixtures()`), which writes bytes from the docs layouts and imports no `core` code; `CONTRIBUTING.md:27-37` describes what `packages/core/test/fixtures/authored/` holds. `packages/core/test/fixtures/authored/detail4.tst` is how a test reaches a committed non-writer input (`format-registry.test.ts:200-207` explains why).
- No golden change: `golden/legacy-corpus.json:11-13` covers `Bitmap/bkg.jpg`, `layout.png`, `mwin.jpg` only, under the `demo` and `Basic` keys.

## Tasks & Acceptance

**Execution:**
- [ ] `docs/spec/formats/images.md` (new) — the doc-first commit (G7 rule 4): the BMP layout (file header `BM`, `bfSize`, `bfOffBits`; a 40-byte DIB header; `biWidth`/`biHeight` as signed little-endian with a negative height meaning top-down; plane 1; bit counts 1/4/8/24/32; compression 0 and, at 8 bits, 1 (RLE8); the palette and `biClrUsed`; the 4-byte-padded stride; the bottom-up row order; how each depth's pixels pack), the supported set and every refusal as a **Reawakened rule** block (ADR 0007 decision 2), the shared decode contract of §10.1 restated in `docs/spec` terms, and the evidence line naming the archive files with their count
- [ ] `docs/spec/formats/README.md:24` — index the new page and stop calling `.bmp` a third-party format used as-is
- [ ] `packages/core/src/formats/image/bmp.ts` (new) — `decodeBmp`, following `png.ts`'s shape: constants, a `fail()` helper, the geometry check against the remaining bytes, then the RGBA buffer
- [ ] `packages/core/src/formats/image/index.ts` — the `BM` signature, the third dispatch branch, and the "unrecognised image signature" message; keep the exports to `decodeTexture` and `DecodedTexture`
- [ ] `packages/core/src/formats/registry/core-decoders.ts:224-230` — add `"bmp"` to `extensions` and the `BM` test to `detect`
- [ ] `packages/runner-headless/src/dump/formats.ts:66-75` — remove the `bmp` skip row and the comment clause that names it (the `gif` row stays for 16.12)
- [ ] `packages/core/test/format-image-bmp.test.ts` (new) — the matrix above: the depths, the padding, top-down, RLE8, the palette counts, and one case per refusal; the truncation and one-byte-change loop of `format-image.test.ts:739` over a valid BMP
- [ ] `packages/core/test/format-image.test.ts:399-407` — give the unknown-signature case a signature that is genuinely unknown, now that `BM` dispatches
- [ ] `packages/core/test/format-registry.test.ts:152-165, 208-220` — a `BM` header case for the `image` id, plus a BMP fixture among the samples
- [ ] `packages/runner-headless/test/dump.test.ts:418-439` — `.bmp` classified `data`, a valid BMP parsed, a truncated BMP a failure; the name and the `.gif` assertions of that test updated
- [ ] `tools/fixtures/author/generate.mjs:76-92, 155-170` and `packages/core/test/fixtures/authored/` — three authored BMPs (24-bit, 1-bit, RLE8), written from the new docs section with no `core` import, and the list in `CONTRIBUTING.md:27-37` extended

**Acceptance Criteria:**
- Given a 24-bit BI_RGB file whose stride is padded, when decoded, then `w`, `h` and `rgba.length` are the header's, the padding bytes are not pixels, and a second decode is byte-identical (G3).
- Given the committed 1-bit authored BMP and the archive's 1-bit file in the throwaway check, when decoded, then the two palette colours and the high-bit-first packing match the section's description.
- Given an RLE8 stream with a run, an odd-length absolute run, and end-of-line/end-of-bitmap escapes, when decoded, then the pixels equal those of the equivalent uncompressed image; given a run past the row end or a stream with no end-of-bitmap, then the result is a located error.
- Given `biHeight` negative, when decoded, then the top row of the result is the first stored row.
- Given a zero dimension, a plane count other than 1, a bit count outside the supported set, an unsupported compression, a DIB header other than 40 bytes, or a `bfOffBits` past the end of the file, when decoded, then each is an `ok: false` `FormatError` with the section `format-spec §10` and the offset of the offending field.
- Given a 100,000,001-pixel header, when decoded, then the refusal happens before the RGBA allocation is attempted, and the message names both dimensions.
- Given every truncation and every one-byte change of a valid BMP, when decoded, then each returns a `Result` and never throws.
- Given a project holding a `.bmp`, when `pnpm dump <project>` runs, then the file is listed as parsed with its dimensions and RGBA length (not skipped), and `pnpm dump:check` still matches `golden/legacy-corpus.json` untouched.
- Given the throwaway check over the extracted Caoquest, School2Demo and ChimeranEmpire bitmaps, when each is decoded and compared with Pillow's pixels for the same file, then the RGB channels agree for every 24-bit and 8-bit file (1-bit compared on palette indices), and each file's dimensions equal the header's.
- Given ticket 16.9's fixtures, when the six TK2 games are dumped, then their BMPs parse and their digests are recorded there — not here.

## Implementation Notes

- **Doc-first, and why it is a prerequisite, not a courtesy.** G7 rule 4 requires that a layout exist in `docs/` before code implements it, and the archive evidence that would justify any specific reading lives outside the repository. BMP is a public Microsoft format, so the section is authored rather than extracted: the layout is public knowledge, and the *support boundary* plus the alpha policy are our own rules, marked **Reawakened rule** per ADR 0007 decision 2. The evidence line cites the archive files by count, the way ADR 0007 decision 3 asks.
- **Ruled (Jensen, 2026-10-15): all four points approved.** Support boundary is uncompressed 1/4/8/24/32-bit `BI_RGB` + 8-bit `RLE8`; 32-bit alpha is 255; layout doc is `docs/spec/formats/images.md#windows-bitmap-bmp`; verification gates on authored BMPs with 16.9 recording corpus digests. No open points remain; plan is `ready-for-dev`.
- **The entry's verify is satisfied in two of its three clauses.** Malformed and oversized files refused with a located error, and the other decoders still passing, are this entry's. The 18-file digest clause is deferred to 16.9 as proposed above; if the owner rules otherwise (expand the fixture fetch here), the entry gains that work and the plan is amended.
- **No writer, no dependency, no golden.** `decodeTexture` takes bytes and returns pixels; nothing needs to write a BMP (T-32 export is the editor's), so no library and no new `core` dependency is involved (G6 stays untouched, and `pnpm lint`'s core dependency check should not move). `golden/legacy-corpus.json` digests only `demo` and `Basic`, whose `Bitmap\` holds no BMP, so `pnpm dump:record` is not run here; when 16.9 adds the TK2 games, recording their digests is that entry's deliberate act (G5, `CONTRIBUTING.md:114`).
- **A consequence worth naming.** Once `.bmp` is a registered extension, `classify` (`packages/runner-headless/src/dump/formats.ts:128-137`) routes every project bitmap to the registry, so a BMP we refuse becomes a *failure* rather than a skip. That is §10.4's "refuse rather than approximate" applied to the dump, and every BMP the corpus actually holds fits the supported set; the alternative (keep skipping unsupported variants) would hide a damaged game file, so it is not taken.
- **Entry 3 does not cover this.** This entry's `after` includes ticket 3 (the TK2 format-spec amendment), but that ticket's scope is the text forms, the `.gam 2.2`/`.tem 3–4` binary minors, `.tan`/`.gph v2`/`.fnt` and the TST palette; it says nothing about images, so the BMP section is this entry's own doc commit and the `after: 3` edge is scheduling only. Ticket 2.23 is the ticket that moves `docs/format-spec.md` §10 into `docs/spec/formats/`; if the owner rules that the BMP page waits for it, this plan's doc task becomes an append there.
- **What 16.8 and 16.10 inherit.** 16.8 ("Register the TK2 decoders in the format registry") covers the entry 4–7 readers; the image decoder is already registered by 2.3 and this entry adds `bmp` to it, so 16.8 has nothing to do for BMP. 16.10's sweep picks up anything the review defers. 16.12 (GIF) edits the same three places — `image/index.ts`, the registry's `image` entry and the dump's skip table — so the two entries should land apart or be rebased onto each other.

## Plan Change Log

- 2026-10-15 — initial plan, from ticket 16.11, the epic file, `docs/format-spec.md` §10 and §1.2, the landed PNG/JPEG decoders, the registry, the dump and the test conventions. Measured the archive corpus read-only (343 BMPs; 17 across three of the six TK2 games) to settle which depths are real. Four OWNER points recorded (support boundary, 32-bit alpha, doc placement, the 18-file gate), which is why the status is `draft` even though the ticket carries `hitl = false`: two of them change the decoded bytes and two change scheduling and the entry's verify text.
- 2026-10-15 — owner approved all four points (support boundary, 32-bit alpha, doc location, fixture verification); plan is `ready-for-dev`.

## Design Notes

Order of work: the docs section first (it fixes the palette, stride and refusal wording the code and the tests quote); then the decoder against hand-built arrays for the small depths and RLE8, and against the archive's real files in a throwaway check; then the committed authored fixtures and the dispatch/registry wiring, so `pnpm dump` shows a `.bmp` parsed; then the dump and registry tests; then `pnpm dump:check` last, where an unchanged golden is the proof that nothing about the 3.1 corpus moved.

## Verification

**Commands:**
- `pnpm typecheck && pnpm test && pnpm lint && pnpm graph && pnpm provenance && pnpm licence` — expected: all pass.
- `pnpm fixtures:author:check` — expected: the committed BMP fixtures match a fresh run byte for byte.
- `pnpm fixtures:fetch && pnpm test:strict && pnpm dump:check` — expected: pass with `git diff golden/` empty.
- `pnpm dump <an extracted TK2 game>` — expected: exit 0, every `.bmp` listed as parsed with its dimensions, none skipped.
- Throwaway, not committed: for the archive's 24-bit, 8-bit and 1-bit bitmaps (Caoquest, School2Demo, ChimeranEmpire), compare `decodeTexture`'s pixels with Pillow 12.3.0's for the same file — expected: the same dimensions and the same RGB bytes; Pillow is already a docs-tools dependency (`docs/spec/tools/README.md`, `render.py`).

**Manual checks:**
- Read `packages/core/src/formats/image/bmp.ts` beside `docs/spec/formats/images.md#windows-bitmap-bmp` and confirm every field, offset and refusal in the code is stated in the page, and that the page's supported set matches the matrix.
- Confirm the new page is reachable from `docs/spec/formats/README.md` and from `docs/spec/README.md`'s formats row, and that no link is broken.
- Confirm `grep -rn "format-spec §10" packages/core/src/formats/image/bmp.ts` cites the section the other two decoders cite, until 3.28 re-points citations.
