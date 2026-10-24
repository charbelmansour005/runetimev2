'use client';

import { useEffect, useRef, useState } from 'react';
import Reveal from './Reveal';
import SectionHead from './SectionHead';
import IndustryVisual from './visuals/IndustryVisual';
import { Arrow } from './Icons';
import { useContent } from '../content/ContentProvider';
import { itemKey } from '../content/format';
import { clamp, onScrollFrame, pinProgress, scrollToProgress } from '../scrollStage';
import './Industries.css';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// The industries, one chapter each. The section is pinned while the visitor
// scrolls through it and the scroll picks the industry: its copy and the
// layers of its illustration arrive in turn, and the illustration drifts a
// little while it's on screen. The tabs follow, and jump to a chapter when
// clicked. With reduced motion it's a plain set of tabs.
export default function Industries() {
  const { industries } = useContent();
  const items = industries.items;
  const n = items.length;
  const rootRef = useRef(null);
  const [active, setActive] = useState(0);
  const item = items[Math.min(active, n - 1)];

  useEffect(() => {
    const root = rootRef.current;
    if (reducedMotion() || n < 2) return undefined;
    const rail = root.querySelector('.industries__rail');
    let current = 0;
    return onScrollFrame(() => {
      const q = pinProgress(root);
      const c = q * (n - 1);
      const next = clamp(Math.round(c), 0, n - 1);
      rail.style.setProperty('--q', q.toFixed(4));
      // How far through its chapter the industry is, from -1 to 1: the
      // illustration drifts with it.
      root.style.setProperty('--d', clamp((c - next) * 2, -1, 1).toFixed(3));
      if (next !== current) {
        current = next;
        setActive(next);
        // On phones the tabs are a sideways strip: keep the current one in view.
        const tab = document.getElementById(`industry-tab-${next}`);
        const strip = tab?.parentElement;
        if (strip && strip.scrollWidth > strip.clientWidth) {
          strip.scrollTo({ left: tab.offsetLeft - strip.clientWidth / 2 + tab.offsetWidth / 2, behavior: 'smooth' });
        }
      }
    });
  }, [n]);

  // Picking an industry: in the scroll story, scroll to its chapter.
  const pick = (i) => {
    if (!reducedMotion() && n > 1) scrollToProgress(rootRef.current, i / (n - 1));
    else setActive(i);
  };

  // The list is vertical on desktop and a horizontal scroller on smaller
  // screens, so both arrow axes move between tabs, plus Home and End.
  const onKeyDown = (e) => {
    const steps = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    let next;
    if (e.key in steps) next = (active + steps[e.key] + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else return;
    e.preventDefault();
    pick(next);
    document.getElementById(`industry-tab-${next}`)?.focus();
  };

  return (
    <section
      ref={rootRef}
      className="section section--dark industries"
      id="industries"
      aria-labelledby="industries-title"
      data-pin={n > 1 ? '' : undefined}
      style={{ '--count': n }}
    >
      <div className="industries__pin">
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
              <span className="industries__rail" aria-hidden="true" />
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
                  onClick={() => pick(i)}
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
                        <li key={j} style={{ '--j': j }}>
                          {point}
                        </li>
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
      </div>
    </section>
  );
}
