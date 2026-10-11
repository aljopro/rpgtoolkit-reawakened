# Image decoders and the fflate check (research, read-only)

Point-in-time finding of 2026-10-11, taken against the two sample games at the pinned revision 9191b9191c9bda0998c6faae16929b3331ed2ead. Produced by throwaway scripts. No sample-file content is quoted, and `docs/` was not changed: every doc fix named here is a proposal for a later, human-approved commit.

## Summary for the human
- Corpus rasters (2 games, 133 files) are only: two baseline JPEGs (640x480 and 600x100, 4:2:0; identical in both games) and one palette PNG (640x480, 8-bit, Adam7 interlaced). No BMP, GIF, ICO, WMF, TGA or progressive JPEG exists in the corpus.
- JPEG leading candidate: `jpeg-js` 0.4.4 (BSD-3-Clause = Bronze, no deps, sync). It decodes both fixture JPEGs to RGBA. Gaps: it needs `useTArray: true` (default uses Node `Buffer`), and it keeps module-level memory state. Hand-written baseline is the alternative.
- PNG: no candidate fits as-is. Recommended path: hand-written filters, palette and Adam7 on `fflate` `unzlibSync`. `fast-png` works but adds two deps; `pngjs` is out (Node built-ins, `Math.pow`).
- BMP: `fast-bmp` is small (MIT, 161-line decoder), but four lines containing `**` are unclassified. Hand-writing is the simpler choice.
- GIF: `omggif` (MIT, no deps, no `Math` members, animated frames) is the only clean candidate. The corpus has no GIF, so this is a spec-only decision.
- `fflate` 0.8.3 (MIT = Silver, passes G6) is licence-clean and has sync APIs. A probe showed `unzipSync` trusts declared sizes silently (10 MB entry, declared 1000 bytes, returned 1000 bytes). The package reader must check real lengths and CRCs itself.
- Allowlist: `packages/core/dependency-allowlist.json` is a flat JSON array (`[]`). Adding `fflate` means `["fflate"]` plus `dependencies` in `packages/core/package.json`. The checker only sees direct deps, not transitive ones such as `iobuffer` under `fast-png`.
- Float YCbCr constants in `jpeg-js` are a G3 question for the human (see Decisions).
- Nothing was installed into the repo. All downloads and scripts are under `/tmp/disc/`.

## Recommendation table

