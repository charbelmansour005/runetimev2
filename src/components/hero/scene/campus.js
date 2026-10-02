import * as THREE from 'three';
import { at, Batch, block, color, cylinder, faceted, glowSprite, halo, sweep } from './kit';
import { CHART_AREA, dashboard, phoneChrome, phoneFeed } from './screens';

// The hero's miniature campus at night: one building per thing we do around a
// monorail that runs an endless ∞ — "built to run". Visitors can turn it all
// the way round, so every side is finished. Units are roughly metres ÷ 10;
// the slab is 10 × 8 and its top is at y = 0.

const C = {
  ground: '#2a2240',
  strata: '#171024',
  base: '#0e0917',
  road: '#1c1628',
  dash: '#6a5d92',
  paving: '#3a3253',
  walk: '#4b4269',
  paved: '#463d63',
  lawn: '#2c5a52',
  stone: '#d9d2ea',
  facade: '#ece8f6',
  lilac: '#d3c8f8',
  grey: '#c4bed9',
  dark: '#211a33',
  rack: '#1a1428',
  metal: '#aaa4c6',
  trunk: '#4a3846',
  leaves: ['#3c8c76', '#2c7262', '#5aa889', '#e9a3d2'],
  warm: '#ffdcaa',
  lobby: '#efcfaa',
  cool: '#d4e2ff',
  blush: '#f2dcff',
  off: '#2b2340',
};

// The size of everything, for framing it.
export const BOUNDS = new THREE.Box3(new THREE.Vector3(-5, -1.45, -4), new THREE.Vector3(5, 3.6, 4));

// ---------- Paths ----------

// A rounded rectangle on the ground, walked by distance (for cars and lamps).
function roundedRect(hx, hz, r) {
  const ax = hx - r;
  const az = hz - r;
  const straight = (x0, z0, x1, z1) => ({ len: Math.hypot(x1 - x0, z1 - z0), at: (f) => [x0 + (x1 - x0) * f, z0 + (z1 - z0) * f] });
  const arc = (cx, cz, a0) => ({
    len: (Math.PI / 2) * r,
    at: (f) => [cx + r * Math.cos(a0 + f * (Math.PI / 2)), cz + r * Math.sin(a0 + f * (Math.PI / 2))],
  });
  const parts = [
    straight(hx, -az, hx, az),
    arc(ax, az, 0),
    straight(ax, hz, -ax, hz),
    arc(-ax, az, Math.PI / 2),
    straight(-hx, az, -hx, -az),
    arc(-ax, -az, Math.PI),
    straight(-ax, -hz, ax, -hz),
    arc(ax, -az, (3 * Math.PI) / 2),
  ];
  const length = parts.reduce((sum, p) => sum + p.len, 0);
  const point = (s) => {
    let d = ((s % length) + length) % length;
    for (const part of parts) {
      if (d <= part.len) return part.at(part.len ? d / part.len : 0);
      d -= part.len;
    }
    return parts[0].at(0);
  };
  return { length, point };
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

// A flat rounded slab lying on the ground (rounded boxes can't have big plan corners).
function slab(hx, hz, r, h, hole) {
  const shape = roundedShape(hx, hz, r);
  if (hole) shape.holes.push(roundedShape(...hole));
  return new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 6 }).rotateX(-Math.PI / 2);
}

// The monorail: a figure of eight (∞) that rises over itself where it crosses.
const TRACK = { a: 3.55, b: 1.0, y: 0.95, rise: 0.3 };
function trackPoint(t, out = new THREE.Vector3()) {
  return out.set(TRACK.a * Math.cos(t), TRACK.y + TRACK.rise * Math.sin(t), TRACK.b * Math.sin(2 * t));
}

// ---------- The campus ----------

