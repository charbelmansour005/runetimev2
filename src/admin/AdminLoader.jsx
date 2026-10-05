'use client';

import dynamic from 'next/dynamic';

// The CMS is only downloaded when someone opens /admin, and isn't rendered on
// the server: it starts by asking the API who's signed in.
const AdminApp = dynamic(() => import('./AdminApp'), { ssr: false });

export default function AdminLoader() {
  return <AdminApp />;
}
