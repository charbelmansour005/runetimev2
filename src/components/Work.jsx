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
  const items = work.items.filter((item) => filter === 'all' || item.tags.includes(filter));

  return (
    <section className="section section--dark-alt work" id="work" aria-labelledby="work-title">
      <div className="container">
        <SectionHead
          id="work-title"
          title={work.title}
          tone="ghost"
          intro={work.intro}
          action={{ label: 'View all', href: '#contact' }}
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
      </div>

      <div className="work__grid">
        {items.map((item, i) => (
          <a
            key={`${filter}-${itemKey(item, i)}`}
            className="work-tile"
            style={{ '--tile-bg': item.bg }}
            {...linkProps(item.url, '#contact')}
          >
            <div className="work-tile__art" aria-hidden="true">
              <WorkArt item={item} />
            </div>
            <div className="work-tile__overlay">
              <h3>{item.name}</h3>
              <p>{item.excerpt}</p>
              <span className="work-tile__more">
                View case study <Arrow />
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
