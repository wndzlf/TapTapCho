# TapTapCho

웹 기반 하이퍼 캐주얼 게임 컬렉션 플랫폼입니다.  
목표는 `빠른 프로토타이핑`에서 `상업화 가능한 게임 플랫폼`으로 전환하는 것입니다.

## 1) 프로젝트 개요
- 플랫폼 형태: 단일 게임 목록 페이지 + 개별 게임 페이지
- 기술 스택: Vanilla JS/HTML5 Canvas + Godot Web Export
- 플레이 타겟: 모바일 터치 중심, 3~5분 세션
- 운영 구조: 싱글 + 일부 멀티(웹소켓 서버)

## 2) 현재 상태 요약 (외부 리뷰 반영)
1. 게임성 편차가 큼 (상위 소수 외 대부분 리워크 필요)
2. 독창성 부족 (클론 성향, 차별화 약함)
3. 수익화 준비 미흡 (광고/리워드 루프 체계 부족)
4. 기술/운영 표준화 부족 (성능/장애 복구/QA 체계 보완 필요)
5. 유저 인게이지먼트 장치 부족 (리텐션/공유/재방문 설계 약함)

상세 평가 체계와 점수는 `/Users/user/TapTapCho/game-evaluation.md` 기준으로 관리합니다.

## 2-1) 콘텐츠 심사 통과 운영 모드 (2026-03-14 적용)
- 메인 노출: 상위 12개 게임만 큐레이션 노출
- 하위 게임: 임시 숨김 처리(코드 보존)
- 게임 페이지: 각 노출 게임마다 고유 텍스트 블록(목표/조작/공략/업데이트/FAQ) 제공
- 공통 신뢰 페이지: About / Contact / Privacy / Terms / Copyright-DMCA 제공
- 광고 유도성 UI: `apply ads` 슬롯 및 AdSense 스크립트 제거
- 재검토 일정: `2026-03-28 ~ 2026-04-04` 운영 데이터 기반 재평가

## 3) 빠른 실행

```bash
cd /Users/user/TapTapCho
python3 -m http.server 8080
```

브라우저: `http://localhost:8080`

## 4) 로컬 멀티/랭킹 서버

의존성 설치:

```bash
cd /Users/user/TapTapCho
npm install
```

Sunken 멀티 + 싱글 랭킹 서버:

```bash
npm run sunken-multi-server
```

Worm LAN 서버:

```bash
npm run worm-lan-server
```

## 5) 개발 운영 원칙
1. 점수표 우선: `game-evaluation.md` 기준으로만 개선 우선순위 결정
2. 집중 개발: 동시 집중 게임은 최대 2~3개
3. 모바일 우선: 터치 정확도/가독성/시야 가림을 최우선 검증
4. PC와 모바일 최적화 분리: 모바일 경량화가 PC 품질에 영향 주지 않게 유지
5. 문서 일원화: 평가/우선순위/라이선스는 단일 문서 기준으로 관리

## 6) 수익화 전환 체크리스트
- [ ] 상위 게임 2개를 GQS 70+로 안정화
- [ ] 공통 텔레메트리(세션/이탈/재시도) 도입
- [ ] 광고/리워드 지점 정의 및 A/B 테스트 계획 수립
- [ ] 서버 장애 복구/데이터 보존 운영 규칙 확정
- [ ] 외부 에셋 라이선스 최종 검수

## 7) 핵심 문서
- 평가표/우선순위: `/Users/user/TapTapCho/game-evaluation.md`
- 외부 에셋 라이선스: `/Users/user/TapTapCho/THIRD_PARTY_LICENSES.md`
- 병렬 작업 가이드: `/Users/user/TapTapCho/agent.md`
- 아이디어/진행 상태: `/Users/user/TapTapCho/checklist.md`
- BMGD 도입/사용 기록: `/Users/user/TapTapCho/docs/bmad-game-dev-studio.md`
- 서비스 정책 페이지: `/Users/user/TapTapCho/about.html`, `/Users/user/TapTapCho/contact.html`, `/Users/user/TapTapCho/privacy.html`, `/Users/user/TapTapCho/terms.html`, `/Users/user/TapTapCho/dmca.html`

## 8) 토스 미니앱 게임 표준 (webgame-18 기준)

`Orbit Survivor` (`/Users/user/TapTapCho/webgame-18`)를 토스 게임 미니앱 심사 기준에 맞추면서 정리한 공통 패턴입니다.  
앞으로 다른 웹게임도 토스에 올릴 때 이 섹션을 기본 템플릿처럼 따라가면 됩니다.

