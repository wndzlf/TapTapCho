# Zigzag Memory Run

Last updated: 2026-03-19

## Overview

`Zigzag Memory Run`은 라운드마다 잠깐 보여주는 좌우 경로를 기억한 뒤 같은 순서로 복기하는 메모리 퍼즐 게임입니다.

이 폴더는 일반 웹 페이지 버전이 아니라, 토스 미니앱 출시 기준으로 바로 점검할 수 있는 독립 게임 패키지로 정리되어 있습니다.

## Toss release status

현재 기준으로 아래 항목을 반영했습니다.

- 풀스크린 단독 게임 화면 구성
- `viewport-fit=cover` + Safe Area 대응
- 토스 앱 세로 고정
- iOS 스와이프 뒤로가기 비활성화
- 토스 뒤로가기 이벤트를 종료 확인 모달로 연결
- `getUserKeyForGame()` 기반 사용자별 저장소 분리
- 브라우저 미리보기용 `localStorage` fallback 유지
- BGM / 효과음 개별 토글
- `visibilitychange`, `pagehide`, `homeEvent` 기반 자동 일시정지
- 게임 안내 / 정책 링크 / 종료 모달 분리

## Key files

- Toss 출시용 화면 구조: `/Users/user/TapTapCho/zigzag-memory-run/index.html`
- Safe Area / 풀스크린 스타일: `/Users/user/TapTapCho/zigzag-memory-run/style.css`
- 게임 로직 / 저장 / 백그라운드 처리: `/Users/user/TapTapCho/zigzag-memory-run/game.js`
- 토스 브리지 소스: `/Users/user/TapTapCho/zigzag-memory-run/toss-bridge-source.js`
- 토스 브리지 번들: `/Users/user/TapTapCho/zigzag-memory-run/toss-bridge.js`
- 토스 제출 문구 / QR 체크리스트: `/Users/user/TapTapCho/zigzag-memory-run/TOSS_LAUNCH_PACK.md`
- 광고 보류 메모: `/Users/user/TapTapCho/zigzag-memory-run/TOSS_ADS_PLAN.md`

## Before shipping in Toss

출시 전 최종 체크는 아래 순서로 진행하면 됩니다.

1. 토스 콘솔 QR 테스트에서 세로 고정, 종료 모달, 저장, 백그라운드 복귀를 확인합니다.
2. 실제 배포 주소 기준 CORS 허용 Origin 을 다시 확인합니다.
3. 앱 소개 문구, 썸네일, 연령 등급, 정책 링크를 심사 제출 정보와 맞춥니다.
4. 번들 크기가 토스 미니앱 제한 안에 들어오는지 확인합니다.

## Ads status

2026-03-19 현재 광고는 아직 붙이지 않았습니다.

- 출시 초기 버전은 광고 UI 없이 운영합니다.
- 사업자 등록, 정산 심사, 광고 그룹 생성 이후에 보상형 광고를 우선 검토합니다.
- 세부 계획은 `/Users/user/TapTapCho/zigzag-memory-run/TOSS_ADS_PLAN.md`를 기준으로 유지합니다.

## References

- 게임 출시 가이드: https://developers-apps-in-toss.toss.im/checklist/app-game.html
- 미니앱 출시: https://developers-apps-in-toss.toss.im/development/deploy.html
- 게임 로그인 (`getUserKeyForGame`): https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%EA%B2%8C%EC%9E%84/getUserKeyForGame.html
- Safe Area 여백 값 구하기: https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%ED%99%94%EB%A9%B4%20%EC%A0%9C%EC%96%B4/safe-area.html
- 인앱광고 개발하기: https://developers-apps-in-toss.toss.im/ads/develop.html
