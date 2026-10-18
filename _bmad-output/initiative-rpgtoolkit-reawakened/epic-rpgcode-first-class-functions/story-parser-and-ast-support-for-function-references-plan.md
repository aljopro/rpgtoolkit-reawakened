---
title: 'Parser and AST support for function references and anonymous methods'
type: 'feature'
ticket: 2
created: '2026-10-18'
status: 'draft'
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'medium'
context:
  - 'code - packages/core/src/script/parser.ts'
  - 'spec - docs/spec/engine/rpgcode-language.md'
---

## Intent
Enable the parser to accept function references and anonymous function declarations.

## Boundaries
Parser and AST definitions only. Does not alter lowering, bytecode, or VM execution.

## Key Decisions
Add AddressOf and AnonymousMethod AST nodes. Distinguish &identifier from by-reference parameters based on syntactic position.

## Acceptance
Valid function reference expressions parse cleanly; existing test suite passes without regressions.

## Verification
pnpm test:strict and dedicated parser test suite covering all reference cases.
