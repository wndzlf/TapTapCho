# Game Evaluation Board

Last Updated: 2026-02-26
Source of truth: this file is the baseline for future game-improvement answers.

## Rules
- Score range: 0-100
- Status:
  - `LIVE`: keep exposed on homepage
  - `REMOVE`: hide from homepage (can be fixed and re-evaluated later)
- Mobile Fit:
  - `GOOD`: mobile touch play is comfortable
  - `FAIR`: playable but needs UX/input tuning
  - `POOR`: hard to play on mobile
- Scoring policy:
  - User-provided scores are treated as fixed until user updates them.
  - Games without explicit user score are tracked as provisional scores and should be updated after playtest feedback.
  - Every game creation or major gameplay update must include a same-day score check in this file.
  - Category raw score is `1-10`, and total score is calculated by weighted rubric below.

## Weighted Rubric (v2)

Formula:
- `Category Points = (Raw Score / 10) * Weight`
- `Total Score (0-100) = sum(Category Points)`
- Example: Performance raw `9` with weight `20` => `(9/10)*20 = 18`

| Category | Weight | Detailed Checklist | GOOD (8+) Target |
|---|---:|---|---|
| Performance | 20 | FPS (desktop 60+, mobile 30+), loading under 5s (build under 10MB), memory under 200MB | Stable frame + fast load |
| Mobile Fit | 15 | touch control(48px+), multitouch, portrait/landscape adaptation, orientation rotation | iOS/Android Safari/Chrome smooth |
| Gameplay | 25 | fun loop, avg playtime 5m+, difficulty curve, score/enemy fairness | replay 3+ times naturally |
| Graphics/UI | 15 | style consistency, smooth animation, clear HUD/menu, accessibility, responsive scale | attractive but lightweight |
| Audio | 10 | BGM/SE quality, volume balance, WebAudio compatibility, mute/volume options | noticeable immersion gain |
| Stability/Compatibility | 10 | zero crash in repeated tests, browser compatibility, localStorage reliability | cross-platform stable |
| Engagement/Originality | 5 | unique twist beyond clone, social/share/leaderboard potential | clear differentiation |

## Core Games Weighted Breakdown

`Raw` columns are `1-10`.

| Game | Perf | Mobile | Gameplay | Gfx/UI | Audio | Stability | Engage | Total |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| AirStrikerLite | 9 | 8 | 8 | 7 | 7 | 8 | 9 | 80 |
| Lane Runner | 3 | 7 | 2 | 3 | 1 | 2 | 2 | 30 |
| Color Switch Dot | 6 | 5 | 5 | 4 | 3 | 6 | 6 | 50 |
| Neon Snake | 5 | 6 | 3 | 4 | 2 | 4 | 3 | 40 |
| Worm Arena Rush | 6 | 7 | 6 | 6 | 4 | 6 | 7 | 60 |

## Evaluation Table

