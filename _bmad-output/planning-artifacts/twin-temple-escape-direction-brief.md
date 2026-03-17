# Twin Temple Escape - Direction Brief (BMad Draft)

**Status:** Draft v0.1  
**Date:** 2026-03-17  
**Reference Intent:** Use the strengths of 2-player-only co-op adventure design as inspiration, but do not copy characters, story, stage themes, or set pieces from any existing title.

## 1. Direction Shift

`Twin Temple Escape` should move from a short co-op puzzle platformer into a **chapter-based asymmetric co-op adventure** built for web and mobile.

Current version strengths:
- Two-player cooperation already exists
- Local + online co-op foundation already exists
- Dual-character identity (`Ember`, `Aqua`) is already readable

Current version limits:
- Stage structure is still close to short switch-and-door puzzle rooms
- Character differences are mostly elemental gating, not deep role asymmetry
- Mobile UX is functional but not yet premium
- The game lacks memorable chapter-specific mechanics and cinematic cooperative moments

## 2. Target Experience

Players should feel:
- "We can only solve this if both of us understand our different roles."
- "Every chapter gives us a fresh cooperative toy."
- "This is a journey, not just five isolated puzzle rooms."
- "Even on mobile, the game feels readable, smooth, and deliberately built for co-op."

## 3. Core Product Pillars

### Pillar A. Two-Player-Only Design
- Every major obstacle must require both players.
- Solo play is not the primary fantasy.
- Online co-op should feel first-class, not like a bonus mode.

### Pillar B. Asymmetric Abilities
- `Ember` and `Aqua` must have distinct strengths.
- Their skills should complement each other, not mirror each other.
- At least one new paired mechanic should appear in each chapter.

### Pillar C. Chapter Variety
- Each chapter needs a clear mechanical identity.
- The game should keep changing interaction patterns before repetition sets in.
- Puzzles, traversal, hazards, and cooperative timing should evolve together.

### Pillar D. Emotional Adventure Framing
- The temple should feel like a journey through connected spaces with rising stakes.
- Short environmental story beats should support progression.
- Clear milestones, escapes, collapses, guardians, and reveals should create momentum.

### Pillar E. Mobile-First Readability
- Controls must stay at the bottom and never compete with the playfield.
- HUD should be minimal during active play.
- Fullscreen behavior should prioritize immersion while respecting browser limits.

## 4. Revised Game Fantasy

Two trapped adventurers with opposing temple affinities descend into a living ruin that constantly reconfigures itself. They survive by combining incompatible powers to bypass traps, awaken mechanisms, and escape a collapsing sacred complex.

## 5. Player Roles

### Ember
- Excels at ignition, burst movement, heat triggers, and breaking fragile seals
- Better at aggressive interactions and time-pressure actions

### Aqua
- Excels at flow control, cooling, reflection, lift support, and stabilizing mechanisms
- Better at route creation, safe traversal, and environmental control

### Co-op Principle
- Neither role should feel like "player 2 support only."
- Each chapter must give both players at least one spotlight mechanic.

## 6. Core Loop

1. Enter a new temple chamber or chapter zone
2. Discover each character's current chapter ability
3. Read hazards and cooperative puzzle language
4. Execute traversal + timing + interaction together
5. Reach a checkpoint or set-piece escape moment
6. Unlock the next chamber with a new combined mechanic twist

## 7. Structure Proposal

Assumption for web/mobile scope:
- Total play structure should be modular, with replayable chapters rather than one long uninterrupted campaign.

Recommended structure:
- Prologue: basic coordination, jump timing, simple elemental gates
- Chapter 1: split-path cooperation and simultaneous switches
- Chapter 2: moving platforms and carry/launch interactions
- Chapter 3: reflection, redirection, and hazard transformation
- Chapter 4: chase/escape chapter with collapsing routes
- Finale: multi-phase guardian or escape gauntlet using all learned pair mechanics

## 8. Example Mechanic Families

These are direction examples, not locked content:

- `Ember` ignites braziers while `Aqua` redirects steam pressure to rotate bridges
- `Aqua` creates temporary safe surfaces while `Ember` dashes through timed hazards
- `Ember` activates ancient machines while `Aqua` stabilizes their output windows
- One player manipulates the foreground route while the other changes the back-layer state
- One player temporarily sacrifices mobility to empower the other's traversal option

## 9. Level Design Rules

- Every room should test communication, not only reaction speed
- Avoid long repeated switch-door templates
- Each puzzle room should introduce, remix, or climax one mechanic idea
- Cooperative traversal should create moments where one player watches, guides, or rescues the other
- Checkpoints should sit before difficult coordination spikes, not after long dead time

## 10. Mobile UX Requirements

### Controls
- Touch controls must live at the bottom of the screen
- Each role needs a compact, thumb-friendly control cluster
- Future chapters may require one context-sensitive ability button per role
- Important inputs must stay above safe-area insets

### Camera and Readability
- Avoid critical puzzle objects near device cutouts or browser chrome
- Character silhouettes and interactables need stronger contrast than background art
- Camera framing must preserve both players whenever possible

### Fullscreen and Browser Chrome
- In supported browsers, request native fullscreen with hidden navigation UI
- On browsers that do not allow true fullscreen in a normal tab, provide the cleanest possible pseudo-fullscreen layout
- For iPhone/iOS style browsers, target Home Screen standalone launch as the only path to a truly app-like chrome-free experience

## 11. Technical Requirements

- Shared puzzle object system with reusable triggers, gates, movers, hazards, and checkpoints
- Chapter ability framework that can add or swap role-specific skills without rewriting the whole game
- Online synchronization for room state, player state, respawn state, and puzzle events
- Soft checkpoint recovery that restores both players cleanly after failure
- Mobile-safe input layer supporting dual local touch and online single-role touch
- Presentation layer for chapter intros, goal text, and milestone moments

## 12. Immediate Risks

- Over-scoping into a console-sized adventure not feasible for web delivery
- Making two characters visually different but mechanically shallow
- Adding spectacle before the cooperative core feels good
- Mobile controls blocking sightlines or causing thumb fatigue
- Network desync turning coordination puzzles into frustration

## 13. Recommended Next Epics

### EPIC-TTE-01: Mobile Co-op Shell Upgrade
- Bottom-anchored control layout
- Immersive fullscreen / pseudo-fullscreen behavior
- Minimal in-run HUD and safer mobile spacing

### EPIC-TTE-02: Asymmetric Ability Framework
- Add per-role ability slots
- Create reusable interaction targets
- Support chapter-specific mechanic injection

### EPIC-TTE-03: Vertical Slice Chapter
- Build one full chapter with clear beginning, mechanic twist, checkpoint, and climax
- Target 8-12 minutes of polished co-op play

### EPIC-TTE-04: Online Reliability Pass
- Tighten state sync, respawn sync, and checkpoint recovery
- Reduce confusion around room join flow and role assignment

## 14. Definition of Success

- Players immediately understand that the game is designed around cooperation, not optional co-op
- At least one chapter feels meaningfully different from the launch prototype structure
- Mobile players can play without top-screen controls or browser chrome confusion dominating the experience
- Online co-op remains readable and dependable under normal mobile network conditions

## 15. Recommendation

This project should not jump straight into large-scale implementation from the current prototype.  
The better BMad path is:

1. Turn this direction brief into a `game-brief`
2. Expand it into a `Twin Temple Escape` GDD
3. Create a technical spec for mobile UX + ability framework + online sync
4. Then break the work into implementation stories
