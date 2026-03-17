# BMad Game Dev Studio (BMGD) 도입 기록

TapTapCho 프로젝트에서 BMGD를 사용하기로 결정하고, 아래 레퍼런스를 기준으로 운영합니다.

## 공식 링크
- GitHub: https://github.com/bmad-code-org/bmad-module-game-dev-studio
- BMGD 문서: http://game-dev-studio-docs.bmad-method.org
- BMad Core 문서: https://docs.bmad-method.org

## 설치 기록
- 설치 일시: 2026-03-10
- 설치 위치: `/Users/user/TapTapCho/_bmad`
- 사용 모듈: `gds` (BMGD)
- 설치 커맨드:

```bash
npx -y bmad-method@latest install \
  --directory /Users/user/TapTapCho \
  --custom-content <bmad-module-game-dev-studio>/src \
  --modules gds \
  --tools none \
  --yes
```

설치 검증:

```bash
npx -y bmad-method@latest status
```

## 프로젝트에서의 사용 방식
아래 워크플로우를 기본으로 사용합니다.

- 빠른 시제품: `quick-dev`, `quick-spec`
- 기획 문서: `game-brief`, `gdd`, `narrative`
- 기술 설계: `game-architecture`, `generate-project-context`
- 운영/검수: `sprint-planning`, `sprint-status`, `code-review`

## 1회 사용 샘플
초기 적용 샘플 문서:

- `/Users/user/TapTapCho/_bmad-output/planning-artifacts/taptapcho-bmgd-quick-brief.md`
- `/Users/user/TapTapCho/_bmad-output/gdd.md` (Winter Ski Rush GDD)
