import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import ErrorBoundary from '../ErrorBoundary';
import { useContent } from '../../content/ContentProvider';
import { itemKey } from '../../content/format';
import { clamp, onScrollFrame, pinProgress, scrollToProgress, smooth } from '../../scrollStage';
import { BARE_POSTER_SRCSET, POSTER_SIZES, POSTER_SRCSET } from './poster';
import './Hero.css';

// three.js is heavy, so the WebGL layer starts loading only once the page has
// loaded and settled (see startWebGL).
const HeroScene = lazy(() => import('./HeroScene'));

// The same curves as the CSS tokens --ease-in-out-2 and --ease-out-3.
const EASE = 'cubic-bezier(0.45, 0, 0.55, 1)';

// Resolves when the animation has finished or been cancelled (`finished`
// rejects on cancel, which here is never an error).
const settled = (animations) => Promise.all(animations.map((a) => a.finished.catch(() => {})));

// The hero's scroll story: each title holds the stage for a while, and
// between titles the garden is built a little further (garden.js decides
// what arrives when). Returns how much each title shows, and how far the
// garden is built (0–1).
const HOLD = 1;
const GAP = 1.5;
function storyAt(p, n) {
  const total = n * HOLD + (n - 1) * GAP;
  const u = clamp(p / 0.96) * total;
  const titles = Array.from({ length: n }, (_, i) => {
    const start = i * (HOLD + GAP);
    const into = i === 0 ? 1 : smooth((u - start) / (HOLD * 0.3));
    const out = i === n - 1 ? 0 : smooth((u - (start + HOLD * 0.7)) / (HOLD * 0.3));
    return { o: into * (1 - out), into, out, fill: clamp((u - start) / (HOLD + GAP)) };
  });
  let built = 0;
  for (let i = 0; i < n - 1; i += 1) {
    const from = i * (HOLD + GAP) + HOLD;
    built += clamp((u - from) / GAP) / (n - 1);
  }
  return { titles, built };
}

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
  const playingRef = useRef(true);
  const controls = useRef({ go: () => {}, setPlaying: () => {} });
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [artReady, setArtReady] = useState(false);
  const [webgl, setWebgl] = useState(false);
  // The whole garden's poster instead of the bare plate: one slide (no
  // story), Data Saver, or no WebGL to build it with.
  const [whole, setWhole] = useState(slides.length < 2);
  const onSceneFail = useCallback(() => setWhole(true), []);
  const posterRef = useRef(null);
  // Re-runs the story's update, so a scene that has just appeared is pointed
  // where the scroll says.
  const aimRef = useRef(null);
  // How far the story has built the garden, for a scene that's just loaded.
  const buildRef = useRef(null);
  // (`?poster=bare` shows the bare plate even with reduced motion: that's
  // how scripts/render-poster.mjs draws the story's poster.)
  const buildAt = useCallback(() => {
    if (new URLSearchParams(window.location.search).get('poster') === 'bare') return 0;
    return buildRef.current?.() ?? 1;
  }, []);
  const onSceneReady = useCallback(() => {
    setArtReady(true);
    aimRef.current?.();
  }, []);
  // Holding the garden opens the playground, where its parts can be switched off.
  const router = useRouter();
  const openPlayground = useCallback(() => router.push('/playground'), [router]);
  const warmPlayground = useCallback(() => router.prefetch('/playground'), [router]);

  useEffect(() => {
    if (navigator.connection?.saveData) {
      setWhole(true);
      return undefined; // The poster stays.
    }
    return startWebGL(posterRef.current, () => setWebgl(true));
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cleanups = [];
    const q = (selector) => [...root.querySelectorAll(selector)];
    const slideEls = q('.hero__slide');
    const [progress] = q('.hero__progress-fill');
    const fills = q('.hero-tab__fill');
    const n = slides.length;
    let alive = true;
    let current = 0;

    // The pause button stops the garden's own animation (the slides follow
    // the scroll, so they have nothing to pause). Reduced motion starts it paused.
    const sync = (play) => {
      playingRef.current = play;
      sceneApi.current?.setPlaying(play);
    };
    setPlaying(!reduced);
    sync(!reduced);

    // Moves `is-active` (and with it focus order and what screen readers
    // read) to another slide at once.
    const show = (next) => {
      if (next === current) return;
      current = next;
      flushSync(() => setActive(next));
    };

    // The story: the hero is pinned for a few screens, and scrolling through
    // it moves from one headline to the next while the camera flies round the
    // garden. Without it (reduced motion, or one slide), the tabs cross-fade.
    const story = !reduced && n > 1;
    let go;
    if (story) {
      const update = () => {
        const p = pinProgress(root);
        const { titles, built } = storyAt(p, n);
        slideEls.forEach((el, i) => {
          const { o, into, out } = titles[i];
          el.style.opacity = o;
          el.style.visibility = o > 0.002 ? 'visible' : 'hidden';
          el.style.transform = `translate3d(0, ${(1 - into) * 40 - out * 40}px, 0) scale(${0.97 + 0.03 * o})`;
        });
        // The tabs (and screen readers) follow the title the story is on.
        let on = 0;
        titles.forEach((t, i) => {
          if (t.fill > 0) on = i;
        });
        show(on);
        progress.style.transform = `scaleX(${p})`;
        fills.forEach((el, i) => {
          el.style.transform = `scaleX(${titles[i].fill})`;
        });
        sceneApi.current?.build?.(built);
      };
      cleanups.push(onScrollFrame(update));
      // The scene may arrive later: point it straight away when it does.
      aimRef.current = update;
      // A tab scrolls to where its title is fully in view.
      go = (next) => {
        const total = n * HOLD + (n - 1) * GAP;
        scrollToProgress(root, ((next * (HOLD + GAP) + HOLD * 0.45) / total) * 0.96);
      };
      buildRef.current = () => storyAt(pinProgress(root), n).built;
    } else {
      // Cross-fade, opacity only.
      let busy = false;
      go = async (next) => {
        if (n < 2 || next === current || busy) return;
        busy = true;
        const prev = current;
        const out = slideEls[prev].animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: EASE, fill: 'both' });
        await settled([out]);
        if (!alive) return;
        show(next);
        out.cancel();
        await settled([slideEls[next].animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: EASE })]);
        busy = false;
      };
    }

    controls.current = {
      go,
      setPlaying: (play) => {
        setPlaying(play);
        sync(play);
      },
    };

    return () => {
      alive = false;
      aimRef.current = null;
      buildRef.current = null;
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
      aria-label="What we do"
      style={{ '--chapters': slides.length }}
      data-story={slides.length > 1 ? '' : undefined}
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
              <a className="btn btn--primary hero__cta" href="#contact" tabIndex={i === active ? 0 : -1}>
                <span className="hero__cta-dot" aria-hidden="true" />
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
          {/* Shown until the 3D garden takes over, and kept without WebGL. The
              scroll story starts from the bare plate; with reduced motion, or
              when the garden can't be drawn, it's the whole garden. */}
          <picture>
            {!whole && <source media="(prefers-reduced-motion: reduce)" srcSet={POSTER_SRCSET} sizes={POSTER_SIZES} />}
            <img
              ref={posterRef}
              className={`hero__poster${artReady ? ' is-hidden' : ''}`}
              src={whole ? '/hero-poster.webp' : '/hero-poster-bare.webp'}
              srcSet={whole ? POSTER_SRCSET : BARE_POSTER_SRCSET}
              sizes={POSTER_SIZES}
              alt=""
              width="960"
              height="805"
              fetchPriority="high"
            />
          </picture>
          {webgl && (
            <ErrorBoundary>
              <Suspense fallback={null}>
                <HeroScene
                  apiRef={sceneApi}
                  playingRef={playingRef}
                  onReady={onSceneReady}
                  onHold={openPlayground}
                  split
                  buildAt={buildAt}
                  onFail={onSceneFail}
                  onHoldStart={warmPlayground}
                />
              </Suspense>
            </ErrorBoundary>
          )}
        </div>
      </div>
      </div>
    </section>
  );
}
