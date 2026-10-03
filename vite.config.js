import { readFileSync, writeFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { PAGES, setHead, siteUrl } from './server/lib/html.js';

const SITE_URL = siteUrl();

// Removes the home page's hero art (loading screen and its preload) from a page.
const withoutHeroArt = (html) =>
  html
    .replace(/\s*<!-- Hero art[^>]*-->\s*<link rel="preload" href="\/hero-poster\.webp"[^>]*>/, '')
    .replace(/\s*<!-- Loading screen[^>]*-->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, '\n      <div class="boot" aria-hidden="true"></div>');

// <link> tags that fetch a lazy page's code (and what it imports) and styles
// alongside the main bundle, instead of after it has run.
function pagePreloads(bundle, page) {
  const chunks = Object.values(bundle).filter((file) => file.type === 'chunk');
  const entry = chunks.find((chunk) => chunk.facadeModuleId?.endsWith(`/src/pages/${page}.jsx`));
  if (!entry) return '';
  const wanted = [entry];
  for (const chunk of wanted) {
    for (const name of chunk.imports) {
      const dep = bundle[name];
      if (dep?.type === 'chunk' && !dep.isEntry && !wanted.includes(dep)) wanted.push(dep);
    }
  }
  const css = new Set(wanted.flatMap((chunk) => [...(chunk.viteMetadata?.importedCss ?? [])]));
  return [
    ...wanted.map((chunk) => `<link rel="modulepreload" crossorigin href="/${chunk.fileName}">`),
    ...[...css].map((file) => `<link rel="preload" as="style" crossorigin href="/${file}">`),
  ].join('\n    ');
}

function siteMeta() {
  let outDir = 'dist';
  let articleAssets = '';
  let workAssets = '';
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
    // The sitemap lists the CMS's articles too, so the API serves it (server/routes/pages.js).
    generateBundle(_, bundle) {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
      });
      // Preloads for the article page's code. Article pages are built from
      // insights.html, where these wait in a comment that the API switches on
      // (server/routes/pages.js), so they load alongside the main bundle.
      articleAssets = pagePreloads(bundle, 'ArticlePage');
      // The Work page has its own file (work.html), so its preloads go straight in.
      workAssets = pagePreloads(bundle, 'WorkPage');
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
      // Articles start from insights.html too; the API fills in their head.
      for (const page of PAGES.filter((p) => p.path !== '/')) {
        const { title, description } = page;
        const url = `${SITE_URL}${page.path}`;
        const extra =
          (page.path === '/insights' && articleAssets && `<!-- article-page ${articleAssets} -->`) ||
          (page.path === '/work' && workAssets) ||
          '';
        writeFileSync(`${outDir}/${page.file}`, setHead(withoutHeroArt(index), { title, description, url, extra }));
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), siteMeta()],
  server: {
    // In development the Express API runs separately (npm run dev:server).
    proxy: { '/api': 'http://localhost:4000', '/sitemap.xml': 'http://localhost:4000' },
  },
  build: {
    // three.js (~520 kB) is lazy-loaded for the hero only, so allow it without a warning.
    chunkSizeWarningLimit: 600,
  },
});
