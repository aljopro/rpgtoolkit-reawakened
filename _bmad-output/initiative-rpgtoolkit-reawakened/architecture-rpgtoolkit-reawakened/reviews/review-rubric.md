---
lens: rubric
target: ../architecture-rpgtoolkit-reawakened.md
companions-reviewed: [../c4.md, ../.memlog.md]
against: [spec-rpgtoolkit-reawakened.md, packages.md, docs/guardrails.md, docs/adr/0001-typescript-core.md, docs/architecture-options.md, docs/engine-features.md, docs/format-spec.md, epic-*/epic-*.md, tickets.toml]
date: 2026-10-10
verdict: not ready — revise before epics adopt it
---

# Rubric review — architecture spine, rpgtoolkit-reawakened

## Verdict

The spine is strong on its main seam: one engine API, a flat draw list, core-owned readback, canonical hashing, and a clean operating model with no backend. It still misses several real cross-epic divergence points. Three state and boundary contracts (AD-7, AD-10, AD-14/17) are incomplete in ways that break G1 or replay for features the spec requires. One Stack row is not current: the pinned TypeScript 7.0.2 / typescript-eslint 8.71.1 pair cannot be installed together. Fix the high-severity items before the epics adopt the spine.

## Rubric scorecard

| Criterion | Result | Notes |
| --- | --- | --- |
| Fixes the real divergence points; misses none | **Partial** | Missing: image decoding ownership (F-5), party/inventory/UI state ownership (F-3), new single-file package format (F-13), editor↔LSP channel (F-8), host-initiated save (F-9), input-to-step assignment (F-10). |
| Every Rule enforceable and prevents its divergence | **Partial** | AD-7 and AD-10 have closed shapes that leave out required state, so epics will extend them ad hoc, which is the divergence each AD names. AD-13's lint does not cover `**`. AD-14 leaves out reply events. |
| Nothing under Deferred lets two units diverge | **Partial** | "Saved-game location and naming per host" leaves game identity open, which affects isolation and portability (F-14). "Glyph-metric source" is decided by one epic but used by runner, menu, battle and editor (F-6). The thread-budget item names two owners. |
| Named tech verified-current | **Fail (1 row)** | All versions exist on npm, and the licences are permissive (checked 2026-10-10). But `typescript-eslint@8.71.1` peer-requires `typescript >=4.8.4 <6.1.0`, and TS 7.0 has no JS API (F-4). |
| Covers CAP-1..CAP-18 | **Pass (thin on CAP-7 video, CAP-12 new package, CAP-17)** | Every CAP is bound by at least one AD. |
| No AD weakens or contradicts an inherited invariant | **Partial** | AD-7's shape leaves out state that G1.2 lists as required. AD-2 misstates G3.1. AD-15 reverses architecture-options §2 and packages.md (text layout) without the ADR flag that AD-4 has. AD-15 also clashes with the G4 CPU↔WebGL2 agreement test. |
| Altitude dimensions decided / deferred / open | **Partial** | Deployment, CI, providers and "no telemetry" are decided. Release/versioning, signing, secrets, PWA update policy and the browser/WebView support envelope are absent (F-16). The spine has no Open Questions section, and the spec's open questions on `.sav`, text-era formats and AVI were dropped (F-15). |
| Mermaid valid | **Pass** | All 3 spine blocks and 4 C4 blocks parse by inspection. The dependency graph is incomplete, not invalid (F-7). |
| Capability map complete and consistent with ADs | **Partial** | Map and Binds disagree (F-17). |

## Findings

