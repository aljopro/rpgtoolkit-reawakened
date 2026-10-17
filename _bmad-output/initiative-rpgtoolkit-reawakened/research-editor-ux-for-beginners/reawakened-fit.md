# Fit with the accepted project architecture

**Research, not an amendment.** The studies propose interactions; they do not alter ADRs, the specification, guardrails, epic scope or delivery order. [Decisions](decisions.md) distinguishes Jensen's actual directions from the room's recommendations. Earlier drafts overstated import-only, embedded Play and a native format as owner selections; that is corrected here.

## Existing foundations we can reuse

| Source | Existing requirement | Implication for the design |
|---|---|---|
| Project brief | Beginners first; finish a small game and send a friend a link | Optimise first success **and** finishing/exporting, not just the first blank canvas |
| ADR 0001 / G2 | Shared host-agnostic editor UI, standalone and VS Code hosts | Same Properties, import and specialist tools; hosts supply services, not separate editor features |
| Architecture AD-19 | DOM-free editor-model, serialisable commands, host document lifecycle, one document instance per URI | Undo, backup, revert and external-change handling have an owner; no second edit stack in a plugin panel |
| AD-20 | Platform services for files, running, export, language connection and host capabilities | PWA storage and Desktop/VS Code filesystem differences must be visible without changing authoring behaviour |
| AD-29 | Shared pure board compositor | Board preview and image export must not acquire a competing interpretation of layers/occlusion |
| ADR 0004 | Dialect frontends lower through a unified semantic AST and Step IR; one ordered plugin contract | Generated snippets can use the existing language pipeline; plugin authoring UI is a separate contribution-design gap |
| ADR 0005 | Independent product; native format permitted when justified; legacy write not promised | Neither mandatory legacy round-trip nor automatic conversion of every project is already selected |
| G6 | Permitted code/assets with notices | A starter library requires actual identified licensed sources, not merely a promise to use free art |
| G7 / ADR 0007 | Implementation derives from approved repo documentation | External legacy functional guides are UX research inputs, not a replacement normative implementation specification |

## Decisions that do not require a format change

- Hiding `.gam` from normal authoring views.
- Showing effective defaults and exceptions instead of a form full of switches.
- Renaming a UI label, combining related views, and making optional fields contextual.
- A shared grid-detection UI for tiles and character artwork.
- A shorter route to generating existing RPGCode actions.

These may still require editor work and validation; they are not proof that a new manifest or container is needed.

## Questions that really may require more authoring data

| Feature | Missing relationship/data | Conservative path to evaluate |
|---|---|---|
| Stable references | Identity distinct from filename/index | Project identity map or native records; verify impact on dynamically computed strings |
| Tile collision inheritance | Per-tile metadata and board overrides | Namespaced editor metadata if sufficient; do not silently mutate every placed tile |
| Animation editing | Editable source sheet, selected frame regions, optional non-uniform duration | Preserve source and legacy timing; choose additional data only for features that need it |
| Animated multi-cell regions | Shared clock/channel mapping and editable region source | Verify against core timing first; do not promise `.tan` can encode all region semantics |
| Components | Definition/instance relationship and local overrides | Basic artwork Stamp remains separate; existing trigger variables can already express a one-time Chest |
| Plugin editors | Provider discovery, field ownership, diagnostics, panel lifecycle, migration | Versioned authoring contributions proposal; no public API is selected by this research |
| Starting party/inventory | More than the legacy one initial character field | Existing startup commands can express setup; explicit native party data is another option |

## Blocks: compare persistence options before selecting one

The user wants generated RPGCode snippets kept together under Programs, possibly by board. Exact `_generated` spelling, metadata storage and compilation route remain recommendations.

