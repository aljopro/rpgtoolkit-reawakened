---
title: 'Parser and AST support for lambdas, dictionary literals and indirect calls'
type: 'feature'
ticket: 2
created: '2026-10-18'
status: built
baseline_revision: 'c869f2cd'
risk: 'medium'
context:
  - 'code - packages/core/src/script/parse.ts'
  - 'spec - docs/spec/engine/rpgcode-language.md (FUN-8, EXP-7)'
  - 'spec - docs/spec/engine/rpgcode-modules-and-objects.md (OOP-10, OOP-11, MOD-2)'
---

## Intent
Make the parser accept the syntax entry 18.1 ruled: arrow lambdas, dictionary literals, dot member access and calls through an expression. The ticket text said `&identifier` and anonymous `method(...)`; the owner's 2026-10-18 rulings replaced that with arrow lambdas, so no address-of operator exists.

## Boundaries
Lexer, parser and AST only. Lowering refuses the new nodes with a located `syntax.unsupported` until entry 18.3, so nothing parses into a silent no-op. No VM, value or save changes.

## Key Decisions
- `=>` is a two-character operator token.
- `lambda` node: `(a, &b) => { ... }`, `(x) => expr`, `x => expr`, `() => expr`. An expression body is stored as one `return` with `exprBody: true`. A `{` after `=>` always opens a block. Parameters reuse the legacy parameter grammar, so `&name` and a class name still parse.
- `object` node: `{ key: value, ... }`, keys identifiers or strings, source order kept, trailing comma allowed.
- `callIndirect` node: a `(` after anything that is not a plain name or a member (`f(1)(2)`, `a[i](x)`, `((x) => x)(1)`).
- A plain name followed by `(` stays the named `call`, so `castint = 99; castint(4.75)` keeps meaning the command. Whether a variable holding a callable is called by that name is a run-time rule for 18.4.
- `.` member access already parsed; EXP-7 is covered by tests, not new code.

## Proposed ruling (pending owner review)
`obj.method(x)` where `obj` is a plain, unscoped variable still parses as the file-qualified call of MOD-2 (`obj.prg`, `method`), because the parser cannot tell a file from a variable. Proposal for 18.4: at run time, when a variable named like the file holds a dictionary or object, the member call wins; otherwise the file call applies. Rejected alternative: require `->` for dictionary calls, which defeats the dot syntax EXP-7 allows. Receivers that are not a plain name (`a.b.c()`, `this.f()`, `items[i].f()`) are already member calls.

## Acceptance
Each form parses to its node with located errors for malformed input; legacy operators and named calls are unchanged; compiling a new node is a located refusal; `pnpm test:strict` and every CI gate pass.

## Verification
`packages/core/test/script-callable-syntax.test.ts` (10 tests); full strict suite 1154/1154. Golden: six TK2 games in `golden/regression/closing.json` changed only their syntax diagnostic (G5): those files start blocks with a bare `{` on its own line, which the 3.1 parser now reads as a dictionary literal and refuses a few lines later with `expected a dictionary key`, instead of refusing at the `{` itself. No state hash or PNG changed.
