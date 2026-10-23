'use client';

import { useEffect, useRef } from 'react';
import SectionHead from './SectionHead';
import { dotWorth, StatVisual, statKind } from './visuals/StatVisual';
import { useContent } from '../content/ContentProvider';
import { itemKey, parseStat } from '../content/format';
import { bell, clamp, onScrollFrame, pinProgress, scrollToProgress, smooth } from '../scrollStage';
import './Numbers.css';

const format = (number, suffix) => `${number.toLocaleString('en-US')}${suffix}`;

// The collective in numbers, one at a time. The section is pinned while the
// visitor scrolls through it; each stat takes the stage in turn and counts up
// with the scroll, over a picture of its own value (see StatVisual). With
// reduced motion (or a single stat) they simply sit side by side, complete.
export default function Numbers() {
  const { numbers } = useContent();
  const rootRef = useRef(null);
  const visuals = useRef([]);
  const items = numbers.items.map((stat) => ({ ...stat, parsed: parseStat(stat.value) }));
  const n = items.length;

  useEffect(() => {
    const root = rootRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || n < 2) {
      visuals.current.forEach((v) => v?.update(1));
      return undefined;
    }
    const slides = [...root.querySelectorAll('.numbers__slide')];
    const counts = [...root.querySelectorAll('.numbers__count')];
    const picks = [...root.querySelectorAll('.numbers__pick')];
    let current = -1;
    return onScrollFrame(() => {
      const p = pinProgress(root);
      const c = p * n;
      // The first stat starts counting as the section comes up the screen.
      const rect = root.getBoundingClientRect();
      const entering = clamp((window.innerHeight - rect.top) / window.innerHeight);
      slides.forEach((el, i) => {
        const into = i === 0 ? 1 : smooth((c - i - 0.02) / 0.16);
        const out = i === n - 1 ? 0 : smooth((c - (i + 1) + 0.18) / 0.16);
        const o = into * (1 - out);
        el.style.opacity = o;
        el.style.visibility = o > 0.002 ? 'visible' : 'hidden';
        el.style.transform = `translate3d(0, ${(1 - into) * 60 - out * 60}px, 0) scale(${0.96 + 0.04 * o})`;
        const k = smooth(i === 0 ? 0.55 * entering + 0.45 * clamp(c / 0.45) : clamp((c - i) / 0.6));
        visuals.current[i]?.update(k);
        const { parsed } = items[i];
        if (parsed) counts[i].textContent = format(Math.round(k * parsed.number), parsed.suffix);
        el.style.setProperty('--fill', `${(k * 100).toFixed(1)}%`);
        el.style.setProperty('--glow', bell(c, i - 0.3, i + 0.2, i + 0.7, i + 1.1).toFixed(3));
      });
      const now = clamp(Math.floor(c), 0, n - 1);
      if (now !== current) {
        current = now;
        picks.forEach((b, i) => b.setAttribute('aria-current', i === now ? 'true' : 'false'));
      }
    });
    // Content changes re-run it; the items are derived from `numbers`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, numbers]);

  const pick = (i) => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollToProgress(rootRef.current, (i + 0.55) / n, reduced);
  };

  return (
    <section
      ref={rootRef}
      className="section section--dark numbers"
      aria-labelledby="numbers-title"
      data-pin={n > 1 ? '' : undefined}
      style={{ '--count': n }}
    >
      <div className="numbers__pin">
        <div className="container numbers__layout">
          <div className="numbers__side">
            <SectionHead id="numbers-title" title={numbers.title} intro={numbers.intro} />
            <ol className="numbers__list" aria-label="The numbers">
              {items.map((stat, i) => (
                <li key={itemKey(stat, i)}>
                  <button type="button" className="numbers__pick" aria-current={i === 0 ? 'true' : 'false'} onClick={() => pick(i)}>
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    {stat.label}
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <dl className="numbers__stage">
            {items.map((stat, i) => {
              const kind = statKind(stat.parsed);
              return (
                <div key={itemKey(stat, i)} className={`numbers__slide numbers__slide--${kind ?? 'plain'}`}>
                  <div className="numbers__visual" aria-hidden="true">
                    <StatVisual
                      parsed={stat.parsed}
                      ref={(v) => {
                        visuals.current[i] = v;
                      }}
                    />
                  </div>
                  <dt className="numbers__label">{stat.label}</dt>
                  <dd className="numbers__value">
                    <span className="numbers__count" aria-hidden="true">
                      {stat.value}
                    </span>
                    <span className="sr-only">{stat.value}</span>
                  </dd>
                  {kind === 'dots' && (
                    <p className="numbers__note" aria-hidden="true">
                      Each dot ≈ {Math.round(dotWorth(stat.parsed)).toLocaleString('en-US')}
                    </p>
                  )}
                </div>
              );
            })}
          </dl>
        </div>
      </div>
    </section>
  );
}
