---
title: 'Texture decoders: PNG and JPEG'
type: 'chore'
ticket: '3'
created: '2026-10-11'
status: 'done'
baseline_revision: '44fb20fae368e4a5d06c5039ca9ad73ddfa97f1c'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 1
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/format-spec.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/epic-legacy-formats/discovery/decoders-and-containers.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 2 reads a dozen legacy formats, and two of the file kinds a game shows — `.png` and `.jpg` under `Bitmap/` (format-spec §10) — are compressed pictures, not record structures. Nothing in `core` can turn their bytes into pixels. If each runner decodes for itself, scripts, the rasteriser, the headless goldens and the editor can disagree about what an image contains, and colour-key comparisons drift (AD-28).

**Approach:** Add `packages/core/src/formats/image/` with `decodeTexture(bytes, ref?) -> Result<DecodedTexture>` (AD-28), the one place a game image becomes straight RGBA. The format is chosen by signature. PNG is hand-written — the five filters, palette and `tRNS` expansion and Adam7 de-interlacing — on `fflate`'s synchronous `unzlibSync` (AD-6). JPEG is hand-written too: the baseline sequential decoder (SOF0, 8-bit, Huffman, dequantise, IDCT, 4:2:0 upsample, YCbCr→RGB) after `jpeg-js` failed the ticket's library test. An unsupported or damaged file is a located `FormatError`, never a wrong picture.

## Boundaries & Constraints

**Always:** `core` stays pure (G2): no DOM, no Node, no `Buffer`, no `process`, no timers, no other workspace package. Only `fflate/browser` and only its synchronous APIs (AD-6). Determinism (G3): only the allowlisted `Math` members, no `**`, no `Date`/`Intl`/`Math.random`; the JPEG IDCT runs over `+ - * /` in a fixed order. Every implementing file names its `docs/format-spec.md` section (G7). One public entry per package (AD-22). `kebab-case.ts` files, `PascalCase` types, `camelCase` functions. Readers return `Result` and never throw (AD-18).

**Never:** add a devDependency, commit fixture data, touch the legacy GPL source, or edit `golden/**`.

</frozen-after-approval>

## Tasks & Acceptance

**Execution:**
- [x] `packages/core/src/formats/image/model.ts` — `DecodedTexture { width, height, rgba }`, fresh non-aliasing `width*height*4` straight RGBA — AD-28.
- [x] `packages/core/src/formats/image/crc32.ts` — the PNG CRC-32 (reflected `0xEDB88320`), so a flipped bit in `IHDR`/`PLTE` is a located error.
- [x] `packages/core/src/formats/image/png.ts` — `decodePng`: chunk walk with CRC checks, `IHDR` validation, `PLTE`/`tRNS`, `IDAT` concatenation and `unzlibSync`, filter types 0–4, palette and colour-key alpha, sub-byte and 16-bit samples, Adam7 — format-spec §10.
- [x] `packages/core/src/formats/image/jpeg.ts` — `decodeJpeg`: marker walk, DQT/DHT/DRI/SOF0/SOS, canonical Huffman decode with restart intervals, dequantise, separable float IDCT over literal basis constants, nearest-neighbour chroma upsampling, YCbCr→RGB (component copy for an Adobe RGB transform) — format-spec §10.
- [x] `packages/core/src/formats/image/index.ts` — `decodeTexture`: signature detection (PNG `89 50 4E 47 0D 0A 1A 0A`, JPEG `FF D8 FF`), an unknown signature is a located error at offset 0.
- [x] `packages/core/src/formats/index.ts` — re-export the image module alongside the existing readers.
- [x] `packages/core/package.json`, `packages/core/dependency-allowlist.json` — `fflate` 0.8.3 as core's first allowlisted runtime dependency (AD-6); `THIRD_PARTY_NOTICES` gains the MIT text (G6 rule 3).
- [x] `packages/core/test/format-image.test.ts` — synthetic PNGs for each filter, sub-byte and 16-bit samples, palette+`tRNS`, two Adam7 known-answer streams, and located failures; plus the fetched sample images.
- [x] `tickets.toml` entry 3 — corrected `core/format/image` to `core/formats/image` (the directory AD-6/AD-28 name; a typo, as in entry 1).

