---
id: 17
type: story
title: "Implement package catalogue loader and startup runtime"
tracker_id: "#562"
remote: "https://github.com/tk-reawakened/rpgtoolkit-reawakened/issues/562"
parent: epic-rpgcode-platform
covers: [CAP-5]
after: [16, 6, 7, 8, 9, 13]
hitl: false
risk: high
---

# Implement package catalogue loader and startup runtime

## Description

Implement the real host package catalogue and loader runtime promised by Epic 19.16's normative docs. A host-supplied catalogue maps package ids in the `.gam` TKR package list to package identity, version, namespace, declared host requests, and startup source. The engine resolves these entries, runs startup programs through the normative lifecycle, and rebuilds package registrations on boot, reset, and restore. Core performs no I/O; the host supplies catalogue data and source programs.

## Acceptance Criteria

- Given a host-supplied catalogue and a `.gam` package list, when boot resolves the manifest, each listed package has its declared id/name, version, namespace, host requests, and startup `ProgramRef`/owner; a missing catalogue entry emits one located `plugin.unresolved` diagnostic naming the main file and list position while compatibility boot continues.
- Given a package startup program, when boot runs, it executes through the normative package-startup lifecycle in manifest order before the main startup; real package commands and roles register through the documented plugin interface and are callable by the engine. Startup cannot perform I/O, random/time work, or wait; a violation reports the specified startup diagnostic.
- Given reset or restore, when lifecycle setup runs, package startup rebuilds the session layer/role table deterministically. Restore starts packages on scratch state before loading saved state; runtime registrations are not serialized into game state.
- Given a project folder with a real package and `.gam` package-list extension, when the headless core/runner test boots it, the package loads and startup behavior is observed through the actual host catalogue boundary; the 19.9 plugins-list path and startup execution are covered.
- Existing no-package and native-plugin compatibility behavior remains unchanged, all legacy goldens remain unchanged, and core has no filesystem/network/DOM/timer access (G2/G3).

## References

- parent — _bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-platform/epic-rpgcode-platform.md
- tracker - https://github.com/tk-reawakened/rpgtoolkit-reawakened/issues/562
- handoff - Epic 19.16 docs handoff, issue #540 (closed; do not reopen)
- spec - docs/spec/engine/rpgcode-modules-and-objects.md (PKG-1 to PKG-8)
- spec - docs/spec/engine/main-loop-and-startup.md (E-02 package boot, reset, restore)
- spec - docs/spec/formats/main-file.md (TKR package-list extension)
- code - packages/core/src/engine, packages/core/src/script/manifest.ts, plugin.ts, package-startup.ts
- code - packages/runner-headless and packages/runner-harness tests/fixtures
