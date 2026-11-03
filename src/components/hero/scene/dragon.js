import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { color, faceted, glowSprite } from './kit';

// A ryū: a long jade dragon that flies a loop over the garden and through
// the torii, with a glowing pearl ahead of it. It's built from a few
// instanced meshes (the body's segments, its dorsal fins, its legs) and one
// merged head, so it costs a handful of draw calls however it twists.
//
// `createDragon()` returns its group and `update(t, arrive)`: `t` is the
// scene's time, `arrive` (0–1) how far it has come into being, which is
// when the scroll story brings it in (it unfolds out of the torii).

const SEGMENTS = 66;
const SPACING = 0.125;
// How big it is against the plain proportions below.
const SIZE = 1.6;
const SPEED = 2.5; // world units a second
const WAVES = 0.26; // how far the body swings from the path

// The route. It roams the whole width of the screen: out past the left edge
// and back, out past the right edge and back, and each lap down through the
// torii (which stands at 0.35, -0.1 and faces (0.3, 0, 0.95)). Points are
// given across the view (`u`, as a share of half the screen's width, so it
// reaches the edges at any size), height (`y`) and depth (`w`, towards the
// camera), or in the garden's own coordinates for the pass through the gate.
// The sideways and depth directions are those of the camera's starting view.
const AZ = (30 * Math.PI) / 180;
const SIDE = [Math.cos(AZ), -Math.sin(AZ)]; // across the screen, on the ground (x, z)
const NEAR = [Math.sin(AZ), Math.cos(AZ)]; // towards the camera, on the ground (x, z)
const wide = (u, y, w) => ({ u, y, w });
const gate = (x, y, z) => ({ x, y, z });
const ROUTE = [
  wide(0.55, 2.0, 3.6), // front right, low and close
  gate(1.24, 2.0, 2.77), // in front of the gate, on its axis
  gate(0.705, 1.15, 1.05),
  gate(0.35, 1.0, -0.1), // through the gate, close to the water
  gate(-0.005, 1.2, -1.25),
  wide(-0.35, 3.0, -4.2), // behind, rising to the left
  wide(-1.08, 3.6, -3.6), // out past the left edge
  wide(-1.08, 3.0, 3.4), // and round, in front of the mountain
  wide(-0.5, 2.4, 3.8),
  wide(-0.05, 3.7, 4.0), // across the front
  wide(0.98, 3.4, 2.0), // out past the right edge
  wide(1.08, 3.4, -2.5), // and round behind the pagoda
];
// The route's points in the garden, for a view `reach` world units wide each
// way from its middle (at the garden), whose middle is `shift` to the side
// of the garden's.
function routePoints(reach, shift = 0) {
  return ROUTE.map((point) => {
    if ('x' in point) return new THREE.Vector3(point.x, point.y, point.z);
    const u = shift + point.u * reach;
    return new THREE.Vector3(SIDE[0] * u + NEAR[0] * point.w, point.y, SIDE[1] * u + NEAR[1] * point.w);
  });
}
// Where it unfolds from.
const PIVOT = new THREE.Vector3(0.35, 1.8, -0.1);

const JADE = '#2ad4b3';
const DEEP = '#0f6f66';
const GOLD = '#f0c25a';

const smooth = (v) => {
  const k = Math.min(Math.max(v, 0), 1);
  return k * k * (3 - 2 * k);
};

// Geometry with its colour baked in, ready to merge: no UVs, flat faces.
function bake(geometry, matrix, tint) {
  const g = faceted(geometry);
  g.deleteAttribute('uv');
  g.applyMatrix4(matrix);
  const c = color(tint);
  const count = g.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) c.toArray(colors, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

const placeAt = (x, y, z, scale = [1, 1, 1], rotation = new THREE.Quaternion()) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), rotation, new THREE.Vector3(...scale));
// Turns +Y (a cone's tip) towards a direction.
const pointing = (x, y, z) => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x, y, z).normalize());
const forward = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2); // +Y -> +Z

