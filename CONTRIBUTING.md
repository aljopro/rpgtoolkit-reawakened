# Contributing

Thanks for helping reawaken RPG Toolkit.

1. **Read [docs/guardrails.md](docs/guardrails.md).** Rules G1–G7 are binding and CI-enforced. Pull requests that break one are not merged unless an ADR approves an exception.
2. **Clean-room (G7).** Work only from `docs/`. Do not consult, copy or translate the legacy GPL-2 RPG Toolkit source. If a spec is unclear or wrong, open a docs PR first.
3. **Cite the spec.** Each behaviour PR names the `docs/spec/<path>#<anchor>` sections or capability IDs (T-xx) it implements. `docs/spec/` is the normative specification ([ADR 0007](docs/adr/0007-docs-spec-is-the-normative-specification.md)); citations to `docs/format-spec.md` and `docs/engine-features.md` stay valid only until entry 3.28 deletes those files.
4. **Dependencies (G6).** New runtime dependencies must use an allowlisted licence. Say in the PR why the dependency is needed.
5. **Architecture changes** go through an ADR in `docs/adr/`.

Code is licensed under the [MIT license](LICENSE).

## Clean-room provenance

RPG Toolkit Reawakened is a clean-room rebuild. The legacy RPG Toolkit engine and editor are GPL-2, so none of that source may enter this repository.

- The documents in `docs/` describe legacy behaviour and file layouts in our own words. They are the only source for implementation work.
- Do not open, copy, paraphrase or translate the legacy source while writing code. Contributors and AI agents follow the same rule (see [CLAUDE.md](CLAUDE.md)).
- If `docs/` is wrong or missing something, fix the doc first in its own commit, then the code.
- Whole legacy sample games are test fixtures fetched at CI time. Never commit them. Small anonymised or authored fixtures may be committed (see "Committed fixtures" below).
- The full rule and its checks are G7 in [docs/guardrails.md](docs/guardrails.md).

## Committed fixtures

The fetched sample games are never committed (G5 rule 4), but a few small
fixtures **are** committed under `packages/core/test/fixtures/`, because the
corpus cannot supply them (ticket 2.22):

- `authored/` — bytes written straight from the byte layouts in
  [docs/spec/formats/](docs/spec/formats/README.md) by `tools/fixtures/author/generate.mjs`:
  detail 4/5/6 tilesets, an isometric `.iso`, three Windows bitmaps (24-bit,
  1-bit and RLE8), a `.tpk` and a deflated copy of it,
  a Setup ZIP, a backslash-entry ZIP, a `CMP1` standalone EXE and two negative
  EXE stubs. The tool imports no `core` reader or writer, so a fixture cannot
  "pass by sharing the writer primitives". `pnpm fixtures:author:check` re-runs it
  and fails if the committed bytes drift; `pnpm fixtures:author` rewrites them and
  is a deliberate act, exactly like `pnpm golden:record` (G5).
- `real/` — tiny files an editor produced: a detail-1, a detail-2 and a detail-3
  tileset, plus a `.tan` and a `.gph` held for ticket 16.7.
- `anonymised/` — derivatives of real legacy samples, produced by
  `tools/fixtures/author/anonymise.mjs`, which keeps the binary layout but
  replaces every name, description, program and asset filename with a neutral
  placeholder and every content byte with a synthetic pattern. The plan of
  ticket 2.22 records the source paths; the sources themselves are never
  committed.

`pnpm fixtures:check` fails when anything under the root `fixtures/` is tracked,
so a fetched file can never be committed by mistake.

## Work in a worktree

Do each piece of work in its own git worktree (a second folder checked out from the same repository), and leave the main checkout on `main`, unedited. Reason: several people or agents can then work at the same time without overwriting each other's files, and `main` only moves when a tested pull request lands.

```sh
git fetch origin
git worktree add -b <type>/<short-name> ../rpgtoolkit-reawakened.worktrees/<short-name> origin/main
cd ../rpgtoolkit-reawakened.worktrees/<short-name>
pnpm install --frozen-lockfile   # about a second: dependencies link from the shared pnpm store
pnpm fixtures:fetch              # about a second; only needed before `pnpm golden`
```

A new worktree starts without the files git ignores, which is why the last two commands are needed (`node_modules/` and the sample games under `fixtures/`). If you use the BMAD ticket tools, also copy `_bmad/custom/config.user.toml` from the main checkout into the same place in the worktree: it names the active initiative, and the tools read no tickets without it.

When the work is done, push the branch and open a pull request. `main` accepts only a commit whose eight required checks have already passed, so a direct push of a new commit is refused. After it lands, bring the main checkout up to date and remove the worktree:

```sh
git switch main && git merge --ff-only origin/main   # run in the main checkout
git worktree remove ../rpgtoolkit-reawakened.worktrees/<short-name>
git branch -d <type>/<short-name>
```

## Commands

Node 24.21.0 (see `.node-version`) and pnpm 12.10.1 (`corepack enable` picks it up from `packageManager`).

CI runs these commands. The seven required jobs are in `.github/workflows/ci.yml` — the fixture tool's, the no-skips guard's and the icon builder's own tests (`pnpm fixtures:test`, `pnpm no-skips:test`, `pnpm icons:test`) run in its `unit` job, and `pnpm build` is the same `tsc -b` that `typecheck` and `test` already run, kept here for a first local build. Run them locally in this order before you open a pull request.

