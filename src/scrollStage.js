// One scroll listener for the page's pinned, scroll-driven pieces (the hero's
// story, the services ring, the stacked work cards). Each registers a
// callback; all of them run together, at most once a frame.

export const clamp = (v, min = 0, max = 1) => Math.min(Math.max(v, min), max);
export const smooth = (v) => {
  const k = clamp(v);
  return k * k * (3 - 2 * k);
};
// 0 before a, rising to 1 at b, 1 until c, falling to 0 at d.
export const bell = (p, a, b, c, d) => smooth((p - a) / Math.max(b - a, 1e-6)) * (1 - smooth((p - c) / Math.max(d - c, 1e-6)));

// How far a tall section has scrolled through its pin: 0 as its top reaches
// the top of the screen, 1 as its bottom reaches the bottom.
export function pinProgress(el) {
  const rect = el.getBoundingClientRect();
  const span = rect.height - window.innerHeight;
  return span > 0 ? clamp(-rect.top / span) : 0;
}

const callbacks = new Set();
let queued = false;
const run = () => {
  queued = false;
  for (const fn of callbacks) fn();
};
const queue = () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(run);
};

// Calls `fn` on every scroll and resize frame, and once straight away;
// returns the function that stops it.
export function onScrollFrame(fn) {
  if (!callbacks.size) {
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
  }
  callbacks.add(fn);
  fn();
  return () => {
    callbacks.delete(fn);
    if (!callbacks.size) {
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
    }
  };
}

// Scrolls so that a pinned section is `p` of the way through its pin.
export function scrollToProgress(el, p, reduced = false) {
  const top = el.getBoundingClientRect().top + window.scrollY;
  const span = el.offsetHeight - window.innerHeight;
  window.scrollTo({ top: top + span * clamp(p) + 1, behavior: reduced ? 'auto' : 'smooth' });
}
