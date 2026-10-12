# Adversarial critique — `plugin-definition-spike.md` (spike 23 synthesis)

Target: `_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/plugin-definition-spike.md`
Evidence: `discovery/spike-23/spike-{shape,trust,legacy}.md`; repo docs `docs/adr/0004`, `docs/guardrails.md`,
spine AD-5/AD-8/AD-17/AD-23/AD-31, `docs/engine-features.md` E-99, `epic-rpgcode-vm/tickets.toml` (3,14,15,21,22),
`epic-rpgcode-vm.md`, `spec-rpgtoolkit-reawakened.md` (CAP-5), initiative `tickets.toml`.
Read-only. No legacy source opened (G7). Line refs: synthesis is cited by quote; evidence by `file:line`.

---

## 1. Does each claim match its cited evidence?

**F1 — MAJOR — counts relabelled: "71 programs" etc. are occurrences, and the corpus unit count is wrong.**
The synthesis's ticket text reads "ranked by use in 2,783 archived programs: Triuken pack (71 programs),
GsMiscPlugins (57), filereadwrite (47), FTP (41, declined), XFMWin (16), proplug (13), E-Mail (10, declined),
TWButton (6), Kaimu (3)." Evidence `spike-legacy.md:99` says the grep ran across **2 783 `.prg`/`.gam` units**
(not programs), and `spike-legacy.md:108-120` column heads are **Occurrences / Source files / Packages** — 71 is
Triuken *occurrences* across 10 files and 6 packages, not 71 programs.
**Fix:** relabel the list "occurrences (source files / packages)" and say "2,783 `.prg`/`.gam` units", citing
`spike-legacy.md:99,108-120`. Keep the rebuild order (reach-first) separate and say so, because the ranked list is
occurrence-ordered while the rebuild list is reach-first (`spike-legacy.md:144-151`).

**F2 — MINOR — a ranked plugin is silently dropped.**
The ranked list omits **Multiplayer Plugin / `multip.dll`** (rank 9, 4 occurrences, `spike-legacy.md:117`). It is
declined as raw sockets in `spike-legacy.md:152-158`, but the synthesis's decline sentence names only
"FTP, sockets, E-Mail, DragSound, Flash". Multiplayer *is* a socket case and should be named.
**Fix:** add "Multiplayer/`multip.dll` (sockets, declined)" to the ranked list or the declined list.

**F3 — MAJOR — the licence claim is false as written.**
Gates section: "a licence and size check (QuickJS in wasm is the **only** candidate the research found that passes
licensing)." `spike-trust.md:218-227` rates **every** foreign-code candidate ✅ on licence (wasmtime Apache-2.0 WITH
LLVM-exception, wasm3 MIT, Duktape MIT, JerryScript Apache-2.0, `quickjs-emscripten` MIT); QuickJS is recommended for
*authoring/ergonomics*, not licence uniqueness.
**Fix:** "QuickJS-in-wasm is the only foreign-code candidate that passes licensing **and** the authoring bar"; cite
`spike-trust.md:218-227` and its §8 URLs. Also state that the "size check" has no measurement yet (G-F is a plan,
`spike-trust.md:398-402`).

