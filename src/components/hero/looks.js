// No three.js here: the hero's page code reads these before the 3D code arrives.

// What each slide's particles look like when the CMS hasn't said: the shape,
// the colours (top and bottom) and the light behind them.
export const LOOKS = [
  { shape: 'neural', from: '#F08BF5', to: '#F7A8B8', glow: '#E36BFF' },
  { shape: 'screens', from: '#C7B8FA', to: '#7C6CF0', glow: '#8B6BFF' },
  { shape: 'globe', from: '#A8C8F5', to: '#7EE0F0', glow: '#5AB8FF' },
  { shape: 'infinity', from: '#7DD3FC', to: '#2DD4BF', glow: '#2EE6C8' },
];
export const lookOf = (slide, index) => ({ ...LOOKS[index % LOOKS.length], ...Object.fromEntries(Object.entries(slide ?? {}).filter(([k, v]) => ['shape', 'from', 'to', 'glow'].includes(k) && v)) });
