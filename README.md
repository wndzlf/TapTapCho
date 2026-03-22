# TapTapCho

This repo is organized for fast per-project work.

## Product Direction

TapTapCho builds mini games that users understand by touching and seeing, not by reading long explanations.  
말로 길게 설명하기보다, 동작과 시각 피드백만으로 바로 즐길 수 있는 게임을 지향합니다.

- Apple-like clarity: simple, immediate UI hierarchy
- Interaction-first design: one touch should reveal how the game works
- Motion and feedback over text-heavy tutorials
- Ready for Apps in Toss publishing and ad-based monetization from day one

- Actual game/app sources live in `games/`
- Shared runtime code lives in `shared/`
- Static media lives in `static/`
- Server code stays in `scripts/`
- AI/process docs live in `docs/` and `meta/`

Legacy root paths are preserved as symlinks so existing URLs, scripts, and deploy paths keep working.

Start here:
- Structure guide: [`docs/ai-monorepo-structure.md`](/tmp/taptapcho-structure.P9ppxC/docs/ai-monorepo-structure.md)
- Full project guide: [`docs/repo-guide.md`](/tmp/taptapcho-structure.P9ppxC/docs/repo-guide.md)