**F4 — MAJOR — the "all three agree" claim papers over the real disagreement, and masks a T1 hole.**
"#1 … Both stay true if they are **two tiers**: a trusted in-process `PluginDefinition` … and an untrusted tier
reached only through host requests (`extension.call`…)." That is `spike-shape.md:293-320`, but `spike-trust.md:22-33`
recommends a **three-tier** model whose shippable v1 third-party tier is **T1 declarative/RPGCode executed *in the
VM*** — no sandbox, deterministic by construction, and it "covers the biggest share of real plugin packages"
(`spike-trust.md:230-249, 302-315`). The synthesis never rules on T1; its recommendation ("Ship v1 with **no
third-party code**") contradicts its own fallback ("keep the declarative and RPGCode tiers and drop foreign code"),
and contradicts `spike-trust.md` Phase 1.
**Fix:** rule explicitly. Either (a) ship T1 (manifest + `.prg` in the VM, no foreign code) as the v1 untrusted tier —
then the "two tiers" framing is wrong and `extension.call` is only the *foreign-code* tier — or (b) state plainly that
v1 has **no** third-party tier and mark T1 post-MVP with a reason. Do not leave both readings live.

**F5 — MINOR — disagreement-table wording is accurate; the "dialects" row understates the ruling.**
Shape "Never" (`spike-shape.md:150-160`) and Trust "an id list" (`spike-trust.md:338`) are quoted correctly, but the
synthesis rules `dialects` out entirely while `spike-trust.md:338` recommended `dialects?: string[]` of built-in
frontend *ids* (a compatibility declaration, not a parser). The synthesis should say it rejected even the id-list form.
**Fix:** one clause: "rejected even Trust's id-list form; core-internal registry only."

**F6 — MINOR — line-ref drift (cosmetic).**
The synthesis (via shape) cites AD-8 precedence at `architecture:140` and spike-trust cites `:136`; both point at the
AD-8 block (confirmed: AD-8 rule at spine `:140`). AD-5 `:118-120` is correct (`extension.call → extension.result`,
spine `:118-120`). AD-17 `:248`, AD-23 `:286-291`, AD-31 `:346`, E-99 `:311` all check out.
**Fix:** none required; note only.

---

## 2. Are the four disagreement resolutions sound?

**F7 — MAJOR — separate-manifest vs capability enforcement: enforcement is undefined for Tier A and untested for v1.**
The synthesis says "Add `capabilities` only on the manifest." That silently overrides **both** evidence docs:
`spike-shape.md:252-268` and `spike-trust.md:335` put `capabilities` on `PluginDefinition`. Worse, `spike-trust.md:363-370`
(§3.4.3) validates an effect "against the owning plugin's grants" — with no grants on the trusted shape, that rule is
unimplementable for Tier A, and the manifest path is never exercised because no third-party code ships in v1.
**Fix:** state the invariant explicitly — "capability gating applies only to the untrusted/manifest tier; Tier A is
trusted by construction and is not grant-gated" — and record the divergence from shape/trust. Decide whether
`PluginDefinition.capabilities` survives as editor metadata (shape's S11/T-14).

**F8 — MAJOR — the shadowing rule is imported but logically moot, and mis-framed as a narrowing.**
The synthesis asks the owner to confirm "Untrusted plugins may not shadow built-in or first-party names … it narrows
the last-wins rule you set", lifted from `spike-trust.md:377-382` (§3.4.1). But that rule exists for spike-trust's
**T1 in-registry** model. Under the synthesis's own model (untrusted = `extension.call`), `extension` is the **last**
lookup tier (`AD-8`, spine `:140`; entry 3 "empty extension tier"), so a sandboxed extension **cannot** shadow a
built-in by construction. The question is therefore either unnecessary or evidence that the synthesis actually means
T1 (see F4).
**Fix:** replace the "needs your confirmation" item with the real invariant — "the built-in namespace is protected by
precedence: the extension tier is last-resort" — and only if T1 ships, record spike-trust §3.4.1 as a registration rule
in the ADR. Either way, this is not a narrowing of last-registered-wins and should not be presented as one.

**F9 — MAJOR — deferring the sandbox leaves CAP-5's *intent* unmet, and this is not recorded.**
CAP-5's `intent` names "a sandboxed extension point replacing native plugins" (`spec-rpgtoolkit-reawakened.md:38`),
while its `success` checklist is only headless `system.prg`/`start.prg`, "every built-in name resolves", and
snapshot/restore (`spec-rpgtoolkit-reawakened.md:39`). Entry 21/22 stubs satisfy the success checklist
(`tickets.toml:291-297, 300-308`), so the epic *can* close — but the synthesis never states that the sandbox intent
becomes post-MVP, and the spec open question `:124` and epic note `epic-rpgcode-vm.md:46` still say entries "wait on a
decision". `spike-shape.md:434-449` proposed entry 24 specifically `covers = ["CAP-5"]`.
**Fix:** add a doc amendment that (a) marks the E-99 sandbox as post-MVP behind the gates, (b) updates the spec open
question and the epic note from "waits on a decision" to "decided: deferred", and (c) states the owner accepts CAP-5's
success checklist without the sandbox.

**F10 — MAJOR — the doc-first amendment is incomplete: ADR 0004's Consequences still contradict it.**
The amendment ("soften ADR 0004 d.2 … add decision stating the trust boundary … say clashes use last-registered-wins")
touches decision 2 and adds decision 6, but leaves two normative Consequences bullets intact
(`docs/adr/0004-…md:72,84`): "Ecosystem parity: Third-party modders build plugins using the exact same API used by the
engine's standard library", and "Command collisions … Command registry enforces namespace registration with **explicit
collision rejection**." Both directly contradict the new trust boundary and the last-registered-wins ruling the
synthesis relies on (owner ruling `epic-rpgcode-vm.md`, Tickets decision 4). `spike-shape.md:487-515` has the same gap.
**Fix:** include both consequence bullets in the doc-first commit (rewrite "Ecosystem parity" to the two-tier wording
and replace "explicit collision rejection" with last-registered-wins + warning).

**F11 — MINOR — "capabilities on only the manifest" still allows over-privilege via inheritance, unaddressed.**
Even with manifest-only capabilities, `spike-trust.md:340-345` warns that declarative aliases "inherit the referenced
command"; the synthesis's "Its only interaction with state is through the recorded effect it returns" does not say who
checks that a command's aliased built-in is within the manifest's grants. `spike-trust.md:359-362` puts that check in
core effect-validation.
**Fix:** one sentence naming effect-validation against the manifest's grant set as the check, per `spike-trust.md:359-370`.

---

## 3. Does the add-order contradict an existing `after` or an epic's boundaries?

**F12 — MAJOR — the recommended "native packs" ticket has no owner epic and crosses epic-rpgcode-vm's boundaries.**
`epic-rpgcode-vm.md` Boundaries: "Built-ins that act on the world, drawing, audio, battle, menu or save belong to the
epic that owns that domain." The recommended packs span battle (`GsMisc` getEnemyStats/useItem, epic 7), audio (Kaimu,
epic 6), file I/O (`filereadwrite` under E-97 = entry 16 *in this epic*), and strings (proplug). The synthesis gives the
new ticket no `id`, `covers`, `verify`, or `after`.
**Fix:** either split the packs across their domain epics and keep only the registry-wiring here, or host the whole
thing in `epic-tk2-support` (epic 16); if filereadwrite rides E-97 (entry 16), the entry must be `after` 16 (and 3/21/22
for the registry).

**F13 — MINOR — spike-shape's putatively-replaced entry 24 cannot be sliced as written.**
`spike-shape.md:434-446` sets entry 24 `after = ["3","14","22"]`, but its own `verify` demands "restores a snapshot
taken mid-wait with an identical state hash" — that capability is entry 11's (snapshot hardening), and entry 18's
`after` list (`tickets.toml:328`) does not include 24.
**Fix:** if entry 24 is ever revived, add `"11"` to its `after` and `"24"` to entry 18's sweep.

**F14 — MINOR — add-order diverges from `spike-shape.md:415-424` without saying why.**
The synthesis merges `subsystems.battle`/`.menu` into one row and drops shape's order-8 row `subsystems.dialogue`
(board-rendering / E-96, not sliced). It also credits `events` to "epic 5", whereas shape separates the **bus**
(epic 5 / movement-triggers) from the **hook field** ("bus + first subscriber").
**Fix:** keep `subsystems.dialogue` as an explicit deferred row and keep "bus before hook field" as a distinct line.
No `after` is violated by the visible rows (battle=epic 7, menu=epic 8, events bus=epic 5, editor=epic 11 all check
against the initiative epic list, `tickets.toml:52-112`).

---

## 4. Guard-rail and sourcing check

**F15 — MINOR — no G1/G2/G3/G6/G7 violation in the recommendation; state this in the synthesis.**
First-party native packs are in-process `PluginDefinition`s emitting effect records (G1/G2 safe by construction);
no foreign code ships (G3/G6 safe); the doc-first amendment respects G7 (`docs/guardrails.md` G7.4). The one item to
make explicit: decoders "run at load, outside the VM" (`spike-trust.md:337`) are a load-time authority — the synthesis
correctly restricts them to Tier A, but should say so in guard-rail terms (G2: the decoder is pure and receives bytes
via the resolver; it must not touch host APIs).
**Fix:** add a one-line "guard-rail note" to the recommendation confirming G1/G2/G3/G6/G7 and the decoder constraint.

**F16 — MINOR — QuickJS/size claims need citations, not assertions (see F3).**
`synthesis` gate wording asserts a licence conclusion the evidence reached with URLs; `spike-trust.md:441-478` §8 already
lists them. `spike-shape.md` does not. Also there is **no repo evidence doc in `spike-23/`** for the licence/QuickJS
verdict other than spike-trust's web citations (Bellard / npm / quickjs-emscripten docs).
**Fix:** cite `spike-trust.md:218-227, 441-478` inline; drop the absolute "only candidate".

---

## 5. What the owner would regret not deciding now

**F17 — MAJOR — legacy-name mapping is undefined and it is the crux of "legacy games play".**
Nothing in the synthesis says how a legacy `.gam` plugin name (e.g. "Triuken's Plugin Pack") or `plugins.ini` entry
maps to a native pack or a manifest. `spike-trust.md:334` proposes `aliases`/`legacyNames` "add with entry 15"; the
synthesis's `activation` field only says "named in the .gam list" (`spike-shape.md` §2.10) and drops the mapping.
Without it, `.gam` rows 29 / `menuPlugin` / `fightPlugin` resolve to nothing.
**Fix:** add a decision: `legacyNames` (or a static legacy-name→native-pack table) is owned by entry 15, with an
unresolvable name producing a located diagnostic.

**F18 — MINOR — other undecided shapes the synthesis drops from `spike-trust.md` §4.**
`kind` (trust marker), `aliases`/`legacyNames`, `dependencies`/`requires`, and the consent record joining run identity
(`RunConfig`/`schema`, `spike-trust.md:409-411`) are all absent. Even if deferred, they belong in the Decisions list so
the owner answers them once.
**Fix:** add them to "Decisions for you" with a recommended deferral.

**F19 — MINOR — epic-level inconsistency not on the amendment list.**
`epic-rpgcode-vm.md` Done-when #6 still requires "duplicate-name rejection", contradicting the owner's
last-registered-wins ruling the synthesis depends on.
**Fix:** add `epic-rpgcode-vm.md` Done-when #6 to the doc/notes amendment list.

---

## Severity summary
- Blockers: none.
- Major: F1, F3, F4, F7, F8, F9, F10, F12, F17.
- Minor: F2, F5, F6, F11, F13, F14, F15, F16, F18, F19.

## What is sound
The field add-order skeleton, the decision to keep `dialects` core-internal, the `decoders`-by-entry-14 plan, the
owned-state-as-`vm.extension[pluginId]` slot, the "bus before hook field" sequencing, and the trust-boundary framing
itself are all well-supported by the repo docs and evidence. The critique is about the four unresolved rulings (F4, F7,
F8, F10) and the missing artifact (F12/F17), not the overall direction.
