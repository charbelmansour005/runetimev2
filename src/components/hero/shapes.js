import { HERO_SHAPE_OPTIONS, optionValues } from '../../data/options.js';

// Point formations for the hero's particle sculpture. Every formation has the
// same number of points, sorted bottom to top, so any shape can morph into any
// other. Coordinates are world units; formations fit in about ±1.7 × ±1.5.
// Each point also carries a `flow` value (bright pulses travel along it) and a
// brightness `weight`.

export const SHAPE_KEYS = optionValues(HERO_SHAPE_OPTIONS);

// Turn speed (radians per second) around the vertical axis; the rest only sway.
export const SHAPE_SPIN = { globe: 0.14, helix: 0.3 };

// Unknown or missing shapes fall back to one per slide position.
export const resolveShape = (key, index = 0) =>
  SHAPE_KEYS.includes(key) ? key : SHAPE_KEYS[index % SHAPE_KEYS.length];

export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Vectors ----------

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const normalize = (a) => scale(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const clamp01 = (v) => Math.min(1, Math.max(0, v));

const rotateX = ([x, y, z], a) => [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
const rotateY = ([x, y, z], a) => [x * Math.cos(a) + z * Math.sin(a), y, z * Math.cos(a) - x * Math.sin(a)];
const rotateZ = ([x, y, z], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), z];

const angleBetween = (a, b) => Math.acos(Math.min(1, Math.max(-1, dot(a, b))));

function slerp(a, b, t) {
  const omega = angleBetween(a, b);
  const s = Math.sin(omega) || 1;
  return add(scale(a, Math.sin((1 - t) * omega) / s), scale(b, Math.sin(t * omega) / s));
}

// Two unit vectors perpendicular to a direction, for circles around a line.
function perpendiculars(direction, up = [0, 0, 1]) {
  const t = normalize(direction);
  const n = normalize(cross(t, up));
  return [n, cross(t, n)];
}

// Splits `total` into whole numbers proportional to `weights`.
function split(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  const parts = weights.map((w) => Math.floor((total * w) / sum));
  let rest = total - parts.reduce((a, b) => a + b, 0);
  for (let i = 0; rest > 0; i = (i + 1) % parts.length, rest -= 1) parts[i] += 1;
  return parts;
}

// ---------- Paths ----------

class Path {
  constructor(points) {
    this.points = points;
    this.lengths = [0];
    for (let i = 1; i < points.length; i += 1) {
      this.lengths.push(this.lengths[i - 1] + distance(points[i - 1], points[i]));
    }
    this.length = this.lengths[this.lengths.length - 1];
  }

  // The point `u` (0..1) of the way along, and the direction there.
  at(u) {
    const d = u * this.length;
    let lo = 1;
    let hi = this.points.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.lengths[mid] < d) lo = mid + 1;
      else hi = mid;
    }
    const a = this.points[lo - 1];
    const b = this.points[lo];
    const span = this.lengths[lo] - this.lengths[lo - 1] || 1;
    return { point: lerp(a, b, clamp01((d - this.lengths[lo - 1]) / span)), direction: sub(b, a) };
  }
}

// Spreads `count` points evenly along several paths, in proportion to their
// lengths. `emit(point, u, direction, pathIndex)` receives each one.
function alongPaths(cloud, paths, count, emit) {
  split(count, paths.map((p) => p.length)).forEach((n, i) => {
    for (let k = 0; k < n; k += 1) {
      const u = (k + cloud.rand()) / n;
      const { point, direction } = paths[i].at(u);
      emit(point, u, direction, i);
    }
  });
}

// 2D outlines (x, y) for the interface panels.
function roundedRect(cx, cy, w, h, r) {
  const points = [];
  const corners = [
    [w / 2 - r, h / 2 - r],
    [-w / 2 + r, h / 2 - r],
    [-w / 2 + r, -h / 2 + r],
    [w / 2 - r, -h / 2 + r],
  ];
  corners.forEach(([x, y], corner) => {
    for (let i = 0; i <= 6; i += 1) {
      const a = ((corner + i / 6) * Math.PI) / 2;
      points.push([cx + x + Math.cos(a) * r, cy + y + Math.sin(a) * r]);
    }
  });
  points.push(points[0]);
  return points;
}

