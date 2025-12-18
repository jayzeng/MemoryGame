# Squishmallow Memory Parade

A cozy, Vite + React-powered memory game that lets players collect beloved Squishmallows across multiple parade worlds. The experience focuses on gentle audio cues, supportive text, and persistent progress so a child (or grown-up) never feels rushed.

## View and play it live
Try the deployed experience at https://jayzeng.github.io/MemoryGame/ to validate the current build without running it locally.

## About this project
- I built Squishmallow Memory Parade for my kids to celebrate their Squishmallow obsession; it is purely a hobby project with them in mind.
- All character data and imagery come from publicly available internet sources (e.g., the Squishmallow wiki crawler documented in `scripts/README.md`); I claim no ownership of the franchise or its assets.

## Highlights
- **Player profile & progress (Home).** The landing screen captures a player name, keeps it in `localStorage`, and shows a collection meter before you can start playing.
- **Three parade worlds.** `WorldSelect` lets players launch the next level inside Cozy Bedroom, Candy Carnival, or Forest Friends. Each world increases the number of pairs (8, 14, 20) and adapts the grid layout to the board size.
- **Polished game loop.** The `Game` component builds the shuffled deck, speaks each Squishmallow name, plays audio using `SoundManager`, and rewards players with confetti plus modals when new friends are unlocked. Pause/resume, restart, and detailed character overlays keep the experience flexible.
- **Collection book and leaderboard.** `ParadeBook` highlights which Squishmallows are unlocked (with rarity badges and locked silhouettes), while `Leaderboard` uses per-player stats to track the top collectors. Both screens read/write via `utils/storage`.
- **Entirely client-side.** The UI relies on `localStorage` for player name, unlocked IDs, and leaderboard entries—no backend, no API key, no `.env` file required.

## Getting started
### Requirements
- Node.js **18+** (required by the Vite toolchain and modern dependencies)
- A browser that supports Web Audio and the Speech Synthesis API (used by `utils/SoundManager`)

### Install & run
1. `npm install`
2. `npm run dev` (starts Vite’s dev server with hot reload)

### Build & preview
- `npm run build` (produces an optimized `dist/`)
- `npm run preview` (serves the production build locally)

## Gameplay & persistence
Routes are defined in `App.tsx`: `/` for Home, `/worlds` for world selection, `/game/:worldId` for the board, `/book` for Parade Book, and `/leaderboard` for Top Collectors. The game tracks flipped cards, matches, unlocked Squishmallows, and leaderboards entirely in the browser, so progress carries across sessions as long as the same player name is entered.

## Data & tooling
- Squishmallow metadata comes from `squishmallows.json` via `squishmallowsData.ts`. The constants file transforms that data into `MOCK_SQUISHMALLOWS`, attaches rarity tiers, and seeds worlds with branded colors.
- `utils/storage.ts` handles player names, unlock state (per sanitized name), and leaderboard updates.
- `utils/SoundManager.ts` wraps Web Audio + SpeechSynthesis feedback, offering flip, match, mismatch, and win cues.
- To refresh the Squishmallow data, run the crawler described in `scripts/README.md`. It crawls the Squishmallow wiki and adds new characters to `squishmallows.json` when needed.

## Documentation & design references
- `docs/Squishmallow_Memory_Parade_Product_Spec.md` (product goals, goals and success metrics, mechanics, accessibility, and long-term vision)
- `docs/Squishmallow_Memory_Parade_Figma_UI_Specs.md` (UI layouts, spacing, and portrait-first guidance)
- `scripts/README.md` (instructions for the Python crawler that updates `squishmallows.json`)

## Testing & QA
- No automated tests yet; validate changes by running `npm run dev`, playing through a world, and confirming the Parade Book and Leaderboard reflect progress.

## Contribution notes
- Follow the repo style: 2-space indentation, PascalCase React components, camelCase helpers, and module-relative imports from the repo root.
- Trust Vite/ESLint defaults, document new manual QA steps, and update the docs above when you adjust goals, progression, or visuals.

## License
This repository is licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0), which means the game and this documentation are shared under the same terms—no warranty and no ownership of the character IP or imagery.
