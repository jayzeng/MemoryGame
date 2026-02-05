import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type SparkleModeContextValue = {
  isSparkleMode: boolean;
  setSparkleMode: (value: boolean) => void;
  toggleSparkleMode: () => void;
};

const SPARKLE_MODE_KEY = 'sm_sparkle_mode';
const LEGACY_HOLIDAY_KEY = 'sm_holiday_mode';

const getDefaultSparkleMode = () => {
  if (typeof window === 'undefined') return false;

  const stored = localStorage.getItem(SPARKLE_MODE_KEY);
  if (stored !== null) return stored === '1';

  const legacy = localStorage.getItem(LEGACY_HOLIDAY_KEY);
  if (legacy !== null) return legacy === '1';

  return false;
};

export const SparkleModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSparkleMode, setIsSparkleMode] = useState(getDefaultSparkleMode);

  useEffect(() => {
    // Migrate legacy key if needed (without changing existing user preference)
    const stored = localStorage.getItem(SPARKLE_MODE_KEY);
    if (stored === null) {
      const legacy = localStorage.getItem(LEGACY_HOLIDAY_KEY);
      if (legacy !== null) {
        localStorage.setItem(SPARKLE_MODE_KEY, legacy === '1' ? '1' : '0');
      }
    }
  }, []);

  useEffect(() => {
    const value = isSparkleMode ? 'on' : 'off';
    document.body.dataset.sparkle = value;
    localStorage.setItem(SPARKLE_MODE_KEY, isSparkleMode ? '1' : '0');
  }, [isSparkleMode]);

  const contextValue = useMemo(
    () => ({
      isSparkleMode,
      setSparkleMode: setIsSparkleMode,
      toggleSparkleMode: () => setIsSparkleMode((prev) => !prev),
    }),
    [isSparkleMode]
  );

  return (
    <SparkleModeContext.Provider value={contextValue}>
      {children}
    </SparkleModeContext.Provider>
  );
};

const SparkleModeContext = createContext<SparkleModeContextValue | null>(null);

export const useSparkleMode = () => {
  const context = useContext(SparkleModeContext);
  if (!context) {
    throw new Error('useSparkleMode must be used within SparkleModeProvider');
  }
  return context;
};

