# 카세트 A/B 월드 (Cassette A/B World)

이 프로젝트의 실제 작업 경로는 `/games/cassette-ab-world` 입니다.

- 루트 경로 `/cassette-ab-world` 는 호환성 symlink 입니다.
- 토스 브리지 소스: `/games/cassette-ab-world/toss-bridge-source.js`
- 토스 패키지 루트: `/games/cassette-ab-world/toss-package`
- 핵심 지향점: 텍스트 설명보다 즉각적인 조작과 시각 피드백으로 플레이를 이해하도록 설계

## 플레이 구조

- 한 판은 `59초` 입니다.
- 탭 한 번으로 A/B 월드가 전환됩니다.
- 현재 월드와 같은 게이트에 닿으면 종료됩니다.
- 토스 광고 환경에서는 보상형 광고로 라운드당 1회 이어달리기를 사용할 수 있습니다.
