'use client';

import { useEffect, useRef } from 'react';
import Reveal from './Reveal';
import SectionHead from './SectionHead';
import ServiceIcon from './visuals/ServiceIcon';
import { useContent } from '../content/ContentProvider';
import { itemKey } from '../content/format';
import { onScrollFrame, pinProgress, scrollToProgress } from '../scrollStage';
import './Services.css';

// The services on a 3D ring. The section is pinned while the visitor scrolls
// through it, and the ring turns to bring each service to the front; the
// list beside it shows which, and turns to one when clicked. With reduced
// motion (or before the script runs) it's a plain grid of cards.
export default function Services() {
  const { services } = useContent();
  const rootRef = useRef(null);
  const n = services.items.length;

  useEffect(() => {
    const root = rootRef.current;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || n < 3) return undefined;
    const ring = root.querySelector('.services__ring');
    const cards = [...ring.children];
    const buttons = [...root.querySelectorAll('.services__pick')];
    let front = -1;
    return onScrollFrame(() => {
      const q = pinProgress(root);
      ring.style.setProperty('--turn', `${-q * (360 - 360 / n)}deg`);
      const next = Math.round(q * (n - 1));
      if (next === front) return;
      front = next;
      cards.forEach((card, i) => card.classList.toggle('is-front', i === next));
      buttons.forEach((button, i) => button.setAttribute('aria-current', i === next ? 'true' : 'false'));
    });
  }, [n]);

  const pick = (i) => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollToProgress(rootRef.current, i / Math.max(n - 1, 1), reduced);
  };

  return (
    <section
      ref={rootRef}
      className="section section--mist services"
      id="services"
      aria-labelledby="services-title"
      data-ring={n >= 3 ? '' : undefined}
      style={{ '--count': n }}
    >
      <div className="services__pin">
        <div className="container services__layout">
          <div className="services__side">
            <SectionHead
              id="services-title"
              title={services.title}
              intro={services.intro}
              action={{ label: 'Start a project', href: '#contact' }}
            />
            <ol className="services__list" aria-label="Our services">
              {services.items.map((service, i) => (
                <li key={itemKey(service, i)}>
                  <button type="button" className="services__pick" aria-current={i === 0 ? 'true' : 'false'} onClick={() => pick(i)}>
                    <span className="services__num">{String(i + 1).padStart(2, '0')}</span>
                    {service.title}
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <div className="services__stage">
            <div className="services__grid services__ring">
              {services.items.map((service, i) => (
                <Reveal
                  key={itemKey(service, i)}
                  className={`service-card${i === 0 ? ' is-front' : ''}`}
                  delay={(i % 4) * 80}
                  style={{ '--i': i }}
                >
                  <div className="service-card__icon">
                    <span className="shard shard--lilac" aria-hidden="true" />
                    <ServiceIcon name={service.icon} />
                  </div>
                  <h3 className="service-card__title">{service.title}</h3>
                  <p className="service-card__text">{service.text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
