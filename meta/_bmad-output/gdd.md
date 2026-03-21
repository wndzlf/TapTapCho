# Winter Ski Rush - Game Design Document

**Author:** User  
**Game Type:** Downhill Time-Attack / Hyper Casual Ski  
**Target Platform(s):** Web Browser (Desktop + Mobile Touch)

---

## Executive Summary

### Core Concept

`Winter Ski Rush`는 탑다운(Top-Down) 시점의 2D 다운힐 스키 타임어택 게임이다.  
플레이어는 눈길 코스를 내려오면서 장애물을 회피하고 체크포인트를 통과해 최종 골인 시간을 단축한다.

핵심은 아래 3가지다.
- 즉시 이해되는 4키 조작(Left/Right/Brake/Boost)
- 위험/보상 구조의 쇼트컷 선택
- 충돌/코스 이탈을 관리하며 완주 기록 단축

### Target Audience

- 설치 없이 바로 플레이하려는 웹 캐주얼 유저
- 3~8분 세션의 짧은 타임어택을 선호하는 유저
- 모바일 터치 조작 기반의 직관형 아케이드 선호층

### Unique Selling Points (USPs)

- 코스 길이 확장형(긴 러닝 코스) + 다중 체크포인트(20개)로 짧지만 밀도 있는 진행
- 쇼트컷 발견/활용으로 리플레이 동기를 만드는 위험-보상 설계
- 코스 이탈 시 시각 경고(텍스트 최소, 동작 중심 피드백) 기반의 직관 UI

---

## Goals and Context

### Project Goals

- 하이퍼 캐주얼 다운힐 장르에서 “즉시 플레이 가능 + 재도전 욕구”를 확보한다.
- 모바일에서도 조작 오입력 없이 완주 가능한 UX 품질을 확보한다.
- TapTapCho 메인 플랫폼 상위 노출 타이틀로서 세션 길이/재시도 지표를 견인한다.

### Background and Rationale

프로젝트 내 게임 중 반응이 좋은 장르는 “짧은 학습 비용 + 즉시 몰입” 성격이 강하다.  
`Winter Ski Rush`는 그 방향에 맞춰 텍스트 설명을 줄이고, 조작/피드백/코스 리듬으로 재미를 전달한다.

---

## Core Gameplay

### Game Pillars

- **즉시 조작성:** 시작 직후 좌우 조향/속도 제어가 바로 체감되어야 한다.
- **리듬감 있는 회피:** 장애물 배치 밀도와 코스 굴곡으로 지속적인 판단을 유도한다.
- **위험-보상 선택:** 쇼트컷은 빠르지만 더 어렵고 리스크가 커야 한다.
- **짧은 실패, 빠른 재도전:** 체크포인트 리스폰으로 재시도 마찰을 낮춘다.
- **모바일 우선 가독성:** 플레이 핵심 HUD와 입력 영역이 충돌하지 않아야 한다.

### Core Gameplay Loop

1. START 입력 후 즉시 출발
2. 코스 진행 중 좌우 조향 + Brake/Boost로 속도 제어
3. 체크포인트 통과 및 쇼트컷 선택
4. 충돌/이탈 시 패널티 후 리스폰
5. 골인 타임 기록 갱신
6. 더 빠른 완주를 목표로 재도전

### Win/Loss Conditions

- **Win:** FINISH 라인 통과 후 기록 저장
- **Soft Loss:** 충돌/이탈로 시간 손실 및 리스폰 발생
- **Run Failure Pattern:** 연속 충돌로 체감 진행이 끊기면 사실상 런 포기 유도

---

## Game Mechanics

### Primary Mechanics

- **다운힐 물리:** `gravity * slope - friction` 기반 전진 속도 갱신
- **조향:** 좌/우 입력으로 횡속도 제어, 지면 상태(얼음/눈)별 조향 계수 변화
- **속도 제어:** Brake로 감속, Boost(Crouch)로 가속
- **트랙 판정:** 메인 코스 + 쇼트컷 밴드(속도 보너스) 영역 계산
- **코스 이탈 위험:** 트랙 외부 거리/속도 임계치 초과 시 크래시
- **장애물 충돌:** 나무/바위와 충돌 시 시간 패널티 + 리스폰
- **체크포인트:** 총 20개, 통과 시 리스폰 기준 갱신
- **난이도 모드:** Easy/Normal(중력, 장애물 밀도, 패널티, 코스 폭 등 차등)

### Controls and Input

- **Desktop**
  - Left: `A` / `←`
  - Right: `D` / `→`
  - Brake: `S` / `↓`
  - Boost: `Shift`
  - Restart: `R` / `Enter`
- **Mobile**
  - 터치 버튼: `LEFT`, `RIGHT`, `BRAKE`, `BOOST`
  - 터치 스티어: 드래그 기반 조향 보조

### Downhill-Specific Systems

- **Track Curvature System:** 세그먼트별 코스 곡률 변화 + 주기적 와블
- **Shortcut Spec System:** 위치/폭/보너스/난도 파라미터로 쇼트컷 튜닝
- **Off-Track Warning System:** 코스 이탈 시 상단 경고 강조(텍스트 최소)

---

## Progression and Balance

### Player Progression

