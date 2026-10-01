// Helpers for Insights articles, shared by the site, the CMS and the API.

// Articles written in the CMS live at /insights/<slug>, e.g. /insights/how-we-ship.
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX = 80;

export const articlePath = (slug) => `/insights/${slug}`;

// "Shipping LLM features — safely" → "shipping-llm-features-safely"
export function slugify(text) {
  const slug = String(text ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length <= SLUG_MAX) return slug;
  // Too long: cut at the last whole word that fits.
  const cut = slug.slice(0, SLUG_MAX + 1);
  return cut.slice(0, cut.lastIndexOf('-')) || slug.slice(0, SLUG_MAX);
}

// Minutes to read, at about 220 words a minute.
export function readMinutes(markdown) {
  const words = String(markdown ?? '').match(/\S+/g)?.length ?? 0;
  return Math.max(1, Math.round(words / 220));
}