### 8-1) 참조한 토스 공식 문서

- 게임 출시 가이드: [게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-game.html)
- 출시 절차 / CORS / 용량 정책: [미니앱 출시](https://developers-apps-in-toss.toss.im/development/deploy.html)
- Safe Area 처리: [Safe Area 여백 값 구하기](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%ED%99%94%EB%A9%B4%20%EC%A0%9C%EC%96%B4/safe-area.html)
- 게임 유저 식별자: [게임 로그인 (`getUserKeyForGame`)](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%EA%B2%8C%EC%9E%84/getUserKeyForGame.html)
- iOS 뒤로가기 스와이프 제어: [setIosSwipeGestureEnabled](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%ED%99%94%EB%A9%B4%20%EC%A0%9C%EC%96%B4/setIosSwipeGestureEnabled.html)
- 화면 방향 제어: [setDeviceOrientation](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%ED%99%94%EB%A9%B4%20%EC%A0%9C%EC%96%B4/setDeviceOrientation.html)
- 미니앱 종료: [closeView](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%ED%99%94%EB%A9%B4%20%EC%A0%9C%EC%96%B4/closeView.html)
- 광고 개요: [인앱광고 이해하기](https://developers-apps-in-toss.toss.im/ads/intro.html)
- 광고 구현: [개발하기](https://developers-apps-in-toss.toss.im/ads/develop.html)
- 광고 콘솔 설정: [광고 관리하기](https://developers-apps-in-toss.toss.im/ads/console.html)
- 사업자 등록: [사업자 등록하기](https://developers-apps-in-toss.toss.im/prepare/register-business.html)
- 광고 로드: [loadAppsInTossAdMob](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%EA%B4%91%EA%B3%A0/loadAppsInTossAdMob.html)
- 광고 노출: [showAppsInTossAdMob](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%EA%B4%91%EA%B3%A0/showAppsInTossAdMob.html)

### 8-2) 실제로 적용한 방식

- 게임 폴더를 토스 전용 단위로 독립시킨다.
  - 예시: `/Users/user/TapTapCho/webgame-18`
  - 공용 사이트 헤더/푸터/가이드 스크립트는 빼고, 게임 화면만 독립적으로 렌더링한다.
- 레이아웃은 무조건 풀스크린 기준으로 만든다.
  - `viewport-fit=cover` 사용
  - CSS에 `--safe-top/right/bottom/left` 변수를 두고 Safe Area 값으로 반영
  - 토스 기본 X 버튼과 게임 UI가 겹치지 않게 상단 여백을 고려한다.
- 토스 브리지는 얇은 커스텀 번들로 감싼다.
  - 현재 구현 파일: `/Users/user/TapTapCho/webgame-18/toss-bridge-source.js`
  - 브라우저용 번들: `/Users/user/TapTapCho/webgame-18/toss-bridge.js`
  - 바닐라 HTML/Canvas 게임은 이 방식이 재사용성이 좋다.
- 게임 진입 시 토스 전용 UX를 적용한다.
  - `setDeviceOrientation({ type: 'portrait' })`
  - `setIosSwipeGestureEnabled({ isEnabled: false })`
  - `backEvent`를 받아 자체 종료 확인 모달을 띄운다.
  - 실제 종료는 `closeView()`로 처리하고, 웹 미리보기에서는 `history.back()` 또는 상위 경로 이동으로 fallback 한다.
- 유저 식별과 저장은 게임 로그인 기준으로 맞춘다.
  - `getUserKeyForGame()`으로 `hash`를 받아 사용자별 저장 공간 키를 분리한다.
  - 예: `orbit-survivor:user:<hash>:best`
  - 브라우저 미리보기에서는 `localStorage` fallback 을 유지한다.
- 사운드는 개별 토글과 백그라운드 pause/resume 이 모두 있어야 한다.
  - BGM 토글
  - 효과음 토글
  - `visibilitychange`, `pagehide`, `homeEvent` 에서 자동 pause
  - 다시 돌아오면 resume
- 정보성 링크는 게임 플레이를 방해하지 않는 모달이나 별도 진입점으로 넣는다.
  - 개인정보처리방침
  - 이용약관
  - 문의하기
- 번들 용량은 작게 유지한다.
  - 토스 업로드 번들은 압축 해제 기준 `100MB 이하`
  - 큰 오디오/리소스는 외부에서 가져오거나 지연 로딩을 검토한다.

### 8-3) Orbit Survivor에서 수정한 핵심 파일

- 페이지 구조: `/Users/user/TapTapCho/webgame-18/index.html`
- 풀스크린 / Safe Area / 모달 스타일: `/Users/user/TapTapCho/webgame-18/style.css`
- 게임 로직 / 사운드 / 백그라운드 처리 / 토스 저장소 연동: `/Users/user/TapTapCho/webgame-18/game.js`
- 토스 브리지 소스: `/Users/user/TapTapCho/webgame-18/toss-bridge-source.js`
- 토스 브리지 번들: `/Users/user/TapTapCho/webgame-18/toss-bridge.js`
- 광고 메모: `/Users/user/TapTapCho/webgame-18/TOSS_ADS_PLAN.md`

### 8-4) 다른 게임에도 그대로 적용할 작업 순서

1. 새 게임 폴더를 만든다.
2. 공용 사이트용 헤더/푸터/광고 슬롯/가이드 스크립트를 제거한다.
3. `index.html` 을 풀스크린 토스용 구조로 단순화한다.
4. `style.css` 에 Safe Area 변수와 전체 화면 레이아웃을 넣는다.
5. `game.js` 에서 오디오 토글, 백그라운드 pause/resume, 종료 확인 모달을 구현한다.
6. `toss-bridge-source.js` 를 게임 이름에 맞게 복제하고 필요한 브리지 함수만 유지한다.
7. `esbuild` 로 `toss-bridge.js` 를 다시 생성한다.
8. `getUserKeyForGame()` 기반 저장소 키를 게임별 prefix 로 바꾼다.
9. QR 테스트와 실제 토스앱에서 동작을 각각 확인한다.
10. `.ait` 번들 용량과 CORS 설정까지 체크한 뒤 검토 요청한다.

### 8-5) 외부 배포와 CORS 메모

- 지금처럼 Vercel 같은 외부 웹 호스팅을 써도 괜찮다.
- 다만 토스 라이브 환경은 결국 토스가 배포한 미니앱 번들이 기준이다.
- 외부 API / CDN / 오디오 파일을 계속 쓸 경우 CORS 허용 Origin 에 아래를 반드시 넣는다.
  - 실제 서비스: `https://<appName>.apps.tossmini.com`
  - QR 테스트: `https://<appName>.private-apps.tossmini.com`
- 테스트 환경에서 되더라도 라이브 환경에서 다시 확인한다.

## 9) 토스 인앱광고 메모

현재는 사업자 등록과 광고 그룹 생성 전이라 실제 광고는 붙이지 않은 상태입니다.  
상세 메모는 `/Users/user/TapTapCho/webgame-18/TOSS_ADS_PLAN.md` 에 정리했고, 공통 원칙은 아래와 같습니다.

### 9-1) 전제 조건

- 사업자 등록 완료
- 정산 정보 입력 및 심사 완료
- 콘솔에서 광고 그룹 생성
- 실제 `adGroupId` 확보

### 9-2) 권장 방식

- 신규 연동은 구 AdMob v1 API 대신 `In-App Ads 2.0 ver2` 기준으로 진행한다.
- 즉, `GoogleAdMob.loadAppsInTossAdMob` 와 `GoogleAdMob.showAppsInTossAdMob` 조합을 사용한다.
- 순서는 항상 `load -> show -> 다음 load` 로 유지한다.

### 9-3) 이 프로젝트에서 추천하는 광고 형태

- `Orbit Survivor` 같은 풀스크린 액션 게임은 `보상형 광고`가 1순위다.
- 가장 자연스러운 위치는 게임오버 모달의 `광고 보고 1회 이어하기` 버튼이다.
- 배너 광고는 게임 플레이 화면을 가리기 쉬워서 우선순위가 낮다.
- 전면 광고는 필요하면 나중에 도입하되, 앱 진입 직후 노출은 피한다.

### 9-4) 광고 붙일 때 구현 원칙

- 광고 중에는 게임 사운드를 멈춘다.
- 광고 종료 후에는 사운드를 다시 재생한다.
- 보상 지급은 `userEarnedReward` 이벤트에서만 처리한다.
- 라운드당 리워드 이어하기는 1회만 허용하는 편이 안전하다.
- 샌드박스에서는 광고가 동작하지 않으므로 콘솔 QR 테스트를 사용한다.

### 9-5) 테스트 ID

- 전면형: `ait-ad-test-interstitial-id`
- 리워드: `ait-ad-test-rewarded-id`
- 배너 리스트: `ait-ad-test-banner-id`
- 배너 피드: `ait-ad-test-native-image-id`

## 10) 라이선스
외부 에셋/음원 사용 조건은 `THIRD_PARTY_LICENSES.md`를 단일 기준으로 따릅니다.
