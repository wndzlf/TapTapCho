# Commercial Area Radar Toss Package

`/Users/user/TapTapCho/games/commercial-area-radar` 앱을 토스 앱 번들(`.ait`)로 빌드하기 위한 패키지 루트입니다.

## 필요한 환경변수

- `TOSS_APP_NAME`
- `TOSS_BRAND_DISPLAY_NAME`
- `TOSS_BRAND_ICON_URL`

없으면 아래 기본값을 사용합니다.

- 앱명: `commercial-area-radar`
- 표시명: `동네 상권 레이더`

## 빠른 빌드

```bash
cd /Users/user/TapTapCho
TOSS_APP_NAME="commercial-area-radar" npm run commercial-area-radar:toss:build
```

## 웹 미리보기

```bash
cd /Users/user/TapTapCho/games/commercial-area-radar/toss-package
npm run dev
```
