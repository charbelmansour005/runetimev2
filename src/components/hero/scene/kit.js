import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Building blocks for the hero's miniature garden. Everything is generated in
// code (no model to download), and parts that never move are merged into one
// mesh per material, so the whole garden draws in a handful of calls.

const matrix = new THREE.Matrix4();
const quaternion = new THREE.Quaternion();
const euler = new THREE.Euler();

// A transform: position, then rotation (radians) and scale.
export function at(x = 0, y = 0, z = 0, { rx = 0, ry = 0, rz = 0, s = 1, sx = s, sy = s, sz = s } = {}) {
  quaternion.setFromEuler(euler.set(rx, ry, rz));
  return matrix.clone().compose(new THREE.Vector3(x, y, z), quaternion, new THREE.Vector3(sx, sy, sz));
}

// A box with soft edges, sitting on y = 0 (so `at(x, y, z)` places its base).
export function block(w, h, d, radius = 0.04) {
  const r = Math.min(radius, w / 2, h / 2, d / 2);
  return new RoundedBoxGeometry(w, h, d, 2, r).translate(0, h / 2, 0);
}

export const cylinder = (rTop, rBottom, h, segments = 24) =>
  new THREE.CylinderGeometry(rTop, rBottom, h, segments).translate(0, h / 2, 0);

// Faceted shapes (tree tops) read better without smoothed normals.
export function faceted(geometry) {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  flat.computeVertexNormals();
  return flat;
}

// Colour strings in, linear values out (three.js lights in linear space).
export const color = (value) => new THREE.Color(value);

// Collects static parts per material, then writes them all into one mesh per
// material, with each part's transform and colour baked into its vertices.
// (Written straight into one buffer: cloning and merging geometries made
// building the garden several times slower.)
export class Batch {
  constructor() {
    this.parts = new Map();
  }

  add(key, geometry, transform, tint, { shadow = true } = {}) {
    const bucket = `${key}${shadow ? '' : ':noshadow'}`;
    if (!this.parts.has(bucket)) this.parts.set(bucket, []);
    const c = tint instanceof THREE.Color ? tint : color(tint ?? '#ffffff');
    this.parts.get(bucket).push({ geometry, transform, color: c });
    return this;
  }

  // `pause` is awaited after each part, so a big merge is built in slices.
  static async merge(parts, pause = async () => {}) {
    const count = parts.reduce((sum, { geometry: g }) => sum + (g.index ?? g.getAttribute('position')).count, 0);
    const positions = new Float32Array(count * 3);
    const normals = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const normalMatrix = new THREE.Matrix3();
    const identity = new THREE.Matrix4();
    let o = 0;
    for (const { geometry, transform, color: c } of parts) {
      const m = (transform ?? identity).elements;
      const n = normalMatrix.getNormalMatrix(transform ?? identity).elements;
      const p = geometry.getAttribute('position').array;
      const q = geometry.getAttribute('normal').array;
      const index = geometry.index?.array;
      const total = index ? index.length : p.length / 3;
      for (let k = 0; k < total; k += 1) {
        const v = (index ? index[k] : k) * 3;
        const x = p[v];
        const y = p[v + 1];
        const z = p[v + 2];
        positions[o] = m[0] * x + m[4] * y + m[8] * z + m[12];
        positions[o + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
        positions[o + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
        const nx = n[0] * q[v] + n[3] * q[v + 1] + n[6] * q[v + 2];
        const ny = n[1] * q[v] + n[4] * q[v + 1] + n[7] * q[v + 2];
        const nz = n[2] * q[v] + n[5] * q[v + 1] + n[8] * q[v + 2];
        const len = Math.hypot(nx, ny, nz) || 1;
        normals[o] = nx / len;
        normals[o + 1] = ny / len;
        normals[o + 2] = nz / len;
        colors[o] = c.r;
        colors[o + 1] = c.g;
        colors[o + 2] = c.b;
        o += 3;
      }
      await pause();
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    merged.computeBoundingSphere();
    return merged;
  }

  // One mesh per material; `materials` maps a key to its material.
  async build(materials, { castShadow = true, receiveShadow = true, pause = async () => {} } = {}) {
    const group = new THREE.Group();
    for (const [bucket, parts] of this.parts) {
      const [key, flag] = bucket.split(':');
      const merged = await Batch.merge(parts, pause);
      const mesh = new THREE.Mesh(merged, materials[key]);
      mesh.castShadow = castShadow && flag !== 'noshadow' && materials[key].userData.shadow !== false;
      mesh.receiveShadow = receiveShadow && materials[key].userData.shadow !== false;
      mesh.matrixAutoUpdate = false;
      group.add(mesh);
      await pause();
    }
    this.parts.clear();
    return group;
  }
}

// A soft round light for halos and glows, drawn once.
let haloTexture;
export function halo() {
  if (haloTexture) return haloTexture;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.1)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  haloTexture = new THREE.CanvasTexture(canvas);
  haloTexture.colorSpace = THREE.SRGBColorSpace;
  return haloTexture;
}

export function glowSprite(tint, size, opacity = 1) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: halo(),
      color: tint,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
  sprite.scale.setScalar(size);
  return sprite;
}

// Hands the main thread back to the browser (to paint, or answer input) and
// carries on in a new task. A MessageChannel rather than setTimeout: nested
// timeouts are held back by 4 ms each after a few in a row.
export function yieldNow() {
  if (globalThis.scheduler?.yield) return globalThis.scheduler.yield();
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(0);
  });
}

// A `pause` for building in slices: it yields only once the current slice has
// used up its budget (ms), so a build never holds the page for long, and a
// fast machine isn't slowed by needless yields.
export function makePause(budget = 6) {
  let start = performance.now();
  return async () => {
    if (performance.now() - start < budget) return;
    await yieldNow();
    start = performance.now();
  };
}
