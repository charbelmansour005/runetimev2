'use client';

import { Suspense } from 'react';
import Header from './components/Header';
import Hero from './components/hero/Hero';
import BelowFold from './BelowFold';
import Footer from './components/Footer';

// The home page. Everything is in the HTML from the start; the hero comes to
// life first, and React brings the rest (its own Suspense boundaries) to life
// afterwards, in separate, lower-priority tasks.
export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Hero />
        <Suspense fallback={null}>
          <BelowFold />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </>
  );
}
