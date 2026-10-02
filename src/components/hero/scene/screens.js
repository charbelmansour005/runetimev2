import * as THREE from 'three';

// The pictures on the campus screens, drawn once on a canvas: an app feed for
// the giant phone (taller than the screen, so it can scroll) and a dashboard
// for the rooftop browser. Shapes only, no text, like the site's mockups.

// (ctx.roundRect isn't in older Safari.)
function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  ctx.fill();
}

function texture(canvas) {
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

const LILAC = '#b9a5f5';
const VIOLET = '#8b5cff';
const PINK = '#f08bf5';
const AQUA = '#2dd4bf';
const CORAL = '#ff8a7a';

function gradient(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((stop, i) => g.addColorStop(i / (stops.length - 1), stop));
  return g;
}

// Text stand-ins: rounded bars.
function line(ctx, x, y, w, alpha = 0.85, h = 9) {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  roundRect(ctx, x, y, w, h, h / 2);
}

// 256 × 1024, repeating top to bottom: shown 512 px at a time and scrolled.
export function phoneFeed() {
  const W = 256;
  const H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#100b1a';
  ctx.fillRect(0, 0, W, H);

  const pad = 16;
  const cardW = W - pad * 2;
  const blocks = [
    // A highlight card in the brand gradient, with a chart.
    (y) => {
      ctx.fillStyle = gradient(ctx, pad, y, W - pad, y + 150, ['#4d00f2', VIOLET, PINK]);
      roundRect(ctx, pad, y, cardW, 150, 18);
      line(ctx, pad + 16, y + 18, 70, 0.7);
      line(ctx, pad + 16, y + 36, 120, 0.95, 16);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      [0, 18, 10, 30, 22, 44, 36, 58].forEach((v, i) => {
        const px = pad + 16 + i * 27;
        const py = y + 130 - v;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      return 150;
    },
    // A list row: icon, two lines, a status chip.
    ...[AQUA, LILAC, CORAL].map((accent) => (y) => {
      ctx.fillStyle = '#1e1630';
      roundRect(ctx, pad, y, cardW, 76, 16);
      ctx.fillStyle = accent;
      roundRect(ctx, pad + 14, y + 16, 44, 44, 12);
      line(ctx, pad + 72, y + 22, 92);
      line(ctx, pad + 72, y + 42, 60, 0.35);
      ctx.fillStyle = `${accent}55`;
      roundRect(ctx, W - pad - 54, y + 28, 40, 18, 9);
      return 76;
    }),
    // A photo card.
    (y) => {
      ctx.fillStyle = gradient(ctx, pad, y, W - pad, y + 120, ['#2a1b55', '#5b3fb8', '#e36bff']);
      roundRect(ctx, pad, y, cardW, 120, 16);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.arc(pad + cardW - 46, y + 38, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(16,11,26,0.55)';
      ctx.beginPath();
      ctx.moveTo(pad, y + 120);
      ctx.lineTo(pad + 70, y + 62);
      ctx.lineTo(pad + 120, y + 96);
      ctx.lineTo(pad + 170, y + 54);
      ctx.lineTo(pad + cardW, y + 112);
      ctx.lineTo(pad + cardW, y + 120);
      ctx.fill();
      line(ctx, pad, y + 134, 150);
      line(ctx, pad, y + 152, 96, 0.35);
      return 166;
    },
    // Bars.
    (y) => {
      ctx.fillStyle = '#1e1630';
      roundRect(ctx, pad, y, cardW, 128, 16);
      line(ctx, pad + 16, y + 16, 80, 0.6);
      [46, 70, 38, 86, 60, 96, 74].forEach((v, i) => {
        ctx.fillStyle = i === 5 ? AQUA : 'rgba(185,165,245,0.55)';
        roundRect(ctx, pad + 16 + i * 28, y + 112 - v * 0.8, 16, v * 0.8, 5);
      });
      return 128;
    },
  ];

  // Lay the blocks out to fill exactly 1024 px, so the end meets the start.
  const heights = blocks.map((draw) => draw(-1000)); // measure (drawn off-canvas)
  ctx.fillStyle = '#100b1a';
  ctx.fillRect(0, 0, W, H);
  const gap = (H - heights.reduce((a, b) => a + b, 0)) / blocks.length;
  let y = gap / 2;
  blocks.forEach((draw) => {
    y += draw(y) + gap;
  });

  const map = texture(canvas);
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1, 0.5);
  return map;
}

// The status bar and island that stay put above the scrolling feed.
export function phoneChrome() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#100b1a';
  ctx.fillRect(0, 0, 256, 48);
  ctx.fillStyle = '#000';
  roundRect(ctx, 92, 10, 72, 22, 11);
  line(ctx, 22, 16, 30, 0.9);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  roundRect(ctx, 202, 16, 32, 10, 3);
  return texture(canvas);
}

// 512 × 320: a browser window with an analytics dashboard. The bar chart's
// bars are separate 3D pieces, so they can move.
export function dashboard() {
  const W = 512;
  const H = 320;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#120d1e';
  ctx.fillRect(0, 0, W, H);

  // Window bar.
  ctx.fillStyle = '#1d1630';
  ctx.fillRect(0, 0, W, 30);
  ['#ff6c6c', '#ffc65c', '#3ddc97'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(18 + i * 18, 15, 5.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, 150, 8, 212, 14, 7);

  // Sidebar.
  ctx.fillStyle = '#17112a';
  ctx.fillRect(0, 30, 92, H - 30);
  ctx.fillStyle = VIOLET;
  roundRect(ctx, 14, 46, 64, 14, 7);
  [72, 94, 116, 138].forEach((yy) => line(ctx, 14, yy, 50, 0.3, 8));

  // KPI cards with sparklines.
  [AQUA, LILAC, PINK].forEach((accent, i) => {
    const x = 106 + i * 134;
    ctx.fillStyle = '#1e1630';
    roundRect(ctx, x, 44, 122, 74, 10);
    line(ctx, x + 12, 56, 46, 0.4, 7);
    line(ctx, x + 12, 72, 64, 0.95, 13);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    [8, 14, 10, 20, 16, 26].forEach((v, j) => {
      const px = x + 12 + j * 19;
      const py = 110 - v * 0.6;
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  });

  // Chart panel (bars added in 3D) and a donut.
  ctx.fillStyle = '#1e1630';
  roundRect(ctx, 106, 130, 256, 176, 10);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  [170, 210, 250, 290].forEach((yy) => {
    ctx.beginPath();
    ctx.moveTo(120, yy);
    ctx.lineTo(348, yy);
    ctx.stroke();
  });
  ctx.fillStyle = '#1e1630';
  roundRect(ctx, 374, 130, 124, 176, 10);
  const cx = 436;
  const cy = 208;
  [[AQUA, 0, 2.2], [VIOLET, 2.2, 4.1], [CORAL, 4.1, 5.2], ['rgba(255,255,255,0.15)', 5.2, Math.PI * 2]].forEach(
    ([c, a0, a1]) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(cx, cy, 36, a0 - Math.PI / 2, a1 - Math.PI / 2);
      ctx.stroke();
    },
  );
  line(ctx, 398, 268, 76, 0.5, 8);
  line(ctx, 410, 284, 52, 0.3, 8);

  return texture(canvas);
}

// Where the dashboard's chart panel is, as fractions of the screen (for the 3D bars).
export const CHART_AREA = { left: 120 / 512, right: 348 / 512, bottom: 290 / 320, top: 150 / 320 };
