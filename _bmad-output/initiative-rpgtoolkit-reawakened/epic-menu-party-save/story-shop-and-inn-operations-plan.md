---
title: "Shop and inn operations"
type: 'feature'
ticket: 6
created: '2026-10-22'
risk: "medium"
context:
  - "spec - docs/spec/engine/rpgcode-functions.md#e-83"
  - "spec - docs/spec/engine/rpgcode-functions.md#e-84"
  - "spec - docs/spec/engine/rpgcode-functions.md#e-86"
  - "spec - docs/spec/engine/rpgcode-functions.md#items-inventory-shop--gold-28"
  - "spec - docs/spec/engine/plugins-and-battle.md#e-81"
  - "spec - docs/spec/engine/plugins-and-battle.md#e-82"
  - "spec - docs/spec/engine/actors.md#store-and-action-boundary"
  - "spec - docs/spec/engine/rpgcode-modules-and-objects.md#emit-13"
  - "spec - docs/spec/formats/item.md#layout"
status: done
---

## Intent

Implement the documented shop transaction and inn restoration behavior using Epic 8's item, gold and party operations.

## Boundaries

Shop buy/sell and inn operations only; item/equipment state remains owned by entry 4 and UI by entries 7–8.

## Acceptance

Fixtures cover affordable/unaffordable purchases, whole or partial sales, invalid/out-of-stock items, empty inventory, gold/quantity boundaries, and inn restoration. Rejected trades leave inventory, gold, party and actors unchanged; event assertions follow EMIT-13 and the contract checkpoint below.

## Verification

Run deterministic script-level scenarios with exact before/after state and diagnostics, including no partial mutation on rejected transactions.

## Contract required before coding

**Implementation checkpoint: CLEARED.** The owner has supplied authoritative Toolkit 3 trans3 runtime answers and approved the proposed operation surface for Epic 8.6. PR #621 establishes the normative contract.

**Approved shared operation surface (OWNER).** TypeScript and RPGCode menu implementations use the same read-only context and language-appropriate syntax. The context exposes read-only `shop.stock` (the active `CallShop` item sources in order, empty outside a shop) and `inventory.buyItem({ source, amount })`, `inventory.sellItem({ entryId, amount })`, and `party.inn()` actions. Each returns exactly `MenuStateResult`: `{ ok: true, error: null }` on commit/no-op, or `{ ok: false, error: { path, message } }` on refusal. These are menu capabilities, not new global RPGCode built-ins.

**Owner/engineer compatibility ruling (trans3 runtime answer supplied for Epic 8.6; not inferred from repository extraction).**

1. `callshop(item1, ...)` requires at least one parameter; 0 parameters raises a script error immediately and the shop fails to open entirely. Parameters resolve strictly as filenames relative to the Item asset directory (appending `.itm` if missing, case-insensitively); item handles are NOT resolved. If any listed item file is missing or invalid on disk, the engine raises a script error and the shop fails to open entirely (no partial opening, no skipping).
2. `inn()` sets current HP to max HP and current SMP to max SMP for all active party members immediately. Fallen party members (HP <= 0) are restored unconditionally (`revived`). `inn()` does not clear status effects, charges 0 GP, and is a pure headless stat restoration with no UI or audio.
3. Prices: a price of 0 GP is permitted for buying and selling (0 GP added or deducted).

**TKR design choice (Epic 8.6).**

- Item definition prices are signed integers on disk, but TKR cleanly rejects negative prices with atomic refusal (`MenuStateResult` error).
- Buy and sell quantities are positive safe integers.

**Transaction rules and event ordering.**

