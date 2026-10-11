# Contributing

Thanks for helping reawaken RPG Toolkit.

1. **Read [docs/guardrails.md](docs/guardrails.md).** Rules G1–G7 are binding and CI-enforced. Pull requests that break one are not merged unless an ADR approves an exception.
2. **Clean-room (G7).** Work only from `docs/`. Do not consult, copy or translate the legacy GPL-2 RPG Toolkit source. If a spec is unclear or wrong, open a docs PR first.
3. **Cite the spec.** Each behaviour PR names the `docs/` sections or capability IDs (E-xx, T-xx) it implements.
4. **Dependencies (G6).** New runtime dependencies must use an allowlisted licence. Say in the PR why the dependency is needed.
5. **Architecture changes** go through an ADR in `docs/adr/`.

Code is licensed under the [MIT license](LICENSE).

## Clean-room provenance

RPG Toolkit Reawakened is a clean-room rebuild. The legacy RPG Toolkit engine and editor are GPL-2, so none of that source may enter this repository.

- The documents in `docs/` describe legacy behaviour and file layouts in our own words. They are the only source for implementation work.
- Do not open, copy, paraphrase or translate the legacy source while writing code. Contributors and AI agents follow the same rule (see [CLAUDE.md](CLAUDE.md)).
- If `docs/` is wrong or missing something, fix the doc first in its own commit, then the code.
- Legacy sample games are test fixtures fetched at CI time. Never commit them.
- The full rule and its checks are G7 in [docs/guardrails.md](docs/guardrails.md).

## Commands

Node 24.21.0 (see `.node-version`) and pnpm 12.10.1 (`corepack enable` picks it up from `packageManager`).

CI runs these commands. The seven required jobs are in `.github/workflows/ci.yml`; `pnpm fixtures:test` runs in the non-required `.github/workflows/fixtures.yml`, and `pnpm build` is the same `tsc -b` that `typecheck` and `test` already run, kept here for a first local build. Run them locally in this order before you open a pull request.

```sh
pnpm install --frozen-lockfile   # install from the committed lockfile
pnpm build                       # tsc -b
pnpm typecheck                   # tsc -b, then each package's tsconfig.test.json
pnpm test                        # tsc -b, then node --test
pnpm lint                        # the core dependency check, then ESLint
pnpm graph:test                  # the dependency-edge tool's own tests
pnpm graph                       # the dependency-edge check
pnpm licence:test                # the licence tool's own tests
pnpm licence                     # the licence gate (G6)
pnpm audit --prod                # dependency vulnerability audit (network)
pnpm provenance:test             # the provenance scan's own tests
pnpm provenance                  # the clean-room provenance scan (G7)
pnpm fixtures:test               # the fixture tool's own tests
pnpm fixtures:fetch              # fetch the legacy sample games (network, cached)
pnpm fixtures:check              # fail if anything under fixtures/ is tracked
pnpm golden                      # the headless golden suite (G5)
```

The `*:test` scripts are the tool self-tests that CI also runs, so run them when you touch `tools/`. `pnpm graph:write` is a dev aid that CI never runs. `pnpm license` and `pnpm license:test` are aliases of `licence` and `licence:test`.

`pnpm golden:record` rewrites the golden and is the only writer of it. Never run it in CI. A golden change is a reviewed behaviour change (G5), so explain it in the pull request.

Only `synth` has per-package `build`, `typecheck`, `lint` and `test` scripts. `core`, `runner-harness` and `runner-headless` expose `typecheck:tests` only, and their tests run through the root `pnpm test`.

**Required checks.** Branch protection requires the seven job names defined in `.github/workflows/ci.yml`: `typecheck`, `lint`, `unit`, `golden`, `licence`, `provenance`, `graph`, plus `gate`, which fails unless every required job succeeded. `fixtures` is not required, because `pnpm fixtures:check` already runs inside the required `golden` job. Renaming a job id means updating branch protection in the same pull request, or every merge blocks.
