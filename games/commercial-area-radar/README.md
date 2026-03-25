# Commercial Area Radar

소상공인시장진흥공단 `상가(상권)정보_API` 수집본을 기준으로 동네/업종 흐름을 요약해 보여주는 상권 정보형 앱입니다.

## 자동수집 방식

- 수집 스크립트: `/Users/user/TapTapCho/meta/tools/sync-commercial-area-radar.mjs`
- 앱용 출력 파일: `/Users/user/TapTapCho/games/commercial-area-radar/latest-commercial-area-snapshot.json`
- GitHub Actions: `/Users/user/TapTapCho/.github/workflows/commercial-area-radar-sync.yml`

화면은 실시간 API 호출이 아니라 주기적으로 저장한 JSON 스냅샷을 읽습니다.

## GitHub Secret

리포지토리 `Settings > Secrets and variables > Actions`에 아래 시크릿 중 하나를 등록해야 합니다.

- `COMMERCIAL_AREA_API_SERVICE_KEY` (권장)
- `DATA_GO_KR_API_SERVICE_KEY`
- `REAL_ESTATE_API_SERVICE_KEY` (호환)

## 로컬 수집본 갱신

```bash
cd /Users/user/TapTapCho
COMMERCIAL_AREA_API_SERVICE_KEY="your-key" npm run sync-commercial-area-radar
```

### 선택 환경변수

- `COMMERCIAL_AREA_SCOPE_DIV_ID`
  - 기본값: `signguCd`
- `COMMERCIAL_AREA_SCOPE_KEYS`
  - 기본값: 서울/경기 9개 권역
  - 예시: `11680,11710,41135`
- `COMMERCIAL_AREA_INDS_LCLS_CD`
  - 기본값: 없음(전체)
- `COMMERCIAL_AREA_INDS_MCLS_CD`
  - 기본값: 없음(전체)
- `COMMERCIAL_AREA_INDS_SCLS_CD`
  - 기본값: 없음(전체)
- `COMMERCIAL_AREA_NUM_OF_ROWS`
  - 기본값: `120`
- `COMMERCIAL_AREA_MAX_PAGES`
  - 기본값: `2`

## 토스 앱 번들

- 패키지 루트: `/Users/user/TapTapCho/games/commercial-area-radar/toss-package`
- 빠른 빌드: `TOSS_APP_NAME="commercial-area-radar" npm run commercial-area-radar:toss:build`
- 미리보기: `npm run commercial-area-radar:toss:dev`

## 앱인토스 제출 체크포인트

- `.ait` 내부 `appName`과 토스 콘솔 `appName`이 정확히 같아야 합니다.
- `brand.displayName`과 콘솔 표기명이 일치해야 합니다.
- `brand.icon`은 `https://` PNG URL을 사용하고, 토스 콘솔 아이콘과 동일 이미지로 맞춰야 합니다.
- 아이콘 기본 산출물: `appintos-logo-600.svg`, `appintos-logo-600.png`.
- 토스 콘솔 약관/동의문 등록용 문서: `terms.html`, `privacy.html`

업로드 직전 검증:

```bash
cd /Users/user/TapTapCho/games/commercial-area-radar/toss-package
TOSS_APP_NAME="commercial-area-radar" npm run build:web && npm run build
strings -n 6 commercial-area-radar.ait | rg "appName|displayName|raw.githubusercontent.com|static.toss.im/appsintoss"
```
