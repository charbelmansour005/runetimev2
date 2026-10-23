import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

// The picture behind a stat, drawn from its own value (never from made-up
// data): a ring that closes to a percentage, a field of dots for a large
// count, a row of figures for a small one. `update(k)` (0–1) shows how far
// the count has got; Numbers.jsx calls it as the page scrolls.

const RING_DOTS = 14;

function Ring({ value }, ref) {
  const rootRef = useRef(null);
  useImperativeHandle(ref, () => ({
    update(k) {
      const el = rootRef.current;
      el.style.setProperty('--k', k.toFixed(4));
      el.classList.toggle('is-full', k > 0.999);
    },
  }));
  const share = Math.min(value, 100) / 100;
  return (
    <div className="stat-ring" ref={rootRef} style={{ '--v': share }}>
      <svg viewBox="0 0 400 400">
        <defs>
          <linearGradient id="stat-ring-stroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#c6b6ff" />
            <stop offset="0.5" stopColor="#8b5cff" />
            <stop offset="1" stopColor="#4d00f2" />
          </linearGradient>
        </defs>
        <circle className="stat-ring__track" cx="200" cy="200" r="170" pathLength="100" />
        <circle className="stat-ring__arc" cx="200" cy="200" r="170" pathLength="100" />
        <g className="stat-ring__dots">
          {Array.from({ length: RING_DOTS }, (_, i) => {
            const f = i / RING_DOTS;
            const a = f * Math.PI * 2 - Math.PI / 2;
            // (Rounded, so the server's and the browser's sums agree.)
            const at = (v) => Math.round(v * 100) / 100;
            return <circle key={i} cx={at(200 + Math.cos(a) * 170)} cy={at(200 + Math.sin(a) * 170)} r="6" style={{ '--f': at(f * share) }} />;
          })}
        </g>
      </svg>
    </div>
  );
}

const COLS = 40;
const ROWS = 25;

function Dots(props, ref) {
  const canvasRef = useRef(null);
  const state = useRef({ lit: -1, order: null });
  // Dots light in a scattered order, the same every time.
  if (!state.current.order) {
    let a = 11;
    const rand = () => {
      a = (a * 16807) % 2147483647;
      return a / 2147483647;
    };
    const order = Array.from({ length: COLS * ROWS }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    state.current.order = order;
  }
  const draw = (lit) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const gx = w / COLS;
    const gy = h / ROWS;
    const r = Math.min(gx, gy) * 0.28;
    const on = new Uint8Array(COLS * ROWS);
    const { order } = state.current;
    for (let i = 0; i < lit; i += 1) on[order[i]] = 1;
    for (let i = 0; i < COLS * ROWS; i += 1) {
      const x = (i % COLS) * gx + gx / 2;
      const y = Math.floor(i / COLS) * gy + gy / 2;
      ctx.beginPath();
      ctx.arc(x, y, on[i] ? r * 1.1 : r * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = on[i] ? (i % 7 === 0 ? 'rgba(94, 230, 210, 0.85)' : 'rgba(168, 139, 255, 0.8)') : 'rgba(255, 255, 255, 0.08)';
      ctx.fill();
    }
  };
  useImperativeHandle(ref, () => ({
    update(k) {
      const lit = Math.round(k * COLS * ROWS);
      if (lit === state.current.lit) return;
      state.current.lit = lit;
      draw(lit);
    },
  }));
  useEffect(() => {
    const redraw = () => draw(Math.max(state.current.lit, 0));
    redraw();
    window.addEventListener('resize', redraw);
    return () => window.removeEventListener('resize', redraw);
  }, []);
  return <canvas className="stat-dots" ref={canvasRef} />;
}

function Figures({ count }, ref) {
  const rootRef = useRef(null);
  useImperativeHandle(ref, () => ({
    update(k) {
      rootRef.current.style.setProperty('--k', k.toFixed(4));
    },
  }));
  return (
    <div className="stat-figures" ref={rootRef} style={{ '--n': count }}>
      {Array.from({ length: count }, (_, i) => (
        <svg key={i} viewBox="0 0 24 40" style={{ '--f': i / count }}>
          <circle cx="12" cy="7" r="6" />
          <path d="M2 40v-16a10 10 0 0 1 20 0v16z" />
        </svg>
      ))}
    </div>
  );
}

const RingVisual = forwardRef(Ring);
const DotsVisual = forwardRef(Dots);
const FiguresVisual = forwardRef(Figures);

// Which picture suits a stat, from the form of its value.
export function statKind(parsed) {
  if (!parsed) return null;
  if (parsed.suffix.includes('%')) return 'ring';
  if (/^[KMB]/i.test(parsed.suffix)) return 'dots';
  if (parsed.number >= 1 && parsed.number <= 12) return 'figures';
  return null;
}

// What one dot stands for in the field: "1 dot = 100 users".
export function dotWorth(parsed) {
  const scale = { K: 1e3, M: 1e6, B: 1e9 }[parsed.suffix[0].toUpperCase()] ?? 1;
  return (parsed.number * scale) / (COLS * ROWS);
}

export const StatVisual = forwardRef(function StatVisual({ parsed }, ref) {
  const kind = statKind(parsed);
  if (kind === 'ring') return <RingVisual ref={ref} value={parsed.number} />;
  if (kind === 'dots') return <DotsVisual ref={ref} />;
  if (kind === 'figures') return <FiguresVisual ref={ref} count={parsed.number} />;
  return null;
});
