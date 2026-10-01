import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/montserrat';
import './styles/tokens.css';
import './styles/global.css';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import InsightsPage from './pages/InsightsPage.jsx';
import { ContentProvider } from './content/ContentProvider.jsx';

// The CMS lives at /admin and is only downloaded when someone opens it.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));
const isAdmin = /^\/admin(\/|$)/.test(window.location.pathname);
const path = window.location.pathname.replace(/\/+$/, '') || '/';

// Articles (/insights/<slug>) are their own chunk, fetched straight away on
// an article's page, alongside the site content.
const loadArticlePage = () => import('./pages/ArticlePage.jsx');
const ArticlePage = lazy(loadArticlePage);
const articleSlug = /^\/insights\/([^/]+)$/.exec(path)?.[1];
if (articleSlug) loadArticlePage();

function Page() {
  if (articleSlug) {
    return (
      <Suspense fallback={<div className="boot" />}>
        <ArticlePage slug={articleSlug} />
      </Suspense>
    );
  }
  return path === '/insights' ? <InsightsPage /> : <App />;
}

// If something fails badly, offer a reload instead of a blank page.
const crashed = (
  <div className="crashed" role="alert">
    <p>Something went wrong while loading this page.</p>
    <a href={window.location.pathname}>Reload</a>
  </div>
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary fallback={crashed}>
      {isAdmin ? (
        <Suspense fallback={<div className="cms-boot" />}>
          <AdminApp />
        </Suspense>
      ) : (
        <ContentProvider>
          <Page />
        </ContentProvider>
      )}
    </ErrorBoundary>
  </StrictMode>,
);
