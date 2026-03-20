# 토스 앱 번들(.ait) 생성 및 업로드 가이드

Last updated: 2026-03-20

## 목적

토스 개발자센터의 "토스앱 테스트" 가이드를 기준으로, 이 저장소에서 `.ait` 번들을 만들고 업로드할 때 필요한 실제 작업 순서를 정리합니다.

공식 문서 기준 핵심은 아래 두 가지입니다.

- 빌드가 끝난 프로젝트를 `.ait` 앱 번들로 생성한다.
- 생성한 `.ait` 파일을 콘솔 또는 `npx ait deploy`로 업로드해 QR 테스트를 진행한다.

참고한 공식 문서:

- [토스앱 테스트](https://developers-apps-in-toss.toss.im/development/test/toss.html)
- [미니앱 출시](https://developers-apps-in-toss.toss.im/development/deploy.html)

## 공식 절차 요약

공식 문서 흐름은 아래와 같습니다.

1. 앱을 빌드한다.
2. `npm run build`로 `.ait` 파일을 생성한다.
3. 생성된 `.ait` 파일을 콘솔에 업로드하거나 `npx ait deploy`로 업로드한다.
4. 생성된 `intoss-private://...` 테스트 스킴 또는 QR 코드로 토스앱에서 최종 테스트한다.
5. 최소 1회 이상 토스앱 테스트를 완료한 뒤 검토 요청을 진행한다.

추가 정책:

- `.ait` 번들은 압축 해제 기준 100MB 이하만 업로드할 수 있다.
- 앱 실행에 필요한 최소 리소스만 번들에 포함하는 편이 안전하다.
- 실제 서비스와 QR 테스트 환경의 CORS Origin 을 모두 허용해야 한다.
  - `https://<appName>.apps.tossmini.com`
  - `https://<appName>.private-apps.tossmini.com`

## 이 저장소에서 확인한 현재 상태

2026-03-20 기준으로 이 저장소는 토스 SDK 의존성은 설치되어 있지만, 루트에서 바로 `.ait`를 생성하는 구성은 아직 없다.

- 루트 패키지: [package.json](/Users/user/TapTapCho/package.json)
- 토스 CLI 설치 버전: `@apps-in-toss/cli@2.0.9`
- 로컬 CLI 확인 결과:
  - `npx ait --help` 에서 `build`, `token`, `deploy` 명령 사용 가능
  - `npx ait build` 실행 시 `granite.config.ts` 가 없어서 실패

실제 확인 로그:

```text
Internal Error: Cannot find granite config: /Users/user/TapTapCho/granite.config.ts
```

즉, 현재 저장소는 아래 상태입니다.

- 토스 브리지 코드는 일부 게임에 이미 반영되어 있다.
- 실제 웹 실행 산출물은 `*-web` 폴더에 있다.
- 하지만 토스 CLI 가 기대하는 `granite.config.ts` 와 번들 생성용 `build` 파이프라인은 아직 없다.

## 현재 번들 후보가 되는 폴더

토스에 올라갈 런타임 파일은 보통 `*-web` 폴더 안에 모여 있다.

예시:

- [godot-winter-ski-rush-web](/Users/user/TapTapCho/godot-winter-ski-rush-web)
- [orbitSurvivor](/Users/user/TapTapCho/orbitSurvivor)
- [webgame-21](/Users/user/TapTapCho/webgame-21)

`Winter Ski Rush` 기준으로 실제 런타임 파일은 아래처럼 보인다.

- `index.html`
- `index.js`
- `index.pck`
- `index.wasm`
- `style.css`
- `toss-runtime.js`
- `toss-bridge.js`
- 각종 런타임 이미지/워크릿 파일

반대로 아래 파일은 런타임 필수 리소스가 아니라 운영 문서에 가깝다.

- `README.md`
- `TOSS_LAUNCH_PACK.md`
- `TOSS_ADS_PLAN.md`
- `toss-bridge-source.js`

문서 파일은 가능하면 번들에서 제외하는 편이 좋다.

## 용량 체크 예시

공식 정책은 압축 해제 기준 100MB 이하이다.

현재 `Winter Ski Rush` 웹 export 폴더 크기:

```text
41296 KB  /Users/user/TapTapCho/godot-winter-ski-rush-web
```

대략 40MB 수준이라, 현재 폴더 기준으로는 정책 한도 안쪽이다.

직접 확인할 때는 아래 명령을 사용한다.

```bash
du -sk /Users/user/TapTapCho/godot-winter-ski-rush-web
```

## 이 저장소에서 권장하는 작업 순서

현재 구조를 기준으로 보면, `.ait` 생성은 아래 순서로 정리하는 게 가장 안전하다.

### 1. 토스에 올릴 게임 폴더를 하나 고른다

예:

- `/Users/user/TapTapCho/godot-winter-ski-rush-web`
- `/Users/user/TapTapCho/orbitSurvivor`
- `/Users/user/TapTapCho/webgame-21`

### 2. 번들 포함 대상을 런타임 파일만 남기도록 정리한다

포함 권장:

- HTML
- JS
- CSS
- 이미지
- 오디오
- WASM
- 게임 데이터 파일(`.pck` 등)

제외 권장:

- README
- 출시 메모
- 광고 계획 문서
- 소스 메모 파일

### 3. 토스 CLI 가 인식할 패키지 루트를 만든다

최소한 아래 요소가 필요하다.

- `granite.config.ts`
- 토스 CLI 가 실행될 패키지 루트
- 빌드 결과물이 모이는 출력 경로

현재 저장소 루트에는 `granite.config.ts` 가 없어서 `ait build`가 실패한다.

### 4. build 명령이 `.ait`를 만들도록 연결한다

공식 문서 기준 명령은 아래와 같다.

```bash
npm run build
```

로컬 CLI 기준으로는 아래도 가능하다.

```bash
npx ait build
```

단, 현재 저장소는 아직 이 단계가 준비되지 않았기 때문에 먼저 `granite.config.ts` 와 빌드 파이프라인을 추가해야 한다.

### 5. 생성된 `.ait` 파일을 업로드한다

콘솔 업로드:

- 워크스페이스 선택
- 앱 선택
- 좌측 메뉴 `앱 출시`
- `.ait` 업로드
- QR 또는 테스트 스킴 확인

CLI 업로드:

```bash
npx ait token add
npx ait deploy
```

필요하면 직접 API 키를 넣을 수 있다.

```bash
npx ait deploy --api-key {API_KEY}
```

도움말:

```bash
npx ait deploy -h
```

## 테스트 단계에서 꼭 볼 항목

- 토스앱 로그인 상태인지
- 워크스페이스 멤버 계정인지
- 만 19세 이상 테스트 계정인지
- QR 코드 또는 `intoss-private://...` 스킴이 실제로 열리는지
- 토스앱 내에서 흰 화면이 없는지
- 백그라운드 복귀, 오디오, 저장, 종료 모달이 정상 동작하는지

## 현재 저장소 기준 결론

이 저장소는 토스 미니앱용 런타임 자산은 어느 정도 준비되어 있지만, `.ait`를 자동 생성하는 마지막 패키징 단계는 아직 붙어 있지 않다.

즉, 지금 당장 필요한 작업은 아래 두 가지다.

1. 게임별 토스 패키지 루트를 정하고 `granite.config.ts` 를 추가한다.
2. 선택한 게임의 `*-web` 산출물을 토스 CLI 빌드 출력으로 연결한다.

그 뒤에야 공식 문서의 아래 흐름이 그대로 동작한다.

```bash
npm run build
npx ait deploy
```

## 빠른 체크 명령어

```bash
npx ait --help
npx ait build -h
npx ait deploy -h
du -sk /Users/user/TapTapCho/godot-winter-ski-rush-web
```