function circle(cx, cy, r, segments = 16) {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const a = (i / segments) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
}

const segment = (x0, y0, x1, y1) => [
  [x0, y0],
  [x1, y1],
];

// ---------- Noise (for the globe's continents) ----------

function hash(x, y, z, seed) {
  let h = seed ^ Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(z, 0x1b873593);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x, y, z, seed) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const smooth = (t) => t * t * (3 - 2 * t);
  const u = smooth(x - xi);
  const v = smooth(y - yi);
  const w = smooth(z - zi);
  let sum = 0;
  for (let k = 0; k < 8; k += 1) {
    const dx = k & 1;
    const dy = (k >> 1) & 1;
    const dz = (k >> 2) & 1;
    sum += (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w) * hash(xi + dx, yi + dy, zi + dz, seed);
  }
  return sum;
}

const continents = ([x, y, z]) =>
  0.6 * valueNoise(x * 1.6 + 5.3, y * 1.6 + 1.1, z * 1.6 - 2.7, 11) +
  0.3 * valueNoise(x * 3.3, y * 3.3, z * 3.3, 23) +
  0.1 * valueNoise(x * 7, y * 7, z * 7, 37);

// ---------- Point cloud ----------

class Cloud {
  constructor(count, seed) {
    this.count = count;
    this.size = 0;
    this.positions = new Float32Array(count * 3);
    this.data = new Float32Array(count * 2);
    this.rand = seeded(seed);
  }

  add(point, flow, weight) {
    if (this.size >= this.count) return;
    this.positions.set(point, this.size * 3);
    this.data[this.size * 2] = flow;
    this.data[this.size * 2 + 1] = weight;
    this.size += 1;
  }

  gauss() {
    return Math.sqrt(-2 * Math.log(1 - this.rand())) * Math.cos(2 * Math.PI * this.rand());
  }

  jitter(point, amount) {
    return [point[0] + this.gauss() * amount, point[1] + this.gauss() * amount, point[2] + this.gauss() * amount];
  }

  direction() {
    const z = this.rand() * 2 - 1;
    const a = this.rand() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    return [Math.cos(a) * r, z, Math.sin(a) * r];
  }

  // Faint specks drifting around the shape.
  dust(count) {
    for (let k = 0; k < count; k += 1) {
      const d = scale(this.direction(), 1.9 + this.rand() * 0.6);
      this.add([d[0], d[1] * 0.72, d[2] * 0.6], this.rand(), 0.3);
    }
  }

  finish() {
    this.dust(this.count - this.size);
    const order = Array.from({ length: this.count }, (_, i) => i).sort(
      (a, b) => this.positions[a * 3 + 1] - this.positions[b * 3 + 1],
    );
    const positions = new Float32Array(this.count * 3);
    const data = new Float32Array(this.count * 2);
    order.forEach((from, to) => {
      positions.set(this.positions.subarray(from * 3, from * 3 + 3), to * 3);
      data.set(this.data.subarray(from * 2, from * 2 + 2), to * 2);
    });
    return { positions, data };
  }
}

// ---------- Formations ----------

