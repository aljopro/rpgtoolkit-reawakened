---
type: discovery
title: "Font library and bundled-font strategy spike"
date: 2026-10-17
ticket: 3
---

# Font library spike

## 1. Scope, date and environment

This is the ticket 4.3 research result. The experiment ran on 2026-10-17 in a clean temporary directory, `/tmp/tkr-font-spike-4-3`, outside the repository. No candidate was installed in the workspace, no dependency allowlist was changed, and no font file was added to this repository. The macOS/system fonts used by earlier probes were not used as evidence or assets here.

| Input | Pin |
|---|---|
| Node/V8 | `node v26.8.1` |
| Bun/JavaScriptCore | `bun 1.4.2` |
| TypeScript compiler for the host-free compile | `typescript 6.0.2` via `npm exec` in `/tmp` |
| Licence policy | Blue Oak Council list v16 (`tools/licences/blue-oak-list.json`), repo policy (`tools/licences/config.json`) |
| Test font release | Liberation Fonts 2.1.5 TTF attachment, URL and hashes in §8 |

The exact wrapper accepts a `Uint8Array` supplied by an asset provider, copies it to an `ArrayBuffer`, parses it, and reads family/subfamily, `unitsPerEm`, `hhea` ascent/descent/line gap, glyph lookup, glyph id, outline commands, advances and kerning. It deliberately does not call SVG/canvas helpers, font generation, hinting-delta, variation, WOFF/WOFF2 decompression, or convenience rendering APIs. The proposed implementation scope is TrueType `glyf` outlines and the tables needed by that seam; unsupported inputs must be rejected deterministically rather than silently treated as supported.

## 2. Candidate inventory

