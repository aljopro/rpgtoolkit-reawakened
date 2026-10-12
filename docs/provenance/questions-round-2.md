# Clean-room extraction, round 2 — RPGCode runtime behaviour and plugin dispatch

* **Status:** for owner approval. Scope approved in conversation 2026-10-12 (Jensen: "get them all lined up, and have it ask the questions"); this file is the wording.
* **Date:** 2026-10-12
* **Process:** [ADR 0006](../adr/0006-clean-room-spec-extraction.md) decision 2. An extractor reads the legacy source **only** to answer these questions and writes prose facts to a staging file; a separate reviewer checks the staging file for copied expression; only reviewed text lands in `docs/`, in its own commit, with a row in `extraction-log.md`.
* **Scope rule:** only questions the archive evidence and the sample corpus could not answer. Syntax-only rows (STX, most of LEX) are left to the corpus or to design rulings.
* **Round 1:** the TK2 formats and plugin-order list is [questions-round-1.md](questions-round-1.md) (Q1 to Q13); this round does not repeat it. Its Q9, Q12 and Q13 already cover name precedence, overriding a built-in and plugin dispatch order.
* **Legacy source:** not read to write this list. No extraction was run for it.

Question ids are `R2-Q<n>`. "Wanted output form" is the shape the prose answer must take.


## R2-Q1 — A command name that no built-in, script function or plugin claims

**Question.** When RPGCode meets a call whose name is not a built-in, not a function or `#Method` defined in the program or its includes, and not claimed by any loaded plugin (or no plugin is loaded), what does the interpreter do? State whether the program stops, a message is shown or logged (and where), or the call is skipped without a trace, and whether top level and inside a function differ.

**Why the archive could not answer it.** `docs/format-spec.md` §9.11 closes with "offered to RPGCode plugins" and E-99 says plugins "were offered every unknown function call"; neither says what happens when nobody takes it. The corpus holds 39 unmapped TK2 command names (473 uses) whose plugin is absent.

**Wanted output form.** One rule sentence for the outcome and one for whether top level and function context differ.

**Consumed by.** epic-rpgcode-vm entries 21, 22 and 7.

---

## R2-Q2 — The value of an unclaimed call used inside an expression

**Question.** When that unclaimed call appears inside an expression or on the right of an assignment (`x = unknownThing(1)`, `if (unknownThing() == 0)`), what value does it contribute (void, the number 0, the empty string, an error)? Does assigning from it create the variable?

**Why the archive could not answer it.** Same gap as R2-Q1; the docs do not say what the interpreter substitutes when there is no result.

**Wanted output form.** A one-line table: context (statement, assignment, condition) to resulting value and type.

**Consumed by.** epic-rpgcode-vm entries 21 and 22.

---

## R2-Q3 — Can an error handler observe an unclaimed call?

**Question.** Is the unclaimed-call case a runtime error that `onError` and `resumeNext` can intercept, or does it bypass them? If catchable, what does `resumeNext` do next, and are the failing name or line available to the script?

**Why the archive could not answer it.** §9.8 leaves the catchable error classes open (ERR-1, ERR-2) and no sample game triggers it.

**Wanted output form.** One sentence for catchable or not, one for the resume behaviour.

**Consumed by.** epic-rpgcode-vm entry 7.

---

## R2-Q4 — A plugin that claims a name and then fails or returns nothing

**Question.** When a plugin's query says it handles a name and its execute step then fails, returns no value, or returns a void value, what does the interpreter do (stop, skip, treat as the number 0 or empty string), and is the name offered to later plugins afterwards?

**Why the archive could not answer it.** The SDK declares the return types (void, number, literal) but not how the interpreter consumed a void or a failure.

**Wanted output form.** A rule sentence per case: failure, void, number, string.

**Consumed by.** epic-rpgcode-vm entries 22 and 24.

---

## R2-Q5 — Do TK2 `#command` lines take the same path for an unknown name?

