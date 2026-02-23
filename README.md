# TapTapCho Hyper-casual Build Kit

이 저장소는 웹 기반 하이퍼 캐주얼 게임 플랫폼(포키 스타일)을 빠르게 확장하기 위한 기본 골격입니다.

## 1) 빠른 실행

```bash
cd /Users/user/TapTapCho
python3 -m http.server 8080
```

브라우저에서 `http://localhost:8080` 접속.

## 2) 개발 원칙

- 5초 안에 재미 포인트가 보여야 합니다.
- 튜토리얼 없이 바로 플레이 가능해야 합니다.
- 1분 내 짧은 세션으로도 재미가 나와야 합니다.
- 각 게임은 독립 폴더로 분리합니다 (충돌 방지).

## 3) 병렬 제작 워크플로

- `agent.md`: 역할 분담 + 프롬프트 규칙
- `checklist.md`: 게임 아이디어/진행 상태 트래킹
- `templates/webgame-template`: 새 게임 템플릿
- `scripts/create-webgame.sh`: 템플릿 복제 스크립트

권장 순서:

1. 기획 에이전트가 `checklist.md`에서 다음 게임 3~5개 선정
2. 구현 에이전트들이 각자 다른 `webgame-*` 폴더만 작업
3. 검수 에이전트가 난이도/점수/버그/게임주스 보정
4. 통합 에이전트가 `index.html` 카드만 최종 반영

## 4) 새 게임 생성

```bash
bash scripts/create-webgame.sh webgame-10 "Zigzag Rush" "Reflex · Zigzag"
```

명령 실행 후:

- `webgame-10/` 폴더가 생성됩니다.
- 메인 페이지(`index.html`)에 붙여 넣을 카드 HTML 스니펫이 출력됩니다.

## 5) 병렬 작업 충돌 방지 규칙

- 구현 에이전트는 `index.html` 수정 금지
- 한 에이전트 = 한 게임 폴더만 수정
- 공통 파일(`style.css`, `index.html`)은 통합 담당만 수정
- 머지 직전 `python3 -m http.server 8080`로 클릭/모바일 터치 직접 확인
