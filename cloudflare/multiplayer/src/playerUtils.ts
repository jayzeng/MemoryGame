export const sanitizeName = (value: string) => {
  const trimmed = (value ?? '').trim().slice(0, 32);
  const display = trimmed || 'Guest';
  const slug = display
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return {
    id: slug || `guest_${crypto.randomUUID().slice(0, 6)}`,
    display,
  };
};
