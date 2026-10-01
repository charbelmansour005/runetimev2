import { useMemo, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { newestFirst, PostCard } from '../components/Insights';
import { useContent } from '../content/ContentProvider';
import { itemKey } from '../content/format';
import { useDocumentMeta } from '../content/meta';
import './InsightsPage.css';

// /insights — every article from the CMS, newest first, filterable by category.
export default function InsightsPage() {
  const { insights, brand } = useContent();
  const posts = useMemo(() => newestFirst(insights.items), [insights.items]);
  const tags = useMemo(() => [...new Set(posts.map((p) => p.tag))], [posts]);
  const [tag, setTag] = useState(null);
  const shown = tag ? posts.filter((p) => p.tag === tag) : posts;
  useDocumentMeta({ title: `${insights.title} — ${brand.name}`, description: insights.intro });

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <section className="page-hero" aria-labelledby="page-title">
          <div className="container">
            <nav className="page-hero__crumbs" aria-label="Breadcrumb">
              <a href="/">Home</a>
              <span aria-hidden="true">/</span>
              <span aria-current="page">Insights</span>
            </nav>
            <h1 className="page-hero__title" id="page-title">
              {insights.title}
            </h1>
            {insights.intro && <p className="page-hero__intro">{insights.intro}</p>}
          </div>
        </section>

        <section className="section insights-archive" aria-label="Articles">
          <div className="container">
            {tags.length > 1 && (
              <div className="insights-archive__filters" role="group" aria-label="Filter by category">
                {[null, ...tags].map((t) => (
                  <button
                    key={t ?? 'all'}
                    type="button"
                    className={`archive-pill${tag === t ? ' is-active' : ''}`}
                    aria-pressed={tag === t}
                    onClick={() => setTag(t)}
                  >
                    {t ?? 'All'}
                  </button>
                ))}
              </div>
            )}
            <h2 className="sr-only">{tag ? `${tag} articles` : 'All articles'}</h2>
            <p className="sr-only" role="status">
              {`Showing ${shown.length} ${shown.length === 1 ? 'article' : 'articles'}`}
            </p>
            {shown.length ? (
              <div className="insights__grid insights-archive__grid">
                {shown.map((post, i) => (
                  <PostCard key={`${tag}-${itemKey(post, i)}`} post={post} delay={(i % 3) * 80} />
                ))}
              </div>
            ) : (
              <p className="insights-archive__empty">No articles yet. Check back soon.</p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
