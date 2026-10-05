import * as THREE from 'three';
import { at, Batch, block, color, cylinder, faceted, glowSprite, halo } from './kit';

// The hero's miniature: a vermilion torii gate standing in a pond at dusk,
// with a pagoda, stone lanterns, an arched bridge and cherry trees on the
// shore. Visitors can turn it all the way round, so every side is finished.
// The slab is 10 × 8, the land's top is at y = 0 and the water just below.

const C = {
  moss: '#2f5548',
  mossLight: '#3f6b55',
  shore: '#8d86a3',
  strata: '#171024',
  base: '#0e0917',
  vermilion: '#ff4a1f',
  vermilionDark: '#b5300f',
  wet: '#5f1d10',
  roof: '#2b2438',
  roofEdge: '#3d3450',
  gold: '#e0b860',
  stone: '#b9b3cc',
  stoneDark: '#7b7593',
  rock: ['#6f6a86', '#585370', '#8a84a3'],
  trunk: '#4a3340',
  cherry: ['#f7b9d4', '#ee9cc4', '#ffd6e6'],
  maple: ['#e2502c', '#f08a3c', '#c93a26'],
  pine: ['#2a5a4a', '#1f4a40', '#356b55'],
  pad: '#3f8a62',
  lotus: '#ffc4dc',
  warm: '#ffd9a0',
  paper: '#ffcf8a',
  deep: '#081428',
  wood: '#5a3b33',
};

const WATER = -0.08;
const DEPTH = 1.0; // how far the base goes down, and with it the pond

// The size of everything, for framing it.
export const BOUNDS = new THREE.Box3(new THREE.Vector3(-5, -DEPTH, -4), new THREE.Vector3(5, 3.0, 4));

// The pond's outline (x, z), going round; a tongue reaches to the back left,
// where the bridge crosses it.
const POND = [
  [3.6, 0.2],
  [3.3, 1.8],
  [1.8, 2.9],
  [-0.4, 3.1],
  [-2.4, 2.6],
  [-3.5, 1.3],
  [-3.3, -0.2],
  [-2.6, -1.0],
  [-3.4, -1.9],
  [-3.9, -2.9],
  [-3.0, -2.75],
  [-2.1, -1.9],
  [-1.2, -1.5],
  [0.6, -1.7],
  [2.2, -1.5],
  [3.2, -0.9],
];
const TORII = { x: 0.35, z: -0.1, ry: 0.3, s: 1.2 };
const BRIDGE = { x: -2.95, z: -2.1, ry: 0.877, length: 1.9 };

// The same garden on every visit.
function seeded(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundedShape(hx, hz, r) {
  const shape = new THREE.Shape();
  shape.moveTo(-hx + r, -hz);
  shape.lineTo(hx - r, -hz);
  shape.quadraticCurveTo(hx, -hz, hx, -hz + r);
  shape.lineTo(hx, hz - r);
  shape.quadraticCurveTo(hx, hz, hx - r, hz);
  shape.lineTo(-hx + r, hz);
  shape.quadraticCurveTo(-hx, hz, -hx, hz - r);
  shape.lineTo(-hx, -hz + r);
  shape.quadraticCurveTo(-hx, -hz, -hx + r, -hz);
  return shape;
}

// Shapes are drawn in (x, z) and laid flat: tops face up, depth goes down.
const flat = (geometry) => geometry.rotateX(Math.PI / 2);

// A beam that curves up towards its ends, like a torii's top lintel. Its
// underside is at y = 0 in the middle.
function curvedBeam(half, thickness, rise, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(-half, rise);
  shape.quadraticCurveTo(0, -rise, half, rise);
  shape.lineTo(half + thickness * 0.35, rise + thickness);
  shape.quadraticCurveTo(0, -rise + thickness, -half - thickness * 0.35, rise + thickness);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 14 }).translate(0, 0, -depth / 2);
}

// A square, gently sloped roof.
const pyramid = (r, h) => faceted(new THREE.ConeGeometry(r, h, 4).rotateY(Math.PI / 4).translate(0, h / 2, 0));

