# RPGCode: modules and objects

Two related areas of the language, each with rules the VM needs fixed because a restored snapshot must resolve every call and every member the same way the original run did:

- **Modules** — what a program's other files contribute to it: includes, redirection, and the order in which two definitions of the same name are chosen.
- **Objects** — classes, their members and methods, how an object is created, looked up, dispatched, inherited and freed.

The language itself is in [rpgcode-language.md](rpgcode-language.md); error handling in [errors and threads](rpgcode-errors-and-threads.md).

**How to read this page.** A plain paragraph says what Toolkit 3.1 does. A block opening with the words **Reawakened rule** is a deliberate addition or difference of this project ([ADR 0007](../../adr/0007-docs-spec-is-the-normative-specification.md), decision 2); where it is a departure from 3.1 it says so.

## Modules

A module rule decides what a program's other files contribute to it.

### Includes

* `#include "file.prg"` or `include("file.prg")`. Only functions and classes are imported; loose top-level code in an included file does not run. The include root is `Prg/` under the project folder, and a name with no path separator resolves there. — legacy behaviour (R2-Q21). **Reawakened rule:** resolution and matching go through the asset resolver, so the `Prg/` root, its subfolders and the ASCII-only fold are the one path rule the readers and the scripts share; the legacy reader used the name exactly as written.
* **Implicit include (MOD-2).** `file.func(args)` queues `Prg/file.prg` for inclusion while the program is loaded, and only then is `func` a name to call. — legacy behaviour (R2-Q21); it corrects the earlier "on first use" reading.
* **A `file.`-qualified call binds to that file (MOD-2). Reawakened rule — a departure from 3.1.** The compiled call site records the file. At run time the file is queued for inclusion and `func` is resolved among that file's own definitions first; only when the file defines no such name does the ordinary order apply (a built-in before a script function). This departs from legacy, which dropped the file part and then let a built-in win (R2-Q21). The compiled call stores the folded file name, so a restore reproduces the binding.
* **Hoisting and include position.** Definitions are hoisted within their file, so a function may be called earlier in that file than its definition. A literal `#include` is collected wherever it appears in the file — even inside a function or a branch that never runs — and applied when that file's parse ends, so a call written before the `#include` line still resolves once the file is loaded. — legacy behaviour (R2-Q21). A computed `include(expr)` runs at run time, and its file's definitions are available from that point on.
* **One flat list of script functions (MOD-1) — Reawakened rule, a deliberate departure from 3.1.** `#include`, an implicit `file.func` call, and the first run of a file each add that file's functions to a single flat list of script-function names at that moment. When two entries in that list share a name and parameter count, the **last one added wins**. A `file.`-qualified call bypasses the flat list and reaches that file's own definition. Every override raises a warning naming the old and the new definition. This is the owner's last-wins rule (R-41) kept on purpose: legacy kept the *first* definition and silently skipped a later one of the same name and parameter count (R2-Q21, R1-Q9), and the divergence is recorded here so a later fidelity review can reverse it. <!-- OWNER: MOD-1 / entry 3.8 — alternatives: adopt the legacy first-wins ordering (silent skip) or keep the owner's last-wins ordering with a warning (decided). The unqualified-after-include question is answered below: an include merges the file into the program, so the unqualified name is reachable once the include has been read. -->

### Includes: repeats, cycles, missing files and visibility

Ruled by entry 3.8, doc-first:

* An included file is merged into the including program, so its functions and classes become part of that program and an unqualified name in it is reachable once the program is loaded. — legacy behaviour (R2-Q21).
* The same include name is added once; a repeated include does not add its definitions a second time. — legacy behaviour (R2-Q21, which matched the exact text at load time). **Reawakened rule:** matching is on the folded path, at load and at run time alike, so one file included under two spellings is still one file.
* An include inside a function is allowed but has no scoping effect: it is a program-wide include. — legacy behaviour (R2-Q21).
* A missing file is ignored silently at load time; an empty file imports nothing and is not an error; `include()` of a missing file at run time raises a runtime error. — legacy behaviour (R2-Q21).
* An include cycle is not guarded in legacy: each included file is parsed afresh and cached only after its own parse finishes, so A including B including A recursed without end. — legacy behaviour (R2-Q21, inferred). **Reawakened rule:** an include whose file is already being parsed is treated as already included and reported as a cycle diagnostic, so parsing always terminates; a rebuild must not hang or crash on a cycle.
* **Reawakened rule — where a run-time include list lives (MOD-3):** the ordered list of files a program has included at run time is part of that program's compiled record, and the program's source hash covers its main text plus that list, so a restore rebuilds the same include set before any call resolves. (The compiled record is rebuilt from the program reference on restore; that reference needs a field for the list — see the open questions in [rpgcode-language.md](rpgcode-language.md).)

