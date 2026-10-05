import { cache } from 'react';
import { ensureDb } from './bootstrap.js';
import { getArticle, getPublicContent, listArticles } from './content.js';
import { defaultContent } from '../../src/data/content.js';
import { withDefaults } from '../../src/content/defaults.js';

// What the pages render from. Next builds each page ahead of time and
// rebuilds it after a CMS save (or every few minutes), so this runs per
// build of a page, not per visit; `cache` shares one read between a page,
// its layout and its metadata.

// Without a database: while building or developing, use the built-in content
// so the site still comes up. On the live site, fail instead, so Next keeps
// serving the last good copy of the page rather than replacing it.
const canFallBack = process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV !== 'production';

async function read(fn, fallback) {
  try {
    await ensureDb();
    return await fn();
  } catch (err) {
    if (!canFallBack) throw err;
    return fallback;
  }
}

// Plain JSON (ids and dates as text), as it's handed to client components.
const plain = (value) => JSON.parse(JSON.stringify(value));

export const getSiteContent = cache(async () => withDefaults(plain(await read(getPublicContent, defaultContent))));

// A published article with its full text, or null.
export const getSiteArticle = cache(async (slug) => plain(await read(() => getArticle(slug), null)));

export const getSiteArticles = cache(async () => plain(await read(listArticles, [])));
