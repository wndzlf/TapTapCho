# Retro Hero: Street Beat Toss Package

- 루트 게임 소스: `/Users/user/TapTapCho/games/retro-hero-street-beat`
- 빌드 산출물: `/Users/user/TapTapCho/games/retro-hero-street-beat/toss-package/dist`

## 사용 방법

```bash
cd /Users/user/TapTapCho/games/retro-hero-street-beat/toss-package
npm run build
```

로컬 미리보기:

```bash
npm run dev
```

## 광고 메모

- 기본 보상형 광고 그룹 ID: `ait-ad-test-rewarded-id`
- 운영 ID로 교체하려면 `index.html` 로드 전에 아래 전역 상수를 주입:

```js
window.__RETRO_HERO_STREET_BEAT_TOSS_REWARDED_AD_GROUP_ID = 'your-ad-group-id';
```
