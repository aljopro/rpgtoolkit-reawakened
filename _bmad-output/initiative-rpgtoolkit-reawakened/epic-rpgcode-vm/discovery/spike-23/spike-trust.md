# E-99 — Trust model, sandbox and the rest of `PluginDefinition`

Research proposal for `epic-rpgcode-vm` entry 23 (spike, `hitl`). **No code changes.** It exists so the
owner can rule on each question with its reason; every claim cites a file/line or a URL.

- Sources of authority: `docs/guardrails.md` (G1–G7), `docs/adr/0004-script-ast-step-ir-and-plugins.md`,
  `docs/adr/0006-clean-room-spec-extraction.md`, `docs/engine-features.md` E-70…E-99,
  `docs/format-spec.md` §2/§9.11/§12, the architecture spine (AD-5, AD-7…AD-10, AD-17, AD-23, AD-24,
  AD-26, AD-31, AD-32), `epic-rpgcode-vm.md` + `tickets.toml` entries 3/14/15/16/21/22/23,
  `epic-rpgcode-vm/discovery/zip-survey.md` (+ `/tmp/zip-survey-plugins.csv`),
  `recovery-legacy-docs-and-plugins/plugins.md` + `findings/06-plugin-sdk.md`.
- Method: read-only. No legacy source read (G7, ADR 0006); the archaeology is the recovered SDK
  *declarations* and community readmes only (`findings/06-plugin-sdk.md:390-391` records the same limit).

---

## 0. What is already decided, and the one tension to resolve

Owner decisions treated as fixed (from `epic-rpgcode-vm.md` Notes and `tickets.toml`):

1. TK2 and TK3 games both play at launch (`epic-rpgcode-vm.md:51`).
2. `PluginDefinition` starts as `{ id, version, commands }` and grows only when an entry needs a field
   (`tickets.toml:45-49`, `:245`).
3. Commands are functional `(view, args) -> { out, effects, wait? }` through one contract; the VM and the
   owning modules apply the effects (`tickets.toml:45`, `:245`).
4. Registration is fixed module order, last-registered-wins for a repeated name/alias with one warning
   diagnostic; AD-8's duplicate rejection survives only for one plugin repeating itself
   (`tickets.toml:45-49`, `epic-rpgcode-vm.md:63`).
5. Script functions are last-definition-wins (`epic-rpgcode-vm.md:62`).
6. Native DLL plugins (`TKPlugQuery`/`TKPlugExecute`) cannot load; the engine offers unknown commands to
   plugins (`epic-rpgcode-vm.md:60`, `docs/format-spec.md` §12, `zip-survey.md:57`).
7. **E-99 is a sandboxed mechanism and games are untrusted** (`docs/engine-features.md:311`, AD-17:
   "Games are untrusted input. The E-99 extension mechanism uses these same requests.",
   spine `:248`).

**The tension (recorded as unreconciled in `epic-rpgcode-vm.md:55`).** ADR 0004 decision 2 says community
*and* first-party plugins share "the exact same runtime contract", with "no command has private backdoors
into the VM" (`docs/adr/0004-script-ast-step-ir-and-plugins.md` §Decision 2). AD-17 says scripts and the
extension mechanism reach files/network only through `StepReport.requests` and that games are untrusted
(spine `:248`). Both can hold if `PluginDefinition` is the **registration interface** for every plugin
while the **implementation tier** differs:

| Tier | Who | What implements a command | Trust |
|---|---|---|---|
| **T0 first-party** | the dogfooded standard library, `@tk-reawakened/plugin-tk2-compat`, `decoders` (entry 14), the default menu/battle subsystems | in-process TypeScript, compiled into the build | trusted; still goes through ports, still cannot touch the host |
| **T1 declarative / RPGCode** | plugin packages shipped with a game or installed by a user | manifest binds names to built-in commands or RPGCode programs; **no foreign code executes** | untrusted; capability-gated |
| **T2 foreign code** (deferred) | a real sandbox if it is ever needed | QuickJS-in-wasm (recommended) or wasm modules | untrusted; capability-gated |

That is the reconciliation: **one interface, two real tiers, one deferred.** It needs one doc-first commit
(G7) amending ADR 0004 with the tier table, exactly as entry 14 already plans for `decoders`
(`tickets.toml:257`).

---

## 1. Threat model

### 1.1 What is untrusted

* A **game package** the player downloaded: a `.tpk`/ZIP or a folder with `.prg`, assets, `Main/*.gam`,
  and — historically — `Plugin/*.dll` (`docs/format-spec.md` §2 row 29, §13; `zip-survey.md:60`).
  Asset bytes are attacker-controlled input (AD-17 `:248`; E-99 `:311`).
* Everything the package *declares*: plugin list, `menuPlugin`/`fightPlugin`, script programs, includes,
  `#redirect` targets, save files it opens.
* **Not** untrusted: the engine, its first-party plugins, the editor, and the host.

### 1.2 What is worth stealing or breaking

| Asset | Why it matters |
|---|---|
| Other games' saves and the user's `files` blob area | AD-17 scopes blobs by `GameId` (`:248`); a leak crosses game boundaries |
| The host filesystem / network / OS | Plugin code with ambient authority reaches anything the process can (E-99 `:311`; legacy proof: plugins imported `WININET` directly, `zip-survey.md:114`) |
| Determinism and the replay hash | G3 and G5 rest on it; a non-deterministic plugin silently invalidates every golden (G5) and every save/replay (E-120/E-121) |
| The snapshot | `GameState`/`VmState` must stay `PlainData` and restorable (G1, AD-7 `:132`, entry 11) |
| The user's trust | The install dialog, the "plugin UI" marker on a script-owned screen (E-96 `:305`), `openUrl` prompting (AD-17) |
| The build/licence | A package may ship GPL binaries or native plugin DLLs; loading one would breach G6 and G7 |

### 1.3 Attack catalogue

