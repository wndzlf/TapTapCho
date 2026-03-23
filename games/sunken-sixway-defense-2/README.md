# Sunken Sixway Defense 2

Last updated: 2026-03-23

## Overview

`Sunken Sixway Defense 2`는 여섯 갈래 길목에 선큰을 배치하고, 스테이지 클리어마다 카드 보상을 골라 전장을 성장시키는 세로형 타워 디펜스 게임입니다.

이 폴더는 일반 웹 실행뿐 아니라 토스 미니앱 업로드 준비까지 함께 관리합니다.

## Toss release status

현재 기준으로 아래 항목을 반영했습니다.

- 세로 풀스크린 게임 화면 구성
- `viewport-fit=cover` + Safe Area 대응
- 토스 앱 세로 고정
- iOS 스와이프 뒤로가기 비활성화
- 토스 뒤로가기 이벤트를 종료 확인 모달로 연결
- 토스 홈 이동 시 자동 일시정지
- BGM / 효과음 개별 토글 및 로컬 저장
- 보상형 광고 1회 부활 로직 내장
- 앱인토스 업로드용 `toss-package/` 패키지 루트 추가
- 600x600 아이콘, 가로 썸네일, 출시 문안 초안 추가

## Key files

- 게임 화면 구조: `/Users/user/TapTapCho/games/sunken-sixway-defense-2/index.html`
- 레이아웃 / Safe Area 스타일: `/Users/user/TapTapCho/games/sunken-sixway-defense-2/style.css`
- 게임 로직 / 광고 / 토스 셸 연동: `/Users/user/TapTapCho/games/sunken-sixway-defense-2/game.js`
- 토스 브리지 소스: `/Users/user/TapTapCho/games/sunken-sixway-defense-2/toss-bridge-source.js`
- 토스 브리지 번들: `/Users/user/TapTapCho/games/sunken-sixway-defense-2/toss-bridge.js`
- 토스 패키지 설정: `/Users/user/TapTapCho/games/sunken-sixway-defense-2/toss-package/granite.config.ts`
- 토스 웹 번들 스크립트: `/Users/user/TapTapCho/games/sunken-sixway-defense-2/toss-package/scripts/build-web.mjs`
- 토스 제출 문안 초안: `/Users/user/TapTapCho/games/sunken-sixway-defense-2/TOSS_LAUNCH_PACK.md`
- 앱인토스 아이콘 원본: `/Users/user/TapTapCho/games/sunken-sixway-defense-2/appintos-logo-600.svg`
- 앱인토스 썸네일 원본: `/Users/user/TapTapCho/games/sunken-sixway-defense-2/appintos-thumbnail-1932x828.svg`

## Build for Toss

```bash
cd /Users/user/TapTapCho/games/sunken-sixway-defense-2/toss-package
TOSS_APP_NAME="sunkendefense2" npm run build:web
TOSS_APP_NAME="sunkendefense2" npm run build
```

실제 업로드 직전에는 아래 값을 토스 개발자센터와 정확히 맞춰야 합니다.

- `TOSS_APP_NAME`
- `TOSS_BRAND_DISPLAY_NAME`
- `TOSS_BRAND_ICON_URL`

## Before shipping in Toss

1. 토스 개발자센터의 실제 `appName`과 `.ait` 내부 `appName`이 정확히 같은지 확인합니다.
2. 개발자센터 아이콘과 `brand.icon`이 같은 HTTPS PNG URL을 가리키는지 확인합니다.
3. QR 테스트에서 세로 고정, 종료 모달, 광고 보상 부활, 백그라운드 복귀를 확인합니다.
4. `.ait` 생성 뒤 `strings -n 6 <file>.ait | rg "appName|displayName|static.toss.im/appsintoss"`로 이름/아이콘 반영을 확인합니다.
