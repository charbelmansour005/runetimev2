import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/montserrat';
import './styles/tokens.css';
import './styles/global.css';
import App from './App.jsx';
import { ContentProvider } from './content/ContentProvider.jsx';

// The CMS lives at /admin and is only downloaded when someone opens it.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));
const isAdmin = /^\/admin(\/|$)/.test(window.location.pathname);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAdmin ? (
      <Suspense fallback={<div className="cms-boot" />}>
        <AdminApp />
      </Suspense>
    ) : (
      <ContentProvider>
        <App />
      </ContentProvider>
    )}
  </StrictMode>,
);
