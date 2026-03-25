# Commercial Area Radar - TOSS Launch Pack

`commercial-area-radar`는 게임이 아닌 정보형 미니앱입니다.

## 1) 필수 값 확정

- `TOSS_APP_NAME`: `commercial-radar` (토스 개발자센터 앱 `appName`과 동일)
- `TOSS_BRAND_DISPLAY_NAME`: 콘솔 표기명과 동일
- `TOSS_BRAND_ICON_URL`: `https://` PNG URL (콘솔 아이콘과 동일 파일)
- 약관 등록 URL:
  - `https://tap-tap-cho.vercel.app/commercial-area-radar/terms.html`
  - `https://tap-tap-cho.vercel.app/commercial-area-radar/privacy.html`

## 2) 아이콘 산출물

- 원본: `/Users/user/TapTapCho/games/commercial-area-radar/appintos-logo-600.svg`
- PNG: `/Users/user/TapTapCho/games/commercial-area-radar/appintos-logo-600.png`

## 3) 번들 빌드

```bash
cd /Users/user/TapTapCho/games/commercial-area-radar/toss-package
TOSS_APP_NAME="commercial-radar" \
TOSS_BRAND_DISPLAY_NAME="동네 상권 레이더" \
TOSS_BRAND_ICON_URL="https://static.toss.im/appsintoss/<app-id>/<icon-file>.png" \
npm run build:web && npm run build
```

## 4) 업로드 직전 문자열 검증

```bash
cd /Users/user/TapTapCho/games/commercial-area-radar/toss-package
strings -n 6 commercial-radar.ait | rg "appName|displayName|static.toss.im/appsintoss|raw.githubusercontent.com"
```

검증 시 아래가 원하는 값으로 노출되어야 합니다.

- `appName`
- `displayName`
- `brand.icon` URL

## 5) 권장 제출 메모 초안

- 서비스 유형: 상권 정보 요약 앱
- 데이터 기준: 소상공인시장진흥공단 상가(상권)정보 API 기반 주기 수집 스냅샷
- 비고: 실시간 매출/유동인구/시세를 제공하지 않으며, 정보 제공 목적 서비스
- 운영 문서: 서비스 이용약관, 개인정보처리방침 별도 URL 제공
