import { preload } from 'react-dom';
import { getSiteContent } from '../../../server/lib/site.js';
import App from '../../App';
import { POSTER_SIZES, POSTER_SRCSET } from '../../components/hero/poster';
import { pageMeta } from '../meta';

export async function generateMetadata() {
  const { seo, brand } = await getSiteContent();
  return pageMeta({ ...seo, path: '/', siteName: brand.name });
}

export default function HomePage() {
  // The hero's art is the largest thing in the first view: fetch it first.
  preload('/hero-poster.webp', { as: 'image', imageSrcSet: POSTER_SRCSET, imageSizes: POSTER_SIZES, fetchPriority: 'high' });
  return <App />;
}
