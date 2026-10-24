---
title: "Refactor sweep"
type: 'feature'
ticket: 13
created: '2026-10-22'
risk: "low"
context:
  - "epic - epic-menu-party-save.md, Done when"
---

## Intent

Reconcile ownership and remove dead paths exposed by all implementation stories before integrated acceptance.

## Boundaries

Cleanup only; every missing behavior is a new ticket, never deferred into this sweep. The end-to-end story remains last.

## Acceptance

One owner/port exists per persisted section and operation; no duplicate party/inventory/menu/save implementation remains; registrations, references, command docs and the Epic 8 envelope agree with the final contracts.

## Verification

Review references and registrations and run the full Epic 8-focused checks after the sweep; compare all changed APIs and sections against the normative docs.

## Implementation map

Scope is set from the preceding story plans and accepted review findings; no isolated code lane is introduced.
