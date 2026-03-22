# Commercial Area Radar

소상공인시장진흥공단 `상가(상권)정보_API`를 수집해 최근 기준으로 보여주는 상권 정보형 앱입니다.

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

앱 화면은 실시간 호출이 아니라 주기적으로 저장한 JSON 수집본을 읽습니다. 아래 스크립트나 GitHub Actions로 최신 수집본을 갱신할 수 있습니다.

## 로컬 수집본 갱신

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
