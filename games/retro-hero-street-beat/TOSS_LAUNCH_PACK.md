# Retro Hero: Street Beat - TOSS Launch Pack

## 1) 필수 값 확정

- `TOSS_APP_NAME`: 토스 개발자센터 앱 `appName`과 동일
- `TOSS_BRAND_DISPLAY_NAME`: 콘솔 표기명과 동일
- `TOSS_BRAND_ICON_URL`: `https://` PNG URL, 콘솔 아이콘과 동일 파일

## 2) 아이콘 산출물

- 원본: `/Users/user/TapTapCho/games/retro-hero-street-beat/appintos-logo-600.svg`
- PNG: `/Users/user/TapTapCho/games/retro-hero-street-beat/appintos-logo-600.png`

## 3) 썸네일 산출물

- 원본: `/Users/user/TapTapCho/games/retro-hero-street-beat/appintos-thumbnail-1932x828.svg`
- PNG: `/Users/user/TapTapCho/games/retro-hero-street-beat/appintos-thumbnail-1932x828.png`

## 4) 스크린샷 산출물

- `/Users/user/TapTapCho/games/retro-hero-street-beat/appintos-screenshots/portrait-01.png`
- `/Users/user/TapTapCho/games/retro-hero-street-beat/appintos-screenshots/portrait-02.png`
- `/Users/user/TapTapCho/games/retro-hero-street-beat/appintos-screenshots/portrait-03.png`
- `/Users/user/TapTapCho/games/retro-hero-street-beat/appintos-screenshots/landscape-01.png`

## 5) 개발자센터 입력 문안

- 부제: `비트에 맞춰 3레인 전투`
- 상세 설명:
  `사용자는 곡과 난이도를 고른 뒤 좌, 중, 우 레인을 박자에 맞춰 탭해 적을 처치합니다. 정확한 입력으로 콤보를 이어가고 HERO MODE를 발동해 더 높은 점수 기록에 도전할 수 있습니다.`
- 앱 검색 키워드:
  `리듬게임, 음악게임, 탭게임, 리듬액션, 3레인게임`

## 6) 번들 빌드

```bash
cd /Users/user/TapTapCho/games/retro-hero-street-beat/toss-package
TOSS_APP_NAME="retro-hero-beat" \
TOSS_BRAND_DISPLAY_NAME="Retro Hero: Street Beat" \
TOSS_BRAND_ICON_URL="https://static.toss.im/appsintoss/<app-id>/<icon-file>.png" \
npm run build:web && npm run build
```

## 7) 업로드 직전 문자열 검증

```bash
cd /Users/user/TapTapCho/games/retro-hero-street-beat/toss-package
strings -n 6 retro-hero-beat.ait | rg "appName|displayName|static.toss.im/appsintoss|raw.githubusercontent.com"
```

검증 시 아래 값이 원하는 값으로 보여야 합니다.

- `appName`
- `displayName`
- `brand.icon` URL

## 8) 권장 제출 문안 초안

- 서비스 유형: 3레인 리듬 액션 게임
- 핵심 플레이: 비트에 맞춰 좌/중/우 레인을 탭해 적을 처치하고 곡 종료까지 점수를 누적
- 주요 요소: `Perfect/Great/Good/Safe/Miss` 판정, 트랙 선택, 난이도 선택, `HERO MODE`
- 조작: 화면 탭 3레인, 곡/난이도 선택, 사운드 온오프
- 광고: 라운드 종료 후 보상형 광고로 1회 이어하기 지원

## 9) 제출 체크

- 토스 콘솔의 실제 `appName`과 `.ait` 내부 `appName` 일치
- 토스 콘솔 표기명과 `brand.displayName` 일치
- 토스 콘솔 아이콘과 `brand.icon` URL이 같은 PNG인지 확인
- 개발자센터/소개 이미지에 사용할 가로형 썸네일 `1932x828` PNG 준비 여부 확인
- 아이콘 URL이 실제 접근 가능한 `https://` 주소인지 확인
