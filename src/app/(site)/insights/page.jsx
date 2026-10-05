import { getSiteContent } from '../../../../server/lib/site.js';
import InsightsPage from '../../../views/InsightsPage';
import { pageMeta } from '../../meta';

export async function generateMetadata() {
  const { insights, brand } = await getSiteContent();
  return pageMeta({
    title: `${insights.title} — ${brand.name}`,
    description: insights.intro || `Notes from ${brand.name} on engineering, AI and shipping products that last.`,
    path: '/insights',
    siteName: brand.name,
  });
}

export default function Page() {
  return <InsightsPage />;
}
