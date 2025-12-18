import { MOCK_SQUISHMALLOWS } from '../constants';
import { LeaderboardEntry } from '../types';

const KEYS = {
  PLAYER_NAME: 'sm_player_name',
  UNLOCKED_PREFIX: 'sm_unlocked_', // Changed from simple key to prefix
  LEADERBOARD: 'sm_leaderboard',
};

export const storage = {
  getPlayerName: (): string => {
    return localStorage.getItem(KEYS.PLAYER_NAME) || '';
  },

  setPlayerName: (name: string) => {
    localStorage.setItem(KEYS.PLAYER_NAME, name);
  },

  // Helper to generate a unique key for the user
  _getUserKey: (): string => {
    const name = storage.getPlayerName();
    // Sanitize name for key usage, fallback to 'guest' if empty
    const safeName = name ? name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') : 'guest';
    return `${KEYS.UNLOCKED_PREFIX}${safeName}`;
  },

  getUnlockedIds: (): string[] => {
    const key = storage._getUserKey();
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      // Initialize with defaults from constants if nothing stored for this specific user
      const defaults = MOCK_SQUISHMALLOWS.filter(s => s.unlocked).map(s => s.id);
      localStorage.setItem(key, JSON.stringify(defaults));
      return defaults;
    }
    
    try {
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  },

  unlockSquishmallow: (id: string) => {
    const key = storage._getUserKey();
    const ids = storage.getUnlockedIds();
    
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(key, JSON.stringify(ids));
      storage.updateLeaderboard();
    }
  },

  isUnlocked: (id: string): boolean => {
    const ids = storage.getUnlockedIds();
    return ids.includes(id);
  },

  getLeaderboard: (): LeaderboardEntry[] => {
    const stored = localStorage.getItem(KEYS.LEADERBOARD);
    return stored ? JSON.parse(stored) : [];
  },

  updateLeaderboard: () => {
    const name = storage.getPlayerName();
    // Only track score if user has entered a name
    if (!name.trim()) return;

    const count = storage.getUnlockedIds().length;
    let board = storage.getLeaderboard();

    const existingIndex = board.findIndex(e => e.name === name);
    if (existingIndex >= 0) {
      // Update existing entry
      board[existingIndex].count = Math.max(board[existingIndex].count, count);
      board[existingIndex].date = new Date().toISOString();
    } else {
      // Add new entry
      board.push({ name, count, date: new Date().toISOString() });
    }

    // Sort by count (descending)
    board.sort((a, b) => b.count - a.count);
    
    // Keep top 10
    board = board.slice(0, 10);

    localStorage.setItem(KEYS.LEADERBOARD, JSON.stringify(board));
  }
};