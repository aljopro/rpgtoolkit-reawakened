---
lens: verified-current
target: ../architecture-rpgtoolkit-reawakened.md
reviewed: '2026-10-10'
verdict: 'needs revision: versions are real and current, but one Stack assumption is already disproved and several ADs assume platform behaviour that the live docs contradict'
---

# Review: verified-current

Question asked: was each committed decision checked against the web, the project, or a current starter, rather than asserted from memory?

Method: npm registry (`registry.npmjs.org`, dist-tags, peerDependencies, `supportedTranspilers`, exports maps), crates.io, the VS Code update API, `nodejs.org/dist/index.json` and `nodejs/Release/schedule.json`, the ECMA-262 living spec (tc39.es), the WHATWG HTML structured-clone algorithm, MDN content, the vscode-docs repository (custom editors, webviews, web extensions), webstatus.dev, prng.di.unimi.it, spessasynth_core docs and README, fflate 0.8.3 package files, and the FluidR3 licence texts. The repo has no starter code yet (`packages/` absent, no `package.json`), so the only "existing project" check possible was against `docs/`.

## Confirmed (no action)

| Claim | Evidence |
| --- | --- |
| Every Stack version exists and is the current `latest`: TypeScript 7.0.2, pnpm 12.10.1, Vite 8.3.4, esbuild 0.28.2, Vitest 5.0.3, Playwright 1.64.0, ESLint 10.12.0, typescript-eslint 8.71.1, dependency-cruiser 18.5.0, fflate 0.8.3, spessasynth_core 4.3.22, spessasynth_lib 4.3.14, @codemirror/state 6.7.6, view 6.43.14, language 6.13.1, commands 6.11.1, vscode-languageserver/-client 10.1.2, @vscode/debugadapter 1.68.0, Capacitor 8.5.3, Electron 44.7.0, Tauri crate 2.12.2 (3.0.0-alpha.4 is the pre-release), VS Code 1.141.0 | npm `dist-tags.latest`, crates.io `max_stable_version`, `update.code.visualstudio.com/api/releases/stable` |
| Licences are on the G6 allowlist: Apache-2.0 (TypeScript, spessasynth_*, stb-vorbis, Playwright), MIT (the rest), Tauri Apache-2.0 OR MIT; `ovsx` 1.2.0 is EPL-2.0 as the spine says | npm `license` fields |
| Node 24.21.0 is the newest 24.x and is LTS today | `nodejs.org/dist/index.json` (2026-09-07) |
| spessasynth_core runs without a DOM and gives raw PCM | Docs: "can run in any JS environment"; `SpessaSynthProcessor.process(left, right)` renders float PCM; a Node MIDI-to-WAV example ships with it. README: "works with any modern JS environment that supports WebAssembly". |
| fflate covers `.tpk` and the appended-ZIP EXE | format-spec §13 has the EXE trailer (`CMP1`, offset, length), so the reader slices out a plain ZIP and hands it to fflate. fflate 0.8.3 reads ZIP64 headers and takes an `unzip` filter with `originalSize`. It handles store and deflate only; other methods throw `unknown compression type`. |
| xoshiro128** is a suitable 32-bit general-purpose PRNG | prng.di.unimi.it: "xoshiro128++ / xoshiro128** are our 32-bit all-purpose generators" (also the .NET 6 default) |
| FNV-1a 64-bit is suitable as a non-adversarial golden hash | Standard non-crypto hash. It needs BigInt (ES2020) or 16-bit limbs, and both fit an ES2022 target. |
| `Math.sqrt` is exact across engines | ECMA-262 §21.3.2.33 returns 𝔽(√n). `sqrt` is missing from the §21.3.2 list of implementation-approximated functions. |
| Engines may differ on transcendentals | ECMA-262 §21.3.2 note: acos … tanh, atan2, cbrt, exp, expm1, hypot, log*, pow, sin … "not precisely specified" |
| `Array.prototype.sort` is stable | ECMA-262 SortIndexedProperties: "…i.e., the sort is stable", for a consistent comparator |
| `Uint8Array` is structured-cloneable | MDN and the HTML spec: typed arrays are serializable |
| The VS Code custom editor API supports binary documents with undo/redo callbacks | vscode-docs custom-editors: `CustomDocumentEditEvent { document, label, undo, redo }` |
| vscode.dev web extensions exist and can host an LSP | vscode-docs web-extensions: a `browser` entry runs in a WebWorker extension host. vscode-languageserver 10.1.2 exports `./browser`. |
| WebGL2 is Baseline | webstatus.dev: `widely`, low 2021-09-20, high 2024-03-20. WebGPU is `limited`, so keeping WebGL2 is right. |

