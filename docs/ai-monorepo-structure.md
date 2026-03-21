# AI Monorepo Structure

## Layout

- `games/`: actual game and mini-app projects
- `shared/`: common CSS, JS, templates, and agent guidance
- `static/`: images, sounds, and static site pages
- `scripts/`: server code and server state only
- `meta/`: process docs, internal notes, and non-server tools
- `docs/`: human-facing project documentation

## Compatibility

- Legacy root game paths are symlinks to `games/<project>/`
- Legacy root `assets`, `templates`, `data`, and policy pages are symlinked
- This preserves existing runtime URLs and deploy behavior while shifting real source out of root

## AI Workflow

1. Enter the specific project at `games/<project>/`
2. Read that folder's `README.md` and `AGENTS.md`
3. Touch `shared/` only if the task truly spans multiple projects
4. Ignore root symlinks unless debugging compatibility itself
