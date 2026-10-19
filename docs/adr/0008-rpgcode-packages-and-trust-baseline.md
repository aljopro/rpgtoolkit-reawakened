# ADR 0008 — RPGCode packages are trusted because the VM contains them; manifests declare host requests; native plugins are author-installed

* **Status:** Accepted (owner decision, 2026-10-19). Refines the "untrusted plugin code" consequence of [ADR 0004](0004-script-ast-step-ir-and-plugins.md).
* **Date:** 2026-10-19
* **Context documents:** [0004-script-ast-step-ir-and-plugins.md](0004-script-ast-step-ir-and-plugins.md), [guardrails.md](../guardrails.md), [spec/engine/plugins-and-battle.md](../spec/engine/plugins-and-battle.md#e-99) (E-99), [spec/engine/rpgcode-modules-and-objects.md](../spec/engine/rpgcode-modules-and-objects.md#pkg-1) (PKG-1 to PKG-8)

## Context

Epic 19 turns RPGCode into a platform: packages (a name, a version, a namespace and declared host requests) share the one plugin manifest of ADR 0004, decision 6, and are written in RPGCode. ADR 0004 left plugin trust as "ungated, accepted for now", and E-99 said only "not trust-gated for now". Two questions follow: how much can a game trust an RPGCode package it did not write, and what is the line for native TypeScript plugins. The owner re-evaluated E-99 on 2026-10-19.

## Decision

1. **RPGCode packages are trusted because the VM contains them.** A package's code runs on the step machine (**G1**) under the per-tick step budget. It cannot touch the DOM, Node, files, timers or the network except by issuing a host request (**G2**); file input and output goes through the AD-17 sandbox; it has no clock and no unseeded random numbers (**G3**). So an RPGCode package cannot do anything the engine's host-request set does not already allow every script. There is **no trust gating of RPGCode**: no prompt, no refusal, no capability check before a package runs.
2. **Manifests declare the host requests a package uses.** The declaration is data in the manifest entry ([PKG-2 and PKG-6](../spec/engine/rpgcode-modules-and-objects.md#pkg-1)) so a runner can show it, like the permissions list of an app. It is **informational only**: a package that issues a request it did not declare is not refused (Assumption A-4, pending owner review in PKG-6: not even a warning).
3. **Native TypeScript plugins stay author-installed only.** A native plugin is code the host loads and runs with the host's authority, so it is trusted only because the author who installs it chose it. A game file or a package cannot install one. Native plugins also carry obligations an RPGCode package does not: host and harness detection, feature sniffing, the G2 and G3 rules, their own host requests, and versioning against the core API. This is why the plugin guide's decision tree is: **use TypeScript only when RPGCode cannot do it or is too slow** ([E-99](../spec/engine/plugins-and-battle.md#e-99)).
4. **There is no capability model yet.** A stricter model, if it is ever wanted, extends the manifest entry (ADR 0004 decision 6); it needs no change to the plugin contract.
5. **Legacy native plugin binaries are not supported** (unchanged from E-99).

## Consequences

**Positive**
* The line is simple and true: the containment is the VM, not a permission prompt, so there is nothing for a game author to approve and nothing a package can skip.
* A runner can show what a package asks for without the engine enforcing it, and a later capability model can start from the declarations that already exist.
* Authors get host detection, determinism and versioning for free by writing RPGCode.

**Negative / risks, with mitigations**
* *A package can still do anything the host-request set allows every script,* including playing sounds, reading and writing sandboxed files and sending the requests a runner supports. **Mitigation:** the declaration lets a runner display it; the AD-17 sandbox limits file access; a capability model is a later ADR.
* *A declaration can be wrong,* since nothing checks it. **Mitigation:** it is informational by decision; a runner must not treat it as a guarantee.
* *Native plugins have the host's full authority.* **Mitigation:** they are author-installed only, and E-99's guidance steers authors to RPGCode first.

## Alternatives considered

* **Trust gating of RPGCode packages (prompts, allow-lists).** Rejected: the VM already contains a package, so the prompt would protect against nothing the host-request set does not already limit, and it would add a state (granted or not) to every game.
* **Enforce declared requests (refuse an undeclared one).** Rejected for now: it is a capability model, which the owner has deferred, and a refusal in a deterministic replay would make a replay depend on a runner's setting.
* **Let a game file install native plugins.** Rejected: it turns "open a game" into "run code with host authority".
* **Leave "not trust-gated for now" as written.** Rejected: it stated neither why RPGCode is safe nor where the line for native code is.