### F-1 [high] AD-14 / AD-17 — requests that need a reply have no input event or wait kind
AD-17 makes `loadBlob` the only route for RPGCode file reads (`openFileInput`, `fileInput`, `fileGet`) and for `load(file)`, and it sends the E-99 extension mechanism through "the same boundary". But AD-14's closed event list (`key`, `pointer`, `gamepad`, `asset`, `audio.ended`, `video.ended`, `focus`) has no blob reply event and no extension-result event. AD-9's core wait kinds (`key`, `sleep`, `movement`, `asset`, `ui`) have no blob kind either. The result: file I/O and loads can never resume a waiting thread, or each epic invents a private event. Either way, "Replay feeds exactly the log" cannot reproduce `load()` or file reads. `dirSav(...)` (format-spec §9.11) also needs a way to list the save area, which no request offers.
**Fix:** state the rule that every request kind that needs a reply has a matching input event, and list the pairs: `loadBlob → blob {key, bytes|missing}`, `listBlobs → blobList`, `saveBlob → blobSaved {ok|error}`, `extension.call → extension.result`. Add `blob` (and `extension`) wait kinds to AD-9, and put blocking blob requests under AD-5's `loading` freeze.

### F-2 [high] AD-7 — VM state shape leaves out state G1 requires, and dynamic code cannot be rebuilt
G1.2 lists the *operand stack*, the *error-handler state* and the *sleep and wait reasons* as required state. AD-7 fixes `Frame = { program: {path, hash}, ip, locals }` and `VmState = { threads, globals, objects }`. That shape has no operand stack (a snapshot inside `x = wait() + 1` loses the partial expression). It has no per-function error-handler state (`setErrorHandler`, `setResumeNextHandler`, format-spec §9.8). It has no `redirects` table (§9.6, and saved per E-120), no per-thread source/target (E-95), and no `autoLocal` mode. Separately, `rpgCode(line)` and `tellThread(id, code)` (E-93, §9.11) run code that has no asset path, so "rebuilt from asset bytes on restore" cannot restore those frames. The rule says it prevents "each epic extending state differently", but the closed shape forces exactly that.
**Fix:** extend the shape to `Frame { program: ProgramRef, ip, locals, stack, handler }` with `ProgramRef = { asset: path, hash } | { inline: source }`, and `VmState { threads, globals, objects, redirects, settings }` with `Thread { …, source, target }`. Say what restore does when the asset hash does not match.

### F-3 [high] AD-10 — no owner for party, inventory and gold, message window and fonts, or the input buffer
`GameState = { schema, world, sprites, triggers, vm, battle, menu, audio, surfaces, rng, time }`. E-120 requires saving the party and stats, inventory, equipment, gold, message-window and font settings, steps, movement mode and game-speed offset. E-110 requires a clearable key queue, and cursor maps and buttons are script state. None of these has a named section. The epics already show the split: epic menu-party-save "waits on movement-triggers because: party and board state", and battle needs party stats too. Three epics will each put party data in a different section, which is the divergence AD-10 exists to prevent.
**Fix:** add `party` (members, inventory, equipment, gold, steps), `ui` (message window, font and colour settings, cursor maps, buttons, active animations) and `input` (key queue, mouse state) sections, each with a named owning module. Also say whether outstanding requests live in state, so a snapshot taken during `loading` restores.