| Option | Benefits | Main hazards |
|---|---|---|
| Structured metadata inside generated `.prg` comments | One portable file, existing runtime/LSP path | Detect hand edits and preserve unknown text; metadata convention needs versioning |
| Metadata beside generated `.prg` | Clean executable script; exact visual authoring representation | Two related documents require coordinated save/recovery and divergence checks |
| Native block document plus generated `.prg` | Typed authoring data, readable generated output, potential AST reuse | Additional format, deterministic generation, ownership map and source locations; still a two-artifact consistency problem |

**Proposed default:** structured authoring data plus generated RPGCode, evaluated against representative quests and hand-edited snippets before committing to a container. Direct block-to-AST lowering is technically plausible under ADR 0004, not automatically an implemented third frontend. The LSP can initially validate generated RPGCode with a source map; it need not independently parse native block data.

The current editor-P2 criterion that a visual builder emits RPGCode must remain satisfied or be explicitly amended. “Show as code” does not mean arbitrary code always round-trips back to blocks. Diff review and detach-to-code-only must preserve both versions, never regenerate over a user's edits.

## Cross-document changes: the real unresolved foundation

Saving a generated snippet and its board owner, converting source sheets, renaming a referenced board and recovering a multi-file edit all cross document boundaries. AD-19 defines document edit lifecycles; it does **not** by itself establish an atomic project transaction or one project-wide undo.

Before making that UX promise, define:

1. Affected documents and preflight checks before any write.
2. A recoverable checkpoint and generation/version identity.
3. Commit/failure behaviour, including one writer failing after another succeeds.
4. External edit conflicts and how recovery chooses a consistent set.
5. Undo scope presented to the author.

The flow studies mark this **Conditional**. A previewed edit plan is useful, but not evidence that rollback already works.

## Plugin editors: robustness without a universal UI framework

[Flow 09](flows/09-plugin-editors.md) recommends typed command controls, declarative field contributions and purpose-built panels. Stock and extension authors share the same authoring hooks. Shared Database fields remain shared; plugin-owned additions have explicit providers and versions.

The current ADR 0004 runtime interface does not select these editor interfaces. Document commands, diagnostics, asset references, preview fixtures, lifecycle and migrations need an owner before panel implementations become incompatible. Worker/frame hosting and any security-policy change require verification under both standalone and VS Code CSP; no first-party trust bypass is implied.

## Delivery-policy conflicts to take back to planning

| Existing plan | Research pressure | Required action, not an automatic scope change |
|---|---|---|
| Visual event builder categorised P2 | Common doors/messages should not require code | Consider a small integrated action set earlier; retain complete scripting and remaining editor capabilities |
| Foundation includes reading/writing `.gam` | Hidden project-file UX and possible native metadata | Keep existing criterion until an owner explicitly changes it; hiding is compatible with keeping writers |
| Starter kit optional in T-04 | First village fails without accessible art/audio | Define licensed catalog, source attribution and a genuinely playable default template |
| Editor data split across asset epics | People, Chest, item, party and encounter flows cross editor boundaries | Shared ownership vocabulary and reachable links, not isolated windows with dead ends |
| Runtime battle/menu contract | Specialist editors need their own data and previews | Add authoring contribution design before hard-coding extension-specific forms |
| Distribution packaging | “Share a link” implies an upload service | Hosting, privacy, deletion/expiry and failure UX remain open; downloadable Web build is not itself a hosted link |

## Verification limits

These documents are paper task walkthroughs checked against cited specs, not usability research with first-time creators. The archive command scan is lexical and cannot prove block-convertible coverage. The community sample mixes eras and survivors and cannot quantify modern beginner failure rates. Review findings and their resolutions are recorded in [evidence](evidence/review-resolution.md).

## Sources

- [Guardrails](../../../docs/guardrails.md), [editor inventory](../../../docs/editor-features.md).
- [ADR 0004](../../../docs/adr/0004-script-ast-step-ir-and-plugins.md), [ADR 0005](../../../docs/adr/0005-independent-product-v1-and-native-format.md).
- Architecture spine: `../architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md`, AD-18–20, AD-23, AD-29.
- [Owner directions and proposals](decisions.md), [review findings](evidence/review-notes.md).
