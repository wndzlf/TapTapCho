# Commercial Area Radar Toss Package

`/Users/user/TapTapCho/games/commercial-area-radar` 앱을 토스 앱 번들(`.ait`)로 빌드하기 위한 패키지 루트입니다.

## 필수 환경변수

- `TOSS_APP_NAME`
  - 토스 개발자센터에 등록된 실제 `appName`과 반드시 같아야 합니다.

## 선택 환경변수

- `TOSS_BRAND_DISPLAY_NAME`
  - 기본값: `동네 상권 레이더`
- `TOSS_BRAND_ICON_URL`
  - 기본값: `https://raw.githubusercontent.com/wndzlf/TapTapCho/main/games/commercial-area-radar/appintos-logo-600.png`
  - `https://` URL만 허용됩니다.
  - 심사 전에는 토스 콘솔 아이콘과 동일한 이미지 URL로 맞추는 것을 권장합니다.

## 빌드

루트에서 실행:

```bash
cd /Users/user/TapTapCho
TOSS_APP_NAME="commercial-radar" npm run commercial-area-radar:toss:build
```

패키지 폴더에서 실행:

```bash
cd /Users/user/TapTapCho/games/commercial-area-radar/toss-package
TOSS_APP_NAME="commercial-radar" npm run build:web && npm run build
```

## 업로드 전 검증

```bash
cd /Users/user/TapTapCho/games/commercial-area-radar/toss-package
strings -n 6 commercial-radar.ait | rg "appName|displayName|raw.githubusercontent.com|static.toss.im/appsintoss"
```
