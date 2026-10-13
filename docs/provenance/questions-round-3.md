# Clean-room extraction, round 3 — class inheritance, access labels, destructor chaining and modulo by zero

* **Status:** approved by the owner in conversation 2026-10-12 (Jensen: take the semantic rulings and hand any research in the legacy code to subagents); this file is the wording.
* **Date:** 2026-10-12
* **Process:** [ADR 0006](../adr/0006-clean-room-spec-extraction.md) decision 2. An extractor reads the legacy source **only** to answer these questions and writes prose facts to a staging file; a separate reviewer checks the staging file for copied expression before anything enters `docs/`.
* **Scope rule:** only the rows that round 2 ([facts-round-2.md](facts-round-2.md)) and the sample corpus left open: OOP-5 (handle reuse, destructor chaining), OOP-8, OOP-9 and the ERR-2 modulo case. Every other open row of the RPGCode ambiguity list is already settled by round 2 or is our own ruling.
* **Legacy source:** not read to write this list. The archive and the corpus hold no derived class and no `release()` call, so these rules matter for completeness, not for any known game.

Question ids are `R3-Q<n>`. "Wanted output form" is the shape the prose answer must take.

## R3-Q1 — Base classes, base construction and access labels

**Question.** When a class declares more than one base class:
1. In what order are the bases initialised and their constructors run, relative to the derived class's own constructor?
2. Is there a way for a derived method to call the base version of the method it overrides, and how is a call resolved when several bases define the same method name?
3. What is the default access of a member with no access label, and does `protected` restrict anything differently from `public` or `private` at run time?

**Why the archive could not answer it.** Section 9.7 describes inheritance and access labels in prose only; the corpus has no derived class and only single `public:` and `private:` labels.

**Wanted output form.** One rule sentence for base order, one for override and base calls, one for default access and `protected`.

**Consumed by.** epic-rpgcode-vm entry 6 (OOP-8, OOP-9).

---

## R3-Q2 — Destructor chaining and handle reuse

**Question.** When `release()` runs the destructor of an instance of a derived class:
1. Are the base classes' destructors run too, and in which order (derived first or base first)?
2. When an object is released, can its handle number be given to a later object?

**Why the archive could not answer it.** Round 2 (R2-Q17) established which events run a destructor but not chaining or reuse.

**Wanted output form.** One rule sentence for destructor chaining, one for handle reuse.

**Consumed by.** epic-rpgcode-vm entry 6 (OOP-5).

---

## R3-Q3 — Modulo by zero

**Question.** When an integer modulo has a zero right-hand side, does the interpreter report a catchable runtime error, quietly produce a value (say which), or fail in a way that ends the program or the process?

**Why the archive could not answer it.** R2-Q11 left it open as dependent on the platform.

**Wanted output form.** One rule sentence naming the outcome and, if a value, which.

**Consumed by.** epic-rpgcode-vm entries 5 and 7 (ERR-2).