// AI: a neural network whose signals pulse from the input layer to the output.
function neural(c) {
  const LAYERS = [5, 8, 8, 4];
  const X = [-1.5, -0.5, 0.5, 1.5];
  const layers = LAYERS.map((n, l) =>
    Array.from({ length: n }, (_, j) => [
      X[l],
      (j - (n - 1) / 2) * (n > 5 ? 0.38 : 0.48),
      Math.sin(j * 2.3 + l * 1.7) * 0.3,
    ]),
  );

  // Each node links to about half the next layer, and to at least two nodes.
  const links = [];
  layers.slice(0, -1).forEach((layer, l) => {
    const next = layers[l + 1];
    layer.forEach((a) => {
      const targets = next.filter(() => c.rand() < 0.5);
      while (targets.length < 2) {
        const b = next[Math.floor(c.rand() * next.length)];
        if (!targets.includes(b)) targets.push(b);
      }
      targets.forEach((b) => links.push({ a, b, l }));
    });
  });

  const [nodeCount, linkCount, dustCount] = split(c.count, [22, 72, 6]);
  const nodes = layers.flatMap((layer, l) => layer.map((p) => ({ p, flow: l / 3 })));
  split(nodeCount, nodes.map(() => 1)).forEach((n, i) => {
    const { p, flow } = nodes[i];
    for (let k = 0; k < n; k += 1) {
      if (k < n * 0.6) {
        c.add(c.jitter(p, 0.028), flow, 1.05);
      } else {
        const a = c.rand() * Math.PI * 2;
        c.add(c.jitter(add(p, [Math.cos(a) * 0.115, Math.sin(a) * 0.115, 0]), 0.006), flow, 0.9);
      }
    }
  });

  const paths = links.map(({ a, b }) => new Path([lerp(a, b, 0.08), lerp(a, b, 0.92)]));
  alongPaths(c, paths, linkCount, (point, u, _, i) => {
    c.add(c.jitter(point, 0.005), (links[i].l + 0.08 + u * 0.84) / 3, 0.7);
  });
  c.dust(dustCount);
}

// Apps: a browser, a dashboard and a phone, fanned out in depth.
function screens(c) {
  const bars = [0.16, 0.28, 0.2, 0.34, 0.24, 0.38, 0.3, 0.42];
  const panels = [
    {
      at: [-0.55, 0.4, -0.7],
      w: 2.3,
      h: 1.5,
      lines: [
        roundedRect(0, 0, 2.3, 1.5, 0.08),
        segment(-1.15, 0.52, 1.15, 0.52),
        circle(-1.02, 0.63, 0.03, 8),
        circle(-0.93, 0.63, 0.03, 8),
        circle(-0.84, 0.63, 0.03, 8),
        roundedRect(0.08, 0.63, 1, 0.1, 0.05),
        segment(-0.98, 0.33, -0.12, 0.33),
        segment(-0.98, 0.21, -0.3, 0.21),
        roundedRect(-0.8, 0.02, 0.36, 0.11, 0.055),
        roundedRect(0.55, 0.2, 0.9, 0.5, 0.04),
        [
          [0.14, -0.02],
          [0.36, 0.22],
          [0.5, 0.08],
          [0.68, 0.3],
          [0.96, -0.02],
        ],
        circle(0.3, 0.34, 0.045, 10),
        ...[-0.72, 0, 0.72].flatMap((x) => [
          roundedRect(x, -0.44, 0.62, 0.42, 0.05),
          circle(x - 0.19, -0.33, 0.045, 10),
          segment(x - 0.23, -0.48, x + 0.2, -0.48),
          segment(x - 0.23, -0.57, x + 0.06, -0.57),
        ]),
      ],
    },
    {
      at: [0.3, -0.2, 0],
      w: 1.6,
      h: 1.1,
      lines: [
        roundedRect(0, 0, 1.6, 1.1, 0.08),
        segment(-0.66, 0.4, -0.2, 0.4),
        segment(-0.66, 0.31, -0.36, 0.31),
        circle(0.62, 0.4, 0.05, 12),
        Array.from({ length: 40 }, (_, i) => {
          const x = -0.66 + (i / 39) * 1.32;
          return [x, 0.1 + 0.09 * Math.sin(x * 4.4 + 0.5) + 0.05 * Math.sin(x * 9.3)];
        }),
        segment(-0.66, -0.04, 0.66, -0.04),
        ...bars.flatMap((h, i) => {
          const x = -0.6 + i * 0.17;
          return [segment(x - 0.02, -0.46, x - 0.02, -0.46 + h), segment(x + 0.02, -0.46, x + 0.02, -0.46 + h)];
        }),
      ],
    },
    {
      at: [1.12, -0.3, 0.7],
      w: 0.74,
      h: 1.5,
      lines: [
        roundedRect(0, 0, 0.74, 1.5, 0.12),
        roundedRect(0, 0.66, 0.2, 0.05, 0.025),
        ...Array.from({ length: 12 }, (_, i) =>
          roundedRect(-0.22 + (i % 3) * 0.22, 0.42 - Math.floor(i / 3) * 0.24, 0.14, 0.14, 0.04),
        ),
        roundedRect(0, -0.56, 0.6, 0.16, 0.06),
        segment(-0.12, -0.7, 0.12, -0.7),
      ],
    },
  ];

  const orient = (p) => rotateX(rotateY(scale(add(p, [0.1, -0.08, 0.05]), 1.04), 0.42), 0.12);
  // Pulses sweep down each screen like a refresh.
  const flowOf = (index, panel, y) => index * 0.3 + (0.5 - (y - panel.at[1]) / panel.h) * 0.5;
  const [strokeCount, glassCount, dustCount] = split(c.count, [86, 8, 6]);

  const outlines = panels.flatMap((panel, index) =>
    panel.lines.map((line) => ({
      index,
      path: new Path(line.map(([x, y]) => [panel.at[0] + x, panel.at[1] + y, panel.at[2]])),
    })),
  );
  alongPaths(
    c,
    outlines.map((o) => o.path),
    strokeCount,
    (point, _, __, i) => {
      const { index } = outlines[i];
      c.add(orient(point), flowOf(index, panels[index], point[1]), 0.95);
    },
  );

  // A faint glass surface on each screen.
  split(glassCount, panels.map((p) => p.w * p.h)).forEach((n, index) => {
    const panel = panels[index];
    for (let k = 0; k < n; k += 1) {
      const x = panel.at[0] + (c.rand() - 0.5) * panel.w * 0.97;
      const y = panel.at[1] + (c.rand() - 0.5) * panel.h * 0.97;
      c.add(orient([x, y, panel.at[2]]), flowOf(index, panel, y), 0.14);
    }
  });
  c.dust(dustCount);
}

