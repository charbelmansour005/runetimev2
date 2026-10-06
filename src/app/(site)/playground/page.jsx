import { getSiteContent } from '../../../../server/lib/site.js';
import PlaygroundPage from '../../../views/PlaygroundPage';
import { pageMeta } from '../../meta';

export async function generateMetadata() {
  const { brand } = await getSiteContent();
  return pageMeta({
    title: `Garden playground — ${brand.name}`,
    description: 'Our 3D garden, yours to rearrange: switch the torii, the mountain, the deer and everything else on or off, and share the result.',
    path: '/playground',
    siteName: brand.name,
  });
}

export default function Page() {
  return <PlaygroundPage />;
}
