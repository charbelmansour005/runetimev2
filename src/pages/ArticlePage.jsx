import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SectionHead from '../components/SectionHead';
import { newestFirst, PostCard, PostCover } from '../components/Insights';
import Markdown from '../content/Markdown';
import { useContent } from '../content/ContentProvider';
import { formatDate, itemKey } from '../content/format';
import { useDocumentMeta } from '../content/meta';
import { SLUG_PATTERN } from '../data/insights';
import './InsightsPage.css';
import './ArticlePage.css';

// The server embeds the article in the page (server/routes/pages.js), so it
// shows without another request. In development it's fetched instead.
function embeddedArticle(slug) {
  try {
    const data = JSON.parse(document.getElementById('article-data')?.textContent ?? 'null');
    return data?.slug === slug ? data : null;
  } catch {
    return null;
  }
}

function initialState(slug) {
  const article = embeddedArticle(slug);
  if (article) return { status: 'ready', article };
  return { status: SLUG_PATTERN.test(slug) ? 'loading' : 'missing' };
}

// /insights/<slug> — one article written in the CMS.
export default function ArticlePage({ slug }) {
  const { insights, brand } = useContent();
  const [state, setState] = useState(() => initialState(slug));
  const { status, article } = state;

  useEffect(() => {
    if (status !== 'loading') return undefined;
    const controller = new AbortController();
    fetch(`/api/insights/${slug}`, { signal: controller.signal })
      .then(async (res) => {
        if (res.status === 404) return setState({ status: 'missing' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return setState({ status: 'ready', article: await res.json() });
      })
      .catch((err) => err.name !== 'AbortError' && setState({ status: 'error' }));
    return () => controller.abort();
  }, [slug, status]);

  const titles = {
    ready: article?.title,
    missing: 'Article not found',
    error: 'This article didn’t load',
  };
  useDocumentMeta({
    title: `${titles[status] ?? insights.title} — ${brand.name}`,
    description: article?.summary || insights.intro,
  });

  const more = useMemo(
    () =>
      newestFirst(insights.items)
        .filter((post) => post.slug !== slug)
        .slice(0, 3),
    [insights.items, slug],
  );

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">
        {status === 'ready' ? (
          <Article article={article} brandName={brand.name} />
        ) : (
          <section className="page-hero article-hero" aria-busy={status === 'loading'}>
            <div className="container article-hero__inner">
              <Crumbs />
              {status === 'loading' ? (
                <>
                  <p className="sr-only" role="status">
                    Loading the article
                  </p>
                  <div className="article-skeleton" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                </>
              ) : (
                <>
                  <h1 className="page-hero__title" id="page-title">
                    {titles[status]}
                  </h1>
                  <p className="page-hero__intro" role={status === 'error' ? 'alert' : undefined}>
                    {status === 'missing'
                      ? 'It may have moved, or the link may have a typo.'
                      : 'Check your connection and try again.'}
                  </p>
                  <div className="article-hero__actions">
                    {status === 'error' && (
                      <button
                        type="button"
                        className="btn btn--primary"
                        onClick={() => setState({ status: 'loading' })}
                      >
                        Try again
                      </button>
                    )}
                    <a className="btn btn--ghost" href="/insights">
                      All insights
                    </a>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {more.length > 0 && (
          <section className="section section--mist article-more" aria-labelledby="more-title">
            <div className="container">
              <SectionHead
                id="more-title"
                title={status === 'ready' ? 'Keep reading' : 'Latest insights'}
                action={{ label: 'View all', href: '/insights' }}
              />
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
      <a href="/">Home</a>
      <span aria-hidden="true">/</span>
      <a href="/insights">Insights</a>
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