### Redirects

* `redirect("oldName", "newName")` remaps a function name globally, including built-ins. `killRedirect("name")` and `killAllRedirects()` undo it. The legacy `#`-prefixed operands and an implicit `file.method` target (`#redirect(#a, #b.c)`) are dialect forms ([rpgcode-dialects.md](rpgcode-dialects.md)).
* There is one redirect table for the whole run. — legacy behaviour (R2-Q22); **Reawakened rule:** the VM holds it as its `redirects` state section, so it travels in a saved game and a snapshot restores it.
* `redirect`, `killRedirect` and `killAllRedirects` take effect when source text is parsed, in textual order, and only on text parsed after them; a program already compiled keeps its old bindings. — legacy behaviour (R2-Q22). **Reawakened rule — a restore stays faithful:** the redirect table in force when a program is compiled is recorded in that program's compiled record and folded into its cache key, so recompiling after a restore uses the same table; if the current table no longer matches, the program is recompiled and the state-restore mismatch policy restarts the thread from source.
* A target may be a built-in name; after substitution the name is looked up like any other call name. — legacy behaviour (R2-Q22).
* There is no chaining: one substitution is made, so with a→b and b→c the name a becomes b only. — legacy behaviour (R2-Q22).
* A target of the form `file.func` also queues that file for inclusion. — legacy behaviour (R2-Q22).
* A redirect stops applying only through `killRedirect`/`killAllRedirects` or by loading a saved game, never because a program ended. It applies to call syntax only. — legacy behaviour (R2-Q22).
* **Reawakened rule:** redirect names fold like every other name (the ASCII fold), so a redirect and the call it matches agree on every runner.

**References.** R2-Q21, R2-Q22, R1-Q9 (`docs/provenance/facts-round-2.md`, `docs/provenance/facts-round-1.md`); §1.5 (paths and the ASCII fold) in `docs/spec/`; the pre-compiled refusal in [../formats/rpgcode-program.md](../formats/rpgcode-program.md); AD-5 and AD-7 (`redirects` state section), AD-17 (host boundary) in the architecture spine.

### The `system.` namespace (PRG-1)

The engine exposes its own namespace through the same dot syntax: `system.pause` (used by many Toolkit 2.x games) resolves to the engine's `pause`, not to a file. A game may also ship a `system.prg` library; it is an ordinary library file reached only by `#include` or an implicit call. <!-- OWNER: PRG-1 — alternatives: (a) load `system.prg` automatically at boot, as a shared library; (b) treat it as an ordinary library reached only by `#include` or an implicit call (decided). The demo copy is referenced by nothing, so (a) would invent behaviour the corpus does not show. -->

## Objects

```
class CName : CBase, COther {          // "struct" = class with public default
public:
    method CName(a, b) { m_field = a; } // constructor with its body in the class
    method ~CName() { clean(); }        // destructor
    method operator+(rhs)              // any operator except -> and .
    method operator[](i)
    method operator=(rhs)              // replacement for the plain handle store
    method operator$()                 // declared conversion operator; never consulted
    method virtualThing() = 0          // pure virtual (class becomes abstract)
private:
    var m_field                        // "var" declares a member inside a class
    var m_data[]                       // empty brackets declare a growable member array
    m_array[10]                        // fixed-size member array
}
method CName::CName(a, b) { m_field = a; }   // an out-of-class body is also accepted
obj = CName(1, 2);  obj->method();  obj->release();   // release() runs destructor and frees
```

Terms used below: a **class** is a set of members and methods; an **object** is a live instance named by a small number, its **handle**; a **member** is a stored field and a **method** is a callable definition; a **base** is a class another class inherits from; **dispatch** is choosing which method definition a call runs.

