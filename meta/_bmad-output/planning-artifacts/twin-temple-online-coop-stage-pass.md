# Twin Temple Escape - Online Co-op Stage Pass

**Status:** Draft v0.1  
**Date:** 2026-03-17  
**Scope:** Online co-op tuning pass for mobile-first play and clearer two-player cooperation.

## Goals

- Move mobile controls to a bottom dock so thumbs do not block the playfield.
- Raise jump forgiveness so stage 1 is always beatable under normal mobile timing.
- Rebuild the online stages around relay-style co-op gates instead of pure precision jumps.
- Keep the game readable and fast enough for a 2D hyper-casual session.

## Design Rules

- Every stage must require both roles to contribute at least once.
- A stage can lock progress behind the correct partner, but must not require frame-perfect timing.
- Button-to-door chains should create communication beats: "I opened it, now you move."
- Hazard placement should punish rushing, not make the route ambiguous.
- Each stage must have a visible safe route once the correct gates are opened.

## Physics Tuning

- Jump speed raised to `880`.
- Added `0.14s` coyote time for more forgiving mobile jumps.
- Core movement speed remains readable and compact for short-session play.

## Stage Flow

### 1. Twin Relay
- Aqua opens the center gate from the first ledge.
- Ember opens the right gate from the upper ledge.
- End state teaches that both players unlock different halves of the route.

### 2. Split Switchback
- Ember opens the middle route first.
- Aqua unlocks the last barrier to the final exits.
- The room asks players to alternate progress instead of racing independently.

### 3. Cross Current
- Aqua, Ember, and Aqua each open one part of the route in order.
- The stage reinforces handoff pacing and simple communication.

### 4. Temple Switchback
- Ember opens the first gate.
- Aqua opens the next gate to the high route.
- Ember completes the last release before both players exit.

### 5. Final Tandem
- Four short relay steps mix both roles before the final exits.
- The room acts as a compact finale that uses the full gate language without overcomplication.

## Acceptance Check

- Stage 1 is beatable without pixel-perfect jumps.
- Both exits remain reachable after all required gates are opened.
- Mobile players can keep both thumbs near the bottom edge for the full run.
- The stage logic still stays simple enough for online state sync.