function headGeometry() {
  const parts = [];
  // Skull and snout (a flattened four-sided taper), brow ridges.
  parts.push(bake(new THREE.SphereGeometry(1, 8, 6), placeAt(0, 0, 0.02, [0.13, 0.115, 0.2]), JADE));
  parts.push(bake(new THREE.ConeGeometry(0.1, 0.36, 4), placeAt(0, -0.005, 0.32, [1, 1, 0.6], forward).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 4)), JADE));
  for (const side of [-1, 1]) {
    parts.push(bake(new THREE.SphereGeometry(1, 5, 4), placeAt(side * 0.075, 0.075, 0.12, [0.04, 0.025, 0.07]), DEEP));
    // Horns sweeping back and up, and a tuft of mane behind each.
    parts.push(bake(new THREE.ConeGeometry(0.036, 0.36, 5), placeAt(side * 0.075, 0.1, -0.03, [1, 1, 1], pointing(side * 0.18, 0.5, -0.85)), GOLD));
    parts.push(bake(new THREE.ConeGeometry(0.025, 0.2, 4), placeAt(side * 0.11, 0.0, 0.0, [1, 1, 1], pointing(side * 0.9, 0.2, -0.4)), GOLD));
  }
  // A mane down the neck.
  for (let k = 0; k < 5; k += 1) {
    parts.push(bake(new THREE.ConeGeometry(0.05 - k * 0.004, 0.17 - k * 0.012, 4), placeAt(0, 0.115, -0.1 - k * 0.1, [1, 1, 1], pointing(0, 0.8, -0.6)), GOLD));
  }
  // Nostrils.
  for (const side of [-1, 1]) parts.push(bake(new THREE.SphereGeometry(1, 4, 3), placeAt(side * 0.032, 0.02, 0.48, [0.015, 0.015, 0.015]), DEEP));
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return merged;
}

function legGeometry() {
  const parts = [];
  // A short thigh, a shin that turns forward, and three claws.
  parts.push(bake(new THREE.CylinderGeometry(0.03, 0.04, 0.16, 5), placeAt(0, -0.07, -0.02, [1, 1, 1], new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.5)), JADE));
  parts.push(bake(new THREE.CylinderGeometry(0.014, 0.03, 0.17, 5), placeAt(0, -0.19, 0.0, [1, 1, 1], new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.35)), DEEP));
  for (const dx of [-0.035, 0, 0.035]) {
    parts.push(bake(new THREE.ConeGeometry(0.012, 0.075, 4), placeAt(dx, -0.285, 0.05, [1, 1, 1], pointing(dx * 2, -0.4, 0.9)), GOLD));
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return merged;
}