### Syntax (OOP-1, OOP-2, OOP-3)

* **A method body may be written inside the class** (the form used throughout the sample corpus) or as a body-less prototype in the class with a separate `method CName::CName(…)` definition outside; the two forms may be mixed. — legacy behaviour (R2-Q16 to R2-Q19). **OOP-1** covers the class, method and member declarations; **OOP-2** covers the two method-body forms, constructors, destructors and operator methods; **OOP-3** covers `this`, object values and `->` access. The §9.12 ruling groups OOP-1 to OOP-9 with entry 3.6's class-and-object rules.
* `var name` declares a member field; `var name[]`, with empty brackets, declares a member array that grows as it is assigned. `m_array[10]` declares one with an initial size.
* `this` names the current object inside a method; it is an ordinary object value that may be used and indexed, and `this[i] = …` reaches the object's `operator[]` like any other indexed assignment.

### Assignment between objects (OOP-4)

* An ordinary assignment stores the right-hand value, including its object handle and type, into the left-hand variable; afterwards both variables name the same object and no member is copied. — legacy behaviour (R2-Q16).
* If the left-hand variable currently holds an object whose class defines `operator=` taking one parameter, that method runs instead, with the left object as `this` and the right value as its argument, and the plain store does not happen; a class with no such method stores the handle silently. — legacy behaviour (R2-Q16).
* There is no copy constructor: a one-parameter constructor runs only when an object is built by name (`Cls(a)`), never as part of an assignment. Assigning a fresh construction to a variable that is unset or holds a non-object is a plain handle store. — legacy behaviour (R2-Q16). The earlier "copy constructor" wording is dropped, since neither the corpus nor the reading logic has one.

### Object lifetime (OOP-5)

* `release()` runs the destructor of the object's **own** class, and only if that class declared one; base-class destructors never run and there is no chaining. — legacy behaviour (R3-Q2, R2-Q17).
* **Reawakened rule — free after the destructor.** When the destructor returns (or at once, when the class has none), the object's members and its handle are freed. Legacy freed an object only when its class had no destructor, and otherwise left it alive; freeing it keeps state bounded, keeps snapshots small, and makes the handle table the whole of the object state.
* `kill(obj)` removes the variable name only: it runs no destructor and frees nothing at that moment. — legacy behaviour (R2-Q17).
* **Reawakened rule — unreferenced objects (R-34).** When no global, frame local, operand or member of another object names an object's handle, that object is freed at the end of the tick in which it became unreferenced, in a fixed order, and no destructor runs. Two objects that name each other are never freed. *Legacy facts:* 3.1 kept members as global variables named `<handle>::<member>`, used a background collector that woke every ten minutes, and never ran destructors (R2-Q17); a deterministic per-tick pass replaces the timer because a wall clock cannot be snapshotted, and the format spec previously said objects were never collected.
* At program end (`end()`, or falling off the program's end) the program's frames are dropped and its objects are freed by the same pass; no destructor runs. — legacy behaviour (R2-Q17).
* **Reawakened rule — handle numbers.** A new object takes the smallest number that is not in the handle table and is greater than the table's size. With an empty table that is 1; with handle 1 live and handle 2 free, the next is 2; with handle 1 free and handle 2 live, the next is 3. The numbering rule is legacy behaviour (R3-Q2); the Reawakened part is that it needs nothing but the current handle table, because our always-free `release` keeps every freed handle out of it, so a restore allocates the same next number.

### Where a name resolves (OOP-6)

* Inside a method, a variable name is looked up in this order, first match wins: an explicit `:name` global; a parameter; a member field of the current object's class (its own and inherited, any visibility); then a frame local or, failing that, the global of that name. — legacy behaviour (R2-Q18).
* An unqualified call `f(...)` resolves in this order: a built-in; inside a method, a method of the current object's class with that name and parameter count (an implicit `this` call); a script function of the program or its includes; a plugin that claims the name; otherwise the unknown-call error. — legacy behaviour (R2-Q18). (A `file.`-qualified call is the one exception and reaches that file's own definitions first; see the module rules above.)
* The compile-time binding of a built-in also decides this order: a script method named like a built-in is never called at a compile-bound call site (R-35), and a definition that shadows a built-in raises a warning. The rule is stated in [rpgcode-functions.md](rpgcode-functions.md).
* `this` is available inside a method as an ordinary local named `this`, and `this->x` need not be written. — legacy behaviour (R2-Q18).
* Reaching a non-public member or method from outside its class is an error; the access levels are under OOP-9. — legacy behaviour (R2-Q18).

