import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import ClutchBadge from '../ClutchBadge';
import ErrorBoundary from '../ErrorBoundary';
import PageLink from '../PageLink';
import { useContent } from '../../content/ContentProvider';
import { itemKey } from '../../content/format';
import { lookOf } from './looks';
import { POSTER_SIZES, POSTER_SRCSET } from './poster';
import './Hero.css';

// three.js is heavy, so the WebGL layer starts loading only once the page has
// loaded and settled (see startWebGL).
const ParticleScene = lazy(() => import('./ParticleScene'));

const SLIDE_SECONDS = 8;
// The same curves as the CSS tokens --ease-in-out-2 and --ease-out-3.
const EASE = 'cubic-bezier(0.45, 0, 0.55, 1)';
const EASE_OUT = 'cubic-bezier(0.33, 1, 0.68, 1)';

// Resolves when the animation has finished or been cancelled (`finished`
// rejects on cancel, which here is never an error).
const settled = (animations) => Promise.all(animations.map((a) => a.finished.catch(() => {})));

// When to start the 3D scene: the headline, the poster and the rest of the
// page come first. Phones wait for the visitor's first touch or scroll (or a
// few seconds), so a short visit never downloads it; desktops wait until the
// browser is idle after the load event.
function startWebGL(poster, onStart) {
  let stopped = false;
  const cleanups = [];
  const start = () => {
    if (stopped) return;
    stopped = true;
    cleanups.forEach((fn) => fn());
    onStart();
  };
  const loaded = new Promise((resolve) => {
    if (document.readyState === 'complete') resolve();
    else window.addEventListener('load', resolve, { once: true });
  });
  Promise.all([poster.decode().catch(() => {}), loaded]).then(() => {
    if (stopped) return;
    const phone = window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 900;
    if (phone) {
      const timer = setTimeout(start, 4000);
      cleanups.push(() => clearTimeout(timer));
      // (Not 'scroll': the browser scrolls on its own at load, to a #section
      // or back to where the visitor was. A finger always starts with a touch.)
      for (const type of ['pointerdown', 'touchstart', 'wheel', 'keydown']) {
        window.addEventListener(type, start, { once: true, passive: true });
        cleanups.push(() => window.removeEventListener(type, start));
      }
    } else {
      const whenIdle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 1000));
      const cancelIdle = window.cancelIdleCallback ?? clearTimeout;
      const idle = whenIdle(start, { timeout: 2000 });
      cleanups.push(() => cancelIdle(idle));
    }
  });
  return () => {
    stopped = true;
    cleanups.forEach((fn) => fn());
  };
}

