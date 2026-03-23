# Sunken Sixway Defense 2 Toss Package

`/Users/user/TapTapCho/games/sunken-sixway-defense-2` 게임을 토스 앱 번들(`.ait`)로 빌드하기 위한 패키지 루트입니다.

## 필수 확인값

- `TOSS_APP_NAME`
  - 토스 개발자센터에 등록한 실제 `appName`과 정확히 같아야 합니다.

## 선택 환경변수

- `TOSS_BRAND_DISPLAY_NAME`
  - 기본값: `선큰 식스웨이 디펜스 2`
- `TOSS_BRAND_ICON_URL`
  - 기본값: 로컬 `appintos-logo-600.svg`를 읽어 만든 `data:` URI
  - 실제 업로드 전에는 개발자센터 아이콘과 동일한 HTTPS PNG URL로 덮어쓰는 편이 안전합니다.

## 로컬 빌드

패키지 폴더에서 직접 실행:

```bash
cd /Users/user/TapTapCho/games/sunken-sixway-defense-2/toss-package
TOSS_APP_NAME="sunkendefense2" npm run build:web
TOSS_APP_NAME="sunkendefense2" npm run build
```

아이콘 URL까지 같이 맞춰 빌드하려면:

```bash
cd /Users/user/TapTapCho/games/sunken-sixway-defense-2/toss-package
TOSS_APP_NAME="sunkendefense2" \
TOSS_BRAND_DISPLAY_NAME="선큰 식스웨이 디펜스 2" \
TOSS_BRAND_ICON_URL="https://static.toss.im/appsintoss/..." \
npm run build
```

## 로컬 미리보기

```bash
cd /Users/user/TapTapCho/games/sunken-sixway-defense-2/toss-package
npm run dev
```

## 업로드 전 체크

1. 개발자센터의 실제 `appName`과 `.ait` 내부 `appName`이 같은지 확인
2. 개발자센터 아이콘과 `brand.icon`이 같은 HTTPS PNG URL을 가리키는지 확인
3. `npm run build:web && npm run build`로 번들을 재생성했는지 확인
4. `.ait` 생성 후 아래 명령으로 이름/아이콘 반영을 확인

```bash
strings -n 6 sunkendefense2.ait | rg "appName|displayName|static.toss.im/appsintoss"
```