### Operator dispatch (OOP-7)

* The first operand decides: when it is an object, the interpreter looks in that object's class for `operator` plus the operator's symbol, taking exactly one parameter for a binary operator and none for a unary one; only the left operand is consulted, and the parameter count tells a unary form from a binary one. A missing method is a runtime error except where a rule below gives a fallback. — legacy behaviour (R2-Q19).
* `a == b` and `a ~= b` use `operator==` and `operator~=`, and fall back to comparing the handles when the method is missing. `a = b` uses `operator=`, else a plain handle store. `a[i]` uses `operator[]`, else a plain element variable. A compound assignment (`+=` and the rest) calls its own method (`operator+=`) and does not fall back to the plain binary method. — legacy behaviour (R2-Q19).
* `a[i] = v`: `operator[]` is consulted first on `a`; when it returns a reference, the store goes through that reference and `operator=` runs only if the referenced variable currently holds an object, and otherwise the value is stored directly. — legacy behaviour (R2-Q19).
* `->`, the ternary, call-style `()` and any string-or-number conversion operator are never dispatched; a `$` or `!` after a name is a sigil (the `operator$` and `operator!` declarations are never consulted for a conversion). — legacy behaviour (R2-Q19).

### Inheritance and construction (OOP-8)

* Only the constructor of the class named in the construction call runs; a base constructor never runs before or after it, and there is no base sub-object, so a derived constructor assigns inherited members itself. — legacy behaviour (R3-Q1).
* A derived class's own method (same name and parameter count) beats a base's; when several bases define the same name and parameter count, the earliest-written base wins. — legacy behaviour (R3-Q1).
* A call on an object uses the object's **actual** class, not the declared type of the expression. There is no syntax to call a method's base version; a call is a plain name and resolves to the override. — legacy behaviour (R3-Q1).
* **Reawakened rule — the transitive order.** A class's methods and members are its own definitions plus those of its ancestor classes. The ancestors are collected by a walk that takes each base list in declaration order and uses a class only the first time it is met; the class's own definition wins, and between two ancestor definitions of the same name the one met first in that walk wins. This is deterministic and independent of class names, replacing the legacy order that depended on how the class names happened to sort (R3-Q1, inferred for the transitive case).
* A method declared `= 0` is pure virtual and makes its class abstract. — legacy behaviour (R3-Q1). **Reawakened rule:** constructing an abstract class is a catchable runtime error of the invalid-object class in the failure table in [errors and threads](rpgcode-errors-and-threads.md).

### Access labels (OOP-9)

* A `class` body starts `private`; a `struct` body starts `public`; a member with no label takes the current access; the `public` and `private` labels switch it for the rest of the body. — legacy behaviour (R3-Q1).
* `protected` is not a word of the language. — legacy behaviour (R3-Q1). **Reawakened rule:** the loader rejects it with a located diagnostic, because a file that uses it is not valid 3.1 and ignoring it would quietly change a program's meaning.
* Access is checked at each access, at run time, and a blocked access is a catchable runtime error. An access from outside any method, or from a method running on a different class, needs `public`; a method of the same class may also reach `private`. — legacy behaviour (R3-Q1).
* The check compares class identities, not instances: any method of class `C` may reach the private members of any `C` object. — legacy behaviour (R3-Q1).

**References.** R2-Q16, R2-Q17, R2-Q18, R2-Q19 (`docs/provenance/facts-round-2.md`); R3-Q1, R3-Q2 (`docs/provenance/facts-round-3.md`); the values and `return &` rules in [rpgcode-language.md](rpgcode-language.md); the failure table in [errors and threads](rpgcode-errors-and-threads.md); `byRef` on a `ParamSpec` (AD-8) and the vm state section (AD-10) in the architecture spine.
