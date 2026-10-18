---
ticket: 31
type: feature
status: done
---

# Reset, quit and lifecycle built-ins

## Scope
Implement E-06 reset/quit lifecycle control in the core engine, expose lifecycle built-ins (`reset`, `mainFile`, `win`, `gone`, `over`, `quitGame`, `dos`, `windows`, `godos`, `start`), and provide a per-section reset registration seam for section owners.

## Design
- Lifecycle commands are first-party world/engine commands and emit data-only effects; aliases share the same quit request.
- Engine consumes lifecycle effects deterministically between ticks. Reset preserves `rng` and `time`, clears the documented sections, restarts plugin services, and reruns startup at E-02 step 3. `mainFile` requests the same boot path for a named main asset.
- A `resetRegistrations` init seam lets owning packages clear their sections without core knowing their concrete state shape. Registrations run in stable rank order.
- `gone` emits only a `triggers` effect; `over` emits a lifecycle request; `win`, `start`, and `godos` raise catchable obsolete errors.

## Proposed ruling (pending owner review)
Lifecycle command implementations belong in the existing `world` first-party pack rather than a new manifest pack: the world pack already owns board-rendering lifecycle commands (`send`, camera/board transitions), is present in the default manifest, and avoids a second registration convention. A separate pack would add an unnecessary manifest/plugin surface.

## Acceptance
- Reset preserves rng/time and clears documented reset sections, invokes registered section resetters, and restarts startup.
- Quit produces one request and exposes quit state to the runner; aliases behave identically.
- `mainFile`, `gone`, `over`, obsolete errors and catalogue metadata match the normative docs.
- Tests cover command behavior, reset seam, lifecycle requests and alias equivalence.
