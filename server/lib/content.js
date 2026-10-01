import { config } from '../config.js';
import { SiteContent } from '../models/SiteContent.js';
import { readMinutes } from '../../src/data/insights.js';

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

// Every page loads the site content, so articles written in the CMS travel
// as cards only (with a reading time); their text loads on their own page.
function split(site) {
  const articles = new Map();
  const items = (site.insights?.items ?? []).map(({ body = '', ...post }) => {
    if (!post.slug || !body) return { ...post, slug: '' };
    const card = { ...post, readMinutes: readMinutes(body) };
    articles.set(post.slug, { ...card, body });
    return card;
  });
  return { content: { ...site, insights: { ...site.insights, items } }, articles };
}

// The public site reads this on every page view, so keep it in memory briefly.
async function load() {
  if (cache.value && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  const doc = await SiteContent.getSingleton().lean();
  if (!doc) return null;
  const { updatedBy, ...site } = serializeContent(doc);
  cache = { value: split(site), at: Date.now() };
  return cache.value;
}

export async function getPublicContent() {
  return (await load())?.content ?? null;
}

// A published article with its full text, or null.
export async function getArticle(slug) {
  return (await load())?.articles.get(slug) ?? null;
}

export async function listArticles() {
  const loaded = await load();
  return loaded ? [...loaded.articles.values()] : [];
}

export function invalidateContentCache() {
  cache = { value: null, at: 0 };
}
