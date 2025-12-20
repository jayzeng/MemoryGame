export interface Squishmallow {
  id: string;
  name: string;
  image: string; // URL
  description: string;
  bio?: string;
  squishdate?: string;
  species?: string;
  appearance?: string;
  debutYear?: number;
  type: 'classic' | 'rare' | 'ultra-rare';
  primaryColor: string;
  unlocked: boolean; // Default unlocked state (for initialization)
}

export interface World {
  id: string;
  name: string;
  themeColor: string;
  bgImage: string;
  levels: number;
  description: string;
}

export interface CardItem {
  id: string; // Unique ID for the card instance on board
  characterId: string; // ID of the squishmallow
  isFlipped: boolean;
  isMatched: boolean;
}

export enum GameState {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  COMPLETED = 'COMPLETED',
}

export interface LevelConfig {
  rows: number;
  cols: number;
  targetPairs: number;
}

export interface LeaderboardEntry {
  name: string;
  count: number;
  date: string;
}

export interface LeaderboardPlayer {
  name: string;
  score: number;
  lastUpdated: string;
  giftsSent: number;
  giftsReceived: number;
  unlockedIds: string[];
  profilePictureKey?: string;
}

export interface GiftRecord {
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
