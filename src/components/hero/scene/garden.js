import * as THREE from 'three';
import { at, Batch, block, color, cylinder, faceted, glowSprite, halo } from './kit';
import { NEEDS } from './parts';

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
  dusk: '#8b6bff',
  paper: '#ffcf8a',
  deep: '#081428',
  wood: '#5a3b33',
  bamboo: ['#8fbf55', '#7aa848', '#a3cc66'],
  bambooDark: '#55803a',
  leaf: ['#9ad05c', '#6fa644', '#b6dd72'],
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
//
// With `split` (the playground), every part of the garden (see parts.js) is
// kept in meshes of its own, so it can be switched off; otherwise everything
// still is merged into one mesh per material.
export async function buildGarden({ pause = async () => {}, split = false } = {}) {
  const rand = seeded(7);
  const between = (min, max) => min + rand() * (max - min);
  const batch = new Batch({ split });
  const mirror = new Batch({ split }); // the same parts upside down, seen in the water
  const group = new THREE.Group();
  // What's being built now. A part (see parts.js) is what a switch in the
  // playground turns off; a unit is one thing of it that can be picked up and
  // moved: one tree, one lantern, the whole torii. Everything added belongs to
  // the unit that was begun last.
  let part = 'base';
  let unit = 'base';
  const units = new Map();
  const counts = {};
  function begin(id, { x = 0, z = 0, movable = true, type = id, added = false, size = 0.5, kind } = {}) {
    counts[id] = (counts[id] ?? 0) + 1;
    part = id;
    unit = `${id}#${counts[id] - 1}`;
    units.set(unit, { id: unit, part, type, kind, x, z, dx: 0, dz: 0, movable, added, size, hidden: false, live: null });
    return unit;
  }
  const resume = (id) => {
    unit = id;
    part = units.get(id).part;
  };
  // Things that move are added one by one. In the playground each unit's
  // are kept in a group of its own, so the unit can be moved as one.
  const keep = (...objects) => {
    if (!split) {
      group.add(...objects);
      return;
    }
    const owner = units.get(unit);
    if (!owner.live) {
      owner.live = new THREE.Group();
      owner.live.userData = { part, unit };
      group.add(owner.live);
    }
    owner.live.add(...objects);
  };
  // Animations, by unit (so they stop when the unit is taken away).
  const movers = [];
  const animate = (fn) => movers.push({ unit, fn });
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
    uniforms: { uWater: { value: WATER }, uDepth: { value: DEPTH - 0.05 }, uHalf: { value: new THREE.Vector2(4.94, 3.94) } },
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
      uniform vec2 uHalf;
      varying vec3 vColor;
      varying float vY;
      varying vec2 vPlan;
      void main() {
        if (vY > uWater) discard;
        // Nothing may show outside the base (a mirrored branch that overhangs it).
        vec2 q = abs(vPlan) - (uHalf - 0.86);
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
    batch.add(key, geometry, transform, tint, { shadow, part: unit });
    if (reflect) {
      const c = color(tint ?? '#ffffff').multiplyScalar(REFLECTED[key] ?? 1);
      mirror.add('mirror', geometry, FLIP.clone().multiply(transform), c, { part: unit });
    }
  }

  const shine = (x, y, z, size, tint, strength = 1) => glows.push([x, y, z, size, tint, strength, unit]);
  const glow = (x, y, z, size, tint, strength = 1) => {
    shine(x, y, z, size, tint, strength);
    // And its reflection, unless that would fall below the base.
    const mirrored = 2 * WATER - y;
    if (mirrored > -DEPTH + 0.2) shine(x, mirrored, z, size * 0.9, tint, strength * 0.45);
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
  const centre = outline2d.reduce((sum, p) => sum.add(p), new THREE.Vector2()).divideScalar(outline2d.length);
  const waterMaterial = new THREE.MeshStandardMaterial({
    color: '#2c6cc4',
    roughness: 0.18,
    metalness: 0.35,
    transparent: true,
    opacity: 0.52,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  extra.push(waterMaterial);

  // The playground's ground can grow, and have more ponds dug into it. The
  // lake is a hole in the land's shape, as on the home page; extra ponds are
  // cut out when the land is drawn (their shapes may overlap each other and
  // the lake, which is how the lake is extended), and one sheet of water
  // lies under all of it, showing wherever the land is open.
  const MAX_PONDS = 12;
  const plate = { x: 5, z: 4 };
  const ponds = { value: Array.from({ length: MAX_PONDS }, () => new THREE.Vector3()) };
  const pondCount = { value: 0 };
  const carved = (material, shore = false) => {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uPonds = ponds;
      shader.uniforms.uPondCount = pondCount;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWorld;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform vec3 uPonds[${MAX_PONDS}];
          uniform int uPondCount;
          varying vec3 vWorld;
          // How far outside the nearest pond's wavy edge (negative: inside).
          float pondEdge() {
            float d = 1000.0;
            for (int i = 0; i < ${MAX_PONDS}; i++) {
              if (i >= uPondCount) break;
              vec2 q = vWorld.xz - uPonds[i].xy;
              float a = atan(q.y, q.x);
              float r = uPonds[i].z * (1.0 + 0.07 * sin(a * 3.0 + float(i) * 1.7) + 0.045 * sin(a * 5.0 + float(i)));
              d = min(d, length(q) - r);
            }
            return d;
          }`,
        )
        .replace('void main() {', 'void main() {\nfloat pondD = pondEdge();\nif (pondD < 0.0) discard;')
        .replace(
          '#include <color_fragment>',
          shore
            ? '#include <color_fragment>\nif (vWorld.y > -0.01) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.27, 0.24, 0.37), 1.0 - smoothstep(0.0, 0.13, pondD));'
            : '#include <color_fragment>',
        );
    };
    return material;
  };
  const ground = new THREE.Group();
  const groundMaterials = split
    ? {
        land: carved(new THREE.MeshStandardMaterial({ color: C.moss, roughness: 0.85 }), true),
        body: carved(new THREE.MeshStandardMaterial({ color: C.strata, roughness: 0.85 })),
        shore: new THREE.MeshStandardMaterial({ color: C.shore, roughness: 0.85 }),
        seam: new THREE.MeshBasicMaterial({ color: '#8b5cff', toneMapped: false }),
        bed: new THREE.MeshBasicMaterial({ color: C.deep, side: THREE.DoubleSide }),
      }
    : {};
  extra.push(...Object.values(groundMaterials));
  function layGround() {
    for (const mesh of ground.children) mesh.geometry.dispose();
    ground.clear();
    const { x: hx, z: hz } = plate;
    const slab = (inset, radius, depth, holes) => {
      const shape = roundedShape(hx - inset, hz - inset, radius);
      shape.holes.push(...holes);
      return depth
        ? flat(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 8 }))
        : flat(new THREE.ShapeGeometry(shape));
    };
    const mesh = (geometry, material, y = 0, shadows = true) => {
      const m = new THREE.Mesh(geometry, material);
      m.position.y = y;
      m.castShadow = shadows;
      m.receiveShadow = shadows;
      m.userData.part = 'base';
      ground.add(m);
      return m;
    };
    mesh(slab(0, 0.9, 0.16, [pondHole()]), groundMaterials.land);
    mesh(slab(0.06, 0.86, DEPTH - 0.2, [pondHole()]), groundMaterials.body, -0.2);
    mesh(slab(0.03, 0.88, 0.045, [roundedShape(hx - 0.1, hz - 0.1, 0.84)]), groundMaterials.seam, -0.158, false);
    mesh(slab(0.1, 0.84, 0, []), groundMaterials.bed, -DEPTH + 0.01, false);
    const rim = new THREE.Shape(outline2d.map((p) => p.clone().sub(centre).multiplyScalar(1.07).add(centre)));
    rim.holes.push(pondHole());
    const shore = mesh(flat(new THREE.ShapeGeometry(rim)).scale(1, -1, 1), groundMaterials.shore, 0.006);
    shore.castShadow = false;
    const water = mesh(slab(0.1, 0.84, 0, []), waterMaterial, WATER, false);
    water.renderOrder = 2;
    mirrorMaterial.uniforms.uHalf.value.set(hx - 0.06, hz - 0.06);
  }

  if (split) {
    layGround();
    group.add(ground);
  } else {
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

    const shore = new THREE.Shape(outline2d.map((p) => p.clone().sub(centre).multiplyScalar(1.07).add(centre)));
    shore.holes.push(pondHole());
    add('solid', flat(new THREE.ShapeGeometry(shore)).scale(1, -1, 1), at(0, 0.006, 0), C.shore, { reflect: false, shadow: false });

    // Water: see-through, so the reflections and the koi show.
    const water = new THREE.Mesh(flat(new THREE.ShapeGeometry(new THREE.Shape(outline2d))), waterMaterial);
    water.position.y = WATER;
    water.renderOrder = 2;
    group.add(water);
    extra.push(water.geometry);
  }

  await pause();

  // ---------- The torii ----------
  // The great gate in the water: two pillars, each braced by a smaller post
  // in front and behind, under a curved, roofed lintel.
  const toriiUnit = begin('torii', { x: TORII.x, z: TORII.z, size: 1.7 });
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
    // The gate glows a little in the dusk, and so does the water at its feet.
    shine(TORII.x, 1.3 * TORII.s, TORII.z, 2.3 * TORII.s, C.vermilion, 0.22);
    glow(TORII.x, 1.67 * TORII.s, TORII.z, 0.9, C.gold, 0.4);
    for (const side of [-1, 1]) {
      const foot = new THREE.Vector3(side * 1.15, 0, 0).applyMatrix4(T);
      shine(foot.x, WATER + 0.03, foot.z, 1.5, C.vermilion, 0.22);
    }
    shine(TORII.x, WATER + 0.03, TORII.z + 1.5, 2.6, C.dusk, 0.2);
  }

  await pause();

  // ---------- Pagoda (back right) ----------
  begin('pagoda', { x: 2.95, z: -2.75, size: 1.0 });
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
  begin('bridge', { x: BRIDGE.x, z: BRIDGE.z, size: 1.1 });
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
  async function blossom(x, z, size, palette, options) {
    begin('trees', { x, z, size: size * 0.7, type: palette === C.cherry ? 'cherry' : 'maple', ...options });
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
  async function pine(x, z, size, options) {
    begin('trees', { x, z, size: size * 0.6, type: 'pine', ...options });
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
    [-1.6, 3.5, 0.72],
    [4.25, -1.6, 0.7],
  ];
  for (const [x, z, size] of cherries) await blossom(x, z, size, C.cherry);
  await blossom(1.55, -2.55, 0.62, C.maple);
  await blossom(-4.3, -3.1, 0.75, C.maple);
  await blossom(4.2, 1.2, 0.6, C.maple);
  await pine(-4.55, -0.4, 0.7);
  await pine(-4.25, -0.75, 0.7);
  await pine(4.15, 3.05, 0.9);
  await pine(-1.75, -3.3, 0.75);

  // ---------- Stone lanterns ----------
  async function lantern(x, z, size = 1, options) {
    begin('lanterns', { x, z, size: 0.3, type: 'lantern', ...options });
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
    // Beside the bridge's two ends, clear of the way across.
    [-1.93, -2.72, 1.1],
    [-4.08, -1.52, 1.1],
    [1.25, -2.05, 1],
    [3.95, 0.3, 1],
    [0.9, 3.45, 1.1],
    [-3.05, 3.2, 1],
    [4.05, -3.0, 1],
  ]) {
    await lantern(x, z, size);
  }

  // ---------- Rocks, bushes and lily pads ----------
  begin('rocks', { movable: false });
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

  begin('lilies', { movable: false });
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

  // ---------- Bamboo (a maker, used by the mountain and the playground) ----------
  // Thin jointed canes with a few leaves near the top. Placed by numbers of
  // their own, like the living things further down, so nothing else moves.
  const grove = seeded(41);
  const some = (min, max) => min + grove() * (max - min);
  const leaf = faceted(new THREE.OctahedronGeometry(1, 0));
  function cane(x, z, i) {
    const height = some(0.9, 1.5);
    const lean = { rx: some(-0.07, 0.07), rz: some(-0.07, 0.07) };
    const green = C.bamboo[i % C.bamboo.length];
    add('solid', cylinder(0.022, 0.03, height, 6), at(x, 0, z, lean), green);
    // The joints.
    for (let y = 0.3; y < height - 0.1; y += 0.32) {
      add('solid', cylinder(0.034, 0.034, 0.014, 6), at(x - lean.rz * y, y, z + lean.rx * y), C.bambooDark, { reflect: false });
    }
    for (let k = 0; k < 6; k += 1) {
      const y = height * some(0.55, 1.0);
      const turn = some(0, 6.28);
      const length = some(0.13, 0.2);
      add(
        'solid',
        leaf,
        at(x - lean.rz * y + Math.cos(turn) * length * 0.8, y, z + lean.rx * y - Math.sin(turn) * length * 0.8, {
          sx: length,
          sy: 0.012,
          sz: 0.035,
          ry: turn,
          rz: some(-0.7, -0.2),
        }),
        C.leaf[k % C.leaf.length],
        { reflect: false },
      );
    }
  }

  // ---------- Mountain, waterfall and bamboo ----------
  // The left corner is a mountain, with a spring that steps down a cliff at
  // its foot into the pond and bamboo at either end.
  {
    const FALL = { x: -3.9, z: 1.4, step: 0.55, top: 1.2 };
    const fallUnit = begin('waterfall', { x: FALL.x + 0.1, z: FALL.z, size: 0.9 });
    // A small cliff of stacked slabs in two tiers, its front standing in the
    // shallows: the water drops from the top onto the lower tier, crosses it
    // and drops again into the pond. Rock walls hug the water all the way
    // down, so it runs in a channel and its edges never show.
    for (const [dx, y, dz, w, h, d, ry, tint] of [
      [-0.02, -0.14, 0.0, 1.0, 0.34, 1.12, 0.03, 1],
      [-0.03, 0.2, 0.02, 1.02, 0.18, 1.04, -0.04, 0],
      [-0.02, 0.38, -0.02, 0.96, 0.17, 0.98, 0.05, 2],
      [-0.28, 0.55, 0.0, 0.56, 0.22, 0.92, -0.06, 0],
      [-0.3, 0.77, 0.02, 0.5, 0.2, 0.84, 0.09, 1],
      [-0.32, 0.97, -0.02, 0.46, 0.23, 0.8, -0.04, 2],
      // Either side of the channel along the top...
      [-0.28, 1.2, 0.3, 0.36, 0.1, 0.16, 0.08, 0],
      [-0.3, 1.2, -0.31, 0.38, 0.13, 0.16, -0.06, 1],
      // ...down the upper fall...
      [0.09, 0.55, 0.33, 0.3, 0.74, 0.15, 0.05, 2],
      [0.1, 0.55, -0.34, 0.3, 0.8, 0.15, -0.04, 0],
      // ...across the lower tier...
      [0.3, 0.55, 0.36, 0.26, 0.2, 0.15, -0.05, 1],
      [0.31, 0.55, -0.37, 0.26, 0.24, 0.15, 0.06, 2],
      // ...and down the lower fall, into the pond.
      [0.52, -0.14, 0.4, 0.22, 0.8, 0.17, 0.04, 0],
      [0.53, -0.14, -0.41, 0.22, 0.86, 0.17, -0.05, 1],
    ]) {
      add('solid', block(w, h, d, 0.03), at(FALL.x + dx, y, FALL.z + dz, { ry }), C.rock[tint]);
    }
    // Fallen boulders at its foot.
    for (const [dx, dz, sx, sy, sz, ry, tint] of [
      [0.5, 0.62, 0.2, 0.15, 0.2, 0.9, 2],
      [0.48, -0.64, 0.17, 0.12, 0.2, 3.0, 0],
      [0.2, 0.74, 0.16, 0.12, 0.15, 1.6, 1],
    ]) {
      add('solid', rock, at(FALL.x + dx, 0, FALL.z + dz, { sx, sy, sz, ry }), C.rock[tint]);
    }
    await pause();

    const canes = [
      [-0.12, -1.72], [-0.3, -1.85], [-0.48, -1.7], [-0.22, -2.02], [-0.42, -1.98], [-0.05, -1.92],
      [0.72, 1.98], [0.88, 2.12], [0.78, 2.26], [0.98, 1.95], [1.04, 2.2], [0.9, 2.32],
    ];
    // The mountain: it fills the whole corner and stands twice as tall as
    // the torii. Blunt, flat-topped masses with roughened sides, the tallest
    // behind the falls; the spring's channel starts inside it, and a shoulder
    // on either side puts the falls in a gorge.
    begin('mountain', { x: FALL.x - 0.45, z: FALL.z + 0.4, size: 1.6 });
    const mass = (sides) => {
      const geometry = new THREE.CylinderGeometry(0.42, 1, 1, sides, 5).translate(0, 0.5, 0);
      const spot = geometry.attributes.position;
      for (let i = 0; i < spot.count; i += 1) {
        const [x, y, z] = [spot.getX(i), spot.getY(i), spot.getZ(i)];
        // The same push for every copy of a corner, so the faces stay joined.
        const noise = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
        const push = 1 + (noise - Math.floor(noise) - 0.5) * 0.3;
        spot.setXYZ(i, x * push, y, z * push);
      }
      return faceted(geometry);
    };
    const masses = [
      [-0.64, 0.3, 0.56, 5.7, 1.6, 0, '#7d77a0'],
      [-0.62, 1.45, 0.58, 4.5, 1.0, 0.4, '#6c668e'],
      [-0.25, 1.72, 0.84, 3.6, 0.86, 0.9, '#8680a8'],
      [-0.26, 0.98, 0.68, 1.7, 0.5, 0, '#8a84ac'],
      [-0.3, -1.04, 0.68, 2.1, 0.6, 0, '#847ea6'],
      [-0.66, -0.6, 0.5, 3.4, 0.8, 0.6, '#746e98'],
    ];
    for (const [dx, dz, rx, height, rz, ry, tint] of masses) {
      add('solid', mass(8), at(FALL.x + dx, 0, FALL.z + dz, { sx: rx, sy: height, sz: rz, ry }), tint);
      await pause();
    }
    // Scrub clinging to the slopes that face the pond, and growing on the
    // flat tops.
    for (const [dx, dz, rx, height, rz] of masses) {
      for (let k = 0; k < 12; k += 1) {
        const up = some(0.04, 0.75);
        const round = some(-1.3, 1.3);
        const wide = 1 - up * 0.58;
        const size = some(0.1, 0.19);
        add(
          'solid',
          bush,
          at(FALL.x + dx + Math.cos(round) * rx * wide * 0.97, height * up, FALL.z + dz + Math.sin(round) * rz * wide * 0.97, {
            sx: size * 1.2,
            sy: size * 0.7,
            sz: size * 1.2,
            ry: k * 1.3,
          }),
          [C.mossLight, C.pine[0], C.pine[2], C.moss][k % 4],
          { reflect: false },
        );
      }
      for (let k = 0; k < 4; k += 1) {
        const size = some(0.12, 0.2);
        add(
          'solid',
          bush,
          at(FALL.x + dx + some(-0.3, 0.3) * rx, height, FALL.z + dz + some(-0.3, 0.3) * rz, { sx: size * 1.3, sy: size * 0.5, sz: size * 1.3, ry: k * 2.1 }),
          [C.mossLight, C.pine[2], C.pad, C.pine[0]][k],
          { reflect: false },
        );
      }
      await pause();
    }

    // Bamboo: thin jointed canes with a few leaves near the top, in two
    // stands at the mountain's two ends.
    for (const [i, [dx, dz]] of canes.entries()) {
      // Two stands, six canes each.
      if (i % 6 === 0) {
        const stand = canes.slice(i, i + 6);
        begin('bamboo', {
          x: FALL.x + stand.reduce((sum, c) => sum + c[0], 0) / 6,
          z: FALL.z + stand.reduce((sum, c) => sum + c[1], 0) / 6,
          size: 0.45,
        });
      }
      cane(FALL.x + dx, FALL.z + dz, i);
      await pause();
    }

    resume(fallUnit);
    // Moss on the ledges and tops, with a few fronds hanging from it.
    for (const [i, [dx, y, dz, size]] of [
      [-0.44, 1.2, 0.14, 0.13], [-0.42, 1.2, -0.12, 0.11], [-0.24, 1.3, 0.31, 0.12], [-0.26, 1.33, -0.32, 0.13],
      [0.1, 1.29, 0.33, 0.12], [0.12, 1.35, -0.34, 0.11], [0.3, 0.75, 0.37, 0.1], [0.32, 0.79, -0.38, 0.1],
      [0.52, 0.66, 0.4, 0.1], [0.54, 0.72, -0.41, 0.1], [-0.1, 0.55, 0.47, 0.14], [-0.06, 0.55, -0.48, 0.13],
      [0.2, 0.55, 0.5, 0.1], [-0.36, 0.38, 0.5, 0.11], [-0.3, 0.2, -0.54, 0.12], [0.3, 0.2, 0.55, 0.1],
      [0.36, 0.38, -0.5, 0.09], [-0.5, 0.77, 0.36, 0.11], [-0.52, 0.97, -0.3, 0.1], [0.46, 0.2, -0.55, 0.1],
    ].entries()) {
      const x = FALL.x + dx;
      const z = FALL.z + dz;
      const tint = [C.mossLight, C.pad, C.pine[2], C.leaf[1]][i % 4];
      add('solid', bush, at(x, y, z, { sx: size * 1.25, sy: size * 0.42, sz: size * 1.1, ry: i * 1.7 }), tint, { reflect: false });
      if (i % 2) continue;
      for (let k = 0; k < 3; k += 1) {
        const turn = i + k * 2.1;
        const length = some(0.08, 0.13);
        add(
          'solid',
          leaf,
          at(x + Math.cos(turn) * length * 0.9, y + 0.02, z - Math.sin(turn) * length * 0.9, { sx: length, sy: 0.01, sz: 0.03, ry: turn, rz: -0.5 }),
          C.leaf[k % C.leaf.length],
          { reflect: false },
        );
      }
    }
    await pause();

    // The water: one ribbon that runs along the top, falls to the lower
    // tier, crosses it and falls again, widening as it goes. The pond's blue,
    // with a slow shimmer.
    const course = [
      [-0.42, FALL.top + 0.015, 0.22],
      [-0.05, FALL.top + 0.015, 0.22],
      [0.0, FALL.top - 0.08, 0.25],
      [0.03, FALL.step + 0.02, 0.26],
      [0.45, FALL.step + 0.02, 0.29],
      [0.51, FALL.step - 0.08, 0.31],
      [0.56, WATER, 0.32],
    ];
    const foot = [FALL.x + 0.58, WATER, FALL.z];
    const ribbon = new THREE.BufferGeometry();
    const spots = [];
    const uvs = [];
    const faces = [];
    let run = 0;
    course.forEach(([dx, y, half], i) => {
      if (i) run += Math.hypot(dx - course[i - 1][0], y - course[i - 1][1]);
      spots.push(FALL.x + dx, y, FALL.z - half, FALL.x + dx, y, FALL.z + half);
      uvs.push(0, -run, 1, -run);
      if (i) faces.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2 - 1, i * 2 + 1, i * 2);
    });
    ribbon.setAttribute('position', new THREE.Float32BufferAttribute(spots, 3));
    ribbon.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    ribbon.setIndex(faces);
    const fallMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          // A blue gradient, deep at the edges and paler down the middle,
          // with a slow shimmer running down it.
          float middle = 1.0 - abs(vUv.x - 0.5) * 2.0;
          float shimmer = sin(vUv.y * 9.0 + uTime * 4.5 + sin(vUv.x * 7.0) * 1.5) * 0.5 + 0.5;
          vec3 tint = mix(vec3(0.07, 0.24, 0.6), vec3(0.26, 0.52, 0.92), middle * 0.6 + shimmer * 0.28);
          float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
          gl_FragColor = vec4(tint, edge * 0.92);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const fall = new THREE.Mesh(ribbon, fallMaterial);
    fall.renderOrder = 3;
    keep(fall);
    extra.push(ribbon, fallMaterial);

    // Where it lands: white water, and rings spreading over the pond.
    const foam = glowSprite('#7fb2ff', 0.7, 0.5);
    foam.position.set(foot[0] + 0.04, WATER + 0.08, foot[2]);
    const splash = glowSprite('#7fb2ff', 0.45, 0.4);
    splash.position.set(FALL.x + 0.08, FALL.step + 0.08, FALL.z);
    keep(splash);
    extra.push(splash.material);
    const ringGeometry = new THREE.RingGeometry(0.9, 1, 32).rotateX(-Math.PI / 2);
    extra.push(foam.material, ringGeometry);
    keep(foam);
    const rings = [0, 1.1, 2.2].map((offset) => {
      const material = new THREE.MeshBasicMaterial({
        color: '#8fbcff',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(ringGeometry, material);
      mesh.position.set(foot[0] + 0.1, WATER + 0.005, foot[2]);
      mesh.renderOrder = 3;
      keep(mesh);
      extra.push(material);
      return { mesh, material, offset };
    });
    const flow = (t) => {
      fallMaterial.uniforms.uTime.value = t;
      foam.material.opacity = 0.34 + Math.sin(t * 9.0) * 0.06 + Math.sin(t * 5.3) * 0.05;
      splash.material.opacity = 0.26 + Math.sin(t * 7.0 + 1.0) * 0.06;
      for (const { mesh, material, offset } of rings) {
        const f = ((t + offset) % 3.3) / 3.3;
        mesh.scale.setScalar(0.12 + f * 0.55);
        material.opacity = 0.4 * (1 - f) ** 1.5;
      }
    };
    flow(0);
    animate(flow);
    glow(foot[0], 0.3, foot[2], 1.1, '#bcd8ff', 0.3);
  }
  await pause();

  // ---------- Deer ----------
  // The shrine's deer, on the front shore: a stag keeping watch and two does,
  // one of them grazing. Bodies are part of the still garden; only the necks
  // and heads move.
  const coat = { fur: '#c08348', dark: '#7b4b2a', pale: '#f3e6d2', antler: '#e6d8bb', nose: '#2a1d1c' };
  const furs = Object.fromEntries(
    Object.entries(coat).map(([key, value]) => [key, new THREE.MeshStandardMaterial({ color: value, roughness: 0.85, flatShading: true })]),
  );
  const shapes = {
    neck: block(0.062, 0.21, 0.062, 0.012),
    head: block(0.125, 0.062, 0.066, 0.014),
    snout: block(0.03, 0.036, 0.04, 0.008),
    ear: faceted(new THREE.OctahedronGeometry(1, 0)),
    tine: cylinder(0.004, 0.008, 1, 5),
  };
  extra.push(...Object.values(furs), ...Object.values(shapes));
  const limb = (geometry, material, x, y, z, turn = {}) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.rotation.set(turn.rx ?? 0, turn.ry ?? 0, turn.rz ?? 0);
    if (turn.scale) mesh.scale.set(...turn.scale);
    return mesh;
  };
  async function deerAt(deer, options) {
    begin('deer', { x: deer.x, z: deer.z, size: 0.32, type: deer.stag ? 'stag' : 'deer', ...options });
    const M = at(deer.x, 0, deer.z, { ry: deer.ry, s: deer.size });
    const put = (geometry, local, tint) => add('solid', geometry, M.clone().multiply(local), tint, { reflect: false });
    // Facing +x: body, rump, tail, four legs and a few spots along the back.
    put(block(0.34, 0.135, 0.12, 0.03), at(0, 0.215, 0), coat.fur);
    put(block(0.2, 0.05, 0.1, 0.02), at(0.02, 0.2, 0), coat.pale);
    put(block(0.03, 0.09, 0.1, 0.012), at(-0.165, 0.24, 0), coat.pale);
    put(block(0.035, 0.05, 0.035, 0.01), at(-0.185, 0.3, 0, { rz: 0.5 }), coat.pale);
    for (const [lx, lz, lean] of [
      [0.125, 0.04, 0.05],
      [0.125, -0.04, -0.06],
      [-0.125, 0.04, -0.08],
      [-0.125, -0.04, 0.06],
    ]) {
      put(cylinder(0.02, 0.011, 0.24, 5), at(lx, 0, lz, { rz: lean }), coat.dark);
    }
    if (!deer.stag) {
      for (const [sx, sz] of [
        [0.08, 0.03],
        [-0.02, -0.03],
        [-0.1, 0.025],
        [0.02, 0.035],
        [-0.07, -0.02],
      ]) {
        put(block(0.022, 0.008, 0.022, 0.003), at(sx, 0.346, sz), coat.pale);
      }
    }
    // The neck swings from the shoulders, and the head tips on its end.
    const body = new THREE.Group();
    body.position.set(deer.x, 0, deer.z);
    body.rotation.y = deer.ry;
    body.scale.setScalar(deer.size);
    const neck = new THREE.Group();
    neck.position.set(0.14, 0.3, 0);
    const head = new THREE.Group();
    head.position.set(0, 0.2, 0);
    head.add(
      limb(shapes.head, furs.fur, 0.035, -0.02, 0),
      limb(shapes.snout, furs.nose, 0.1, -0.012, 0),
      limb(shapes.ear, furs.dark, -0.02, 0.055, 0.04, { rx: 0.5, scale: [0.014, 0.035, 0.02] }),
      limb(shapes.ear, furs.dark, -0.02, 0.055, -0.04, { rx: -0.5, scale: [0.014, 0.035, 0.02] }),
    );
    if (deer.stag) {
      for (const side of [-1, 1]) {
        head.add(
          limb(shapes.tine, furs.antler, 0, 0.04, side * 0.022, { rx: side * 0.45, rz: 0.25, scale: [1, 0.17, 1] }),
          limb(shapes.tine, furs.antler, -0.03, 0.14, side * 0.085, { rx: side * 0.1, rz: -0.5, scale: [1, 0.1, 1] }),
          limb(shapes.tine, furs.antler, -0.022, 0.1, side * 0.062, { rx: side * 0.9, rz: -0.9, scale: [1, 0.07, 1] }),
        );
      }
    }
    neck.add(limb(shapes.neck, furs.fur, 0, 0, 0), head);
    body.add(neck);
    body.traverse((child) => {
      child.castShadow = child.isMesh === true;
    });
    keep(body);
    const smooth = (a, b, v) => {
      const k = Math.min(1, Math.max(0, (v - a) / (b - a)));
      return k * k * (3 - 2 * k);
    };
    const move = (t) => {
      if (deer.grazes) {
        // Head down to the grass, lifted now and then to look about.
        const u = (t * 0.085 + deer.phase) % 1;
        const up = smooth(0, 0.07, u) * (1 - smooth(0.26, 0.34, u));
        neck.rotation.z = -2.3 + up * 1.75 + Math.sin(t * 5.5) * 0.035 * (1 - up);
        head.rotation.z = 0.95 - up * 0.55;
        neck.rotation.y = Math.sin(t * 0.5 + deer.phase * 9) * 0.35 * up;
      } else {
        neck.rotation.z = -0.42 + Math.sin(t * 0.4) * 0.04;
        neck.rotation.y = Math.sin(t * 0.21) * 0.55;
        head.rotation.z = 0.4;
      }
    };
    move(0);
    animate(move);
    await pause();
  }
  const herd = [
    { x: 3.05, z: 3.0, ry: 2.5, size: 1.25, stag: true, phase: 0 },
    { x: 2.4, z: 3.35, ry: 3.6, size: 1.05, grazes: true, phase: 0.2 },
    { x: 1.7, z: 3.45, ry: 2.2, size: 1.0, grazes: true, phase: 0.63 },
  ];
  for (const deer of herd) await deerAt(deer);

  // ---------- Koi ----------
  begin('koi', { movable: false });
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
      keep(fish);
      const cx = TORII.x + between(-0.9, 0.9);
      const cz = 0.7 + between(-0.4, 0.5);
      const rx = between(0.7, 1.9);
      const rz = between(0.5, 1.15);
      const speed = between(0.16, 0.3) * (i % 2 ? 1 : -1);
      const phase = rand() * 6.28;
      animate((t) => {
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
  const paper = block(0.085, 0.085, 0.085, 0.012);
  const tray = block(0.12, 0.014, 0.12, 0.004);
  const paperMaterial = new THREE.MeshBasicMaterial({ color: C.paper, toneMapped: false });
  const trayMaterial = new THREE.MeshStandardMaterial({ color: C.wood, roughness: 0.8 });
  extra.push(paper, tray, paperMaterial, trayMaterial);
  async function boatAt(x, z, phase, options) {
    begin('boats', { x, z, size: 0.22, type: 'boat', ...options });
    const boat = new THREE.Group();
    const light = new THREE.Mesh(paper, paperMaterial);
    light.position.y = 0.014;
    const shine = glowSprite(C.warm, 0.55, 0.55);
    shine.position.y = 0.06;
    const below = glowSprite(C.warm, 0.5, 0.28);
    below.position.y = -0.1;
    boat.add(new THREE.Mesh(tray, trayMaterial), light, shine, below);
    keep(boat);
    extra.push(shine.material, below.material);
    const drift = (t) => {
      boat.position.set(x + Math.sin(t * 0.11 + phase) * 0.22, WATER + Math.sin(t * 1.3 + phase) * 0.006, z + Math.cos(t * 0.09 + phase) * 0.18);
      boat.rotation.y = t * 0.05 + phase;
    };
    drift(0);
    animate(drift);
    await pause();
  }
  for (const [i, [x, z]] of [
    [1.9, 1.5],
    [-0.9, 2.1],
    [-2.4, 0.6],
    [2.6, 0.1],
    [0.6, 2.4],
    [-1.2, -0.9],
  ].entries()) {
    await boatAt(x, z, i * 1.7);
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
    for (const [i, [x, z, reach, offset]] of sources.entries()) {
      // The rings round the gate's feet go with the gate.
      if (i < 4) resume(toriiUnit);
      else if (i === 4) begin('ripples', { movable: false });
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
      keep(mesh);
      animate((t) => {
        const f = ((t + offset) % 4.8) / 4.8;
        mesh.scale.setScalar(0.14 + f * reach);
        material.opacity = 0.34 * (1 - f) ** 1.5;
      });
      await pause();
    }
  }

  // ---------- Falling petals ----------
  begin('petals', { movable: false });
  {
    const count = 54;
    const geometry = new THREE.PlaneGeometry(0.045, 0.03);
    const material = new THREE.MeshBasicMaterial({ color: '#ffc9df', side: THREE.DoubleSide, toneMapped: false });
    const petals = new THREE.InstancedMesh(geometry, material, count);
    petals.frustumCulled = false;
    extra.push(geometry, material);
    keep(petals);
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
    animate(place);
  }
  await pause();

  // ---------- Halos, reflections and the merged static parts ----------
  // Soft halos around lights, in one draw: sized in world units. (Written
  // again whenever the playground moves, hides or adds something.)
  const haloGeometry = new THREE.BufferGeometry();
  const isShown = (owner) => !owner || (!owner.hidden && shown.get(owner.part) !== false && shown.get(NEEDS[owner.part]) !== false);
  const shown = new Map();
  function syncHalos() {
    const positions = [];
    const sizes = [];
    const tints = [];
    for (const [x, y, z, size, tint, strength, owner] of glows) {
      const from = units.get(owner);
      positions.push(x + (from?.dx ?? 0), y, z + (from?.dz ?? 0));
      sizes.push(size);
      const c = color(tint);
      tints.push(c.r, c.g, c.b, isShown(from) ? strength : 0);
    }
    haloGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    haloGeometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    haloGeometry.setAttribute('tint', new THREE.Float32BufferAttribute(tints, 4));
  }
  syncHalos();
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

  // The living things below draw their numbers from their own sequence, so
  // adding to them never moves a tree or a rock.
  const life = seeded(23);
  const span = (min, max) => min + life() * (max - min);

  // ---------- Fireflies ----------
  // Small lights wandering over the pond and the shore, each blinking in its
  // own time. One draw, with the halos' material.
  begin('fireflies', { movable: false });
  {
    const count = 36;
    const flies = Array.from({ length: count }, () => {
      const angle = life() * Math.PI * 2;
      const reach = Math.sqrt(life());
      return {
        x: 0.2 + Math.cos(angle) * reach * 3.6,
        y: span(0.2, 1.2),
        z: Math.sin(angle) * reach * 2.8,
        wander: span(0.18, 0.42),
        pace: span(0.25, 0.6),
        blink: span(0.7, 1.6),
        phase: life() * 40,
      };
    });
    const positions = new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3);
    const tints = new THREE.Float32BufferAttribute(new Float32Array(count * 4), 4);
    const tint = color('#e6ff9a');
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', positions);
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(flies.map(() => span(0.26, 0.4)), 1));
    geometry.setAttribute('tint', tints);
    const points = new THREE.Points(geometry, haloMaterial);
    points.frustumCulled = false;
    points.renderOrder = 5;
    keep(points);
    extra.push(geometry);
    const place = (t) => {
      flies.forEach((f, i) => {
        const a = t * f.pace + f.phase;
        positions.setXYZ(
          i,
          f.x + Math.sin(a) * f.wander + Math.sin(a * 0.37) * f.wander,
          f.y + Math.sin(a * 1.3) * 0.12,
          f.z + Math.cos(a * 0.8) * f.wander + Math.cos(a * 0.29) * f.wander,
        );
        // Lit for about half of each blink, fading in and out.
        const lit = Math.max(0, Math.sin(t * f.blink + f.phase));
        tints.setXYZW(i, tint.r, tint.g, tint.b, lit * lit * 0.9);
      });
      positions.needsUpdate = true;
      tints.needsUpdate = true;
    };
    place(0);
    animate(place);
  }
  await pause();

  // ---------- Mist ----------
  // Low, wide wisps drifting across the water.
  begin('mist', { movable: false });
  {
    const wisps = [
      [-1.6, 0.9, 2.6, 0.0],
      [1.4, 1.7, 3.0, 2.1],
      [0.4, -0.6, 2.4, 4.4],
      [2.3, 0.3, 2.2, 1.2],
      [-0.6, 2.2, 2.8, 3.3],
    ];
    // Softer than the lights' halo: no bright middle.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const fade = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    fade.addColorStop(0, 'rgba(255,255,255,0.55)');
    fade.addColorStop(0.5, 'rgba(255,255,255,0.22)');
    fade.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, 64, 64);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    extra.push(map);
    for (const [x, z, width, phase] of wisps) {
      const wisp = new THREE.Sprite(
        new THREE.SpriteMaterial({ map, color: '#cfc6ff', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
      );
      wisp.scale.set(width * 1.4, width * 0.36, 1);
      wisp.renderOrder = 6;
      keep(wisp);
      extra.push(wisp.material);
      const move = (t) => {
        wisp.position.set(x + Math.sin(t * 0.05 + phase) * 0.9, WATER + 0.16 + Math.sin(t * 0.21 + phase) * 0.03, z + Math.cos(t * 0.04 + phase) * 0.3);
        wisp.material.opacity = 1.15 + Math.sin(t * 0.13 + phase * 2) * 0.35;
      };
      move(0);
      animate(move);
    }
  }
  await pause();

  // The still parts, merged: one mesh per material (and per unit, in the
  // playground), and the same again for their reflections.
  const reflections = new THREE.Group();
  const statics = new THREE.Group();
  group.add(reflections, statics);
  async function merge() {
    const made = [];
    for (const mesh of (await mirror.build({ mirror: mirrorMaterial }, { castShadow: false, receiveShadow: false, pause })).children.slice()) {
      mesh.renderOrder = 1;
      reflections.add(mesh);
      made.push(mesh);
    }
    for (const mesh of (await batch.build(materials, { pause })).children.slice()) {
      statics.add(mesh);
      made.push(mesh);
    }
    // (The batch names each mesh after the unit it was built for.)
    for (const mesh of made) {
      const owner = units.get(mesh.userData.part);
      if (owner) mesh.userData = { unit: owner.id, part: owner.part };
    }
    return made;
  }
  await merge();

  // ---------- The playground: hiding, moving, adding and digging ----------
  const meshesOf = (id) => [...statics.children, ...reflections.children].filter((mesh) => mesh.userData.unit === id);
  function place(owner) {
    const visible = isShown(owner);
    for (const mesh of meshesOf(owner.id)) {
      mesh.visible = visible;
      mesh.position.set(owner.dx, 0, owner.dz);
      mesh.updateMatrix();
    }
    if (owner.live) {
      owner.live.visible = visible;
      owner.live.position.set(owner.dx, 0, owner.dz);
    }
  }
  const refresh = () => {
    for (const owner of units.values()) if (owner.type !== 'pond') place(owner);
    syncHalos();
  };
  const syncPonds = () => {
    const list = [...units.values()].filter((owner) => owner.type === 'pond' && !owner.hidden);
    list.slice(0, MAX_PONDS).forEach((owner, i) => ponds.value[i].set(owner.x + owner.dx, owner.z + owner.dz, owner.size));
    pondCount.value = Math.min(list.length, MAX_PONDS);
  };
  // What the playground can add: a maker for each, called with where to put it.
  const spin = seeded(99);
  const makers = {
    cherry: (x, z, o) => blossom(x, z, 0.8, C.cherry, o),
    maple: (x, z, o) => blossom(x, z, 0.68, C.maple, o),
    pine: (x, z, o) => pine(x, z, 0.85, o),
    lantern: (x, z, o) => lantern(x, z, 1.05, o),
    deer: (x, z, o) => deerAt({ x, z, ry: spin() * 6.28, size: 1.05, grazes: true, phase: spin() }, o),
    stag: (x, z, o) => deerAt({ x, z, ry: spin() * 6.28, size: 1.25, stag: true, phase: 0 }, o),
    boat: (x, z, o) => boatAt(x, z, spin() * 6, o),
    bamboo: (x, z, o) => {
      begin('bamboo', { x, z, size: 0.45, ...o });
      for (let i = 0; i < 6; i += 1) cane(x + Math.cos(i * 1.05) * (i ? 0.2 : 0), z + Math.sin(i * 1.05) * (i ? 0.2 : 0), i);
    },
    rock: (x, z, o) => {
      begin('rocks', { x, z, size: 0.4, type: 'rock', ...o });
      const k = Math.floor(spin() * 3);
      add('solid', rock, at(x, -0.06, z, { sx: 0.34, sy: 0.3, sz: 0.3, ry: spin() * 6 }), C.rock[k]);
      add('solid', rock, at(x + 0.3, -0.05, z + 0.16, { sx: 0.17, sy: 0.14, sz: 0.19, ry: spin() * 6 }), C.rock[(k + 1) % 3]);
    },
    pond: (x, z, o) => {
      begin('ponds', { x, z, size: 0.9, type: 'pond', ...o });
    },
    bigpond: (x, z, o) => {
      begin('ponds', { x, z, size: 1.5, type: 'pond', kind: 'bigpond', ...o });
    },
  };
  // A ring on the ground under whatever is selected.
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#b9a5f5', transparent: true, opacity: 0.9, depthTest: false, toneMapped: false }),
  );
  marker.renderOrder = 10;
  marker.visible = false;
  group.add(marker);
  extra.push(marker.geometry, marker.material);
  let selected = null;
  const mark = () => {
    const owner = units.get(selected);
    marker.visible = Boolean(owner) && isShown(owner);
    if (!owner) return;
    marker.position.set(owner.x + owner.dx, 0.03, owner.z + owner.dz);
    marker.scale.setScalar(owner.size + 0.22);
  };
  const raycaster = new THREE.Raycaster();
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  return {
    group,
    // The plate's half-width and half-depth.
    plate,
    // Shows or hides a whole part (see parts.js), and whatever depends on it.
    setVisible(id, on) {
      shown.set(id, on);
      refresh();
      mark();
    },
    unit: (id) => units.get(id),
    // What can be said about the garden's layout: what was moved, taken
    // away, added and dug, and the plate's size.
    layout() {
      const all = [...units.values()];
      const round = (v) => Math.round(v * 100) / 100;
      return {
        move: Object.fromEntries(all.filter((u) => !u.added && (u.dx || u.dz)).map((u) => [u.id, [round(u.dx), round(u.dz)]])),
        gone: all.filter((u) => !u.added && u.hidden).map((u) => u.id),
        add: all.filter((u) => u.added && !u.hidden).map((u) => [u.kind ?? u.type, round(u.x + u.dx), round(u.z + u.dz)]),
        plate: round(plate.x - 5),
      };
    },
    // Grows the plate by `extra` units each way (the land is laid again).
    setPlate(extraSize) {
      const grow = Math.min(Math.max(Number(extraSize) || 0, 0), 4);
      plate.x = 5 + grow;
      plate.z = 4 + grow * 0.8;
      layGround();
      // Anything left outside a smaller plate comes back in.
      for (const owner of units.values()) {
        if (owner.movable && (owner.dx || owner.dz || owner.added)) this.moveTo(owner.id, owner.x + owner.dx, owner.z + owner.dz);
      }
    },
    // Moves a unit to a point of the plate (kept inside its edge).
    moveTo(id, x, z) {
      const owner = units.get(id);
      if (!owner?.movable) return;
      // (A pond keeps well clear of the edge, or it would cut through the plate's side.)
      const edge = owner.type === 'pond' ? owner.size * 1.12 + 0.75 : 0.3;
      owner.dx = Math.min(Math.max(x, -plate.x + edge), plate.x - edge) - owner.x;
      owner.dz = Math.min(Math.max(z, -plate.z + edge), plate.z - edge) - owner.z;
      if (owner.type === 'pond') syncPonds();
      else place(owner);
      syncHalos();
      mark();
    },
    // Takes a unit away. (What came with the garden is only hidden, so the
    // rest keeps its place and it can come back.)
    remove(id) {
      const owner = units.get(id);
      if (!owner) return;
      owner.hidden = true;
      if (owner.type === 'pond') syncPonds();
      else place(owner);
      if (owner.added) {
        for (const mesh of meshesOf(id)) {
          mesh.geometry.dispose();
          mesh.removeFromParent();
        }
        owner.live?.removeFromParent();
        for (let i = movers.length - 1; i >= 0; i -= 1) if (movers[i].unit === id) movers.splice(i, 1);
        for (let i = glows.length - 1; i >= 0; i -= 1) if (glows[i][6] === id) glows.splice(i, 1);
      }
      syncHalos();
      if (selected === id) selected = null;
      mark();
    },
    restore(id) {
      const owner = units.get(id);
      if (!owner || owner.added) return;
      owner.hidden = false;
      place(owner);
      syncHalos();
    },
    // Adds one more of something (see `makers`); resolves to its id.
    async add(type, x, z) {
      if (!makers[type]) return null;
      const dug = [...units.values()].filter((u) => u.type === 'pond' && !u.hidden).length;
      if ((type === 'pond' || type === 'bigpond') && dug >= MAX_PONDS) return null;
      await makers[type](x, z, { added: true });
      const id = unit;
      await merge();
      const owner = units.get(id);
      if (owner.type === 'pond') syncPonds();
      else place(owner);
      syncHalos();
      return id;
    },
    // Puts everything back the way it came.
    reset() {
      for (const owner of [...units.values()]) {
        if (owner.added) this.remove(owner.id);
        else Object.assign(owner, { dx: 0, dz: 0, hidden: false });
      }
      for (const id of [...units.keys()]) if (units.get(id).added) units.delete(id);
      syncPonds();
      this.setPlate(0);
      refresh();
      selected = null;
      mark();
    },
    select(id) {
      selected = units.has(id) ? id : null;
      mark();
    },
    // Where a point of the view (x and y from -1 to 1) meets the ground.
    floorAt(point, camera) {
      raycaster.setFromCamera(point, camera);
      return raycaster.ray.intersectPlane(floor, new THREE.Vector3());
    },
    // The unit drawn at a point of the view, if any. Only solid things
    // count: not lights, mist or rings on the water. A pond is picked by
    // the ground it was dug from.
    pick(point, camera) {
      raycaster.setFromCamera(point, camera);
      const solid = [...statics.children, ...ground.children];
      for (const owner of units.values()) if (owner.live && owner.part !== 'ripples') solid.push(owner.live);
      for (const hit of raycaster.intersectObjects(solid, true)) {
        const { object } = hit;
        if (object.isSprite || object.isPoints || object.material?.opacity === 0) continue;
        let visible = true;
        let id;
        for (let node = object; node && node !== group; node = node.parent) {
          visible &&= node.visible;
          id ??= node.userData.unit;
        }
        if (!visible) continue;
        if (id) return id;
        // The ground: is it where a pond has been dug?
        for (const owner of units.values()) {
          if (owner.type !== 'pond' || owner.hidden) continue;
          if (Math.hypot(hit.point.x - owner.x - owner.dx, hit.point.z - owner.z - owner.dz) < owner.size * 1.1) return owner.id;
        }
        return null;
      }
      return null;
    },
    // Pixels per world unit at distance 1, for the halos.
    setPixelScale(value) {
      haloMaterial.uniforms.uScale.value = value;
    },
    update(t) {
      for (const mover of movers) mover.fn(t);
    },
    dispose() {
      statics.traverse((child) => child.geometry?.dispose());
      ground.traverse((child) => child.geometry?.dispose());
      reflections.traverse((child) => child.geometry?.dispose());
      Object.values(materials).forEach((m) => m.dispose());
      extra.forEach((item) => item.dispose());
    },
  };
}
