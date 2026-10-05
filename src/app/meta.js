import { siteUrl } from '../../server/config.js';

const SHARE_IMAGE = {
  url: '/og.jpg',
  width: 1200,
  height: 630,
  alt: 'Runtime Collective: software & AI engineering, built to run',
};

// A page's <head>: title, description, canonical address and link preview.
// (Open Graph is written out in full each time: a page's own `openGraph`
// replaces the layout's rather than adding to it.)
export function pageMeta({ title, description, path, type = 'website', siteName = 'Runtime Collective', ...article }) {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type, siteName, title, description, url: path, images: [SHARE_IMAGE], ...article },
    twitter: { card: 'summary_large_image' },
  };
}

// JSON that's safe inside a <script> element.
export const scriptJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

export function JsonLd({ data }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: scriptJson(data) }} />;
}

export { siteUrl };