| Format | Spec §10 / T-xx need | Corpus use | Candidate | Licence (Blue Oak) | Direct deps | Sync | Verdict |
|---|---|---|---|---|---|---|---|
| JPEG baseline 4:2:0 | yes | 2 files (640x480, 600x100) | `jpeg-js` 0.4.4 | BSD-3-Clause (Bronze) | none | yes | Leading candidate, subject to Decisions 1–3 |
| JPEG progressive | spec wording: "anything the legacy library loaded" | 0 | `jpeg-js` (SOF2 seen in source; not exercised) | as above | none | yes | Depends on Decision 4 |
| JPEG | — | — | `@jsquash/jpeg` 1.6.0 | Apache-2.0 (Silver) | none | **async** WASM | Out: AD-6 / G2 sync rule |
| JPEG | — | — | `@jimp/js-jpeg` 1.6.1 | MIT | `@jimp/core`, `@jimp/types`, `jpeg-js ^0.4.4` | — | Out: heavy wrapper |
| JPEG | — | — | `fast-jpeg` 3.0.1 | MIT | `iobuffer`, `tiff` | — | Out: README says EXIF only, no pixel decode |
| JPEG | — | — | `jay-peg` 1.1.1 | MIT | `restructure` | — | Out: marker parser only, no pixels |
| JPEG | — | — | `image-js` 1.7.1 | MIT | `tiff`, `colord`, `jpeg-js`, `ssim.js`, `fast-bmp`, `fast-png` | — | Out: heavy |
| JPEG | — | — | `pdfjs-dist` 6.4.299 | Apache-2.0 | not checked | — | Out: whole PDF engine |
| PNG (palette, Adam7) | yes | 1 file (640x480, colour type 3, interlace 1) | hand-written + `fflate` `unzlibSync` | — | `fflate` | yes | **Recommended** (smallest dep footprint; LOC not measured) |
| PNG | — | — | `fast-png` 8.0.0 | MIT | `fflate ^0.8.2`, `iobuffer ^6.0.1` | yes | Viable, but +2 deps; `iobuffer` licence not verified |
| PNG | — | — | `pngjs` 7.0.0 | MIT | none | yes | Out: `require("util")`/`require("stream")` in lib, and `Math.pow` (see below) |
| PNG | — | — | `upng-js` 2.1.0 | MIT | `pako ^1.0.5` (second deflate lib) | yes | Out: second deflate library; `window.pako` fallback |
| BMP | yes (§10, T-36) | 0 | hand-written | — | none | yes | **Recommended** (LOC not measured) |
| BMP | — | — | `fast-bmp` 4.0.1 | MIT | `iobuffer ^6.0.0` | yes | Possible after the four `**` lines are checked |
| BMP | — | — | `bmp-js` 0.1.0 | MIT | none | — | Out: Node `Buffer`/`require` references |
| GIF (incl. animated) | yes (§7.2, §10) | 0 | `omggif` 1.0.10 | MIT | none | yes | **Candidate** if GIF is in scope (Decision 5) |
| GIF | — | — | `gifuct-js` 2.1.2 | MIT | `js-binary-schema-parser ^2.0.3` | yes | Out: `Math.pow` (G3) |
| ICO | yes (§10, T-36) | 0 | hand-written container over BMP/PNG | — | none | yes | Recommended once BMP/PNG exist |
| WMF | yes (§10 "ICO/WMF import") | 0 | none evaluated | — | — | — | Open (Decision 6) |
| TGA | not in spec | 0 | none evaluated | — | — | — | Not required by spec (Decision 7) |

## fflate check

| Item | Result | Source |
|---|---|---|
| Version / licence | 0.8.3, MIT (Silver, passes minimumRating Bronze) | `npm view fflate` (`/tmp/disc/pkgs/view-fflate*`) |
| Browser entry | `exports["./browser"]` present | package.json |
| Sync APIs in browser entry | `inflateSync`, `gunzipSync`, `unzlibSync`, `deflateSync`, `zipSync`, `unzipSync` | `esm/browser.d.ts` |
| Lint enforcement (AD-6) | `eslint.config.js` bans async export names on `fflate/browser` and any other `fflate` specifier (`fflateAsyncExports`, `restrictedImports`) | read only |
| Dep-cruiser / tools/deps rule for fflate | none found (grep) | grep |
| Declared-size trust | `unzipSync` on an entry with declared sizes patched to 1000 bytes returned 1000 bytes with no error (actual 10,000,000; compressed 9880) | `/tmp/disc/scripts/zip-declared-size-probe.mjs`, `/tmp/disc/pkgs/zip-probe.txt` |
| `filter` hook | `filter` receives declared `originalSize` and compressed `size` before inflate | same probe |
| CRC behaviour | **not tested** | — |
| Allowlist format | `packages/core/dependency-allowlist.json` = `[]` (flat array); checker `tools/check-core-deps.mjs` compares direct deps only | file read |

## Fixture facts used for scoring

| File | Bytes | Type | Key facts |
|---|---|---|---|
| `demo/Bitmap/bkg.jpg` = `Basic/Bitmap/bkg.jpg` (sha256 `8985fd257ed9…` in both) | 79744 | JPEG | SOF0 (baseline), 640x480, 3 components, sampling 4:2:0, 4 DHT, 2 DQT |
| `Bitmap/mwin.jpg` (both games) | 1699 | JPEG | SOF0, 600x100, 4:2:0, 4 DHT, 2 DQT |
| `Bitmap/layout.png` (both games) | 171649 | PNG | 640x480, bit depth 8, colour type 3 (palette), interlace 1 (Adam7) |
| `Bkrounds/bkg.bkg` | 45 | RPGTLKIT BKG | demo only (absent from Basic); not a raster format, out of scope |

