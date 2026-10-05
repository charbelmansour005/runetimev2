import { defaultContent } from '../data/content';

// Anything missing from the stored content falls back to the built-in defaults.
export function withDefaults(data) {
  if (!data || typeof data !== 'object') return defaultContent;
  return Object.fromEntries(
    Object.entries(defaultContent).map(([key, fallback]) => {
      const value = data[key];
      return [key, value && typeof value === 'object' ? { ...fallback, ...value } : fallback];
    }),
  );
}
