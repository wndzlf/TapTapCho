# Winter Ski Rush Toss Ads Notes

Last checked: 2026-03-19

## Current status

- 인앱 광고는 아직 구현하지 않았습니다.
- 현재 단계에서는 심사 통과와 플레이 흐름 안정화가 우선이라 광고 UI를 넣지 않습니다.
- 사업자 등록과 광고 그룹 준비가 끝나기 전까지는 실제 광고 플로우를 호출하지 않습니다.

## What we confirmed from Toss docs

### 1. 인앱 광고는 콘솔 준비가 먼저 필요합니다

- 사업자 등록, 정산 정보 입력, 광고 그룹 생성이 선행돼야 합니다.
- 광고 그룹 ID 는 생성 직후 바로 반영되지 않을 수 있습니다.

Sources:
- [사업자 등록](https://developers-apps-in-toss.toss.im/prepare/register-business.html)
- [광고 콘솔 가이드](https://developers-apps-in-toss.toss.im/ads/console.html)

### 2. 사용 가능한 광고 유형

토스는 아래 광고 유형을 지원합니다.

- 전면 광고
- 보상형 광고
- 배너 광고

현재 `Winter Ski Rush` 흐름에는 광고를 아직 넣지 않는 편이 자연스럽습니다.

이유:

- 런 도중에는 체크포인트 복귀가 자동이라 광고 끼워 넣을 지점이 애매합니다.
- 풀스크린 플레이 비중이 커서 배너는 조작 시야를 해치기 쉽습니다.

Source:
- [광고 소개](https://developers-apps-in-toss.toss.im/ads/intro.html)

### 3. 신규 연동 권장 경로

- 신규 연동은 `In-App Ads 2.0 ver2` 기준이 권장됩니다.
- 구 AdMob 전용 흐름보다는 통합 SDK 기준으로 맞추는 편이 안전합니다.

Source:
- [광고 개발 가이드](https://developers-apps-in-toss.toss.im/ads/develop.html)

### 4. 전면/보상형 구현 규칙

- 로드 순서는 항상 `load -> show -> 다음 load` 입니다.
- 보상 지급은 `userEarnedReward` 이벤트에서만 처리해야 합니다.

Sources:
- [광고 개발 가이드](https://developers-apps-in-toss.toss.im/ads/develop.html)
- [showAppsInTossAdMob 레퍼런스](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%EA%B4%91%EA%B3%A0/showAppsInTossAdMob.html)

### 5. 테스트 ID

개발 중에는 테스트 ID 만 사용해야 합니다.

- 전면형: `ait-ad-test-interstitial-id`
- 리워드: `ait-ad-test-rewarded-id`
- 배너 리스트: `ait-ad-test-banner-id`
- 배너 피드: `ait-ad-test-native-image-id`

Sources:
- [광고 소개](https://developers-apps-in-toss.toss.im/ads/intro.html)
- [광고 개발 가이드](https://developers-apps-in-toss.toss.im/ads/develop.html)

### 6. 샌드박스 제한

- 샌드박스 앱에서는 광고가 동작하지 않습니다.
- 광고 테스트는 콘솔 QR 흐름으로 해야 합니다.

Source:
- [광고 개발 가이드](https://developers-apps-in-toss.toss.im/ads/develop.html)

### 7. 광고 중 사운드 처리

- 광고 재생 중에는 앱 사운드를 멈춰야 합니다.
- 광고 종료 후에는 사운드를 자연스럽게 복귀시켜야 합니다.

현재 토스 런타임 셸에서 이미 일시정지와 사운드 토글 구조를 분리해 둬서 나중에 연결하기 좋습니다.

Source:
- [광고 소개](https://developers-apps-in-toss.toss.im/ads/intro.html)

## Best plan for Winter Ski Rush

### Phase 1: 광고 없이 출시

현재 가장 안전한 선택:

- 광고 없는 버전으로 심사 제출
- 조작감, 지름길 난이도, 백그라운드 복귀 안정화 우선

### Phase 2: 완주 후 선택형 보상만 검토

가능성이 있는 지점:

- 완주 결과 화면에서 `광고 보고 보너스 리플레이 챌린지 열기`
- 또는 `광고 보고 고스트 비교 기능 오픈` 같은 비플레이 방해형 선택 보상

이유:

- 런 중간에 광고를 넣지 않아 흐름을 깨지 않음
- 사용자가 직접 선택한 시점에만 진입 가능

### Phase 3: 중간 개입형 광고는 보류

현재는 보류:

- 체크포인트 복귀 직전 광고
- 충돌 직후 광고
- 진입 직후 전면 광고

이 지점들은 게임 템포를 깨거나 심사 시 부정적으로 보일 가능성이 큽니다.

## Planned integration points in this codebase

광고를 붙이게 되면 아래 파일들이 주된 수정 지점입니다.

- `/Users/user/TapTapCho/godot-winter-ski-rush-web/index.html`
  - 결과 모달 또는 별도 보상 진입 버튼 추가
- `/Users/user/TapTapCho/godot-winter-ski-rush-web/toss-runtime.js`
  - 광고 preload/show, pause/resume, 보상 분기 처리
- `/Users/user/TapTapCho/godot-winter-ski-rush-web/toss-bridge-source.js`
  - 광고 API 래퍼 추가
- `/Users/user/TapTapCho/godot-winter-ski-rush-web/toss-bridge.js`
  - 브리지 소스 수정 후 재번들

## TODO after business registration is done

1. 토스 콘솔에서 사업자 등록 완료
2. 정산 정보 심사 완료
3. 광고 그룹 생성
4. 실제 `adGroupId` 저장
5. 선택형 광고 위치 확정
6. 콘솔 QR 테스트 진행
7. 보상 지급 조건과 사운드 pause/resume 재검증

## Decision for now

사업자 등록과 광고 그룹 생성 전까지는:

- 광고 UI 를 넣지 않습니다.
- 이 문서를 기준 메모로 유지합니다.
- 출시 준비는 게임성, 저장, 토스 라이프사이클 대응 중심으로 마무리합니다.
