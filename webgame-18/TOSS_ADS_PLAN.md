# Orbit Survivor Toss Ads Notes

Last checked: 2026-03-19

## Current status

- In-app ads are not implemented yet.
- The current blocker is that business registration is not complete, so we do not have an ad group ID yet.
- Until that is done, do not add ad UI that calls a real ad flow.

## What we confirmed from Toss docs

### 1. In-app ads require console setup first

- Toss says in-app ads require business registration.
- After that, the console flow is:
  1. business info registration
  2. settlement info input
  3. ad group creation
- Settlement review takes about 2-3 business days.
- After an ad group is created, the ad group ID can take up to 2 hours to become available on Google's side.

Sources:
- [Business registration](https://developers-apps-in-toss.toss.im/prepare/register-business.html)
- [Ads console guide](https://developers-apps-in-toss.toss.im/ads/console.html)

### 2. Available ad types

Toss supports these ad types:

- Interstitial ad
- Rewarded ad
- Banner ad

For `Orbit Survivor`, rewarded ads are the best fit.

Reason:

- Toss explicitly says rewarded ads work well for "watch ad and continue" in games.
- This game is a full-screen action game, so fixed banners are more likely to hurt the play flow.

Source:
- [Ads intro](https://developers-apps-in-toss.toss.im/ads/intro.html)

### 3. Recommended SDK path

- New integrations should use `In-App Ads 2.0 ver2`, the integrated SDK.
- Toss recommends the integrated SDK over the old AdMob-only SDK.
- The integrated SDK handles Toss Ads and Google AdMob through one SDK.

Source:
- [Ads develop guide](https://developers-apps-in-toss.toss.im/ads/develop.html)

### 4. Full-screen / rewarded implementation rule

- Ads must be used in this sequence:
  - `load -> show -> next load`
- Only one ad can be loaded at a time.
- `showAppsInTossAdMob` should only run after the load success event arrives.

Source:
- [Ads develop guide](https://developers-apps-in-toss.toss.im/ads/develop.html)
- [showAppsInTossAdMob reference](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%EA%B4%91%EA%B3%A0/showAppsInTossAdMob.html)

### 5. Test IDs

During development, Toss says to use only test IDs.

- Interstitial test ID: `ait-ad-test-interstitial-id`
- Rewarded test ID: `ait-ad-test-rewarded-id`
- Banner list test ID: `ait-ad-test-banner-id`
- Banner feed test ID: `ait-ad-test-native-image-id`

Do not test with a real production ID before the console setup is complete.

Sources:
- [Ads intro](https://developers-apps-in-toss.toss.im/ads/intro.html)
- [Ads develop guide](https://developers-apps-in-toss.toss.im/ads/develop.html)

### 6. Sandbox limitation

- Toss says in-app ads do not work in the sandbox app.
- Ad testing must be done with the QR flow from the console.

Source:
- [Ads develop guide](https://developers-apps-in-toss.toss.im/ads/develop.html)

### 7. Audio behavior during ads

- Toss says app sound should pause while the ad is playing.
- After the ad ends, sound should resume automatically.

This matches the current game structure well because `webgame-18/game.js` already has centralized audio pause/resume behavior.

Source:
- [Ads intro](https://developers-apps-in-toss.toss.im/ads/intro.html)

### 8. Policy / UX rules that matter for this game

- Do not show a full-screen ad immediately on service entry.
- Rewarded ads should be user-initiated.
- Do not interrupt payment or authentication flows with ads.
- Do not disguise ads or modify the SDK's click / impression logic.

Sources:
- [Ads develop guide](https://developers-apps-in-toss.toss.im/ads/develop.html)

### 9. If we ever add banners later

For game services, Toss says banner placement rules are stricter:

- Banner can be placed at the top or bottom.
- Banner cannot be placed in the center for a game service.
- It must sit only in an empty area with no interactive game UI overlap.
- Recommended minimum spacing:
  - top: below the navigation/status bar with `4px` padding
  - bottom: above the indicator/navigation bar with `4px` padding

This means banner ads are possible, but they are not the first recommendation for `Orbit Survivor`.

Source:
- [Ads develop guide](https://developers-apps-in-toss.toss.im/ads/develop.html)

## Best plan for Orbit Survivor

### Phase 1: rewarded continue

Recommended first implementation:

- Add a button on the game over modal:
  - `광고 보고 1회 이어하기`
- Load a rewarded ad in advance.
- On `userEarnedReward`, grant exactly one continue:
  - restore 1 life
  - resume the run
  - allow only one rewarded continue per round

This is the best fit for Toss's guidance and for this game's flow.

### Phase 2: optional interstitial

Only consider later if needed:

- show an interstitial every few completed runs or after clear stop points
- never on first launch
- never immediately after the app opens

### Phase 3: banner only if layout changes

Only consider banner ads if we later create a clearly separate lobby / menu / results layout with safe empty top or bottom space.

## Planned integration points in this codebase

When the blocker is removed, these files are the likely touch points:

- `webgame-18/index.html`
  - add a rewarded continue button in the game over modal
- `webgame-18/game.js`
  - preload ad
  - show ad on button click
  - handle reward event
  - pause / resume game audio around the ad lifecycle
- `webgame-18/toss-bridge-source.js`
  - add ad bridge wrappers for the Toss ad APIs if we keep using the custom bridge approach
- `webgame-18/toss-bridge.js`
  - rebuild after updating the source bridge file

## Implementation note for later

We should probably keep the current custom Toss bridge pattern and add ad wrappers there, instead of mixing a different integration style only for ads.

That means adding wrappers for:

- rewarded/interstitial preload
- rewarded/interstitial show
- banner attach only if needed later

## TODO after business registration is done

1. Complete business registration in the Toss console.
2. Complete settlement info review.
3. Create a rewarded ad group for game over continue.
4. Save the real `adGroupId` in a local config constant.
5. Implement rewarded continue flow.
6. Test with Toss console QR, not sandbox.
7. Verify:
   - ad load success
   - ad show success
   - reward grant only on `userEarnedReward`
   - audio pause during ad and resume after
   - no duplicate reward
   - back navigation still works correctly

## Decision for now

Until business registration and ad group creation are done:

- keep ads out of the shipping UI
- keep this document as the source of truth
- when the console is ready, implement rewarded ads first
