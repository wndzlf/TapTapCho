# TapTapCho

웹 기반 하이퍼 캐주얼 게임 컬렉션 플랫폼입니다.  
목표는 `빠른 프로토타이핑`에서 `상업화 가능한 게임 플랫폼`으로 전환하는 것입니다.

## 1) 프로젝트 개요
- 플랫폼 형태: 단일 게임 목록 페이지 + 개별 게임 페이지
- 기술 스택: Vanilla JS/HTML5 Canvas + Godot Web Export
- 플레이 타겟: 모바일 터치 중심, 3~5분 세션
- 운영 구조: 싱글 + 일부 멀티(웹소켓 서버)

## 2) 현재 상태 요약 (외부 리뷰 반영)
1. 게임성 편차가 큼 (상위 소수 외 대부분 리워크 필요)
2. 독창성 부족 (클론 성향, 차별화 약함)
3. 수익화 준비 미흡 (광고/리워드 루프 체계 부족)
4. 기술/운영 표준화 부족 (성능/장애 복구/QA 체계 보완 필요)
5. 유저 인게이지먼트 장치 부족 (리텐션/공유/재방문 설계 약함)

상세 평가 체계와 점수는 `/Users/user/TapTapCho/game-evaluation.md` 기준으로 관리합니다.

## 2-1) 콘텐츠 심사 통과 운영 모드 (2026-03-14 적용)
- 메인 노출: 상위 12개 게임만 큐레이션 노출
- 하위 게임: 임시 숨김 처리(코드 보존)
- 게임 페이지: 각 노출 게임마다 고유 텍스트 블록(목표/조작/공략/업데이트/FAQ) 제공
- 공통 신뢰 페이지: About / Contact / Privacy / Terms / Copyright-DMCA 제공
- 광고 유도성 UI: `apply ads` 슬롯 및 AdSense 스크립트 제거
- 재검토 일정: `2026-03-28 ~ 2026-04-04` 운영 데이터 기반 재평가

## 3) 빠른 실행

```bash
cd /Users/user/TapTapCho
python3 -m http.server 8080
```

브라우저: `http://localhost:8080`

## 4) 로컬 멀티/랭킹 서버

의존성 설치:

```bash
cd /Users/user/TapTapCho
npm install
```

Sunken 멀티 + 싱글 랭킹 서버:

```bash
npm run sunken-multi-server
```

Worm LAN 서버:

```bash
npm run worm-lan-server
```

## 5) 개발 운영 원칙
1. 점수표 우선: `game-evaluation.md` 기준으로만 개선 우선순위 결정
2. 집중 개발: 동시 집중 게임은 최대 2~3개
3. 모바일 우선: 터치 정확도/가독성/시야 가림을 최우선 검증
4. PC와 모바일 최적화 분리: 모바일 경량화가 PC 품질에 영향 주지 않게 유지
5. 문서 일원화: 평가/우선순위/라이선스는 단일 문서 기준으로 관리

## 6) 수익화 전환 체크리스트
- [ ] 상위 게임 2개를 GQS 70+로 안정화
- [ ] 공통 텔레메트리(세션/이탈/재시도) 도입
- [ ] 광고/리워드 지점 정의 및 A/B 테스트 계획 수립
- [ ] 서버 장애 복구/데이터 보존 운영 규칙 확정
- [ ] 외부 에셋 라이선스 최종 검수

## 7) 핵심 문서
- 평가표/우선순위: `/Users/user/TapTapCho/game-evaluation.md`
- 외부 에셋 라이선스: `/Users/user/TapTapCho/THIRD_PARTY_LICENSES.md`
- 병렬 작업 가이드: `/Users/user/TapTapCho/agent.md`
- 아이디어/진행 상태: `/Users/user/TapTapCho/checklist.md`
- BMGD 도입/사용 기록: `/Users/user/TapTapCho/docs/bmad-game-dev-studio.md`
- 서비스 정책 페이지: `/Users/user/TapTapCho/about.html`, `/Users/user/TapTapCho/contact.html`, `/Users/user/TapTapCho/privacy.html`, `/Users/user/TapTapCho/terms.html`, `/Users/user/TapTapCho/dmca.html`

## 8) 라이선스
외부 에셋/음원 사용 조건은 `THIRD_PARTY_LICENSES.md`를 단일 기준으로 따릅니다.
