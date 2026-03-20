# Zigzag Memory Run Toss Ads Notes

Last checked: 2026-03-19

## Current status

- In-app ads are not implemented yet.
- This game is currently being prepared for Toss launch without ad UI.
- The plan is to add ads later in one pass, after business registration and ad group setup are ready.

## What matters for this game

### 1. Do not ship placeholder ad UI yet

- We do not have a real `adGroupId` yet.
- Toss requires business registration, settlement review, and ad group creation first.
- Until those are done, keep ads out of the shipping UI.

### 2. Best first ad type

For `Zigzag Memory Run`, the best first choice is also a rewarded ad.

Reason:

- The game is full-screen and tap-focused, so banners are likely to hurt readability.
- A rewarded ad fits a user-triggered recovery moment better than an entry interstitial.

### 3. Best placement later

Recommended first implementation when we are ready:

- Add a button on the game over modal:
  - `광고 보고 1회 이어하기`
- Reward effect:
  - replay the failed pattern preview once
  - keep the current score and streak
  - allow only one rewarded continue per run

That keeps the ad tied to a clear user choice and does not interrupt the active memorization flow.

### 4. What to avoid

- Do not show an interstitial immediately on app launch.
- Do not place banners over the play field.
- Do not attach ads during preview/input phases where timing and readability matter most.

## Later implementation touch points

When the ad setup blocker is removed, these files are the likely touch points:

- `/Users/user/TapTapCho/zigzag-memory-run/index.html`
  - add a rewarded continue button to the game over modal
- `/Users/user/TapTapCho/zigzag-memory-run/game.js`
  - preload rewarded ad
  - show rewarded ad
  - grant the continue only on reward callback
  - pause/resume audio during the ad lifecycle
- `/Users/user/TapTapCho/zigzag-memory-run/toss-bridge-source.js`
  - add Toss ad bridge wrappers if we keep the current custom bridge pattern
- `/Users/user/TapTapCho/zigzag-memory-run/toss-bridge.js`
  - rebuild after the bridge source changes

## Decision for now

Until Toss console setup is complete:

- keep ads out of the release build
- use this document as the ad source of truth
- launch the game first as a clean no-ad mini app
