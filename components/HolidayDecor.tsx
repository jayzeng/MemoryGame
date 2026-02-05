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
    </>
  );
};
