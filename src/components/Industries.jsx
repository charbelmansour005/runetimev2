import { useState } from 'react';
import Reveal from './Reveal';
import SectionHead from './SectionHead';
import IndustryVisual from './visuals/IndustryVisual';
import { Arrow } from './Icons';
import { useContent } from '../content/ContentProvider';
import { itemKey } from '../content/format';
import './Industries.css';

export default function Industries() {
  const { industries } = useContent();
  const items = industries.items;
  const [active, setActive] = useState(0);
  const item = items[Math.min(active, items.length - 1)];

  const onKeyDown = (e) => {
    if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const next = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    setActive(next);
    document.getElementById(`industry-tab-${next}`)?.focus();
  };

  return (
    <section className="section section--dark industries" id="industries" aria-labelledby="industries-title">
      <div className="container">
        <SectionHead
          id="industries-title"
          title={industries.title}
          tone="ghost"
          intro={industries.intro}
          action={{ label: 'View all', href: '#contact' }}
        />

        <div className="industries__body">
          <Reveal className="industries__tabs" role="tablist" aria-label={industries.title} aria-orientation="vertical" onKeyDown={onKeyDown}>
            {items.map((ind, i) => (
              <button
                key={itemKey(ind, i)}
                id={`industry-tab-${i}`}
                type="button"
                role="tab"
                aria-selected={ind === item}
                aria-controls="industry-panel"
                tabIndex={ind === item ? 0 : -1}
                className={`industry-tab${ind === item ? ' is-active' : ''}`}
                onClick={() => setActive(i)}
              >
                {ind.name}
                <Arrow className="industry-tab__arrow" />
              </button>
            ))}
          </Reveal>

          <Reveal delay={120}>
            <div
              key={itemKey(item, active)}
              id="industry-panel"
              className="industry-panel"
              role="tabpanel"
              aria-labelledby={`industry-tab-${items.indexOf(item)}`}
            >
              <div className="industry-panel__copy">
                <h3>{item.name}</h3>
                <p>{item.text}</p>
                <ul>
                  {item.points.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
              <div className="industry-panel__visual" aria-hidden="true">
                <IndustryVisual id={item.visual} />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