**Question.** For a TK2 program, does an unknown `#Name(...)` line follow the same outcome as R2-Q1 to R2-Q3, or does a different rule apply (a leading `#` being ignored, or the line being treated as loose dialogue)?

**Why the archive could not answer it.** §9.2 says a leading `#` is ignored and §9.9 describes bare lines as dialogue; neither says what an unknown `#Name(...)` becomes.

**Wanted output form.** One rule sentence, with the dialogue-versus-error outcome stated.

**Consumed by.** epic-rpgcode-vm entries 1 and 15.

---

## R2-Q6 — Plugin callbacks into the interpreter: nested or queued?

**Question.** When a plugin calls back into the interpreter to run a line of RPGCode while its own command is executing, does that line run immediately, nested inside the plugin call, or is it queued until the plugin returns? If nested, may it call the same plugin again, and what happens to the calling thread's position?

**Why the archive could not answer it.** The SDK names the callback but not its re-entrancy; no plugin binary was executed.

**Wanted output form.** A rule sentence for nested versus queued and one for recursion.

**Consumed by.** epic-rpgcode-vm entry 24 (how faithfully native packs port callback-using plugins).

---

## R2-Q7 — Does a plugin call block the whole interpreter and engine?

**Question.** While a plugin command is executing, does the interpreter and game loop (rendering, movement, other script threads) wait for it to return, or can they continue? Is there any time limit on a plugin call?

**Why the archive could not answer it.** The docs describe plugins as synchronous function calls but do not say what else stops.

**Wanted output form.** One rule sentence: what is frozen during a plugin call, and any limit.

**Consumed by.** ADR 0004 decision 7 (frozen versus per-thread waits) and entry 9.

---

## R2-Q8 — What a plugin's return value becomes

**Question.** A plugin command returns a void, number or string value. In a statement, an assignment and a condition, what does each become, and is a returned string ever parsed as RPGCode?

**Why the archive could not answer it.** `CReturnValue` is declared in the SDK; its consumption is not described.

**Wanted output form.** A table: return type to behaviour per context.

**Consumed by.** epic-rpgcode-vm entries 22 and 24.

---

## R2-Q9 — File plugin paths: base folder and absolute paths

**Question.** For file-reading and file-writing script commands and the file plugin (`filereadwrite`), which folder do relative paths resolve against, are absolute paths or `..` accepted, and which folders may be written?

**Why the archive could not answer it.** E-97 says "inside the game's folders" without naming the base; the plugin binary was not executed.

**Wanted output form.** A rule sentence for the base folder, escape handling and the writable set.

**Consumed by.** epic-rpgcode-vm entry 16 and AD-17 blob areas.

---

## R2-Q10 — Handler scope and resume (ERR-1)

**Question.** For `onError`/`setErrorHandler`: does a handler set at program top level work, or only inside functions? Are its labels resolved in the function or the program? Does `resumeNext` resume after the failing statement, and is any half-evaluated expression state dropped? Does a handler also see errors raised inside nested built-ins or called functions?

**Why the archive could not answer it.** §9.8 says only that handlers work inside functions. (ambiguity row ERR-1 in the language-readiness discovery)

**Wanted output form.** One rule sentence per sub-question.

**Consumed by.** epic-rpgcode-vm entry 7.

---

## R2-Q11 — Which failures are errors, and which are catchable (ERR-2)

**Question.** List the failure classes the interpreter treats as runtime errors (unknown function, wrong argument count, type mismatch, array bound, division by zero, built-in failure) and, for each, whether it stops the program, is reported, or is silently tolerated, and whether a handler can catch it.

**Why the archive could not answer it.** §9.8 does not enumerate error classes. (ambiguity row ERR-2 in the language-readiness discovery)

**Wanted output form.** A table: failure class to outcome and catchable.

**Consumed by.** epic-rpgcode-vm entry 7.

---

