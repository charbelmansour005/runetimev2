// Shared by the build (vite.config.js) and the API (routes/pages.js): the
// site's address, its static pages, and filling in a built page's <head>.

// The public address, for canonical and Open Graph URLs, robots.txt and the
// sitemap. On Vercel it follows the production domain (a custom domain once
// one is added); SITE_URL overrides it.
export const siteUrl = () =>
  (
    process.env.SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    'https://runtimecollective.vercel.app'
  ).replace(/\/+$/, '');

// Pages with their own static <head>, so crawlers and link previews (which
// don't run JavaScript) see the right title, description and URL. Articles
// (/insights/<slug>) get theirs from the API.
export const PAGES = [
  { path: '/', file: 'index.html' },
  {
    path: '/work',
    file: 'work.html',
    title: 'Selected Work — Runtime Collective',
    description: 'Web and mobile products designed and built by Runtime Collective.',
  },
  {
    path: '/insights',
    file: 'insights.html',
    title: 'Latest Insights — Runtime Collective',
    description: 'Notes from Runtime Collective on engineering, AI and shipping products that last.',
  },
];

export const escapeHtml = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Replacer functions keep "$" in titles from being read as regex references.
const setAttr = (html, pattern, value) => html.replace(pattern, (_, start) => `${start}${escapeHtml(value)}`);

export function setHead(html, { title, description, url, type, extra }) {
  let out = html;
  if (title) {
    out = out.replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(title)}</title>`);
    out = setAttr(out, /(<meta\s+property="og:title"\s+content=")[^"]*/, title);
  }
  if (description) {
    out = setAttr(out, /(<meta\s+name="description"\s+content=")[^"]*/, description);
    out = setAttr(out, /(<meta\s+property="og:description"\s+content=")[^"]*/, description);
  }
  if (url) {
    out = setAttr(out, /(<link\s+rel="canonical"\s+href=")[^"]*/, url);
    out = setAttr(out, /(<meta\s+property="og:url"\s+content=")[^"]*/, url);
  }
  if (type) out = setAttr(out, /(<meta\s+property="og:type"\s+content=")[^"]*/, type);
  if (extra) out = out.replace('</head>', () => `  ${extra}\n  </head>`);
  return out;
}

// JSON that's safe inside a <script> element.
export const scriptJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
