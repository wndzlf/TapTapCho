# Crimson Hunter Trials Toss Package

`crimson-hunter-trials`를 토스 미니앱 `.ait`로 빌드하기 위한 패키지입니다.

## 포함 범위

- 게임 런타임: `crimson-hunter-trials/index.html`, `game.js`, `style.css`
- 토스 브리지: `crimson-hunter-trials/toss-bridge.js`
- 공용 오디오 유틸: `shared/js/neon-audio.js`
- 정책 문서: `about.html`, `contact.html`, `dmca.html`, `privacy.html`, `terms.html`

## 로컬 빌드

```bash
cd /Users/user/TapTapCho/games/crimson-hunter-trials/toss-package
npm run build:web
npm run build
```

## 업로드 전 체크

1. `granite.config.ts`의 `appName`을 토스 개발자센터의 실제 앱 이름과 맞춥니다.
2. `npm run build` 후 생성된 `.ait`를 콘솔 또는 `npx ait deploy`로 업로드합니다.
3. QR 테스트에서 아래를 확인합니다.

- 세이프에어리어 여백 반영
- 모바일 조작(좌측 스틱 + 우측 스킬 버튼) 정상 동작
- 뒤로가기 시 종료 확인 모달 동작
- 홈/백그라운드 복귀 후 자동 일시정지 동작
