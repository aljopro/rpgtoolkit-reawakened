# Contributing

Thanks for helping reawaken RPG Toolkit.

1. **Read [docs/guardrails.md](docs/guardrails.md).** Rules G1–G7 are binding and CI-enforced. Pull requests that break one are not merged unless an ADR approves an exception.
2. **Clean-room (G7).** Work only from `docs/`. Do not consult, copy or translate the legacy GPL-2 RPG Toolkit source. If a spec is unclear or wrong, open a docs PR first.
3. **Cite the spec.** Each behaviour PR names the `docs/` sections or capability IDs (E-xx, T-xx) it implements.
4. **Dependencies (G6).** New runtime dependencies must use an allowlisted licence. Say in the PR why the dependency is needed.
5. **Architecture changes** go through an ADR in `docs/adr/`.

Code is licensed under MIT and/or Apache-2.0.
