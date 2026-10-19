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
### Pure-RPGCode plugins and middleware (MOD-4) — Reawakened rule

**Status (entry 18.7; Proposed ruling, pending owner review).** `registerPlugin(pluginDefinition)` below is the ruled design for the explicit, layered route and is **not built by the first-class-functions epic**: no `registerPlugin` command exists yet. What the epic built, and what authors use today to write a middleware library in pure RPGCode, is the environment table of [FUN-8](rpgcode-language.md#keywords-and-structure): store a callable under a command's name, and save the one it replaced with `bindingOf`. [Writing a middleware library today](#writing-a-middleware-library-today-entry-187) says how, and `registerPlugin` stays open for a later ticket (the evidence is in [ADR 0004, decision 8](../../adr/0004-script-ast-step-ir-and-plugins.md)). <!-- OWNER: MOD-4 — entry 18.7 proposes that registerPlugin is not part of epic 18: its plan, its verify line and the epic's "Done when" all describe the reassignment route, and registerPlugin needs rulings the epic never made (see ADR 0004, entry 18.7). Alternatives: (a) build registerPlugin now over the 18.5 table; (b) leave it to a later ticket (proposed). -->

RPGCode scripts can register custom commands and middleware interceptors via the built-in `registerPlugin(pluginDefinition)` function:

```rpgcode
registerPlugin({
    name: "audio-blips",
    commands: {
        message: (text, next) => {
            playSound("blip.wav");
            next(text); // yields to next plugin layer or native built-in
        }
    }
});
```

* **Onion middleware composition.** Multiple plugins wrapping the same command compose into an ordered chain (`Plugin A -> Plugin B -> Native Built-in`). When an interceptor runs, the engine provides `next` as a callable parameter representing the next layer down. Calling `next(...)` forwards execution and arguments to that layer.
* **No global monkey-patching.** Plugins register explicitly through the plugin registry rather than overwriting global variables or command tokens. Variable assignments (`message = 5`) do not alter or clobber command dispatch. **Proposed ruling (pending owner review; entry 18.5):** the one assignment that does take effect on a command name is storing a *callable* under it, which the environment table in [rpgcode-language.md](rpgcode-language.md#keywords-and-structure) (FUN-8) honours for the running scope; that is the lighter, per-scope way to wrap a command and it does not replace `registerPlugin`, which stays the explicit, layered route with `next` chaining and does not depend on it. <!-- OWNER: MOD-4 — 2026-10-18, entry 18.5: the plan's scope (a) asks for callable reassignment of command names, which this bullet's earlier wording ("overwriting global variables") did not distinguish from a plain-value assignment. Rejected alternative: leave the bullet silent, so two spec pages would appear to disagree. -->
* **Waiting commands.** When `next(...)` calls a command that yields or waits for user input (such as `message` waiting for a keypress), the calling thread suspends inside the interceptor frame. Under rule **G1**, this suspended frame serializes to plain JSON so mid-tick game state can be saved and restored cleanly.
* **Lifecycle.** Plugins register during startup initialization (e.g. from an `init.prg` or project manifest). When a saved game is restored, the registered plugin table is assumed to be established by the game startup sequence before saved threads resume. <!-- OWNER: MOD-4 — 2026-10-18: pure-RPGCode plugin middleware with registerPlugin(def) and next() chaining. -->


#### Writing a middleware library today (entry 18.7)

**What it does for a game author.** A middleware library is a `.prg` file that changes what an engine command does for the whole game: a weather library that puts the weather in front of every message, an audio library that tags every message with the music playing, a HUD library that holds the screen for a moment before a message shows. A game installs several of them, in order, and each one hands the call on to the one before it, ending at the engine's own command. A library never edits the game's scripts, and the game's scripts never mention the libraries. Four working examples, written only in RPGCode, are in `packages/core/test/fixtures/plugins/` (`weather-system.prg`, `audio-stems.prg`, `pace.prg`, `hud-log.prg`, with `key-gate.prg` for a command that waits for a key); `boot.prg` installs them and `game.prg` uses them.

**The recipe, precisely.**

* **Shape of a library.** The file defines one install function and nothing else, because `#include` imports functions only and a loose top-level statement of an included file does not run. The start-up program `#include`s each library, calls each install function once, and then ends by `run()`ning the game. `run()` ends the calling program, so the wrappers are made by a program that no longer exists when the game uses them; they keep working because a callable's owning program is saved with it (`vm.defOwners`, [FUN-8](rpgcode-language.md#keywords-and-structure)).
* **Shape of a wrapper.** The install function declares `local(original)`, sets `original = bindingOf("name")` and then `name = (params) => { ... original(args) ... }`. The saved handle `original` is a captured local, so it is a cell of the closure and not a global, and a second library using the same local name does not collide with it. The wrapper's parameters are the command's parameters, and it takes exactly the arguments a call passes (a call with another count is `callable.arity`); a parameter the command writes back (for example `wait(&key)`) is declared with `&` so the value reaches the caller's variable, and without the `&` it is lost.
* **Order.** Libraries are installed in call order, and the one installed last is the outermost layer: a call runs layers from the last installed to the first, then the engine, and returns in the opposite order. Two layers that change the text do not commute, so the install order is part of a game's behaviour.
* **Several commands.** A wrapper may call another wrapped command; the call goes through that command's layers too (a HUD layer's `sleep(1)` is stretched by a layer wrapped around `sleep`).
* **Waiting.** A wrapper may wait, and the original it calls may wait; either way the script thread stays stopped inside the wrapper's frame and the saved game holds that frame (G1). A save taken then restores and finishes exactly as the unsaved run does.
* **State.** Handles the library stores in globals (`weatherSet`, `weatherNow`) and the wrapper that holds the same local share one cell, so a change made through one is seen by the others ([FUN-8](rpgcode-language.md#keywords-and-structure), "Captured locals share one cell"). Two installs of the same library make two sets of cells.
* **Removing a layer.** Storing the saved handle back under the name (`mwin = original`, as `hud-log.prg`'s `hudRemove` does) puts back the layer that was covered and keeps every layer under it. `kill(mwin)` does not do that: it removes the variable, so every layer installed under the name goes with it and the engine's own command runs bare.
* **Saving.** The layers are values in the game's variables and cells, so a saved game carries them and a restore does not need the libraries to be installed again; the restore does need the library files, because the saved handle names a definition that is compiled from them again (a missing file is `program.missing`). This differs from the lifecycle line above, which describes `registerPlugin`'s table being established again at start-up.
* **Determinism.** A layer is ordinary script: it runs on the fixed tick, under the step budget, with the seeded random numbers and no clock, so two runs of the same game from the same seed give the same state hash on every tick (G3), and the headless golden `synthetic-11-middleware` pins one such run.


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
* **Reawakened rule — unreferenced objects (R-34).** When no global, frame local, operand, member of another object or reachable closure cell names an object's handle, that object is freed at the end of the tick in which it became unreferenced, in a fixed order, and no destructor runs. Two objects that name each other are never freed. A closure cell counts only while a script can still reach the cell itself: the same end-of-tick pass first frees every unreachable cell, so an object that only such a cell named is freed in that pass ([the language spec](rpgcode-language.md#keywords-and-structure), FUN-8, entry 18.6). *In plain terms:* once nothing in your game can reach an object or a closure's private variable any more, the engine forgets it at the end of that tick, so a script that makes objects or functions all day does not fill the save. *Precisely:* every tick ends with one pass that frees the unreachable closure cells first and then the unreferenced objects, after the engine's `time` phase (the phase list of [the main loop](main-loop-and-startup.md) gains no phase of its own), and it is the same pass, in the same order, whether the full engine or the script-only host runs the tick. <!-- OWNER: R-34 — Proposed ruling (pending owner review): the pass runs once per tick after the `time` phase in the engine as well as in the script-only host, cells then objects. Evidence: the script host ran it and `createEngine` did not, so an object or closure cell made by a running game stayed in the state for ever and handle numbers (which depend on the handle table) differed between the two hosts. Rejected alternative: a tenth phase in the AD-26 list, which the phase-list test pins as the immutable order and which a collector does not need, as it reads only the VM state. --> *Legacy facts:* 3.1 kept members as global variables named `<handle>::<member>`, used a background collector that woke every ten minutes, and never ran destructors (R2-Q17); a deterministic per-tick pass replaces the timer because a wall clock cannot be snapshotted, and the format spec previously said objects were never collected.
* At program end (`end()`, or falling off the program's end) the program's frames are dropped and its objects are freed by the same pass; no destructor runs. — legacy behaviour (R2-Q17).
* **Reawakened rule — handle numbers.** A new object takes the smallest number that is not in the handle table and is greater than the table's size. With an empty table that is 1; with handle 1 live and handle 2 free, the next is 2; with handle 1 free and handle 2 live, the next is 3. The numbering rule is legacy behaviour (R3-Q2); the Reawakened part is that it needs nothing but the current handle table, because our always-free `release` keeps every freed handle out of it, so a restore allocates the same next number.

### Where a name resolves (OOP-6)

* Inside a method, a variable name is looked up in this order, first match wins: an explicit `:name` global; a parameter; a member field of the current object's class (its own and inherited, any visibility); then a frame local or, failing that, the global of that name. — legacy behaviour (R2-Q18).
* An unqualified call `f(...)` resolves in this order: a built-in; inside a method, a method of the current object's class with that name and parameter count (an implicit `this` call); a script function of the program or its includes; a plugin that claims the name; otherwise the unknown-call error. — legacy behaviour (R2-Q18). (A `file.`-qualified call is the one exception and reaches that file's own definitions first; see the module rules above.)
* **Reawakened rule — the environment table (FUN-8, entry 18.5).** At run time the lookups above are one table with one entry above them: the running scope's own symbol — the variable of that name a read would reach from the running frame (a local of that frame, else the global), when it currently holds a callable value — runs instead of everything below, which is how a script intercepts or replaces a command. A member field of the current object is not part of that entry; a callable stored in a member is called through its object (`obj.f(...)`). Below it the table keeps the legacy order for a built-in, a script function and a plugin command; the VM's own commands (the module directives and `bindingOf`) are answered before the table and are not part of it. Reading a variable is never this lookup. The full rule, `bindingOf`, and the way a captured local's cell is shared with its creating frame are in [rpgcode-language.md](rpgcode-language.md#keywords-and-structure) under FUN-8. <!-- OWNER: OOP-6 — 2026-10-18, entry 18.5. -->
* **Proposed ruling (pending owner review; entry 18.5) — where the implicit `this` method sits.** Today's VM consults the implicit method of step 2 only after the built-in, the script-function and the plugin lookups all find nothing, so a script function or a plugin command of the same name and parameter count is reached where legacy reached the method. The running scope's callable binding that entry 18.5 introduces is looked up before all of them, the method included. Aligning step 2 with the legacy order above is a legacy-fidelity change of its own and is **not** made by entry 18.5. <!-- OWNER: OOP-6 — 2026-10-18, entry 18.5: flagged rather than silently changed; the departure is in `vm.ts`'s `call` dispatch, which resolves the table before the method step. Rejected alternative: move the method step ahead of the script-function and plugin lookups in this entry, which changes which function a 3.1 program calls and belongs to a legacy-fidelity ticket with its own goldens. -->
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
### Dictionaries and property bags (OOP-10) — Reawakened rule

Modern RPGCode code can create and manipulate dictionary objects directly via object literal syntax `{ key1: val1, key2: val2 }`:

```rpgcode
potion = {
    name: "Health Potion",
    healAmount: 50,
    use: (target) => {
        target.hp += this.healAmount;
    }
};
```

* **Universal dictionary foundation.** Dictionaries backed by environment cells serve as the single underlying runtime storage foundation for both modern property bags and compiled legacy `class` instances.
* **Legacy class compilation.** Legacy `class` declarations compile to constructor functions that instantiate dictionaries pre-populated with declared fields, access metadata, and prototype links to ancestor classes. No duplicate object runtime is required.
* **Property access.** Properties can be accessed using modern dot syntax (`obj.prop`), legacy arrow syntax (`obj->prop`), or string-bracket indexing (`obj["prop"]`).

### Auto-bound receivers and `this` (OOP-11) — Reawakened rule

* **Auto-binding on member access.** When a callable is accessed as a property of an object (`obj.method` or `obj->method`), the retrieved callable is automatically bound with `receiver = obj`.
* **Preserved receiver on tear-off.** Passing or storing a torn-off method retains its original receiver:
  ```rpgcode
  cb = potion.use;
  cb(player); // 'this' remains potion!
  ```
* **Standalone lambdas.** A lambda defined outside an object literal has `receiver = null`. Inside such a lambda, `this` evaluates to `null`.
* **Explicit rebinding with `bindThis`.** The built-in function `bindThis(fn, targetObj)` returns a new callable value explicitly bound to `targetObj`. <!-- OWNER: OOP-10, OOP-11 — 2026-10-18: dictionary objects, auto-bound methods on property read, and explicit bindThis(fn, obj). -->


**References.** R2-Q16, R2-Q17, R2-Q18, R2-Q19 (`docs/provenance/facts-round-2.md`); R3-Q1, R3-Q2 (`docs/provenance/facts-round-3.md`); the values and `return &` rules in [rpgcode-language.md](rpgcode-language.md); the failure table in [errors and threads](rpgcode-errors-and-threads.md); `byRef` on a `ParamSpec` (AD-8) and the vm state section (AD-10) in the architecture spine.
