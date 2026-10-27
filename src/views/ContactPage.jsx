'use client';

import Header from '../components/Header';
import Footer from '../components/Footer';
import PageLink from '../components/PageLink';
import Contact from '../components/Contact';
import './InsightsPage.css';
import './ContactPage.css';

// /contact — the contact form on a page of its own (the home page has the
// same form as its last section).
export default function ContactPage() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main" className="contact-page">
        <section className="page-hero" aria-labelledby="page-title">
          <div className="container">
            <nav className="page-hero__crumbs" aria-label="Breadcrumb">
              <PageLink href="/">Home</PageLink>
              <span aria-hidden="true">/</span>
              <span aria-current="page">Contact</span>
            </nav>
            <h1 className="page-hero__title" id="page-title">
              Get in touch
            </h1>
          </div>
        </section>
        <Contact />
      </main>
      <Footer />
    </>
  );
}
