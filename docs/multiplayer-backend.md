# Multiplayer backend

The multiplayer features use a Cloudflare Worker + Durable Object to keep a shared leaderboard and timeline of gifted items.

## Core pieces
- `cloudflare/multiplayer/src/index.ts` accepts incoming `/ws` WebSocket upgrades, picks a `room` name (default `memorygame`), and forwards the request to the `LeaderboardRoom` Durable Object.
- `LeaderboardRoom` (same folder) stores player records plus a short gift log, persists them via Durable Object storage, and broadcasts real-time updates to every connected client.
- The worker exposes simple HTTP health endpoints (`/` and `/health`) and routes `/ws` to the durable object.
- Profile photos now live alongside the leaderboard. `POST /profile-picture` accepts `multipart/form-data` (`name` + `image`) and pushes the blob into the `PROFILE_PICS` R2 bucket defined as `memorygame-profile-pics` in `wrangler.toml`. `GET /profile-picture/{key}` streams the image back with caching, while `/profile` (GET/POST) proxies through the DO to persist `profilePictureKey` metadata plus CORS headers. The home view uses these endpoints (by default deriving the base from `VITE_MULTIPLAYER_WS_URL`, or overriding via `VITE_PROFILE_API_BASE`) so players can upload and preload their avatar before jumping in.

## Client <-> server protocol
### Client messages
| Type | Payload | Behavior |
| ---- | ------- | -------- |
| `join` | `{ name: string; score?: number; unlocked?: string[] }` | Registers the player, sets their score, snapshots their unlocked collection, and replies with the current leaderboard snapshot plus a `connected` event. |
| `score_update` | `{ score: number; unlocked?: string[] }` | Updates the player's high score and unlocked list, then pushes a leaderboard update to all sessions. |
| `send_gift` | `{ to: string; message?: string; giftType?: string; squish?: { id: string; name?: string; image?: string } }` | Applies the gift (incrementing gifts sent/received), optionally transfers a specific Squishmallow by ID, and broadcasts both the gift event and the refreshed leaderboard. |

### Server messages
| Type | Payload | Notes |
| ---- | ------- | ----- |
| `leaderboard_snapshot` | `{ players: LeaderboardPlayer[]; gifts: GiftRecord[] }` | Sent immediately when a socket connects so the UI can hydrate state. |
| `leaderboard_update` | `{ players: LeaderboardPlayer[] }` | Broadcast after every score or gift change. |
| `gift_event` | `{ gift: GiftRecord }` | Broadcast when a player gifts another. |
| `connected` | `{ player: LeaderboardPlayer }` | Acknowledges the current player's entry. |
| `error` | `{ message: string }` | Non-fatal errors (invalid name, missing payload, etc.). |

`LeaderboardPlayer` includes `name`, `score`, `lastUpdated`, `giftsSent`, `giftsReceived`, and the persisted `unlockedIds`. `GiftRecord` includes `from`, `to`, `message`, `type`, `createdAt`, and optional `squishId`, `squishName`, `squishImage` for delivered Squishmallows.

## Running locally
1. Install the type helpers before you run the worker: `cd cloudflare/multiplayer && npm install`.
2. Start the worker in dev mode (from the repo root) with:
   `npx wrangler dev cloudflare/multiplayer/src/index.ts --config cloudflare/multiplayer/wrangler.toml`
   this ensures the right entry point and Durable Object bindings are loaded.
3. Publish with the modern Wrangler CLI using:
   `npx wrangler deploy --config cloudflare/multiplayer/wrangler.toml`
   (the older `publish` command has been replaced by `deploy` in Wrangler v4+).

## Frontend integration
- The React app connects via `utils/multiplayer.ts` (`useMultiplayerLeaderboard`) and reads the `VITE_MULTIPLAYER_WS_URL` environment variable. Set that value (for example, `VITE_MULTIPLAYER_WS_URL="wss://memorygame-multiplayer.<your-domain>.workers.dev/ws"`) in `.env.local` so the leaderboard UI can reach the worker.
- The leaderboard page now shows the live player list, gift form, and gift feed via that hook. Score updates are emitted from `utils/storage.ts` through `SCORE_UPDATE_EVENT` so the WebSocket client keeps the Durable Object in sync.
