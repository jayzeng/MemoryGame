# Repository Guidelines

This Vite/React memory game guide lists the repo layout, commands, and contribution expectations.

## Project Structure & Module Organization
- Root houses entry points (`index.html`, `index.tsx`, `App.tsx`), shared types (`types.ts`, `constants.ts`), data (`squishmallows.json`, `metadata.json`), and configs (`tsconfig.json`, `vite.config.ts`).
- Each view component lives alone in `components/`; helpers belong in `utils/` (`SoundManager.ts`, `storage.ts`).
- Shared data stays in `squishmallowsData.ts` or constant files to avoid redundancy.
- Keep CI automation under `.github/workflows/` so it is easy to find.

## Build, Test, and Development Commands
- `npm install` installs the Vite/React dependency graph after cloning or dependency changes.
- `npm run dev` launches Vite’s development server with hot reload for feature work.
- `npm run build` outputs the production bundle into `dist/` for deployment previews.
- `npm run preview` serves the production bundle locally to verify release readiness.

## Coding Style & Naming Conventions
- Follow 2-space indentation as shown in existing files and trust Vite/ESLint defaults.
- Name React components and their exports in PascalCase (e.g., `export const WorldSelect = () => {…}`).
- Keep helpers camelCase and filenames descriptive (`utils/SoundManager.ts`).
- Favor module-relative imports from the repo root (`./components/Game`) for clarity.

## Testing Guidelines
- No automated tests yet; rely on `npm run dev` plus a manual run-through for validation.
- When tests are added, pick React/Vite-friendly tools and document the new command.
- Name test suites after the feature being tested (`Game.test.tsx`, `storage.spec.ts`).

## Commit & Pull Request Guidelines
- Commit messages follow the conventional log style (`feat: …`, `added deployment workflow`) with concise, imperative verbs.
- PRs should summarize user-visible changes, link related issues/metadata, and include screenshots for UI tweaks.
- Run `npm run build` locally and mention manual QA status before requesting review.

## Security & Configuration Tips
- Store secrets such as the Gemini API key in `.env.local` (per the README) and never commit the file.
- Call out any external-service requirements in PRs when a change touches configuration or onboarding steps.
