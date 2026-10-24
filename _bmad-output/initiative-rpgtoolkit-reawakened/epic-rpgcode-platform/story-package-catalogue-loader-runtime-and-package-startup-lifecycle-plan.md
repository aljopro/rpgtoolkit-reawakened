---
title: 'Package catalogue loader runtime and package startup lifecycle'
type: 'feature'
ticket: 17
created: '2026-10-21'
status: done
baseline_revision: 'ae5021c082895c995106d91683af29fce37f9204'
route: 'full'
route_source: 'auto'
risk: 'high'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context:
  - 'docs/guardrails.md'
  - 'docs/spec/engine/rpgcode-modules-and-objects.md'
  - 'docs/spec/engine/main-loop-and-startup.md'
  - 'docs/spec/formats/main-file.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The closed 19.16 documentation handoff describes a host package catalogue and startup lifecycle, but the runtime still treats `.gam` package IDs as native plugin IDs, discards package metadata, never loads package startup programs during engine boot, and leaves package startup to runner-harness-only injection. Epic 20.11 therefore cannot run real package-backed behavior.

**Approach:** Add the smallest host/core boundary that carries validated package catalogue entries (metadata, actual plugin definition, and owner-tagged startup source) into the existing shared manifest and plugin registry. Resolve `.gam` names during boot, run package startups through the existing deterministic lifecycle before main startup, and rebuild the same session registrations on reset and restore without serializing them.

## Boundaries & Constraints

**Always:** The host supplies catalogue and source data; core performs no filesystem, network, archive, DOM, timer, random, or clock I/O (G2/G3). Use one manifest, one command registry, existing `registerPlugin`, existing `runPackageStartup`, owner-tagged `ProgramRef`, deterministic manifest order, and plain-data saved state. Missing packages diagnose and compatibility boot continues. Package requests remain informational and no capability gate is introduced.

**Never:** Do not reopen or rewrite closed 19.16/#540, change the `.gam` extension format, create a second package list or dispatcher, inject a fake catalogue only in runner-harness, add package script-function/object namespace lookup deferred by PKG-4, load native TypeScript packages, or invent a package folder/descriptor reader in core.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Real package | `.gam` package ID plus host catalogue entry with metadata, plugin definition and startup source | Shared manifest carries package metadata/program; resolved plugin carries namespace; startup registers command/role before main startup | No error |
| Missing package | Listed ID absent from catalogue | No package plugin/startup is installed; boot continues with defaults and main startup | One located `plugin.unresolved` naming main file and list index |
| Startup wait | Catalogue startup ref parks on a wait | Package layers are not accepted as complete | `package.startup-unfinished` load-time diagnostic/failure per existing lifecycle |
| Reset | Active resolved package catalogue and fresh reset sections | Same package order/metadata, new deterministic session layer IDs and startup registrations | No saved package layer data |
| Restore | Saved VM with package layer handle or parked wrapper | Fresh package startup rebuild occurs before state hydration; handles resolve against rebuilt session table | Restore rejects invalid/missing handles as existing restore checks do |
| No packages | No TKR package-list entries | Existing native/default manifest and startup behavior unchanged | No package diagnostic |

</frozen-after-approval>

## Code Map