Source: `/tmp/disc/pkgs/image-headers.txt` (from `/tmp/disc/scripts/image-headers.py`).

## jpeg-js probe (Node v26.8.1, one run; not a benchmark)

| Input | Options | Result |
|---|---|---|
| `bkg.jpg` | `useTArray: true, formatAsRGBA: true, tolerantDecoding: false, maxMemoryUsageInMB: 512` | ok, 640x480, RGBA `Uint8Array` 1,228,800 bytes, 26 ms |
| `mwin.jpg` | same | ok, 600x100, 240,000 bytes, 2 ms |
| `mwin.jpg` cut in half (written to `/tmp/disc/pkgs/`, not the repo) | tolerant false and true | both **threw** "marker was not found" |
| `FF D8 00 11 22 33 44` | tolerant false | threw "unknown JPEG marker 11" |

Result: valid fixtures decode with `useTArray: true`. Truncated and garbage inputs threw in both modes. Only these damaged inputs were tried. Source reading suggests `tolerantDecoding: true` can return pixels for corrupt data; not exercised here.

Script: `/tmp/disc/scripts/jpeg-js-probe.mjs` → `/tmp/disc/pkgs/jpeg-js-probe.txt`.

## jpeg-js source facts (source read)

| Item | Fact |
|---|---|
| Size | `lib/decoder.js` 1151 lines (`wc -l`); an earlier note of ~400 was wrong |
| Options | `useTArray` (false uses Node `Buffer`), `tolerantDecoding` (default true), memory cap options exist; defaults not re-checked this run |
| Global state | memory counter is module-level (`totalBytesAllocated`, reset by `resetMaxMemoryUsage`) |
| Math members | only `Math.ceil`, `Math.floor`, `Math.round` (allowed in core); no `**` |
| Float constants | YCbCr→RGB uses float literals (`0.3441363`, `0.71413636`); IDCT integer (line numbers not recorded) |
| Browser branch | writes to a `window` global (read in source; not exercised) |

## pngjs Math/Node sites (checked)

| File | Line | Use |
|---|---|---|
| `lib/format-normaliser.js` | 51 | `Math.pow(2, depth)` |
| `lib/bitmapper.js` | 219 | `Math.pow(2, depth)` |
| `lib/png.js` | 183 | `Math.pow(sample, 1/2.2/gamma)` |
| `browser.js` | 221, 1164 | `Math.pow` (browser build) |

## Recommendation details

1. **JPEG**: if `jpeg-js` is chosen, wrap it in one core module that pins `useTArray: true` and `tolerantDecoding: false`, resets the memory counter per call, and returns `Result<Rgba, FormatError>` (AD-18). Hand-written baseline LOC was not measured.
2. **PNG**: hand-write filters (None, Sub, Up, Average, Paeth), palette expansion and Adam7 on `fflate` `unzlibSync`. The only fixture is palette Adam7, so tests must cover it.
3. **BMP and ICO**: hand-write. `fast-bmp` is an option after its four `**` lines are checked.
4. **GIF**: `omggif` is sync, MIT, no `Math` members, and handles animation through `numFrames`/`frameInfo`/`decodeAndBlitFrameRGBA`. No fixture exercises it.

## Commands used

