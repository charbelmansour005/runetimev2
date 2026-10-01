import { lazy, startTransition, Suspense, useEffect, useState } from 'react';
import Header from './components/Header';
import Hero from './components/hero/Hero';
import Footer from './components/Footer';
import { useContent } from './content/ContentProvider';
import { useDocumentMeta } from './content/meta';

// The rest of the home page is its own chunk: on the home page it starts
// downloading straight away, and renders once the hero has painted.
let belowFold;
const loadBelowFold = () => (belowFold ??= import('./BelowFold'));
const BelowFold = lazy(loadBelowFold);
if (window.location.pathname === '/') loadBelowFold();

export default function App() {
  const { seo } = useContent();
  useDocumentMeta(seo);
  const [rest, setRest] = useState(false);

  useEffect(() => {
    // Two frames: the hero is on screen before the rest starts rendering.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => startTransition(() => setRest(true)));
    });
    // A section link clicked before then still needs its section.
    const onHash = () => setRest(true);
    window.addEventListener('hashchange', onHash);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Hero />
        {rest && (
          <Suspense fallback={null}>
            <BelowFold />
          </Suspense>
        )}
      </main>
      {rest && <Footer />}
    </>
  );
}
