---
ticket: 12
type: feature
status: built
---

# Board edit and board-read built-ins

Implement the world pack's board read/edit command handlers and synchronous world effect applier from `docs/spec/engine/rpgcode-functions.md#e-14`. Runtime board edits replace the generic catalogue fallbacks and are visible to later calls in the same VM turn through the existing effect bus. Board virtuals resolve from the hydrated `world.board` data and preserve the VM's documented assignment/link semantics.

## Code map

- `packages/core/src/script/packs/world.ts`: command specifications, aliases, reads, and effect payloads.
- `packages/core/src/world/effects.ts`: world effect application, tile/vector/program/ambient edits and temporary edit expiry.
- `packages/core/src/world/model.ts`: runtime board edit data and tile type data.
- `packages/core/src/world/hydrate.ts`: initialise runtime tile type/edit data.
- `packages/core/src/script/virtuals.ts`: board virtual reads and located no-board errors.
- `packages/core/src/engine/engine.ts`: register world effect applier and expire program-scoped edits.
- `tools/catalogue/generate.mjs`, generated catalogue stubs and fallback ownership: remove all world-owned names.
- tests cover command registration, same-turn reads, edits, vectors/programs, ambient and virtuals.

## Acceptance

A scripted board can edit/read tiles, vectors, programs and ambient state in one turn; `put` and `layerPut` follow their documented lifetimes; all 21 world names resolve to real pack commands with by-reference results; board virtuals read the hydrated board and no-board access is a located runtime error; generated catalogue ownership stays consistent.
