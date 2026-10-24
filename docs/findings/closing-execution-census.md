# Closing-game execution census — Phase A

Issue #614; [ADR 0010](../adr/0010-script-execution-observers.md).
Measured with the unchanged `golden/closing/plan.json`, seed 3, through
`runClosingSuite` and the boot-mode engine. Full data, including every boundary
hash, boot asset request and uncalled catalogue entry:
[closing-execution-trace.json](closing-execution-trace.json).

`StepOp` has **24 variants**, counted from `packages/core/src/script/ops.ts`.
The eight games executed **234 instructions**, **50 call resolutions** (including
script functions), **45 command resolutions** over **18 distinct command names**,
and **45 native handler entries**. Resolutions and handler entries are separate
metrics: middleware can enter several handlers for one resolution.

| Game | Ticks reached | Instructions | Command resolutions | Generated stub entries |
|---|---:|---:|---:|---:|
| demo | 600 | 92 | 22 | 1 |
| Basic | 600 | 142 | 23 | 0 |
| Caoquest | 600 | 0 | 0 | 0 |
| ChimeranEmpire | 600 | 0 | 0 | 0 |
| FinalDestiny | 600 | 0 | 0 | 0 |
| School2Demo | 0 | 0 | 0 | 0 |
| LittleMan | 0 | 0 | 0 | 0 |
| BusDriver | 0 | 0 | 0 | 0 |

The single generated stub actually entered was **`spritetranslucency`**, once in
demo. Its catalogue owner is **movement-triggers** (owner 5), effect kind
`state-write`, reading and writing `sprites`. This is determined by handler
function identity; resolving a name also present in the generated catalogue is
insufficient evidence that its stub ran.

| Catalogue ownerEpic | Distinct called names | Resolutions |
|---|---:|---:|
| board-rendering | 11 | 33 |
| rpgcode-vm | 2 | 3 |
| movement-triggers | 2 | 3 |
| audio-synth | 1 | 2 |
| battle | 1 | 2 |
| menu-party-save | 1 | 2 |

**Called commands without an owner: 0.** Of **283 catalogue entries**, **265 were
never called** in this run; the report lists each with its ownership and effect
metadata. This is coverage of the closing plan, not a claim that those commands
are unused by games generally.

The boot asset list includes the actual or synthesised main `.gam`, startup
program and loaded `.prg` files, marking which had executed instructions. Loaded
files are not counted as executed. Demo executed only `prg/start.prg`; Basic
executed 95 instructions from `prg/start.prg` and 47 from included
`prg/system.prg`, on the startup thread. Both startup threads finished in the
report at tick 61. `system.prg` contributes functions to that same compiled
program; it is not a separate boot thread. Source spans retain their first and
last executed clock tick and the finish hash of their owning program thread.
For example, Basic's system source span first executed at VM clock tick 30 and
last at tick 60. Hashes use the settled TickReport for the named tick; an
instruction at VM clock T executes during the update that completes at T+1.

The six Toolkit 2 games have zero executed steps because of their **existing
startup syntax errors**; three subsequently render a board and three stop before
the first tick. Their diagnostics remain in the report. Their zeros are not
evidence that game code was exercised. No dialect, boot behaviour or scripted
input was changed to increase the census.

## Validation and reproduction

All eight games matched their committed closing records and PNG pixels, with
batching 600/30/7 unchanged. The observed one-tick replay matched the unobserved
checkpoint, draw and pixel hashes. Neither closing PNGs nor `golden/ledger.json`
changed. The ordinary headless golden gate also passed.

The required `pnpm typecheck && pnpm test && pnpm test:strict && pnpm lint`
passed after merging main (`ef461636`): 1,837 tests, zero failures and zero skips. Focused tests pin an exact
ten-step instruction histogram, repeated/restored hashes, observer isolation,
all four resolution layers, a two-handler `next` chain with exactly one stub
entry, deterministic real-engine boot tracing, and observers alongside package
startup/restore and its forbidden-operation guard. The merged coverage gate
passed at 92.07% lines and 81.63% branches. Provenance and catalogue
generation checks passed.

Main's approved engine and golden updates are the baseline for this refreshed
trace. Observer configuration follows the package-startup and media arguments
in script-service construction, preserving both runtime features. No golden was
recorded or edited during conflict resolution.

After fetching fixtures, generate a new report with:

```sh
pnpm closing --trace /tmp/closing-execution-census.json
```

The output path must be a new `.json` file; existing files and `--record` are
rejected. Tracing adds a one-tick replay and full per-tick hashing, so it is
substantially slower than ordinary closing. It never records goldens.

`corpus` was not instrumented. No dependencies, generated stub edits, golden
updates, CodeGraph installation/indexing, or tree-sitter design/code were added.
Phase A stops here for owner review.
