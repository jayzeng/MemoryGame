import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { storage, SCORE_UPDATE_EVENT } from './storage';
import type { GiftRecord, LeaderboardPlayer } from '../types';

type ServerMessage =
  | { type: 'leaderboard_snapshot'; players: LeaderboardPlayer[]; gifts: GiftRecord[] }
  | { type: 'leaderboard_update'; players: LeaderboardPlayer[] }
  | { type: 'gift_event'; gift: GiftRecord }
  | { type: 'connected'; player: LeaderboardPlayer }
  | { type: 'error'; message: string };

const parseServerMessage = (data: MessageEvent['data']): ServerMessage | null => {
  if (typeof data !== 'string') return null;
  try {
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed === 'object' && typeof parsed.type === 'string') {
      return parsed as ServerMessage;
    }
  } catch (error) {
    console.warn('Unable to parse multiplayer payload', error);
  }
  return null;
};

const buildWebSocketUrl = () => {
  const raw = import.meta.env.VITE_MULTIPLAYER_WS_URL?.trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (!parsed.searchParams.has('room')) {
      parsed.searchParams.set('room', 'memorygame');
    }
    return parsed.toString();
  } catch (error) {
    console.warn('Invalid VITE_MULTIPLAYER_WS_URL', error);
    return null;
  }
};

export const useMultiplayerLeaderboard = (playerName: string) => {
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [gifts, setGifts] = useState<GiftRecord[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incomingGift, setIncomingGift] = useState<GiftRecord | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pendingStateRef = useRef<{ score: number; unlocked: string[] } | null>(null);
  const url = useMemo(buildWebSocketUrl, []);
  const canConnect = Boolean(playerName && url);

  const dismissIncomingGift = useCallback(() => {
    setIncomingGift(null);
  }, []);

  const safeSend = useCallback((payload: object) => {
    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }, []);

  const sendScore = useCallback(
    (state: { score: number; unlocked: string[] }) => {
      if (!playerName || !Number.isFinite(state.score)) return;
      const payload = {
        type: 'score_update',
        score: Math.max(0, Math.floor(state.score)),
        unlocked: state.unlocked,
      };
      if (!safeSend(payload)) {
        pendingStateRef.current = payload;
      } else {
        pendingStateRef.current = null;
      }
    },
    [playerName, safeSend]
  );

  const sendGift = useCallback(
    (params: {
      to: string;
      message?: string;
      giftType?: string;
      squish?: { id: string; name?: string; image?: string };
    }) => {
      if (!playerName) return false;
      if (!params.to.trim()) return false;
      return safeSend({
        type: 'send_gift',
        to: params.to,
        message: params.message?.trim() ?? '',
        giftType: params.giftType?.trim() || undefined,
        squish: params.squish,
      });
    },
    [playerName, safeSend]
  );

  useEffect(() => {
    if (!playerName || !url) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnected(false);
      return;
    }

    const socket = new WebSocket(url);
    wsRef.current = socket;

      const handleOpen = () => {
        setConnected(true);
        setError(null);
        const unlocked = storage.getUnlockedIds();
        const initialScore = unlocked.length;
        safeSend({ type: 'join', name: playerName, score: initialScore, unlocked });
        if (pendingStateRef.current) {
          if (safeSend(pendingStateRef.current)) {
            pendingStateRef.current = null;
          }
        }
      };

    const handleMessage = (event: MessageEvent) => {
      const payload = parseServerMessage(event.data);
      if (!payload) return;
      switch (payload.type) {
        case 'leaderboard_snapshot':
          setPlayers(payload.players);
          setGifts(payload.gifts);
          break;
        case 'leaderboard_update':
          setPlayers(payload.players);
          break;
        case 'gift_event':
          setGifts((prev) => [payload.gift, ...prev].slice(0, 12));
          if (playerName) {
            if (payload.gift.to === playerName && payload.gift.squishId) {
              storage.unlockSquishmallow(payload.gift.squishId);
            }
            if (payload.gift.from === playerName && payload.gift.squishId) {
              storage.revokeSquishmallow(payload.gift.squishId);
            }
          }
          if (payload.gift.to === playerName) {
            setIncomingGift(payload.gift);
          }
          break;
        case 'connected':
          setPlayers((prev) => {
            const filtered = prev.filter((p) => p.name !== payload.player.name);
            return [payload.player, ...filtered];
          });
          break;
        case 'error':
          setError(payload.message);
          break;
        default:
          break;
      }
    };

    const handleClose = () => setConnected(false);

    socket.addEventListener('open', handleOpen);
    socket.addEventListener('message', handleMessage);
    socket.addEventListener('close', handleClose);
    socket.addEventListener('error', handleClose);

    return () => {
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('message', handleMessage);
      socket.removeEventListener('close', handleClose);
      socket.removeEventListener('error', handleClose);
      socket.close();
    };
  }, [playerName, url, safeSend]);

  useEffect(() => {
    if (!playerName) return;
      const listener = (event: Event) => {
        const detail = (event as CustomEvent<{ name: string; count: number; unlocked?: string[] }>).detail;
        if (!detail || detail.name !== playerName) return;
        sendScore({ score: detail.count, unlocked: detail.unlocked ?? [] });
      };
    window.addEventListener(SCORE_UPDATE_EVENT, listener as EventListener);
    return () => window.removeEventListener(SCORE_UPDATE_EVENT, listener as EventListener);
  }, [playerName, sendScore]);

  return {
    players,
    gifts,
    connected,
    error,
    sendScore,
    sendGift,
    incomingGift,
    dismissIncomingGift,
  };
};
