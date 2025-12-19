import React, { useMemo } from 'react';
import { Gift, Snowflake } from 'lucide-react';
import { useHoliday } from './HolidayContext';

type SnowflakeSpec = {
  id: string;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  drift: number;
};

const buildSnowflakes = (count: number): SnowflakeSpec[] => {
  return Array.from({ length: count }, (_, index) => {
    const size = 3 + Math.random() * 5;
    return {
      id: `flake-${index}`,
      left: Math.random() * 100,
      size,
      duration: 10 + Math.random() * 16,
      delay: -Math.random() * 14,
      opacity: 0.35 + Math.random() * 0.5,
      drift: (Math.random() - 0.5) * 80,
    };
  });
};

export const HolidayDecor: React.FC = () => {
  const { isHoliday, toggleHoliday } = useHoliday();
  const snowflakes = useMemo(() => buildSnowflakes(26), []);

  return (
    <>
      {isHoliday && (
        <>
          <div className="holiday-glow" aria-hidden="true" />
          <div className="holiday-snow" aria-hidden="true">
            {snowflakes.map((flake) => (
              <span
                key={flake.id}
                className="holiday-snowflake"
                style={
                  {
                    left: `${flake.left}%`,
                    width: `${flake.size}px`,
                    height: `${flake.size}px`,
                    opacity: flake.opacity,
                    animationDuration: `${flake.duration}s`,
                    animationDelay: `${flake.delay}s`,
                    '--drift': `${flake.drift}px`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
          <div className="holiday-lights" aria-hidden="true" />
        </>
      )}
      <button
        type="button"
        onClick={toggleHoliday}
        aria-pressed={isHoliday}
        aria-label="Toggle holiday mode"
        className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-full border-2 px-4 py-2 text-xs font-bold uppercase tracking-wide shadow-lg transition-all ${
          isHoliday
            ? 'bg-white/90 border-[#D95D5D] text-[#B33A3A] hover:bg-white'
            : 'bg-white/80 border-white text-[#6B4F3F] hover:bg-white'
        }`}
      >
        <span className="flex items-center gap-2">
          {isHoliday ? <Gift size={16} /> : <Snowflake size={16} />}
          <span className="hidden sm:inline">Holiday Mode</span>
          <span className="sm:hidden">Holiday</span>
        </span>
        <span className="rounded-full bg-[#FFE9A8] px-2 py-0.5 text-[0.6rem] text-[#6B4F3F]">
          {isHoliday ? 'On' : 'Off'}
        </span>
      </button>
    </>
  );
};