// Global teams: a dotted planet with arcs between cities and an orbit.
function globe(c) {
  const R = 1.22;
  const [surface, arcCount, ringCount, dustCount] = split(c.count, [64, 15, 15, 6]);

  // Candidates spread evenly over the sphere (a Fibonacci lattice); smooth
  // noise decides which ones are land, so they clump into continents.
  const total = Math.round(surface * 2.4);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const candidates = Array.from({ length: total }, (_, i) => {
    const y = 1 - ((i + 0.5) / total) * 2;
    const r = Math.sqrt(1 - y * y);
    const p = [Math.cos(i * golden) * r, y, Math.sin(i * golden) * r];
    return { p, land: continents(p) };
  }).sort((a, b) => b.land - a.land);

  const landCount = Math.round(surface * 0.62);
  const land = candidates.slice(0, landCount);
  const sea = candidates.slice(landCount);
  land.forEach(({ p }) => c.add(scale(p, R), c.rand(), 1));
  const seaCount = surface - landCount;
  for (let k = 0; k < seaCount; k += 1) {
    c.add(scale(sea[Math.floor((k * sea.length) / seaCount)].p, R), c.rand(), 0.42);
  }

  // Arcs between cities, lifted off the surface; pulses travel along them.
  const cities = [];
  for (let tries = 0; cities.length < 14 && tries < 1000; tries += 1) {
    const { p } = land[Math.floor(c.rand() * land.length)];
    if (cities.every((q) => angleBetween(p, q) > 0.5)) cities.push(p);
  }
  const routes = [];
  cities.forEach((a, i) => {
    const b = cities.find((q, j) => j > i && angleBetween(a, q) > 0.55 && angleBetween(a, q) < 1.25);
    if (b && routes.length < 8) routes.push([a, b]);
  });
  const [arcPoints, cityPoints] = split(arcCount, [85, 15]);
  split(arcPoints, routes.map(([a, b]) => angleBetween(a, b))).forEach((n, i) => {
    const [a, b] = routes[i];
    const lift = 0.12 * angleBetween(a, b);
    for (let k = 0; k < n; k += 1) {
      const t = (k + c.rand()) / n;
      c.add(c.jitter(scale(slerp(a, b, t), R * (1 + lift * Math.sin(Math.PI * t))), 0.005), t, 1.05);
    }
  });
  const ends = routes.flat();
  split(cityPoints, ends.map(() => 1)).forEach((n, i) => {
    for (let k = 0; k < n; k += 1) c.add(c.jitter(scale(ends[i], R * 1.01), 0.018), c.rand(), 1.5);
  });

  // A tilted orbit with three satellites.
  const tilt = (p) => rotateZ(rotateX(p, 0.42), 0.2);
  const [orbit, satellites] = split(ringCount, [84, 16]);
  for (let k = 0; k < orbit; k += 1) {
    const a = ((k + c.rand()) / orbit) * Math.PI * 2;
    c.add(tilt(c.jitter([Math.cos(a) * 1.72, 0, Math.sin(a) * 1.72], 0.01)), a / (Math.PI * 2), 0.7);
  }
  split(satellites, [1, 1, 1]).forEach((n, i) => {
    const a = [0.6, 2.4, 4.3][i];
    for (let k = 0; k < n; k += 1) {
      c.add(tilt(c.jitter([Math.cos(a) * 1.72, 0, Math.sin(a) * 1.72], 0.03)), a / (Math.PI * 2), 1.4);
    }
  });
  c.dust(dustCount);
}

