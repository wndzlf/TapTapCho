# Winter Ski Rush Toss Package

`/Users/user/TapTapCho/games/godot-winter-ski-rush-web` 게임을 토스 앱 번들(`.ait`)로 빌드하기 위한 패키지입니다.

## 필수 확인값

- `TOSS_APP_NAME`
  - 토스 콘솔에 등록된 앱의 `appName` 슬러그와 완전히 동일해야 합니다.

## 선택 환경변수

- `TOSS_BRAND_DISPLAY_NAME`
  - 기본값: `윈터스키러시`
- `TOSS_BRAND_ICON_URL`
  - 기본값: `https://static.toss.im/appsintoss/29647/f5106af5-8b92-4378-96df-2259b8142405.png`

## 로컬 빌드

```bash
cd /Users/user/TapTapCho
TOSS_APP_NAME="winter-ski-rush" TOSS_BRAND_DISPLAY_NAME="윈터스키러시" npm --prefix games/godot-winter-ski-rush-web/toss-package run build
```

## 웹 미리보기

```bash
cd /Users/user/TapTapCho/games/godot-winter-ski-rush-web/toss-package
npm run dev
```
