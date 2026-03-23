# Retro Hero: Street Beat Toss Package

`/Users/user/TapTapCho/games/retro-hero-street-beat` 앱을 토스 앱 번들(`.ait`)로 빌드하기 위한 패키지 루트입니다.

## 필수 환경변수

- `TOSS_APP_NAME`
  - 토스 개발자센터에 등록된 실제 `appName`과 반드시 같아야 합니다.

## 선택 환경변수

- `TOSS_BRAND_DISPLAY_NAME`
  - 기본값: `Retro Hero: Street Beat`
- `TOSS_BRAND_ICON_URL`
  - 기본값: `https://raw.githubusercontent.com/wndzlf/TapTapCho/main/games/retro-hero-street-beat/appintos-logo-600.png`
  - `https://` URL만 허용됩니다.
  - 심사 전에는 토스 콘솔 아이콘과 동일한 이미지 URL로 맞추는 것을 권장합니다.

## 빌드

루트에서 실행:

```bash
cd /Users/user/TapTapCho
TOSS_APP_NAME="retro-hero-beat" npm --prefix games/retro-hero-street-beat/toss-package run build:web
TOSS_APP_NAME="retro-hero-beat" npm --prefix games/retro-hero-street-beat/toss-package run build
```

패키지 폴더에서 실행:

```bash
cd /Users/user/TapTapCho/games/retro-hero-street-beat/toss-package
TOSS_APP_NAME="retro-hero-beat" npm run build:web && npm run build
```

## 업로드 전 검증

```bash
cd /Users/user/TapTapCho/games/retro-hero-street-beat/toss-package
strings -n 6 retro-hero-beat.ait | rg "appName|displayName|raw.githubusercontent.com|static.toss.im/appsintoss"
```

## 광고 메모

- 기본 보상형 광고 그룹 ID: `ait-ad-test-rewarded-id`
- 운영 ID로 교체하려면 `index.html` 로드 전에 아래 전역 상수를 주입:

```js
window.__RETRO_HERO_STREET_BEAT_TOSS_REWARDED_AD_GROUP_ID = 'your-ad-group-id';
```
