# AGENTS

- 루트의 게임 폴더는 호환성용 심볼릭 링크로 취급합니다.
- 실제 작업은 항상 `games/<project>/` 안에서 진행합니다.
- 별도 요청이 없으면 수정 범위는 한 프로젝트 안으로 제한합니다.
- 공용 자산과 공용 코드는 `shared/`, `static/`에 둡니다.
- 서버 코드는 `scripts/`에 둡니다.
- 도구와 작업 절차 문서는 `meta/`, `docs/`에 둡니다.
- 런타임 동작과 공개 URL은 유지합니다.
- 토스 미니앱 대상 프로젝트는 가능하면 처음부터 `orbitSurvivor`, `worm-arena-rush`처럼 앱인토스 업로드까지 한 번에 갈 수 있는 구조로 만듭니다.
- 토스 미니앱 대상 프로젝트를 만들 때는 게임 본체 외에 아래 항목을 기본 산출물로 함께 준비합니다.
- `games/<project>/toss-package/` 패키지
- `granite.config.ts`, `package.json`, `scripts/build-web.mjs`, `scripts/dev-server.mjs`
- 앱 아이콘 원본 또는 결과물인 정사각형 `600x600` PNG 파일
- 필요 시 토스 등록용 스크린샷과 출시 문안 초안
- `npm run build:web && npm run build`로 `.ait`를 다시 만들 수 있는 상태
- 토스 미니앱 `.ait` 패키지에서는 `granite.config.ts`의 `brand.icon` 값을 항상 확인합니다.
- `brand.icon`은 가능하면 생성형 `data:` URI 대신 안정적인 HTTPS 이미지 URL을 우선 사용합니다. 아이콘 정보 누락 또는 비정상 값은 심사 반려 원인이 될 수 있습니다.
- 토스 개발자센터 미니앱 설정에도 같은 아이콘이 등록되어 있어야 합니다.
- 토스 제출 전에는 개발자센터의 실제 `appName`과 `.ait` 내부 `appName`이 정확히 같은지 확인합니다.
