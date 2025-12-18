import squishmallows from './squishmallows.json';

const shuffle = <T>(items: T[]): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// Shuffle once at module initialization so the board order stays random each session.
export const SQUISHMALLOWS_DATA = shuffle(squishmallows);
