import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { config } from '../config.js';
import { isDbReady } from '../db.js';
import { getArticle, getPublicContent, listArticles } from '../lib/content.js';
import { escapeHtml, PAGES, scriptJson, setHead, siteUrl } from '../lib/html.js';
import { articlePath } from '../../src/data/insights.js';
import { PUBLIC_CACHE } from './public.js';

// Pages that come from the CMS: articles (/insights/<slug>) and the sitemap.
// On Vercel, vercel.json sends these two paths to the API.
const router = Router();
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist');

// The built page each response starts from, read from dist/ when the server
// has it (npm start). A Vercel function ships without dist/, so it fetches the
// page from the site itself (the production address, or a preview's own) and
// keeps it: a deployment's pages never change.
const BUILT = { insights: ['insights.html', '/insights'], notFound: ['404.html', '/404.html'] };
const selfOrigin = () =>
  process.env.VERCEL_ENV === 'production' || !process.env.VERCEL_URL ? siteUrl() : `https://${process.env.VERCEL_URL}`;
const fetched = new Map();

async function builtPage(name) {
  const [file, route] = BUILT[name];
  try {
    return await readFile(path.join(distDir, file), 'utf8');
  } catch (err) {
    if (!config.isVercel) throw err;
  }
  if (!fetched.has(name)) {
    const loading = fetch(new URL(route, selfOrigin())).then((res) => {
      if (!res.ok) throw new Error(`Couldn't load ${route} (HTTP ${res.status})`);
      return res.text();
    });
    fetched.set(name, loading);
    loading.catch(() => fetched.delete(name));
  }
  return fetched.get(name);
}

// A plain-text opening for articles without a summary.
function excerpt(markdown, max = 155) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)]|\|)\s*/gm, '')
    .replace(/[*_`|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.lastIndexOf(' ', max);
  return `${text.slice(0, cut > 0 ? cut : max)}…`;
}

function articleHtml(page, article, brandName) {
  const site = siteUrl();
  const url = `${site}${articlePath(article.slug)}`;
  const description = article.summary || excerpt(article.body);
  const organization = { '@type': 'Organization', name: brandName, url: site };
  const posting = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description,
    datePublished: article.date,
    url,
    mainEntityOfPage: url,
    image: `${site}/og.jpg`,
    articleSection: article.tag,
    author: organization,
    publisher: { ...organization, logo: { '@type': 'ImageObject', url: `${site}/icon-512.png` } },
  };
  const { slug, title, date, tag, summary, art, readMinutes, body } = article;
  const extra = [
    `<meta property="article:published_time" content="${escapeHtml(date)}" />`,
    `<meta property="article:section" content="${escapeHtml(tag)}" />`,
    `<script type="application/ld+json">${scriptJson(posting)}</script>`,
    // The page renders the article from this, without asking the API again.
    `<script type="application/json" id="article-data">${scriptJson({ slug, title, date, tag, summary, art, readMinutes, body })}</script>`,
  ].join('\n    ');
  // Switch on the article code's preloads (see vite.config.js).
  const withPreloads = page.replace(/<!-- article-page ([\s\S]*?) -->/, (_, links) => links);
  return setHead(withPreloads, { title: `${title} — ${brandName}`, description, url, type: 'article', extra });
}

router.get('/insights/:slug', async (req, res) => {
  if (!isDbReady()) {
    // The app still loads; it asks the API for the article and explains if it can't.
    res.set('Cache-Control', 'no-store');
    return res.status(503).type('html').send(await builtPage('insights'));
  }
  res.set('Cache-Control', PUBLIC_CACHE);
  const article = await getArticle(req.params.slug);
  if (!article) return res.status(404).type('html').send(await builtPage('notFound'));
  const brandName = (await getPublicContent())?.brand?.name || 'Runtime Collective';
  return res.type('html').send(articleHtml(await builtPage('insights'), article, brandName));
});

router.get('/sitemap.xml', async (req, res) => {
  const site = siteUrl();
  const articles = isDbReady() ? await listArticles().catch(() => []) : [];
  const urls = [
    ...PAGES.map((page) => `  <url><loc>${escapeHtml(`${site}${page.path}`)}</loc></url>`),
    ...articles.map(
      (article) =>
        `  <url><loc>${escapeHtml(`${site}${articlePath(article.slug)}`)}</loc><lastmod>${escapeHtml(article.date)}</lastmod></url>`,
    ),
  ];
  res.set('Cache-Control', PUBLIC_CACHE).type('application/xml');
  return res.send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
  );
});

export default router;
