import { lazy, Suspense, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import ErrorBoundary from '../ErrorBoundary';
import { useContent } from '../../content/ContentProvider';
import { itemKey } from '../../content/format';
import './Hero.css';

// three.js is heavy, so the WebGL layers load after the copy has painted.
const ParticleSculpture = lazy(() => import('./ParticleSculpture'));
const WaveCanvas = lazy(() => import('./WaveCanvas'));

const SLIDE_SECONDS = 8;

export default function Hero() {
  const { hero, brand } = useContent();
  const { slides } = hero;
  const rootRef = useRef(null);
  const tabRefs = useRef([]);
  const sculptureApi = useRef(null);
  const activeRef = useRef(0);
  const controls = useRef({ go: () => {}, setPlaying: () => {} });
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [artReady, setArtReady] = useState(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cleanups = [];
    const listen = (el, type, fn, opts) => {
      el.addEventListener(type, fn, opts);
      cleanups.push(() => el.removeEventListener(type, fn, opts));
    };

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root);
      const slideEls = q('.hero__slide');
      const titles = q('.hero__title');
      const ctas = q('.hero__cta');
      const [slidesEl] = q('.hero__slides');
      const [glow] = q('.hero__glow');
      const [progress] = q('.hero__progress-fill');
      const fills = q('.hero-tab__fill');

      let current = -1;
      let busy = false;
      let queued = null;
      let autoplay;
      let progressTween;

      // Rotation stops while the visitor reads (hovering the copy or the tabs,
      // or keyboard focus inside the hero) and whenever they press pause.
      // It starts paused when they've asked for reduced motion.
      const hold = { user: reduced, hover: false, focus: false };
      const sync = () => {
        const held = hold.user || hold.hover || hold.focus;
        autoplay?.paused(held);
        progressTween?.paused(held);
        slidesEl.setAttribute('aria-live', held ? 'polite' : 'off');
      };
      setPlaying(!hold.user);

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
        sync();
      };

      // The headline leaves left and the next one sweeps in from the right
      // while the particles burst apart and build the next shape.
      function go(next) {
        if (next === current) return;
        if (busy) {
          queued = next; // Picked mid-transition: show it right after.
          return;
        }
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
            const target = queued;
            queued = null;
            if (target !== null && target !== next) go(target);
            else schedule(next);
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

      controls.current = {
        go,
        setPlaying: (play) => {
          hold.user = !play;
          setPlaying(play);
          sync();
        },
      };

      const holdHover = (value) => {
        hold.hover = value;
        sync();
      };
      const holdFocus = (value) => {
        hold.focus = value;
        sync();
      };
      q('.hero__slides, .hero__tabbar').forEach((el) => {
        listen(el, 'pointerenter', (e) => e.pointerType === 'mouse' && holdHover(true));
        listen(el, 'pointerleave', (e) => e.pointerType === 'mouse' && holdHover(false));
      });
      // Only keyboard focus holds the slide; a mouse click on a tab shouldn't.
      listen(root, 'focusin', (e) => e.target.matches(':focus-visible') && holdFocus(true));
      listen(root, 'focusout', (e) => !root.contains(e.relatedTarget) && holdFocus(false));

      if (!reduced) {
        // Scroll parallax: the sculpture lags behind as the hero leaves.
        const [parallax] = q('.hero__sculpture');
        let ticking = false;
        listen(
          window,
          'scroll',
          () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
              ticking = false;
              const passed = Math.min(1, Math.max(0, window.scrollY / (root.offsetHeight || 1)));
              gsap.set(parallax, { yPercent: 14 * passed });
            });
          },
          { passive: true },
        );

        // Mouse parallax: the sculpture drifts and turns towards the cursor,
        // and its particles part around it.
        const artX = gsap.quickTo(parallax, 'x', { duration: 0.9, ease: 'power3.out' });
        listen(root, 'pointermove', (e) => {
          if (e.pointerType === 'touch') return;
          artX((e.clientX / window.innerWidth - 0.5) * 30);
          sculptureApi.current?.setPointer(e.clientX, e.clientY);
        });
        listen(root, 'pointerleave', () => {
          artX(0);
          sculptureApi.current?.setPointer(null);
        });
      }

      // Swipe between slides on touch screens (mostly-horizontal swipes only).
      let touch = null;
      listen(
        root,
        'touchstart',
        (e) => {
          touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        },
        { passive: true },
      );
      listen(
        root,
        'touchend',
        (e) => {
          if (!touch) return;
          const dx = e.changedTouches[0].clientX - touch.x;
          const dy = e.changedTouches[0].clientY - touch.y;
          touch = null;
          if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5 || current < 0) return;
          const n = slides.length;
          go(dx < 0 ? (current + 1) % n : (current - 1 + n) % n);
        },
        { passive: true },
      );

      go(0);
    }, root);

    return () => {
      cleanups.forEach((fn) => fn());
      ctx.revert();
    };
  }, [slides]);

  // Arrow keys, Home and End move between tabs and show that slide.
  const onTabKey = (e) => {
    const n = slides.length;
    const steps = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let next;
    if (e.key in steps) next = (active + steps[e.key] + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else return;
    e.preventDefault();
    tabRefs.current[next]?.focus();
    controls.current.go(next);
  };

  return (
    <section className="hero" id="top" ref={rootRef} aria-roledescription="carousel" aria-label="What we do">
      <h1 className="sr-only">
        {brand.name}: {brand.tagline}
      </h1>
      <div className="hero__bg" aria-hidden="true" />
      <ErrorBoundary>
        <Suspense fallback={null}>
          <WaveCanvas className="hero__wave" />
        </Suspense>
      </ErrorBoundary>
      <div className="hero__progress" aria-hidden="true">
        <span className="hero__progress-fill" />
      </div>

      <div className="hero__art" aria-hidden="true">
        <div className="hero__sculpture">
          <div className="hero__glow" />
          {/* Shown until the WebGL particles take over, and kept without WebGL. */}
          <img
            className={`hero__poster${artReady ? ' is-hidden' : ''}`}
            src="/hero-poster.webp"
            alt=""
            width="480"
            height="480"
            fetchPriority="high"
            decoding="async"
          />
          <ErrorBoundary>
            <Suspense fallback={null}>
              <ParticleSculpture
                apiRef={sculptureApi}
                activeRef={activeRef}
                slides={slides}
                onReady={() => setArtReady(true)}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>

      <div className="hero__content container">
        <div className="hero__slides">
          {slides.map((slide, i) => (
            <div
              key={itemKey(slide, i)}
              id={`hero-slide-${i}`}
              className="hero__slide"
              role="tabpanel"
              aria-roledescription="slide"
              aria-labelledby={`hero-tab-${i}`}
              aria-hidden={i !== active}
            >
              <h2 className="hero__title">
                {slide.headline.map((line, j) => (
                  <span key={j} className="hero__line">
                    {line}{' '}
                  </span>
                ))}
              </h2>
              <a className="btn btn--primary hero__cta" href="#contact" tabIndex={i === active ? 0 : -1}>
                Get in touch
              </a>
            </div>
          ))}
        </div>
      </div>

      <div className="hero__tabbar">
        <button
          type="button"
          className="hero__play"
          aria-label={playing ? 'Pause the slideshow' : 'Play the slideshow'}
          onClick={() => controls.current.setPlaying(!playing)}
        >
          {playing ? (
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect x="3.5" y="2.5" width="3" height="11" rx="1" />
              <rect x="9.5" y="2.5" width="3" height="11" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M5 2.8v10.4c0 .6.7 1 1.2.7l8-5.2c.5-.3.5-1.1 0-1.4l-8-5.2c-.5-.3-1.2.1-1.2.7z" />
            </svg>
          )}
        </button>
        <div
          className="hero__tabs"
          role="tablist"
          aria-label="Choose a highlight"
          style={{ gridTemplateColumns: `repeat(${slides.length}, 1fr)` }}
          onKeyDown={onTabKey}
        >
          {slides.map((slide, i) => (
            <button
              key={itemKey(slide, i)}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`hero-tab-${i}`}
              aria-selected={i === active}
              aria-controls={`hero-slide-${i}`}
              tabIndex={i === active ? 0 : -1}
              className={`hero-tab${i === active ? ' is-active' : ''}`}
              onClick={() => controls.current.go(i)}
            >
              <span className="hero-tab__bar">
                <span className="hero-tab__fill" />
              </span>
              <span className="hero-tab__title">{slide.tabTitle}</span>
              <span className="hero-tab__text">{slide.tabText}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
