<!-- Reviewed fact sheet, clean-room extraction round 3 (ADR 0006). Status: reviewed prose facts, not yet folded into format-spec.md or engine-features.md; each ruling that uses them is its own doc-first commit (G7). Questions: questions-round-3.md. Legacy revision consulted: 9191b919. Review: one reviewer, PASS WITH EDITS; edits applied; a second confirming review is still pending. See extraction-log.md. -->

# Clean-room extraction, round 3 - staging answers (REVIEWED, EDITED)

* **Source consulted:** legacy RPG Toolkit checkout, revision 9191b919 (full 9191b9191c9bda0998c6faae16929b3331ed2ead). Only the 3.1-line C++ RPGCode runtime and the shipped help pages were read. The help pages covering RPGCode object-oriented coding were read first; the runtime was read only where the help is silent.
* **Date:** 2026-10-12
* **Questions answered:** R3-Q1 to R3-Q3, from `questions-round-3.md`.
* **Terminology used below:** an *object handle* is the small number that names an object. A *report* is the interpreter's error report (R2-Q1). A *call frame* is one active script-function or method call (R2-Q13).
* Everything below is prose; no source expression is reproduced. Where a fact is inferred from structure rather than visible in one place, it is marked as inferred.

---

## R3-Q1 - Base classes, base construction and access labels

### Base initialisation and constructor order

Only the constructor of the class named in the construction call is run. Base-class constructors are **not** run automatically, before or after the derived constructor; there is no separate base sub-object to initialise. Inherited state is the derived constructor's own job: it assigns the inherited members directly, and the shipped help's own example does exactly that rather than calling a base constructor.

The bases are consulted in the order they are written in the class declaration. Whether a base's own inherited members carry through to a derived class is not reliable: it appears to depend on how the class names happen to order (inferred; see "what the source does not decide").

### Overriding and calling the base version

A derived class's own definition of a method (identical name and parameter count) wins over a base's same-named method. When several bases define the same method name and parameter count, the earliest-written base wins. A call on an object looks the method up in the object's **actual** class (the class it was created as), so the most-derived definition is used; the declared or static type in an expression is not consulted. There is no way for a derived method to call the base version of the method it overrides: the language has no base-qualified call syntax. The only place a class-qualified name is allowed is when *defining* a method outside the class body; a call is always a plain name, so it resolves again to the override.

### Default access and `protected`

Within a `class` body the starting access is private; within a `struct` body it is public. A member declaration with no preceding label takes the current access. `public` and `private` labels switch the current access for the rest of the body (they take effect while the body is read). `protected` is **not implemented**: it is not a recognised word of the language; only `public` and `private` labels exist, so there is no third access level and nothing stricter than private.

Access is enforced at each access, at run time, not at load time. An access is allowed only if the member's or method's visibility is at least the visibility the access requires. An access made from outside any method, or from a method running on an object of a *different* class, requires public; an access made from a method running on an object of the *same* class may also see private. Because the comparison is between class identities, not instances, any method of class C may reach the private members of any C object. A blocked access raises an ordinary catchable runtime error.

**Confidence:** observed: constructor selection, how inherited declarations are combined (including that the earliest-written base wins a clash), the access levels and the run-time access check, and the absence of a protected label. The name-order dependence of transitive bases is inferred.

**What the source does not decide:** the loader promises no order-independent combination of transitive bases, so the exact result of a diamond or of a base sorting after its derived class is not settled; and it offers no syntax by which a base constructor could be invoked explicitly, so "how a derived class initialises base state" is left entirely to the script.

---

## R3-Q2 - Destructor chaining and handle reuse

### Destructor chaining

`release()` runs the destructor of the object's own class only, and only if that class declared one. Base-class destructors are **not** run and there is no chaining, so there is no derived-first/base-first order to report. If the object's class declared no destructor, release frees the object's member variables and its handle immediately instead of running anything.

The shipped help describes release as always freeing the object after its destructor; the runtime does that only when there is no destructor. When a destructor exists, release runs it and does not itself remove the members or the handle at that point. Nothing else ever frees a handle (R2-Q17).

**Confidence:** observed in the source: release runs only the destructor of the object's own class, and frees the object straight away only when that class has no destructor. The claim that a class *with* a destructor is not freed by release is observed; whether that is intended is not decided by the source.

### Handle reuse

Handle numbers **are** reused. A new object receives the smallest unused handle number greater than the count of objects currently holding handles. A freed number is therefore reused only when it is greater than the number of objects still holding handles. For example, with nothing holding a handle the next object is 1; with handles 1 and 2 live, freeing 2 makes 2 the next number, but freeing 1 makes 3 the next number. An object whose class declared a destructor keeps its handle after release, and objects with destructors that were never released still count toward the threshold.

**Confidence:** observed in the source (both the allocation rule and that the only removal of a handle is the no-destructor release path).

**What the source does not decide:** whether the not-freed-object outcome for a class with a destructor is intended, and the exact set of numbers reused in a given run (it follows from the live count at the time), are not decided by the source.

---

## R3-Q3 - Modulo by zero

Both `%` and `%=` convert each operand to a 32-bit signed integer (double-to-integer truncation toward zero) and then take the integer remainder. Neither checks for a zero divisor.

A zero right-hand side is therefore an integer divide-by-zero fault at the processor. The interpreter converts only its own error kinds into a report, so a fault raised outside those kinds is not converted into a catchable script error. **Inferred:** the fault is not handled, so the process ends abnormally (the program dies). It is observed that no value is produced and no check exists. R2-Q11 is narrowed to "not a catchable error, no value (inferred)".

**Confidence:** the integer conversion and the absence of a zero check are observed in the source; the process-ends-abnormally outcome is inferred, because it depends on the build's exception model - the interpreter does not translate operating-system faults into its error path.

**What the source does not decide:** the exact visible form of the failure (an operating-system error dialog versus an immediate exit) belongs to the host and the operating system, not to the interpreter; a differently-built host that translates operating-system faults could turn it into a report. The remainder's value cannot exist, so nothing is decided about one.
