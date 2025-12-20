import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CardItem, Squishmallow } from '../types';
import { useHoliday } from './HolidayContext';

interface CardProps {
  item: CardItem;
  squishmallow: Squishmallow;
  onClick: (id: string) => void;
  disabled: boolean;
}

export const Card: React.FC<CardProps> = ({ item, squishmallow, onClick, disabled }) => {
  const { isHoliday } = useHoliday();
  const [showHolidayBurst, setShowHolidayBurst] = useState(false);
  const prevFlipped = useRef(item.isFlipped);

  const handleClick = () => {
    if (!disabled && !item.isFlipped && !item.isMatched) {
      onClick(item.id);
    }
  };

  const fallbackImage = useMemo(
    () =>
      'data:image/svg+xml,%3Csvg%20width%3D%22200%22%20height%3D%22180%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Crect%20width%3D%22200%22%20height%3D%22180%22%20fill%3D%22%23F9F3FF%22/%3E%3Ctext%20x%3D%22100%22%20y%3D%2295%22%20font-size%3D%2216%22%20font-family%3D%22Nunito%2C%20sans-serif%22%20fill%3D%22%23C1A1E4%22%20text-anchor%3D%22middle%22%3EImage%20unavailable%3C/text%3E%3C/svg%3E',
    []
  );

  const [imgSrc, setImgSrc] = useState(squishmallow.image);
  const handleImageError = () => setImgSrc(fallbackImage);

  useEffect(() => {
    if (!isHoliday) {
      setShowHolidayBurst(false);
    }
  }, [isHoliday]);

  useEffect(() => {
    const wasFlipped = prevFlipped.current;
    if (isHoliday && item.isFlipped && !wasFlipped) {
      setShowHolidayBurst(true);
      const timer = window.setTimeout(() => setShowHolidayBurst(false), 650);
      prevFlipped.current = item.isFlipped;
      return () => clearTimeout(timer);
    }
    prevFlipped.current = item.isFlipped;
  }, [isHoliday, item.isFlipped]);

  const hatStyleIndex = useMemo(() => {
    let hash = 0;
    for (const char of squishmallow.id) {
      hash = (hash * 31 + char.charCodeAt(0)) % 5;
    }
    return hash;
  }, [squishmallow.id]);

  return (
    <div
      className={`relative cursor-pointer perspective-1000 group w-full aspect-square ${item.isMatched ? 'animate-match-bounce' : ''}`}
      onClick={handleClick}
    >
      <div
        className={`w-full h-full transform-style-3d flip-transition ${item.isFlipped || item.isMatched ? 'rotate-y-180' : ''}`}
      >
        {/* Front of Card (Face Down) */}
        <div
          className="absolute w-full h-full backface-hidden rounded-3xl bg-white border-4 border-[#CDEBFF] shadow-[0_6px_20px_rgba(0,0,0,0.1)] flex items-center justify-center overflow-hidden"
        >
          <div className="w-2/3 h-2/3 bg-[#CDEBFF] rounded-full opacity-50 flex items-center justify-center">
            <span className="text-4xl opacity-50">?</span>
          </div>
        </div>

        {/* Back of Card (Face Up / Character) */}
        <div
          className={`absolute w-full h-full backface-hidden rotate-y-180 rounded-3xl bg-white border-4 ${item.isMatched ? 'border-[#CFF3E2] shadow-[0_0_24px_rgba(207,243,226,0.6)]' : 'border-[#FFD6E8]'} shadow-md overflow-hidden flex flex-col`}
        >
          {/* Image Container */}
          <div className="flex-1 w-full relative overflow-visible p-2">
            <img
              src={imgSrc}
              alt={squishmallow.name}
              className="w-full h-full object-contain"
              onError={handleImageError}
              referrerPolicy="no-referrer"
            />
            {isHoliday && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 pointer-events-none z-10">
                <div className={`holiday-hat holiday-hat-style-${hatStyleIndex}`} aria-hidden="true">
                  <span className="holiday-hat-band" />
                  <span className="holiday-hat-accent" />
                  <span className="holiday-hat-leaf" />
                  <span className="holiday-hat-star" />
                </div>
              </div>
            )}
          </div>

          {/* Name Label (Sight Reading) */}
          <div className={`h-8 w-full ${item.isMatched ? 'bg-[#CFF3E2]' : 'bg-[#FFF0F5]'} flex items-center justify-center border-t-2 border-white/50 transition-colors duration-300`}>
            <span className="font-heading font-bold text-[#6B4F3F] text-sm sm:text-base tracking-widest uppercase">
              {squishmallow.name}
            </span>
          </div>

          {item.isMatched && (
            <div className="absolute inset-0 bg-[#CFF3E2] bg-opacity-20 flex items-center justify-center animate-pulse pointer-events-none">
              <span className="text-4xl">✨</span>
            </div>
          )}
        </div>
      </div>

      {showHolidayBurst && (
        <div className="holiday-flip-burst" aria-hidden="true">
          <span style={{ '--x': '-28px', '--y': '-18px', '--color': '#E05858' } as React.CSSProperties} />
          <span style={{ '--x': '32px', '--y': '-10px', '--color': '#4CC38A' } as React.CSSProperties} />
          <span style={{ '--x': '-18px', '--y': '24px', '--color': '#FFFFFF' } as React.CSSProperties} />
          <span style={{ '--x': '20px', '--y': '28px', '--color': '#FFE29A' } as React.CSSProperties} />
          <span style={{ '--x': '-36px', '--y': '6px', '--color': '#DDEFFF' } as React.CSSProperties} />
          <span style={{ '--x': '8px', '--y': '-30px', '--color': '#FFFFFF' } as React.CSSProperties} />
        </div>
      )}
    </div>
  );
};
