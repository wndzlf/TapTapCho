# Real Estate Watch

서울·경기 아파트 매매 실거래를 정적 JSON 스냅샷으로 보여주는 정보형 앱입니다.

## 자동수집 방식

- 수집 스크립트: `/Users/user/TapTapCho/scripts/sync-real-estate-watch.mjs`
- 앱용 출력 파일: `/Users/user/TapTapCho/real-estate-watch/latest-transactions.json`
- 전체 거래 보관 파일: `/Users/user/TapTapCho/real-estate-watch/latest-transactions-full.json`
- GitHub Actions: `/Users/user/TapTapCho/.github/workflows/real-estate-watch-sync.yml`

GitHub Actions는 공공데이터포털 OpenAPI를 호출해 최근 계약월 데이터를 모으고, 거래 고유 키를 기준으로 전체 스냅샷을 갱신합니다. 앱이 실제로 읽는 `latest-transactions.json`은 토스 웹뷰 로딩을 위해 요약 지표와 상위 10건 목록만 담는 경량 스냅샷이며, 전체 거래 데이터는 `latest-transactions-full.json`에 별도로 보관합니다.

## GitHub Secret

리포지토리 Settings > Secrets and variables > Actions 에 아래 secret 을 추가해야 합니다.

- `REAL_ESTATE_API_SERVICE_KEY`

공공데이터포털의 국토교통부 아파트 매매 실거래가 자료 API 키를 넣으면 됩니다. URL 인코딩 키를 넣어도 스크립트에서 한 번 정규화해서 사용합니다.

## 로컬 실행

```bash
cd /Users/user/TapTapCho
REAL_ESTATE_API_SERVICE_KEY="your-key" npm run sync-real-estate-watch
```

## 토스 앱 번들

- 패키지 루트: `/Users/user/TapTapCho/real-estate-watch/toss-package`
- 빠른 빌드: `TOSS_APP_NAME="your-console-app-name" npm run real-estate-watch:toss:build`
- 미리보기: `npm run real-estate-watch:toss:dev`

`TOSS_APP_NAME`은 토스 콘솔에 등록한 앱 슬러그와 동일해야 합니다.

## 주의

- 스케줄은 GitHub Actions 기준 UTC 크론입니다.
- 기본 수집 범위는 최근 3개월입니다.
- 이 앱은 정보 제공 목적 서비스이며, 투자 권유나 중개 기능은 포함하지 않습니다.
- 앱은 `Vercel JSON -> GitHub Raw JSON -> 번들 내부 JSON` 순서로 스냅샷을 시도합니다.
