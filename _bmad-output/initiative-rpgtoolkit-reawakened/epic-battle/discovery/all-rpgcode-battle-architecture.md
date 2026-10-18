---
type: discovery
title: "Architecture Note: All-RPGCode Battle Engine and HUD System"
date: 2026-10-18
status: owner-approved
---

# Architecture Note: All-RPGCode Battle Engine and HUD System

## 1. Core Vision & Mandate

**Owner Decision (2026-10-18):**
The entire battle engine (Active Time Battle / turn loop, charge calculations, damage formulas, status effect ticks, enemy AI, battle animations, rewards, and battle UI/HUD) should be implemented **directly in RPGCode**, rather than as hardcoded C++/TypeScript logic inside `core`.

## 2. Enabling Architecture (The Two Pillars)

This vision is made possible by two architectural foundations:

### Pillar 1: Epic 18 (First-Class Callables, Dictionaries & Plugin Middleware)
- **Object State:** Fighters, items, moves, and UI elements are represented as dictionary objects with auto-bound methods (`fighter.takeDamage = (amt) => { ... }`, explicit rebinding via `bindThis(fn, obj)`).
- **Pure-RPGCode Plugin Registration:** The battle system registers itself into the engine command dispatch chain using:
  ```rpgcode
  registerPlugin({
      name: "stock-battle-engine",
      commands: {
          battle: (enemyGroup, background, next) => {
              // Complete RPGCode battle loop
          }
      }
  });
  ```
- **Extensible Hooks:** Community creators can hook battle lifecycle events (`onTurnStart`, `onCalculateDamage`, `onVictory`) or completely swap out the battle system by registering a replacement `battle` plugin.

### Pillar 2: Thorough Screen & UI Building Primitives
- To support rich, customizable battle UIs and game HUDs, RPGCode requires first-class composable screen-building primitives:
  - **Drawing Primitives:** Box/panel rendering (`drawBox`, `drawNineSlice`), health/charge bars (`drawBar`), text with bitmap and TrueType fonts (`drawText`), sprite/icon blitting (`drawImage`).
  - **Layering & Canvas Management:** Ability to push/pop UI layers, render to persistent surfaces, and blit over backgrounds with transparency/alpha.
  - **Transitions & Visual Effects:** Screen shakes, flashes, fades, damage number popups, and zoom effects driven directly by script.
  - **Input Hit-Testing:** Pointer/gamepad/keyboard navigation primitives for menu option selection and target picking.

## 3. Separation of Concerns (Hexagonal Boundary)

- **`core` Responsibilities (The Capabilities Provider):**
  - Deterministic G1 step-machine VM (executing the RPGCode battle scripts).
  - Deterministic G3 maths and seeded RNG.
  - Draw list generation and rasterisation (G4).
  - Audio synth playback (triggering audio cues for attacks, spells, victory fanfare).
  - Storing raw database assets (character stats, enemy stats from `.ene`, moves from `.spc`, status effects from `.ste`, backgrounds from `.bkg`).

- **RPGCode Script Responsibilities (The Game Experience):**
  - Battle state machine (Wait -> Charge -> Select Action -> Target -> Execute -> Resolve).
  - Charge bar rate formulas (+3/tick, slow/haste modifiers).
  - Damage calculation and critical hit formulas.
  - Enemy AI decision trees.
  - Menu navigation (Attack, Skill, Item, Run).
  - Victory, defeat, experience calculation, and level-up sequence.

## 4. Benefits to Creators & Platform

1. **Infinite Moddability:** Creators do not need to compile native plugins or write TypeScript to build custom battle engines (tactical grid, action RPG, card battle, classic turn-based). They write standard RPGCode.
2. **Deterministic Golden Testing:** Headless CI can execute entire battle scripts with seeded inputs and assert state hashes / draw list outputs, ensuring zero regression across engine updates.
3. **Stage 2 Alignment:** Cleanly replaces the legacy, platform-locked Win32 `fightPlugin` DLL with a portable, open-source RPGCode reference implementation.
