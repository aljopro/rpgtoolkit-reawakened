---
title: "Shop and inn operations"
type: 'feature'
ticket: 6
created: '2026-10-22'
risk: "medium"
context:
  - "spec - docs/spec/engine/plugins-and-battle.md#e-86"
  - "spec - docs/spec/formats/item.md"
---

## Intent

Implement the documented shop transaction and inn restoration behavior using Epic 8's item, gold and party operations.

## Boundaries

Shop buy/sell and inn operations only; item/equipment state remains owned by entry 4 and UI by entries 7–8.

## Acceptance

Fixtures cover affordable/unaffordable purchases, selling whole or partial stack as specified, invalid or unavailable items, gold/inventory boundaries, and restoration of each eligible party member at an inn.

## Verification

Run deterministic script-level scenarios with exact before/after state and diagnostics, including no partial mutation on rejected transactions.

## Implementation map

Compose entry 4's transactional operations and entry 3's party port; do not add separate shop-owned copies of gold or inventory.
