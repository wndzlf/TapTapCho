# Air Striker Lite Toss Package

`/Users/user/TapTapCho/games/godot-air-striker-web` 게임을 토스 앱 번들(`.ait`)로 빌드하기 위한 패키지입니다.

## 필요한 환경변수

- `TOSS_APP_NAME`
- `TOSS_BRAND_DISPLAY_NAME`
- `TOSS_BRAND_ICON_URL`

없으면 아래 기본값을 사용합니다.

- 앱명: `airstrikerlite`
- 표시명: `에어 스트라이커 라이트`

## 빠른 빌드

```bash
cd /Users/user/TapTapCho
TOSS_APP_NAME="airstrikerlite" npm run air-striker-lite:toss:build
```

## 웹 미리보기

```bash
cd /Users/user/TapTapCho/games/godot-air-striker-web/toss-package
npm run dev
```

## 번들 포함 파일

- 게임 런타임: `index.html`, `game.js`, `style.css`, `toss-bridge.js`
- 오디오: `static/sounds/air-striker-lite-bgm-pixabay-301284.mp3`
- 정책 문서: `about.html`, `contact.html`, `dmca.html`, `privacy.html`, `terms.html`