- 메타 성장보다 “실력 성장” 중심
- 반복 플레이를 통해 다음 능력이 향상되도록 설계:
  - 코스 선행 읽기
  - 브레이크 타이밍
  - 쇼트컷 성공률
  - 충돌 최소화

### Difficulty Curve

- 초반: 코스 폭 넓고 장애물 간격 큼
- 중반: 곡률 증가, 장애물 밀도 증가, 쇼트컷 유혹 증가
- 후반: 고속 구간 + 혼합 장애물 + 이탈 리스크 확대

`Easy`는 완주 안정성, `Normal`은 기록 단축 난도를 목표로 조정한다.

### Economy and Resources

- 런타임 화폐/상점 없음 (순수 타임어택 구조)
- 리소스는 사실상 “시간”과 “실수 허용치”

---

## Level Design Framework

### Level Types

- 단일 롱 코스(Time Trial Track) 기반
- 코스 내부를 구간(Section)으로 나누어 체감 난도를 단계화:
  - S1: 워밍업
  - S2: 리듬 회피
  - S3: 쇼트컷 구간
  - S4: 고속 압박
  - S5: 피니시 집중 구간

### Level Progression

- 전체 코스 길이는 장기 러닝 세션을 지원하도록 확장 유지
- 체크포인트 20개를 기준으로 진행 피드백을 촘촘하게 제공
- 코스 재생성/변형 파라미터를 통해 반복 플레이 시 신선도 유지

---

## Art and Audio Direction

### Art Style

- 미니멀 2D 스노우 필드 + 가독성 우선 색상 대비
- 플레이 우선 원칙:
  - 트랙/비트랙 시각 분리
  - 장애물 인지 우선
  - 캐릭터 위치 상단 편향 카메라로 선행 시야 확보

### Audio and Music

- BGM: `winter-ski-rush-pixabay-286213.mp3` 루프 재생
- SFX:
  - 브레이크 입력: `winter-ski-rush-brake-pixabay-46042.mp3`
  - 조향 입력: `winter-ski-rush-left-right-sfx.mp3`
  - 주행 루프: `winter-ski-rush-normal-ski-loop.mp3`
- 오디오 저작권 고지는 `/Users/user/TapTapCho/THIRD_PARTY_LICENSES.md` 기준 관리

---

## Technical Specifications

### Performance Requirements

- Desktop: 안정 60 FPS 목표
- Mobile: 실사용 30 FPS 이상 유지, 입력 지연 최소화
- Web 로딩: 첫 진입 체감 5초 내 시작 가능 구간 목표

### Platform-Specific Details

- 엔진: Godot 4.x
- 배포: HTML5 Export (`godot-winter-ski-rush-web`)
- 저장: `user://winter_ski_rush.save` (best_time, best_style)
- 모바일 브라우저 오디오 정책 대응: 첫 사용자 입력 후 BGM 시작

### Asset Requirements

- 현재: 프로시저럴/단순 도형 기반 렌더 중심
- 품질 상향 필요 자산:
  - 스키어 캐릭터 스프라이트 세트(상태별)
  - 장애물/코스 데칼 다양화(빙판, 눈더미, 표지물)
  - 충돌/가속/체크포인트 시각효과(파티클)
  - UI 아이콘 세트(텍스트 의존도 축소 목적)

---

## Development Epics

### Epic Structure

1. **EPIC-WSR-01: Core Feel Stabilization**
   - 4버튼 입력 체계 고정
   - 속도/조향 감각 튜닝
   - 충돌/리스폰 피드백 다듬기

2. **EPIC-WSR-02: Track & Difficulty Expansion**
   - 코스 구간 다양화
   - Easy/Normal 난도 차이를 명확한 플레이 체감으로 정렬
   - 쇼트컷 위험-보상 밸런스 고도화

3. **EPIC-WSR-03: Mobile-First UX Polish**
   - HUD 단순화(핵심 정보만 표기)
   - 버튼 가독성/겹침/오터치 문제 제거
   - 플레이어 시야 확보 카메라 세팅 고정

4. **EPIC-WSR-04: Content & Feedback Upgrade**
   - VFX/SFX 세분화
   - 비주얼 다양성 추가(코스 환경 변화)
   - 반복 플레이 동기 강화 요소 적용

---

## Success Metrics

### Technical Metrics

- 모바일 프레임 드랍 이슈 제보율 감소
- 입력 누락/오입력 재현율 감소
- 리스폰 이후 진행 중단(이탈) 비율 감소

### Gameplay Metrics

- 평균 세션 시간 5분 이상
- 1세션 평균 재시도 3회 이상
- 체크포인트 20개 중 12개 이상 도달 사용자 비율 상승
- 골인 완주율 및 베스트타임 갱신율 상승

---

## Out of Scope

- 멀티플레이 경쟁 모드
- 대형 메타경제(상점/강화/재화)
- 복잡한 스토리/퀘스트 구조
- 3D 전환

---

## Assumptions and Dependencies

- Godot Web Export 파이프라인이 지속적으로 유지 가능해야 한다.
- 모바일 오디오 정책(사용자 제스처 선행)이 브라우저별로 허용되어야 한다.
- 외부 음원/효과음 라이선스 고지가 항상 최신 상태여야 한다.
- TapTapCho 메인 허브에서 썸네일/노출 순서가 유지되어야 유입 데이터가 안정화된다.