// Cloud & DevOps: the continuous-delivery loop, with its eight stages.
function infinity(c) {
  const path = new Path(
    Array.from({ length: 721 }, (_, i) => {
      const t = (i / 720) * Math.PI * 2;
      const s = Math.sin(t);
      const d = 1 + s * s;
      return [(1.55 * Math.cos(t)) / d, (1.95 * s * Math.cos(t)) / d, 0.36 * s];
    }),
  );
  const around = (point, direction, radius, a) => {
    const [n1, n2] = perpendiculars(direction);
    return add(point, add(scale(n1, Math.cos(a) * radius), scale(n2, Math.sin(a) * radius)));
  };
  const [tube, stages, haze, dustCount] = split(c.count, [62, 12, 20, 6]);

  alongPaths(c, [path], tube, (point, u, direction) => {
    c.add(around(point, direction, 0.12 * (0.7 + 0.3 * c.rand()), c.rand() * Math.PI * 2), u, 0.8);
  });

  split(stages, Array(8).fill(1)).forEach((n, s) => {
    const u = (s + 0.5) / 8;
    const { point, direction } = path.at(u);
    for (let k = 0; k < n; k += 1) {
      if (k < n * 0.3) c.add(c.jitter(point, 0.03), u, 1.5);
      else c.add(around(point, direction, 0.25, c.rand() * Math.PI * 2), u, 1.15);
    }
  });

  for (let k = 0; k < haze; k += 1) {
    const u = c.rand();
    c.add(c.jitter(path.at(u).point, 0.15), u, 0.38);
  }
  c.dust(dustCount);
}

