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

export default function Work() {
  const { work } = useContent();
  const [filter, setFilter] = useState('all');
  // Every project switched off in the CMS: hide the section.
  if (!work.items.length) return null;
  const items = work.items.filter((item) => filter === 'all' || item.tags.includes(filter));

  return (
    <section className="section section--dark-alt work" id="work" aria-labelledby="work-title">
      <div className="container">
        <SectionHead
          id="work-title"
          title={work.title}
          tone="ghost"
          intro={work.intro}
          action={{ label: 'Start a project', href: '#contact' }}
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
          {`Showing ${items.length} ${items.length === 1 ? 'project' : 'projects'}`}
        </p>
      </div>

      <div className="work__grid">
        {items.map((item, i) => {
          // Only projects with a case study link are clickable.
          const Tile = item.url ? 'a' : 'article';
          const external = item.url && /^https?:\/\//i.test(item.url);
          return (
            <Tile
              key={`${filter}-${itemKey(item, i)}`}
              className={`work-tile${item.url ? ' is-linked' : ''}`}
              style={{ '--tile-bg': item.bg }}
              {...(item.url ? linkProps(item.url) : {})}
            >
              <div className="work-tile__art" aria-hidden="true">
                {item.image && (item.imageFit === 'cover' || item.imageFit === 'contain') ? (
                  <img
                    className={`work-tile__img work-tile__img--${item.imageFit}`}
                    src={item.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <WorkArt item={item} screenshot={item.image || undefined} />
                )}
              </div>
              <div className="work-tile__overlay">
                <h3>{item.name}</h3>
                <p>{item.excerpt}</p>
                {item.url && (
                  <span className="work-tile__more">
                    View case study <Arrow />
                    {external && <span className="sr-only"> (opens in a new tab)</span>}
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
