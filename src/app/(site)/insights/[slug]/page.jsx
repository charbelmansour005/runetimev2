import { notFound } from 'next/navigation';
import { getSiteArticle, getSiteArticles, getSiteContent } from '../../../../../server/lib/site.js';
import { articlePath, SLUG_PATTERN } from '../../../../data/insights.js';
import ArticlePage from '../../../../views/ArticlePage';
import { JsonLd, pageMeta, siteUrl } from '../../../meta';

// Articles that exist when the site is built are built with it; ones written
// later are built the first time someone opens them.
export async function generateStaticParams() {
  return (await getSiteArticles()).map(({ slug }) => ({ slug }));
}

const findArticle = (slug) => (SLUG_PATTERN.test(slug) ? getSiteArticle(slug) : null);

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

const describe = (article) => article.summary || excerpt(article.body);

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const [article, { brand }] = await Promise.all([findArticle(slug), getSiteContent()]);
  if (!article) return {};
  return pageMeta({
    title: `${article.title} — ${brand.name}`,
    description: describe(article),
    path: articlePath(article.slug),
    siteName: brand.name,
    type: 'article',
    publishedTime: article.date,
    section: article.tag,
  });
}

export default async function Page({ params }) {
  const { slug } = await params;
  const [article, { brand }] = await Promise.all([findArticle(slug), getSiteContent()]);
  if (!article) notFound();

  const site = siteUrl();
  const url = `${site}${articlePath(article.slug)}`;
  const organization = { '@type': 'Organization', name: brand.name, url: site };
  return (
    <>
      <ArticlePage article={article} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: article.title,
          description: describe(article),
          datePublished: article.date,
          url,
          mainEntityOfPage: url,
          image: `${site}/og.jpg`,
          articleSection: article.tag,
          author: organization,
          publisher: { ...organization, logo: { '@type': 'ImageObject', url: `${site}/icon-512.png` } },
        }}
      />
    </>
  );
}