- `packages/core/src/script/manifest.ts` -- extend the package entry/declaration contract with the startup program reference and preserve parser/patch validation and package ordering.
- `packages/core/src/script/plugin.ts` -- carry host-resolved package metadata/startup through `ResolvedPlugin` without changing command/plugin dispatch contracts.
- `packages/core/src/engine/boot.ts` -- resolve TKR IDs against a host catalogue, preserve located diagnostics, and return package startups alongside resolved plugins.
- `packages/core/src/engine/engine.ts` -- accept the host catalogue, wire package startup refs into boot and reset lifecycle, and expose the package resolution used by reset/restore paths.
- `packages/core/src/script/package-startup.ts` -- reuse the normative deterministic startup runner and surface its existing unfinished behavior through engine diagnostics.
- `packages/runner-harness/src/script-host.ts` and `packages/runner-harness/src/corpus.ts` -- keep the explicit test host compatible while adding an actual catalogue-backed boot fixture; do not make this the only runtime path.
- `packages/core/test/engine-boot.test.ts`, `packages/core/test/script-manifest.test.ts`, and new package-loader tests -- prove metadata, catalogue resolution, missing-package compatibility, startup execution/order, reset/restore rebuild, and no-package compatibility.
- `docs/spec/engine/rpgcode-package-loader.md` -- standalone doc-first contract for catalogue shape, matching, startup source, diagnostics, reset/restore, and host boundary where existing normative docs are open.

## Tasks & Acceptance

**Execution:**
- [ ] Add the standalone normative package-loader contract before code, then commit docs separately.
- [ ] Add package program/source and catalogue contracts to core plain-data seams; preserve native manifest behavior.
- [ ] Resolve `.gam` package IDs through the host catalogue during real engine boot and pass metadata/owner-tagged startups into the shared registry.
- [ ] Run package startup before main startup and rebuild it on reset; retain existing runner-harness startup compatibility.
- [ ] Add actual project/`.gam` package boot tests plus diagnostics and restore/reset coverage; update goldens only if an observed deliberate hash change requires it.
- [ ] Run full repository gates, obtain independent review, create PR with `Fixes #562`, and verify hosted checks/issue closure.

**Acceptance Criteria:**
- Given a host catalogue entry and a `.gam` package name, when boot resolves the manifest, then the package has declared identity/version/namespace/requests and an owner-tagged startup program, and its real command/role registration is callable before main startup.
- Given a listed name absent from the catalogue, when boot advances, then one located `plugin.unresolved` identifies the main file/list position and compatibility/no-package behavior continues.
- Given reset or restore, when lifecycle setup runs, then package startup rebuilds deterministic session registrations before saved state hydration and package registrations remain absent from serialized state.
- Given no package entries or existing native plugins, when boot runs, then legacy/default behavior and goldens remain unchanged.

## Implementation Notes

- Investigation found no engine-level restore API; preserve the existing host restore orchestration and add catalogue-compatible inputs without pretending `SavedGamePort.restored()` hydrates state.
- The existing `ResolvedPlugin.namespace`, `withOwner`, `runPackageStartup`, layer table, actor behavior registrar, and ProgramLoader are the intended seams.
- The current docs leave `program`, catalogue matching/source shape, and E-02 package-startup placement underspecified; the standalone doc resolves only the behavior required by this story and leaves package distribution/editor concerns out of scope.

## Plan Change Log

## Review Triage Log

## Design Notes

Package metadata is host-owned input, not a file format. A catalogue entry may carry an actual `PluginDefinition` for native commands/roles plus an inline or file `ProgramRef` for RPGCode startup. The core receives these values already resolved and only validates/combines them with the TKR names; this keeps G2 honest and avoids a fake catalogue that exists only in test code.

## Verification

**Commands:**
- `pnpm typecheck` -- expected: all workspaces typecheck.
- `pnpm lint` -- expected: lint and guard-rail checks pass.
- `pnpm test:strict` -- expected: unit and integration tests pass.
- `pnpm golden` -- expected: existing and new headless goldens pass without unexplained changes.
- `pnpm graph` -- expected: dependency graph remains one-way with core free of host I/O.
- `pnpm provenance` -- expected: clean-room provenance gate passes.
- `pnpm licence` -- expected: license allowlist passes.
- `pnpm catalogue:check` -- expected: generated command catalogue is unchanged and consistent.
- `pnpm command-docs:check` -- expected: command docs remain synchronized.

**Manual checks (if no CLI):**
- Confirm the closed #540/19.16 entry and plan remain unchanged except for the pre-existing ledger state, and confirm PR body uses `Fixes #562`.
