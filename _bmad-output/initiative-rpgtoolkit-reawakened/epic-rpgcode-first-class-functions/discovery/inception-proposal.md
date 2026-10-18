---
type: discovery
title: "Inception proposal: epic-rpgcode-first-class-functions (epic 18)"
date: 2026-10-18
baseline_revision: f212728587894ad87ae94de67ae14e31cb444a36
---

# Inception proposal: first-class functions and pure-RPGCode plugin architecture

## 1. Scope restatement

Epic 18 extends the RPGCode 3.1 step-machine VM and compiler to support first-class function values (`FunctionValue` in `Value`), the address-of operator for callables (`&func`, `&Builtin`), dynamic invocation syntax (`fn(args)`), and global symbol reassignment for intercepting and wrapping engine commands. It unifies the 4-tier resolution pipeline into an environment table with transparent fallback to built-ins, enabling modular middleware plugins written in pure RPGCode.

## 2. Decision matrix

| ID | Question | Proposal | Status |
|---|---|---|---|
| D-01 | Value shape for function handles | **PROPOSE:** Plain JSON handle `{ kind: "function", id: number, name: string }` stored in the VM function table, preserving G1. | Proposed (HITL in 18.1) |
| D-02 | Address-of operator syntax | **PROPOSE:** `&identifier` returns the callable handle. | Proposed (HITL in 18.1) |
| D-03 | Dynamic invocation syntax | **PROPOSE:** Standard call syntax: if `f` evaluates to a function handle, `f(x, y)` invokes that handle. | Proposed (HITL in 18.1) |
| D-04 | Reassignment / Overriding | **PROPOSE:** Assigning to a global symbol (`mediaPlay = myHook`) updates the active binding for that name in the global environment table. | Proposed (HITL in 18.1) |
| D-05 | Redirects compatibility | **PROPOSE:** `#redirect(old, new)` lowers to a global assignment `old = &new`, retaining full backward compatibility. | Proposed (HITL in 18.1) |
| D-06 | Legacy 3.1 arity overloading | **PROPOSE:** Function handles retain their arity range; calling a handle with wrong arity throws `arity.mismatch`. | Proposed (HITL in 18.1) |

## 3. Breakdown

| # | Title | after | Risk | Lane | Check |
|---|---|---|---|---|---|
| 1 | Rulings: Function handles, address-of syntax, invocation, and environment table | 3.3, 3.27 | high | docs (HITL) | Specification and ADR amendments for first-class function handles and environment table |
| 2 | Parser & AST support for function references and anonymous methods | 1 | medium | compiler | AST nodes for `&name`, anonymous methods, and parser tests |
| 3 | Lowering and IR bytecode instructions for dynamic invocation | 2 | medium | compiler | New step IR opcodes `call_indirect` and `load_fn` |
| 4 | VM runtime execution of dynamic function handles and step budget | 3 | high | VM | Step machine executes indirect calls deterministically within budget |
| 5 | Unified environment table and global symbol reassignment | 1, 4 | high | VM | Built-ins and user functions share environment; global reassignment works cleanly |
| 6 | Serialization, snapshot, and save/restore of function handles | 5, 3.11 | high | persistence | Function handles serialize to plain JSON and restore bit-identically across snapshots |
| 7 | Pure-RPGCode middleware plugin fixtures and legacy golden verification | 6 | high | integration | Middleware chaining demonstrated in pure `.prg`; zero regressions in legacy goldens |
