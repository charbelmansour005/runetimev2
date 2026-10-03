import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Reveal from '../components/Reveal';
import { ProjectArt, ProjectLinkLabel } from '../components/Work';
import { useContent } from '../content/ContentProvider';
import { itemKey, linkProps } from '../content/format';
import { useDocumentMeta } from '../content/meta';
import { WORK_TAG_OPTIONS } from '../data/options';
import './InsightsPage.css';
import './WorkPage.css';

// A project with its text under the artwork, so screenshots aren't covered.
// Like the home page's tiles, it's a link only when the project has one.
function ProjectCard({ project, delay, eager }) {
  const tags = WORK_TAG_OPTIONS.filter((tag) => project.tags.includes(tag.value));
  const content = (
    <>
      <div className="project-card__media" style={{ '--tile-bg': project.bg }} aria-hidden="true">
        <div className="work-tile__art">
          <ProjectArt item={project} eager={eager} />
        </div>
      </div>
      <ul className="project-card__tags">
        {tags.map((tag) => (
          <li key={tag.value}>{tag.label}</li>
        ))}
      </ul>
      <h3 className="project-card__title">{project.name}</h3>
      <p className="project-card__text">{project.excerpt}</p>
      {project.url && (
        <span className="project-card__more">
          <ProjectLinkLabel url={project.url} />
        </span>
      )}
    </>
  );
  return (
    <Reveal as="article" className={`project-card${project.url ? ' is-linked' : ''}`} delay={delay}>
      {project.url ? (
        <a className="project-card__link" {...linkProps(project.url)}>
          {content}
        </a>
      ) : (
        <div className="project-card__link">{content}</div>
      )}
    </Reveal>
  );
}

// /work — every active project from the CMS, filterable by tag.
export default function WorkPage() {
  const { work, brand } = useContent();
  const tags = WORK_TAG_OPTIONS.filter((tag) => work.items.some((item) => item.tags.includes(tag.value)));
  const [filter, setFilter] = useState(null);
  const shown = filter ? work.items.filter((item) => item.tags.includes(filter)) : work.items;
  const filterLabel = tags.find((tag) => tag.value === filter)?.label;
  useDocumentMeta({ title: `${work.title} — ${brand.name}`, description: work.intro });

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
              <span aria-current="page">Work</span>
            </nav>
            <h1 className="page-hero__title" id="page-title">
              {work.title}
            </h1>
            {work.intro && <p className="page-hero__intro">{work.intro}</p>}
          </div>
        </section>

        <section className="section work-archive" aria-label="Projects">
          <div className="container">
            {tags.length > 1 && (
              <div className="archive-filters" role="group" aria-label="Filter by type">
                {[null, ...tags].map((tag) => (
                  <button
                    key={tag?.value ?? 'all'}
                    type="button"
                    className={`archive-pill${filter === (tag?.value ?? null) ? ' is-active' : ''}`}
                    aria-pressed={filter === (tag?.value ?? null)}
                    onClick={() => setFilter(tag?.value ?? null)}
                  >
                    {tag?.label ?? 'All'}
                  </button>
                ))}
              </div>
            )}
            <h2 className="sr-only">{filterLabel ? `${filterLabel} projects` : 'All projects'}</h2>
            <p className="sr-only" role="status">
              {`Showing ${shown.length} ${shown.length === 1 ? 'project' : 'projects'}`}
            </p>
            {shown.length ? (
              <div className="work-archive__grid">
                {shown.map((project, i) => (
                  // The first row is on screen straight away, so its images don't wait.
                  <ProjectCard key={`${filter}-${itemKey(project, i)}`} project={project} delay={(i % 3) * 80} eager={i < 3} />
                ))}
              </div>
            ) : (
              <p className="work-archive__empty">No projects to show yet. Check back soon.</p>
            )}

            <div className="work-archive__cta">
              <p>Have a product in mind?</p>
              <a className="btn btn--accent" href="/#contact">
                Start a project
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
