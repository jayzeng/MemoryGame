import type { Squishmallow } from '../types';

type Rarity = Squishmallow['type'];

export const isUncommonRarity = (type: Rarity) => type === 'rare' || type === 'ultra-rare';

export const getRarityLabel = (type: Rarity) => {
  switch (type) {
    case 'ultra-rare':
      return 'Ultra Rare';
    case 'rare':
      return 'Rare';
    default:
      return 'Classic';
  }
};

export const getRarityStarCount = (type: Rarity) => {
  switch (type) {
    case 'ultra-rare':
      return 3;
    case 'rare':
      return 2;
    default:
      return 1;
  }
};

export const getRarityStyles = (type: Rarity) => {
  switch (type) {
    case 'ultra-rare':
      return {
        bg: 'bg-[#F3E8FF]',
        text: 'text-[#5B21B6]',
        border: 'border-[#DCCBFF]',
      };
    case 'rare':
      return {
        bg: 'bg-[#FFF4E5]',
        text: 'text-[#B45309]',
        border: 'border-[#FCD34D]',
      };
    default:
      return {
        bg: 'bg-[#FFE4ED]',
        text: 'text-[#BE185D]',
        border: 'border-[#FFB6C9]',
      };
  }
};

