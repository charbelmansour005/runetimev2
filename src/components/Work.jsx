import { useState } from 'react';
import SectionHead from './SectionHead';
import Reveal from './Reveal';
import WorkArt from './visuals/WorkArt';
import { Arrow } from './Icons';
import { useContent } from '../content/ContentProvider';
import { itemKey, linkProps } from '../content/format';
import { WORK_TAG_OPTIONS } from '../data/options';
import './Work.css';

const FILTERS = [{ value: 'all', label: 'All' }, ...WORK_TAG_OPTIONS];
// The home page shows the first few; /work lists them all.
const HOME_COUNT = 4;

// "All" on the home page shows a spread of the work, not just the first few
// (which can all be one kind): take the projects in turn from each type (web,
// mobile, AI), then list the chosen ones in their CMS order.
function spread(items, count) {
  const lists = WORK_TAG_OPTIONS.map(({ value }) => []);
  items.forEach((item) => {
    const type = WORK_TAG_OPTIONS.findIndex(({ value }) => item.tags.includes(value));
    lists[Math.max(type, 0)].push(item);
  });
  const picked = new Set();
  for (let round = 0; picked.size < count && lists.some((list) => list[round]); round += 1) {
    lists.forEach((list) => {
      if (list[round] && picked.size < count) picked.add(list[round]);
    });
  }
  return items.filter((item) => picked.has(item));
}

const isExternal = (url) => /^https?:\/\//i.test(url);

// What a project's link says. A link to another site is named after it
// ("Visit hajjmedical.center"); a page on this site is a case study.
export function ProjectLinkLabel({ url }) {
  let label = 'View case study';
  if (isExternal(url)) {
    try {
      label = `Visit ${new URL(url).hostname.replace(/^www\./, '')}`;
    } catch {
      label = 'Visit the site';
    }
  }
  return (
    <>
      {label} <Arrow />
      {isExternal(url) && <span className="sr-only"> (opens in a new tab)</span>}
    </>
  );
}

// A project's artwork: an uploaded image filling the tile, or a device mockup
// (with an uploaded screenshot on its screen, if there is one). Images load
// lazily unless `eager` (for the first ones on the Work page).
export function ProjectArt({ item, eager = false }) {
  if (item.image && (item.imageFit === 'cover' || item.imageFit === 'contain')) {
    return (
      <img
        className={`work-tile__img work-tile__img--${item.imageFit}`}
        src={item.image}
        alt=""
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
    );
  }
  return <WorkArt item={item} screenshot={item.image || undefined} eager={eager} />;
}

export default function Work() {
  const { work } = useContent();
  const [filter, setFilter] = useState('all');
  // Every project switched off in the CMS: hide the section.
  if (!work.items.length) return null;
  const matching = work.items.filter((item) => filter === 'all' || item.tags.includes(filter));
  const items = filter === 'all' ? spread(matching, HOME_COUNT) : matching.slice(0, HOME_COUNT);

  return (
    <section className="section section--dark-alt work" id="work" aria-labelledby="work-title">
      <div className="container">
        <SectionHead
          id="work-title"
          title={work.title}
          tone="ghost"
          intro={work.intro}
          action={{ label: 'View all', href: '/work' }}
        />
        <Reveal className="work__filters" role="group" aria-label="Filter projects">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`filter-pill${filter === f.value ? ' is-active' : ''}`}
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </Reveal>
        <p className="sr-only" role="status">
          {items.length < matching.length
            ? `Showing ${items.length} of ${matching.length} projects`
            : `Showing ${items.length} ${items.length === 1 ? 'project' : 'projects'}`}
        </p>
      </div>

      <div className="work__grid">
        {items.map((item, i) => {
          // Only projects with a link are clickable.
          const Tile = item.url ? 'a' : 'article';
          return (
            <Tile
              key={`${filter}-${itemKey(item, i)}`}
              className={`work-tile${item.url ? ' is-linked' : ''}`}
              style={{ '--tile-bg': item.bg }}
              {...(item.url ? linkProps(item.url) : {})}
            >
              <div className="work-tile__art" aria-hidden="true">
                <ProjectArt item={item} />
              </div>
              <div className="work-tile__overlay">
                <h3>{item.name}</h3>
                <p>{item.excerpt}</p>
                {item.url && (
                  <span className="work-tile__more">
                    <ProjectLinkLabel url={item.url} />
                  </span>
                )}
              </div>
            </Tile>
          );
        })}
      </div>
    </section>
  );
}