**Acceptance Criteria:**
- Given a PNG of any colour type and listed bit depth, the decode widens, palette-expands and de-interlaces it to exact straight RGBA.
- Given each of the five filter types, a hand-worked filtered stream decodes to the known raw image.
- Given an interlaced palette PNG with `tRNS`, transparent entries yield alpha 0 and opaque ones 255.
- Given an unknown signature, a truncated `IHDR`/`IDAT`, a broken zlib stream, an unlisted colour type/bit depth/interlace, or a palette index outside `PLTE`, the result is `ok: false` with `offset` at the offending field and `section` `format-spec §10`, and nothing throws.
- Given the fetched fixtures, `layout.png`, `bkg.jpg` and `mwin.jpg` decode to 640×480, 640×480 and 600×100 with `rgba.length === w*h*4`, and decoding the same bytes twice is byte-identical.

## Implementation Notes

- **Layout.** The directory is `packages/core/src/formats/image/` (AD-28 writes `core/formats/image`); `tickets.toml` had the singular `core/format/image`, the same typo entry 1 fixed. Corrected here.
- **JPEG decision: hand-written, not `jpeg-js`.** The ticket allowed the library only if (i) its shipped types need no Node/DOM globals, (ii) the used code path touches no host global at runtime, and (iii) its licence passes G6. (iii) passes — `jpeg-js` 0.4.4 is BSD-3-Clause (Bronze). (ii) is satisfiable — `useTArray: true` avoids `Buffer.alloc`, and `decode` resets its own module-level memory counter per call. **(i) fails, and that decides it.** `jpeg-js` ships `index.d.ts` naming Node's `Buffer`: `type BufferRet = RawImageData<Buffer>` and `type BufferLike = Buffer | Uint8Array | …` (lines 7 and 11). `core` compiles with `"lib": ["ES2022"], "types": []`, so `Buffer` is undefined; a probe translation unit importing `jpeg-js`, compiled with core's options but `skipLibCheck: false`, reports exactly:
  `node_modules/jpeg-js/index.d.ts(7,31): error TS2591: Cannot find name 'Buffer'. …`
  `node_modules/jpeg-js/index.d.ts(11,19): error TS2591: Cannot find name 'Buffer'. …`
  It only type-checks today because `tsconfig.base.json` sets `skipLibCheck: true`, i.e. by suppressing the error inside the dependency's own declarations — a fragile base for a package guard-rail G2 calls out. There is no separate `@types/jpeg-js` to use instead: npm's `@types/jpeg-js` 0.3.7 is a deprecated stub pointing back at the package. Two further facts push the same way: `jpeg-js` is CommonJS (`module.exports = decode`, `require('./lib/encoder')`) with a `window['jpeg-js']` fallback branch, and it holds module-level state. The trade-off is real and accepted: roughly 600 lines of our own decoder, in exchange for no Node type dependency, no CJS/`window` branch, no module state, full control of the evaluation order, and progressive JPEG (`SOF2`) explicitly reported rather than silently mishandled.
