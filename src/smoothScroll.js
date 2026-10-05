// Wheel scrolling that glides and has a top speed. Each turn of the wheel
// moves a target and the page eases towards it. Everything else stays the
// browser's own: touch, the keyboard, the scrollbar, links to a section, and
// all of it for people who ask for reduced motion.

const MAX_SPEED = 2600; // pixels per second
const EASE = 7; // per second: how quickly the page closes the gap to the target
const MAX_LEAD = 520; // how far the target may run ahead of the page, in pixels
const LINE = 33; // pixels per line, for wheels that report lines

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// True if something between the cursor and the page scrolls on its own in
// that direction (a text box, a menu, a code block): leave the wheel to it.
function scrollsInside(target, direction) {
  for (let el = target; el instanceof Element && el !== document.body && el !== document.documentElement; el = el.parentElement) {
    if (el.scrollHeight <= el.clientHeight + 1) continue;
    const { overflowY } = getComputedStyle(el);
    if (overflowY !== 'auto' && overflowY !== 'scroll') continue;
    if (direction < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
  }
  return false;
}

export function installSmoothScroll() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let position = 0; // where the page is, with fractions
  let target = 0;
  let frame = 0;
  let before = 0;

  const limit = () => document.documentElement.scrollHeight - window.innerHeight;
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  function tick(now) {
    // The first frame has nothing to measure from: count it as one at 60 fps.
    const dt = before ? clamp((now - before) / 1000, 0, 0.05) : 1 / 60;
    before = now;
    // The page moved under us (content above changed height): carry on from there.
    const drift = window.scrollY - position;
    if (Math.abs(drift) > 2) {
      position += drift;
      target += drift;
    }
    target = clamp(target, 0, limit());
    const gap = target - position;
    if (Math.abs(gap) < 0.5) {
      window.scrollTo({ top: target, behavior: 'instant' });
      return stop();
    }
    const step = clamp(gap * (1 - Math.exp(-dt * EASE)), -MAX_SPEED * dt, MAX_SPEED * dt);
    position += step;
    window.scrollTo({ top: position, behavior: 'instant' });
    frame = requestAnimationFrame(tick);
  }

  function onWheel(e) {
    // Zooming, sideways scrolling, or already handled (the hero's 3D garden).
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (reduced.matches || Math.abs(e.deltaX) > Math.abs(e.deltaY) || !e.deltaY) return;
    // The page is locked (the mobile menu is open).
    if (document.body.style.overflow === 'hidden') return;
    if (scrollsInside(e.target, e.deltaY)) return;

    const max = limit();
    if (max <= 0) return;
    e.preventDefault();
    if (!frame) position = target = window.scrollY;
    const pixels = e.deltaY * (e.deltaMode === 1 ? LINE : e.deltaMode === 2 ? window.innerHeight : 1);
    target = clamp(clamp(target + pixels, position - MAX_LEAD, position + MAX_LEAD), 0, max);
    if (!frame) {
      before = 0;
      frame = requestAnimationFrame(tick);
    }
  }

  // Scrolling any other way (keyboard, scrollbar, a link, touch) takes over.
  const handOver = ['keydown', 'pointerdown', 'touchstart'];
  window.addEventListener('wheel', onWheel, { passive: false });
  handOver.forEach((type) => window.addEventListener(type, stop, { passive: true }));
  return () => {
    stop();
    window.removeEventListener('wheel', onWheel);
    handOver.forEach((type) => window.removeEventListener(type, stop));
  };
}
