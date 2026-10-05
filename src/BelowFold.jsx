import About from './components/About';
import Services from './components/Services';
import Industries from './components/Industries';
import Solutions from './components/Solutions';
import Work from './components/Work';
import Stack from './components/Stack';
import Numbers from './components/Numbers';
import Reviews from './components/Reviews';
import Insights from './components/Insights';
import Contact from './components/Contact';

// Everything under the hero.
export default function BelowFold() {
  return (
    <>
      <About />
      <Services />
      <Industries />
      <Solutions />
      <Work />
      <Stack />
      <Numbers />
      <Reviews />
      <Insights />
      <Contact />
    </>
  );
}
