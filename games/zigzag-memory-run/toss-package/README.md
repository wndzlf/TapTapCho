# Zigzag Memory Run Toss Package

`/Users/user/TapTapCho/games/zigzag-memory-run` 앱을 토스 앱 번들(`.ait`)로 빌드하기 위한 패키지 루트입니다.

## 필수 환경변수

- `TOSS_APP_NAME`
  - 토스 콘솔에 등록한 미니앱 `appName`과 정확히 같아야 합니다.

## 선택 환경변수

- `TOSS_BRAND_DISPLAY_NAME`
  - 기본값: `지그재그메모리런`
- `TOSS_BRAND_ICON_URL`
  - 기본값: `https://static.toss.im/appsintoss/29647/bc677ab3-dd28-42cc-a5bd-2713240c6c56.png`

## 로컬 빌드

루트에서 실행:

```bash
cd /Users/user/TapTapCho
TOSS_APP_NAME="zigzag-memory-run" npm --prefix games/zigzag-memory-run/toss-package run build
```

패키지 폴더에서 직접 실행:

```bash
cd /Users/user/TapTapCho/games/zigzag-memory-run/toss-package
TOSS_APP_NAME="zigzag-memory-run" npm run build
```

## 업로드 전 체크

1. `.ait` 내부 `appName`과 토스 콘솔 `appName`이 동일한지 확인
2. 토스 콘솔 미니앱 설정 아이콘과 `brand.icon` URL이 동일한지 확인
3. QR 테스트로 실행/복귀/종료 동작 확인
