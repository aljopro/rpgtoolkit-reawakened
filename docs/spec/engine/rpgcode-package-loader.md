# RPGCode package loader

This page defines the host/core contract that makes a package named by a `.gam` file real at runtime. The host supplies package data and source before boot; the core resolves that data through the existing plugin manifest and runs package startup through the existing script step machine. The core never opens a package folder, archive, descriptor, or source file.

## Catalogue input

A host supplies a package catalogue before boot. Each catalogue entry is identified by the package `name` used by the TKR package-list extension and contains:

- `name`: the lower-case ASCII package identifier accepted by the package-manifest rules;
- `version`: a non-empty string compared for equality only;
- `namespace`: the declared lower-case ASCII namespace, or the folded `name` when omitted;
- `requests`: the declared host-request kinds, for display by a runner only;
- `startup`: the package's RPGCode start-up `ProgramRef`, already resolved by the host and tagged with the package name as its owner; and
- the package's command/role definition, when it supplies host-side commands, event listeners, host object types or actor behaviours through the documented `PluginDefinition` interface.

The catalogue is runtime input, not a second manifest and not a file format. A runner may construct it from a project folder, a distribution archive or bundled stock data, but that choice is outside the core contract. A host that has no entry for a listed name does not invent one from the `.gam` file.

Catalogue names are matched to the names in the `.gam` list after the existing ASCII identifier validation. A name that is not a valid package identifier produces the existing located `manifest.package-name` diagnostic. A valid listed name with no catalogue entry produces one located `plugin.unresolved` diagnostic containing the main-file key and the package-list position; boot continues without that package.

## Manifest resolution

The TKR package list is the only game-authored package list. The engine appends its entries, in stored order, after the default engine manifest. Legacy menu, battle and command-plugin rows remain data and do not create package entries.

For every listed name found in the catalogue, the loader creates a package entry in the shared `PluginManifest` with its `name`, `version`, `namespace` and `requests`, plus its `startup` reference. The corresponding `ResolvedPlugin` carries the catalogue's command/role definition and the resolved namespace. There is one ordered command table: later manifest entries run first and `next` reaches the layer below. A package does not receive a separate dispatch path.

The startup reference is session input, not saved game state. Its owner is the package name, so compilation, per-package step counters and diagnostics identify the package. Package registrations made by `registerPlugin`, actor-behaviour registration and the native plugin interface all enter the existing session registries.

## Startup lifecycle

After the complete manifest and its session services are built, the engine runs every resolved package's startup in manifest order and before the main file's startup program. Startup uses the ordinary deterministic step machine and step budget. It must finish without waiting; package startup is not an interactive game program and does not advance the game clock. A startup that waits or exceeds the bounded startup budget produces `package.startup-unfinished` and is not accepted as a completed package installation.

Package startup is trusted VM-contained RPGCode. Declared host requests are informational, as specified by the trust baseline: an undeclared request is not refused and does not create a second capability gate.

## Reset and restore

`reset()` clears session registries and rebuilds them from the active resolved package catalogue, then reruns package startup in the same manifest order before the fresh main startup. Layer IDs, registration IDs and closure-cell IDs are deterministic for the same catalogue and startup sources.

A restore rebuilds the package session on a fresh scratch state first, then applies the saved state and verifies its callable handles against the rebuilt registry. Package layers, native listener registrations and behaviour callbacks are never fields in the saved state. A saved thread parked inside a package layer resumes through the rebuilt layer with the same owner and handle identity rules.

With no TKR package entries, the loader performs no catalogue lookup and existing default/native-plugin startup behavior is unchanged.

## Scope

This contract does not define how an editor discovers package folders, how a distribution archive stores package data, dependency resolution, version ranges, trust prompts, or `namespace.name` lookup for package script functions and objects. Those concerns need their own documented decisions before implementation.

## References

- [RPGCode modules and objects](rpgcode-modules-and-objects.md), PKG-1 to PKG-8 and MOD-4
- [Start-up, main loop and timing](main-loop-and-startup.md), E-02 and E-06
- [Main game file](../formats/main-file.md), TKR package-list extension
- [RPGCode packages and trust baseline](../../adr/0008-rpgcode-packages-and-trust-baseline.md)
- [Guard-rails](../../guardrails.md), G1, G2, G3 and G7
