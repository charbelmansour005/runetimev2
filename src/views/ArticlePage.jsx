'use client';

import { useMemo } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PageLink from '../components/PageLink';
import SectionHead from '../components/SectionHead';
import { newestFirst, PostCard, PostCover } from '../components/Insights';
import Markdown from '../content/Markdown';
import { useContent } from '../content/ContentProvider';
import { formatDate, itemKey } from '../content/format';
import './InsightsPage.css';
import './ArticlePage.css';

// /insights/<slug> — one article written in the CMS. The server finds it
// (app/(site)/insights/[slug]/page.jsx) and answers 404 if there isn't one.
export default function ArticlePage({ article }) {
  const { insights, brand } = useContent();
  const more = useMemo(
    () =>
      newestFirst(insights.items)
        .filter((post) => post.slug !== article.slug)
        .slice(0, 3),
    [insights.items, article.slug],
  );

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Article article={article} brandName={brand.name} />

        {more.length > 0 && (
          <section className="section section--mist article-more" aria-labelledby="more-title">
            <div className="container">
              <SectionHead id="more-title" title="Keep reading" action={{ label: 'View all', href: '/insights' }} />
              <div className="insights__grid insights-archive__grid">
                {more.map((post, i) => (
                  <PostCard key={itemKey(post, i)} post={post} delay={i * 80} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

function Crumbs() {
  return (
    <nav className="page-hero__crumbs" aria-label="Breadcrumb">
      <PageLink href="/">Home</PageLink>
      <span aria-hidden="true">/</span>
      <PageLink href="/insights">Insights</PageLink>
    </nav>
  );
}

function Article({ article, brandName }) {
  return (
    <article aria-labelledby="page-title">
      <header className="page-hero article-hero article-hero--cover">
        <div className="container article-hero__inner">
          <Crumbs />
          <p className="article-hero__meta">
            <span className="article-hero__tag">{article.tag}</span>
            <time dateTime={article.date}>{formatDate(article.date)}</time>
            {article.readMinutes > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>{article.readMinutes} min read</span>
              </>
            )}
          </p>
          <h1 className="page-hero__title article-hero__title" id="page-title">
            {article.title}
          </h1>
          {article.summary && <p className="page-hero__intro article-hero__summary">{article.summary}</p>}
        </div>
      </header>

      <div className="container">
        <div className="article-cover">
          <PostCover {...article.art} />
        </div>
        <Markdown className="article-body" source={article.body} />
        <footer className="article-end">
          <p>
            Published by {brandName} on <time dateTime={article.date}>{formatDate(article.date)}</time>.
          </p>
          <a className="btn btn--accent" href="/#contact">
            Start a project
          </a>
        </footer>
      </div>
    </article>
  );
}
