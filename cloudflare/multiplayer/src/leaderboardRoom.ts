import type { DurableObjectState } from '@cloudflare/workers-types';
import { sanitizeName } from './playerUtils';

const PROFILE_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const MAX_LEADERBOARD_SIZE = 20;
const GIFT_HISTORY_LIMIT = 24;

interface PlayerState {
  id: string;
  name: string;
  score: number;
  giftsSent: number;
  giftsReceived: number;
  lastUpdated: string;
  unlockedIds: string[];
  profilePictureKey?: string;
}

interface GiftRecord {
  id: string;
  from: string;
  to: string;
  message: string;
  type: string;
  createdAt: string;
  squishId?: string;
  squishName?: string;
  squishImage?: string;
}

interface GiftSquish {
  id: string;
  name?: string;
  image?: string;
}

type ClientMessage =
  | { type: 'join'; name: string; score?: number; unlocked?: string[] }
  | { type: 'score_update'; score: number; unlocked?: string[] }
  | {
      type: 'send_gift';
      to: string;
      message?: string;
      giftType?: string;
      squish?: GiftSquish;
    };

type ServerMessage =
  | { type: 'leaderboard_snapshot'; players: PlayerState[]; gifts: GiftRecord[] }
  | { type: 'leaderboard_update'; players: PlayerState[] }
  | { type: 'gift_event'; gift: GiftRecord }
  | { type: 'connected'; player: PlayerState }
  | { type: 'error'; message: string };

type ConnectionMeta = {
  playerId?: string;
  playerName?: string;
};

const normalizeUnlocked = (input?: unknown): string[] => {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  return input.reduce<string[]>((result, item) => {
    if (typeof item !== 'string') return result;
    const trimmed = item.trim();
    if (!trimmed) return result;
    if (seen.has(trimmed)) return result;
    seen.add(trimmed);
    result.push(trimmed);
    return result;
  }, []);
};

const sanitizeName = (value: string) => {
  const trimmed = (value ?? '').trim().slice(0, 32);
  const display = trimmed || 'Guest';
  const slug = display
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return {
    id: slug || `guest_${crypto.randomUUID().slice(0, 6)}`,
    display,
  };
};

export class LeaderboardRoom {
  private players = new Map<string, PlayerState>();
  private gifts: GiftRecord[] = [];
  private sockets = new Map<number, WebSocket>();
  private connectionMeta = new Map<number, ConnectionMeta>();
  private nextConnectionId = 0;
  private ready: Promise<void>;

  constructor(private state: DurableObjectState) {
    this.ready = this.bootstrap();
  }

  private async bootstrap() {
    const stored = await this.state.storage.get<{
      players?: Record<string, PlayerState>;
      gifts?: GiftRecord[];
    }>(['players', 'gifts']);
    this.players = new Map(Object.entries(stored.players ?? {}));
    this.gifts = stored.gifts ?? [];
  }

  private async persistState() {
    await Promise.all([
      this.state.storage.put('players', Object.fromEntries(this.players)),
      this.state.storage.put('gifts', this.gifts),
    ]);
  }