## Findings

### F1 — HIGH — Stack / TypeScript 7.0.2: the typescript-eslint "assumption" is already disproved, and dependency-cruiser is broken the same way

- **What is wrong.** The spine marks "typescript-eslint 8.71.1 supports TypeScript 7" as an `[ASSUMPTION]` to "confirm at scaffold". It can be checked now, and it is false:
  - typescript-eslint 8.71.1 (and `@typescript-eslint/parser`) declare peer `typescript: ">=4.8.4 <6.1.0"`.
  - dependency-cruiser 18.5.0 declares `supportedTranspilers.typescript: ">=2.0.0 <7.0.0"`. dependency-cruiser is how AD-22 and G4 enforce the dependency graph.
  - The root cause is in the TypeScript 7.0 announcement: "TypeScript 7.0 … does not ship with an API. We expect TypeScript 7.1 to ship with a new (and different) API". It recommends running side by side with 6.0 through `@typescript/typescript6` (6.0.2) and npm aliases, because "tools like typescript-eslint expect to import from `typescript` directly".
  - As specified, G2, G3 and G4 lint and the graph checks cannot install cleanly against TypeScript 7.0.2.
- **Fix.** In the Stack, replace the single TypeScript row with two:
  - `typescript` → `npm:@typescript/typescript6@6.0.2`, the API for typescript-eslint and dependency-cruiser;
  - `@typescript/native` → `npm:typescript@7.0.2`, for `tsc -b` type-checking and project references.

  Remove the `[ASSUMPTION]`. Add a Deferred item: drop the alias when TypeScript 7.1's API ships and both tools declare support.

### F2 — HIGH — AD-19: the undo model does not match VS Code's custom-editor contract

- **What is wrong.** AD-19 has hosts *receive* `document.dirty`, `canUndo` and `canRedo`, then call `editor-ui.undo()`/`redo()` from host menus. VS Code works the other way:
  - **VS Code keeps the edit stack.** The extension must fire one `CustomDocumentEditEvent { undo, redo, label }` per edit. VS Code calls `c.undo()`, `b.undo()` and so on. Dirty state comes from save points on that stack, and an extension cannot push `dirty`, `canUndo` or `canRedo` into VS Code.
  - **Webview state does not survive hiding.** The webview guide says "The contents of webviews … are destroyed when the webview is moved into the background. Any state inside the webview will be lost". The custom-editor guide says "custom editors can be saved even when they are not visible … `save` [should] not depend on a WebviewPanel".
  - **Result.** If the edit stack lives in `editor-ui` inside the webview, then after a tab switch VS Code's undo callbacks and `save()` target state that no longer exists.
- **Fix.** Reword the platform-services contract:
  - `editor-ui` emits `document.edited { editId, label }` for each command it pushes;
  - the host's `undo(editId)`/`redo(editId)` call back into `editor-ui`;
  - dirty state is host-derived, by VS Code itself or by the standalone hosts from the same stream.

  Also pick one of two options and record it:
  - **(a)** the `editor-ui` document model, meaning the command stack and the bytes, is a DOM-free module that `host-vscode` runs in the extension host, while the webview holds only view state;
  - **(b)** `retainContextWhenHidden: true` plus `supportsMultipleEditorsPerDocument: false`, accepting the memory cost VS Code warns about.

### F3 — MEDIUM — AD-21 / CAP-18: the DAP path is Node-only, but the vscode.dev build has no Node

- **What is wrong.** AD-21 runs `dap` through `runner-headless`, which C4 marks as "TypeScript, Node", and starts servers over stdio. The vscode.dev web-extension host is a browser WebWorker. vscode-docs says Node globals and libraries "are not available at runtime", and that creating child processes "is not possible". The ways in are a Worker for the language server and a `browser` entry for any extension contributing `debuggers`.
  - `@vscode/debugadapter` 1.68.0 (last published 2024-10-03) `require`s `fs` and `path` in `internalLogger.js`.
  - CAP-18 says "no feature exists in only one host", so DAP is unverified, and probably broken, in the vscode.dev build.
- **Fix.**
  - Split `runner-headless` into a platform-neutral harness (CPU rasteriser, null audio, scripted input) and a thin Node shell (fs, CLI). `dap` uses only the neutral part.
  - State that `host-vscode` web registers the adapter with `DebugAdapterInlineImplementation` in the worker host, either polyfilling or avoiding `@vscode/debugadapter`'s Node logger.
  - State that the LSP uses `vscode-languageclient/browser` with a Worker. "MessageChannel" is fine as the abstract transport.