## R2-Q12 — Comparison and coercion (SEM-3)

**Question.** State: whether `==` and `~=` on strings are case-sensitive; how a number compares with a string; the result of dividing by zero; integer overflow behaviour; and the exact conversions of `castLit`, `castNum` and `castInt`.

**Why the archive could not answer it.** §9.3 does not give a coercion table; the corpus compares strings only against upper-case words. (ambiguity row SEM-3 in the language-readiness discovery)

**Wanted output form.** A coercion table with one worked value per row.

**Consumed by.** epic-rpgcode-vm entries 5 and 12.

---

## R2-Q13 — Variable scope (SEM-4)

**Question.** State where a `local(x)` variable is visible (to the end of the function, the block, or the program), and what `autoLocal(true)` does at program level. Are a program's variables visible to its own functions, to a program started with `run()`, and to included files?

**Why the archive could not answer it.** §9.3 does not define visibility; the sample functions use no outer variable. (ambiguity row SEM-4 in the language-readiness discovery)

**Wanted output form.** A visibility table: declaration form to who can see it.

**Consumed by.** epic-rpgcode-vm entries 5 and 8.

---

## R2-Q14 — Unset variables and array defaults (SEM-5)

**Question.** What does reading an unset variable give (the empty string, the number 0, or something that behaves as both), and what type is it for `~=` and `+`? Do unset array elements default independently?

**Why the archive could not answer it.** §9.3 and §9.10 only say reads give ""/0. (ambiguity row SEM-5 in the language-readiness discovery)

**Wanted output form.** One rule sentence for scalars and one for array elements.

**Consumed by.** epic-rpgcode-vm entries 5 and 12.

---

## R2-Q15 — By-reference output parameters (SEM-6)

**Question.** For built-ins that write values back to the caller's variables (location getters and similar), is the write-back made all at once or one variable at a time, and what happens if a variable named as an output does not exist yet? List the built-ins that take output parameters.

**Why the archive could not answer it.** §9.11 gives a prose rule "most getters" only; three corpus sites use three trailing outputs. (ambiguity row SEM-6 in the language-readiness discovery)

**Wanted output form.** A rule sentence plus a list of built-in names with their output parameter positions.

**Consumed by.** epic-rpgcode-vm entries 3 and 21.

---

## R2-Q16 — Assignment between objects (OOP-4)

**Question.** When one object variable is assigned to another, when is a new handle stored and when is `operator=` or a copy constructor called? Is the copy shallow or deep?

**Why the archive could not answer it.** §9.7 says both "copies by calling `operator=`" and "objects are reference handles". (ambiguity row OOP-4 in the language-readiness discovery)

**Wanted output form.** A rule sentence per case.

**Consumed by.** epic-rpgcode-vm entry 6.

---

## R2-Q17 — Destructors and memory (OOP-5)

**Question.** When does a class destructor run: only on `release()`, on `kill(obj)`, at program end, or never? When is an object's memory freed?

**Why the archive could not answer it.** §9.7 says objects are not garbage-collected; no corpus call to `release()`. (ambiguity row OOP-5 in the language-readiness discovery)

**Wanted output form.** One rule sentence per trigger.

**Consumed by.** epic-rpgcode-vm entry 6.

---

## R2-Q18 — Member lookup order (OOP-6)

**Question.** Inside a method, in what order is an unqualified name looked up (local, member field, member method, global function, built-in)? Does `this->x` have to be written?

**Why the archive could not answer it.** §9.7 does not define the order; needed for AD-8 lookup precedence. (ambiguity row OOP-6 in the language-readiness discovery)

**Wanted output form.** An ordered list.

**Consumed by.** epic-rpgcode-vm entries 3 and 6.

---

## R2-Q19 — Operator dispatch (OOP-7)

**Question.** Which operator methods exist and are dispatched (`operator=`, `[]`, `$`, `!`, `()`, `->`, unary versus binary), how unary and binary forms are told apart, and which operators the interpreter consults for `a[i] = v`.

