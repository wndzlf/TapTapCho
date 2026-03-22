# Retro Hero: Street Beat

80s/90s 신스웨이브 분위기의 3레인 리듬 액션 하이퍼캐주얼 게임입니다.

## 코어 루프

- 적이 `NEON HIT` 라인에 도달할 때 맞는 레인을 탭해 처치
- 판정: `Perfect`, `Great`, `Good`, `Safe`, `Miss`
- `Safe`는 저점수 통과(콤보 끊김)로 박자를 살짝 놓쳐도 런을 이어갈 수 있음
- 곡 종료 시점까지 생존 실패 없이 점수를 누적
- 난이도 `Easy` / `Normal` / `Hard` 선택 지원
- 콤보와 정확도를 쌓아 `HERO MODE` 발동 (점수 2배)
- MP3 파형 분석 + 수동 beatmap 마커를 합쳐 임팩트 타이밍 스폰 강화

## 조작

- 화면 좌/중/우 탭: 해당 레인 공격
- 상단 `◀ / ▶`: 트랙 선택
- 상단 `EASY / NORMAL / HARD`: 난이도 선택
- 키보드: `1/2/3`, `A/S/D`, `좌/상/우`
- 키보드 트랙/난이도: `[` / `]`, `Z` / `X` / `C`
- `Space`: 현재 레인 공격

## 오디오

- 선택 가능한 BGM:
  - `assets/audio/a-hero-of-the-80s-126684.mp3` (Grand Project - A Hero Of The 80s)
  - `assets/audio/on-the-road-to-the-eighties-59sec-177566.mp3` (Grand Project - On The Road To The Eighties)
  - `assets/audio/80s-video-game-battle-chiptune-216255.mp3` (NickPanekAIAssets - 80s Video Game Battle Chiptune)
  - `assets/audio/retro-8bit-happy-videogame-music-418486.mp3` (Niknet_Art - Retro 8Bit Happy Videogame Music)
- 수동 임팩트 마커:
  - `assets/beatmaps/a-hero-of-the-80s-126684.json`
  - `assets/beatmaps/on-the-road-to-the-eighties-59sec-177566.json`
  - `assets/beatmaps/80s-video-game-battle-chiptune-216255.json`
  - `assets/beatmaps/retro-8bit-happy-videogame-music-418486.json`
- 라이선스 기록: `BGM_LICENSE.md`

## 트랙 추가 방법

1. MP3를 `assets/audio/`에 넣는다.
2. `game.js`의 `SONG_LIBRARY`에 `id/title/artist/audioSrc/bpm/beatOffsetSec`를 추가한다.
3. 필요하면 `assets/beatmaps/<track>.json`을 만들고 `beatmapSrc`에 연결한다.
4. `toss-package/scripts/build-web.mjs`에 새 오디오/beatmap 복사 항목을 추가한다.

## 앱인토스

- 브리지 소스: `toss-bridge-source.js`
- 브리지 번들: `toss-bridge.js`
- 패키지: `toss-package/`
- 보상형 광고 이어하기 지원 (라운드당 1회)
