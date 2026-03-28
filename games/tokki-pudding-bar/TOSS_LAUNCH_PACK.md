# Tokki Pudding Bar - TOSS Launch Pack

## 1) 필수 값 확정

- `TOSS_APP_NAME`: 토스 개발자센터 앱 `appName`과 동일
- `TOSS_BRAND_DISPLAY_NAME`: 콘솔 표기명과 동일
- `TOSS_BRAND_ICON_URL`: `https://` PNG URL, 콘솔 아이콘과 동일 파일

기본값은 아래와 같이 잡아둡니다.

- `TOSS_APP_NAME`: `tokki-pudding-bar`
- `TOSS_BRAND_DISPLAY_NAME`: `토끼푸딩 바`
- 기본 아이콘 URL:
  `https://raw.githubusercontent.com/wndzlf/TapTapCho/main/games/tokki-pudding-bar/appintos-logo-600.png`

## 2) 아이콘 산출물

- 원본: `/Users/user/TapTapCho/games/tokki-pudding-bar/appintos-logo-600.svg`
- PNG: `/Users/user/TapTapCho/games/tokki-pudding-bar/appintos-logo-600.png`

## 3) 썸네일 산출물

- 원본: `/Users/user/TapTapCho/games/tokki-pudding-bar/appintos-thumbnail-1932x828.svg`
- PNG: `/Users/user/TapTapCho/games/tokki-pudding-bar/appintos-thumbnail-1932x828.png`

## 4) 스크린샷 산출물

- `/Users/user/TapTapCho/games/tokki-pudding-bar/appintos-screenshots/portrait-01.png`
- `/Users/user/TapTapCho/games/tokki-pudding-bar/appintos-screenshots/portrait-02.png`
- `/Users/user/TapTapCho/games/tokki-pudding-bar/appintos-screenshots/portrait-03.png`
- `/Users/user/TapTapCho/games/tokki-pudding-bar/appintos-screenshots/landscape-01.png`

## 5) 개발자센터 입력 문안

- 부제: `같은 푸딩 합체 퍼즐`
- 상세 설명:
  `사용자는 화면 상단에서 다음 푸딩을 확인하고, 좌우로 위치를 맞춘 뒤 손을 떼어 푸딩을 잔 안에 떨어뜨립니다. 같은 종류의 푸딩이 닿으면 더 큰 푸딩으로 합체되고 점수가 오릅니다. 잔이 넘치기 전에 연쇄 합체를 이어가며 최고 기록에 도전할 수 있습니다. 필요하면 BGM 버튼으로 소리를 끄고, 집중 버튼으로 게임 화면을 더 크게 볼 수 있습니다.`
- 앱 검색 키워드:
  `푸딩퍼즐, 합체퍼즐, 머지게임, 드롭퍼즐, 캐주얼게임, 한손게임, 토끼게임`

## 6) 번들 빌드

```bash
cd /Users/user/TapTapCho/games/tokki-pudding-bar/toss-package
TOSS_APP_NAME="tokki-pudding-bar" \
TOSS_BRAND_DISPLAY_NAME="토끼푸딩 바" \
TOSS_BRAND_ICON_URL="https://raw.githubusercontent.com/wndzlf/TapTapCho/main/games/tokki-pudding-bar/appintos-logo-600.png" \
npm run build:web && npm run build
```

## 7) 업로드 직전 문자열 검증

```bash
cd /Users/user/TapTapCho/games/tokki-pudding-bar/toss-package
strings -n 6 tokki-pudding-bar.ait | rg "appName|displayName|raw.githubusercontent.com|static.toss.im/appsintoss"
```

검증 시 아래 값이 원하는 값으로 보여야 합니다.

- `appName`
- `displayName`
- `brand.icon` URL

## 8) 권장 제출 문안 초안

- 서비스 유형: 세로형 캐주얼 머지 퍼즐 게임
- 핵심 플레이: 같은 푸딩을 떨어뜨려 합체시키고 잔이 넘치기 전에 최대 점수 달성
- 주요 요소: 한 손 조작, 연쇄 합체, 최고 기록 저장, BGM on/off, 집중 모드
- 조작: 드래그 위치 조정 후 손을 떼어 드롭

## 9) 광고/수익화 제안

- 출시 직후에는 광고를 바로 넣지 말고, 심사 통과와 초기 리텐션 확인을 우선합니다.
- 1차 권장 시점:
  `D7 리텐션이 15% 이상`이거나 `유저당 평균 3판 이상 플레이`가 보이면 보상형 광고를 검토합니다.
- 첫 도입 형식:
  `라운드 종료 후 선택형 보상 광고 1회 이어하기`가 가장 안전합니다.
- 피해야 할 초기안:
  게임 시작 직후 전면 광고, 판마다 강제 전면 광고, 초반 3판 안의 광고 노출
- 이유:
  짧은 세션 캐주얼 퍼즐은 초반 이탈이 빠르기 때문에, 보상형 광고부터 넣어야 리텐션 훼손이 덜합니다.
- 2차 확장 시점:
  보상형 광고의 완료율과 이어하기 사용률이 안정적이면, `3~4판마다 1회` 수준의 전면 광고를 테스트합니다.

## 10) 제출 체크

- 토스 콘솔의 실제 `appName`과 `.ait` 내부 `appName` 일치
- 토스 콘솔 표기명과 `brand.displayName` 일치
- 토스 콘솔 아이콘과 `brand.icon` URL이 같은 PNG인지 확인
- 개발자센터/소개 이미지에 사용할 가로형 썸네일 `1932x828` PNG 준비 여부 확인
- 아이콘 URL이 실제 접근 가능한 `https://` 주소인지 확인
