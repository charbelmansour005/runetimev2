import Header from './components/Header';
import Hero from './components/hero/Hero';
import About from './components/About';
import Services from './components/Services';
import Industries from './components/Industries';
import Solutions from './components/Solutions';
import Work from './components/Work';
import Stack from './components/Stack';
import Numbers from './components/Numbers';
import Insights from './components/Insights';
import Contact from './components/Contact';
import Footer from './components/Footer';

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Hero />
        <About />
        <Services />
        <Industries />
        <Solutions />
        <Work />
        <Stack />
        <Numbers />
        <Insights />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
