import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/montserrat';
import './styles/tokens.css';
import './styles/global.css';
import App from './App.jsx';
import { ContentProvider } from './content/ContentProvider.jsx';

// The CMS lives at /admin and is only downloaded when someone opens it.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));
const InsightsPage = lazy(() => import('./pages/InsightsPage.jsx'));
const isAdmin = /^\/admin(\/|$)/.test(window.location.pathname);
const path = window.location.pathname.replace(/\/+$/, '') || '/';
const Page = path === '/insights' ? InsightsPage : App;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAdmin ? (
      <Suspense fallback={<div className="cms-boot" />}>
        <AdminApp />
      </Suspense>
    ) : (
      <ContentProvider>
        <Suspense fallback={<div className="boot" />}>
          <Page />
        </Suspense>
      </ContentProvider>
    )}
  </StrictMode>,
);
