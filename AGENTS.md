# AGENTS

- Treat root game folders as compatibility symlinks.
- Do real work in `games/<project>/`.
- Keep changes scoped to one project unless asked.
- Shared assets/code live in `shared/` and `static/`.
- Server code lives in `scripts/`.
- Tooling and process docs live in `meta/` and `docs/`.
- Preserve runtime behavior and public URLs.
- For Toss mini-app `.ait` packages, always verify `brand.icon` is set in `granite.config.ts` and prefer a stable HTTPS image URL instead of relying on a generated/data URI; missing icon info has caused review rejection.
- For Toss mini-app submissions, also verify the Toss developer center mini-app settings include the same icon, and keep `appName` exactly matched to the console value.
