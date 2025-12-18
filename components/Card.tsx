import React from 'react';
import { CardItem, Squishmallow } from '../types';

interface CardProps {
  item: CardItem;
  squishmallow: Squishmallow;
  onClick: (id: string) => void;
  disabled: boolean;
}

export const Card: React.FC<CardProps> = ({ item, squishmallow, onClick, disabled }) => {
  const handleClick = () => {
    if (!disabled && !item.isFlipped && !item.isMatched) {
      onClick(item.id);
    }
  };

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
          <div className="flex-1 w-full relative overflow-hidden p-2">
            <img 
              src={squishmallow.image} 
              alt={squishmallow.name}
              className="w-full h-full object-contain"
            />
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
    </div>
  );
};