**Why the archive could not answer it.** §9.7 lists them without dispatch rules; the corpus uses only `=` and `[]`. (ambiguity row OOP-7 in the language-readiness discovery)

**Wanted output form.** A table: syntax form to the operator method called.

**Consumed by.** epic-rpgcode-vm entry 6.

---

## R2-Q20 — What `end()` unwinds (FUN-7)

**Question.** When `end()` is called inside a function that lives in an included file, or inside a program started with `run()`, does it end only the current program, all nested programs, or the whole game script? What happens to the callers?

**Why the archive could not answer it.** §9.5 is silent; the corpus calls `end()` five times in simple blocks only. (ambiguity row FUN-7 in the language-readiness discovery)

**Wanted output form.** One rule sentence.

**Consumed by.** epic-rpgcode-vm entry 13.

---

## R2-Q21 — Includes (MOD-2)

**Question.** For `#include`: which folder is the path relative to, what happens with an already-included file or a cycle, may an include appear inside a function, what does including an empty file do, and how does the implicit `file.func(args)` form resolve?

**Why the archive could not answer it.** §9.6 does not define these; the corpus has one plain include. (ambiguity row MOD-2 in the language-readiness discovery)

**Wanted output form.** A rule sentence per case.

**Consumed by.** epic-rpgcode-vm entry 8.

---

## R2-Q22 — Redirects (MOD-3)

**Question.** How do `redirect` and `killRedirect` behave: where is the mapping kept, can a name be redirected to a built-in, can redirects chain, and when does a redirect stop applying?

**Why the archive could not answer it.** §9.6 mentions them only; the corpus has no use. (ambiguity row MOD-3 in the language-readiness discovery)

**Wanted output form.** A rule sentence per case.

**Consumed by.** epic-rpgcode-vm entry 8.

---

## R2-Q23 — Thread sleep units and wake order (THR-1)

**Question.** For `threadSleep` and `threadWake`: what is the unit of the sleep argument, what value means sleep until woken, and when several threads wake in the same step, in what order do they run?

**Why the archive could not answer it.** E-93 names the commands but not units; one corpus use. (ambiguity row THR-1 in the language-readiness discovery)

**Wanted output form.** One rule sentence per sub-question.

**Consumed by.** epic-rpgcode-vm entry 9.

---

## R2-Q24 — Source and target per thread (THR-2)

**Question.** Are the `"source"` and `"target"` handles saved per thread, per call frame, or globally? What does `tellThread` code see, and what happens to them across a `run()`?

**Why the archive could not answer it.** E-93 and E-95 do not say where the handles live. (ambiguity row THR-2 in the language-readiness discovery)

**Wanted output form.** One rule sentence.

**Consumed by.** epic-rpgcode-vm entries 9 and 3.

---

## R2-Q25 — When engine and board constants are substituted (LEX-7)

**Question.** Are engine and board constants substituted when a program is read and compiled, or each time the program runs? Do board constants change when the same program runs on a different board?

**Why the archive could not answer it.** §9.2 says "lex time", which would make compiled code depend on the board. (ambiguity row LEX-7 in the language-readiness discovery)

**Wanted output form.** One rule sentence.

**Consumed by.** epic-rpgcode-vm entries 5 and 8.

---

## R2-Q26 — Which names are case-insensitive (LEX-10)

**Question.** Which names are matched case-insensitively: variables, labels, class and member names, built-ins, and file names in includes? Is the case of the first-seen spelling kept anywhere?

**Why the archive could not answer it.** §9.2 says "case-insensitive" without scope; the corpus has one spelling per identifier. (ambiguity row LEX-10 in the language-readiness discovery)

**Wanted output form.** A list of name kinds with case-sensitive or not.

**Consumed by.** epic-rpgcode-vm entries 5 and 8.

---