- **JPEG correctness.** The IDCT is separable over `+ ·` with the 1/4 folded into the 1-D basis, whose 64 values are **literal constants**: `Math.cos`/`Math.PI` are outside G3's allowlist, and literal doubles are identical on every engine. Rows then columns in a fixed order, `Math.round` then clamp. Cross-checked against Pillow (an independent decoder) on the fixtures: `bkg.jpg` 86.52 % of pixels byte-identical, 99.02 % within ±2, 0.17 % differing by more than 4 (all at chroma edges, where Pillow's fancy upsampling and a different IDCT differ); `mwin.jpg` 99.83 % within ±2, none above 4. Alpha is 255 everywhere. That is the signature of a correct decode, not of a wrong transform (which would skew the whole image).
- **PNG correctness.** Cross-checked against Pillow: `layout.png` decodes **byte-for-byte identically**, which pins the filters, the 250-entry palette and the Adam7 de-interlace against an independent implementation.
- **`fflate` is lenient.** Its `unzlibSync` throws on a bad zlib header but returns short (even empty) output for a truncated body. The decoder therefore checks the inflated length against the layout the header implies and reports a mismatch, so a short stream is a located error rather than a short image. Both branches are tested.
- **PNG chunk order.** `IHDR` is read on its own before the walk of the remaining chunks, so a wrong `IHDR` payload length is reported as "IHDR is N bytes" rather than as a broken walk further on.
- **What "the palette PNG's transparent index" turned out to be.** The ticket expected the fixture's palette PNG to yield alpha 0 somewhere. It cannot: `layout.png` carries `IHDR, tIME, pHYs, PLTE, IDAT, IEND` and **no `tRNS`** (its 250 palette entries are all used, indices 0–249, none reserved), so an RGBA decode is fully opaque — format-spec §10 makes transparency a per-image colour key stored outside the PNG, and `decodeTexture` has no key parameter. The transparent-index path is therefore proved by a synthetic palette + `tRNS` PNG and by a second synthetic interlaced palette test; the fixture test asserts alpha 0 *if and only if* the file declares a `tRNS`, so it stays honest and still covers a replacement fixture that carries one.
- **Sub-byte and 16-bit samples.** Depth 1/2/4 scale by 255/85/17 (exact); depth 16 uses `floor(v / 257)`, the exact inverse of the spec's `v * 257`, so 65535 maps to 255 with no rounding error.
- **Colour types.** 0, 2, 3, 4 and 6 at their permitted depths are all decoded; a pairing the spec does not define is a located error at the `IHDR` field, as are a non-zero compression/filter method and an interlace byte other than 0 or 1.

## Plan Change Log

- 2026-10-11 — initial plan: the JPEG decision recorded with its evidence; the fixture's missing `tRNS` recorded; `IHDR` read before the chunk walk; the inflate-length check added after probing `fflate`'s short-output behaviour.

## Review Triage Log

## Design Notes

- **No host global and no module state.** Neither decoder touches `Buffer`, `window`, `process`, a timer or a file; all state is per-call, so two decodes cannot influence each other and the same bytes always give the same pixels (G3). The `crc32` table and the IDCT basis are the only module-level values, both immutable after construction and built from constants.
- **Colour-key transparency is not invented.** `decodeTexture` reports the file's own alpha (`tRNS` and the alpha channels); the per-image colour key of format-spec §10 belongs to whatever holds the image reference, and applying an assumed key here would make the palette PNG's 61 680 index-0 pixels transparent.
- **Errors point at the file, not at an intermediate buffer.** An error found in the inflated stream (an unknown filter type, a palette index outside `PLTE`) is reported at the `IDAT` payload's offset, because that is where those bytes come from; a header error points at the header field.
- **Why CRC checking is on.** Without it a single flipped byte in `PLTE` would render a plausible wrong colour; with it the file is rejected. `fflate` alone only protects the deflate payload (Adler-32).
- **`png.ts` reads the chunk list twice** (once for `IHDR`, once for the rest). The files are small and one extra pass buys precise errors; no caching state is kept between decodes.

## Verification

**Commands (all in the worktree, after rebasing onto `44fb20f`):**
- `pnpm install --frozen-lockfile` — exit 0.
- `pnpm typecheck` — exit 0.
- `pnpm test` — exit 0; 168 tests pass, 0 fail, 0 skipped (the fixture test ran; 15 of the tests are in `format-image.test.ts`).
- `pnpm lint` — exit 0; `check-core-deps: 1 core runtime dependency matches the allowlist`, eslint clean.
- `pnpm graph` — exit 0; `no dependency violations found (83 modules, 222 dependencies cruised)`.
- `pnpm provenance` — exit 0; `scanned 170 files`, `0 violations`.
- `pnpm licence` — exit 0; production packages checked 1, 135 prod+dev, `0 violations` (fflate 0.8.3, MIT).
- `uv run _bmad/method/scripts/tickets.py --project-root . status` — exit 0, entry 2.3 shown, no orphan row.
- Independent oracle, not committed: decoded RGBA written to `/tmp` and compared with Pillow 12.3 — `layout.png` byte-identical; `bkg.jpg`/`mwin.jpg` within rounding (see Implementation Notes).