export default function Hero() {
  const { hero, brand } = useContent();
  const { slides } = hero;
  const rootRef = useRef(null);
  const tabRefs = useRef([]);
  const sceneApi = useRef(null);
  const controls = useRef({ go: () => {}, setPlaying: () => {} });
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [artReady, setArtReady] = useState(false);
  const [webgl, setWebgl] = useState(false);
  const posterRef = useRef(null);
  // The slide on show, for a scene that's just loaded.
  const slideRef = useRef(0);
  const slideAt = useCallback(() => slideRef.current, []);
  const onSceneReady = useCallback(() => setArtReady(true), []);
  const looks = slides.map((slide, i) => lookOf(slide, i));

  useEffect(() => {
    if (navigator.connection?.saveData) return undefined; // The poster stays.
    return startWebGL(posterRef.current, () => setWebgl(true));
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cleanups = [];
    const q = (selector) => [...root.querySelectorAll(selector)];
    const slideEls = q('.hero__slide');
    const [slidesEl] = q('.hero__slides');
    const [progress] = q('.hero__progress-fill');
    const fills = q('.hero-tab__fill');
    const n = slides.length;
    let alive = true;
    let current = 0;

    let busy = false;
    let queued = null;
    let progressAnims = [];
    let glowToken = 0;

    // Rotation stops while the visitor reads (hovering the copy or the tabs,
    // or keyboard focus inside the hero) and whenever they press pause. The
    // pause button freezes the sparkles' drifting too. It starts paused when
    // they've asked for reduced motion.
    const hold = { user: reduced, hover: false, focus: false };
    const sync = () => {
      const held = hold.user || hold.hover || hold.focus;
      for (const a of progressAnims) {
        if (held) a.pause();
        else if (a.playState === 'paused') a.play();
      }
      slidesEl.setAttribute('aria-live', held ? 'polite' : 'off');
      sceneApi.current?.setPlaying(!hold.user);
    };
    setPlaying(!hold.user);

    // The light behind the particles takes the colour of the shape they are
    // forming, fading from the last one's.
    const light = (from, to) => {
      glowToken += 1;
      const token = glowToken;
      root.style.setProperty('--glow-a', looks[from].glow);
      root.style.setProperty('--glow-b', looks[to].glow);
      if (reduced || from === to) {
        root.style.setProperty('--glow-t', '1');
        return;
      }
      const start = performance.now();
      const step = (now) => {
        if (token !== glowToken || !alive) return;
        const k = Math.min(1, (now - start) / 1400);
        root.style.setProperty('--glow-t', (k * k * (3 - 2 * k)).toFixed(3));
        if (k < 1) requestAnimationFrame(step);
      };
      root.style.setProperty('--glow-t', '0');
      requestAnimationFrame(step);
    };
    light(0, 0);

    // The bars fill over the slide's time; when they're full, the next slide.
    const schedule = (i) => {
      progressAnims = [progress, fills[i]].map((el) =>
        el.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
          duration: SLIDE_SECONDS * 1000,
          easing: 'linear',
          fill: 'both',
        }),
      );
      const [bar] = progressAnims;
      bar.finished.then(() => alive && bar === progressAnims[0] && go((i + 1) % n)).catch(() => {});
      sync();
    };

    // Empties the bars quickly, from wherever they are, before a change.
    const rewind = () => {
      for (const a of progressAnims) {
        const el = a.effect.target;
        const from = getComputedStyle(el).transform;
        a.cancel();
        el.animate([{ transform: from }, { transform: 'scaleX(0)' }], { duration: 350, easing: EASE_OUT }).finished.catch(() => {});
      }
      progressAnims = [];
    };

    // Moves `is-active` (and with it focus order and what screen readers
    // read) to the next slide at once.
    const show = (next) => flushSync(() => setActive(next));

    // The headline fades out and the next one fades in (opacity only, so the
    // browser runs it on the compositor) while the sparkles reform.
    async function go(next) {
      if (n < 2 || next === current) return;
      if (busy) {
        queued = next; // Picked mid-transition: show it right after.
        return;
      }
      busy = true;
      rewind();
      const prev = current;
      sceneApi.current?.setSlide(next);
      slideRef.current = next;
      light(prev, next);
      const out = slideEls[prev].animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: EASE, fill: 'both' });
      await settled([out]);
      if (!alive) return;
      show(next);
      current = next; // What the tab bar shows is what picks and swipes count from.
      out.cancel(); // Hidden now; back to full for its next turn.
      await settled([slideEls[next].animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, easing: EASE })]);
      if (!alive) return;
      busy = false;
      const target = queued;
      queued = null;
      if (target !== null && target !== next) go(target);
      else schedule(next);
    }

    // The sparkles part around the pointer and the sculpture tilts towards it.
    const onMove = (e) => {
      if (e.pointerType === 'mouse') sceneApi.current?.setPointer(e.clientX, e.clientY);
    };
    const onLeave = () => sceneApi.current?.setPointer(null);
    root.addEventListener('pointermove', onMove, { passive: true });
    root.addEventListener('pointerleave', onLeave);
    cleanups.push(() => {
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
    });

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
      const enter = (e) => e.pointerType === 'mouse' && holdHover(true);
      const leave = (e) => e.pointerType === 'mouse' && holdHover(false);
      el.addEventListener('pointerenter', enter);
      el.addEventListener('pointerleave', leave);
      cleanups.push(() => {
        el.removeEventListener('pointerenter', enter);
        el.removeEventListener('pointerleave', leave);
      });
    });
    // Only keyboard focus holds the slide; a mouse click on a tab shouldn't.
    const focusIn = (e) => e.target.matches(':focus-visible') && holdFocus(true);
    const focusOut = (e) => !root.contains(e.relatedTarget) && holdFocus(false);
    root.addEventListener('focusin', focusIn);
    root.addEventListener('focusout', focusOut);
    cleanups.push(() => {
      root.removeEventListener('focusin', focusIn);
      root.removeEventListener('focusout', focusOut);
    });

    // Swipe between slides on touch screens (mostly-horizontal swipes only).
    let touch = null;
    const touchStart = (e) => {
      touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const touchEnd = (e) => {
      if (!touch) return;
      const dx = e.changedTouches[0].clientX - touch.x;
      const dy = e.changedTouches[0].clientY - touch.y;
      touch = null;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      go(dx < 0 ? (current + 1) % n : (current - 1 + n) % n);
    };
    root.addEventListener('touchstart', touchStart, { passive: true });
    root.addEventListener('touchend', touchEnd, { passive: true });
    cleanups.push(() => {
      root.removeEventListener('touchstart', touchStart);
      root.removeEventListener('touchend', touchEnd);
    });

    // The first slide is already on screen (it comes with the page); the
    // slideshow starts from it. One slide alone has nowhere to go.
    if (n > 1) schedule(0);

    return () => {
      alive = false;
      cleanups.forEach((fn) => fn());
      root.getAnimations?.({ subtree: true }).forEach((a) => a.cancel());
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
    <section
      className="hero"
      id="top"
      ref={rootRef}
      aria-roledescription="carousel"
      aria-label="What we do"
    >
      <div className="hero__stage">
      <h1 className="sr-only">
        {brand.name}: {brand.tagline}
      </h1>
      <div className="hero__bg" aria-hidden="true" />
      <div className="hero__texture" aria-hidden="true" />
      <div className="hero__progress" aria-hidden="true">
        <span className="hero__progress-fill" />
      </div>

      <div className="hero__content container">
        <div className="hero__slides">
          {slides.map((slide, i) => (
            <div
              key={itemKey(slide, i)}
              id={`hero-slide-${i}`}
              className={`hero__slide${i === active ? ' is-active' : ''}`}
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
            </div>
          ))}
        </div>
        {/* The same on every title: where to go next, and what clients say. */}
        <div className="hero__actions">
          <PageLink className="btn btn--primary hero__cta" href="/contact">
            <span className="hero__cta-dot" aria-hidden="true" />
            Start a project
          </PageLink>
          <a className="btn hero__secondary" href="/#work">
            See our work
          </a>
          <div className="hero__rating">
            <ClutchBadge whenIdle />
          </div>
        </div>
      </div>

      <div className="hero__tabbar">
        <button
          type="button"
          className="hero__play"
          aria-label={playing ? 'Pause the animation' : 'Play the animation'}
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
          {/* The sparkles' still: shown until they're drawn, and kept without
              WebGL or with Data Saver on. */}
          <img
            ref={posterRef}
            className={`hero__poster${artReady ? ' is-hidden' : ''}`}
            src="/hero-poster.webp"
            srcSet={POSTER_SRCSET}
            sizes={POSTER_SIZES}
            alt=""
            width="800"
            height="596"
            fetchPriority="high"
          />
          {webgl && (
            <ErrorBoundary>
              <Suspense fallback={null}>
                <ParticleScene apiRef={sceneApi} slides={slides} onReady={onSceneReady} slideAt={slideAt} />
              </Suspense>
            </ErrorBoundary>
          )}
        </div>
      </div>
      </div>
    </section>
  );
}
