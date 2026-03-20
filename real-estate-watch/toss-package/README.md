# Real Estate Watch Toss Package

`/Users/user/TapTapCho/real-estate-watch` 앱을 토스 앱 번들(`.ait`)로 빌드하기 위한 패키지 루트입니다.

## 필수 환경변수

- `TOSS_APP_NAME`
  - 토스 콘솔에 등록한 앱의 `appName` 슬러그와 동일해야 합니다.

## 선택 환경변수

- `TOSS_BRAND_DISPLAY_NAME`
  - 기본값: `서울·경기 아파트 실거래`
- `TOSS_BRAND_ICON_URL`
  - 기본값: 내장 SVG 아이콘

## 로컬 빌드

루트에서 실행:

```bash
cd /Users/user/TapTapCho
TOSS_APP_NAME="real-estate-watch" npm run real-estate-watch:toss:build
```

또는 패키지 폴더에서 직접 실행:

```bash
cd /Users/user/TapTapCho/real-estate-watch/toss-package
TOSS_APP_NAME="real-estate-watch" npm run build
```

## 미리보기

```bash
cd /Users/user/TapTapCho
npm run real-estate-watch:toss:dev
```

## 업로드

`.ait` 생성 후에는 토스 콘솔 업로드 또는 CLI 업로드를 사용할 수 있습니다.

```bash
npx ait token add
npx ait deploy
```

토스 번들에는 앱용 경량 스냅샷 `latest-transactions.json`만 포함됩니다. 라이브 환경에서는 `Vercel JSON -> GitHub Raw JSON -> 번들 내부 JSON` 순서로 읽습니다.