- `npm view <pkg> --json` and npm metadata fetches → `/tmp/disc/pkgs/view-*.json`, `v-*.json`, `search-jpeg.json`.
- `npm pack` and extraction into `/tmp/disc/pkgs/x-<name>-<ver>/` (jpeg-js, jimp, jay-peg, fast-jpeg, gifuct-js, jsquash-jpeg, omggif, fflate, fast-png, fast-bmp, pngjs, upng-js, bmp-js). pngjs first extract failed on permissions; re-extracted to `x-pngjs-b/`.
- Math/`**`/Node-builtin scans → `/tmp/disc/pkgs/checks-png-bmp-gif.txt`, `checks-2.txt` to `checks-5.txt`.
- `/tmp/disc/scripts/image-headers.py` → `/tmp/disc/pkgs/image-headers.txt`.
- `/tmp/disc/scripts/corpus-extents.py` → `/tmp/disc/pkgs/corpus-extents.txt` (134 files, 6,308,210 bytes, max depth 3, max relative path 59 chars, max basename 47).
- `/tmp/disc/scripts/corpus-ratio.py` → `/tmp/disc/pkgs/corpus-ratio.txt` (133 raw files, deflate level 9; max 33.97:1 for `Media/VIP - Overworld3.mid`; median 6.03:1).
- `/tmp/disc/scripts/zip-declared-size-probe.mjs` → `/tmp/disc/pkgs/zip-probe.txt`.
- `/tmp/disc/scripts/jpeg-js-probe.mjs` → `/tmp/disc/pkgs/jpeg-js-probe.txt`.
- `/tmp/disc/scripts/repo-deps.sh` → `/tmp/disc/pkgs/repo-deps.txt` (no `fflate` or image deps in repo; `node_modules/fflate` absent).
- Read only: `eslint.config.js`, `packages/core/dependency-allowlist.json`, `tools/check-core-deps.mjs`, `tools/licences/*`, `docs/format-spec.md` §1.5, §7.2, §10, §13, `docs/adr/0002`, the architecture spine and legacy-formats epic, `fixtures/legacy/**` (headers and checksums only).
- `/tmp/disc/corpus-inventory.md` (Oct 11 08:14): used for file counts and extension tables (133 game files + `.fetched.json`; 39 header rules, 0 failing).

These scripts were throwaway and live only in the author's temporary folder; they are not kept in the repository.

## What I could not determine

- `**` context in `fast-bmp`: four lines contain `**`; not classified as comment or code.
- Licence of `iobuffer` (npm output truncated in an earlier run) and of `pako`. Neither is verified here.
- Whether `fflate` `unzipSync` checks CRC (not probed).
- Whether `Unzlib` (streaming class used by `fast-png`) is in the `fflateAsyncExports` list (only partly read).
- Float exactness of `jpeg-js` YCbCr across engines (no reference decoder or golden output).
- Browser-bundle behaviour of `fast-png`, `upng-js`, `pngjs` (not built).
- Progressive JPEG handling in `jpeg-js` (SOF2 seen in source; not exercised).
- Hand-written LOC estimates were not measured.
- The corpus has no BMP, GIF, ICO, WMF, TGA or progressive JPEG, so their candidates cannot be tested against fixtures.

## Decisions for the human

1. **JPEG implementation**: allowlisted `jpeg-js` 0.4.4 (BSD-3-Clause, Bronze) in core, or a hand-written baseline decoder (progressive later)?
2. **JPEG float colour under G3**: `jpeg-js` uses float YCbCr constants. ADR 0002 allows `+ − × ÷` and `sqrt`, but the constants and rounding need a ruling: accept floats with a fixed evaluation order, or require integer fixed-point?
3. **`jpeg-js` settings and state**: accept `useTArray: true` and `tolerantDecoding: false` as required settings, and accept per-call reset of its module-level memory counter?
4. **Progressive JPEG**: required (spec "anything the legacy library loaded"), or baseline only? No fixture uses progressive.
5. **GIF**: in scope for this epic (spec §7.2 and §10 say yes)? If so, is `omggif` acceptable? No GIF exists in the corpus.
6. **WMF**: spec §10 says "ICO/WMF import". Keep it? No candidate evaluated.
7. **TGA**: not in the spec; confirm it stays out.
8. **PNG route**: hand-written on `fflate` (recommended), or `fast-png` (adds `fast-png`, `iobuffer`, and the transitive-dependency check gap)?
9. **Allowlist change**: approve adding `fflate` to `packages/core/dependency-allowlist.json` (`["fflate"]`) and `dependencies` (`"fflate": "0.8.3"`)?
10. **Corpus size**: one palette PNG and two JPEGs. Is that enough golden coverage, or should more fixtures be added (CI fixtures are fetched, not committed)?
