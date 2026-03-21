# Real Estate Watch Toss Package

`/Users/user/TapTapCho/games/real-estate-watch` 앱을 토스 앱 번들(`.ait`)로 빌드하기 위한 패키지 루트입니다.

## 필수 환경변수

- `TOSS_APP_NAME`
  - 토스 콘솔에 등록한 앱의 `appName` 슬러그와 동일해야 합니다.

## 선택 환경변수

- `TOSS_BRAND_DISPLAY_NAME`
  - 기본값: `서울·경기 아파트 실거래`
- `TOSS_BRAND_ICON_URL`
  - 기본값: `https://static.toss.im/appsintoss/29647/18a3c412-0033-4217-89c2-7219a4e43034.png`
- `TOSS_INLINE_AD_GROUP_ID`
  - 기본값: `ait-ad-test-native-image-id`
  - 정보형 인라인 스폰서 카드에 사용할 토스 광고 그룹 ID

## 로컬 빌드

루트에서 실행:

```bash
cd /Users/user/TapTapCho
TOSS_APP_NAME="real-estate-watch" npm run real-estate-watch:toss:build
```

실제 광고 그룹 ID를 주입하려면:

```bash
cd /Users/user/TapTapCho
TOSS_APP_NAME="real-estate-watch" \
TOSS_INLINE_AD_GROUP_ID="your-production-ad-group-id" \
npm run real-estate-watch:toss:build
```

또는 패키지 폴더에서 직접 실행:

```bash
cd /Users/user/TapTapCho/games/real-estate-watch/toss-package
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

토스 번들에는 앱용 경량 스냅샷 `latest-transactions.json`만 포함됩니다. 라이브 환경에서는 `GitHub Raw JSON -> Vercel JSON -> 번들 내부 JSON` 순서로 읽습니다.

현재 광고 구성은 `가장 비싼 거래` 목록과 `계약일 최신 거래` 목록 사이에 인라인 스폰서 카드 1개만 두는 방식입니다. 웹 미리보기에서는 자리만 보이고, 토스 앱 안에서만 실제 광고 슬롯이 렌더링됩니다.
