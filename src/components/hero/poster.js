// The still of the hero's particles, shown until WebGL draws them (and kept
// without WebGL, with Data Saver on, or for reduced motion). Rendered from the
// scene itself by scripts/render-poster.mjs. Three sizes, so a phone fetches
// a small file: the sizes hint says how wide the poster really is on screen
// (about three quarters of a phone's width, and about half of a desktop's).
export const POSTER_SRCSET = '/hero-poster-360.webp 360w, /hero-poster-560.webp 560w, /hero-poster.webp 800w';
export const POSTER_SIZES = '(max-width: 900px) 74vw, 55vw';
