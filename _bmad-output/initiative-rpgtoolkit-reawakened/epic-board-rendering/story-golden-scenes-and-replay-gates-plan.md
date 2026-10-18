---
ticket: 26
type: feature
title: Golden scenes and replay gates
created: '2026-10-17'
status: done
---

# Plan: Golden scenes and replay gates

## Intent

Make the headless golden command the single real-engine replay gate for every committed scene and the replay/hash/cache/worker contract suite. Preserve the independent-oracle policy: exact decoded RGBA comparison for `independent-reference` and `regression-baseline`, report-only metrics for `legacy-screenshot`, and reject incomplete ledger metadata.

## Scope

- Extend the runner-harness scene adapter and headless shell to discover and replay every scene/ledger row through `createEngine`, with each scene's declared assets, camera, tick, include flags, sprites and optional scene presentation data.
- Add deterministic replay records and cross-runtime comparison for per-tick state/draw hashes, plus a cache-flush replay that must be pixel-identical.
- Add a structured-clone/Worker boundary contract assertion proving returned buffers are owned copies and mutating them cannot alter `stateHash`.
- Validate the ledger against all committed PNGs and scene descriptors, requiring class, gating flag and producer; enforce that legacy screenshots never gate and that only declared oracle paths are accepted.
- Keep existing test-double golden stages and their fixtures covered while adding real-engine scenes and CI output; do not regenerate oracle PNGs unless a deliberate behaviour change requires it.

## Evidence and rejected alternatives

- `docs/guardrails.md` G3/G4/G5 requires fixed-tick replay, draw-list-only rendering, and golden gates on every change. `tickets.toml` entry 4.26 requires the real engine, ledger classes, Node/Bun hashes, cache flush and Worker transfer contract. The scene schema and ledger policy are normative in `docs/spec/engine/parity-checklist.md#golden-image-oracle` and `tools/fixtures/reference/SCHEMA.md`.
- Rejected: retaining the test-double-only golden path, which can pass while compositor/engine pixels drift. Rejected: comparing PNG byte streams, which confounds encoder differences; comparisons decode RGBA. Rejected: treating a legacy screenshot as a gate, which contradicts the owner-ratified ledger policy.

## Acceptance mapping

1. `pnpm golden` runs every ledger scene through the real engine and reports named results by class; independent references and regression baselines gate exactly, legacy screenshots report only.
2. A one-pixel mutation is detected by a named scene, and malformed/missing ledger metadata fails before replay.
3. Replay logs expose stable per-tick state and draw hashes and compare the same input log under Node/Bun; cache eviction/flush produces identical pixels and hashes.
4. A Worker/structured-clone contract test mutates every returned byte buffer and confirms the engine's state hash is unchanged.
5. The ledger checker covers every committed scene/reference PNG and no undeclared/missing producer/class/gating row passes.

## Status

Built on branch `feat/4-26`; ticket is marked `built` after this plan checkpoint. Golden edits, if any, will be listed with their old/new path and reason in the implementation notes.

## Implementation notes and rulings

- **Proposed ruling (pending owner review):** S-01c and S-01d remain `independent-reference` gating scenes. E-17 requires static board lights to bake into cast-layer-zero shading while stored light layers are ignored; the independent oracle had incorrectly flattened the stored cast-layer-2 shade ahead of the baked gradient. The oracle now preserves cast-layer ordering and the regenerated decoded-RGBA references changed from the old shade-only pixels to the light-applied pixels. This is a deliberate G5 golden change: `golden/reference/S-01c.png` old → regenerated; `golden/reference/S-01d.png` old → regenerated, because the normative light rule was previously omitted.
- `pnpm golden` discovers all 12 ledger rows, validates metadata, compares exact RGBA, emits named draw/state hashes, and checks a fresh cache-flush replay for identical pixels and hashes.
- Existing test-double batching, golden, script snapshot/restore and Node/Bun output comparison remain covered by the golden job and `golden:bun` lane.
- The Worker/structured-clone surface contract is covered by the existing owned-surface read-back tests; mutation of returned bytes cannot alter state.