| # | Attack | How it would work | Primary mitigation (mechanism in §2/§3) |
|---|---|---|---|
| T1 | **Network exfiltration / C2 / mining** | plugin opens sockets (legacy `FaeroSock`, `multip.dll`) or HTTP (`FTP.dll`, `httpread`) | no ambient network; `net.fetch` capability + host allowlist + consent; raw sockets refused forever |
| T2 | **File read outside the game** | read `~/.ssh`, other games' saves, the user's documents | all I/O is `asset`/`loadBlob`/`saveBlob` requests through blob areas scoped by `GameId` (AD-17) |
| T3 | **File write outside the game** | overwrite files, drop a payload, fill the disk | writes go only to `saves`/`files` (AD-17, entry 16 `tickets.toml:292`); `files` per-plugin subfolder + quota |
| T4 | **Infinite loop / DoS (CPU, battery)** | `while(1){}` in a plugin command or a decision loop | VM per-step budget (AD-26 `:307`, ADR 0004 §Negative/"Plugin execution budget"); for T2 tiers, an instruction budget, never a wall clock |
| T5 | **Memory exhaustion** | allocate in a loop; build a 4000-deep value that blows `canon` | state size + nesting bounds (deferred-work.md:14-15); per-section caps; sandbox memory limit if T2 |
| T6 | **Nondeterminism / replay poisoning** | call the wall clock, draw randomness out of order, depend on hash iteration order | G3 bans `Date`/`Math.random` in core; injected clock/RNG only (G3, AD-11); a plugin sees `clock.read` = game time, never wall time; plugin commands are pure (`tickets.toml:45`) |
| T7 | **Snapshot poisoning** | return a closure/host handle, an unknown section, or a huge value; embed a fake effect the host trusts | effects/replies are validated against AD-23 per-section schemas before apply; unknown sections/kinds refused with a diagnostic; state stays `PlainData` (AD-7, G1) |
| T8 | **Command hijack / override** | register `giveItem`/`save` (last-registered-wins, decision 4) and steal calls | namespace rule (§3.4): a T1/T2 plugin may not shadow a built-in or first-party name; it gets its own namespace; `command.overridden` warning stays |
| T9 | **Redirect hijack** | `#redirect(#giveItem, plugin.doom)` — the language has redirects (`docs/format-spec.md` §9.6, `zip-survey.md:160`) | redirect targets must be owned by the registrant; refusal + located diagnostic (§3.4) |
| T10 | **Capability widening through a save** | a crafted `.sav` that turns on networking | grants live in host storage + the run's consent record, never in `GameState`; a save cannot grant (§3.4) |
| T11 | **Host escape** | call Node/DOM APIs, `exec`, load a DLL/ActiveX, Flash | nothing loads: no native code path at all in T0/T1; T2 is a wasm sandbox with an explicit import list |
| T12 | **UI spoofing / phishing** | draw a fake login form or fake "engine needs your password", then `openUrl` | `screen.own` capability + a persistent host-drawn "plugin UI" marker; `openUrl` is `https:`-only and always asks (AD-17 `:248`) |
| T13 | **Determinism-affecting event ordering** | register hooks that reorder the event queue or RNG draws | hooks are data with a fixed priority, executed in a deterministic order (ADR 0004 §Decision 4); the event queue lives in `world.eventQueue` in state (AD-32 `:349`) |
| T14 | **Identity / supply-chain spoofing** | claim `id: "tk-reawakened.menu"` or a version to impersonate first-party | plugin ids are namespaced and verified against the package's manifest; shipped ids are reserved; publishing is out of scope for v1 |
| T15 | **Resource abuse of the presentation path** | spamming draw commands, audio cues, or saves | effect-list caps per step; audio cue id from the core counter (AD-16); request rate limits at the host |
| T16 | **Cross-game data probe** | read `files` written by another plugin/game | `files` area is per-`GameId` **and** per-plugin subpath; listing is scoped |
| T17 | **Licence/provenance smuggle** | ship a GPL DLL or copied assets inside the package | never load native code; the licence gate (G6) and provenance scan (G7) cover shipped deps, not game assets — user-facing notice for what a package contains |
| T18 | **Bricking the run** | throw during load, corrupt the save area, wedge a blocking thread | errors are located diagnostics (`step(…) -> status` G1:1; AD-24 `:293`); a failed plugin activation disables the plugin and the game still boots |

The legacy baseline is worth stating once: there was **no** capability mediation. Plugin DLLs got a
callback table (98 `CB*` services in the 2004 SDK, 131 in the TK 3.1.0 SDK, `findings/06-plugin-sdk.md:173-205`,
`:287-291`) *and* full Win32 authority — the FTP plugin simply imported `WININET`
(`zip-survey.md:114`). That is the behaviour E-99 must not reproduce.

---

## 2. Candidate mechanisms

### 2.1 Criteria

1. **G1** — the VM is a step machine whose state is plain JSON (`docs/guardrails.md` G1; AD-7 `:132`);
   mid-command snapshots must restore (entry 11).
2. **G2** — `core` touches no DOM/Node/IO/timers (`guardrails.md` G2; AD-17 `:248`).
3. **G3** — determinism and replay (`guardrails.md` G3; ADR 0002 maths allowlist).
4. **Snapshotability** — plugin state can be `JSON.stringify`-ed and restored into a fresh VM.
5. **Host portability** — browser (`runner-web`), VS Code web (`vscode.dev`), Node/headless, desktop
   (Tauri/Electron/Electrobun), mobile (Capacitor) — all one core build (CAP-12, spec
   `spec-rpgtoolkit-reawakened.md:58-61`).
6. **Limits** — steps/CPU, memory, and time all enforceable on every host.
7. **Capability set** — what the plugin can reach, and whether it can be denied by default.
8. **Authoring experience** — who can write a plugin in 2026, and who the legacy community actually is
   (VB/C++/Delphi and RPGCode, `zip-survey.md:92-93`).
9. **Licence** — Bronze or better on the Blue Oak list (G6).

### 2.2 Analysis

---