// Data: a double helix with paired rungs.
function helix(c) {
  const H = 3;
  const R = 0.72;
  const TURNS = 1.35;
  const at = (s, phase) => {
    const a = s * TURNS * Math.PI * 2 + phase;
    return [Math.cos(a) * R, (s - 0.5) * H, Math.sin(a) * R];
  };
  const [strands, rungs, sheath, dustCount] = split(c.count, [46, 32, 14, 8]);

  const perStrand = Math.ceil(strands / 2);
  for (let k = 0; k < strands; k += 1) {
    const s = (Math.floor(k / 2) + c.rand()) / perStrand;
    c.add(c.jitter(at(s, (k % 2) * Math.PI), 0.028), s, 1);
  }

  const RUNGS = 18;
  split(rungs, Array(RUNGS).fill(1)).forEach((n, r) => {
    const s = (r + 0.5) / RUNGS;
    const a = at(s, 0);
    const b = at(s, Math.PI);
    for (let k = 0; k < n; k += 1) {
      // Two halves with a gap in the middle, like base pairs.
      const t = (k % 2 ? 0.54 : 0.04) + c.rand() * 0.42;
      c.add(c.jitter(lerp(a, b, t), 0.006), s, 0.7);
    }
  });

  for (let k = 0; k < sheath; k += 1) {
    const s = c.rand();
    const a = c.rand() * Math.PI * 2;
    const r = 1.05 + c.rand() * 0.3;
    c.add([Math.cos(a) * r, (s - 0.5) * H * 1.05, Math.sin(a) * r], s, 0.22);
  }
  c.dust(dustCount);
}

// Infrastructure: a 3 × 3 × 3 block of cubes, seen in isometric view.
function blocks(c) {
  const SIZE = 0.46;
  const PITCH = 0.7;
  // Leave a notch in the corner that faces the viewer, and nudge a few blocks out.
  const skip = new Set(['-1,1,1', '0,1,1', '-1,1,0']);
  const nudged = { '1,1,-1': [0, 0.16, 0], '1,-1,-1': [0.16, 0, 0], '-1,-1,1': [0, -0.14, 0] };
  const centers = [];
  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      for (let z = -1; z <= 1; z += 1) {
        const key = `${x},${y},${z}`;
        if (!skip.has(key)) centers.push(add(scale([x, y, z], PITCH), nudged[key] ?? [0, 0, 0]));
      }
    }
  }

  const h = SIZE / 2;
  const corners = Array.from({ length: 8 }, (_, i) => [i & 1 ? h : -h, i & 2 ? h : -h, i & 4 ? h : -h]);
  const edges = [];
  corners.forEach((a, i) =>
    corners.forEach((b, j) => {
      if (j > i && [0, 1, 2].filter((k) => a[k] !== b[k]).length === 1) edges.push([a, b]);
    }),
  );

  const iso = (p) => rotateX(rotateY(p, Math.PI / 4), 0.6155);
  const flowOf = (p) => (p[0] + p[1] + p[2]) / (6 * PITCH) + 0.5;
  const [edgeCount, cornerCount, dustCount] = split(c.count, [80, 14, 6]);

  const paths = centers.flatMap((center) => edges.map(([a, b]) => new Path([add(center, a), add(center, b)])));
  alongPaths(c, paths, edgeCount, (point) => c.add(iso(c.jitter(point, 0.004)), flowOf(point), 0.85));

  const allCorners = centers.flatMap((center) => corners.map((k) => add(center, k)));
  split(cornerCount, allCorners.map(() => 1)).forEach((n, i) => {
    for (let k = 0; k < n; k += 1) c.add(iso(c.jitter(allCorners[i], 0.014)), flowOf(allCorners[i]), 1.35);
  });
  c.dust(dustCount);
}

const BUILDERS = { neural, screens, globe, infinity, helix, blocks };

export function buildShape(key, count) {
  const cloud = new Cloud(count, 1 + SHAPE_KEYS.indexOf(key) * 7919);
  BUILDERS[key](cloud);
  return cloud.finish();
}

// Where the particles start before the first shape assembles: a wide,
// flattened shell well outside the sculpture.
export function scatteredCloud(count, rand) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const z = rand() * 2 - 1;
    const a = rand() * Math.PI * 2;
    const r = 3 + rand() * 3;
    const s = Math.sqrt(1 - z * z);
    positions.set([Math.cos(a) * s * r, z * r * 0.6, Math.sin(a) * s * r * 0.5], i * 3);
  }
  return positions;
}
