---
title: 'Sandboxed file I/O built-ins through the AD-17 requests'
type: 'feature'
ticket: 16
created: '2026-10-16'
status: 'ready-for-dev'
baseline_revision: 'a66b186cfddfdd67ed8e58a0a4d4c11ff17c06e4'
route: 'full'
route_source: 'pinned'
risk: 'medium'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context:
  - /Users/jensen/projects/rpgtoolkit-reawakened/.worktrees/build-3-16/docs/guardrails.md
  - /Users/jensen/projects/rpgtoolkit-reawakened/.worktrees/build-3-16/docs/spec/engine/rpgcode-runtime.md
  - /Users/jensen/projects/rpgtoolkit-reawakened/.worktrees/build-3-16/_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** RPGCode has no file commands, so scripts cannot persist text or binary data through the host boundary, and the catalogue still answers some file names with generic stubs.

**Approach:** Add a saveable file-handle table and a blocking `blob` wait path over AD-17's existing `asset`/`loadBlob`/`saveBlob` requests. Add the file command pack and a harness blob port that services requests without giving `core` filesystem access.

## Boundaries & Constraints

**Always:** Core remains pure and host-agnostic (G2); blob keys are case-folded and restricted to `saves`/`files`; shipped reads fall back through `asset` and are read-only; file state is plain data and snapshot-safe; `fileInput` strips only CRLF/LF (R-38b); missing files and EOF are non-errors.

**Never:** Import `node:fs`, expose arbitrary host paths, write shipped assets, or alter golden records. Do not add an ambient filesystem fallback or a second request contract.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Text round trip | output/append, `filePrint`, input, `fileInput` | CRLF text round-trips with only CRLF/LF removed | host replies via blocking blob waits |
| Binary round trip | binary handle, `filePut`/`fileGet` | byte values 0–255 persist and read in order | invalid byte/handle is a script error |
| Missing shipped read | input handle absent from saves and assets | empty content, EOF true; no script error | asset null becomes a normal missing result |
| EOF | input position at data length | empty string/zero and unchanged position | proposed Q11/U5 rule; no diagnostic |
| Escape write | folder/path outside allowed areas | no request is emitted | `builtin.bad-arg` refusal |

</frozen-after-approval>

## Code Map

- `packages/core/src/script/builtins/files.ts` -- file command specs, handle modes, request payloads, reply continuations, R-38b line handling and byte operations.
- `packages/core/src/script/state.ts`, `packages/core/src/script/vm.ts`, `packages/core/src/ports/wait.ts` -- saveable handle state and the AD-9 `blob` wait/reply path; preserve generic request waits.
- `packages/core/src/script/builtins.ts`, `tools/catalogue/generate.mjs`, `packages/core/src/script/catalogue-stubs.ts`, `packages/core/src/script/index.ts` -- register the pack, remove duplicate stubs and export it.
- `packages/runner-harness/src/script-host.ts` and `packages/runner-harness/test/script-host.test.ts` -- in-memory blob/asset provider and end-to-end round trips.
- `packages/core/test/script-files.test.ts`, `packages/core/test/script-state.test.ts` -- command, boundary, EOF, line-ending and snapshot coverage.
- `docs/spec/formats/rpgcode-program.md` -- correct stale FileInput wording to agree with normative R-38b before code.

## Tasks & Acceptance

**Execution:**
- [ ] Correct the stale program-format file-I/O wording, then commit the doc-only correction.
- [ ] Add plain-data handles, blob waits, and request/reply processing without changing generic request semantics.
- [ ] Implement/register all eleven commands and remove their generic catalogue stubs; preserve optional by-reference outputs.
- [ ] Add harness blob/asset services and synthetic text/binary round-trip tests, including snapshot/restore.
- [ ] Test path refusal, missing reads, EOF, CRLF/LF stripping and malformed replies.

**Acceptance Criteria:**
- Given a synthetic script and harness blob port, when it writes then reads text and binary data, then values and per-tick replay hashes match after snapshot/restore.
- Given a missing shipped file, when `openFileInput` and `fileInput` run, then the result is empty/EOF without a script error.
- Given an unsafe folder/path, when a write command runs, then no host request is emitted and a located `builtin.bad-arg` is raised.
- Given the core source tree, when host-import scans run, then no filesystem API is imported.

## Implementation Notes

**Proposed ruling (pending owner review) — round-5 Q11/U5:** past-EOF `fileInput` returns `""`, does not advance, and `fileEof` remains true; no script error or diagnostic. Evidence: `docs/provenance/facts-round-5.md#q11` reports the observed empty/no-move behavior, and `docs/spec/engine/rpgcode-runtime.md#files` records U5. Rejected alternative: treating EOF as an error or advancing a zero-byte read would break the documented `while (!FileEOF())` pattern and make blank lines ambiguous in a different way.

**GameId:** use the existing core hash primitive over supplied game identity data; keep identity outside VM state and prefix save blob paths, so physical host storage remains a runner concern.

## Plan Change Log

## Design Notes

Handles store mode, canonical blob key, byte position and encoded bytes as plain data; host replies are converted at the runner seam before resuming the VM. Input first probes the save blob, then issues a read-only asset request for shipped content. Output and append issue only save/files writes.

## Verification

**Commands:**
- `pnpm typecheck` -- expected: all packages compile with plain-data and port contracts.
- `pnpm test --filter @tk-reawakened/core` -- expected: file command and snapshot tests pass.
- `pnpm test --filter @tk-reawakened/runner-harness` -- expected: harness round trips pass.
- `pnpm lint && pnpm graph && pnpm provenance && pnpm licence` -- expected: clean, including no `node:fs` in core.
