# Winter Ski Rush (Godot)

Lonely Mountains 스타일을 참고한 Godot 2D 다운힐 타임어택 게임입니다.

## 구현 범위 (MVP+)
- 다운힐 물리: `gravity * slope - friction` 기반 가속/감속
- 조향/브레이크/크라우치/점프/트릭
- 장애물 충돌 크래시 + 체크포인트 리스폰
- 타임 트라이얼(기록 저장)
- 공식 루트 + 위험한 쇼트컷 3개
- 동적 카메라 줌(속도/장애물 근접 반응)

## 조작
- 좌/우: `A` / `D` (또는 화살표)
- 브레이크: `S` (또는 ↓)
- 크라우치 가속: `Shift`
- 점프: `Space`
- 트릭(공중): `Q` 또는 `E`
- 재시작: `R` 또는 `Enter`
- 모바일: 하단 `BRAKE / CROUCH / JUMP / TRICK` 버튼 + 터치 스티어

## 저장 데이터
- `user://winter_ski_rush.save`
  - best_time
  - best_style

## Web Export
1. Godot 4.6+에서 `/Users/user/TapTapCho/godot-winter-ski-rush/project.godot` 열기
2. `Project -> Export -> Web`
3. export path를 `../godot-winter-ski-rush-web/index.html`로 지정 후 Export
4. 루트에서 `python3 -m http.server 8080` 실행 후 접속