The starting evidence is [render-readiness.md §E](render-readiness.md#e-font-library-candidates-probe-results), F-14–F-17. Each candidate was fetched as the exact npm registry tarball, expanded in `/tmp`, and inspected from the packed contents rather than from an installed workspace tree.

| Candidate | Registry tarball | SHA-256 | npm integrity | Packed files / unpacked bytes | Initial result |
|---|---|---|---|---:|---|
| `opentype.js@2.0.0` | [`opentype.js-2.0.0.tgz`](https://registry.npmjs.org/opentype.js/-/opentype.js-2.0.0.tgz) | `ce143186092cc57dc8238288611cad7b383076b581d8a85f99f8f163b780c7ad` | `sha512-kCyjv6xdDY1W/jLWZ/L3QhhTlKUqDZMQ5+Jdlw12b3dXkKNpYBqqlMMj0YDQPShWFTMwgZI1hG14kN3XUDSg/A==` | 10 / 3,642,174 | **pass for the bounded wrapper scope** |
| `typr.js@1.0.0` | [`typr.js-1.0.0.tgz`](https://registry.npmjs.org/typr.js/-/typr.js-1.0.0.tgz) | `8716de05a1e716e044c346a5a734006aad79a2c0185f4c2ca76a3ac7ebf036af` | `sha512-1fcCBnRerF4hLBrNVZyf6OwpWummpKomQ7N7OuWf3qzi4+XNSxtOnn3zvQlSwpV5SW/b0umULr5hQwOUNkZZUg==` | 5 / 57,260 | **fail**: old CommonJS/`window` load path and no declarations |
| `fontkit@2.0.4` | [`fontkit-2.0.4.tgz`](https://registry.npmjs.org/fontkit/-/fontkit-2.0.4.tgz) | `f686a9515af33fce16ab4bffe50570728197e53165068548c6f75a1793797a08` | `sha512-syetQadaUEDNdxdugga9CpEYVaQIxOwk7GlwZWWZ19//qW4zE5bknOKeMBDYAASwnpaSHKJITRLMF9m1fp3s6g==` | 131 / 5,610,637 | **fail for this boundary**: nine direct dependencies and a large host/closure surface; the packed candidate has no own licence text |
| `fonteditor-core@2.6.3` | [`fonteditor-core-2.6.3.tgz`](https://registry.npmjs.org/fonteditor-core/-/fonteditor-core-2.6.3.tgz) | `7010216867f2f8a0ebc6d9d76cc136beeb2c1d2e6ffe3c5c8a703a933b56b0e5` | `sha512-YUryIKjkenjZ41E7JvM3V+02Ak4mTHDDTwBWgs9KBzypzHqLZHuua1UDRevZNTKawmnq1dbBAa70Jddl2+F4FQ==` | 255 / 1,616,836 | **fail for this boundary**: host references in the shipped source and an XML dependency; it needs a separate audited subset before consideration |

Raw commands (run in the temporary directory) were `npm pack <name>@<version> --pack-destination tarballs`, `shasum -a 256 tarballs/*.tgz`, `tar -tzf`, and `npm install --prefix /tmp/... --ignore-scripts --no-audit --no-fund --no-package-lock --no-save <tarball>` followed by a package JSON licence walk. No lockfile or workspace package was changed.

## 3. Wrapper contract and core types

The temporary declaration file modeled only the calls above: `parse(ArrayBuffer)`, `Font.names`, `Font.unitsPerEm`, `Font.tables.hhea`, `Font.charToGlyph`, `Glyph.getPath`, `Glyph.advanceWidth`, and `Font.getKerningValue`. The wrapper compiled with:

```text
npm exec --yes --prefix /tmp/tkr-font-spike-4-3/ts --package typescript@6.0.2 --
  tsc -p /tmp/tkr-font-spike-4-3/ts/tsconfig.json
```

The temporary `tsconfig.json` used `target: ES2022`, `module: ES2022`, `moduleResolution: Bundler`, `lib: ["ES2022"]`, `types: []`, `strict: true`, and `noEmit: true`. It passed with no DOM or Node declarations. The local `.d.ts` is evidence for the wrapper seam only; it is not permission to add a dependency or to publish unverified types.

The selected wrapper scope must gate input to sfnt TrueType `glyf` files before calling the library. CFF/CFF2, WOFF/WOFF2 and variation inputs are not silently accepted by this result. Entry 4.9 must turn this gate, the local declarations, and the static/dynamic audit into implementation and tests.

## 4. Licence closure

Blue Oak v16 rates `MIT` **Silver**, `Apache-2.0` **Silver**, and `0BSD` **Bronze**. `OFL-1.1` is not listed; GPL, LGPL, MPL and EPL are also not listed and remain blocked/unknown under the repo policy. The software closure for the proposed `opentype.js` path is only the package itself: `opentype.js@2.0.0` declares no dependencies and its packed `LICENSE` is MIT (SHA-256 `a5b87c9bc191e7f9c06b07bd7cbbed3ed846dfdb50e859484b2c245aa1ab2e61`). The proposed implementation must retain that notice.

The recursive temporary closure results for alternatives were:

* `fontkit@2.0.4`: `@swc/helpers@0.5.23` Apache-2.0; `brotli@1.3.3`, `clone@2.1.2`, `dfa@1.2.0`, `fast-deep-equal@3.1.3`, `fontkit@2.0.4`, `pako@0.2.9`, `restructure@3.0.2`, `tiny-inflate@1.0.3`, `unicode-properties@1.4.1`, and `unicode-trie@2.0.0` MIT; `tslib@2.8.1` 0BSD; `base64-js@1.5.1` MIT. The ratings pass individually, but every package would need a pinned closure, notice and allowlist record. The packed `fontkit` package itself contains no `LICENSE`/`NOTICE` file, so its notice closure is incomplete for this project.
* `fonteditor-core@2.6.3`: package metadata and packed `LICENSE` claim MIT (license SHA-256 `56da234b06e4b46e2d3ad7c83721ebc98493849972c7eeadfa5079308261f0b1`); `@xmldom/xmldom@0.8.15` is MIT. Its source still needs host/API removal or a separately audited subset.
* `typr.js@1.0.0`: MIT, packed `LICENSE` SHA-256 `44b8cdb76bb7adb8fb3ca23a63d4bbf32c2be201bae44106e712094e6cff42a7`.

No OFL software dependency is admitted. The only OFL exception proposed here is the exact project-bundled font-data rule in §8 and ADR 0003; entry 4.9 owns the path-scoped licence checker and notices.

## 5. Static census

The census command scanned every packed `.js`, `.mjs`, `.cjs` and `.ts` file, not only the selected module. The command was a Node script over `/tmp/tkr-font-spike-4-3/pkg/*/package`; its output recorded counts and file locations for every `Math.<member>`, `**`/`**=`, and host identifier.

| Candidate | Static `Math` members (count) | `**`/`**=` | Host identifiers (count) | Disposition |
|---|---|---:|---|---|
| `opentype.js` | `pow` 36, `sqrt` 24, `floor` 28, `round` 232, `abs` 108, `log` 32, `max` 40, `min` 40, `PI` 4, `ceil` 12, `sign` 20, `trunc` 12 | 130 | `document` 24, `canvas` 4, `process` 24 (variation object, not Node), `TextDecoder` 8, `require` 8, `module` 6 | The wrapper's gated Liberation `glyf` path reaches only `floor`/`round` and no host global. `Math.pow`/`Math.log` are in write/bounding-box, CFF/table-building, checksum and hinting/variation paths; `Math.PI` and `document` are in colour/SVG/canvas helpers; `TextDecoder` is in WOFF/WOFF2 paths. Those paths are out of the exact wrapper scope and must stay gated. `**` count is a static hit requiring entry 4.9 to retain the same scope audit. |
| `typr.js` | `max` 1, `min` 1, `abs` 2 | 0 | `window` 2, `TextDecoder` 2, `module` 1 | CommonJS/module and `window["TextDecoder"]` load path failed the host-free boundary. |
| `fontkit` | `max` 20, `ceil` 5, `floor` 5, `log` 10, `LN2` 10, `pow` 30, `abs` 40, `min` 35, `round` 25, `sqrt` 15, `cos` 5, `sin` 5, `random` 5, `log2` 2 | 418 | `Buffer` 59, `TextDecoder` 20, `TextEncoder` 5, `process` 95, `require` 29, `module` 5 | Fails the unmodified core closure: reachable package selection and dependency builds are not proven host-free or G3-audited; `random`, `cos`, `sin`, `pow`, `log` and `log2` are not on the G3 allowlist. |
| `fonteditor-core` | `max` 37, `min` 25, `PI` 8, `sqrt` 10, `acos` 2, `abs` 34, `tan` 12, `cos` 16, `sin` 16, `ceil` 6, `round` 90, `pow` 10, `floor` 16, `log` 7, `LN2` 7, `imul` 2, `fround` 2, `clz32` 2, `trunc` 2 | 921 | `Buffer` 58, `process` 22, `module` 13, `window` 14, `require` 285, `navigator` 6, `XMLHttpRequest` 5, `clearTimeout` 4, `setTimeout` 6, `document` 6, `WebAssembly` 7, `TextDecoder` 4, `setInterval` 2, `clearInterval` 2, `fetch` 4 | Fails the unmodified core closure. A vendored subset would require a new, complete audit. |

Representative `opentype.js` locations are `dist/opentype.mjs:241,304` (`Math.pow` bounding-box); `:810` (`document` SVG path); `:1232` (`Math.log` write/index); `:3663-3664` (`Math.pow`/`Math.log` table generation); `:5678-5679` (`document`/canvas colour path); `:6007` (`Math.PI`); `:9202,9212` (`Math.log`/`Math.pow` checksum); `:10741,10751` (`TextDecoder` decompression); `:10793-10799` (`document` SVG helper); `:12995` (`Math.pow` hinting delta); and `:16297` (deprecated `require` message). The wrapper never calls those helpers, and the dynamic trap in §6 confirms no host read.

The selected wrapper is therefore not permission to expose the whole package to arbitrary inputs: it is a bounded `glyf` parser seam. If entry 4.9 cannot preserve the input gate and static proof, this recommendation falls back to an audited vendored subset or the hand-written parser; it must not waive an unapproved reachable path.

## 6. Dynamic sandbox evidence

The exact wrapper was run after installing trapping getters for `window`, `document`, `navigator`, `fetch`, `localStorage`, `requestAnimationFrame`, `Buffer`, `require`, timers, `TextDecoder`, `TextEncoder`, `XMLHttpRequest`, `ImageData` and `OffscreenCanvas`, and a `Math` proxy that logged every member read. Wrapper-owned Node helpers were captured before the traps; the candidate received only supplied bytes.

For all three upstream Liberation `glyf` fonts, the trap log was `GLOBAL []`; the executed Math log was `Math ["floor", "round"]`; the G3-unallowed dynamic set was `[]`. The calls were parse, name/family lookup, `unitsPerEm`, `hhea`, `charToGlyph`, 750 glyph vectors, `getPath`, advances and adjacent kerning. The wrapper was run on both Node/V8 and Bun/JavaScriptCore.

Malformed input was rejected in both engines: empty and six-byte inputs raised `RangeError`; a 64-byte zero input raised `Error: Unsupported OpenType signature`. Node's messages were `Offset is outside the bounds of the DataView`; Bun's were `Out of bounds access`; the error class and rejection, not engine-specific text, are the contract.

## 7. Cross-engine vectors, coverage and size

The fixed test string has 50 characters (`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuv12`) and was exercised at sizes 8, 12, 13, 16 and 24 for Liberation Sans Regular, Serif Regular and Mono Regular. Each of the 15 face/size cases contains 50 glyph ids, advances, scaled advances, adjacent kerning values and canonical outline commands: 750 glyph vectors total. The complete canonical JSON output SHA-256 was `e343f8e33357a72ee78c98c625bdb177ca3154eb585b4d218be1e6d1997cc79a` on both engines; `cmp` was identical. Per-face/size vector SHA-256 values are recorded in the table below.

| Face | 8 | 12 | 13 | 16 | 24 |
|---|---|---|---|---|---|
| Sans Regular | `41ad56c74f0ace486c36a3b875adda244851c7f09582c1fa921834246c58b540` | `cf9c5583cdf52d9f0cc1d574c02fab21fa00b5f279a6a08d6ace1cc5d918e814` | `1953fda02136f83583da7d1ed8db3a52895f188a508ff81eff6585220e2f5589` | `593d6c851c802b13c7f119482bd97522436ae7621826c25f784a01df5536f498` | `ecb5a2ebecb829110db44af7b897e52d1ca72c0c17eb6c485d3494c9a206f554` |
| Serif Regular | `7583edacb9927670c0f02293c0ac137e4cc3d5863c75191c19575e1f5f684bf6` | `a003f0c240287fc92c43d7325c9e3fcd7bb345a9b617d4dbd6b2cf1b29b2d988` | `e48115102e91e6d296a08ed5205fca0ac7904ae944a892269e5f98394d29c555` | `901060589d421089993425c2359965b765bca6f4c1e5c34dc06a820ec574ac06` | `9e9dc0d42d254871cc6668d102e2c18ccc1d1bcf6e054e2f21afdc53155db273` |
| Mono Regular | `11819f49ff241b0bf117531d6262652d1f68a4e23584c1b6a4b78e49648908bf` | `79ac784c4661a28ee5969da07e6b6a734dac8e633e1ac7aeb6654b31dec8250e` | `50bf0bb86ca1beba2674f04c08614b938989215e30ee4cd4078f3fffc4c86f2a` | `e8d30ca1fc19ed8ebe538b794b4b58a8221bc5bb280212e5c39f4e01f16f636e` | `2eb85ca5408d589c8a14a22110e1e0269f8c40655913667a927988c2b3117b2a` |

The selected package costs 787,356 compressed tarball bytes and 3,642,174 unpacked packed bytes; the selected ESM is 494,695 bytes. The temporary local declaration plus wrapper was 1,435 bytes. There is no dependency closure. A vendored subset could reduce the 494,695-byte module but was not built in this research-only ticket; entry 4.9 must measure any subset and rerun this evidence.

Coverage disposition:

| Feature | Result |
|---|---|
| TrueType `glyf`, composites, `cmap`, `head`, `hhea`, `hmtx`, `maxp`, `name`, `post`, `kern`/GPOS metric path | **Exercised** on the upstream Liberation files; composite glyph support is present in the parser, but the fixed vector includes ordinary Latin glyphs only. |
| Non-Latin glyph lookup | **Exercised at API level** by Liberation's parsed cmap and must receive explicit conformance vectors in 4.9; no claim of Unicode shaping is made here. |
| CFF/CFF2, WOFF/WOFF2, SVG/COLR, variable fonts, hinting deltas, ligatures/Arabic shaping | Package advertises support for several of these, but they were **not exercised** and are **out of this proposed core wrapper scope** until separately audited. |
| Malformed tables | Empty, short and invalid-signature inputs rejected in both engines; deeper malformed-table fuzzing is entry 4.9 work. |
| Rasterisation | Not supplied by the candidate. Outline fill and pixels remain the project's pure `core/raster` responsibility. |

## 8. Font asset table

The upstream release is [Liberation Fonts 2.1.5](https://github.com/liberationfonts/liberation-fonts/releases/tag/2.1.5), TTF attachment [`liberation-fonts-ttf-2.1.5.tar.gz`](https://github.com/liberationfonts/liberation-fonts/files/7261482/liberation-fonts-ttf-2.1.5.tar.gz), archive SHA-256 `7191c669bf38899f73a2094ed00f7b800553364f90e2637010a69c0e268f25d0`. Its upstream `LICENSE` is OFL-1.1, SHA-256 `93fed46019c38bbe566b479d22148e2e8a1e85ada614accb0211c37b2c61c19b`; the text states Reserved Font Name `Liberation`. The files below are unmodified upstream files, not Debian-patched copies.

| Asset | SHA-256 | Role |
|---|---|---|
| `LiberationSans-Regular.ttf` | `76d04c18ea243f426b7de1f3ad208e927008f961dc5945e5aad352d0dfde8ee8` | Default for sans-serif/Arial family |
| `LiberationSerif-Regular.ttf` | `058ea80864aef09a23f45cbec2bb5400bc3dfbdea01c3f10538a21fcb497fb74` | Serif/Times New Roman family substitute |
| `LiberationMono-Regular.ttf` | `f2b83c763e8afd21709333370bed4774337fae82267937e2b5aea7e2fbd922c1` | Monospace/Courier New family substitute and deterministic test font |

The project must ship these files unmodified with the OFL-1.1 text, copyright notice, release and hashes in `THIRD_PARTY_NOTICES`. A modified/subset file must not retain the Reserved Font Name `Liberation`; no such modification is proposed here.

The bitmap fallback is a separate project-authored 8×8 font, not a recovered TK2 `BASE.FNT` and not a third-party asset. Ticket 4.32 will author it under this project's MIT licence, with deterministic cells for U+0020–U+007E plus an explicit U+FFFD replacement glyph. Its role is missing-glyph and no-TrueType/TK2 fallback (and a stable golden fixture), not a claim of legacy pixel parity. No bitmap source file exists in this spike by design; ticket 4.32 owns the source, licence text and vectors.

## 9. Verdict and owner ruling

**Proposed ruling (pending owner review): recommend `opentype.js@2.0.0` behind the bounded, host-free TrueType `glyf` wrapper described above.** The exact wrapper passed licence closure (MIT, zero dependencies), ES2022/no-types compilation, dynamic host traps, dynamic G3 Math audit, malformed-input rejection, and byte-identical Node/Bun vectors for the three selected Liberation faces. Its packed size is explicit and there is no hidden dependency expansion. The recommendation is not a claim that the unmodified package is safe for every OpenType feature: CFF/CFF2, WOFF/WOFF2, SVG/canvas, variation, hinting-delta and convenience/write paths remain gated and out of scope.

Rejected alternative: select the full unbounded package API. Its static bundle contains unapproved Math members and host-facing helpers; accepting those paths without the wrapper gate would violate G2/G3. Rejected alternatives: Typr.js fails the host-free load/type check; fontkit has a broad nine-dependency closure, missing packed own licence text, and unvetted host/math reachability; fonteditor-core has host references and an XML dependency and would require a new subset audit. If owner review rejects the bounded library path or entry 4.9 cannot preserve the proof, use an audited vendored `opentype.js` parser subset; use a hand-written `glyf` parser only if no audited subset can pass.

No package, allowlist entry or font asset is selected for implementation by this note. Owner approval is required before entry 4.9 consumes the recommendation.

## 10. Handoffs

* **AD-15:** the architecture note now records this as a proposed, pending-owner ruling: `opentype.js@2.0.0`, bounded to host-free TrueType `glyf` parsing and the table/metric scope above; the wrapper is core-tsconfig-compatible and G3-audited. The pure core rasteriser remains responsible for outline filling and pixels, and platform fonts remain opt-in only.
* **ADR 0003:** add the exact, asset-only OFL-1.1 exception for the three unmodified Liberation families. It does not admit OFL software dependencies, user-supplied fonts or arbitrary font assets, and it does not alter the Bronze-or-better software rule.
* **Entry 4.9:** add the selected library only after owner approval; implement the input gate, local declarations or audited vendored subset, core dependency allowlist entry, font parser/rasteriser vectors, notices and path-scoped licence-gate records. Re-run static/dynamic/cross-engine audits and malformed-input tests.
* **Ticket 4.32:** author the MIT 8×8 bitmap fallback and its replacement-glyph vectors. Do not use a legacy `BASE.FNT` as a shipped asset.
* **No-dependency/no-asset boundary:** this spike adds only this evidence note and the approved docs handoffs; it does not add npm packages, lockfile entries, font files, `THIRD_PARTY_NOTICES` assets or allowlist changes.
