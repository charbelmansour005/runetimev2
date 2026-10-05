import { getSiteContent } from '../../../../server/lib/site.js';
import WorkPage from '../../../views/WorkPage';
import { pageMeta } from '../../meta';

export async function generateMetadata() {
  const { work, brand } = await getSiteContent();
  return pageMeta({
    title: `${work.title} — ${brand.name}`,
    description: work.intro || `Web and mobile products designed and built by ${brand.name}.`,
    path: '/work',
    siteName: brand.name,
  });
}

export default function Page() {
  return <WorkPage />;
}
