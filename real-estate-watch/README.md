# Real Estate Watch

서울·경기 아파트 매매 실거래 예시를 정적 JSON으로 보여주는 정보형 앱입니다.

## 자동수집 방식

- 수집 스크립트: `/Users/user/TapTapCho/scripts/sync-real-estate-watch.mjs`
- 출력 파일: `/Users/user/TapTapCho/real-estate-watch/latest-transactions.json`
- GitHub Actions: `/Users/user/TapTapCho/.github/workflows/real-estate-watch-sync.yml`

GitHub Actions는 공공데이터포털 OpenAPI를 호출해 최근 계약월 데이터를 모으고, 거래 고유 키를 기준으로 `firstSeenAt`을 유지합니다. 이 값으로 앱 화면에서 "최근 새로 확인된 거래"에 가까운 순서를 만들 수 있습니다.

## GitHub Secret

리포지토리 Settings > Secrets and variables > Actions 에 아래 secret 을 추가해야 합니다.

- `REAL_ESTATE_API_SERVICE_KEY`

공공데이터포털의 국토교통부 아파트 매매 실거래가 자료 API 키를 넣으면 됩니다. URL 인코딩 키를 넣어도 스크립트에서 한 번 정규화해서 사용합니다.

## 로컬 실행

```bash
cd /Users/user/TapTapCho
REAL_ESTATE_API_SERVICE_KEY="your-key" npm run sync-real-estate-watch
```

## 주의

- 스케줄은 GitHub Actions 기준 UTC 크론입니다.
- 기본 수집 범위는 최근 3개월입니다.
- 이 앱은 정보 제공 목적 UI 예시이며, 투자 권유나 중개 기능은 포함하지 않습니다.
