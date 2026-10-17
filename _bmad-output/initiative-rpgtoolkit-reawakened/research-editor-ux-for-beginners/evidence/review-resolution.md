# Review resolution and verification record

**Research integration, 2026-10-17.** [Original review](review-notes.md) covered flows 01–07, with a brief addendum for 08. It is retained as historical evidence; its line numbers and uncorrected examples are not the final state. Flows 09/10 and the HTML were added afterwards and were checked during integration, not by that original reviewer.

## Authority correction

Earlier chat and the first decision record called several suggestions “settled” without explicit owner agreement. [The corrected record](../decisions.md) separates Jensen's directions from recommendations:

- Selected: beginners/hobbyists, complete capability, common one-click actions plus code, grouped generated snippets, tile **or** vertex walls/walk-behind on layers, drawing-tool structure, Properties on the right, generator maybe later, hidden main file with conventions/defaults, robust plugin editing, less tedious tile/animation creation.
- Not selected: import-only/remove writers, save-first/current-board Play, exact `_generated` path, block metadata encoding, components, native manifest or new file formats.
- The runtime-live-model “no” is not a blanket ban on embedded preview.

No ADR, epic, ticket, normative spec or production engine/editor package was edited. Research recommendations do not silently change the implementation scope.

## Cross-document findings reconciled

| Initial findings | Resolution in the studies | Remaining dependency |
|---|---|---|
| C1–C2: Chest/Pickup/Person identity | People definitions in Database; Items includes Consumable/Equipment/Key item/Advanced. Chest/Pickup are placed Things referring to items; persistent state can use saved trigger variables | Native component metadata optional, not falsely required for a one-time Chest |
| C3: conflicting Play meanings | Recommend current-board Play, separate Play from start, safe explicit spawn and saved test scenarios; no arbitrary last-click spawn | Owner confirmation and runner request contract |
| C4: three owners for startup | Party setup owns starting members/inventory; Start here/marker belongs to board; settings displays effective values with jump links | Multi-member party storage or startup code |
| C5: Stamp versus Component | Stamp = copied visual tiles/tint. Component = grouped artwork and behaviour with optional linked instances | Component definition/instance persistence |
| C6: inconsistent starter lists | Flow 03 owns the catalog, including battle visuals, UI/font and 12 listed sound cues; templates reference that catalog | Named sources, rights, notices and actual starter fixtures |
| C7–C8: legacy write/native storage | Import/playback preserved; write-back not promised or banned; no automatic legacy exporters in the suggested main path | Explicit format/write decision; current writer epic unchanged |
| C9: inherited versus drawn walls | Per-tile metadata plus explicit shapes and visible per-cell board overrides; changing one cell does not change every instance of the tile | Auto-solid model approval and geometric override semantics |
| C10–C12: separate Battle database/settings | One Database including Backgrounds, plain stat names, Board Settings owns per-board battle fields; stock global encounter pool preserved | Plugin-specific extensions and unresolved battle rulings |
| C13–C14: competing layout/import vocabulary | Shared Project/Outline/Assets dock; right Properties; one Cell width/height, Margin X/Y, Gap X/Y preview step before job-specific import | Responsive/keyboard implementation and user testing |
| C15–C17: future generator, terminology, non-board script owners | Generator documented later, not a disabled product button; named roles clarified; non-board generated grouping explicitly a proposal | Final vocabulary and generated naming policy |
| Reviewer addendum: flow 08 drift | Corrected global encounter pool, stock charge-based battle description, missing external `.gam` import and source-of-truth ownership | Hiding a file does not mandate a new manifest |

## Factual corrections

- **Command census:** fixed the inverted 62.4% statement and separated 2,550 distinct texts from 2,521 with detected identifiers. Further weakened “coverage”: a regex scan cannot prove whole programs can be expressed by ten blocks.
- **Command meanings/signatures:** `put` changes board tiles, not screen layout; obsolete `bordercolor` is not generated. Explicit-enemy `fightenemy` has no skill parameter; skill belongs to `fight`. Fade colour/speed and the Say/wait example were corrected against the catalogue.
- **Board semantics:** non-positive legacy start coordinates resolve to defaults, not an “unset” fact. Higher-layer board content overlaps lower-layer sprites; Under regions are a separate occlusion mechanism, not collision. Rotated-corner reasoning is identified as inference where the cited page does not state it.
- **GIF import:** transparency selection includes the first page's transparent index before background index/fallback. Decoding belongs to the core reader, not an arbitrary host decoder.
- **Battles:** zero status rounds is not an established infinite-duration setting. Losing follows game-over/reset rules unless a new behaviour is explicitly defined. Stock damage/charge figures remain conditional on the cited R-57 conflict; audio-blocking work acknowledges R-59 rather than claiming a settled contract.
- **Import:** a bare legacy asset folder may not contain its main file. Offer a root, a paired main/assets selection or a supported package.
- **Architecture:** the DOM-free document model is not the DOM-capable editor UI. Plugin panels do not gain a private filesystem path, a special stock trust tier or desktop support for legacy native DLLs.

## Scenario honesty

