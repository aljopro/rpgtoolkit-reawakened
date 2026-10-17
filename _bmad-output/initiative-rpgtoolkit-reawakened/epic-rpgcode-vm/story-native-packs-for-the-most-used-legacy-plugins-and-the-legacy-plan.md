---
title: 'Native packs for the most-used legacy plugins and the legacy-name table'
type: 'feature'
ticket: 24
created: '2026-10-16'
status: done
baseline_revision: '0429a753'
route: 'full'
risk: 'medium'
context:
  - 'docs/guardrails.md'
  - 'docs/adr/0004-script-ast-step-ir-and-plugins.md'
  - 'docs/spec/engine/plugins-and-battle.md'
  - 'docs/spec/formats/main-file.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/plugin-definition-spike.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/spike-23/spike-legacy.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/zip-survey-plugins.csv'
---

## Intent

Add native `PluginDefinition` command packs for the high-frequency legacy plugins identified in the 2,783 archived units corpus, register them in the engine's default manifest so they can be removed or wrapped by user manifests, retire entry 15's placeholder stubs in `@tk-reawakened/plugin-tk2-compat`, and provide a static table mapping all legacy plugin identities (the `tkplug0`..`tkplug4` slots, `.gam` file names, and Multi-Plug `plugins.ini` entries) to native packs or to located not-supported diagnostics with program/occurrence counts.

## Boundaries and decisions

- Implement native packs as pure `PluginDefinition`s in `@tk-reawakened/core`: GsMiscPlugins (`gsmisc`), Triuken (`triuken`), `filereadwrite`, `proplug`, `xfmwin`, `kaimu`, and `twbutton`.
- Packs record their side effects for domain section owners (`party`, `inventory`, `sprites`, `battle`, `surfaces`, `ui`, `audio`, `fx`, `time`, `vm`) through `effects`; domain logic stays with those domain epics.
- `filereadwrite` commands (`fileRead`, `fileWrite`, `fileAppend`, `fileWriteParse`, `fileAppendParse`) use sandboxed host requests (`loadBlob`, `saveBlob`) in the `saves` area per G2 and AD-17.
- Decline unportable capabilities with located not-supported diagnostics: raw network sockets (multip, FaeroSock), WININET/FTP (FTP.dll), COM/ActiveX (E-Mail, DarkAge, shoot), DirectX audio (DragSound), Flash/SWF (flashplug), and Win32 handles/GDI (bps_adv, Edit Box, Resolution Changer, Launch Any File).
- The static legacy-name table maps every archived legacy plugin identity (slots `tkplug0`..`tkplug4`, DLL filenames, Multi-Plug `plugins.ini` CLSIDs/keys) with its program/occurrence counts to a native pack, stock subsystem, loader, or declined diagnostic.
- Add native pack entries to `ENGINE_DEFAULT_MANIFEST` so any pack can be disabled, removed, reordered, or wrapped via `next` by game/user manifests.
- Update `packages/plugin-tk2-compat`: remove superseded stubs for names provided by native packs; keep declined stubs for unportable commands (`httpread`, `ftp*`, `ksniloc_email_send`).

## Code map and ordered tasks

1. Add `packages/core/src/script/legacy-plugins.ts` containing the static table `LEGACY_PLUGIN_TABLE`, mapping functions `lookupLegacyPlugin` and `mapLegacyPlugin`, located diagnostic helper `getDeclinedPluginDiagnostic`, and the native packs `GSMISC_PLUGIN`, `TRIUKEN_PLUGIN`, `FILEREADWRITE_PLUGIN`, `PROPLUG_PLUGIN`, `XFMWIN_PLUGIN`, `KAIMU_PLUGIN`, and `TWBUTTON_PLUGIN`.
2. Update `packages/core/src/script/manifest.ts` to include the native packs in `ENGINE_DEFAULT_MANIFEST`.
3. Export the legacy plugin table, lookup helpers, and native packs in `packages/core/src/script/index.ts` and `packages/core/src/index.ts`.
4. Update `packages/runner-harness/src/script-host.ts` to include native packs in the host-side definition table for default resolution.
5. Update `packages/plugin-tk2-compat/src/index.ts` to remove superseded stubs replaced by the native packs, leaving only true unmapped/declined stubs.
6. Add unit tests in `packages/core/test/script-legacy-plugins.test.ts` verifying static table coverage, occurrence counts, declined diagnostics, and pack command signatures/effects.
7. Add integration tests in `packages/runner-harness/test/script-legacy-packs.test.ts` verifying headless execution with recorded effects, default manifest inclusion, manifest patch remove/disable/wrap behavior, and declined plugin diagnostics.

## Acceptance criteria

- Every legacy plugin identity in the archived corpus maps to a native pack or a declined diagnostic with its program count.
- The default manifest contains the native packs, resolving in command-layer order after `core` and `catalogue`.
- Each native pack can be disabled, removed, or wrapped via `next` through a user manifest patch.
- A corpus program calling native pack commands runs headlessly with its effects recorded in the VM state.
- Unportable plugin calls (FTP, sockets, ActiveX, DirectX, Win32, Flash) produce located not-supported diagnostics without crashing.

## Proposed rulings (pending owner review)

1. **Legacy Plugin Identity Normalization & Mapping:** Legacy identities (.gam file names, tkplug0..4 slots, Multi-Plug plugins.ini entries, ActiveX CLSIDs) are normalized (case-insensitive, extension-optional, path-stripped) and mapped to a native pack id, stock subsystem, loader, or declined diagnostic citing the unportable capability and occurrence count.
   *Evidence:* `spike-23/spike-legacy.md` Section 4 and `zip-survey-plugins.csv`.
   *Rejected alternative:* Silent no-ops or unlocated errors; rejected because silent stubs hide failures and violate AD-17/AD-24.

2. **Native Packs in Default Manifest:** The native packs are registered in `ENGINE_DEFAULT_MANIFEST` after `core` and `catalogue`, making them removable and overridable by user manifests.
   *Evidence:* ADR 0004 decision 6, spike-23 owner ruling (manifest as configuration).
   *Rejected alternative:* Hardcoding commands into `core` or `catalogue`; rejected because user manifests could not disable or replace them.

3. **`filereadwrite` Host Requests:** `filereadwrite` commands use AD-17 host requests (`loadBlob`, `saveBlob`) in the `saves` sandbox, maintaining G1 (plain JSON state) and G2 (I/O in host only).
   *Evidence:* `spike-legacy.md:150-151`, E-97, AD-17.
   *Rejected alternative:* Arbitrary path access or synchronous filesystem calls; rejected by G2 and security sandboxing.

4. **Retirement of Entry 15 Stubs:** Superseded stubs in `TK2_COMPAT_PLUGIN` are retired so they do not shadow native pack implementations in layered registration.
   *Evidence:* Ticket 3.24 description ("replacing entry 15's recorded-effect stubs").
   *Rejected alternative:* Leaving stubs in `TK2_COMPAT_PLUGIN`; rejected because later-registered `tk2` would shadow native packs and fail.

## Verification

`pnpm typecheck`; `pnpm test`; `pnpm fixtures:fetch`; `pnpm test:strict`; `pnpm lint`; `pnpm graph`; `pnpm licence`; `pnpm provenance`; `pnpm catalogue:check`.
Confirm no tracked golden changes and no legacy GPL source imports (G7).
