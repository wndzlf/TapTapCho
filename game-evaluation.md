# Game Evaluation Board

Last Updated: 2026-02-26
Source of truth: this file is the baseline for future game-improvement answers.

## Rules
- Score range: 0-100
- Status:
  - `LIVE`: keep exposed on homepage
  - `REMOVE`: hide from homepage (can be fixed and re-evaluated later)
- Update this table whenever new user feedback arrives.

## Evaluation Table

| Game | Score | Status | Mobile Fit | Reason | Improvement Action (Next) |
|---|---:|---|---|---|---|
| AirStrikerLite | 70 | LIVE | GOOD | 재밌지만 보스/후반 난이도 상승이 약함 | 보스 페이즈 + 웨이브 난이도 곡선 + 패턴 다양화 |
| Lane Runner | 30 | LIVE | GOOD | 너무 단순하고 난이도 조절이 없음 | 속도/패턴 기반 난이도 스케일 + 장애물 다양화 |
| Neon Snake | 40 | LIVE | FAIR | 재밌지만 너무 단순함 | 장애물/파워업/미션 모드 추가 |
| Worm Arena Rush | 60 | LIVE | GOOD | 재밌지만 다양성이 부족함 | 특수 먹이, 부스트 리스크, 이벤트 존 추가 |
| Drift One-Tap | 0 | REMOVE | FAIR | 코어 재미가 약하고 반복성이 높음 | 트랙 이벤트/리스크-리워드/스킬 보정 추가 후 재평가 |
| Neon Bubble Shooter | 0 | REMOVE | POOR | 의도/조작 목적이 불명확함 | 코어 루프 재설계 후 재출시 |
| Retro Village 3D | 0 | REMOVE | POOR | 동작 안 함, 이동 불가, 의도 불명확 | 기본 이동/카메라/목표 먼저 복구 |
| Neon Village (Godot) | 0 | REMOVE | POOR | 동작 안 함, 이동 불가 | 입력/물리/웹 export 안정화 후 재평가 |
| Urban Village (Godot) | 0 | REMOVE | POOR | 동작/의도 전달 부족, 플레이 동기 약함 | 이동 안정화 + 목표/피드백 루프 추가 후 재평가 |

## Removed From Homepage
- Drift One-Tap (`webgame-15`)
- Neon Bubble Shooter (`webgame-33`)
- Retro Village 3D (`webgame-8`)
- Neon Village (Godot) (`godot-platformer-web`)
- Urban Village (Godot) (`godot-urban-maze-web`)

## Priority Backlog
1. AirStrikerLite 고도화: 보스 + 웨이브 스케일링
2. Worm Arena Rush 다양화: 특수 아이템/위험 구역
3. Lane Runner 개선: 난이도 곡선 + 패턴 다양화
4. Neon Snake 확장: 모드/목표/위험 요소
5. 0점 게임은 재작업 후 재평가 전까지 비노출 유지

## Change Log
- 2026-02-26: Initial board created from user-provided sample scores.
- 2026-02-26: Added mobile-fit column. Updated Urban Village=0, Drift One-Tap=0, Lane Runner=30.
