import { config } from '../config.js';
import { SiteContent } from '../models/SiteContent.js';

const INTERNAL_FIELDS = ['_id', '__v', 'key', 'createdAt'];
// On Vercel the CDN caches /api/content instead (see routes/public.js), and a
// save may land on a different function instance, so skip the memory cache.
const CACHE_TTL_MS = config.isVercel ? 0 : 30_000;
let cache = { value: null, at: 0 };

export function serializeContent(doc) {
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  for (const field of INTERNAL_FIELDS) delete plain[field];
  return plain;
}

// The public site reads this on every page view, so keep it in memory briefly.
export async function getPublicContent() {
  if (cache.value && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  const doc = await SiteContent.getSingleton().lean();
  if (!doc) return null;
  const { updatedBy, ...content } = serializeContent(doc);
  cache = { value: content, at: Date.now() };
  return content;
}

export function invalidateContentCache() {
  cache = { value: null, at: 0 };
}