**(a) Plugin = pure data-in/out command inside the RPGCode VM (RPGCode-written plugins; no foreign code)**

A plugin package carries a manifest plus `.prg` functions; the manifest binds command names to those
programs. The VM already runs RPGCode lowered to Step IR (ADR 0004 §Decision 1), inside threads whose
state is `PlainData` (AD-7). So a plugin command *is* a script call with a name.

- **G1** ✅ by construction: the plugin runs as a normal thread; a snapshot mid-command restores exactly
  like any other program (entry 2/11 already test this).
- **G3** ✅ by construction: `fmath`, injected clock/RNG, fixed step, deterministic phase order (AD-26
  `:307`, ADR 0002). A blocking plugin command yields an AD-9 wait (`:143`) instead of spinning.
- **Limits**: per-step budget (ADR 0004 §Negative) and the thread model's update budget (spine "per-step
  thread budget", Deferred `:489`); memory is bounded by state caps; there is no wall clock to run against.
- **Capabilities**: none of its own — it can only reach what the built-ins it calls can, and every
  built-in side effect is an `effect` record or an AD-17 request. **But** the effect must be validated
  against the caller's grants (§3.4) or an RPGCode plugin inherits full built-in power.
- **Portability** ✅: pure TypeScript, identical in every host.
- **Authoring** ⚠️: RPGCode is the legacy language (E-90, `docs/format-spec.md` §9); the audience already
  writes it, the LSP is planned (epic-rpgcode-tooling, CAP-13). Not a language modern authors would pick.
- **Licence** ✅: our own code, no new dependency.
- **Verdict: ship as the v1 third-party tier.**

**(b) WebAssembly modules in a capability sandbox**

- **G1** ❌: a module's linear memory is not `PlainData`; there is no memory snapshot/restore, so a
  mid-command snapshot cannot be hashed or restored (AD-7/AD-11 assume JSON state).