- `CallShop(item1, ...)` supplies the active shop's read-only stock via `shop.stock`. A buy is allowed only for a listed, resolvable `.itm` source; it adds `amount` of the definition's `itemName` handle to the unique `(source, handle)` stack and debits `buyPrice × amount`. A sell addresses an existing `entryId`, removes only available/unequipped quantity, and credits `sellPrice × amount`; it is not limited to the current buy stock. `keyItem` does not prohibit shop sale: E-81 restricts only the stock-menu drop affordance and item.md assigns no general engine rule to the flag.
- Refuse an unavailable asset, out-of-stock buy, unknown stack, insufficient quantity or gold, negative price, unsafe product, quantity/ID exhaustion, or unsafe/negative resulting balance atomically. A refusal changes no state and emits no event.
- A committed buy emits one existing `itemAdded` and, when the balance changes, one existing `goldChanged`; a committed sell emits one `itemRemoved` and, when the balance changes, one `goldChanged`. Emit after the whole transaction commits, in item-then-gold order; zero-price trades emit only the item event. No shop-specific event or saved shop/inventory field is added.
- `party.inn()` is a single party-owner operation coordinated through actor operations, not the existing `PartyAction.restore` (which re-adds a removed roster member). It restores HP and SMP to their maxima for every active party member, including fallen members; leaves status effects, equipment, roster, inventory and gold unchanged, and charges no gold. Refusal is atomic. It adds no inn/party/inventory event; actor-owned `revived` transitions occur when a member crosses HP <= 0 to positive.
- `callshop(item1, ...)` remains the existing blocking `void` built-in that opens the stock UI; the menu commits its trades through these shared actions. Existing `inn()` remains `void` and dispatches `party.inn()` synchronously through the party owner. `getitemcost` and `getitemsellprice` remain read-only price getters. The existing `MenuStateResult` refusal is surfaced through the normal `menu.state-invalid` diagnostic with its path and message when invoked from RPGCode.

**Owner resolutions.**

1. *CallShop stock resolution:* 0 parameters raises a script error and shop fails to open; parameters resolve strictly as filenames relative to Item asset directory (appends `.itm` if missing, case-insensitive); item handles are not resolved; any missing/invalid file raises a script error and shop fails to open entirely.
2. *Inn restoration scope:* sets current HP to max HP and current SMP to max SMP for all active party members immediately; fallen members restored unconditionally (`revived`); does not clear status effects, charges 0 GP; pure headless stat restoration with no UI/audio.
3. *Prices:* price of 0 permitted for buying and selling; negative prices rejected cleanly by TKR with atomic refusal.
4. *Operation surface:* approved as proposed (`shop.stock`, `inventory.buyItem`, `inventory.sellItem`, `party.inn()` with `MenuStateResult`).

## Contract impact scan

- **Saved state / snapshots / hashes:** no persisted fields are proposed; the existing `InventorySection` and `PartySection` remain unchanged. New action requests are transient owner inputs, not save data.
- **Existing source and tests:** `packages/core/src/menu/inventory.ts` owns `InventoryAction`/`InventoryEvent`; `packages/core/src/menu/ports.ts` owns `PartyAction`, section ports and `MenuStateResult`; `packages/core/test/menu-state.test.ts` covers current item/gold transitions. No shop or inn transaction action exists yet. The catalogue has `callshop` (`menu.screen` wait) and `inn` entries but no shop/inn implementation. These are future implementation/test updates, not edits in this docs-only PR.
- **Recorded artifacts:** scanned tracked golden/replay/snapshot/JSONL/expected/hash candidates and transaction-shape literals. No existing shop/inn transaction payload or `buyItem`/`sellItem`/`party.inn` fixture was found. Existing goldens, snapshots and replay payloads need no regeneration because the saved shape and existing event detail shapes do not change.
- **Provenance and authored fixtures:** searched `docs/provenance/`, `packages/core/test/fixtures/` and their RPGCode usage for `CallShop`/`callshop`/`inn()`; no evidence establishes CallShop argument resolution or Inn details. No GPL legacy source was opened.
- **Plan/spec references:** corrected the nonexistent `plugins-and-battle.md#e-86` reference; E-83/E-84/E-86 are in `rpgcode-functions.md`. The normative rules, event rows and this plan must be kept aligned before implementation.

## Implementation map

Compose entry 4's transactional operations and entry 3's party port; do not add separate shop-owned copies of gold or inventory.
