# Agent Workflow Guide

## 역할

1. Planner Agent
- `checklist.md`에 후보 게임 추가/우선순위 정리
- 각 게임의 핵심 루프(입력 1개 + 목표 1개) 정의

2. Builder Agents (N개)
- 각자 1개 게임 폴더 전담 (`webgame-10`, `webgame-11` ...)
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
