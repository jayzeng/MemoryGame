import React, { createContext, useContext, useEffect, useState } from 'react';
import { PLAYER_NAME_EVENT, storage } from '../utils/storage';
import { useMultiplayerLeaderboard } from '../utils/multiplayer';

const MultiplayerContext = createContext<ReturnType<typeof useMultiplayerLeaderboard> | null>(null);

export const MultiplayerProvider: React.FC = ({ children }) => {
  const [playerName, setPlayerName] = useState(() => storage.getPlayerName());

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = () => setPlayerName(storage.getPlayerName());
    window.addEventListener(PLAYER_NAME_EVENT, handler);
    return () => window.removeEventListener(PLAYER_NAME_EVENT, handler);
  }, []);

  const multiplayerState = useMultiplayerLeaderboard(playerName);

  return <MultiplayerContext.Provider value={multiplayerState}>{children}</MultiplayerContext.Provider>;
};

export const useMultiplayer = () => {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error('useMultiplayer must be used within a MultiplayerProvider');
  }
  return context;
};
