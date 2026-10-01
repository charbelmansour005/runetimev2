import { useEffect } from 'react';
import About from './components/About';
import Services from './components/Services';
import Industries from './components/Industries';
import Solutions from './components/Solutions';
import Work from './components/Work';
import Stack from './components/Stack';
import Numbers from './components/Numbers';
import Insights from './components/Insights';
import Contact from './components/Contact';

// Everything under the hero: a separate chunk that renders just after the hero
// has painted, so the first paint doesn't wait for the whole page.
export default function BelowFold() {
  // A link like /#contact (from another page, or clicked before this part
  // rendered) can only scroll once its section exists; move keyboard focus too.
  useEffect(() => {
    const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    if (!target) return;
    target.scrollIntoView({ behavior: 'instant' });
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }, []);

  return (
    <>
      <About />
      <Services />
      <Industries />
      <Solutions />
      <Work />
      <Stack />
      <Numbers />
      <Insights />
      <Contact />
    </>
  );
}