```sh
pnpm install --frozen-lockfile   # install from the committed lockfile
pnpm build                       # tsc -b
pnpm typecheck                   # tsc -b, then each package's tsconfig.test.json
pnpm test                        # tsc -b, then node --test
pnpm test:strict                 # tsc -b, then node --test, failing if any test was skipped (needs fixtures:fetch; runs in the golden job)
pnpm lint                        # the core dependency check, then ESLint
pnpm graph:test                  # the dependency-edge tool's own tests
pnpm graph                       # the dependency-edge check
pnpm licence:test                # the licence tool's own tests
pnpm licence                     # the licence gate (G6)
pnpm audit --prod                # dependency vulnerability audit (network)
pnpm provenance:test             # the provenance scan's own tests
pnpm provenance                  # the clean-room provenance scan (G7)
pnpm fixtures:test               # the fixture tool's own tests
pnpm no-skips:test               # the no-skips guard's own tests
pnpm icons:test                  # the icon builder's own tests
pnpm icons                       # rebuild media/icons from media/tkr.png (the logo's icon set)
pnpm fixtures:fetch              # fetch the legacy sample games (network, cached)
pnpm fixtures:check              # fail if anything under fixtures/ is tracked
pnpm fixtures:author             # rewrite packages/core/test/fixtures/authored (deliberate, see below)
pnpm fixtures:author:check       # fail if those committed fixtures drift from the generator
pnpm golden                      # the headless golden suite (G5)
pnpm dump fixtures/legacy/demo   # parse a legacy project and print it (needs fixtures:fetch)
pnpm dump:check                  # the corpus digest gate (runs in the golden job, after fixtures:fetch)
```

The `*:test` scripts are the tool self-tests that CI also runs, so run them when you touch `tools/`. `pnpm graph:write` is a dev aid that CI never runs. `pnpm license` and `pnpm license:test` are aliases of `licence` and `licence:test`.

`pnpm golden:record` rewrites the golden and is the only writer of it. Never run it in CI. A golden change is a reviewed behaviour change (G5), so explain it in the pull request.

Only `synth` has per-package `build`, `typecheck`, `lint` and `test` scripts. `core`, `runner-harness` and `runner-headless` expose `typecheck:tests` only, and their tests run through the root `pnpm test`.

**Required checks.** Branch protection requires the seven job names defined in `.github/workflows/ci.yml`: `typecheck`, `lint`, `unit`, `golden`, `licence`, `provenance`, `graph`, plus `gate`, which fails unless every required job succeeded. The fixture fetch and check run inside the required `golden` job, and the fixture tool's and the no-skips guard's own tests run in `unit`; there is no separate `fixtures` check. `pnpm test` runs in `unit` without the sample games, where the format tests skip their sample-game cases. The `golden` job runs the whole suite again after the fetch as `pnpm test:strict`: those cases run against the real files, and any skipped test fails the job, so a sample-game case cannot pass by skipping. Renaming a job id means updating branch protection in the same pull request, or every merge blocks. `main` accepts only a commit whose eight checks have already passed, so every change lands through a pull request (see [Work in a worktree](#work-in-a-worktree)).

## The dump tool and the corpus digest gate

`pnpm dump <path>` walks a legacy project and prints one readable line per file. `<path>` is an extracted project folder, a game folder, or a `.tpk`/standalone EXE package (format-spec §13). Each file goes to the reader its extension names (`.gam` §2, `.brd` §4, `.tst`/`.iso` §3.1, `.tbm` §3.6, `.anm` §7.1, `.tem`/`.itm`/`.ene` §6.1–§6.3, `.spc`/`.ste`/`.bkg` §8.1–§8.3, images, and `.prg` as text); text, media, plugin files and formats with no reader yet are reported as **skipped with a reason**, and never counted as failures; a file whose extension is a data format that will not parse prints its located `FormatError` (path, offset, section, message) and makes the command exit non-zero. It exits 0 if and only if every data-format file parsed.

`pnpm dump --json <path>` prints the same report as JSON, with a per-file digest: `core`'s FNV-1a over the canonical JSON of the parsed model (AD-11), or over the decoded RGBA for an image. The report is deterministic — files sorted by path, fixed key order, nothing machine-specific — so a reader or decoder that drifts changes a digest.

That is epic 2's Done-when 1 as a **CI gate**, not a local habit: the required `golden` job (which already runs `pnpm fixtures:fetch`) runs `pnpm dump:check`, which re-runs the JSON report over `fixtures/legacy/demo` and `fixtures/legacy/Basic` and compares it with the committed `golden/legacy-corpus.json`. A changed digest fails the job and names the file, so parser and decoder drift cannot pass silently.

The fetch also copies the shipped demo's main file (`build/main/demo.gam`) into `fixtures/legacy/demo/`, named by the pin's `mainPath` and `mainFiles`. The corpus then holds each game's main file with its folder, so this gate and the format tests cover the `.gam` reader against a real file.

`pnpm dump:record` rewrites `golden/legacy-corpus.json` and is the only writer of it. Regenerating it is a **deliberate act**, exactly like `pnpm golden:record` (G5): never run it in CI, never let it run as a side effect, and explain in the pull request why the digests changed. If a digest moved because a reader was fixed, the fix belongs in the same pull request as the regenerated expectation.

