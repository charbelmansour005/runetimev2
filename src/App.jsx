'use client';

import Header from './components/Header';
import Hero from './components/hero/Hero';
import BelowFold from './BelowFold';
import Footer from './components/Footer';

// The home page.
export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Hero />
        <BelowFold />
      </main>
      <Footer />
    </>
  );
}
