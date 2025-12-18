import { Squishmallow } from '../types';

export const getAgeText = (squishmallow: Squishmallow) => {
  if (!squishmallow.debutYear) return 'Age unknown';
  const currentYear = new Date().getFullYear();
  const age = currentYear - squishmallow.debutYear;
  if (age <= 0) return 'New this year!';
  return `${age} year${age === 1 ? '' : 's'} old`;
};
