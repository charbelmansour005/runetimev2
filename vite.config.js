import { readFileSync, writeFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The public address, for canonical and Open Graph URLs, robots.txt and the
// sitemap. On Vercel it follows the production domain (a custom domain once
// one is added); SITE_URL overrides it.
const SITE_URL = (
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  'https://runtimecollective.vercel.app'
).replace(/\/+$/, '');

// Pages with their own static <head>, so crawlers and link previews (which
// don't run JavaScript) see the right title, description and URL.
const PAGES = [
  { path: '/', file: 'index.html' },
  {
    path: '/insights',
    file: 'insights.html',
    title: 'Latest Insights — Runtime Collective',
    description: 'Notes from Runtime Collective on engineering, AI and shipping products that last.',
  },
];

// Removes the home page's hero art (loading screen and its preload) from a page.
const withoutHeroArt = (html) =>
  html
    .replace(/\s*<!-- Hero art[^>]*-->\s*<link rel="preload" href="\/hero-poster\.webp"[^>]*>/, '')
    .replace(/\s*<!-- Loading screen[^>]*-->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, '\n      <div class="boot" aria-hidden="true"></div>');

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function siteMeta() {
  let outDir = 'dist';
  return {
    name: 'site-meta',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        // Preload the one font file every page needs, so text doesn't wait for the CSS.
        const font = ctx.bundle && Object.keys(ctx.bundle).find((f) => /montserrat-latin-wght-normal-[\w-]+\.woff2$/.test(f));
        const tags = font
          ? [{ tag: 'link', attrs: { rel: 'preload', href: `/${font}`, as: 'font', type: 'font/woff2', crossorigin: '' }, injectTo: 'head' }]
          : [];
        return { html: html.replaceAll('%SITE_URL%', SITE_URL), tags };
      },
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
      });
      const urls = PAGES.map((p) => `  <url><loc>${SITE_URL}${p.path === '/' ? '/' : p.path}</loc></url>`).join('\n');
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      });
    },
    // Each extra page is the built index.html with its own head.
    closeBundle() {
      const index = readFileSync(`${outDir}/index.html`, 'utf8');
      // The CMS: no hero art, no content preload, and not for search engines.
      writeFileSync(
        `${outDir}/admin.html`,
        withoutHeroArt(index)
          .replace(/\s*<!-- The page waits[^>]*-->\s*<link rel="preload" href="\/api\/content"[^>]*>/, '')
          .replace(/<title>[^<]*<\/title>/, '<title>Content studio — Runtime Collective</title>')
          .replace('<meta name="theme-color"', '<meta name="robots" content="noindex, nofollow" />\n    <meta name="theme-color"')
          .replace(/<div class="boot" aria-hidden="true"><\/div>/, ''),
      );
      for (const page of PAGES.filter((p) => p.path !== '/')) {
        const url = `${SITE_URL}${page.path}`;
        const title = escapeHtml(page.title);
        const description = escapeHtml(page.description);
        const html = withoutHeroArt(index)
          .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
          .replace(/(<meta\s+name="description"\s+content=")[^"]*/, `$1${description}`)
          .replace(/(<meta\s+property="og:title"\s+content=")[^"]*/, `$1${title}`)
          .replace(/(<meta\s+property="og:description"\s+content=")[^"]*/, `$1${description}`)
          .replaceAll(`"${SITE_URL}/"`, `"${url}"`);
        writeFileSync(`${outDir}/${page.file}`, html);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), siteMeta()],
  server: {
    // In development the Express API runs separately (npm run dev:server).
    proxy: { '/api': 'http://localhost:4000' },
  },
  build: {
    // three.js (~520 kB) is lazy-loaded for the hero only, so allow it without a warning.
    chunkSizeWarningLimit: 600,
  },
});
