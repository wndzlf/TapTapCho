# AGENTS

## Workspace

- 루트 게임 폴더는 호환성용 심볼릭 링크로 취급하고, 실제 작업은 항상 `games/<project>/` 안에서 진행합니다.
- 별도 요청이 없으면 수정 범위는 한 프로젝트 안으로 제한합니다.
- 공용 자산/코드는 `shared/`, `static/`, 서버 코드는 `scripts/`, 도구/절차 문서는 `meta/`, `docs/`에 둡니다.
- 런타임 동작과 공개 URL은 유지합니다.

## Apps in Toss

- 토스 미니앱 대상 프로젝트는 처음부터 업로드 가능한 구조로 만듭니다.
- 기본 산출물: `games/<project>/toss-package/`, `granite.config.ts`, `package.json`, `scripts/build-web.mjs`, `scripts/dev-server.mjs`, `600x600` 아이콘, `1932x828` 썸네일, 필요 시 스크린샷/출시 문안.
- 항상 `npm run build:web && npm run build`로 `.ait`를 다시 만들 수 있어야 합니다.
- `brand.icon`은 생성형 `data:` URI보다 안정적인 HTTPS PNG를 우선 사용하고, 개발자센터 등록 아이콘과 동일하게 맞춥니다.
- `.ait`의 `appName`과 `brand.displayName`은 토스 콘솔 값과 정확히 같아야 합니다. 프로젝트 폴더명과 콘솔 `appName`이 다를 수 있으니 혼동하지 않습니다.
- 이름 불일치 반려가 나면 `brand.displayName`과 콘솔 `앱 정보등록` 이름이 정확히 같은지 먼저 확인하고 다시 빌드합니다.
- 실제 사례: `real-estate-watch`는 콘솔명이 `서울경기실시간아파트`인데 번들/웹 표기가 달라 반려됐고, `granite.config.ts`의 `brand.displayName`뿐 아니라 `index.html`, `terms.html`, `privacy.html`까지 콘솔명으로 통일한 뒤 `.ait`를 다시 빌드해 해결했습니다. 참조: [`games/real-estate-watch/toss-package/granite.config.ts`](games/real-estate-watch/toss-package/granite.config.ts), [`games/real-estate-watch/toss-package/real-estate-watch.ait`](games/real-estate-watch/toss-package/real-estate-watch.ait)
- `granite.config.ts`는 실제 콘솔 값 기준으로 유지하고, 필요하면 `TOSS_APP_NAME`, `TOSS_BRAND_DISPLAY_NAME`으로 주입 가능하게 둡니다.
- `web.commands`는 가능하면 `jiti scripts/*.mjs`를 우선 사용합니다. `ait build`가 `npx node ...` 형태로 실행되면 네트워크 오류가 날 수 있습니다.
- `games/<project>/toss-package/package.json`의 `build` 경로는 `../../../node_modules/.bin/ait build`를 사용합니다.
- `terms.html`, `privacy.html`를 추가했으면 `toss-package/scripts/build-web.mjs` 복사 목록에도 포함합니다.
- 콘솔 `앱 내 기능`이 `intoss://<appName>/<uri>`를 요구하면 임의 URI를 쓰지 말고 실제 열리는 하위 경로를 만듭니다. 정적 웹은 `dist/<uri>/index.html`까지 생성해 `intoss://commercial-radar/briefing` 같은 피처 주소가 200 응답하는지 확인합니다. 참고: https://developers-apps-in-toss.toss.im/development/test/function.html
- 업로드 전에는 `strings -n 6 <file>.ait | rg "appName|displayName|static.toss.im/appsintoss"`로 이름/아이콘 반영을 확인합니다.
- 약관 페이지를 넣은 프로젝트는 `dist/web/terms.html`, `dist/web/privacy.html` 존재 여부와 `.ait` 내부 `web/terms.html`, `web/privacy.html` 문자열도 확인합니다.

## Mobile Web Performance

- 모바일 브라우저와 토스 웹뷰에서 웹 코드로 전체화면을 강제할 수 있다고 가정하지 않습니다. 필요하면 `requestFullscreen()` 지원 여부를 먼저 보고, 미지원 환경은 인게임 집중 모드로 대응합니다.
- 모바일 검수는 `390x844` 전후 뷰포트를 기본으로 보고, 세로 공간을 많이 먹는 헤더/가이드/크레딧은 모바일에서 축소하거나 숨기는 쪽을 우선 검토합니다.
- 모바일/저사양 환경에서는 `backdrop-filter`, 과한 `box-shadow`, 큰 blur, 다량 파티클, 캔버스 그림자, 과도한 물리 반복 같은 고비용 효과를 기본적으로 경계합니다.
- 캔버스 물리 게임은 모바일에서 성능 모드를 기본 옵션으로 두고, 파티클/이펙트 수와 충돌/솔버 반복 횟수를 제한할 수 있게 설계합니다.
- 웹게임 작업 후에는 가능하면 모바일 뷰포트 스크린샷이나 실제 기기 확인으로 화면 점유율과 버벅임을 함께 검수합니다.

## Apps in Toss Game Rating

- 앱인토스에 게임을 정식 출시하려면 원칙적으로 외부 `게임 등급분류`가 필요합니다.
- 토스가 등급을 직접 발급하지는 않으며, 콘솔 `게임 등급분류` 단계에 외부 등급 정보를 등록하는 방식으로 진행합니다.
- 확보 경로는 보통 `GRAC 직접 신청` 또는 `스토어 IARC 등급 + 스토어 링크 제출`입니다.
- 스토어 선출시가 없다면 기본 경로는 `GRAC 직접 신청 -> 등급분류증명서 등록`으로 봅니다.