### F-4 [high] Stack — TypeScript 7.0.2 and typescript-eslint 8.71.1 cannot be installed together
This was checked against npm on 2026-10-10. `typescript-eslint@8.71.1` (latest) has `peerDependencies.typescript: ">=4.8.4 <6.1.0"`. TS 7.0 ships no JS compiler API: `require("typescript")` exposes only `version`, so typescript-estree crashes ([typescript-eslint#12518](https://github.com/typescript-eslint/typescript-eslint/issues/12518), closed as blocked on [#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)). The TS team expects a new API in 7.1 ([Announcing TS 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0)). The G1–G3 lint bans that this spine depends on cannot be scaffolded with this Stack. The `[ASSUMPTION] … confirm at scaffold` note is now a known failure, not an open check.
**Fix:** pin `typescript` 6.0.x as the tooling peer (typescript-eslint, dependency-cruiser's TS parsing, the language-service plugins), and run TS 7.0.2 (`tsgo`) side by side for typecheck and build, as the TS 7.0 announcement recommends. Or pin 6.0.x everywhere until 7.1. Record the choice and the date to revisit.

### F-5 [high] Missing AD — who decodes images (BMP/PNG/JPEG/GIF) into the pixels the rasteriser and scripts read
AD-4 makes `core/raster` rasterise `DrawList + bitmaps` for `canvasGetScreen`, `getPixel` and the goldens. AD-3 blits asset textures by `TexRef` (a logical path), which runners decode with their own platform decoders. So the core must also decode every image format (format-spec §10), or else readback and goldens use pixels that differ from what runner-web shows. JPEG and some GIF/BMP variants decode differently between browser decoders and JS decoders, and colour-key matching (§10) is exact. The `core` allowlist is "fflate … only entry, until amended", which covers PNG inflate but not JPEG. Nothing in the spine or Deferred covers this.
**Fix:** add an AD that images are decoded once, in `core/formats/image`, to RGBA, with colour key applied by the core. Runners receive decoded pixels (via `upload`, or an `AssetDelivery` → `TextureData` step) and never decode game images themselves. Name the decoder dependencies to add to the allowlist (licence-checked) or state that they are hand-written.

### F-6 [medium] AD-15 — platform fonts conflict with the G4 agreement test, and the spec reversal is unflagged
AD-15 has runners "draw glyphs with platform fonts", while `core/raster` (AD-4) and runner-headless draw with the bundled bitmap font. G4's enforcement test replays "the same draw list through the CPU rasteriser and the WebGL2 renderer" within golden tolerance, and CAP-6 success says the same. Any frame with text will fail that test. AD-15 also reverses packages.md (a spec companion: "Text layout is a runner capability") and architecture-options §2, but unlike AD-4 it is not listed for ADR 0002. The deferred glyph-metric source is "decided by board-rendering" but used by runner-web, menu, battle and the editor preview.
**Fix:** make the `text` command carry a `FontRef` (an asset or the bundled font), and require every replayer to rasterise from those same font bytes. Platform-font rendering then becomes an opt-in runner mode that is excluded from goldens. Add AD-15 to the ADR 0002 scope, and give the glyph-metric decision a contract owner (core/render) with its consumers listed.

### F-7 [medium] Design Paradigm graph — sibling edges used by C4, AD-21 and the epics are missing, so the AD-22 rule is undefined
c4.md has `Rel(eui, rweb, "Previews with")` and `Rel(dap, rhead, "Launches game through")`. AD-21 has dap "run the game through runner-headless". packages.md calls runner-web "the WYSIWYG renderer inside editor hosts". Epic editor-foundation waits on runner-web "for preview and test-run". The spine's dependency graph, which AD-22's dependency-cruiser rule will be written from, has neither `runner-web → editor-ui` nor `runner-headless → dap`. The G2 tier text puts these packages side by side. One epic will ban the edges and another will rely on them.
**Fix:** add both edges explicitly, or route preview through platform-services `run` and have dap depend only on `core`. Then state the sibling-edge rule ("same-tier imports allowed only as drawn") that AD-22 encodes. Note that a Node-only runner-headless rules out DAP in the `vscode.dev` web build that CAP-18 requires.

### F-8 [medium] AD-20 / AD-21 — editor-ui has no channel to the language server
CAP-18 says "no feature exists in only one host". Epic editor-foundation has "the program editor edits a program with the LSP … in both hosts". AD-21 makes `lsp` transport-free, but AD-20's platform-services surface has no language-server connection. In VS Code the program may be edited in the native editor; in the PWA, editor-ui's CodeMirror needs an LSP client. Without a contract, the PWA will call the core parser directly and the two hosts will drift.
**Fix:** add `language.connect(): MessagePort-like` to platform-services, and state that the editor-ui program editor is an LSP client of `lsp` in every host.

### F-9 [medium] AD-19 — no host-to-editor save, revert or backup calls
VS Code custom editors start save, save-as, revert and hot-exit backup from the host. AD-19 defines only `dirty`/`canUndo`/`canRedo` events and `undo()`/`redo()`, and says "hosts never edit document bytes". Each host will invent its own save handshake.
**Fix:** add `save()`, `saveAs(target)`, `revert()` and `backup() -> bytes` to the editor-ui document API that hosts call, plus a `document.saved` event.

### F-10 [medium] AD-1 / AD-5 / AD-14 — which step a multi-step `advance` applies inputs to, and what happens to inputs during `loading`
`advance(steps, inputs)` takes a batch, but the log is `{step, event}`. The spine does not say which of the `steps` an input applies to, or what happens to inputs passed while `loading: true` consumes no steps. runner-web (batching per frame) and runner-headless (replaying the log) will choose differently, and live play will not match its own recorded log.
**Fix:** state that inputs apply at the start of the first step of the call (or carry an explicit step), that the core, not the runner, writes the log entry, and that inputs received during loading are queued in order to the next consumed step. Also give a cap on catch-up steps per call (for example after a background tab).

### F-11 [medium] AD-3 vs AD-5 — draw list carries logical paths; `blit` has no src/dst rectangles or scaling rule
AD-5 "prevents per-runner path handling" by resolving to a canonical key in core, yet `TexRef = { asset: logicalPath }` hands runners unresolved paths. `blit` lists key, tint, alpha and blend but no source/destination rectangles. `zoom(%)` and `sizedAnimation` need scaling, and nearest versus linear sampling changes golden pixels.
**Fix:** make `TexRef.asset` the canonical key, add `src` and `dst` integer rectangles to `blit`, and fix nearest-neighbour sampling as the contract.

### F-12 [medium] AD-16 / AD-9 — cue kinds and wait kinds miss legacy audio behaviour
`wavStop` and `mp3pause` (format-spec §9.11, E-100) have no cue kind (`music.pause`/`music.resume`, `sfx.stop`). E-101 effects "optionally block until finished", but AD-9 has no `audio` wait kind tied to `audio.ended { cueId }`.
**Fix:** add those cue kinds, an `audio` wait kind keyed by `cueId`, and require `audio.ended` to carry `cueId`.

### F-13 [medium] Missing decision — the new single-file distribution format (E-131, CAP-12)
AD-6 covers only reading legacy `.tpk` and appended-ZIP EXE. E-131 says "a rebuild needs its own equivalents (web bundle, desktop binary with embedded archive)". The editor's packaging (epic editor-assets-p0, T-70) writes it, and runners (epic web-runner-packaging) read it. Neither the format nor its owner is fixed or deferred.
**Fix:** decide it (for example, "the distribution package is a `.tpk`-compatible ZIP with a manifest and schema version; web and desktop bundles embed it unchanged"), and name `core/formats/package` as its reader and writer.

### F-14 [medium] AD-17 / Deferred — save-area identity and `openUrl` policy are left per host
"Saved-game location and naming per host" leaves open what identifies a game's save area. If one host keys by folder name and another by a `.gam` hash, saves will not move between runners, and two games with the same key can read each other's saves, which breaks the AD-17 sandbox for untrusted games. `openUrl` and `quit` from untrusted games have no stated host policy.
**Fix:** fix a `GameId` derivation in core (for example, a hash of the `.gam` plus the package identity) that every host uses as the save-area key, and leave only the physical location per host. Add a rule: `openUrl` allows only `https:` and always asks the user to confirm.

### F-15 [medium] Missing Open Questions section — spec questions dropped
The spec's open questions on legacy `.sav` import (E-122; it shapes AD-10 and AD-23), on rejecting versus supporting text-era formats and compiled `.prg` (it shapes AD-18's error contract), and on AVI handling (it shapes `playVideo` in AD-17 and CAP-7) appear neither as decisions nor under Deferred. The auto-tiler source (T-25, a G7 matter) and the desktop shell are also only partly carried over.
**Fix:** add an Open Questions section that carries each spec open question over and names the AD it would change.

### F-16 [medium] Operational envelope — release and versioning, signing, secrets and PWA updates are not decided
Deployment targets and CI are drawn, but the spine says nothing, not even "deferred", about these points:
- semver and the stability promise of published npm packages (`core`, `synth`, `runner-web` are public API);
- extension versioning and publisher verification (an ADR 0001 mitigation);
- desktop and mobile code-signing and store accounts;
- where publish secrets live;
- the PWA service-worker update and cache policy against `SaveState` schema migrations;
- the browser and WebView support matrix beyond "WebGL2 Baseline".
**Fix:** decide or defer each item explicitly with an owner. For example: "npm packages follow semver from 1.0; `core` API changes need a changeset; the PWA updates on next launch, never mid-session."

### F-17 [low] Capability map disagrees with the Binds lines
- The map row for CAP-4 lists AD-8 and AD-9, but neither of their Binds lines includes CAP-4.
- AD-1 binds CAP-3/4/5/6/8/13, yet the map lists AD-1 only for CAP-2 and CAP-12.
- AD-3 and AD-15 bind CAP-13 but are missing from that row.
- AD-7 binds CAP-14 but is missing from that row.
- The "CAP-15 to CAP-17" row lists AD-18 and AD-19, which do not bind CAP-17.
- CAP-17's setup builder (T-72) and audio preview have no governing AD beyond AD-20.

**Fix:** generate the map from the Binds lines, or mark which ADs are primary for each CAP.

### F-18 [low] AD-12 — the list of RNG consumers leaves out real ones
"Only the random built-ins and battle consume it". But the random-battle roll runs in the per-step trigger and movement loop (E-03 step 4, E-70), owned by movement-triggers, and `wander` (E-32) is ongoing sprite behaviour.
**Fix:** list the consumers (random built-ins, battle, the random-battle test, wander), and fix their order of use within a step under AD-25.

### F-19 [low] AD-13 — the lint ban does not cover `**`
ECMA-262 makes `**` (Number::exponentiate) implementation-approximated, just like `Math.pow`. RPGCode's `^` and `^=` (§9.4) will naturally be written with `**`.
**Fix:** ban `**` and `**=` in `core` and route them through `fmath.pow`.

### F-20 [low] AD-2 — misstates G3.1
"No clock enters core (G3 injects none)". G3.1 says the core "MUST obtain time only from an injected clock". The substance (the step counter is the clock) is fine, but the platform-baseline epic will scaffold a Clock port from G3.
**Fix:** reword it as "the injected clock is the step counter supplied through `advance`; `getTickCount` and `gameTime` derive from it".

### F-21 [low] AD-14 — key events carry no text character
`prompt(question)` and the character-coded menu keys (E-110) need the typed character (including shift and layout), not just the legacy name and scan code.
**Fix:** add `char?` to the `key` event, or add a separate `text` event.

## Checked and fine
- Every Stack version exists on npm as named on 2026-10-10. Node 24.21.0 is the latest LTS ("Krypton"); 26.x is Current. Licences are permissive: spessasynth Apache-2.0; Tauri `Apache-2.0 OR MIT`; `ovsx` is EPL-2.0, publish-only, outside G6's shipped-artefact scope.
- G6 and FluidR3_GM: the MIT notice matches G6.3.
- AD-4 and AD-13 correctly flag ADR 0002 for amending architecture-options §2 and G3 enforcement.
- AD-6 adding `fflate` to the allowlist is consistent with G2.3.
- Mermaid: `graph LR`/`TD` node ids, `C4Context`/`C4Container`/`C4Component` macros and the sequence diagram are syntactically valid.
