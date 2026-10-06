import { siteUrl } from '../../server/config.js';
import { getSiteArticles } from '../../server/lib/site.js';
import { articlePath } from '../data/insights.js';

// Rebuilt with the pages: after a CMS save, or every few minutes.
export const revalidate = 300;

export default async function sitemap() {
  const site = siteUrl();
  const articles = await getSiteArticles();
  return [
    ...['/', '/work', '/insights', '/playground'].map((path) => ({ url: `${site}${path}` })),
    ...articles.map((article) => ({ url: `${site}${articlePath(article.slug)}`, lastModified: article.date })),
  ];
}
