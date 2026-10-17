<!-- Reviewed fact sheet, clean-room extraction round 6 (ADR 0006). Status: reviewed prose facts, not yet folded into docs/spec/; each ruling that uses them is its own doc-first commit (G7). Source: Jensen's TK-side engineer contact, relayed 2026-10-16. Review: clean-room facts recording; no legacy source code or identifiers. -->

# Clean-room extraction, round 6 — answers

* **Source consulted (as stated by the answerer):** the original programs' logic, plus runtime knowledge of the Windows C runtime and x86. Revision not recorded. Nothing was run in a game, so no answer below is *observed*; every one is *read from the program's logic* or *runtime knowledge* unless marked *not sure*.
* **Answerer:** Jensen's TK-side engineer contact, relayed by the owner on 2026-10-16. Its transcript is not given to implementers (ADR 0006 decision 1).
* **Date:** 2026-10-16
* **Questions answered:** Q1 to Q9 (including remainder by zero), relayed by the owner.
* **Review:** clean-room review found no copied expression, no legacy code or identifiers, and confirmed confidence labels are faithfully preserved.
* Everything below is prose; no source expression is reproduced. Where a fact is runtime knowledge or inferred rather than read from logic, it is marked.

---

## Numbers and NaN

**Q1. Name-read truncation and comparisons.** *Read from the program's logic; out-of-range values and x86 behaviour are runtime knowledge.*
* **Where it applies:** reading a number from a variable by name first converts it to a 32-bit integer, dropping any fraction. Arithmetic, all comparisons, `castNum` and numeric arguments all go through this conversion.
* **Where it does not apply:** variable assignment copies the stored value unchanged; converting a variable to text uses the full stored value.
* **Out-of-range values:** NaN, +Infinity, -Infinity and any value outside the 32-bit range all convert to -2147483648. They do not convert to 0, and there is no wrap-around. On x86 this does not depend on build options in practice (*runtime knowledge*).
* **Effect on the ToInt32 ruling:** this differs from 3.1. With a variable `x` holding NaN, `x < 0` is true in 3.1 and `x + 1` produces -2147483647.
* **Remainder:** converts both operands to whole numbers, including numeric literals. A divisor between -1 and 1, such as 0.5, behaves as a remainder by zero.

**Q2. Storing and printing 0/0 (NaN and infinity).** *Read from the program's logic, plus runtime knowledge.*
* **Stored:** the engine never changes the processor's floating-point mode, so division by zero raises no error. 0/0 stores NaN, 1/0 stores infinity, and both are kept in full precision.
* **As text:** NaN resulting from 0/0 displays as `-1.#IND`; +Infinity displays as `1.#INF`; -Infinity displays as `-1.#INF`. Displaying "NaN" is therefore a Reawakened rule.
* **Comparisons and conversions:** `x == x` is true (both sides read as -2147483648). `castLit(x) == "NaN"` is false in 3.1 (the text form is `-1.#IND`). `castNum("NaN")` is 0 (the text-to-number conversion does not recognise "nan" or "inf").

**Q3. Game or plugin tests for NaN.** *Not sure.*
* None found in the material available. The only way a 3.1 script could detect NaN was to compare its text form with `-1.#IND`.

**Q4. Square root of a negative number.** *Read from the program's logic, plus runtime knowledge.*
* Returns NaN, stored in full, raises no script error, and displays as `-1.#IND` like 0/0.

**Remainder by zero (the "catchable" ruling).** *Read from the program's logic, plus runtime knowledge; whether 3.1 crashed depends on information not available.*
* Remainder by zero is a processor fault, not a script error. Built-in command failures are routed to the script's error handling, but whether a processor fault reaches error handling depends on how the shipped engine was compiled.
* **Likely outcome:** with the compiler and settings the project was set up for, the fault does not reach script error handling, and the engine crashes. An older compiler would pass it on as a catchable error. We cannot tell which compiler built the released 3.1 binaries.
* **Departure:** treating remainder by zero as catchable is reasonable for a clean rebuild, but represents a departure from the likely 3.1 behaviour.
* In addition, -2147483648 remainder -1 is also a processor fault; that is exactly what NaN remainder -1 produces.

---

## Other rulings

**Q5. Reading past end of file.** *Read from the program's logic.*
* Matches the proposal: returns an empty string, the file read position stays at the end, `fileEof` stays true, and no error is raised.

**Q6. random(max).** *Read from the program's logic, plus runtime knowledge.*
* The engine draws a number from the C runtime generator, ranging 0 to 32767, takes the remainder by `max`, and adds 1. The result never exceeds 32768. Ranges that do not divide evenly into 32768 lean slightly toward lower numbers.
* **Seed:** the system clock at start-up, so runs are not repeatable.
* **Edge cases:** `max` is truncated to a whole number first. `max` of 0 returns 1. A negative `max` gives 1 to `|max|`. A NaN `max` gives 1 to 32768.
* The proposed formula matches 3.1 if the draw also ranges 0 to 32767 and handles these edge cases the same way.

**Q7. getTickCount.** *Read from the program's logic, plus runtime knowledge.*
* It is the Windows system uptime counter in milliseconds since the computer started, not since the game started. It wraps after approximately 49.7 days, in steps of about 10 to 16 ms. It is suitable for intervals (which is how scripts use it); its absolute value differs from 3.1.

**Q8. FBranch command semantics.** *Read from the program's logic.*
* `FBranch` is exactly the same command as `Branch`: it jumps to the label and never returns to the caller. A model in which `FBranch` returns is wrong.

**Q9. Blocking commands freezing the program (R-32).** *Read from the program's logic; not observed in a running game.*
* Yes, a blocking command stops everything. `Delay` puts the whole program to sleep: nothing runs and the window does not repaint. `Wait` and `Prompt` keep the window responsive while waiting for input, but run no scripts, no movement, and no frame updates until they finish.

---

## What remains unverified

* **Observed behaviour in running games:** Nothing in this extraction round was observed in a running game.
* **Remainder by zero processor fault vs catchable error:** Remainder by zero (and NaN remainder -1, which evaluates to -2147483648 % -1) is a processor fault rather than a script error; whether the fault reached script error handling in released 3.1 depends on compiler flags and build settings, which are not known.
* **NaN tests in the game corpus:** Whether any game or plugin tested for NaN or defined a NaN-style function name remains unverified (*not sure*; none found in the available material).
* **getTickCount baseline:** Because `getTickCount` is the host Windows system uptime counter in milliseconds, its starting value at game startup depends entirely on host uptime and cannot be verified to any fixed game-relative baseline.
* **PRNG sequences:** `random(max)` is seeded from the system clock at startup, so its sequences are not repeatable across runs in the original engine.
