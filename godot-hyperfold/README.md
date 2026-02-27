# Hyperfold: Golden Weapon Hunt (Godot 4.3+)

외계인과 골든 웨폰을 두고 경쟁하는 2D 웹 레이스/퍼즐 액션입니다.

## 프로젝트 구조

```text
godot-hyperfold/
  project.godot
  export_presets.cfg
  assets/
    kenney_alien-ufo-pack/   # Kenney CC0 에셋 원본 복사
  scenes/
    main/
      Main.tscn
      Main.gd
    player/
      Player.tscn
      Player.gd
    alien/
      Alien.tscn
      Alien.gd
    golden_weapon/
      GoldenWeapon.tscn
      GoldenWeapon.gd
    ui/
      UI.tscn
      UI.gd
  scripts/
    LayerManager.gd
    RewindManager.gd
    Powerup.gd
    HyperfoldSaveData.gd
```

## 메인 씬 노드 트리 (요약)

- `Main` (Node2D, `Main.gd`)
  - `World`
    - `Layers`
      - `Layer0`~`Layer3`
        - `TileMapLayer` (4개 오버레이)
        - `Obstacles`
        - `Items`
    - `Player`
    - `Aliens`
    - `GoldenWeapon`
    - `SwitchFx` (레이어 전환 파티클)
    - `GhostPlayerPath` / `GhostAlienPath`
  - `LayerManager`
  - `RewindManager`
  - `UI`

## 핵심 입력

- 이동: `A/D/S` + `화살표`
- 레이어 전환: `W`
- 리와인드: `R`
- 라운드 재시작: `Space` 또는 `Enter`
- 모바일: 화면 하단 방향 버튼 + 리와인드 버튼 + 레이어 슬라이더

## 웹(HTML5) export

1. Godot 4.3+에서 `/Users/user/TapTapCho/godot-hyperfold/project.godot` 열기
2. `Project -> Export -> Web`
3. export path를 `../godot-hyperfold-web/index.html`로 지정
4. Export 후 루트에서 실행

```bash
cd /Users/user/TapTapCho
python3 -m http.server 8080
```

브라우저: `http://localhost:8080/godot-hyperfold-web/index.html`

## 모바일 터치 UI 추가 방식

- `UI.tscn`에 방향 버튼(`BtnLeft/Right/Up/Down`)을 배치
- `UI.gd`에서 버튼 `button_down / button_up` 이벤트를 `Input.action_press/release`로 매핑
- 같은 씬에 `LayerSlider`, `RewindButton`을 두어 터치 기반 레이어 전환/리와인드 지원

## 성능 최적화 팁

1. 리와인드 버퍼는 `0.1초 간격`, `최대 300프레임`으로 제한해 메모리 사용량 통제
2. 레이어 비활성 시 `CollisionShape2D.disabled = true`로 물리 충돌 계산 비용 절감
3. 파티클은 `CPUParticles2D one_shot`으로 짧게만 사용
4. TileMapLayer는 확장 포인트로 유지하고, 현재는 경량 충돌 박스를 코드 생성 방식으로 사용
5. 모바일 Web에서는 `canvas size 360x640` + stretch로 과부하를 줄이고 60FPS 목표

## 진행도 저장

- 파일: `user://hyperfold_save.tres`
- 저장 방식: `ResourceSaver.save()`
- 항목: 언락 레벨, 무한 모드 언락, 총 승리 수, 최고 클리어 시간

## 에셋 라이선스

- 본 프로젝트는 `assets/kenney_alien-ufo-pack/` 에셋을 사용합니다.
- 라이선스: CC0 1.0 (상업적 사용 가능, 표기 의무 없음)
- 출처: https://kenney.nl/assets/alien-ufo-pack