  private getLeaderboardSnapshot() {
    const snapshot = Array.from(this.players.values());
    snapshot.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return Date.parse(b.lastUpdated) - Date.parse(a.lastUpdated);
    });
    return snapshot.slice(0, MAX_LEADERBOARD_SIZE);
  }

  private broadcast(payload: ServerMessage) {
    for (const socket of this.sockets.values()) {
      if (socket.readyState === WebSocket.OPEN) {
        this.sendToSocket(socket, payload);
      }
    }
  }

  private sendToSocket(socket: WebSocket, payload: ServerMessage) {
    try {
      socket.send(JSON.stringify(payload));
    } catch (error) {
      console.warn('Failed to send leaderboard payload', error);
    }
  }

  private sendError(socket: WebSocket, message: string) {
    this.sendToSocket(socket, { type: 'error', message });
  }

  private ensurePlayer(playerId: string, name: string) {
    const existing = this.players.get(playerId);
    if (existing) {
      existing.name = name;
      return existing;
    }
    const entry: PlayerState = {
      id: playerId,
      name,
      score: 0,
      giftsSent: 0,
      giftsReceived: 0,
      lastUpdated: new Date().toISOString(),
      unlockedIds: [],
    };
    this.players.set(playerId, entry);
    return entry;
  }

  private updatePlayerScore(playerId: string, name: string, score: number) {
    const normalized = Math.max(0, Math.floor(score ?? 0));
    const entry = this.ensurePlayer(playerId, name);
    entry.score = Math.max(entry.score, normalized);
    entry.lastUpdated = new Date().toISOString();
    this.players.set(playerId, entry);
    return entry;
  }

  private incrementGiftCounter(
    playerId: string,
    name: string,
    field: 'giftsSent' | 'giftsReceived'
  ) {
    const entry = this.ensurePlayer(playerId, name);
    entry[field] += 1;
    entry.lastUpdated = new Date().toISOString();
    this.players.set(playerId, entry);
    return entry;
  }

  private syncUnlocked(playerId: string, name: string, unlocked?: string[]) {
    const normalized = normalizeUnlocked(unlocked);
    if (!normalized.length) return;
    const entry = this.ensurePlayer(playerId, name);
    const current = new Set(entry.unlockedIds);
    let merged = false;
    normalized.forEach((value) => {
      if (!current.has(value)) {
        current.add(value);
        merged = true;
      }
    });
    if (!merged) {
      return entry;
    }
    entry.unlockedIds = Array.from(current);
    entry.lastUpdated = new Date().toISOString();
    this.players.set(playerId, entry);
    return entry;
  }

  private removeUnlocked(playerId: string, name: string, unlockedId?: string) {
    if (!unlockedId) return;
    const entry = this.ensurePlayer(playerId, name);
    if (!entry.unlockedIds.includes(unlockedId)) {
      return entry;
    }
    entry.unlockedIds = entry.unlockedIds.filter((value) => value !== unlockedId);
    entry.lastUpdated = new Date().toISOString();
    this.players.set(playerId, entry);
    return entry;
  }

  private async updateProfilePicture(name: string, key: string) {
    const trimmedKey = key?.trim();
    if (!trimmedKey) return null;
    const normalized = sanitizeName(name);
    const entry = this.ensurePlayer(normalized.id, normalized.display);
    if (entry.profilePictureKey === trimmedKey) {
      return entry;
    }
    entry.profilePictureKey = trimmedKey;
    entry.lastUpdated = new Date().toISOString();
    this.players.set(normalized.id, entry);
    await this.persistState();
    this.broadcast({ type: 'leaderboard_update', players: this.getLeaderboardSnapshot() });
    return entry;
  }

  private sendSnapshot(socket: WebSocket) {
    this.sendToSocket(socket, {
      type: 'leaderboard_snapshot',
      players: this.getLeaderboardSnapshot(),
      gifts: this.gifts,
    });
  }

  private handleMessage(connectionId: number, message: ClientMessage, socket: WebSocket) {
    switch (message.type) {
      case 'join':
        this.handleJoin(connectionId, message, socket);
        break;
      case 'score_update':
        this.handleScoreUpdate(connectionId, message, socket);
        break;
      case 'send_gift':
        this.handleGift(connectionId, message, socket);
        break;
      default:
        this.sendError(socket, 'Unsupported message');
    }
  }

  private async handleJoin(connectionId: number, payload: ClientMessage & { type: 'join' }, socket: WebSocket) {
    const trimmed = payload.name?.trim();
    if (!trimmed) {
      this.sendError(socket, 'Name is required to join the parade');
      return;
    }
    const normalized = sanitizeName(trimmed);
    const meta = this.connectionMeta.get(connectionId);
    if (!meta) return;
    meta.playerId = normalized.id;
    meta.playerName = normalized.display;
    this.updatePlayerScore(normalized.id, normalized.display, payload.score ?? 0);
    this.syncUnlocked(normalized.id, normalized.display, payload.unlocked);
    await this.persistState();
    this.sendToSocket(socket, {
      type: 'connected',
      player: this.players.get(normalized.id)!,
    });
    this.sendSnapshot(socket);
    this.broadcast({ type: 'leaderboard_update', players: this.getLeaderboardSnapshot() });
  }

  private async handleScoreUpdate(
    connectionId: number,
    payload: ClientMessage & { type: 'score_update' },
    socket: WebSocket
  ) {
    const meta = this.connectionMeta.get(connectionId);
    if (!meta?.playerId || !meta.playerName) {
      this.sendError(socket, 'Join the leaderboard before updating a score');
      return;
    }
    this.updatePlayerScore(meta.playerId, meta.playerName, payload.score);
    this.syncUnlocked(meta.playerId, meta.playerName, payload.unlocked);
    await this.persistState();
    this.broadcast({ type: 'leaderboard_update', players: this.getLeaderboardSnapshot() });
  }

  private async handleGift(
    connectionId: number,
    payload: ClientMessage & { type: 'send_gift' },
    socket: WebSocket
  ) {
    const meta = this.connectionMeta.get(connectionId);
    if (!meta?.playerId || !meta.playerName) {
      this.sendError(socket, 'Set your name before sending gifts');
      return;
    }
    const target = payload.to?.trim();
    if (!target) {
      this.sendError(socket, 'Choose someone to gift');
      return;
    }
    const targetIdentity = sanitizeName(target);
    this.incrementGiftCounter(meta.playerId, meta.playerName, 'giftsSent');
    this.incrementGiftCounter(targetIdentity.id, targetIdentity.display, 'giftsReceived');
    const squishId = payload.squish?.id?.trim();
    const squishName = payload.squish?.name?.trim();
    const squishImage = payload.squish?.image?.trim();

    if (squishId) {
      this.removeUnlocked(meta.playerId, meta.playerName, squishId);
      this.syncUnlocked(targetIdentity.id, targetIdentity.display, [squishId]);
    }

    const gift: GiftRecord = {
      id: crypto.randomUUID(),
      from: meta.playerName,
      to: targetIdentity.display,
      message: payload.message?.trim() || 'A little surprise from the parade',
      type: payload.giftType || 'sparkles',
      createdAt: new Date().toISOString(),
      squishId: squishId || undefined,
      squishName: squishName || undefined,
      squishImage: squishImage || undefined,
    };

    this.gifts.unshift(gift);
    if (this.gifts.length > GIFT_HISTORY_LIMIT) {
      this.gifts = this.gifts.slice(0, GIFT_HISTORY_LIMIT);
    }

    await this.persistState();
    this.broadcast({ type: 'gift_event', gift });
    this.broadcast({ type: 'leaderboard_update', players: this.getLeaderboardSnapshot() });
  }

  private buildProfileHeaders() {
    return {
      'Content-Type': 'application/json',
      ...PROFILE_CORS_HEADERS,
    };
  }

  private jsonResponse(payload: unknown, status = 200) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: this.buildProfileHeaders(),
    });
  }

  private handleNamesRequest(request: Request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: PROFILE_CORS_HEADERS });
    }
    if (request.method !== 'GET') {
      return this.jsonResponse({ error: 'Method not allowed' }, 405);
    }
    const names = Array.from(this.players.values())
      .map((player) => player.name)
      .filter(Boolean);
    return this.jsonResponse({ names });
  }

  private async handleProfileRequest(request: Request, url: URL) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: PROFILE_CORS_HEADERS });
    }
    if (request.method === 'GET') {
      const nameParam = url.searchParams.get('name')?.trim();
      if (!nameParam) {
        return this.jsonResponse({ error: 'Name query parameter is required' }, 400);
      }
      const normalized = sanitizeName(nameParam);
      const existing = this.players.get(normalized.id);
      return this.jsonResponse(
        {
          name: normalized.display,
          profilePictureKey: existing?.profilePictureKey ?? null,
        },
        200
      );
    }
    if (request.method === 'POST') {
      let payload: { name?: string; profilePictureKey?: string } | null = null;
      try {
        payload = await request.json();
      } catch {
        return this.jsonResponse({ error: 'Invalid JSON payload' }, 400);
      }
      const nameValue = payload?.name?.trim();
      const keyValue = payload?.profilePictureKey?.trim();
      if (!nameValue || !keyValue) {
        return this.jsonResponse({ error: 'Name and profilePictureKey are required' }, 400);
      }
      const updated = await this.updateProfilePicture(nameValue, keyValue);
      if (!updated) {
        return this.jsonResponse({ error: 'Unable to save profile picture' }, 400);
      }
      return this.jsonResponse({ player: updated }, 200);
    }
    return this.jsonResponse({ error: 'Method not allowed' }, 405);
  }

  async fetch(request: Request) {
    await this.ready;
    const url = new URL(request.url);
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = pair;
      this.handleConnection(server);
      return new Response(null, { status: 101, webSocket: client });
    }
    if (url.pathname === '/names') {
      return this.handleNamesRequest(request);
    }
    if (url.pathname === '/profile') {
      return this.handleProfileRequest(request, url);
    }
    return new Response('LeaderboardRoom is ready', { status: 200 });
  }

  private handleConnection(socket: WebSocket) {
    socket.accept();
    const connectionId = ++this.nextConnectionId;
    this.sockets.set(connectionId, socket);
    this.connectionMeta.set(connectionId, {});

    const cleanup = () => {
      this.sockets.delete(connectionId);
      this.connectionMeta.delete(connectionId);
    };

    socket.addEventListener('message', (event) => {
      if (typeof event.data === 'string') {
        try {
          const message = JSON.parse(event.data) as ClientMessage;
          this.handleMessage(connectionId, message, socket);
        } catch {
          this.sendError(socket, 'Invalid JSON payload');
        }
      }
    });

    socket.addEventListener('close', cleanup);
    socket.addEventListener('error', cleanup);
    this.sendSnapshot(socket);
  }
}
