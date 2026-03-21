# AirStrikerLite (Godot 2D)

Strikers2025 구조를 참고해서 만든 간단한 2D 웹 비행 슈팅 게임입니다.

## 구성
- `scenes/player`: 플레이어/탄환
- `scenes/enemy`: 적 유닛
- `scenes/main`: 스폰/점수/라이프/게임오버 루프
- `scenes/hud`: HUD + best score 저장(`user://air_striker_best.save`)

## 조작
- 이동: `WASD` 또는 `방향키`
- 발사: `Space` 또는 `Z`
- 재시작: 게임오버 후 `Enter` 또는 `Space`

## 웹 Export
1. Godot 4에서 `/Users/user/TapTapCho/godot-air-striker/project.godot` 열기
2. `Project -> Export -> Web`
3. Export path를 `../godot-air-striker-web/index.html`로 지정 후 Export
4. 루트에서 `python3 -m http.server 8080` 실행 후 접속
