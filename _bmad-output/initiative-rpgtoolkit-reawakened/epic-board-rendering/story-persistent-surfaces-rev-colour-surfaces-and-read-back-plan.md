---
ticket: 7
type: feature
status: done
---

# Persistent surfaces, revisions and read-back

## Intent

Implement AD-27's core-owned persistent RGBA surfaces and expose deterministic read-back through `Engine.surfacePixels`.

## Change

- Store surface ids, monotonic allocation, revisions, saved slots and colour-surface interning in the saveable `surfaces` section.
- Encode bitmap state as `{ t: 'rgba', w, h, b64 }`; decode into an external revision-keyed cache and always return owned pixel copies.
- Add surface allocation, replacement, deletion, pixel reads, whole-screen capture, saved-screen slots and colour surfaces under `core/raster`.
- Initialise engine surface 0 for the composed frame and refresh it through the reference rasteriser before read-back.
- Validate the surface section during snapshot restore.

## Verification

The main agent should run the repository's complete gate set, including strict tests and golden Node/Bun runs. Focused acceptance cases are stale-revision rejection, owned-copy read-back, no id reuse after kill, snapshot/hash round-trip and colour-surface interning.
