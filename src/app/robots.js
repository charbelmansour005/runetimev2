import { siteUrl } from '../../server/config.js';

export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/admin' },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
