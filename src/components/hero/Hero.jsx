import { lazy, Suspense, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useContent } from '../../content/ContentProvider';
import { itemKey } from '../../content/format';
import './Hero.css';

// three.js is heavy, so the WebGL layers load after the copy has painted.
const CrystalShard = lazy(() => import('./CrystalShard'));
const WaveCanvas = lazy(() => import('./WaveCanvas'));

gsap.registerPlugin(ScrollTrigger);

const SLIDE_SECONDS = 8;

export default function Hero() {
  const { slides } = useContent().hero;
  const rootRef = useRef(null);
  const stoneApi = useRef(null);
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
      const [stone] = q('.hero__stone');
      const [shard] = q('.hero__shard');
      const [shardShape] = q('.hero__shard-shape');
      const [progress] = q('.hero__progress-fill');
      const fills = q('.hero-tab__fill');

      let current = -1;
      let busy = false;
      let autoplay;
      let progressTween;

      gsap.set(slideEls, { autoAlpha: 0 });
      gsap.set(stone, { xPercent: -160 });
      gsap.set(shard, { scale: 0 });

      const paint = (i) => {
        const s = slides[i];
        shardShape.style.setProperty('--shard-a', s.shardFrom);
        shardShape.style.setProperty('--shard-b', s.shardTo);
        activeRef.current = i;
        stoneApi.current?.setSlide(i);
        setActive(i);
      };

      const schedule = (i) => {
        gsap.set([progress, ...fills], { scaleX: 0 });
        progressTween = gsap.to([progress, fills[i]], { scaleX: 1, duration: SLIDE_SECONDS, ease: 'none' });
        autoplay = gsap.delayedCall(SLIDE_SECONDS, () => go((i + 1) % slides.length));
      };

      // Text leaves left while the art leaves right, then the next slide
      // crosses back the other way — the reference's "scissor" transition.
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

        if (reduced) {
          if (prev >= 0) tl.to(slideEls[prev], { autoAlpha: 0, duration: 0.3 });
          tl.add(() => paint(next))
            .set(stone, { xPercent: 0 })
            .set(shard, { scale: 1 })
            .to(slideEls[next], { autoAlpha: 1, duration: 0.4 });
          return;
        }

        if (prev >= 0) {
          tl.to(titles[prev], { x: -vw, duration: 0.8 }, 0)
            .to(ctas[prev], { x: -vw, duration: 0.6 }, 0)
            .to(stone, { xPercent: 115, duration: 0.8 }, 0)
            .to(shard, { x: -vw * 0.45, scale: 0, duration: 0.8 }, 0)
            .set(slideEls[prev], { autoAlpha: 0 });
        }

        tl.add(() => paint(next))
          .set(slideEls[next], { autoAlpha: 1 })
          .fromTo(titles[next], { x: vw * 0.55, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.95 })
          .fromTo(ctas[next], { x: vw * 0.55, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.95 }, '<0.08')
          .fromTo(stone, { xPercent: -160 }, { xPercent: 0, duration: 1 }, '<-0.08')
          .fromTo(shard, { x: vw * 0.35, scale: 0, rotation: 90 }, { x: 0, scale: 1, rotation: 0, duration: 1 }, '<');
      }
      goRef.current = go;

      if (!reduced) {
        // Idle drift of the stone, slow rocking of the shard.
        gsap.fromTo(q('.hero__stone-float'), { x: -10 }, { x: 10, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1 });
        gsap.fromTo(q('.hero__shard-rock'), { rotation: 0 }, { rotation: -10, duration: 4.5, ease: 'none', yoyo: true, repeat: -1 });

        // Scroll parallax: stone and shard drift apart as the hero leaves.
        const scrub = { trigger: root, start: 'top top', end: 'bottom top', scrub: true };
        gsap.to(q('.hero__stone-parallax'), { yPercent: 14, ease: 'none', scrollTrigger: scrub });
        gsap.to(q('.hero__shard-parallax'), { yPercent: -12, ease: 'none', scrollTrigger: { ...scrub } });

        // Mouse parallax: stone follows the cursor, shard moves against it.
        const stoneX = gsap.quickTo(q('.hero__stone-parallax'), 'x', { duration: 0.9, ease: 'power3.out' });
        const shardX = gsap.quickTo(q('.hero__shard-parallax'), 'x', { duration: 0.9, ease: 'power3.out' });
        const onMove = (e) => {
          if (e.pointerType === 'touch') return;
          const nx = e.clientX / window.innerWidth - 0.5;
          const ny = e.clientY / window.innerHeight - 0.5;
          stoneX(nx * 36);
          shardX(-nx * 36);
          stoneApi.current?.setPointer(nx, ny);
        };
        const onLeave = () => {
          stoneX(0);
          shardX(0);
          stoneApi.current?.setPointer(0, 0);
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
        <div className="hero__shard-parallax">
          <div className="hero__shard">
            <div className="hero__shard-rock">
              <span className="hero__shard-shape" />
            </div>
          </div>
        </div>
        <div className="hero__stone">
          <div className="hero__stone-parallax">
            <div className="hero__stone-float">
              <Suspense fallback={null}>
                <CrystalShard apiRef={stoneApi} activeRef={activeRef} slides={slides} />
              </Suspense>
            </div>
          </div>
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
