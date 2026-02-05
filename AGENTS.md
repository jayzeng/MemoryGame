# Repository Guidelines

This Vite/React memory game guide lists the repo layout, commands, and contribution expectations.

## Project Structure & Module Organization
- Root houses entry points (`index.html`, `index.tsx`, `App.tsx`), shared types (`types.ts`, `constants.ts`), data (`squishmallows.json`, `metadata.json`), and configs (`tsconfig.json`, `vite.config.ts`).
- Each view component lives alone in `components/`; helpers belong in `utils/` (`SoundManager.ts`, `storage.ts`).
- Shared data stays in `squishmallowsData.ts` or constant files to avoid redundancy.
- Multiplayer backend lives in `cloudflare/multiplayer/` (Cloudflare Worker + Durable Object + optional R2 bucket bindings). Frontend integration is in `utils/multiplayer.ts`.
- Docs live in `docs/` (notably `docs/multiplayer-backend.md` plus product/UI specs).
- Keep CI automation under `.github/workflows/` (GitHub Pages deploy + Cloudflare worker deploy).

## Build, Test, and Development Commands
- Node.js **18+** works locally; CI uses Node.js **20**.
- `npm install` installs the Vite/React dependency graph after cloning or dependency changes (CI uses `npm ci`).
- `npm run dev` launches Vite’s development server with hot reload for feature work.
- `npm run build` outputs the production bundle into `dist/` for deployment previews.
- `npm run preview` serves the production bundle locally to verify release readiness.
- Multiplayer worker (from repo root):
  - `cd cloudflare/multiplayer && npm install`
  - `npx wrangler dev cloudflare/multiplayer/src/index.ts --config cloudflare/multiplayer/wrangler.toml`
  - `npx wrangler deploy --config cloudflare/multiplayer/wrangler.toml`

## Coding Style & Naming Conventions
- Follow 2-space indentation as shown in existing files and trust Vite/ESLint defaults.
- Name React components and their exports in PascalCase (e.g., `export const WorldSelect = () => {…}`).
- Keep helpers camelCase and filenames descriptive (`utils/SoundManager.ts`).
- Favor module-relative imports from the repo root (`./components/Game`) for clarity.

## Testing Guidelines
- No automated tests yet; rely on `npm run dev` plus a manual run-through for validation.
- If you touch multiplayer, also validate a WebSocket connection using `VITE_MULTIPLAYER_WS_URL` and confirm leaderboard + gifting flows update live.
- When tests are added, pick React/Vite-friendly tools and document the new command.
- Name test suites after the feature being tested (`Game.test.tsx`, `storage.spec.ts`).

## Commit & Pull Request Guidelines
- Commit messages follow the conventional log style (`feat: …`, `added deployment workflow`) with concise, imperative verbs.
- PRs should summarize user-visible changes, link related issues/metadata, and include screenshots for UI tweaks.
- Run `npm run build` locally and mention manual QA status before requesting review.

## Security & Configuration Tips
- The frontend is client-side; it does not require API keys. Local config is via Vite env vars in `.env.local` (use `.env.template` as the starting point).
- Multiplayer requires `VITE_MULTIPLAYER_WS_URL` (and optionally `VITE_PROFILE_API_BASE`) for the frontend, plus Cloudflare bindings/secrets for deployment (`CF_API_TOKEN` in GitHub Actions, `PROFILE_PICS` R2 bucket binding in `cloudflare/multiplayer/wrangler.toml`).
- GitHub Pages deploy sets `VITE_BASE_PATH` during CI so asset paths work under `/<repo>/`; avoid hardcoding base paths in code.
