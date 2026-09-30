import { lazy, Suspense, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useContent } from '../../content/ContentProvider';
import { itemKey } from '../../content/format';
import './Hero.css';

// three.js is heavy, so the WebGL layers load after the copy has painted.
const ParticleSculpture = lazy(() => import('./ParticleSculpture'));
const WaveCanvas = lazy(() => import('./WaveCanvas'));

gsap.registerPlugin(ScrollTrigger);

const SLIDE_SECONDS = 8;

export default function Hero() {
  const { slides } = useContent().hero;
  const rootRef = useRef(null);
  const sculptureApi = useRef(null);
  const activeRef = useRef(0);
  const goRef = useRef(() => {});
  const [active, setActive] = useState(0);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let removeListeners = () => {};

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root);
      const slideEls = q('.hero__slide');
      const titles = q('.hero__title');
      const ctas = q('.hero__cta');
      const [glow] = q('.hero__glow');
      const [progress] = q('.hero__progress-fill');
      const fills = q('.hero-tab__fill');

      let current = -1;
      let busy = false;
      let autoplay;
      let progressTween;

      gsap.set(slideEls, { autoAlpha: 0 });

      // The particles start re-forming as soon as a slide is chosen.
      const reshape = (i) => {
        activeRef.current = i;
        sculptureApi.current?.setSlide(i);
        gsap.to(glow, { '--glow': slides[i].glow, duration: reduced ? 0 : 1.4, ease: 'power2.inOut' });
      };

      const schedule = (i) => {
        gsap.set([progress, ...fills], { scaleX: 0 });
        progressTween = gsap.to([progress, fills[i]], { scaleX: 1, duration: SLIDE_SECONDS, ease: 'none' });
        autoplay = gsap.delayedCall(SLIDE_SECONDS, () => go((i + 1) % slides.length));
      };

      // The headline leaves left and the next one sweeps in from the right
      // while the particles burst apart and build the next shape.
      function go(next) {
        if (busy || next === current) return;
        busy = true;
        autoplay?.kill();
        progressTween?.kill();
        gsap.to([progress, ...fills], { scaleX: 0, duration: 0.35, ease: 'power2.out' });
        const prev = current;
        const vw = window.innerWidth;
        const tl = gsap.timeline({
          defaults: { ease: 'power2.inOut' },
          onComplete: () => {
            current = next;
            busy = false;
            schedule(next);
          },
        });

        tl.add(() => reshape(next), 0);

        if (reduced) {
          if (prev >= 0) tl.to(slideEls[prev], { autoAlpha: 0, duration: 0.3 });
          tl.add(() => setActive(next)).to(slideEls[next], { autoAlpha: 1, duration: 0.4 });
          return;
        }

        if (prev >= 0) {
          tl.to(titles[prev], { x: -vw, duration: 0.8 }, 0)
            .to(ctas[prev], { x: -vw, duration: 0.6 }, 0)
            .set(slideEls[prev], { autoAlpha: 0 });
        }

        tl.add(() => setActive(next))
          .set(slideEls[next], { autoAlpha: 1 })
          .fromTo(titles[next], { x: vw * 0.55, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.95 })
          .fromTo(ctas[next], { x: vw * 0.55, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.95 }, '<0.08');
      }
      goRef.current = go;

      if (!reduced) {
        // Scroll parallax: the sculpture lags behind as the hero leaves.
        const parallax = q('.hero__sculpture');
        gsap.to(parallax, {
          yPercent: 14,
          ease: 'none',
          scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: true },
        });

        // Mouse parallax: the sculpture drifts and turns towards the cursor,
        // and its particles part around it.
        const artX = gsap.quickTo(parallax, 'x', { duration: 0.9, ease: 'power3.out' });
        const onMove = (e) => {
          if (e.pointerType === 'touch') return;
          artX((e.clientX / window.innerWidth - 0.5) * 30);
          sculptureApi.current?.setPointer(e.clientX, e.clientY);
        };
        const onLeave = () => {
          artX(0);
          sculptureApi.current?.setPointer(null);
        };
        root.addEventListener('pointermove', onMove);
        root.addEventListener('pointerleave', onLeave);
        removeListeners = () => {
          root.removeEventListener('pointermove', onMove);
          root.removeEventListener('pointerleave', onLeave);
        };
      }

      // Swipe between slides on touch screens.
      let touchX = null;
      const onTouchStart = (e) => {
        touchX = e.touches[0].clientX;
      };
      const onTouchEnd = (e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        touchX = null;
        if (Math.abs(dx) < 50 || current < 0) return;
        const n = slides.length;
        go(dx < 0 ? (current + 1) % n : (current - 1 + n) % n);
      };
      root.addEventListener('touchstart', onTouchStart, { passive: true });
      root.addEventListener('touchend', onTouchEnd, { passive: true });
      const removeMouse = removeListeners;
      removeListeners = () => {
        removeMouse();
        root.removeEventListener('touchstart', onTouchStart);
        root.removeEventListener('touchend', onTouchEnd);
      };

      gsap.delayedCall(0.2, () => go(0));
    }, root);

    return () => {
      removeListeners();
      ctx.revert();
    };
  }, [slides]);

  return (
    <section className="hero" id="top" ref={rootRef} aria-roledescription="carousel" aria-label="What we do">
      <div className="hero__bg" aria-hidden="true" />
      <Suspense fallback={null}>
        <WaveCanvas className="hero__wave" />
      </Suspense>
      <div className="hero__progress" aria-hidden="true">
        <span className="hero__progress-fill" />
      </div>

      <div className="hero__art" aria-hidden="true">
        <div className="hero__sculpture">
          <div className="hero__glow" />
          <Suspense fallback={null}>
            <ParticleSculpture apiRef={sculptureApi} activeRef={activeRef} slides={slides} />
          </Suspense>
        </div>
      </div>

      <div className="hero__content container">
        <div className="hero__slides">
          {slides.map((slide, i) => {
            const Title = i === 0 ? 'h1' : 'h2';
            return (
              <div
                key={itemKey(slide, i)}
                id={`hero-slide-${i}`}
                className="hero__slide"
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${slides.length}`}
                aria-hidden={i !== active}
              >
                <Title className="hero__title">
                  {slide.headline.map((line, j) => (
                    <span key={j} className="hero__line">
                      {line}{' '}
                    </span>
                  ))}
                </Title>
                <a className="btn btn--primary hero__cta" href="#contact" tabIndex={i === active ? 0 : -1}>
                  Get in touch
                </a>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="hero__tabs"
        role="tablist"
        aria-label="Choose a highlight"
        style={{ gridTemplateColumns: `repeat(${slides.length}, 1fr)` }}
      >
        {slides.map((slide, i) => (
          <button
            key={itemKey(slide, i)}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-controls={`hero-slide-${i}`}
            className={`hero-tab${i === active ? ' is-active' : ''}`}
            onClick={() => goRef.current(i)}
          >
            <span className="hero-tab__bar">
              <span className="hero-tab__fill" />
            </span>
            <span className="hero-tab__title">{slide.tabTitle}</span>
            <span className="hero-tab__text">{slide.tabText}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
