# TapTapCho Hyper-casual Build Kit

이 저장소는 웹 기반 하이퍼 캐주얼 게임 플랫폼(포키 스타일)을 빠르게 확장하기 위한 기본 골격입니다.

## 1) 빠른 실행

```bash
cd /Users/user/TapTapCho
python3 -m http.server 8080
```

브라우저에서 `http://localhost:8080` 접속.

### 같은 와이파이 멀티(Worm Arena LAN)

1. LAN 서버 실행 (호스트 PC 1대):

```bash
cd /Users/user/TapTapCho
npm install
npm run worm-lan-server
```

2. 정적 웹 서버 실행:

```bash
cd /Users/user/TapTapCho
python3 -m http.server 8080
```

3. 같은 와이파이 기기에서 접속:
- 게임 페이지: `http://<호스트PC-IP>:8080/webgame-38/index.html`
- Server 입력값: `ws://<호스트PC-IP>:9090`
- 같은 Room 코드로 `Host` 또는 `Join`

## 2) 개발 원칙

- 5초 안에 재미 포인트가 보여야 합니다.
- 튜토리얼 없이 바로 플레이 가능해야 합니다.
- 1분 내 짧은 세션으로도 재미가 나와야 합니다.
- 각 게임은 독립 폴더로 분리합니다 (충돌 방지).
- 게임 개선 우선순위/점수 기준은 `game-evaluation.md`를 단일 기준으로 사용합니다.

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

썸네일 일괄 생성:

```bash
cd /Users/user/TapTapCho
node scripts/generate-thumbnails.js
```

## 5) 병렬 작업 충돌 방지 규칙

- 구현 에이전트는 `index.html` 수정 금지
- 한 에이전트 = 한 게임 폴더만 수정
- 공통 파일(`style.css`, `index.html`)은 통합 담당만 수정
- 머지 직전 `python3 -m http.server 8080`로 클릭/모바일 터치 직접 확인

## 6) Godot 3D 게임 반영(필수)

`godot-urban-maze`, `godot-platformer`는 **소스 프로젝트**, `godot-urban-maze-web`, `godot-platformer-web`는 **웹 export 결과물**입니다.

Godot 소스 변경 후 웹에 반영하려면:

1. Godot 4에서 `/Users/user/TapTapCho/godot-urban-maze/project.godot` 열기
2. `Project -> Export -> Web` 선택
3. `export_path`가 `../godot-urban-maze-web/index.html`인지 확인 후 Export
4. 같은 방식으로 `godot-platformer`도 `../godot-platformer-web/index.html`로 Export

## 7) Godot 2D 비행 슈팅 (AirStrikerLite)

- 소스: `godot-air-striker`
- 웹 export 결과물 경로: `godot-air-striker-web`

Export 순서:
1. Godot 4에서 `/Users/user/TapTapCho/godot-air-striker/project.godot` 열기
2. `Project -> Export -> Web`
3. export path를 `../godot-air-striker-web/index.html`로 지정 후 Export