### F4 — MEDIUM — AD-1 and AD-4: "transferable leaf" is wrong, and transferring would detach core state

- **What is wrong.** MDN says typed arrays "are serializable, but not transferable", and only their `ArrayBuffer` is.
  - Structured clone of a view serializes the **whole** underlying buffer (HTML spec, `[[ViewedArrayBuffer]]` sub-serialization), so a `subarray` leaf copies its parent buffer.
  - If a runner or Worker shim transfers `upload.bytes.buffer` while the core keeps the same bitmap in `GameState.surfaces` (AD-4), the core's state is detached and the next `getPixel` reads a zero-length buffer.
- **Fix.** Reword AD-1:
  - `Uint8Array` leaves are cloned (copied) by default;
  - every leaf the core emits owns its whole buffer (`byteOffset 0`, `byteLength === buffer.byteLength`);
  - the core never emits a view of a buffer it keeps;
  - a host may transfer a buffer only when the core marks it as given away (for example `upload` copies).

  Add this to the Worker contract test.

### F5 — MEDIUM — AD-13: the ban list misses `**` and the algebraic but approximated functions

- **What is wrong.**
  - **`**` is not covered.** ECMA-262 defines `**` and `**=` through `Number::exponentiate`, which "returns an implementation-approximated value". `Math.pow` uses the same operation. A lint rule that bans only `Math` members leaves `x ** y` open, and it is the more common spelling in TypeScript.
  - **"Transcendental" is too narrow.** The §21.3.2 approximated list includes `cbrt` and `hypot`, which are algebraic, not transcendental.
- **Fix.** Write the rule as an explicit allowlist rather than a "transcendental" denylist:
  - allowed: `Math.abs/ceil/floor/round/trunc/sign/min/max/fround/imul/clz32/sqrt`;
  - banned: everything else on `Math`, plus the `**` and `**=` operators (ESLint `no-restricted-syntax` on `BinaryExpression[operator='**']` and `AssignmentExpression[operator='**=']`, or `prefer-exponentiation-operator` turned off).

  Note that `fmath.pow` with integer exponents can be exact via repeated multiplication.

### F6 — MEDIUM — Operations "strict CSP": what the plan needs inside VS Code webviews was never checked

- **What is wrong.** The spine wants the engine in a Worker (AD-1) and SpessaSynth (an AudioWorklet in `runner-web`) inside VS Code webviews, under "a strict CSP". The live docs add these constraints:
  - **Workers.** Webview workers "can only be loaded using either a `data:` or `blob:` URI", and worker scripts "do not support … `importScripts` or `import(...)`". So the worker must be a single-file bundle, and the CSP must allow `worker-src blob:`.
  - **SF3 needs WebAssembly.** spessasynth_core decodes SF3 through `stb-vorbis` 0.0.6, which embeds a base64 WebAssembly binary. FluidR3 *SF3* therefore needs `script-src 'wasm-unsafe-eval'`, in the webview and in the PWA's CSP.
  - **The AudioWorklet module.** If it is loaded from a blob, CSP worklet loads fall back to `script-src`, which must include `blob:`.
- **Fix.** Under Operations, list the required CSP sources (`worker-src blob:`, `script-src 'self' 'wasm-unsafe-eval' blob:`, no `unsafe-eval`). Add a build rule: engine-worker and worklet bundles are single-file IIFE, with no runtime `import()`.

### F7 — MEDIUM — Stack "VS Code (engine target) 1.141.0" is the newest release, which cuts out Open VSX hosts