export function createDragon() {
  // ---- The route, as a table of evenly spaced points -----------------------
  const M = 900;
  let table = [];
  let tangents = [];
  let length = 1;
  const lay = (reach, shift) => {
    const curve = new THREE.CatmullRomCurve3(routePoints(reach, shift), true, 'centripetal');
    table = curve.getSpacedPoints(M).slice(0, M);
    tangents = table.map((_, i) => table[(i + 1) % M].clone().sub(table[(i - 1 + M) % M]).normalize());
    length = curve.getLength();
  };
  lay(8, 0);

  const P = new THREE.Vector3();
  const T = new THREE.Vector3();
  // The route at arc length `s`: where it is and which way it's heading.
  const sample = (s, outP, outT) => {
    const u = ((((s % length) + length) % length) / length) * M;
    const i = Math.floor(u);
    const k = u - i;
    const j = (i + 1) % M;
    outP.lerpVectors(table[i], table[j], k);
    outT.lerpVectors(tangents[i], tangents[j], k).normalize();
  };

  // ---- Materials -------------------------------------------------------------
  const jade = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.45, metalness: 0.15, emissive: '#0b6b5c', emissiveIntensity: 0.55, flatShading: true });
  const gold = new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.35, metalness: 0.35, emissive: '#7a560a', emissiveIntensity: 0.55, flatShading: true });
  const baked = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.15, emissive: '#0b5a4e', emissiveIntensity: 0.5, flatShading: true });
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: '#ff4a1f', toneMapped: false });
  const pearlMaterial = new THREE.MeshBasicMaterial({ color: '#fff3c2', toneMapped: false });

  // ---- Geometry ------------------------------------------------------------
  const segmentGeometry = new THREE.CylinderGeometry(1, 1, 1, 6, 1).rotateX(Math.PI / 2);
  const finGeometry = new THREE.ConeGeometry(1, 1, 4).translate(0, 0.5, 0);
  const body = new THREE.InstancedMesh(segmentGeometry, jade, SEGMENTS);
  const finCount = Math.floor(SEGMENTS / 2) - 1;
  const fins = new THREE.InstancedMesh(finGeometry, gold, finCount);
  const legs = new THREE.InstancedMesh(legGeometry(), baked, 4);
  for (const mesh of [body, fins, legs]) mesh.frustumCulled = false;
  // Jade at the head, darker down the tail, with a faint alternation that
  // reads as scales.
  const tint = new THREE.Color();
  for (let i = 0; i < SEGMENTS; i += 1) {
    const f = i / (SEGMENTS - 1);
    tint.set(JADE).lerp(new THREE.Color(DEEP), Math.pow(f, 0.8));
    tint.multiplyScalar(i % 2 ? 1 : 0.86);
    body.setColorAt(i, tint);
  }

  const head = new THREE.Group();
  const skull = new THREE.Mesh(headGeometry(), baked);
  // The lower jaw hinges under the skull and opens and closes.
  const jawGeometry = bake(new THREE.ConeGeometry(0.075, 0.3, 4), placeAt(0, 0, 0.17, [1, 1, 0.45], forward).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 4)), JADE);
  const jaw = new THREE.Mesh(jawGeometry, baked);
  jaw.position.set(0, -0.075, 0.03);
  const eyes = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 5), eyeMaterial);
  const eyeLeft = eyes;
  const eyeRight = eyes.clone();
  eyeLeft.position.set(-0.082, 0.055, 0.12);
  eyeRight.position.set(0.082, 0.055, 0.12);
  // Whiskers trailing back from the snout.
  const whiskerGeometry = new THREE.ConeGeometry(0.014, 1.0, 4).translate(0, 0.5, 0).rotateX(-Math.PI / 2);
  const whiskers = [-1, 1].map((side) => {
    const whisker = new THREE.Mesh(whiskerGeometry, gold);
    whisker.position.set(side * 0.06, -0.01, 0.34);
    return whisker;
  });
  head.add(skull, jaw, eyeLeft, eyeRight, ...whiskers);

  // The pearl it chases.
  const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), pearlMaterial);
  const pearlGlow = glowSprite('#ffe6a0', 1.1, 0.85);
  pearl.add(pearlGlow);
  pearl.scale.setScalar(SIZE);
  // A faint jade glow about the head.
  const aura = glowSprite('#5ff0cf', 1.5, 0.28);
  head.add(aura);

  const rig = new THREE.Group();
  rig.add(body, fins, legs, head, pearl);
  const group = new THREE.Group();
  group.add(rig);

  // ---- Per frame ------------------------------------------------------------
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const basis = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const matrix = new THREE.Matrix4();
  const one = new THREE.Vector3();
  const position = new THREE.Vector3();
  const frames = Array.from({ length: SEGMENTS }, () => ({ p: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3(), t: new THREE.Vector3(), r: 0 }));
  const LEGS = [
    [10, -1],
    [10, 1],
    [38, -1],
    [38, 1],
  ];

  let reachNow = 8;
  let shiftNow = 0;
  let lead = 0;
  function update(t, arrive) {
    const s = smooth(arrive);
    if (s <= 0.001) {
      rig.visible = false;
      return;
    }
    rig.visible = true;
    rig.scale.setScalar(s);
    rig.position.copy(PIVOT).multiplyScalar(1 - s);

    lead = (t * SPEED) % length;
    for (let i = 0; i < SEGMENTS; i += 1) {
      const f = i / (SEGMENTS - 1);
      sample(lead - i * SPACING, P, T);
      right.crossVectors(UP, T).normalize();
      up.crossVectors(T, right).normalize();
      // The body swings from side to side and rises and falls as it flies:
      // little at the head, more down the tail.
      const swing = Math.sin(i * 0.36 - t * 3.4) * WAVES * (0.25 + f);
      const heave = Math.sin(i * 0.29 - t * 2.6 + 1.3) * WAVES * 0.6 * (0.2 + f);
      const frame = frames[i];
      frame.p.copy(P).addScaledVector(right, swing).addScaledVector(up, heave);
      frame.right.copy(right);
      frame.up.copy(up);
      frame.t.copy(T);
      // Thickest behind the head, thinning to the tail, with a slim neck.
      frame.r = (0.03 + 0.105 * Math.pow(1 - f, 0.75)) * (i < 4 ? 0.82 + i * 0.045 : 1) * SIZE;

      basis.makeBasis(right, up, T);
      quaternion.setFromRotationMatrix(basis);
      matrix.compose(frame.p, quaternion, one.set(frame.r, frame.r, SPACING * 1.45));
      body.setMatrixAt(i, matrix);
      if (i >= 2 && i % 2 === 0 && i / 2 - 1 < finCount) {
        // Fins stand up from the back, tall behind the head and low at the tail.
        const height = 0.17 * SIZE * (1 - f * 0.65);
        position.copy(frame.p).addScaledVector(up, frame.r * 0.8);
        matrix.compose(position, quaternion, one.set(0.035 * SIZE, height, SPACING * 1.3));
        fins.setMatrixAt(i / 2 - 1, matrix);
      }
    }
    body.instanceMatrix.needsUpdate = true;
    fins.instanceMatrix.needsUpdate = true;
    if (body.instanceColor) body.instanceColor.needsUpdate = true;

    // The legs, tucked in under the body at two places.
    LEGS.forEach(([i, side], n) => {
      const frame = frames[i];
      basis.makeBasis(frame.right, frame.up, frame.t);
      quaternion.setFromRotationMatrix(basis);
      position.copy(frame.p).addScaledVector(frame.right, side * frame.r * 0.9).addScaledVector(frame.up, -frame.r * 0.35);
      // They paddle a little as it flies.
      const paddle = Math.sin(t * 4 + n * 1.7) * 0.25;
      const swingQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), paddle);
      matrix.compose(position, quaternion.multiply(swingQuaternion), one.set(SIZE, SIZE, SIZE));
      legs.setMatrixAt(n, matrix);
    });
    legs.instanceMatrix.needsUpdate = true;

    // The head sits at the front of the body, looking along the route.
    const lead0 = frames[0];
    basis.makeBasis(lead0.right, lead0.up, lead0.t);
    head.quaternion.setFromRotationMatrix(basis);
    head.scale.setScalar(SIZE);
    head.position.copy(lead0.p).addScaledVector(lead0.t, SPACING * 0.4);
    jaw.rotation.x = 0.1 + (Math.sin(t * 1.7) * 0.5 + 0.5) * 0.18;
    whiskers.forEach((whisker, k) => {
      const side = k ? 1 : -1;
      whisker.rotation.y = side * (0.55 + Math.sin(t * 2.1 + k) * 0.22);
      whisker.rotation.x = -0.12 + Math.sin(t * 1.6 + k * 2) * 0.16;
    });

    // The pearl floats ahead and a little above, bobbing.
    pearl.position
      .copy(head.position)
      .addScaledVector(lead0.t, 0.72 * SIZE)
      .addScaledVector(lead0.up, (0.22 + Math.sin(t * 2.4) * 0.05) * SIZE);
    pearlGlow.material.opacity = 0.7 + Math.sin(t * 3.1) * 0.12;
  }

  update(0, 0);
  return {
    group,
    update,
    // The width of the view at the garden, in world units each way from its
    // middle: the route is stretched to reach the screen's edges.
    setReach(reach, shift = 0) {
      // (Kept to what fits the garden at the least, so it always leaves the plate.)
      const next = Math.max(reach * 1.06, 6.6);
      if (Math.abs(next - reachNow) < 0.01 && Math.abs(shift - shiftNow) < 0.01) return;
      reachNow = next;
      shiftNow = shift;
      // Staying at the same place along the route as it's laid again.
      const share = (lead / length) % 1;
      lay(next, shift);
      lead = share * length;
    },
    // Everything with a `dispose`, for teardown.
    disposables: [body, fins, legs, segmentGeometry, finGeometry, legs.geometry, skull.geometry, jaw.geometry, eyes.geometry, whiskerGeometry, pearl.geometry, pearlGlow.material, aura.material, jade, gold, baked, eyeMaterial, pearlMaterial],
  };
}
