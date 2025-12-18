import { Squishmallow, World } from './types';
import { SQUISHMALLOWS_DATA } from './squishmallowsData';

export const COLORS = {
  SKY_BLUE: '#CDEBFF',
  CLOUD_WHITE: '#FFFFFF',
  SOFT_PINK: '#FFD6E8',
  LAVENDER: '#DCCBFF',
  MINT_GREEN: '#CFF3E2',
  SUNSHINE_YELLOW: '#FFE9A8',
  SOFT_GRAY: '#E6E6E6',
  INK_BROWN: '#6B4F3F',
};

const proxyImageUrl = (input: string | undefined | null) => {
  if (!input) return '';
  const trimmed = input.replace(/^https?:\/\//i, '');
  return `https://images.weserv.nl/?url=${encodeURIComponent(trimmed)}&w=512&auto=format&dpr=1`;
};

// Map the imported JSON data to the Squishmallow interface
const rawData = SQUISHMALLOWS_DATA;

export const MOCK_SQUISHMALLOWS: Squishmallow[] = rawData.map((item, index) => {
  // Deterministic attributes based on index for variety
  let type: 'classic' | 'rare' | 'ultra-rare' = 'classic';
  if (index % 10 === 0) type = 'ultra-rare';
  else if (index % 4 === 0) type = 'rare';

  // Cast item to any to access potential new fields from the JSON update mentioned by user
  const source = item as any;

  return {
    id: `sq_${index}_${item.name.replace(/\s/g, '')}`,
    name: item.name,
    image: proxyImageUrl(item.image_url),
    description: source.bio 
        ? `${item.name} is a ${source.type || 'friend'} who loves to play!` // Short description fallback if bio is long
        : `${item.name} is a wonderful friend who is excited to join your parade!`,
    bio: source.bio,
    squishdate: source.squishdate,
    species: source.type, // Map JSON 'type' (e.g. Shark) to 'species' to avoid conflict with rarity 'type'
    appearance: source.appearance,
    type: type,
    primaryColor: 'pink', // Default placeholder
    unlocked: index < 12 // Start with the first few unlocked
  };
});

export const WORLDS: World[] = [
  { id: 'w1', name: 'Cozy Bedroom', themeColor: COLORS.SOFT_PINK, levels: 8, bgImage: 'linear-gradient(to bottom right, #FFD6E8, #FFF)', description: 'Start your journey here!' },
  { id: 'w2', name: 'Candy Carnival', themeColor: COLORS.LAVENDER, levels: 10, bgImage: 'linear-gradient(to bottom right, #DCCBFF, #FFF)', description: 'Sweet treats await.' },
  { id: 'w3', name: 'Forest Friends', themeColor: COLORS.MINT_GREEN, levels: 12, bgImage: 'linear-gradient(to bottom right, #CFF3E2, #FFF)', description: 'Explore the woods.' },
];
