import { getSiteContent } from '../../../../server/lib/site.js';
import ContactPage from '../../../views/ContactPage';
import { pageMeta } from '../../meta';

export async function generateMetadata() {
  const { contact, brand } = await getSiteContent();
  return pageMeta({
    title: `Contact — ${brand.name}`,
    description: contact.text || `Tell ${brand.name} about your product, your timeline and your team.`,
    path: '/contact',
    siteName: brand.name,
  });
}

export default function Page() {
  return <ContactPage />;
}
