# Sunken Defense Toss Package

`sunken-sixway-defense`를 토스 미니앱용 `.ait` 번들로 만들기 위한 패키지입니다. Orbit Survivor 패키지 구조를 그대로 참고했고, 토스 업로드에서 중요한 항목인 한글 UI, 가로 화면 고정, Safe Area 대응, 종료 확인, 토스 게임 계정 기준 저장 분리를 같이 반영했습니다.

## 포함 내용

- 게임 런타임: `sunken-sixway-defense/index.html`, `sunken-sixway-defense/game.js`, `sunken-sixway-defense/style.css`
- 토스 브리지 번들: `sunken-sixway-defense/toss-bridge.js`
- 공용 자산: BGM, Kenney 효과음, 적 탱크 스프라이트, 법률 페이지
- 업로드용 스크립트: `scripts/build-web.mjs`, `scripts/dev-server.mjs`

## 빌드

```bash
cd /Users/user/TapTapCho/sunken-defense-ait
npm run build:web
npm run build
```

## 업로드 전 체크

1. `granite.config.ts`의 `appName`이 토스 개발자센터에 등록한 실제 앱 이름과 정확히 같은지 확인합니다.
   현재 설정값은 `sunkendefense`입니다.
2. `npm run build` 후 생성된 `.ait` 파일을 토스 콘솔 또는 `npx ait deploy`로 업로드합니다.
3. 토스앱 QR 테스트에서 아래 항목을 확인합니다.

- 첫 진입 시 가로 화면 고정이 적용되는지
- 종료 버튼과 뒤로가기에서 종료 확인 모달이 뜨는지
- BGM/효과음 토글이 다시 실행해도 유지되는지
- 토스 게임 계정 기준으로 저장과 랭킹이 분리되는지
- Safe Area 영역에서 상단/하단 UI가 잘리지 않는지

## 참고

- 기준 문서: Toss Mini App 공식 체크리스트/배포 문서 (2026-03-20 확인)
- 업로드 소개 문안 초안: `TOSS_LAUNCH_PACK.md`
