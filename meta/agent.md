# Agent Workflow Guide

## 역할

1. Planner Agent
- `checklist.md`에 후보 게임 추가/우선순위 정리
- 각 게임의 핵심 루프(입력 1개 + 목표 1개) 정의

2. Builder Agents (N개)
- 각자 1개 게임 폴더 전담 (`zigzag-rush`, `stack-tower` ...)
- `index.html` 같은 공유 파일 수정 금지
- 최소 기능 + 게임주스(타격감/이펙트/사운드)까지 포함

3. QA Agent
- 조작 직관성(첫 5초), 프레임 저하, 모바일 터치 오류 점검
- 리스타트/베스트 스코어/localStorage 동작 확인

4. Integrator Agent
- 검수 통과 게임만 메인 `index.html`에 카드 추가
- 태그/썸네일 텍스트 정리 및 링크 검증
- 게임 추가/수정 직후 `game-evaluation.md`에 점수와 코멘트 반드시 반영

## 구현 기준

- 기술: Vanilla JS + HTML5 Canvas
- 입력: 키보드 + 터치 모두 지원
- 상태: `idle / running / gameover` 구분
- 최소 HUD: 점수, 최고점, 시작/재시작
- 사운드: WebAudio 또는 경량 효과음
- 문서/평가표/변경 기록/작업 요약은 기본 한글로 작성
- Godot 작업 시 공식 데모 우선 참고:
  - `https://github.com/godotengine/godot-demo-projects`
  - 이동, 카메라, 적 AI, UI/HUD, 슈팅 패턴은 데모 구조를 먼저 확인하고 적용
- 모든 작업/답변에서 에이전트는 현재 빌드 기준으로 재미를 더 올릴 수 있는 구체 개선안(최소 1개, 권장 3개)을 항상 제시
- 개선안은 즉시 실행 가능한 단위(예: 난이도 곡선, 보상 루프, 피드백/연출, 컨트롤 개선)로 작성하고 다음 작업 우선순위를 포함

## 앱인토스 게임 등급 메모

- 앱인토스에 게임을 정식 출시하려면 원칙적으로 `게임 등급분류`가 필요하다.
- 토스가 등급을 직접 발급해주지는 않으며, 콘솔 `게임 등급분류` 단계에 외부 등급 정보를 등록하는 방식이다.
- 확보 경로는 보통 2가지다: `GRAC 직접 신청` 또는 `스토어 IARC 등급 + 스토어 링크 제출`
- 스토어 선출시가 없다면 기본 경로는 `GRAC 직접 신청 -> 등급분류증명서 등록`으로 본다.
- 상세 절차와 준비물은 `/Users/user/TapTapCho/docs/repo-guide.md`의 `8-7) 게임 등급 정보 적용방법`을 따른다.

## 앱인토스 패키징 트러블슈팅 메모

- 2026-03-25 `commercial-area-radar`
- 프로젝트 폴더명과 토스 콘솔 실제 `appName`이 다를 수 있다. 이 경우 `.ait` 파일명과 내부 `appName`은 반드시 콘솔 값(`commercial-radar`)으로 맞춘다.
- `granite.config.ts` 기본 `appName`과 README/TOSS 문서의 빌드 예시도 실제 콘솔 값으로 유지한다.
- 서비스 폴더에 `terms.html`, `privacy.html`을 추가했으면 `toss-package/scripts/build-web.mjs` 복사 목록에도 같이 넣어야 한다.
- 빌드 후에는 `dist/web/terms.html`, `dist/web/privacy.html`와 최종 `.ait` 내부 `web/terms.html`, `web/privacy.html` 문자열을 함께 검증한다.

## Builder Prompt Template

"`templates/webgame-template`를 기반으로 [게임명]을 구현해줘.
제약: 외부 라이브러리 금지, 모바일 터치 필수, 5초 내 재미 포인트,
점수/베스트/localStorage 포함, 게임오버 시 즉시 재시작 가능,
파일은 [webgame-XX] 폴더만 수정." 

## QA Checklist

- 이번 작업 게임이 `game-evaluation.md`에 점수/사유/다음 액션으로 기록되었는가?
- 첫 진입 5초 내 조작법을 알 수 있는가?
- 입력 지연이나 프레임 드랍이 없는가?
- 게임오버 후 재시작 동선이 빠른가?
- 베스트 스코어가 정상 저장되는가?
- 작업 종료 답변에 재미 강화 제안(최소 1개)이 포함되었는가?