- **G3** ⚠️: wasm is "mostly deterministic" but NaN payloads differ and threads/relaxed-SIMD are
  explicitly non-deterministic — Wasmtime documents the canonicalization and feature restrictions needed
  ([wasmtime deterministic docs](https://docs.wasmtime.dev/examples-deterministic-wasm-execution.html),
  [WebAssembly/design Nondeterminism.md](https://github.com/WebAssembly/design/blob/main/Nondeterminism.md)).
  Clock/RNG must be host imports (fine). Fuel counts are *not* a portable determinism unit across engines.
- **Limits**: memory cap via the declared memory maximum ✅. Interruption: wasmtime has fuel and
  epoch interruption ([Interrupting Execution](https://docs.wasmtime.dev/examples-interrupting-wasm.html));
  **the browser `WebAssembly` API has no equivalent**, so a wasm infinite loop on the main thread is
  unstoppable — you need a Worker and `terminate()`
  ([MDN `Worker.terminate`](https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate)), which
  reintroduces non-deterministic scheduling and kills the G1 thread model.
- **Capabilities** ✅ strong: imports are an explicit, deny-by-default boundary.
- **Portability** ✅ (wasm is everywhere) but with a bundle/instantiation cost on mobile and a *different*
  interruption story per host, which is the worst kind of divergence for CAP-12.
- **Authoring** ❌: C/Rust/AssemblyScript for a community that wrote VB6 and Delphi
  (`zip-survey.md:92-93`) — the highest friction of all options.
- **Licence** ✅: wasmtime Apache-2.0 WITH LLVM-exception
  ([LICENSE](https://github.com/bytecodealliance/wasmtime/blob/main/LICENSE)), wasm3/wasmi MIT
  ([wasm3 LICENSE](https://github.com/wasm3/wasm3/blob/main/LICENSE)), Binaryen/AssemblyScript Apache-2.0.
- **Verdict: defer; only if a C/Rust author pool appears, and only Worker-hosted.**

**(c) JS interpreter compiled to wasm (QuickJS variants)**

- **G1** ❌: the interpreter heap/stack is outside `GameState`; no snapshot support.
- **G3** ⚠️: the engines are designed for deterministic behaviour (QuickJS uses reference counting "to
  have deterministic behavior", [bellard.org/quickjs](https://bellard.org/quickjs/index.html)) but `Date`,
  `Math.random`, `Intl` must be removed from the sandbox global and replaced by injected clock/RNG.
  Budget: `quickjs-emscripten` documents memory/CPU constraints via `setInterruptHandler` (called
  regularly while the interpreter runs), `setMemoryLimit` and `setMaxStackSize`
  ([QuickJSRuntime docs](https://github.com/justjake/quickjs-emscripten/blob/main/doc/quickjs-emscripten/classes/QuickJSRuntime.md)).
  Whether the interrupt counter is a reproducible instruction count **must be proven** before this tier
  counts as G3 ([INFERENCE] it is an internal periodic counter; tie the budget to a pinned engine build,
  and treat a build change like a compiler change — restart-on-mismatch, AD-11).
- **Limits**: CPU ✅ (interrupt handler), memory ✅ (hard `setMemoryLimit`), stack ✅.
- **Capabilities** ✅✅ best of all: the sandbox global is *authored by us* — no `fetch`, no `require`,
  no DOM; capabilities are exactly the host functions we inject, which is easier to specify, test and
  explain than a wasm import list.
- **Portability** ⚠️: wasm in every host today; but it ships an engine (sync/async/ASM variants) into the
  web, VS Code web, desktop and mobile bundles, and still needs a Worker for preemption.
- **Authoring** ✅✅: modern JS — the largest author pool, and TypeScript typings + the LSP can cover it.
- **Licence** ✅: QuickJS MIT ([bellard.org/quickjs index](https://bellard.org/quickjs/index.html)),
  `quickjs-emscripten` MIT ([npm registry](https://registry.npmjs.org/quickjs-emscripten)),
  Duktape MIT ([duktape.org](https://duktape.org/)), JerryScript Apache-2.0
  ([wiki](https://github.com/jerryscript-project/jerryscript/wiki/License)).
- **Verdict: the recommended foreign-code candidate if one is ever needed; deferred now.**

**(d) Worker-isolated JS**

- **G1** ❌ explicitly: G1:4 forbids Web Workers for script threads; a worker's heap is not `GameState`.
- **G3** ❌: cross-thread scheduling is not deterministic, and any timeout is wall-clock based.
- **Limits**: time ✅ via `terminate()`; memory ❌ (no per-worker cap in browsers; `resourceLimits` exists
  only in `node:worker_threads`, [Node docs](https://nodejs.org/api/worker_threads.html)).
- **Capabilities** ❌: a same-origin worker keeps `fetch`, `WebSocket`, `indexedDB`, `importScripts`;
  there is no origin boundary between the game and the user's session, so this is not a sandbox.
- **Portability** ⚠️: three APIs (browser Worker / `worker_threads` / Capacitor plugin) and a changed
  reply channel.
- **Verdict: rejected as a plugin sandbox.** Workers remain for build-time/offline work and the LSP
  (AD-21 `:272`), never for plugin code.

**(e) Host-mediated `extension.call` only (AD-17)**

This is not a separate execution tier — it is the **capability substrate** every other tier uses. The
request type already exists: `ExtensionCallRequest { reqId, name, args: readonly PortData[] }`
(`discovery/foundations-audit.md:117-120`), with `extension.result` as its reply input (AD-5 `:119`, spine
`:248`).

- **G1** ✅: the VM holds a request and a wait, nothing else.
- **G3** ✅ **because the reply is an input**: AD-5 makes every reply a recorded input event
  (`extension.call → extension.result`), so replay reproduces the same value; a headless run answers
  `denied`, which is deterministic. This is the single most important property of the design: host
  results enter the simulation as data, never as a side channel.
- **Snapshot** ✅: an outstanding request is `{ reqId, kind }` in state; per AD-5 the reply is queued if
  it arrives during `loading`.
- **Limits** ✅: the host enforces time/size on the call.
- **Capabilities** ✅: exactly the request union, per request.
- **Portability** ✅: each host implements what it can and degrades by capability (AD-20 pattern for the
  editor; the same idea for runners, CAP-12).
- **Licence** ✅ none.
- **Verdict: adopt as the mechanism for every capability that leaves the core.**

**(f) Declarative data plugins only**

A manifest binds names to built-ins/programs by id, with argument remapping and alias tables. No foreign
code, no new language.

- **G1/G2/G3/limits/snapshot/portability** ✅ (nothing executes that the engine does not already run).
- **Capabilities**: inherits the referenced command — so an alias must be checked against the plugin's
  grants (do not let `net.fetch` be reached through a harmless-sounding alias).
- **Authoring** ✅✅: perfect for the large legacy "shim" class (TK2 signature adapters, `#And`, `#litlen`).
- **Licence** ✅ none.
- **Verdict: ship; it covers the biggest share of real plugin packages (§6).**

### 2.3 Comparison table

Legend: ✅ yes by construction · ⚠️ possible with work/caveats · ❌ no.

| | (a) RPGCode-in-VM | (b) wasm module | (c) JS-in-wasm (QuickJS) | (d) Worker JS | (e) host `extension.call` | (f) declarative |
|---|---|---|---|---|---|---|
| Executes | RPGCode lowered to Step IR | native wasm | JS in an embedded engine | JS in a thread | nothing (host does it) | nothing |
| G1 snapshot | ✅ plain-data thread | ❌ memory not JSON | ❌ engine heap | ❌ worker heap; G1:4 bans it | ✅ request+wait only | ✅ |
| G3 determinism | ✅ fmath/clock/RNG/fixed step | ⚠️ NaN/threads banned; fuel not portable | ⚠️ engin ok, budget must be proven | ❌ scheduling/wall clock | ✅ replies are recorded inputs | ✅ |
| Limits: steps | ✅ per-step budget | ⚠️ fuel (native only) | ✅ interrupt counter (pin build) | ❌ | ✅ host | ✅ |
| Limits: memory | ✅ state caps | ✅ memory max | ✅ `setMemoryLimit` | ❌ | ✅ host | ✅ |
| Limits: time | ✅ cooperative yielding | ❌ browser has no preemption | ❌/Worker | ✅ terminate | ✅ host | ✅ |
| Capability set | effects + requests (must be gated) | wasm imports ✅ | injected globals ✅✅ | ambient authority ❌ | request union ✅ | inherited (must be gated) |
| Host portability | ✅ | ✅ but per-host interrupts | ⚠️ bundle + Worker | ⚠️ three APIs | ✅ degrade by capability | ✅ |
| Authoring | ⚠️ legacy language | ❌ C/Rust | ✅✅ JS | ✅ JS | n/a | ✅✅ data |
| Licence (G6) | ✅ none | ✅ Apache/MIT runtimes | ✅ MIT/Apache engines | ✅ none | ✅ none | ✅ none |
| Bundle cost | 0 | +wasm per plugin | +engine per runner | 0 | 0 | 0 |
| **Verdict** | **ship (v1)** | defer | **defer (best T2)** | **reject** | **adopt as substrate** | **ship (v1)** |

---

## 3. Capability model

### 3.1 Named capabilities

Declared in the plugin manifest, **default-deny**, granted per package *and* per plugin, revocable.
Every capability maps either to an AD-17 request or to a validated effect kind.

| Capability | Grants | Backing mechanism | Risk |
|---|---|---|---|
| `assets.read` | read shipped game files, read-only, scoped to the package's `AssetIndex` | `asset` request (AD-17) | low |
| `saves.list` | list this game's saves | `listBlobs` (area `saves`) | low |
| `saves.read` | read this game's saves | `loadBlob` (area `saves`) | medium |
| `saves.write` | write/delete this game's saves | `saveBlob` (area `saves`) | medium |
| `files.read` | read the `files` area under this plugin's subpath | `listBlobs`/`loadBlob` (area `files`) | medium |
| `files.write` | write to the `files` area under this plugin's subpath, with a quota | `saveBlob` (area `files`) | medium |
| `net.fetch` | outbound HTTP(S) through the host, host allowlist, no cookies/credentials, user-visible | new `net.fetch` request (+ reply) | **high** |
| `openUrl` | open an `https:` URL; always asks the user | `openUrl` (AD-17) | medium |
| `video.play` | play video (E-104) | `playVideo` (AD-17) | low |
| `draw` | emit `DrawCommand`s (G4) | effects → draw list | low |
| `screen.own` | own the frame for a blocking scripted UI (E-96) | `render.*` ports + a host marker | **high** (spoofing) |
| `input.read` | read the key/pointer queues, register cursor maps | state sections via ports | low |
| `audio` | emit `AudioCue`s (E-100…E-102) | effects → AD-16 cues | low |
| `world.read` | read board/sprites/party (`view`) | read-only view | low (implicit) |
| `world.write` | emit effects that mutate `world`/`sprites` | validated effects | medium |
| `party.write` | party, inventory, gold, equipment effects | validated effects | medium |
| `battle.control` | drive battle operations (E-79) | validated effects | medium |
| `menu.control` | open/replace menu screens (E-80) | validated effects | medium |
| `globals.read` / `globals.write` | script globals (E-92) — most legacy shims need read+write | `vm.globals` view | medium |
| `clock.read` | read the deterministic **game** clock; never wall time (G3) | state | low |
| `subsystem.menu` / `.battle` / `.dialogue` | replace a default subsystem | `PluginDefinition.subsystems` | **high**, T0 only in v1 |
| `decoder.register` | register an `AssetDecoder` (AD-31) | `PluginDefinition.decoders` | **high** (runs outside the VM), T0 only in v1 |
| `dialect.register` | register a script dialect frontend | `PluginDefinition.dialects` | **high** (compile-time), T0 only |
| `clipboard.read`/`.write`, `notify` | host clipboard/notification | new host requests | medium |
| `extension.call` | call a host function by name that no other capability covers | AD-17 (exists) | **high**; allowlisted names only |
| `net.socket`, `save.crossgame`, `shell.exec`, `device.*` | — | **refused, permanently** | n/a |

`net.socket` is refused rather than deferred: the legacy socket plugins (`multip.dll`, `FaeroSock`,
`zip-survey.md:78`, `:82`) need a relay service, which is a product decision, not a sandbox feature.

### 3.2 Manifest and consent

```jsonc
{ "id": "community.proplug-compat", "version": "1.0.0", "kind": "declarative",
  "commands": [ { "name": "and", "alias": "proplug.and" },
                { "name": "litlen", "program": "proplug.prg:litlen" } ],
  "capabilities": ["globals.read", "globals.write"],
  "legacyNames": ["proplug"],           // matched against .gam row 29 / plugins.ini
  "sources": [ { "file": "proplug.prg", "sha256": "…" } ] }
```

* The **install/consent UI** lists each requested capability in plain language; `net.fetch`,
  `screen.own`, `extension.call` and `subsystem.*` require an explicit extra confirmation.
* Grants are stored **per `GameId` + plugin id** in host storage, are part of the run's consent record,
  and are **never** written into `GameState` (a save cannot widen them — T10).
* Capabilities are intersected with the **package**'s grants: a game bundled with a plugin cannot widen
  what the user granted the game; a plugin may only narrow.
* Headless/CI runs use a `denyAll` host: every non-asset request is answered `denied`, deterministically.

### 3.3 Wiring to AD-17 requests and AD-9 waits

| Capability | AD-17 request | AD-5 reply input | AD-9 wait kind |
|---|---|---|---|
| `assets.read` | `asset` | `asset { reqId, bytes \| null }` | *(none — blocking requests freeze the whole sim; AD-5 `:119` says "no per-thread asset wait")* |
| `saves.*`, `files.*` | `listBlobs` / `loadBlob` / `saveBlob` | `blob.listed` / `blob.loaded` / `blob.saved` | `blob` (entry 16) |
| `net.fetch` *(new)* | `net.fetch` | `net.fetched` *(new)* | `net` *(new; owner registers it, AD-9)* |
| `openUrl` | `openUrl` | `url.opened` *(confirm shape with entry 1.8)* | `openUrl` |
| `video.play` | `playVideo` | `video.ended` (AD-14 `:223`) | `video` |
| `extension.call` | `extension.call` | `extension.result` | `extension` |
| `clipboard.*`, `notify` *(new)* | new requests | new replies | new kinds |
| `draw`, `audio`, `world.*`, `party.*`, `battle.*`, `menu.*`, `globals.*`, `clock.read` | — (pure effects/state) | — | existing kinds only (`input.*`, `sleep`, `movement`, `render.msgbox`, `menu.screen`, `audio.sfx`) |
| `quit` | `quit` | — | **refused for plugins**; `reset()`/`done` stay a game-script privilege |

Consequences to record in the ADR:

* Every new request kind is a doc-first AD-17 amendment plus a registered AD-9 wait kind owned by the
  entry that lands it (the AD-9 rule, `:143`).
* Because a reply is an input, **a capability the host answers is part of the replay**. The consent
  record (capability set) must therefore join the run identity so two replays cannot differ only in
  permissions; recommend `run.consent` in `RunConfig` and in the `schema`-versioned run metadata
  (AD-23 `:286`).
* `extension.call` stays last in lookup precedence (AD-8 `:136`, entry 3): a plugin command is only
  consulted after redirect, script function and built-in.

### 3.4 Enforcement points in core

1. **Registration (AD-8, entry 3)** — assembly rejects/renames by namespace:
   * T0 may register any name.
   * T1/T2 may not register a name that collides with a built-in, an alias, or a T0 command. Last-wins
     (decision 4) still resolves *plugin-vs-plugin* collisions with the `command.overridden` warning;
     the built-in namespace is protected. Reason: decision 4 exists to resolve mod conflicts, not to let
     a downloaded package hijack `save`.
   * Each plugin's commands are reachable both bare (if unambiguous) and under `pluginId.name`.
2. **Lookup** — unchanged four tiers (redirect → script function → built-in → extension), plus the
   namespace rule for plugin commands; the LSP shares this table (AD-8).
3. **Effect validation** — before applying an `effect`, core checks `(kind, section)` against the owning
   plugin's grants and the AD-23 schema for that section; unknown kinds/sections are refused with a
   located diagnostic (T7, T15).
4. **Redirect guard** — `redirect`/`killredirect` from a T1/T2 plugin must target a name the plugin owns
   (T9); otherwise refused with a diagnostic.
5. **Requests** — the only door to the host (AD-17); each request is checked against the grant set at
   emit time, so a bug in a plugin cannot smuggle a request through another plugin's grant.
6. **Restore** — outstanding requests and waits are restored from state; a wait whose owner/kind no
   longer exists follows entry 11's mismatch policy (locate + diagnostic, or deterministic error).

---

## 4. The rest of `PluginDefinition`, field by field

Each field is proposed with its first consumer, its trust implication and a recommendation. The rule
from the owner stands: **a field is added by the entry that first needs it** (`tickets.toml:245`).

| Field | Purpose | First consumer | Trust implication | Recommendation |
|---|---|---|---|---|
| `id` | unique, namespaced identity | entry 3 (exists) | id spoofing (T14) | keep; reserving `tk-reawakened.*` for first-party |
| `version` | semver + compat floor | entry 3 (exists) | downgrade attacks | keep; a save records the plugin versions that wrote it |
| `commands` | the one execution seam | entry 3 (exists) | the whole of §3 | keep as the only way code enters |
| `capabilities` | permission manifest (§3.1) | **this proposal →** the consent UI (epic-web-runner-packaging / desktop-shell) and the core request gate | central control | **add now**; harmless when a plugin asks for nothing |
| `kind` | `first-party` \| `declarative` \| `rpgcode` \| `sandboxed` | this proposal | selects the trust tier | **add now** as a literal union so the tiers are explicit and testable |
| `aliases` / `legacyNames` | which `.gam`/`plugins.ini` names this plugin answers for (format-spec §2 row 29; `menuPlugin`/`fightPlugin` row 21) | entry 15 (tk2-compat activation) | a package claiming another plugin's legacy name | **add with entry 15**, plus a diagnostic for unresolvable legacy names and a built-in mapping for `tk3menu`/`tk3fight` → native defaults |
| `decoders` | AD-31 asset pipeline | entry 14 + epic-tk2-support ("Register the TK2 decoders in the format registry") | runs at load, outside the VM — a real authority | **add with entry 14**, but **T0 only** in v1; third-party decoders wait for the T2 tier |
| `subsystems` (`menu`, `battle`, `dialogue`) | replace the default menu/battle/dialogue presentation | `menu`: epic-menu-party-save (custom menu replacement, `epic-menu-party-save.md` Done-when 2); `battle`: epic-battle (custom RPGCode fight program, E-79 `:260`) | replaces a core surface; a hostile one can phish (T12) | keep the field, but **T0 only** in v1. Third parties replace a subsystem with an RPGCode program (the existing `customFightPrg` route, format-spec §2 row 25; E-79) rather than an object. `dialogue` has **no consumer** → omit until one exists |
| `dialects` | register a script dialect frontend | entry 15 / a future third dialect (`inception-proposal.md:191` anticipates "a third dialect frontend … through the same `PluginDefinition` seam") | compile-time code with no sandbox; a bad frontend corrupts every program | **recommend `dialects?: string[]` of built-in frontend ids** (e.g. `"tk2"`, `"tk3"`), not code objects — it declares compatibility without widening the trust boundary. Third-party dialect *code* is out of scope |
| `hooks` / event subscriptions | ADR 0004 §Decision 4 (`PluginEventHook`) | the entry that lands the event bus (AD-32 pillar 3; no ticket yet) | hook order changes results (T13) | **defer the field**; when the bus lands, model a hook as **data** `{ event, priority, program }` where `program` is an RPGCode program — never a foreign function |
| `activation` | when/how a plugin turns on (`.gam` plugin list, `plugins.ini`, editor toggle) | entry 15 | a plugin that activates early sees more | **defer**; the manifest's `legacyNames` + a `requires` list is enough for v1. Keep the activation *rule* (unknown name → diagnostic, never load) now |
| `dependencies` / `requires` | plugin needs another plugin's commands | none yet | dependency confusion | **omit** until two plugins depend on each other |

Also record: `commands` entries stay AD-8 `BuiltinSpec`-shaped (`inception-proposal.md:181` records the
assumption), and the extension tier stays **empty** until a tier is chosen (entry 3 `tickets.toml:45-49`;
`inception-proposal.md:87`).

---

## 5. Recommended path and decision gates

### Phase 0 — v1.0 ("plays legacy games") — no third-party code

* `PluginDefinition` = `{ id, version, kind, capabilities, commands }` + `decoders` (entry 14, T0).
* The dogfooded standard library and `plugin-tk2-compat` (entry 15) are T0.
* A legacy plugin named in the `.gam` or `plugins.ini` resolves to: a native default (`tk3menu`/`tk3fight`),
  a T0 compat plugin, or an **unsupported** diagnostic. No code is loaded.
* Commands from unknown names get the recorded-effect stub + located diagnostic (entries 21/22), which is
  already how the epic plans to satisfy the catalogue.
* Capabilities exist and are enforced, but the only real ones are `assets.read`, `saves.*`, `files.*`,
  `draw`, `audio`, `world.*`, `globals.*`, `clock.read` — all inside the core. `net.fetch`,
  `screen.own`, `extension.call` exist in the enum and are **refused at the gate** with a diagnostic.
* Exit signal: a downloaded legacy game with arbitrary `Plugin/*.dll` files runs, and none of them loads.

### Phase 1 — declarative + RPGCode plugins (mechanisms a + f)

* A plugin package = manifest + `.prg` sources + assets; installed through the consent UI; executed in
  the VM with the per-step budget; every effect validated against its grants (§3.4).
* Covers the shim/alias/query/string/file/audio classes (§6) — most of the real catalogue.
* New requests (`net.fetch`, `clipboard`, `notify`) land here, each with a doc-first AD-17 amendment.

### Phase 2 — foreign code (mechanisms b/c) — **gated, unscheduled**

Gates, all required before any implementation entry is sliced:

| Gate | Question it answers | Evidence required |
|---|---|---|
| **G-A Demand** | Do authors need code we cannot express as RPGCode + manifest? | ≥ 3 documented community plugin requests that Phase 1 cannot serve, with the exact commands |
| **G-B Consent UX** | Can a user see and revoke capabilities? | the install dialog + a per-game permissions screen in both editor hosts |
| **G-C G3 proof** | Is the sandbox budget deterministic? | two-run replay (Node + headless browser) of a sandboxed command with identical per-step hashes, plus a pinned engine build recorded like the compiler version (AD-11) |
| **G-D Interruptibility** | Can every host stop a runaway plugin? | a Worker-hosted execution path on web/desktop/mobile + `terminate()`; no main-thread plugin execution anywhere |
| **G-E G1 story** | What does a snapshot mean with a plugin in flight? | a written policy (recommended: a plugin call is a **blocking host request**, replies recorded; the engine never snapshots foreign memory) |
| **G-F Budget** | Licence + bundle size on mobile | Blue Oak Bronze+ for every shipped engine; measured bundle delta per runner |

If Gate **G-C** cannot be met, the correct answer is to keep Phase 1 permanently and drop T2 — the
sandbox is a nice-to-have; G1/G3/G5 are not.

### Rejected options (one line each)

* **(d) Worker-isolated JS** — no memory cap, ambient authority, and G1:4 bans workers for script threads.
* **(b) wasm modules as the default T2** — worst authoring friction; only if Gate A shows C/Rust demand.
* **"Same API, no tiers" (ADR 0004 as written)** — contradicts AD-17's untrusted-games rule.
* **Auto-loading `Plugin/*.dll`** — impossible cross-platform and a G6/G7 breach; never.
* **A wall-clock timeout as the only limit** — nondeterministic, so it violates G3.

---

## 6. Legacy plugin class mapping

Source: `/tmp/zip-survey-plugins.csv` (30 rows) and `recovery-legacy-docs-and-plugins/plugins.md` §1–3.
Legacy plugin *kinds* map directly: `PT_RPGCODE` → `commands`, `PT_MENU` → `subsystems.menu`,
`PT_FIGHT` → `subsystems.battle` (`plugins.md:15-30`).

| Class | Rows from the CSV / catalogue | What it needs | Mechanism | Capabilities | Phase |
|---|---|---|---|---|---|
| **Pure stat/board/party queries** | `GsMiscPlugins` (getDp/getFp/getPlayerCoords/getEquip/…), `Triukens_plugin` (getItemStats/fontProperties/getSteps), `bps_adv_rpgcode_plugin` (the data ops) | read-only queries already in §9.11 | (f) alias → built-in, or (a) | `world.read`, `globals.read` | 0/1 |
| **String / math libraries** | `proplug` (`And`, `Or`, `Lprintf`, `litncpy`, `litcmp`, `littolower`, `litlen`), `danplugpack` string ops (`split/left/right/mid`) | pure functions | (f) alias to §9.11 string/math built-ins | none | 1 |
| **File R/W inside the game folders** | `filereadwrite.dll` (`FileWrite/FileAppend/FileRead`), `NeverFailRW` (minus `ShellOpen`/`ShellPrint`), `VIPPluginPak2` file ops, `BinaryReadWrite`, `danplugpack` file/Ini ops | the E-97 built-ins, sandboxed to `saves` | (f) alias to `openFile*`/`file*` | `saves.read`, `saves.write`, `files.*` | 0/1 |
| **Audio / music** | `KaimuPlugs` (`MidiTools`, `TransTools`), `DragSound`, FMod Audio, Movie Player | AD-16 cues | (a) RPGCode command emitting AudioCues, or (f) alias to `mediaPlay`/`wav`/`setVolume` | `audio` | 1 |
| **UI widgets & message windows** | `twbutton` (`TWSetButton/Check/Del`), `xfmwinplugin` (`XFMwin*`), Edit Box, Menu Help, Common Dialog, `147 Text Box`, Canvas Get Screen | §9.11 has `setButton`/`checkButton`, `mwin`/`text`/`pixelText`, canvases | (f) alias; composite widgets (a); full screens need E-96 | `draw`, `screen.own` (Phase 2 only), `input.read` | 1 (aliases) / 2 (`screen.own`) |
| **Menu / battle replacements** | Default Menu Patch, Default Battle System Patch, DMenu, Menu Help; `.gam` `menuPlugin`/`fightPlugin` | native default subsystems + RPGCode replacement (E-79, `customFightPrg`) | T0 `subsystems`; third-party via an RPGCode custom program | `subsystem.menu`/`.battle` (T0), or `menu.control`/`battle.control` | 0 (native + RPGCode) |
| **Network / HTTP / FTP / socket / e-mail** | `FTP.dll` (`httpread`, `ftp*`), `FaeroSock`, `multip.dll`, `E-Mail.dll`, HTTP plugin, Online Support, Winsock | host-mediated fetch; sockets via a relay (never) | **refused in v1**; `net.fetch` (Phase 1) for HTTP; sockets permanently refused | `net.fetch` (future), else refused | 1 (HTTP) / never (sockets) |
| **Host-handle / OS escapes** | `bps` (`GetHwnd`, `GetScreenDC`, `GetMwinDC`, `GetScratch*DC`, `RefreshScreen`), `NeverFailRW` (`ShellOpen`, `ShellPrint`), `DarkAge.dll`/`sendback`, `shoot.dll` (VB ActiveX), `flashplug` (Flash/DirectX), Resolution Changer, Shell, FileBrowser, Common Dialog | impossible or obsolete | **refused with a located diagnostic**; equivalents use host requests (`openUrl`, dialogs, `clipboard`) | none / `openUrl` | 0 (diagnostic) |
| **Asset decoders** | 32-bit Image Support, Bitmap Fonts, Read XML, Read XML plugin | `decoders` (AD-31) — code that runs at load | T0 now; third-party only with the T2 tier | `decoder.register` | 1 (T0) / 2 (third-party) |
| **Timers / clocks** | xLib.Timers, Time & Date, `danplugpack` `now` | the injected deterministic clock (G3) | (f)/(a) with `clock.read` — **never** wall time | `clock.read` | 1 |
| **Item / NPC data** | Item Data, Yet Another Item Plugin, Enemy Info, `npcplugin` (`NPCReadSchedule/SetSchedule/SendN`) | world/sprite effects + persistent NPC data | (a) RPGCode command + a namespaced plugin state section | `world.write`, `saves.write` | 1/2 |
| **Plugin managers & SDKs** | `multiplug` (`plugins.ini`), `extendedplugin`, `vcplussdk`, `delphisdk`, `4305` (C++ SDK), `861` (VB6 SDK), VB SDK | replaced by the manifest + `legacyNames` activation | **not ported**; publish a modder migration table | n/a | 0 (docs) |
| **Minigames (foreign code)** | `VB_Minigame_1-4` (`shoot.dll`) | rewrite as a script-driven screen (E-96) | (a) | `screen.own`, `input.read`, `draw` | 2/3 |
| **No-command binaries** | `tkplug1.dll`, `tkplug0/2.dll`, `TransChat2b` payloads | nothing | ignore | n/a | — |

Practical consequences for the corpus: the **24 plugin-provided TK2 commands** (`zip-survey.md:97-143`)
split into "alias-able today" (proplug, GsMisc, Triuken, file/audio) and "refuse" (`httpread`, `ftp*`,
`iWait`, `ksniloc_email_send`); only the four network ones are blocked by the trust model rather than by
effort. Entry 15's command-coverage matrix should carry this split as a column so the coverage claim
stays honest.

---

## 7. Open questions and risks

1. **Decision-4 scope** (§3.4 namespace rule) is a *new* question, not a reopening: it bounds
   last-registered-wins to plugin-vs-plugin and protects built-ins. Owner ruling needed.
2. **Interrupt counters and determinism** for the T2 tier (Gate G-C) — unresolved; do not implement T2
   before it is proven.
3. **`net.fetch` shape** — host allowlist syntax, redirect policy, response size cap; belongs to the
   entry that adds the request (doc-first AD-17 amendment).
4. **Consent record in the run identity** (§3.3) — needs `RunConfig`/`schema` to carry it; a small
   AD-23/AD-1 amendment.
5. **`screen.own` marker** — how a host draws "this screen belongs to a plugin" without breaking E-96's
   goldens (the marker must be outside the core draw list so the reference rasteriser stays pure).
6. **Existing deferred items affected**: `encodeLog`'s `{ t: 'bytes', hex }` collision and `canon`'s
   depth bound are both *reachable through a script-controlled `ExtensionResult.result`*
   (`deferred-work.md:11-15`); this proposal keeps them reachable and adds the requirement that the
   kernel bound nesting well below 3,900, to be ruled with the T1 tier.

---

## 8. Sources

Repo (read-only checkout `wt-epic2-followups`): `docs/guardrails.md` G1–G7 · `docs/adr/0004`, `0006` ·
`docs/engine-features.md:225-311` · `docs/format-spec.md` §2, §9.11 (`:792`), §9.6, §12 (`:851`), §13 ·
architecture spine `:115-119` (AD-5), `:132` (AD-7), `:136` (AD-8), `:143` (AD-9), `:147` (AD-10),
`:244-248` (AD-17), `:293` (AD-24), `:307` (AD-26), `:342` (AD-31), `:349` (AD-32) ·
`epic-rpgcode-vm.md`, `tickets.toml` entries 3/14/15/16/21/22/23 ·
`discovery/zip-survey.md:44-125`, `zip-survey-plugins.csv` (copy at `/tmp/zip-survey-plugins.csv`),
`foundations-audit.md:117-120`, `inception-proposal.md:26,42,181,191` ·
`recovery-legacy-docs-and-plugins/plugins.md` §1–3, `findings/06-plugin-sdk.md:8-9,173-205,287-291` ·
`deferred-work.md:11-15`.

Web (all permissive licences; cited 2026-10-11):
[QuickJS licence](https://bellard.org/quickjs/index.html) ·
[quickjs-emscripten licence + constraints](https://github.com/justjake/quickjs-emscripten/blob/main/doc/quickjs-emscripten/classes/QuickJSRuntime.md) ·
[quickjs-emscripten on npm](https://registry.npmjs.org/quickjs-emscripten) ·
[JerryScript Apache-2.0](https://github.com/jerryscript-project/jerryscript/wiki/License) ·
[Duktape MIT](https://duktape.org/) ·
[wasmtime licence](https://github.com/bytecodealliance/wasmtime/blob/main/LICENSE) ·
[Wasmtime interrupting wasm (fuel/epoch)](https://docs.wasmtime.dev/examples-interrupting-wasm.html) ·
[Wasmtime deterministic execution](https://docs.wasmtime.dev/examples-deterministic-wasm-execution.html) ·
[WebAssembly non-determinism](https://github.com/WebAssembly/design/blob/main/Nondeterminism.md) ·
[wasm3 MIT](https://github.com/wasm3/wasm3/blob/main/LICENSE) ·
[MDN Worker.terminate](https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate) ·
[Node worker_threads](https://nodejs.org/api/worker_threads.html) ·
[Node `vm` is not a security mechanism](https://github.com/nodejs/node/blob/main/doc/api/vm.md).
