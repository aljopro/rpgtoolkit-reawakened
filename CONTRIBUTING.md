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

```sh
pnpm install --frozen-lockfile   # install from the committed lockfile
pnpm build                       # tsc -b
pnpm typecheck                   # tsc -b, then each package's tsconfig.test.json (src and test)
pnpm test                        # tsc -b, then node --test
```

These are the same commands CI runs, one workflow per check under `.github/workflows/`.
