# Officetel Watch

서울·경기 오피스텔 매매 실거래를 정적 JSON 스냅샷으로 보여주는 정보형 앱입니다.

## 자동수집 방식

- 수집 스크립트: `/Users/user/TapTapCho/scripts/sync-officetel-watch.mjs`
- 출력 파일: `/Users/user/TapTapCho/officetel-watch/latest-transactions.json`
- GitHub Actions: `/Users/user/TapTapCho/.github/workflows/officetel-watch-sync.yml`

GitHub Actions는 공공데이터포털 OpenAPI를 호출해 최근 계약월 데이터를 모으고, 거래 고유 키를 기준으로 스냅샷을 갱신합니다. 현재 화면은 거래금액 상위 10건과 계약일 최신 10건을 서울·경기 필터 기준으로 보여줍니다.

## GitHub Secret

리포지토리 Settings > Secrets and variables > Actions 에 아래 secret 을 추가해야 합니다.

- `OFFICETEL_API_SERVICE_KEY`

공공데이터포털의 국토교통부 오피스텔 매매 실거래가 자료 API 키를 넣으면 됩니다. URL 인코딩 키를 넣어도 스크립트에서 한 번 정규화해서 사용합니다.

## 로컬 실행

```bash
cd /Users/user/TapTapCho
OFFICETEL_API_SERVICE_KEY="your-key" npm run sync-officetel-watch
```

## 토스 앱 번들

- 패키지 루트: `/Users/user/TapTapCho/officetel-watch/toss-package`
- 빠른 빌드: `TOSS_APP_NAME="your-console-app-name" npm run officetel-watch:toss:build`
- 미리보기: `npm run officetel-watch:toss:dev`

`TOSS_APP_NAME`은 토스 콘솔에 등록한 앱 슬러그와 동일해야 합니다.

## 참고 API

- 오피스텔 매매 실거래가 자료: `https://www.data.go.kr/data/15126464/openapi.do`
- 공식 엔드포인트: `https://apis.data.go.kr/1613000/RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade`

## 주의

- 스케줄은 GitHub Actions 기준 UTC 크론입니다.
- 기본 수집 범위는 최근 3개월입니다.
- 해제 거래는 화면 스냅샷에서 제외합니다.
- 이 앱은 정보 제공 목적 서비스이며, 투자 권유나 중개 기능은 포함하지 않습니다.
