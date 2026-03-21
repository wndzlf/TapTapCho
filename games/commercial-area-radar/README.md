# Commercial Area Radar

소상공인시장진흥공단 `상가(상권)정보_API`를 토대로 만든 상권 정보형 앱 시안입니다.

## 추천 앱 아이디

- 기본안: `commercial-area-radar`
- 대안: `dong-store-radar`
- 대안: `storezone-radar`

`commercial-area-radar`를 기본으로 잡은 이유는 행정동, 상권, 업종, 점포 목록까지 자연스럽게 확장할 수 있기 때문입니다.

## 현재 포함된 흐름

- `baroApi`
- `largeUpjongList`
- `middleUpjongList`
- `smallUpjongList`
- `storeListInDong`

현재 앱 화면은 문서 기반 데모 스냅샷을 사용합니다. 셸이나 GitHub Actions에 서비스 키가 올라오면 아래 스크립트로 실 API 스냅샷으로 교체할 수 있습니다.

## 로컬 스냅샷 수집

```bash
cd /Users/user/TapTapCho
REAL_ESTATE_API_SERVICE_KEY="your-key" npm run sync-commercial-area-radar
```

### 선택 가능 환경변수

- `COMMERCIAL_AREA_SCOPE_DIV_ID`
  - 기본값: `signguCd`
- `COMMERCIAL_AREA_SCOPE_KEY`
  - 기본값: `11680`
- `COMMERCIAL_AREA_INDS_LCLS_CD`
  - 기본값: `I2`
- `COMMERCIAL_AREA_INDS_MCLS_CD`
  - 기본값: 첫 중분류 코드
- `COMMERCIAL_AREA_INDS_SCLS_CD`
  - 기본값: 없음
- `COMMERCIAL_AREA_NUM_OF_ROWS`
  - 기본값: `80`

## 토스 앱 번들

- 패키지 루트: `/Users/user/TapTapCho/games/commercial-area-radar/toss-package`
- 빠른 빌드: `TOSS_APP_NAME="commercial-area-radar" npm run commercial-area-radar:toss:build`
- 미리보기: `npm run commercial-area-radar:toss:dev`
