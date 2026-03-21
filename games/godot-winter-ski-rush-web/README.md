# Winter Ski Rush

Last updated: 2026-03-19

## Overview

`Winter Ski Rush`는 Godot Web Export 기반의 세로형 다운힐 타임어택 게임입니다.

이 폴더는 일반 웹 미리보기용 export 산출물을 그대로 두는 대신, 토스 미니앱 심사 기준으로 바로 점검할 수 있게
전체 화면 셸, Safe Area 대응, 종료 확인 모달, 토스 브리지 연동까지 붙인 독립 패키지로 정리되어 있습니다.

## Toss release status

현재 기준으로 아래 항목을 반영했습니다.

- `viewport-fit=cover` + Safe Area 대응
- 토스 앱 세로 고정
- iOS 스와이프 뒤로가기 비활성화
- 토스 뒤로가기 이벤트를 종료 확인 모달로 연결
- `getUserKeyForGame()` 기반 사용자별 기록 저장 경로 분리
- 브라우저 미리보기용 fallback 저장 유지
- BGM / 효과음 개별 토글
- `visibilitychange`, `pagehide`, `homeEvent` 기반 자동 일시정지
- 안내 모달 / 정책 링크 / 종료 모달 분리
- Godot canvas를 토스용 독립 화면 셸 안에서 고정 비율로 렌더링

## Key files

- 토스 출시용 셸 HTML: `/Users/user/TapTapCho/godot-winter-ski-rush-web/index.html`
- 풀스크린 / Safe Area / 모달 스타일: `/Users/user/TapTapCho/godot-winter-ski-rush-web/style.css`
- 토스 런타임 / 모달 / pause 처리: `/Users/user/TapTapCho/godot-winter-ski-rush-web/toss-runtime.js`
- 토스 브리지 소스: `/Users/user/TapTapCho/godot-winter-ski-rush-web/toss-bridge-source.js`
- 토스 브리지 번들: `/Users/user/TapTapCho/godot-winter-ski-rush-web/toss-bridge.js`
- 토스 제출 문구 / QR 체크리스트: `/Users/user/TapTapCho/godot-winter-ski-rush-web/TOSS_LAUNCH_PACK.md`
- 광고 보류 메모: `/Users/user/TapTapCho/godot-winter-ski-rush-web/TOSS_ADS_PLAN.md`
- Godot 게임 로직 원본: `/Users/user/TapTapCho/godot-winter-ski-rush/scenes/main/Main.gd`

## Before shipping in Toss

출시 전 최종 체크는 아래 순서로 진행하면 됩니다.

1. 토스 콘솔 QR 테스트에서 세로 고정, 종료 모달, 백그라운드 일시정지, 기록 저장을 확인합니다.
2. 실제 배포 주소 기준 CORS 허용 Origin 을 다시 확인합니다.
3. 앱 소개 문구, 썸네일, 연령 등급, 정책 링크를 심사 제출 정보와 맞춥니다.
4. 압축 해제 기준 번들 크기가 토스 미니앱 제한 안에 들어오는지 확인합니다.

## Ads status

2026-03-19 현재 광고는 아직 붙이지 않았습니다.

- 출시 초기 버전은 광고 UI 없이 운영합니다.
- 현재 게임 흐름은 자동 체크포인트 복귀가 있어서 광고 위치를 섣불리 넣지 않는 편이 안전합니다.
- 사업자 등록, 정산 심사, 광고 그룹 생성 이후에 선택적 리워드 광고를 다시 검토합니다.
- 세부 계획은 `/Users/user/TapTapCho/godot-winter-ski-rush-web/TOSS_ADS_PLAN.md`를 기준으로 유지합니다.

## References

- 게임 출시 가이드: https://developers-apps-in-toss.toss.im/checklist/app-game.html
- 미니앱 출시: https://developers-apps-in-toss.toss.im/development/deploy.html
- 게임 로그인 (`getUserKeyForGame`): https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%EA%B2%8C%EC%9E%84/getUserKeyForGame.html
- Safe Area 여백 값 구하기: https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%ED%99%94%EB%A9%B4%20%EC%A0%9C%EC%96%B4/safe-area.html
- `setIosSwipeGestureEnabled`: https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%ED%99%94%EB%A9%B4%20%EC%A0%9C%EC%96%B4/setIosSwipeGestureEnabled.html
- `setDeviceOrientation`: https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%ED%99%94%EB%A9%B4%20%EC%A0%9C%EC%96%B4/setDeviceOrientation.html
- `closeView`: https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%ED%99%94%EB%A9%B4%20%EC%A0%9C%EC%96%B4/closeView.html