| Game | Score | Status | Mobile Fit | Reason | Improvement Action (Next) |
|---|---:|---|---|---|---|
| Neon Dodge | 50 | LIVE | GOOD | 가평가: 기본 루프는 명확하나 사용자 피드백 미수집 | 난이도 곡선(속도/패턴) 3단계 추가 |
| Ball Bounce | 50 | LIVE | GOOD | 가평가: 반사 코어는 직관적이나 변주 데이터 부족 | 공속/패들폭/멀티볼 모드 추가 |
| Lane Runner | 30 | LIVE | GOOD | 너무 단순하고 난이도 조절이 없음 | 속도/패턴 기반 난이도 스케일 + 장애물 다양화 |
| Ladder Draw | 50 | LIVE | GOOD | 가평가: 캐주얼성은 있으나 반복 플레이 동기 약함 | 리워드/벌칙 이벤트 세트 확장 |
| Party Roulette | 50 | LIVE | GOOD | 가평가: 즉시성은 좋으나 장기 재미 루프 약함 | 결과별 미니미션/연속 보상 추가 |
| TapTap Tetris | 55 | LIVE | FAIR | 가평가: 퍼즐 재미는 있으나 모바일 조작 최적화 여지 있음 | 모바일 버튼 크기/배치 최적화 + 템포 튜닝 |
| Lane Dash | 50 | LIVE | FAIR | 가평가: 러닝 코어는 있으나 차별화 요소 부족 | 부스터/코인/패턴 테마 분리 |
| Weird Tetris | 48 | LIVE | FAIR | 가평가: 콘셉트는 독특하나 난해함이 큼 | 난이도 단계 분리 + 초반 가이드 힌트 추가 |
| Zigzag Rush | 68 | LIVE | GOOD | 사용자 반응 긍정, 즉시 몰입 포인트가 명확함 | 스피드 램프 + 보상 구간(체크포인트) 추가 |
| Stack Tower | 58 | LIVE | GOOD | 가평가: 타이밍 재미는 안정적이나 콘텐츠 확장 필요 | 블록 타입/리스크 블록 추가 |
| Knife Hit Lite | 70 | LIVE | GOOD | 사용자 반응 긍정, 조작-피드백 루프가 선명함 | 보스 원판/특수 과일 패턴 추가 |
| Color Switch Dot | 50 | LIVE | FAIR | 아이디어는 좋지만 시작 난이도가 높고 미세 컨트롤 부담이 큼 | 초반 속도 완화 + 판정 여유 확대 + 모바일 입력 보정 |
| Helix Fall Mini | 55 | LIVE | GOOD | 가평가: 캐주얼 플레이는 원활하나 패턴 다양성 제한 | 층별 기믹/스코어 배수 구간 추가 |
| Slide Puzzle Rush | 72 | LIVE | GOOD | 사용자 반응 긍정, 퍼즐 흡입력과 반복성이 좋음 | 목표 다양화(제한 이동수/타임어택) 추가 |
| Cross Road Micro | 54 | LIVE | FAIR | 가평가: 타이밍 코어는 명확하나 콘텐츠 볼륨이 작음 | 이동 오브젝트 변주 + 연속 성공 보너스 추가 |
| Orbit Survivor | 52 | LIVE | FAIR | 가평가: 생존 루프는 있으나 후반 다양성 약함 | 이벤트 웨이브 + 파워업 트리 추가 |
| Merge 2048 Tiny | 60 | LIVE | GOOD | 가평가: 기본 퍼즐 몰입도가 준수함 | 목표 모드/장애 타일 추가 |
| Lights Out Rush | 58 | LIVE | GOOD | 가평가: 논리 퍼즐성은 좋으나 난이도 곡선 보강 필요 | 레벨팩/힌트/실수 복구 기능 추가 |
| Zigzag Memory Run | 57 | LIVE | GOOD | 가평가: 기억+반응 조합은 좋으나 긴장 변주 부족 | 패턴 길이 단계화 + 보너스 라운드 추가 |
| Mine Sweep Sprint | 55 | LIVE | FAIR | 가평가: 퍼즐 매력은 있으나 오픈 범위/초반 밸런스 튜닝 필요 | 자동 오픈 범위 축소 + 난이도 프리셋 추가 |
| Neon Snake | 40 | LIVE | FAIR | 재밌지만 너무 단순함 | 장애물/파워업/미션 모드 추가 |
| Worm Arena Rush | 60 | LIVE | GOOD | 재밌지만 다양성이 부족함 | 특수 먹이, 부스트 리스크, 이벤트 존 추가 |
| Worm Arena LAN | 62 | LIVE | FAIR | 로컬 멀티 재미 잠재력은 높지만 접속 UX 부담이 있음 | 방 생성/입장 UX 단순화 + 동기화 안정화 |
| AirStrikerLite | 80 | LIVE | GOOD | 보스 페이즈/패턴/사운드 개선으로 재미가 크게 상승함 | 100점 목표: 보스 2종 추가 + 웨이브 미션/업그레이드 루프 확장 |
| Neon Sudoku | 57 | LIVE | GOOD | 가평가: 퍼즐 완성도는 무난하나 차별점 약함 | 난이도 묶음/데일리 퍼즐 추가 |
| Neon Match-3 | 56 | LIVE | GOOD | 가평가: 장르 친숙성은 좋으나 특수 타일 연계 강화 필요 | 콤보 이펙트 + 목표형 스테이지 추가 |
| Neon Tile Connect | 55 | LIVE | GOOD | 가평가: 규칙은 직관적이나 진행 가속 장치 부족 | 콤보 타이머/특수 연결 규칙 추가 |
| Neon Mahjong Pair | 54 | LIVE | FAIR | 가평가: 퍼즐성은 있으나 모바일 가독성 개선 필요 | 타일 대비/터치 판정 확대 |
| Neon Block Puzzle | 57 | LIVE | GOOD | 가평가: 블록 퍼즐 코어는 안정적 | 미션 목표/연쇄 보너스 시스템 추가 |
| Neon Gravity Drop | 53 | LIVE | FAIR | 가평가: 물리 기반 재미는 있으나 오차 피로도가 있음 | 판정 완화 + 레벨 템포 조절 |
| Neon Lights Out | 55 | LIVE | GOOD | 가평가: 로직 퍼즐 기본기는 양호 | 난이도별 보드 템플릿 확장 |
| Neon Jigsaw | 52 | LIVE | FAIR | 가평가: 퍼즐 의도는 명확하나 반복 동기 약함 | 조각 테마/보상/도전 과제 추가 |
| Neon Word Search | 54 | LIVE | GOOD | 가평가: 모바일 적합성은 높으나 긴장감 요소 약함 | 시간 제한 모드 + 연속 발견 보너스 추가 |
| Neon Solitaire Lite | 53 | LIVE | GOOD | 가평가: 카드 루프는 안정적이나 하이퍼캐주얼성 약함 | 빠른 모드/연속 클리어 보너스 추가 |
| Neon Escape Room | 51 | LIVE | FAIR | 가평가: 탐색 재미 잠재력은 있으나 단서 밀도 보강 필요 | 힌트 구조/퍼즐 연결성 강화 |
| Neon Hidden Object | 50 | LIVE | FAIR | 가평가: 찾기 루프는 명확하나 리텐션 장치 부족 | 스테이지 다양화 + 제한 시간 모드 추가 |

## Priority Backlog
1. AirStrikerLite 100점 목표: 보스/웨이브/패턴/사운드 추가 개선 후 재평가
2. Lane Runner(30점) 코어 고도화: 난이도 곡선 + 장애물 다양화
3. Neon Snake(40점) 확장: 미션/위험 요소/파워업 추가
4. Color Switch Dot(50점) 밸런싱: 초반 완화 + 입력 허용치 개선
5. 신규 편입 게임 1차 실플레이 평가: 가평가 점수를 사용자 피드백 점수로 치환

## Change Log
- 2026-02-26: Initial board created from user-provided sample scores.
- 2026-02-26: Added mobile-fit column. Updated Urban Village=0, Drift One-Tap=0, Lane Runner=30.
- 2026-02-26: Added Color Switch Dot=50 (high starting difficulty, fine-control burden).
- 2026-02-26: Synced evaluation table with all currently exposed games (36 entries) and removed hidden games from the table.
- 2026-02-26: Added weighted rubric(v2), score formula, and core-game category breakdown(1-10 raw scores).
- 2026-02-26: Updated AirStrikerLite score to 80 based on latest user feedback.