The studies now distinguish interactions described on paper from implementation dependencies. “Covered” or “Designed” means the proposal provides the path; **Conditional** means the path still needs specified storage, assets, host capabilities or transaction semantics. Neither means a beginner completed the task.

Corrected examples include spawning **adjacent to** a step-on door, not assuming spawning inside it fires entry; using a named seeded scenario for repeatability, not claiming ordinary Play has a selected seed; and marking single-undo project renames/generation as conditional on a multi-document contract.

## Capability coverage map

This is where the previously missed groups are addressed, not a delivery schedule or a claim they are implemented.

| Inventory | Research home |
|---|---|
| T-01–T-09 workspace/preferences/help | Flow 07: shell, host capabilities, onboarding, recovery and preferences |
| T-10–T-14 game settings | Flows 07/08: effective defaults/overrides, controls, cursor, movement, display, encounters and plugins |
| T-20–T-29 board authoring | Flow 01: tile/vector tools, layers, images, Things, lights, settings, clipboard and starts |
| T-30–T-31 conversions | Flow 01: pixel-coordinate/pre-vector imports, explicit conversion and preservation; no silent re-projection |
| T-32–T-35 board export/preferences/placeholders | Flow 01, source import details in 03; no placeholder art silently exported |
| T-36–T-39 tile tools | Flows 03/10: source-sheet editing, pixel tools, grid extraction, tileset curation, animated tiles; legacy writer policy remains open |
| T-40–T-46 scripts/events/format helpers | Flow 02: full code path, generated actions, test scenarios, non-destructive migration, header and canonical formatting |
| T-50–T-55 characters/items | Flows 04/05: stats, equipment, growth, use contexts, looks and geometry |
| T-56–T-58 enemies/moves/effects | Flow 06 with plugin extensions in 09 |
| T-60–T-62 animation/composition | Flows 03/05/10: timeline, import, source/frame ownership and artwork stamps |
| T-63–T-64 backgrounds/skins | Flow 06 background; flow 07 skin authoring coverage and shared layout contribution design in 09 |
| T-70–T-74 builds/import upgrades | Flow 07: distribution, executable/setup profiles, legacy flat-layout import, preflight and host constraints |
| T-80 audio audition | Flow 03: contextual audition; not a required separate player window |
| T-81 built-in web browser | Flow 07 uses external documentation browser instead of recreating an obsolete embedded browser |
| T-82 associations | Flow 07: host-capability-based file association, not a browser promise |

## Evidence checks actually performed

1. Ran the copied command scan from the archive root: **2,550** distinct texts, **2,521** with matches; reported frequencies and detected-identifier percentages reproduced. The script depends on the archive's existing read-only ZIP iterator.
2. Recovered the actual community-search expressions into [community-scan.py](community-scan.py), including both recognised/recognized spellings, and reran it. All 15 table rows reproduced (including 26 corruption/missing lexical hits). Counts are keyword matches, not confirmed incident prevalence.
3. Compared **66 excerpt entries** against source record IDs, author handles, date prefixes and normalised source substrings, with a fewer-than-30-word check. Fixed seven initial mismatches (typo cleanup, punctuation/escaped quotation marks, a handle and a reconstructed question); the corrected entries pass. Ellipses indicate omissions; no private-message dump was copied into this folder.
4. The independent reviewer inspected **42 initial spec claims**; the surprising incorrect claims were corrected as above. This is document verification, not runtime reproduction of the legacy engine.

## Interaction study checks actually performed

Opened [interaction-study.html](../interaction-study.html) in Chromium and exercised:

- Outline selection and matching Properties; changed a Person's line and observed the generated snippet.
- Switched wall editing tool to vertex mode; the sketch states that geometry is not edited by this control.
- Duplicated a water frame, painted a pixel, undid the change and observed frame advancement during playback.
- Made a separate artwork copy, restored original artwork, then undid restoration; copied scope and the edited pixel returned together.
- Changed startup override, inspected effective values, reset to convention.
- Moved the Classic party panel, changed tactical-example movement, switched back and forth and observed both retained values.
- Inspected desktop and narrow-screen screenshots; no page errors were reported during these interactions.

The study deliberately does **not** implement real project persistence, geometry editing, source imports, RPGCode execution, plugin loading, animated-region runtime or upload/publishing. Those are design subjects, not disguised mock implementations of production features.

## Final documentation checks

- Internal Markdown links/anchors and fenced-block balance are checked mechanically across the folder.
- The single Mermaid diagram in flow 02 was parsed with the real Mermaid parser in a scratch install outside the repository.
- A missing fence in the sheet-import sketch was repaired after the structure check caught swallowed headings.
- No builds, engine tests or full-repository lint were run: production code is unchanged. The research HTML was smoke-tested as described above.

## Still open, not quietly waived

Actual starter assets/permissions; storage/legacy-write policy; cross-document generation/save/recovery/undo; plugin authoring contribution and preview contracts; region-animation timing/source model; share-link service/privacy; unresolved normative battle/audio decisions; and usability validation with first-time authors. These are research findings and architecture dependencies, not partially implemented features.