// The same campus on every visit (lit windows, blink rates).
function seeded(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Built in steps, pausing between them (`pause`) so a slow phone stays
// responsive while it builds.
export async function buildCampus({ pause = async () => {} } = {}) {
  const rand = seeded(11);
  const batch = new Batch();
  const group = new THREE.Group();
  const movers = [];
  const glows = []; // static light halos: x, y, z, size, colour, strength
  const windows = []; // x, y, z, rotation, width, height, lit

  const materials = {
    solid: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 }),
    metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.36, metalness: 0.75 }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    glass: new THREE.MeshStandardMaterial({
      color: '#d6e4ff',
      transparent: true,
      opacity: 0.2,
      roughness: 0.05,
      metalness: 0.25,
      depthWrite: false,
    }),
    // Brand violet light: the slab's seam, the monorail's strips and the neon mark.
    accent: new THREE.MeshBasicMaterial({ color: '#8b5cff', toneMapped: false }),
  };
  for (const key of ['glow', 'glass', 'accent']) materials[key].userData.shadow = false;
  const extra = []; // other materials and textures to dispose of

  const glow = (x, y, z, size, tint, strength = 1) => glows.push([x, y, z, size, tint, strength]);

  // A grid of windows on a wall facing +z (ry = 0) or +x (ry = π/2).
  function windowGrid({ x, y, z, ry = 0, cols, rows, w, h, gapX, gapY, lit = 0.62 }) {
    const along = ry ? [0, -1] : [1, 0]; // which way the columns run (x, z)
    for (let c = 0; c < cols; c += 1) {
      for (let r = 0; r < rows; r += 1) {
        const offset = (c - (cols - 1) / 2) * gapX;
        windows.push([x + along[0] * offset, y + r * gapY, z + along[1] * offset, ry, w, h, rand() < lit]);
      }
    }
  }

  const crown = faceted(new THREE.IcosahedronGeometry(1, 1));
  function tree(x, z, size, tint, y = 0.035) {
    batch.add('solid', cylinder(size * 0.11, size * 0.16, size * 0.75, 6), at(x, y, z), C.trunk);
    const turn = x * 3 + z;
    batch.add('solid', crown, at(x, y + size * 1.2, z, { s: size, sy: size * 1.1, ry: turn }), C.leaves[tint]);
    // A smaller lobe off to one side, so crowns aren't perfect balls.
    batch.add(
      'solid',
      crown,
      at(x + Math.cos(turn) * size * 0.55, y + size * 1.55, z + Math.sin(turn) * size * 0.55, { s: size * 0.62, ry: turn }),
      C.leaves[tint],
    );
  }

  // ---------- Ground ----------

  batch.add('solid', block(10, 0.32, 8, 0.14), at(0, -0.32, 0), C.ground);
  batch.add('solid', block(9.88, 0.88, 7.88, 0.1), at(0, -1.2, 0), C.strata);
  batch.add('accent', block(9.95, 0.035, 7.95, 0.015), at(0, -0.37, 0));
  batch.add('solid', block(9.5, 0.12, 7.5, 0.05), at(0, -1.32, 0), C.base);

  // A ring road around the campus, with dashed lines.
  batch.add('solid', slab(4.85, 3.85, 0.8, 0.02, [4.25, 3.25, 0.4]), null, C.road);
  const lane = roundedRect(4.55, 3.55, 0.6);
  const dash = new THREE.BoxGeometry(0.13, 0.006, 0.022);
  for (let s = 0; s < lane.length; s += 0.32) {
    const [x0, z0] = lane.point(s);
    const [x1, z1] = lane.point(s + 0.05);
    batch.add('solid', dash, at(x0, 0.022, z0, { ry: Math.atan2(-(z1 - z0), x1 - x0) }), C.dash, { shadow: false });
  }

  // The campus inside the road: paving, four lots and two round planters.
  batch.add('solid', slab(4.25, 3.25, 0.4, 0.035), null, C.paving);
  const LOTS = [
    [-2.85, -2.3, C.lawn],
    [2.85, -2.3, C.lawn],
    [-2.85, 2.3, C.paved],
    [2.85, 2.3, C.paved],
  ];
  for (const [x, z, tint] of LOTS) batch.add('solid', slab(1.33, 0.86, 0.22, 0.05), at(x, 0, z), tint);
  for (const side of [-1, 1]) {
    batch.add('solid', cylinder(0.5, 0.53, 0.12, 40), at(side * 2.35, 0.035, 0), C.stone);
    batch.add('solid', cylinder(0.45, 0.45, 0.125, 40), at(side * 2.35, 0.04, 0), C.lawn);
    tree(side * 2.35, 0, 0.3, side < 0 ? 3 : 0, 0.16);
  }

  // Street lamps along the outer edge.
  const kerb = roundedRect(4.94, 3.94, 0.9);
  const pole = cylinder(0.011, 0.016, 0.34, 6);
  const head = block(0.08, 0.022, 0.05, 0.008);
  const bulb = new THREE.SphereGeometry(0.02, 8, 6);
  for (let s = 0.6; s < kerb.length; s += 1.48) {
    const [x, z] = kerb.point(s);
    const inward = Math.atan2(z, -x); // turn the head toward the centre
    batch.add('metal', pole, at(x, 0, z), C.dark);
    batch.add('metal', head, at(x - 0.025 * Math.cos(inward), 0.33, z + 0.025 * Math.sin(inward), { ry: inward }), C.dark);
    batch.add('glow', bulb, at(x - 0.05 * Math.cos(inward), 0.325, z + 0.05 * Math.sin(inward)), C.warm);
    glow(x - 0.05 * Math.cos(inward), 0.32, z + 0.05 * Math.sin(inward), 0.55, '#ffcf8a', 0.55);
  }

  // Walkways between the lots, benches along them, and a fountain out front.
  for (const side of [-1, 1]) batch.add('solid', slab(4.1, 0.13, 0.1, 0.012), at(0, 0.035, side * 1.29), C.walk);
  batch.add('solid', slab(0.2, 3.16, 0.1, 0.012), at(0, 0.035, 0), C.walk);
  const bench = block(0.22, 0.04, 0.07, 0.012);
  for (const [x, z] of [[-1.2, 1.12], [1.2, 1.12], [-1.2, -1.12], [1.2, -1.12], [-3.4, 1.12], [3.4, -1.12]]) {
    batch.add('solid', bench, at(x, 0.075, z), C.trunk);
  }
  const fountain = { x: 0, z: 2.35 };
  batch.add('solid', cylinder(0.36, 0.4, 0.09, 40), at(fountain.x, 0.035, fountain.z), C.stone);
  batch.add('glow', cylinder(0.31, 0.31, 0.092, 40), at(fountain.x, 0.04, fountain.z), '#4a6fd8');
  batch.add('solid', cylinder(0.05, 0.07, 0.16, 12), at(fountain.x, 0.12, fountain.z), C.stone);
  glow(fountain.x, 0.2, fountain.z, 1.0, '#5ab8ff', 0.3);
  const jetMaterial = new THREE.MeshBasicMaterial({
    color: '#bfe6ff',
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const jet = new THREE.Mesh(cylinder(0.012, 0.03, 1, 10), jetMaterial);
  jet.position.set(fountain.x, 0.27, fountain.z);
  group.add(jet);
  extra.push(jetMaterial, jet.geometry);
  movers.push((t) => {
    jet.scale.y = 0.22 + 0.06 * Math.sin(t * 3.1) + 0.03 * Math.sin(t * 7.3);
  });

  await pause();

  // Trees around the lots.
  [
    [-4.0, -1.62, 0.22, 0],
    [-3.7, -3.05, 0.19, 1],
    [-1.75, -3.05, 0.21, 3],
    [-1.65, -1.6, 0.17, 2],
    [4.0, -1.62, 0.21, 1],
    [1.68, -3.05, 0.19, 0],
    [3.95, -3.05, 0.23, 3],
    [1.72, -1.62, 0.17, 2],
    [-4.0, 1.58, 0.2, 2],
    [-4.0, 3.0, 0.22, 0],
    [4.02, 1.58, 0.19, 0],
    [4.0, 3.05, 0.21, 1],
    [-0.75, 1.75, 0.16, 2],
    [0.75, -1.75, 0.16, 1],
    [0.8, 1.7, 0.15, 3],
    [-0.8, -1.75, 0.15, 0],
    [-0.7, 2.9, 0.16, 0],
    [0.7, 2.9, 0.16, 2],
    [-0.5, -2.75, 0.18, 3],
    [0.55, -2.95, 0.16, 1],
  ].forEach(([x, z, size, tint]) => tree(x, z, size, tint, 0.085));

  await pause();

  // ---------- AI lab (back left): a round tower with a glass dome ----------

  const ai = { x: -2.85, z: -2.3 };
  batch.add('solid', block(2.3, 0.16, 1.5, 0.05), at(ai.x, 0.035, ai.z), C.stone);
  for (let i = 0; i < 6; i += 1) {
    const y = 0.195 + i * 0.4;
    batch.add('solid', cylinder(0.58, 0.58, 0.3, 48), at(ai.x, y, ai.z), C.facade);
    batch.add('glow', cylinder(0.555, 0.555, 0.1, 48), at(ai.x, y + 0.3, ai.z), i % 2 ? C.warm : C.blush);
  }
  const aiTop = 0.195 + 6 * 0.4;
  batch.add('solid', cylinder(0.7, 0.64, 0.07, 48), at(ai.x, aiTop, ai.z), C.facade);
  batch.add('glass', new THREE.SphereGeometry(0.58, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), at(ai.x, aiTop + 0.07, ai.z));
  // A lower wing, with a rooftop fan.
  batch.add('solid', block(1.0, 0.72, 0.86, 0.05), at(ai.x + 0.95, 0.195, ai.z - 0.12), C.lilac);
  windowGrid({ x: ai.x + 0.95, y: 0.33, z: ai.z + 0.31 + 0.006, cols: 4, rows: 3, w: 0.13, h: 0.11, gapX: 0.21, gapY: 0.19 });
  windowGrid({ x: ai.x + 1.45 + 0.006, y: 0.33, z: ai.z - 0.12, ry: Math.PI / 2, cols: 3, rows: 3, w: 0.13, h: 0.11, gapX: 0.22, gapY: 0.19 });
  windowGrid({ x: ai.x + 1.05, y: 0.33, z: ai.z - 0.55 - 0.006, cols: 2, rows: 3, w: 0.13, h: 0.11, gapX: 0.21, gapY: 0.19 });
  const fan = (x, y, z, size) => {
    batch.add('metal', cylinder(size, size, size * 0.45, 20), at(x, y, z), C.metal);
    const blades = new THREE.Mesh(
      new THREE.BoxGeometry(size * 1.7, 0.008, size * 0.32),
      new THREE.MeshStandardMaterial({ color: C.dark, roughness: 0.5 }),
    );
    const cross = blades.clone();
    cross.rotation.y = Math.PI / 2;
    blades.add(cross);
    blades.position.set(x, y + size * 0.47, z);
    extra.push(blades.material, blades.geometry);
    group.add(blades);
    const speed = 5 + rand() * 3;
    movers.push((t) => {
      blades.rotation.y = t * speed;
    });
  };
  fan(ai.x + 1.2, 0.915, ai.z - 0.3, 0.13);

  // The neural network inside the dome: nodes that pulse, joined by links.
  const neural = new THREE.Group();
  neural.position.set(ai.x, aiTop + 0.36, ai.z);
  const nodePoints = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < 18; i += 1) {
    const yy = 1 - (i / 17) * 2;
    const r = Math.sqrt(1 - yy * yy);
    nodePoints.push(new THREE.Vector3(Math.cos(golden * i) * r, yy * 0.8, Math.sin(golden * i) * r).multiplyScalar(0.3));
  }
  nodePoints.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.1, 0.05, -0.06), new THREE.Vector3(-0.08, -0.07, 0.07));
  const linkPositions = [];
  nodePoints.forEach((p, i) => {
    nodePoints
      .map((q, j) => [j, p.distanceTo(q)])
      .filter(([j]) => j > i)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .forEach(([j]) => linkPositions.push(p.x, p.y, p.z, nodePoints[j].x, nodePoints[j].y, nodePoints[j].z));
  });
  const linkGeometry = new THREE.BufferGeometry();
  linkGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linkPositions, 3));
  const linkMaterial = new THREE.LineBasicMaterial({
    color: '#f08bf5',
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  neural.add(new THREE.LineSegments(linkGeometry, linkMaterial));
  const nodeMaterial = new THREE.MeshBasicMaterial({ toneMapped: false });
  const nodes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.026, 10, 8), nodeMaterial, nodePoints.length);
  const nodeTint = new THREE.Color();
  const nodeBase = color('#f6b5ff');
  // Colours from the start, so the shader compiled up front is the one used.
  nodePoints.forEach((p, i) => {
    nodes.setMatrixAt(i, at(p.x, p.y, p.z));
    nodes.setColorAt(i, nodeBase);
  });
  neural.add(nodes);
  group.add(neural);
  extra.push(linkGeometry, linkMaterial, nodes.geometry, nodeMaterial);
  glow(ai.x, aiTop + 0.36, ai.z, 1.6, '#e36bff', 0.4);
  movers.push((t) => {
    neural.rotation.y = t * 0.35;
    nodePoints.forEach((p, i) => {
      const wave = Math.max(0, Math.sin(t * 2.2 - p.y * 9 - i * 0.6)) ** 6;
      nodes.setColorAt(i, nodeTint.copy(nodeBase).multiplyScalar(0.45 + 1.4 * wave));
    });
    nodes.instanceColor.needsUpdate = true;
  });

  // A drone that circles the dome, its light blinking.
  const drone = new THREE.Group();
  const droneMaterial = new THREE.MeshStandardMaterial({ color: C.dark, roughness: 0.45, metalness: 0.4 });
  drone.add(new THREE.Mesh(block(0.11, 0.03, 0.11, 0.012), droneMaterial));
  const rotors = [];
  for (const [rx, rz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.004, 0.012), droneMaterial);
    rotor.position.set(rx * 0.075, 0.04, rz * 0.075);
    rotors.push(rotor);
    drone.add(rotor);
  }
  const droneLight = glowSprite('#7ee0f0', 0.22, 0.9);
  droneLight.position.y = -0.01;
  drone.add(droneLight);
  group.add(drone);
  extra.push(droneMaterial, droneLight.material);
  movers.push((t) => {
    const a = t * 0.42;
    drone.position.set(ai.x + Math.cos(a) * 1.05, aiTop + 0.85 + Math.sin(t * 1.3) * 0.06, ai.z + Math.sin(a) * 1.05);
    drone.rotation.y = -a;
    rotors.forEach((rotor, i) => {
      rotor.rotation.y = t * 40 + i;
    });
    droneLight.material.opacity = Math.sin(t * 5) > 0.2 ? 0.95 : 0.15;
  });

  await pause();

  // ---------- Global HQ (back right): a tower with a hologram globe ----------

  const hq = { x: 2.85, z: -2.3 };
  batch.add('solid', block(2.3, 0.16, 1.5, 0.05), at(hq.x, 0.035, hq.z), C.stone);
  const tower = { x: hq.x + 0.2, z: hq.z - 0.1, w: 1.15, d: 0.95, h: 2.25 };
  batch.add('solid', block(tower.w, tower.h, tower.d, 0.06), at(tower.x, 0.195, tower.z), C.facade);
  for (const side of [-1, 1]) {
    batch.add('solid', block(0.05, tower.h + 0.08, 0.06, 0.02), at(tower.x + side * 0.6, 0.195, tower.z + 0.48), C.lilac);
  }
  windowGrid({
    x: tower.x,
    y: 0.36,
    z: tower.z + tower.d / 2 + 0.006,
    cols: 5,
    rows: 9,
    w: 0.13,
    h: 0.14,
    gapX: 0.205,
    gapY: 0.215,
  });
  for (const side of [-1, 1]) {
    windowGrid({
      x: tower.x + side * (tower.w / 2 + 0.006),
      y: 0.36,
      z: tower.z,
      ry: Math.PI / 2,
      cols: 4,
      rows: 9,
      w: 0.13,
      h: 0.14,
      gapX: 0.2,
      gapY: 0.215,
    });
  }
  windowGrid({
    x: tower.x,
    y: 0.36,
    z: tower.z - tower.d / 2 - 0.006,
    cols: 5,
    rows: 9,
    w: 0.13,
    h: 0.14,
    gapX: 0.205,
    gapY: 0.215,
  });
  const hqTop = 0.195 + tower.h;
  batch.add('solid', block(0.82, 0.3, 0.66, 0.05), at(tower.x, hqTop, tower.z), C.lilac);
  const roof = hqTop + 0.3;
  batch.add('metal', cylinder(0.24, 0.28, 0.06, 32), at(tower.x, roof, tower.z), C.metal);
  batch.add('glow', new THREE.TorusGeometry(0.235, 0.012, 8, 40).rotateX(Math.PI / 2), at(tower.x, roof + 0.065, tower.z), '#7ee0f0');
  batch.add('metal', cylinder(0.008, 0.014, 0.42, 6), at(tower.x + 0.33, roof, tower.z - 0.22), C.metal);
  const beacon = glowSprite('#ff5a5a', 0.3, 1);
  beacon.position.set(tower.x + 0.33, roof + 0.43, tower.z - 0.22);
  group.add(beacon);
  extra.push(beacon.material);
  movers.push((t) => {
    beacon.material.opacity = (t * 0.8) % 1 < 0.18 ? 1 : 0.08;
  });

  // The hologram: a wireframe globe with routes and a light cone under it.
  const globe = new THREE.Group();
  globe.position.set(tower.x, roof + 0.62, tower.z);
  const R = 0.36;
  const lines = [];
  const circle = (fn, steps = 48) => {
    for (let i = 0; i < steps; i += 1) {
      const a = fn((i / steps) * Math.PI * 2);
      const b = fn(((i + 1) / steps) * Math.PI * 2);
      lines.push(...a, ...b);
    }
  };
  for (const lat of [-60, -30, 0, 30, 60]) {
    const phi = THREE.MathUtils.degToRad(lat);
    circle((a) => [Math.cos(a) * Math.cos(phi) * R, Math.sin(phi) * R, Math.sin(a) * Math.cos(phi) * R]);
  }
  for (let m = 0; m < 6; m += 1) {
    const lon = (m / 6) * Math.PI;
    circle((a) => [Math.cos(a) * Math.cos(lon) * R, Math.sin(a) * R, Math.cos(a) * Math.sin(lon) * R]);
  }
  // Routes: arcs between cities, lifted off the surface.
  const city = (lat, lon) => {
    const phi = THREE.MathUtils.degToRad(lat);
    const lam = THREE.MathUtils.degToRad(lon);
    return new THREE.Vector3(Math.cos(phi) * Math.cos(lam), Math.sin(phi), Math.cos(phi) * Math.sin(lam)).multiplyScalar(R);
  };
  const routes = [
    [city(34, 35), city(51, 0)],
    [city(34, 35), city(25, 55)],
    [city(51, 0), city(40, -74)],
    [city(25, 55), city(1, 104)],
  ].map(([from, to]) => {
    const mid = from.clone().add(to).multiplyScalar(0.5).normalize().multiplyScalar(R * 1.35);
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const pts = curve.getPoints(24);
    for (let i = 0; i < pts.length - 1; i += 1) lines.push(...pts[i].toArray(), ...pts[i + 1].toArray());
    return curve;
  });
  const globeGeometry = new THREE.BufferGeometry();
  globeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
  const globeMaterial = new THREE.LineBasicMaterial({
    color: '#7ee0f0',
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  globe.add(new THREE.LineSegments(globeGeometry, globeMaterial));
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: '#5ab8ff',
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.98, 32, 16), coreMaterial));
  const planes = routes.map(() => {
    const dot = glowSprite('#ffffff', 0.09, 1);
    globe.add(dot);
    extra.push(dot.material);
    return dot;
  });
  const coneMaterial = coreMaterial.clone();
  coneMaterial.opacity = 0.07;
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.85, 0.2, 0.5, 32, 1, true), coneMaterial);
  cone.position.set(tower.x, roof + 0.32, tower.z);
  group.add(cone, globe);
  extra.push(globeGeometry, globeMaterial, coreMaterial, coneMaterial, cone.geometry);
  glow(tower.x, roof + 0.62, tower.z, 1.5, '#5ab8ff', 0.35);
  movers.push((t) => {
    globe.rotation.y = t * 0.3;
    planes.forEach((dot, i) => {
      dot.position.copy(routes[i].getPoint((t * 0.22 + i * 0.27) % 1));
    });
  });

  // A satellite dish on the forecourt that slowly scans the sky.
  const dish = new THREE.Group();
  dish.position.set(hq.x - 0.72, 0.195, hq.z + 0.38);
  const dishMaterial = new THREE.MeshStandardMaterial({ color: '#e8e4f4', roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide });
  const lathe = new THREE.LatheGeometry(
    Array.from({ length: 9 }, (_, i) => new THREE.Vector2((i / 8) * 0.26, ((i / 8) * 0.26) ** 2 * 1.6)),
    32,
  );
  const bowl = new THREE.Mesh(lathe, dishMaterial);
  const tilt = new THREE.Group();
  tilt.position.y = 0.26;
  tilt.rotation.x = -0.7;
  tilt.add(bowl);
  const feed = new THREE.Mesh(cylinder(0.006, 0.006, 0.2, 6), dishMaterial);
  tilt.add(feed);
  const pedestal = new THREE.Mesh(
    cylinder(0.04, 0.07, 0.26, 12),
    new THREE.MeshStandardMaterial({ color: C.metal, roughness: 0.36, metalness: 0.75 }),
  );
  dish.add(pedestal, tilt);
  for (const mesh of [bowl, pedestal]) mesh.castShadow = true;
  group.add(dish);
  extra.push(dishMaterial, lathe, feed.geometry, pedestal.geometry, pedestal.material);
  movers.push((t) => {
    dish.rotation.y = 0.6 + Math.sin(t * 0.25) * 0.7;
  });

  await pause();

  // ---------- App studio (front left): screens for web and mobile ----------

  const app = { x: -2.95, z: 2.3 };
  batch.add('solid', block(2.0, 0.9, 1.15, 0.07), at(app.x, 0.085, app.z), C.lilac);
  // A lit lobby along the front, behind slim mullions.
  batch.add('glow', block(1.56, 0.5, 0.02, 0.005), at(app.x - 0.1, 0.13, app.z + 0.578), C.lobby);
  for (let i = 0; i <= 6; i += 1) {
    batch.add('solid', block(0.025, 0.5, 0.03, 0.005), at(app.x - 0.88 + i * 0.26, 0.13, app.z + 0.585), C.dark);
  }
  batch.add('solid', block(1.7, 0.03, 0.18, 0.01), at(app.x - 0.1, 0.63, app.z + 0.62), C.dark);
  batch.add('solid', block(1.4, 0.36, 0.86, 0.05), at(app.x - 0.2, 0.985, app.z - 0.1), C.facade);
  windowGrid({ x: app.x - 0.2, y: 1.06, z: app.z - 0.1 + 0.436, cols: 5, rows: 1, w: 0.18, h: 0.16, gapX: 0.25, gapY: 0, lit: 0.8 });
  windowGrid({ x: app.x + 1.0 + 0.006, y: 0.25, z: app.z - 0.3, ry: Math.PI / 2, cols: 2, rows: 2, w: 0.14, h: 0.16, gapX: 0.3, gapY: 0.3, lit: 0.7 });
  windowGrid({ x: app.x - 1.0 - 0.006, y: 0.25, z: app.z, ry: Math.PI / 2, cols: 3, rows: 2, w: 0.14, h: 0.16, gapX: 0.3, gapY: 0.3, lit: 0.7 });
  windowGrid({ x: app.x, y: 0.25, z: app.z - 0.575 - 0.006, cols: 6, rows: 2, w: 0.14, h: 0.16, gapX: 0.3, gapY: 0.3, lit: 0.7 });
  windowGrid({ x: app.x - 0.2, y: 1.06, z: app.z - 0.1 - 0.436, cols: 5, rows: 1, w: 0.18, h: 0.16, gapX: 0.25, gapY: 0, lit: 0.8 });
  for (const side of [-1, 1]) {
    windowGrid({ x: app.x - 0.2 + side * 0.706, y: 1.06, z: app.z - 0.1, ry: Math.PI / 2, cols: 3, rows: 1, w: 0.16, h: 0.16, gapX: 0.25, gapY: 0, lit: 0.8 });
  }

  // The brand mark in neon on the side wall.
  const mark = new THREE.Group();
  const markScale = 0.011;
  const stem = new THREE.Shape([[1, 3], [7, 0], [7, 40], [1, 37]].map(([px, py]) => new THREE.Vector2(px, -py)));
  mark.add(new THREE.Mesh(new THREE.ExtrudeGeometry(stem, { depth: 1.2, bevelEnabled: false }), materials.accent));
  const stroke = [[13, 3], [26, 12], [13, 21], [29, 38]];
  for (let i = 0; i < stroke.length - 1; i += 1) {
    const [x0, y0] = stroke[i];
    const [x1, y1] = stroke[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0) + 6.5;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(len, 6.5, 1.2), materials.accent);
    bar.position.set((x0 + x1) / 2, -(y0 + y1) / 2, 0.6);
    bar.rotation.z = -Math.atan2(y1 - y0, x1 - x0);
    mark.add(bar);
  }
  mark.scale.setScalar(markScale);
  mark.rotation.y = Math.PI / 2;
  mark.position.set(app.x + 1.0 + 0.004, 0.78, app.z + 0.42);
  group.add(mark);
  mark.traverse((child) => child.geometry && extra.push(child.geometry));
  glow(app.x + 1.08, 0.56, app.z + 0.24, 0.9, '#8b5cff', 0.5);

  // A rooftop billboard: a browser window with a live chart.
  const billboard = new THREE.Group();
  billboard.position.set(app.x - 0.25, 1.345, app.z - 0.05);
  billboard.rotation.y = 0.22;
  const screenW = 1.18;
  const screenH = 0.7;
  const frameMaterial = new THREE.MeshStandardMaterial({ color: C.dark, roughness: 0.5, metalness: 0.3 });
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(cylinder(0.018, 0.018, 0.2, 8), frameMaterial);
    post.position.set(side * 0.42, 0, -0.02);
    billboard.add(post);
  }
  const frame = new THREE.Mesh(block(screenW + 0.06, screenH + 0.06, 0.045, 0.02), frameMaterial);
  frame.position.y = 0.17;
  frame.castShadow = true;
  billboard.add(frame);
  const dashboardMap = dashboard();
  const screenMaterial = new THREE.MeshBasicMaterial({ map: dashboardMap, toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenH), screenMaterial);
  screen.position.set(0, 0.17 + 0.03 + screenH / 2, 0.024);
  billboard.add(screen);
  const BAR_COUNT = 7;
  const barMaterial = new THREE.MeshBasicMaterial({ toneMapped: false });
  const bars = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), barMaterial, BAR_COUNT);
  const chart = {
    left: (CHART_AREA.left - 0.5) * screenW,
    right: (CHART_AREA.right - 0.5) * screenW,
    bottom: (0.5 - CHART_AREA.bottom) * screenH,
    top: (0.5 - CHART_AREA.top) * screenH,
  };
  const barStep = (chart.right - chart.left) / BAR_COUNT;
  for (let i = 0; i < BAR_COUNT; i += 1) bars.setColorAt(i, color(i === 4 ? '#2dd4bf' : '#9b82f0'));
  bars.position.set(0, screen.position.y, 0.026);
  billboard.add(bars);
  group.add(billboard);
  extra.push(frameMaterial, frame.geometry, dashboardMap, screenMaterial, screen.geometry, barMaterial, bars.geometry);
  billboard.traverse((child) => child.geometry && child !== frame && child !== screen && child !== bars && extra.push(child.geometry));
  glow(app.x - 0.2, 1.88, app.z + 0.1, 1.5, '#8b5cff', 0.3);
  movers.push((t) => {
    for (let i = 0; i < BAR_COUNT; i += 1) {
      const level = 0.35 + 0.3 * Math.sin(t * 0.9 + i * 1.1) + 0.25 * Math.sin(t * 0.37 + i * 2.3);
      const h = (chart.top - chart.bottom) * THREE.MathUtils.clamp(level, 0.12, 1);
      bars.setMatrixAt(i, at(chart.left + barStep * (i + 0.5), chart.bottom, 0, { sx: barStep * 0.56, sy: h }));
    }
    bars.instanceMatrix.needsUpdate = true;
  });

  // A giant phone on the forecourt, its app feed scrolling.
  const phone = new THREE.Group();
  phone.position.set(app.x + 1.42, 0.085, app.z + 0.28);
  phone.rotation.y = 0.5;
  const phoneW = 0.5;
  const phoneH = 1.02;
  const phoneMaterial = new THREE.MeshStandardMaterial({ color: '#16121f', roughness: 0.3, metalness: 0.6 });
  const base = new THREE.Mesh(block(0.66, 0.05, 0.24, 0.02), new THREE.MeshStandardMaterial({ color: C.stone, roughness: 0.8 }));
  const body = new THREE.Mesh(block(phoneW, phoneH, 0.06, 0.07), phoneMaterial);
  body.position.y = 0.05;
  body.castShadow = true;
  base.receiveShadow = true;
  const feedMap = phoneFeed();
  const feedMaterial = new THREE.MeshBasicMaterial({ map: feedMap, toneMapped: false });
  const feedH = phoneH - 0.13;
  const feedScreen = new THREE.Mesh(new THREE.PlaneGeometry(phoneW - 0.05, feedH), feedMaterial);
  feedScreen.position.set(0, 0.05 + 0.03 + feedH / 2, 0.031);
  const chromeMap = phoneChrome();
  const chromeMaterial = new THREE.MeshBasicMaterial({ map: chromeMap, toneMapped: false });
  const chromeH = (phoneW - 0.05) * (48 / 256);
  const chromeBar = new THREE.Mesh(new THREE.PlaneGeometry(phoneW - 0.05, chromeH), chromeMaterial);
  chromeBar.position.set(0, 0.05 + 0.03 + feedH + chromeH / 2, 0.031);
  const lens = new THREE.Mesh(block(0.16, 0.16, 0.02, 0.04), new THREE.MeshStandardMaterial({ color: '#2a2338', roughness: 0.25, metalness: 0.7 }));
  lens.position.set(-0.12, phoneH - 0.15, -0.035);
  phone.add(base, body, feedScreen, chromeBar, lens);
  extra.push(lens.geometry, lens.material);
  group.add(phone);
  extra.push(phoneMaterial, base.geometry, base.material, body.geometry, feedMap, feedMaterial, feedScreen.geometry);
  extra.push(chromeMap, chromeMaterial, chromeBar.geometry);
  glow(app.x + 1.42, 0.62, app.z + 0.36, 1.4, '#a47bff', 0.32);
  movers.push((t) => {
    // Scroll a card, pause, scroll the next.
    const step = Math.floor(t / 2.4);
    const into = Math.min(1, (t % 2.4) / 0.8);
    const eased = into < 0.5 ? 2 * into * into : 1 - (-2 * into + 2) ** 2 / 2;
    feedMap.offset.y = -((step + eased) * 0.09);
  });

  await pause();

  // ---------- Server hall (front right): racks behind glass, and the cloud ----------

  const dc = { x: 2.85, z: 2.3 };
  const hall = { w: 2.2, d: 1.4, h: 0.55 };
  const floorY = 0.085;
  batch.add('solid', block(hall.w, 0.05, hall.d, 0.02), at(dc.x, floorY, dc.z), C.dark);
  batch.add('solid', block(hall.w, hall.h, 0.07, 0.02), at(dc.x, floorY, dc.z - hall.d / 2 + 0.035), C.grey);
  batch.add('solid', block(0.07, hall.h, hall.d, 0.02), at(dc.x - hall.w / 2 + 0.035, floorY, dc.z), C.grey);
  windowGrid({ x: dc.x - 0.35, y: 0.3, z: dc.z - hall.d / 2 - 0.006, cols: 4, rows: 1, w: 0.2, h: 0.08, gapX: 0.34, gapY: 0, lit: 0.9 });
  windowGrid({ x: dc.x - hall.w / 2 - 0.006, y: 0.3, z: dc.z, ry: Math.PI / 2, cols: 3, rows: 1, w: 0.2, h: 0.08, gapX: 0.36, gapY: 0, lit: 0.9 });
  // The machine room at the right end, with fans on its roof.
  batch.add('solid', block(0.62, hall.h + 0.04, hall.d, 0.03), at(dc.x + hall.w / 2 - 0.31, floorY, dc.z), C.grey);
  for (const dz of [-0.35, 0.05]) fan(dc.x + hall.w / 2 - 0.31, floorY + hall.h + 0.04, dc.z + dz, 0.12);
  // Glass on the open sides and the roof.
  const glassW = hall.w - 0.62;
  const glassX = dc.x - hall.w / 2 + glassW / 2;
  batch.add('glass', block(glassW, hall.h, 0.02, 0.005), at(glassX, floorY, dc.z + hall.d / 2 - 0.01));
  batch.add('glass', block(glassW, 0.02, hall.d, 0.005), at(glassX, floorY + hall.h, dc.z));
  // Light strips under the glass roof.
  for (const dz of [-0.4, 0, 0.4]) {
    batch.add('glow', block(glassW - 0.2, 0.012, 0.03, 0.004), at(glassX, floorY + hall.h - 0.03, dc.z + dz), '#cfd9ff');
  }
  // Three rows of racks with blinking lights.
  const leds = [];
  for (const dz of [-0.38, 0.0, 0.38]) {
    for (let i = 0; i < 5; i += 1) {
      const rx = dc.x - hall.w / 2 + 0.24 + i * 0.29;
      batch.add('solid', block(0.22, 0.36, 0.17, 0.012), at(rx, floorY + 0.05, dc.z + dz), C.rack);
      for (let c = 0; c < 2; c += 1) {
        for (let r = 0; r < 5; r += 1) leds.push([rx - 0.05 + c * 0.1, floorY + 0.14 + r * 0.055, dc.z + dz + 0.087]);
      }
    }
  }
  const ledMaterial = new THREE.MeshBasicMaterial({ toneMapped: false });
  const ledMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.012, 0.004), ledMaterial, leds.length);
  const LED_COLORS = ['#2dd4bf', '#3ddc97', '#7ee0f0', '#8b5cff'].map(color);
  const ledState = leds.map((p, i) => {
    const tint = LED_COLORS[i % LED_COLORS.length];
    ledMesh.setMatrixAt(i, at(...p));
    ledMesh.setColorAt(i, tint);
    return { tint, rate: 1 + rand() * 5, phase: rand() * 10 };
  });
  const ledOff = color('#1c3a3a');
  group.add(ledMesh);
  extra.push(ledMaterial, ledMesh.geometry);
  glow(glassX, 0.4, dc.z + 0.1, 2.0, '#2dd4bf', 0.22);
  movers.push((t) => {
    ledState.forEach((led, i) => {
      ledMesh.setColorAt(i, Math.sin(t * led.rate + led.phase) > -0.3 ? led.tint : ledOff);
    });
    ledMesh.instanceColor.needsUpdate = true;
  });

  // The cloud above the hall, with data going up and coming back down.
  const cloud = new THREE.Group();
  cloud.position.set(dc.x - 0.25, 1.85, dc.z - 0.05);
  const puffs = [
    [0, 0, 0, 0.3],
    [0.3, -0.06, 0.04, 0.23],
    [-0.3, -0.07, 0, 0.21],
    [0.12, 0.13, -0.05, 0.22],
    [-0.13, 0.09, 0.09, 0.19],
    [0.5, -0.1, 0, 0.15],
    [-0.48, -0.11, 0.02, 0.14],
  ].map(([px, py, pz, r]) => new THREE.SphereGeometry(r, 20, 14).scale(1, 0.82, 1).translate(px, py, pz));
  const cloudBatch = new Batch();
  puffs.forEach((g) => cloudBatch.add('cloud', g, null, '#ffffff'));
  const cloudMaterial = new THREE.MeshStandardMaterial({
    color: '#efeaff',
    emissive: '#6b4fd8',
    emissiveIntensity: 0.35,
    roughness: 1,
  });
  cloud.add(cloudBatch.build({ cloud: cloudMaterial }, { receiveShadow: false }));
  group.add(cloud);
  extra.push(cloudMaterial);
  const beamMaterial = new THREE.MeshBasicMaterial({
    color: '#7ee0f0',
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const lanes = [-0.32, 0.12];
  const bottom = floorY + hall.h + 0.03;
  const top = 1.62;
  lanes.forEach((dx) => {
    const beam = new THREE.Mesh(cylinder(0.008, 0.008, top - bottom, 6), beamMaterial);
    beam.position.set(cloud.position.x + dx, bottom, dc.z - 0.05);
    group.add(beam);
    extra.push(beam.geometry);
  });
  extra.push(beamMaterial);
  const packetMaterial = new THREE.MeshBasicMaterial({ toneMapped: false });
  const packets = new THREE.InstancedMesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), packetMaterial, 8);
  for (let i = 0; i < 8; i += 1) packets.setColorAt(i, color(i % 2 ? '#7ee0f0' : '#c4a8ff'));
  group.add(packets);
  extra.push(packetMaterial, packets.geometry);
  movers.push((t) => {
    cloud.position.y = 1.85 + Math.sin(t * 0.8) * 0.04;
    for (let i = 0; i < 8; i += 1) {
      const up = i % 2 === 0;
      const f = (t * 0.3 + Math.floor(i / 2) * 0.25) % 1;
      const y = up ? bottom + (top - bottom) * f : top - (top - bottom) * f;
      packets.setMatrixAt(i, at(cloud.position.x + lanes[up ? 0 : 1], y, dc.z - 0.05, { ry: t * 2 + i }));
    }
    packets.instanceMatrix.needsUpdate = true;
  });

  await pause();

  // ---------- The monorail ----------

  const samples = 320;
  const trackPoints = Array.from({ length: samples }, (_, i) => trackPoint((i / samples) * Math.PI * 2));
  batch.add('solid', sweep(trackPoints, 0.12, 0.075), null, C.facade);
  const strip = sweep(
    trackPoints.map((p) => p.clone().setY(p.y - 0.012)),
    0.126,
    0.014,
  );
  batch.add('accent', strip, null);
  trackPoints.forEach((p, i) => {
    if (i % 11 !== 0) return;
    if (Math.abs(p.x) < 0.55 && p.y > TRACK.y) return; // keep clear of the lower track where they cross
    const h = p.y - 0.0375 - 0.035;
    batch.add('solid', cylinder(0.026, 0.034, h, 10), at(p.x, 0.035, p.z), C.grey);
    batch.add('solid', block(0.1, 0.03, 0.1, 0.01), at(p.x, 0.035, p.z), C.grey);
  });

  // Distance along the track → parameter, so the train runs at an even speed.
  const lut = [0];
  const probe = trackPoint(0);
  const previous = probe.clone();
  for (let i = 1; i <= 2000; i += 1) {
    trackPoint((i / 2000) * Math.PI * 2, probe);
    lut.push(lut[i - 1] + probe.distanceTo(previous));
    previous.copy(probe);
  }
  const trackLength = lut[lut.length - 1];
  const paramAt = (s) => {
    const d = ((s % trackLength) + trackLength) % trackLength;
    let lo = 0;
    let hi = lut.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (lut[mid] < d) lo = mid;
      else hi = mid;
    }
    const f = (d - lut[lo]) / (lut[hi] - lut[lo] || 1);
    return ((lo + f) / 2000) * Math.PI * 2;
  };

  const trainMaterial = new THREE.MeshStandardMaterial({ color: '#f6f3fc', roughness: 0.35, metalness: 0.1 });
  const trainWindowMaterial = new THREE.MeshBasicMaterial({ color: '#ffe6bf', toneMapped: false });
  const carGeometry = block(0.42, 0.13, 0.17, 0.05).translate(0, 0.0375, 0);
  const carWindows = new THREE.BoxGeometry(0.34, 0.035, 0.174).translate(0, 0.0375 + 0.08, 0);
  const carRoof = new THREE.BoxGeometry(0.3, 0.012, 0.06).translate(0, 0.0375 + 0.132, 0);
  const cars = Array.from({ length: 3 }, () => {
    const car = new THREE.Group();
    const shell = new THREE.Mesh(carGeometry, trainMaterial);
    shell.castShadow = true;
    car.add(shell, new THREE.Mesh(carWindows, trainWindowMaterial), new THREE.Mesh(carRoof, materials.accent));
    car.rotation.order = 'YXZ';
    group.add(car);
    return car;
  });
  const headlight = glowSprite('#fff4dc', 0.5, 0.9);
  cars[0].add(headlight);
  headlight.position.set(0.23, 0.09, 0);
  const taillight = glowSprite('#ff5a5a', 0.22, 0.8);
  cars[2].add(taillight);
  taillight.position.set(-0.23, 0.09, 0);
  extra.push(trainMaterial, trainWindowMaterial, carGeometry, carWindows, carRoof, headlight.material, taillight.material);
  const here = new THREE.Vector3();
  const ahead = new THREE.Vector3();
  movers.push((t) => {
    cars.forEach((car, i) => {
      const s = t * 1.15 - i * 0.46;
      trackPoint(paramAt(s), here);
      trackPoint(paramAt(s + 0.05), ahead);
      car.position.copy(here);
      const dx = ahead.x - here.x;
      const dz = ahead.z - here.z;
      car.rotation.y = Math.atan2(-dz, dx);
      car.rotation.z = Math.atan2(ahead.y - here.y, Math.hypot(dx, dz));
    });
  });

  await pause();

  // ---------- Traffic on the ring road ----------

  const carShape = [
    [block(0.3, 0.07, 0.15, 0.03), 0, 0.022],
    [block(0.16, 0.06, 0.13, 0.03), -0.02, 0.085],
  ];
  const lightGeometry = new THREE.BoxGeometry(0.01, 0.018, 0.035);
  const headMaterial = new THREE.MeshBasicMaterial({ color: '#fff3d6', toneMapped: false });
  const tailMaterial = new THREE.MeshBasicMaterial({ color: '#ff4d5e', toneMapped: false });
  extra.push(lightGeometry, headMaterial, tailMaterial, ...carShape.map(([g]) => g));
  [
    ['#f4f1fb', 0.52, 0.13, 1, 0],
    ['#ff6c6c', 0.52, 0.13, 1, 0.47],
    ['#8b5cff', 0.58, -0.13, -1, 0.2],
  ].forEach(([paint, speed, offset, direction, phase]) => {
    const car = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: paint, roughness: 0.35, metalness: 0.2 });
    extra.push(material);
    for (const [geometry, dx, dy] of carShape) {
      const part = new THREE.Mesh(geometry, material);
      part.position.set(dx, dy, 0);
      part.castShadow = true;
      car.add(part);
    }
    for (const side of [-1, 1]) {
      const front = new THREE.Mesh(lightGeometry, headMaterial);
      front.position.set(0.151, 0.06, side * 0.045);
      const back = new THREE.Mesh(lightGeometry, tailMaterial);
      back.position.set(-0.151, 0.06, side * 0.045);
      car.add(front, back);
    }
    const beam = glowSprite('#fff1cf', 0.32, 0.5);
    beam.position.set(0.2, 0.06, 0);
    car.add(beam);
    extra.push(beam.material);
    group.add(car);
    movers.push((t) => {
      const s = phase * lane.length + direction * speed * t;
      const [x0, z0] = lane.point(s);
      const [x1, z1] = lane.point(s + direction * 0.05);
      // Keep to the lane: offset sideways from the road's centre line.
      const len = Math.hypot(x1 - x0, z1 - z0) || 1;
      const nx = (z1 - z0) / len;
      const nz = -(x1 - x0) / len;
      car.position.set(x0 + nx * offset * direction, 0.02, z0 + nz * offset * direction);
      car.rotation.y = Math.atan2(-(z1 - z0), x1 - x0);
    });
  });

  await pause();

  // ---------- Windows, halos and the merged static parts ----------

  const windowMaterial = new THREE.MeshBasicMaterial({ toneMapped: false });
  const windowMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 0.012), windowMaterial, windows.length);
  const WINDOW_LIT = [color(C.warm), color(C.cool), color(C.blush)];
  const windowOff = color(C.off);
  const windowLit = windows.map(([x, y, z, ry, w, h, lit], i) => {
    windowMesh.setMatrixAt(i, at(x, y, z, { ry, sx: w, sy: h }));
    windowMesh.setColorAt(i, lit ? WINDOW_LIT[i % 3] : windowOff);
    return lit;
  });
  group.add(windowMesh);
  extra.push(windowMaterial, windowMesh.geometry);
  let nextFlip = 1;
  movers.push((t) => {
    if (t < nextFlip) return;
    nextFlip = t + 0.6 + rand() * 1.4;
    const i = Math.floor(rand() * windows.length);
    windowLit[i] = !windowLit[i];
    windowMesh.setColorAt(i, windowLit[i] ? WINDOW_LIT[i % 3] : windowOff);
    windowMesh.instanceColor.needsUpdate = true;
  });

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
  group.add(halos);
  extra.push(haloGeometry, haloMaterial);

  await pause();
  const statics = batch.build(materials);
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
      Object.values(materials).forEach((m) => m.dispose());
      extra.forEach((item) => item.dispose());
    },
  };
}
