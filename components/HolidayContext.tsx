import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type HolidayContextValue = {
  isHoliday: boolean;
  setHoliday: (value: boolean) => void;
  toggleHoliday: () => void;
};

const HOLIDAY_KEY = 'sm_holiday_mode';

const getDefaultHoliday = () => {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(HOLIDAY_KEY);
  if (stored !== null) return stored === '1';
  const month = new Date().getMonth();
  return month === 10 || month === 11 || month === 0;
};

const HolidayContext = createContext<HolidayContextValue | null>(null);

export const HolidayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isHoliday, setIsHoliday] = useState(getDefaultHoliday);

  useEffect(() => {
    const value = isHoliday ? 'on' : 'off';
    document.body.dataset.holiday = value;
    localStorage.setItem(HOLIDAY_KEY, isHoliday ? '1' : '0');
  }, [isHoliday]);

  const contextValue = useMemo(
    () => ({
      isHoliday,
      setHoliday: setIsHoliday,
      toggleHoliday: () => setIsHoliday((prev) => !prev),
    }),
    [isHoliday]
  );

  return <HolidayContext.Provider value={contextValue}>{children}</HolidayContext.Provider>;
};

export const useHoliday = () => {
  const context = useContext(HolidayContext);
  if (!context) {
    throw new Error('useHoliday must be used within HolidayProvider');
  }
  return context;
};
