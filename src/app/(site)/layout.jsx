import { getSiteContent } from '../../../server/lib/site.js';
import { ContentProvider } from '../../content/ContentProvider';
import SmoothScroll from '../../components/SmoothScroll';
import { JsonLd, siteUrl } from '../meta';

// Pages are built ahead of time and served from the cache. They're rebuilt
// when the CMS saves (see api/admin/content) and at most every 5 minutes.
export const revalidate = 300;

export default async function SiteLayout({ children }) {
  const content = await getSiteContent();
  const site = siteUrl();
  const { name } = content.brand;
  return (
    <ContentProvider content={content}>
      <SmoothScroll />
      {children}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Organization',
              '@id': `${site}#organization`,
              name,
              url: site,
              logo: `${site}/icon-512.png`,
              description: 'Software & AI engineering studio building web, mobile, AI and cloud products.',
            },
            { '@type': 'WebSite', '@id': `${site}#website`, name, url: site, publisher: { '@id': `${site}#organization` } },
          ],
        }}
      />
    </ContentProvider>
  );
}