- **What is wrong.** 1.141.0 is the current stable release. As an `engines.vscode` floor it rejects any host older than this month's VS Code.
  - Open VSX is a named distribution channel (ADR 0001). Cursor's forum (June 2026) reports Cursor 3.6 on extension API 1.105.1.
  - vscode-languageclient 10.1.2 needs only `^1.91.0`.
  - Native ESM extension loading (microsoft/vscode#130367) closed only in milestone 1.129.0, so AD-22's "ESM only" also implies a floor of 1.129 or later unless `host-vscode` is bundled.
- **Fix.**
  - Replace the row with a floor: the oldest version whose APIs are used, for example `^1.91.0`, raised only for a named API.
  - Bundle `host-vscode` to CommonJS with esbuild (already in the Stack) so ESM sources do not raise the floor.
  - Pin `@types/vscode` to the floor version; vsce rejects `@types/vscode` newer than `engines.vscode`.

### F8 — MEDIUM — AD-6: under Node, importing `fflate` pulls in a Node built-in

- **What is wrong.** fflate 0.8.3's exports map resolves `"."` under the `node` condition to `esm/index.mjs`. That file begins `import { createRequire } from 'module'` and uses `worker_threads` for its async APIs. The browser build (`fflate/browser`) uses `Worker`.
  - So `core`, when imported by `runner-headless` or Vitest under Node, depends on a Node built-in, which breaks G2's "core touches no Node".
  - The async `unzip` and `inflate` APIs spawn workers, which breaks G2's no-timers/no-I/O rule.
  - A replay test run "once under Node and once in a headless browser" also exercises two different fflate builds.
- **Fix.** AD-6 should say:
  - `core` imports `fflate/browser` (an explicit subpath);
  - only the synchronous APIs are allowed (`unzipSync`, `inflateSync`, with an `unzip` filter for size limits);
  - a lint rule bans the bare `fflate` specifier and the async exports in `core`.

### F9 — MEDIUM — Stack: the FluidR3_GM SF3 row has no source, version or checksum, and SF3 provenance is muddy

- **What is wrong.** The Version cell reads "MIT notice shipped". The memlog says the original SF2 size is unconfirmed and that the SF3 is "about 20 MB", with no named artifact.
  - Public SF3 builds come from MuseScore. MuseScore's `FluidR3SF3Licence.txt` adds a line that the SF3 format "is exclusively licensed to the MuseScore community for use in versions of MuseScore 2".
  - The other common SF3, FluidR3Mono_GM 2.312, is a different derivative (mono, by Michael Cowgill, plus Ethan Winer and Michael Schorsch instruments), with its own credit-retention requirement.
  - G6 and the CI provenance job cannot check an unpinned asset.
- **Fix.** Make the row exact:
  - **artifact:** either the Debian `fluid-soundfont-gm` 3.1 SF2 converted to SF3 by a reproducible, recorded step, or a named SF3 file;
  - **URL and SHA-256;**
  - **credits:** the exact `THIRD_PARTY_NOTICES` text, including the additional credits.

  Do not ship MuseScore's SF3 without resolving the "exclusively licensed" line. This also clears the open "Unknown" in epic-audio-synth.

### F10 — LOW — Stack: spessasynth_lib floats its core dependency and needs Web Audio

- **What is wrong.** spessasynth_lib 4.3.14 declares `spessasynth_core: "latest"` and spessasynth_core declares `stb-vorbis: "latest"`. Pinning core at 4.3.22 does not stop a second, newer core copy appearing under lib once 4.3.23 ships. The lib is also a Web Audio and Web MIDI wrapper (per the spessasynth docs), but the Stack does not say which package may import it. `synth` sits under `runner-headless`, `lsp` and `dap` in the graph.
- **Fix.** Add pnpm `overrides` pinning `spessasynth_core` and `stb-vorbis`. Allow `spessasynth_lib` only in `runner-web`; `synth` depends on `spessasynth_core` only.

### F11 — LOW — Stack: Node 24 leaves Active LTS in 10 days

- **What is wrong.** `nodejs/Release` schedule: v24 enters Maintenance on 2026-10-20, and v26 becomes Active LTS on 2026-10-28 (26.11.1 is current). 24.21.0 is correct today. The spine should say on purpose which line CI tracks.
- **Fix.** Either pin Node 26 at its LTS cut, or keep 24 and note "Maintenance LTS until 2028-04-30; move to 26 after 2026-10-28". Vitest 5, Vite 8, ESLint 10 and dependency-cruiser 18 all accept `>=26`.

### F12 — LOW — Stack: the Tauri version row is ambiguous

- **What is wrong.** `2.12.2` is the Rust crate (crates.io). The npm `@tauri-apps/cli` latest is `2.12.1`.
- **Fix.** Name the crate and CLI versions separately if the spike selects Tauri.

### F13 — LOW — AD-12: xoshiro128** seeding is not specified

- **What is wrong.** Vigna: "initialization must be performed with a generator radically different in nature … to avoid correlation on similar seeds", and the all-zero state is a fixed point. AD-12 takes "a seed supplied by the runner" without saying how it expands into 4×u32.
- **Fix.** Name the expansion, for example SplitMix32 over the u32 seed with a non-zero state guard, in `core/rng`, and state the seed type in `RunConfig`.

## Not verifiable at this altitude

- **The demo's MIDI files under SpessaSynth.** Whether they play "identically" across runners (CAP-7) depends on AudioWorklet render quanta and sample rates, not on the spine. It belongs to the audio-synth epic test.
- **Legacy `.tpk` compression methods.** format-spec §13 says "standard ZIP" without naming methods. fflate handles store and deflate only, and the legacy-formats epic should confirm against fetched fixtures.
