# Officetel Watch Toss Package

`/Users/user/TapTapCho/officetel-watch` 앱을 토스 앱 번들(`.ait`)로 빌드하기 위한 패키지 루트입니다.

## 환경 변수

- `TOSS_APP_NAME`
  - 토스 콘솔에 생성한 앱 슬러그
  - 기본값: `officetel-watch`
- `TOSS_BRAND_DISPLAY_NAME`
  - 앱 표시 이름
  - 기본값: `서울·경기 오피스텔 실거래 TOP 10`
- `TOSS_BRAND_ICON_URL`
  - 외부 아이콘 URL을 쓰고 싶을 때만 설정

## 빌드

```bash
cd /Users/user/TapTapCho
TOSS_APP_NAME="officetel-watch" npm run officetel-watch:toss:build
```

또는 패키지 폴더에서 직접 실행할 수 있습니다.

```bash
cd /Users/user/TapTapCho/officetel-watch/toss-package
TOSS_APP_NAME="officetel-watch" npm run build
```

## 로컬 미리보기

```bash
cd /Users/user/TapTapCho
npm run officetel-watch:toss:dev
```