// Built in slices: `pause` is awaited often, and yields to the browser only
// once the current slice has used up its time (see makePause in kit.js), so
// even a slow phone stays responsive while the garden is built.
export async function buildGarden({ pause = async () => {} } = {}) {
  const rand = seeded(7);
  const between = (min, max) => min + rand() * (max - min);
  const batch = new Batch();
  const mirror = new Batch(); // the same parts upside down, seen in the water
  const group = new THREE.Group();
  const movers = [];
  const glows = []; // static light halos: x, y, z, size, colour, strength
  const extra = []; // geometries, materials and textures to dispose of

  const materials = {
    solid: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
    // Painted wood that catches the last light: a little glow of its own.
    lacquer: new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.5,
      emissive: '#ff3a10',
      emissiveIntensity: 0.3,
    }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    accent: new THREE.MeshBasicMaterial({ color: '#8b5cff', toneMapped: false }),
  };
  for (const key of ['glow', 'accent']) materials[key].userData.shadow = false;

  // Reflections are the scene's parts mirrored below the water, fading with
  // depth. (A real mirror would mean drawing the scene twice per frame.)
  const mirrorMaterial = new THREE.ShaderMaterial({
    uniforms: { uWater: { value: WATER }, uDepth: { value: DEPTH - 0.05 } },
    vertexShader: /* glsl */ `
      attribute vec3 color;
      varying vec3 vColor;
      varying float vY;
      varying vec2 vPlan;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vY = world.y;
        vPlan = world.xz;
        float light = 0.6 + 0.4 * max(dot(normalize(mat3(modelMatrix) * normal), normalize(vec3(-0.4, -0.75, 0.5))), 0.0);
        vColor = color * light;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uWater;
      uniform float uDepth;
      varying vec3 vColor;
      varying float vY;
      varying vec2 vPlan;
      void main() {
        if (vY > uWater) discard;
        // Nothing may show outside the base (a mirrored branch that overhangs it).
        vec2 q = abs(vPlan) - (vec2(4.94, 3.94) - 0.86);
        if (length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.86 > -0.05) discard;
        float depth = (uWater - vY) / uDepth;
        gl_FragColor = vec4(vColor, (1.0 - smoothstep(0.5, 1.0, depth)) * 0.9);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
  });
  extra.push(mirrorMaterial);
  const FLIP = new THREE.Matrix4().makeTranslation(0, 2 * WATER, 0).multiply(new THREE.Matrix4().makeScale(1, -1, 1));
  // What the mirrored copy of each material looks like (a flat colour boost).
  const REFLECTED = { lacquer: 1.55, glow: 1.6, solid: 0.95, accent: 1 };

  // Adds a part and, unless told otherwise, its reflection.
  function add(key, geometry, transform, tint, { reflect = true, shadow = true } = {}) {
    batch.add(key, geometry, transform, tint, { shadow });
    if (reflect) {
      const c = color(tint ?? '#ffffff').multiplyScalar(REFLECTED[key] ?? 1);
      mirror.add('mirror', geometry, FLIP.clone().multiply(transform), c);
    }
  }

  const glow = (x, y, z, size, tint, strength = 1) => {
    glows.push([x, y, z, size, tint, strength]);
    // And its reflection, unless that would fall below the base.
    const mirrored = 2 * WATER - y;
    if (mirrored > -DEPTH + 0.2) glows.push([x, mirrored, z, size * 0.9, tint, strength * 0.45]);
  };

  // ---------- Pond outline ----------
  const outline = new THREE.CatmullRomCurve3(
    POND.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    true,
    'catmullrom',
    0.5,
  )
    .getPoints(160)
    .slice(0, -1);
  const outline2d = outline.map((p) => new THREE.Vector2(p.x, p.z));
  const inPond = (x, z) => {
    let inside = false;
    for (let i = 0, j = outline.length - 1; i < outline.length; j = i, i += 1) {
      const a = outline[i];
      const b = outline[j];
      if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
    }
    return inside;
  };
  // Clear of the water's edge by `margin` on every side.
  const onLand = (x, z, margin = 0.25) =>
    Math.abs(x) < 4.7 - margin &&
    Math.abs(z) < 3.7 - margin &&
    [0, 1, 2, 3, 4, 5, 6, 7].every((k) => !inPond(x + Math.cos(k * 0.785) * margin, z + Math.sin(k * 0.785) * margin));
  const inWater = (x, z, margin = 0.3) =>
    [0, 1, 2, 3, 4, 5, 6, 7].every((k) => inPond(x + Math.cos(k * 0.785) * margin, z + Math.sin(k * 0.785) * margin));

  // ---------- Ground ----------
  const pondHole = () => new THREE.Path().setFromPoints(outline2d);
  const land = roundedShape(5, 4, 0.9);
  land.holes.push(pondHole());
  add('solid', flat(new THREE.ExtrudeGeometry(land, { depth: 0.16, bevelEnabled: false, curveSegments: 8 })), at(), C.moss, {
    reflect: false,
  });
  const body = roundedShape(4.94, 3.94, 0.86);
  body.holes.push(pondHole());
  add(
    'solid',
    flat(new THREE.ExtrudeGeometry(body, { depth: DEPTH - 0.2, bevelEnabled: false, curveSegments: 8 })),
    at(0, -0.2, 0),
    C.strata,
    { reflect: false },
  );
  // A lit seam between the land and its base.
  const seam = roundedShape(4.97, 3.97, 0.88);
  seam.holes.push(roundedShape(4.9, 3.9, 0.84));
  add('accent', flat(new THREE.ExtrudeGeometry(seam, { depth: 0.045, bevelEnabled: false, curveSegments: 8 })), at(0, -0.158, 0), null, {
    reflect: false,
  });
  // The pond's bed, far below, and a pebble shore around the water.
  const bed = new THREE.Mesh(
    flat(new THREE.ShapeGeometry(roundedShape(4.9, 3.9, 0.84))),
    new THREE.MeshBasicMaterial({ color: C.deep, side: THREE.DoubleSide }),
  );
  bed.position.y = -DEPTH + 0.01;
  group.add(bed);
  extra.push(bed.geometry, bed.material);

  const centre = outline2d.reduce((sum, p) => sum.add(p), new THREE.Vector2()).divideScalar(outline2d.length);
  const shore = new THREE.Shape(outline2d.map((p) => p.clone().sub(centre).multiplyScalar(1.07).add(centre)));
  shore.holes.push(pondHole());
  add('solid', flat(new THREE.ShapeGeometry(shore)).scale(1, -1, 1), at(0, 0.006, 0), C.shore, { reflect: false, shadow: false });

  // Water: see-through, so the reflections and the koi show.
  const waterMaterial = new THREE.MeshStandardMaterial({
    color: '#2c6cc4',
    roughness: 0.18,
    metalness: 0.35,
    transparent: true,
    opacity: 0.52,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const water = new THREE.Mesh(flat(new THREE.ShapeGeometry(new THREE.Shape(outline2d))), waterMaterial);
  water.position.y = WATER;
  water.renderOrder = 2;
  group.add(water);
  extra.push(water.geometry, waterMaterial);

  await pause();

  // ---------- The torii ----------
  // The great gate in the water: two pillars, each braced by a smaller post
  // in front and behind, under a curved, roofed lintel.
  {
    const T = at(TORII.x, 0, TORII.z, { ry: TORII.ry, s: TORII.s });
    const put = (key, geometry, local, tint, options) => add(key, geometry, T.clone().multiply(local), tint, options);
    const bedY = -0.5;
    for (const side of [-1, 1]) {
      const x = side * 1.15;
      put('lacquer', cylinder(0.105, 0.125, 2.05 - bedY, 20), at(x, bedY, 0), C.vermilion);
      // Darker where the tide has been.
      put('solid', cylinder(0.128, 0.132, 0.2 - bedY, 20), at(x, bedY, 0), C.wet);
      put('solid', block(0.3, 0.07, 0.3, 0.02), at(x, 2.02, 0), C.roof);
      for (const z of [-0.62, 0.62]) {
        put('lacquer', cylinder(0.062, 0.072, 1.02 - bedY, 14), at(x, bedY, z), C.vermilion);
        put('solid', cylinder(0.075, 0.078, 0.16 - bedY, 14), at(x, bedY, z), C.wet);
        put('solid', pyramid(0.2, 0.09), at(x, 1.02, z), C.roof);
      }
      for (const y of [0.48, 0.84]) put('lacquer', block(0.07, 0.085, 1.5, 0.015), at(x, y, 0), C.vermilionDark);
      await pause();
    }
    put('lacquer', block(2.95, 0.15, 0.13, 0.02), at(0, 1.48, 0), C.vermilion);
    put('lacquer', block(3.12, 0.17, 0.2, 0.02), at(0, 1.97, 0), C.vermilion);
    put('lacquer', curvedBeam(1.84, 0.16, 0.13, 0.27), at(0, 2.14, 0), C.vermilion);
    put('solid', curvedBeam(1.94, 0.06, 0.145, 0.46), at(0, 2.3, 0), C.roof);
    put('solid', curvedBeam(1.9, 0.035, 0.145, 0.34), at(0, 2.36, 0), C.roofEdge);
    // The name tablet between the beams.
    put('solid', block(0.26, 0.34, 0.07, 0.015), at(0, 1.63, 0), C.roof);
    for (const z of [-0.04, 0.04]) put('glow', block(0.18, 0.26, 0.012, 0.004), at(0, 1.67, z), C.gold);
  }

  await pause();

  // ---------- Pagoda (back right) ----------
  {
    const [px, pz] = [2.95, -2.75];
    add('solid', block(1.5, 0.1, 1.5, 0.03), at(px, 0, pz), C.stone);
    add('solid', block(1.25, 0.08, 1.25, 0.03), at(px, 0.1, pz), C.stoneDark);
    let y = 0.18;
    for (let tier = 0; tier < 3; tier += 1) {
      const w = 0.82 - tier * 0.17;
      add('lacquer', block(w, 0.4, w, 0.02), at(px, y, pz), C.vermilion);
      // Paper screens, lit from inside.
      for (const [dx, dz, ry] of [
        [0, 1, 0],
        [0, -1, 0],
        [1, 0, Math.PI / 2],
        [-1, 0, Math.PI / 2],
      ]) {
        add('glow', block(w * 0.5, 0.2, 0.012, 0.004), at(px + (dx * w) / 2, y + 0.1, pz + (dz * w) / 2, { ry }), C.warm);
        glow(px + dx * (w / 2 + 0.03), y + 0.2, pz + dz * (w / 2 + 0.03), 0.5, C.warm, 0.3);
      }
      y += 0.4;
      add('solid', pyramid(w * 1.02, 0.2), at(px, y, pz), C.roof);
      add('solid', block(w * 1.42, 0.03, w * 1.42, 0.01), at(px, y - 0.012, pz), C.roofEdge);
      y += 0.13;
      await pause();
    }
    // The spire.
    add('solid', cylinder(0.012, 0.02, 0.5, 8), at(px, y, pz), C.gold);
    for (let ring = 0; ring < 4; ring += 1) add('solid', cylinder(0.05 - ring * 0.008, 0.05 - ring * 0.008, 0.02, 12), at(px, y + 0.12 + ring * 0.08, pz), C.gold);
    // Stepping stones down to the water.
    for (const [sx, sz] of [
      [2.35, -2.2],
      [2.0, -1.95],
      [1.7, -1.72],
    ]) {
      add('solid', cylinder(0.14, 0.16, 0.035, 9), at(sx, 0.005, sz, { ry: sx }), C.stone, { reflect: false });
    }
  }

  await pause();

  // ---------- Bridge (back left) ----------
  // An arched footbridge over the pond's narrow arm.
  {
    const B = at(BRIDGE.x, 0, BRIDGE.z, { ry: BRIDGE.ry });
    const put = (key, geometry, local, tint) => add(key, geometry, B.clone().multiply(local), tint);
    const half = BRIDGE.length / 2;
    const arch = (x) => 0.02 + 0.3 * (1 - (x / half) ** 2);
    const planks = 13;
    for (let i = 0; i < planks; i += 1) {
      const x = -half + ((i + 0.5) / planks) * BRIDGE.length;
      const slope = Math.atan((-0.6 * x) / half ** 2);
      put('solid', block(BRIDGE.length / planks + 0.02, 0.04, 0.5, 0.008), at(x, arch(x), 0, { rz: slope }), C.wood);
      for (const z of [-0.24, 0.24]) {
        put('lacquer', block(BRIDGE.length / planks + 0.02, 0.03, 0.03, 0.008), at(x, arch(x) + 0.2, z, { rz: slope }), C.vermilion);
        if (i % 3 === 0) put('lacquer', cylinder(0.02, 0.02, 0.24, 8), at(x, arch(x) + 0.02, z), C.vermilionDark);
      }
      await pause();
    }
    for (const x of [-half, half]) {
      for (const z of [-0.24, 0.24]) {
        put('lacquer', cylinder(0.032, 0.032, 0.3, 10), at(x, 0, z), C.vermilion);
        put('solid', new THREE.SphereGeometry(0.04, 10, 8), at(x, 0.32, z), C.gold);
      }
    }
  }
  await pause();

  // ---------- Trees ----------
  const crown = faceted(new THREE.IcosahedronGeometry(1, 1));
  const disc = faceted(new THREE.IcosahedronGeometry(1, 0));
  async function blossom(x, z, size, palette) {
    const turn = x * 3 + z;
    add('solid', cylinder(size * 0.07, size * 0.12, size * 0.85, 6), at(x, 0, z, { rz: Math.sin(turn) * 0.12 }), C.trunk);
    const lobes = [
      [0, 1.15, 0, 0.62],
      [0.5, 0.95, 0.15, 0.45],
      [-0.4, 1.0, -0.3, 0.42],
      [0.1, 1.45, -0.2, 0.36],
    ];
    lobes.forEach(([dx, dy, dz, r], i) => {
      const cos = Math.cos(turn);
      const sin = Math.sin(turn);
      add(
        'solid',
        crown,
        at(x + (dx * cos - dz * sin) * size, dy * size, z + (dx * sin + dz * cos) * size, { s: r * size, sy: r * size * 0.85, ry: turn + i }),
        palette[i % palette.length],
      );
    });
    await pause();
  }
  async function pine(x, z, size) {
    add('solid', cylinder(size * 0.05, size * 0.09, size * 1.3, 6), at(x, 0, z, { rz: 0.1 }), C.trunk);
    [
      [0.1, 0.7, 0.5],
      [-0.18, 1.0, 0.4],
      [0.12, 1.28, 0.3],
    ].forEach(([dx, dy, r], i) => {
      add('solid', disc, at(x + dx * size, dy * size, z + dx * size * 0.5, { s: r * size, sy: r * size * 0.32, ry: i * 1.3 + x }), C.pine[i]);
    });
    await pause();
  }
  const cherries = [
    [-0.7, -2.85, 0.95],
    [0.9, -3.15, 0.8],
    [-4.15, 2.95, 0.85],
    [4.25, -1.6, 0.7],
  ];
  for (const [x, z, size] of cherries) await blossom(x, z, size, C.cherry);
  await blossom(1.55, -2.55, 0.62, C.maple);
  await blossom(-4.3, -3.1, 0.75, C.maple);
  await blossom(4.2, 1.2, 0.6, C.maple);
  await pine(-4.3, 0.5, 0.95);
  await pine(-4.25, -0.75, 0.7);
  await pine(4.15, 3.05, 0.9);
  await pine(-1.75, -3.3, 0.75);

  // ---------- Stone lanterns ----------
  async function lantern(x, z, size = 1) {
    const s = size;
    add('solid', block(0.2 * s, 0.05 * s, 0.2 * s, 0.01), at(x, 0, z), C.stoneDark);
    add('solid', cylinder(0.035 * s, 0.045 * s, 0.26 * s, 8), at(x, 0.05 * s, z), C.stone);
    add('solid', block(0.17 * s, 0.035 * s, 0.17 * s, 0.01), at(x, 0.31 * s, z), C.stone);
    add('glow', block(0.1 * s, 0.1 * s, 0.1 * s, 0.01), at(x, 0.345 * s, z), C.warm);
    for (const [dx, dz] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      add('solid', block(0.02 * s, 0.1 * s, 0.02 * s, 0.004), at(x + dx * 0.05 * s, 0.345 * s, z + dz * 0.05 * s), C.stoneDark);
    }
    add('solid', pyramid(0.17 * s, 0.09 * s), at(x, 0.445 * s, z), C.stoneDark);
    add('solid', new THREE.SphereGeometry(0.022 * s, 8, 6), at(x, 0.55 * s, z), C.stone);
    glow(x, 0.4 * s, z, 0.95 * s, C.warm, 0.75);
    await pause();
  }
  for (const [x, z, size] of [
    [-2.25, -2.95, 1.1],
    [-3.75, -1.25, 1.1],
    [1.25, -2.05, 1],
    [3.95, 0.3, 1],
    [0.9, 3.45, 1.1],
    [-3.05, 3.2, 1],
    [4.05, -3.0, 1],
  ]) {
    await lantern(x, z, size);
  }

  // ---------- Rocks, bushes and lily pads ----------
  const rock = faceted(new THREE.DodecahedronGeometry(1, 0));
  // Along the water's edge, half in the shallows.
  for (let i = 0; i < outline.length; i += 1) {
    if (rand() > 0.2) continue;
    const p = outline[i];
    if (Math.hypot(p.x - BRIDGE.x, p.z - BRIDGE.z) < 0.9) continue;
    const s = between(0.09, 0.22);
    add('solid', rock, at(p.x, between(-0.06, 0.0), p.z, { sx: s, sy: s * between(0.5, 0.8), sz: s * between(0.7, 1.1), ry: rand() * 6 }), C.rock[i % 3]);
    await pause();
  }
  // Two rocks standing in the water.
  add('solid', rock, at(-1.9, -0.1, 1.5, { sx: 0.34, sy: 0.3, sz: 0.28, ry: 0.6 }), C.rock[0]);
  add('solid', rock, at(-1.55, -0.08, 1.75, { sx: 0.18, sy: 0.14, sz: 0.2, ry: 1.9 }), C.rock[1]);
  add('solid', rock, at(2.5, -0.1, 1.35, { sx: 0.26, sy: 0.2, sz: 0.3, ry: 2.4 }), C.rock[2]);

  const bush = faceted(new THREE.IcosahedronGeometry(1, 0));
  for (let placed = 0, tries = 0; placed < 26 && tries < 400; tries += 1) {
    const x = between(-4.6, 4.6);
    const z = between(-3.6, 3.6);
    if (!onLand(x, z, 0.22) || Math.hypot(x - 2.95, z + 2.75) < 1.05) continue;
    const s = between(0.08, 0.17);
    add('solid', bush, at(x, s * 0.25, z, { sx: s * 1.3, sy: s * 0.8, sz: s * 1.2, ry: rand() * 6 }), rand() < 0.7 ? C.mossLight : C.pine[0]);
    placed += 1;
    await pause();
  }

  const pad = new THREE.CircleGeometry(1, 9, 0.5, Math.PI * 2 - 0.9).rotateX(-Math.PI / 2);
  const petal = faceted(new THREE.OctahedronGeometry(1, 0));
  for (let placed = 0, tries = 0; placed < 22 && tries < 500; tries += 1) {
    const x = between(-3.6, 3.6);
    const z = between(-1.6, 3.0);
    if (!inWater(x, z, 0.28) || Math.hypot(x - TORII.x, z - TORII.z) < 1.9) continue;
    const s = between(0.07, 0.13);
    add('solid', pad, at(x, WATER + 0.008, z, { s, ry: rand() * 6 }), C.pad, { reflect: false, shadow: false });
    if (placed % 4 === 0) add('solid', petal, at(x, WATER + 0.035, z, { sx: s * 0.45, sy: s * 0.4, sz: s * 0.45, ry: rand() }), C.lotus, { reflect: false });
    placed += 1;
    await pause();
  }

  // ---------- Koi ----------
  {
    const bodyGeometry = new THREE.SphereGeometry(1, 10, 6).scale(0.13, 0.035, 0.045);
    const tailGeometry = new THREE.ConeGeometry(0.045, 0.1, 4).rotateZ(Math.PI / 2).scale(1, 0.5, 1).translate(-0.05, 0, 0);
    extra.push(bodyGeometry, tailGeometry);
    const paints = ['#ff7a2e', '#fff1e6', '#ffb347', '#ff5a36', '#ffffff', '#ff8f4a', '#f7c873'];
    for (const [i, paint] of paints.entries()) {
      const material = new THREE.MeshBasicMaterial({ color: paint });
      extra.push(material);
      const fish = new THREE.Group();
      const tail = new THREE.Mesh(tailGeometry, material);
      tail.position.x = -0.12;
      fish.add(new THREE.Mesh(bodyGeometry, material), tail);
      fish.position.y = WATER - 0.1 - (i % 3) * 0.03;
      group.add(fish);
      const cx = TORII.x + between(-0.9, 0.9);
      const cz = 0.7 + between(-0.4, 0.5);
      const rx = between(0.7, 1.9);
      const rz = between(0.5, 1.15);
      const speed = between(0.16, 0.3) * (i % 2 ? 1 : -1);
      const phase = rand() * 6.28;
      movers.push((t) => {
        const a = phase + t * speed;
        fish.position.x = cx + Math.cos(a) * rx;
        fish.position.z = cz + Math.sin(a) * rz;
        // Nose along the way it swims.
        fish.rotation.y = -Math.atan2(Math.cos(a) * rz * speed, -Math.sin(a) * rx * speed);
        tail.rotation.y = Math.sin(t * 6 + phase) * 0.5;
      });
      await pause();
    }
  }

  // ---------- Lanterns afloat ----------
  {
    const paper = block(0.085, 0.085, 0.085, 0.012);
    const tray = block(0.12, 0.014, 0.12, 0.004);
    extra.push(paper, tray);
    const paperMaterial = new THREE.MeshBasicMaterial({ color: C.paper, toneMapped: false });
    const trayMaterial = new THREE.MeshStandardMaterial({ color: C.wood, roughness: 0.8 });
    extra.push(paperMaterial, trayMaterial);
    const spots = [
      [1.9, 1.5],
      [-0.9, 2.1],
      [-2.4, 0.6],
      [2.6, 0.1],
      [0.6, 2.4],
      [-1.2, -0.9],
    ];
    for (const [i, [x, z]] of spots.entries()) {
      const boat = new THREE.Group();
      const light = new THREE.Mesh(paper, paperMaterial);
      light.position.y = 0.014;
      const shine = glowSprite(C.warm, 0.55, 0.55);
      shine.position.y = 0.06;
      const below = glowSprite(C.warm, 0.5, 0.28);
      below.position.y = -0.1;
      boat.add(new THREE.Mesh(tray, trayMaterial), light, shine, below);
      group.add(boat);
      extra.push(shine.material, below.material);
      const phase = i * 1.7;
      movers.push((t) => {
        boat.position.set(x + Math.sin(t * 0.11 + phase) * 0.22, WATER + Math.sin(t * 1.3 + phase) * 0.006, z + Math.cos(t * 0.09 + phase) * 0.18);
        boat.rotation.y = t * 0.05 + phase;
      });
      await pause();
    }
  }

  // ---------- Ripples ----------
  // Rings spreading from the pillars and here and there on the pond.
  {
    const ring = new THREE.RingGeometry(0.93, 1, 40).rotateX(-Math.PI / 2);
    extra.push(ring);
    const cos = Math.cos(TORII.ry) * TORII.s;
    const sin = Math.sin(TORII.ry) * TORII.s;
    const sources = [
      [TORII.x + 1.15 * cos, TORII.z - 1.15 * sin, 0.55, 0],
      [TORII.x - 1.15 * cos, TORII.z + 1.15 * sin, 0.55, 1.6],
      [TORII.x + 1.15 * cos, TORII.z - 1.15 * sin, 0.55, 2.4],
      [TORII.x - 1.15 * cos, TORII.z + 1.15 * sin, 0.55, 4.0],
      [-1.9, 1.5, 0.6, 0.8],
      [2.1, 2.0, 0.4, 3.1],
    ];
    for (const [x, z, reach, offset] of sources) {
      const material = new THREE.MeshBasicMaterial({
        color: '#bcd8ff',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      extra.push(material);
      const mesh = new THREE.Mesh(ring, material);
      mesh.position.set(x, WATER + 0.004, z);
      mesh.renderOrder = 3;
      group.add(mesh);
      movers.push((t) => {
        const f = ((t + offset) % 4.8) / 4.8;
        mesh.scale.setScalar(0.14 + f * reach);
        material.opacity = 0.34 * (1 - f) ** 1.5;
      });
      await pause();
    }
  }

  // ---------- Falling petals ----------
  {
    const count = 54;
    const geometry = new THREE.PlaneGeometry(0.045, 0.03);
    const material = new THREE.MeshBasicMaterial({ color: '#ffc9df', side: THREE.DoubleSide, toneMapped: false });
    const petals = new THREE.InstancedMesh(geometry, material, count);
    petals.frustumCulled = false;
    extra.push(geometry, material);
    group.add(petals);
    const dummy = new THREE.Object3D();
    const seeds = Array.from({ length: count }, (_, i) => {
      const [x, z, size] = cherries[i % cherries.length];
      return {
        x: x + between(-0.5, 0.5) * size,
        z: z + between(-0.5, 0.5) * size,
        top: size * between(0.9, 1.5),
        driftX: between(0.25, 0.9),
        driftZ: between(0.3, 1.0),
        fall: between(0.11, 0.2),
        phase: rand() * 30,
        spin: between(1, 3),
      };
    });
    const place = (t) => {
      seeds.forEach((s, i) => {
        const span = (s.top - WATER) / s.fall;
        const f = ((t + s.phase) % span) / span;
        dummy.position.set(
          s.x + f * s.driftX + Math.sin(t * 0.9 + s.phase) * 0.06,
          s.top - f * (s.top - WATER),
          s.z + f * s.driftZ + Math.cos(t * 0.7 + s.phase) * 0.06,
        );
        dummy.rotation.set(t * s.spin + s.phase, s.phase, t * s.spin * 0.6);
        // Shrinks away as it lands.
        dummy.scale.setScalar(f > 0.94 ? (1 - f) / 0.06 : 1);
        dummy.updateMatrix();
        petals.setMatrixAt(i, dummy.matrix);
      });
      petals.instanceMatrix.needsUpdate = true;
    };
    place(0);
    movers.push(place);
  }
  await pause();

  // ---------- Halos, reflections and the merged static parts ----------
  // Soft halos around lights, in one draw: sized in world units.
  const haloGeometry = new THREE.BufferGeometry();
  haloGeometry.setAttribute('position', new THREE.Float32BufferAttribute(glows.flatMap(([x, y, z]) => [x, y, z]), 3));
  haloGeometry.setAttribute('size', new THREE.Float32BufferAttribute(glows.map((g) => g[3]), 1));
  haloGeometry.setAttribute(
    'tint',
    new THREE.Float32BufferAttribute(
      glows.flatMap(([, , , , tint, strength]) => {
        const c = color(tint);
        return [c.r, c.g, c.b, strength];
      }),
      4,
    ),
  );
  const haloMaterial = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: halo() }, uScale: { value: 500 } },
    vertexShader: /* glsl */ `
      attribute float size;
      attribute vec4 tint;
      uniform float uScale;
      varying vec4 vTint;
      void main() {
        vTint = tint;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      varying vec4 vTint;
      void main() {
        gl_FragColor = vec4(vTint.rgb, texture2D(uMap, gl_PointCoord).a * vTint.a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const halos = new THREE.Points(haloGeometry, haloMaterial);
  halos.frustumCulled = false;
  halos.renderOrder = 4;
  group.add(halos);
  extra.push(haloGeometry, haloMaterial);
  await pause();

  const reflections = await mirror.build({ mirror: mirrorMaterial }, { castShadow: false, receiveShadow: false, pause });
  reflections.children.forEach((mesh) => {
    mesh.renderOrder = 1;
  });
  group.add(reflections);

  const statics = await batch.build(materials, { pause });
  group.add(statics);

  return {
    group,
    // Pixels per world unit at distance 1, for the halos.
    setPixelScale(value) {
      haloMaterial.uniforms.uScale.value = value;
    },
    update(t) {
      for (const move of movers) move(t);
    },
    dispose() {
      statics.traverse((child) => child.geometry?.dispose());
      reflections.traverse((child) => child.geometry?.dispose());
      Object.values(materials).forEach((m) => m.dispose());
      extra.forEach((item) => item.dispose());
    },
  };
}
