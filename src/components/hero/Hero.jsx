import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import ErrorBoundary from '../ErrorBoundary';
import { useContent } from '../../content/ContentProvider';
import { itemKey } from '../../content/format';
import { POSTER_SIZES, POSTER_SRCSET } from './poster';
import './Hero.css';

// three.js is heavy, so the WebGL layers start loading only once the poster
// (the page's largest paint) is on screen and the browser is idle.
const HeroScene = lazy(() => import('./HeroScene'));

const SLIDE_SECONDS = 8;

export default function Hero() {
  const { hero, brand } = useContent();
  const { slides } = hero;
  const rootRef = useRef(null);
  const tabRefs = useRef([]);
  const sceneApi = useRef(null);
  const playingRef = useRef(true);
  const controls = useRef({ go: () => {}, setPlaying: () => {} });
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [artReady, setArtReady] = useState(false);
  const [webgl, setWebgl] = useState(false);
  const posterRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let idle = 0;
    const whenIdle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 200));
    const cancelIdle = window.cancelIdleCallback ?? clearTimeout;
    // decode() settles once the poster can paint (or has failed to load); two
    // frames later it's on screen.
    posterRef.current
      .decode()
      .catch(() => {})
      .then(() => {
        if (cancelled) return;
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(() => {
            idle = whenIdle(() => setWebgl(true), { timeout: 1000 });
          });
        });
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      cancelIdle(idle);
    };
  }, []);

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
        // Pausing stops the 3D campus as well; hovering only holds the slide.
        playingRef.current = !hold.user;
        sceneApi.current?.setPlaying(!hold.user);
      };
      setPlaying(!hold.user);

      gsap.set(slideEls, { autoAlpha: 0 });

      const schedule = (i) => {
        gsap.set([progress, ...fills], { scaleX: 0 });
        progressTween = gsap.to([progress, fills[i]], { scaleX: 1, duration: SLIDE_SECONDS, ease: 'none' });
        autoplay = gsap.delayedCall(SLIDE_SECONDS, () => go((i + 1) % slides.length));
        sync();
      };

      // The headline leaves left and the next one sweeps in from the right.
      // The 3D campus beside it stays as it is.
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
        // Scroll parallax: the campus lags behind as the hero leaves.
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
      }

      // Swipe between slides on touch screens (mostly-horizontal swipes only).
      // Swipes on the 3D campus turn it instead.
      let touch = null;
      listen(
        root,
        'touchstart',
        (e) => {
          touch = e.target.closest('.hero-scene') ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY };
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
      <div className="hero__progress" aria-hidden="true">
        <span className="hero__progress-fill" />
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
      {/* Last in the markup, so keyboard users reach it after the slides; it
          still sits under them on screen. */}
      <div className="hero__art">
        <div className="hero__sculpture">
          <div className="hero__glow" aria-hidden="true" />
          {/* Shown until the 3D campus takes over, and kept without WebGL. */}
          <img
            ref={posterRef}
            className={`hero__poster${artReady ? ' is-hidden' : ''}`}
            src="/hero-poster.webp"
            srcSet={POSTER_SRCSET}
            sizes={POSTER_SIZES}
            alt=""
            width="960"
            height="803"
            fetchPriority="high"
            decoding="async"
          />
          {webgl && (
            <ErrorBoundary>
              <Suspense fallback={null}>
                <HeroScene apiRef={sceneApi} playingRef={playingRef} onReady={() => setArtReady(true)} />
              </Suspense>
            </ErrorBoundary>
          )}
        </div>
      </div>
    </section>
  );
}
