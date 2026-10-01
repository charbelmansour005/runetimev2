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

  // The list is vertical on desktop and a horizontal scroller on smaller
  // screens, so both arrow axes move between tabs, plus Home and End.
  const onKeyDown = (e) => {
    const n = items.length;
    const steps = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    let next;
    if (e.key in steps) next = (active + steps[e.key] + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else return;
    e.preventDefault();
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
          action={{ label: 'Talk to us', href: '#contact' }}
        />

        <div className="industries__body">
          <Reveal className="industries__tabs" role="tablist" aria-label={industries.title} onKeyDown={onKeyDown}>
            {items.map((ind, i) => (
              <button
                key={itemKey(ind, i)}
                id={`industry-tab-${i}`}
                type="button"
                role="tab"
                aria-selected={ind === item}
                aria-controls={`industry-panel-${i}`}
                tabIndex={ind === item ? 0 : -1}
                className={`industry-tab${ind === item ? ' is-active' : ''}`}
                onClick={() => setActive(i)}
              >
                {ind.name}
                <Arrow className="industry-tab__arrow" />
              </button>
            ))}
          </Reveal>

          {/* Every industry's copy is in the page (for search engines too); only
              the selected one shows, with its illustration. */}
          <Reveal delay={120}>
            {items.map((ind, i) => (
              <div
                key={itemKey(ind, i)}
                id={`industry-panel-${i}`}
                className="industry-panel"
                role="tabpanel"
                tabIndex={0}
                aria-labelledby={`industry-tab-${i}`}
                hidden={ind !== item}
              >
                <div className="industry-panel__copy">
                  <h3>{ind.name}</h3>
                  <p>{ind.text}</p>
                  <ul>
                    {ind.points.map((point, j) => (
                      <li key={j}>{point}</li>
                    ))}
                  </ul>
                </div>
                {ind === item && (
                  <div className="industry-panel__visual" aria-hidden="true">
                    <IndustryVisual id={ind.visual} />
                  </div>
                )}
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
