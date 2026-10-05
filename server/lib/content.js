import { config } from '../config.js';
import { SiteContent } from '../models/SiteContent.js';
import { readMinutes } from '../../src/data/insights.js';

const INTERNAL_FIELDS = ['_id', '__v', 'key', 'createdAt'];
// On Vercel a save may land on a different function instance, so skip the
// memory cache there; the pages themselves are cached by Next (see site.js).
const CACHE_TTL_MS = config.isVercel ? 0 : 30_000;
let cache = { value: null, at: 0 };

export function serializeContent(doc) {
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  for (const field of INTERNAL_FIELDS) delete plain[field];
  return plain;
}

// Items with an Active switch that's on (ones saved before the switch existed
// count as active), without the switch itself.
const activeOnly = (items = []) => items.filter((item) => item.active !== false).map(({ active, ...item }) => item);

// What the public site gets: only active projects and reviews, and articles
// as cards only, with a reading time; an article's text loads on its own page.
function toPublic(site) {
  const articles = new Map();
  const posts = (site.insights?.items ?? []).map(({ body = '', ...post }) => {
    if (!post.slug || !body) return { ...post, slug: '' };
    const card = { ...post, readMinutes: readMinutes(body) };
    articles.set(post.slug, { ...card, body });
    return card;
  });
  return {
    content: {
      ...site,
      work: { ...site.work, items: activeOnly(site.work?.items) },
      // Missing from a database saved before reviews existed; the site then
      // uses its defaults.
      ...(site.reviews && { reviews: { ...site.reviews, items: activeOnly(site.reviews.items) } }),
      insights: { ...site.insights, items: posts },
    },
    articles,
  };
}

// Read for every page that's rendered and by the public API, so keep it in
// memory briefly.
async function load() {
  if (cache.value && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  const doc = await SiteContent.getSingleton().lean();
  if (!doc) return null;
  const { updatedBy, ...site } = serializeContent(doc);
  cache = { value: toPublic(site), at: Date.now() };
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
