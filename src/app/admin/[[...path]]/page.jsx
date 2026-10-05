import AdminLoader from '../../../admin/AdminLoader';

export const metadata = {
  title: 'Content studio — Runtime Collective',
  robots: { index: false, follow: false },
};

// The CMS. It runs entirely in the browser and talks to /api.
export default function AdminPage() {
  return <AdminLoader />;
}
