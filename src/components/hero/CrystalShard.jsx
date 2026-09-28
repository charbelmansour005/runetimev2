import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLYPHS } from '../../data/glyphs';

// Silhouette of the crystal in world units — a floating, angular shard.
const OUTLINE = [
  [-0.5, -1.3],
  [0.12, -1.55],
  [0.8, -0.72],
  [0.86, 0.78],
  [0.3, 1.55],
  [-0.62, 1.2],
  [-0.86, -0.18],
];
const MIN_X = -0.86;
const MAX_X = 0.86;
const MIN_Y = -1.55;
const MAX_Y = 1.55;
const SPAN_X = MAX_X - MIN_X;
const SPAN_Y = MAX_Y - MIN_Y;

const TEX_W = 512;
const TEX_H = Math.round((TEX_W * SPAN_Y) / SPAN_X);
const PX_PER_UNIT = TEX_W / SPAN_X;
const toPx = (x, y) => [((x - MIN_X) / SPAN_X) * TEX_W, ((MAX_Y - y) / SPAN_Y) * TEX_H];

const BASE_ROT_Y = -0.38;
const BASE_Y = -0.12;

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Paints the glowing glyph + circuit traces used as the crystal's emissive map.
function paintGlyph(ctx, { glyph, glow }, seed) {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  ctx.beginPath();
  OUTLINE.forEach(([x, y], i) => {
    const [u, v] = toPx(x * 0.88, y * 0.9);
    if (i) ctx.lineTo(u, v);
    else ctx.moveTo(u, v);
  });
  ctx.closePath();
  ctx.clip();

  // Fit the glyph (uniformly scaled) into a box on the crystal's face.
  const def = GLYPHS[glyph] ?? GLYPHS.spark;
  const box = { cx: 0.02, cy: 0.06, w: 1.15, h: 1.45 };
  const scale = Math.min(box.w / def.w, box.h / def.h);
  const left = box.cx - (def.w * scale) / 2;
  const top = box.cy + (def.h * scale) / 2;
  const strokes = def.paths.map(({ d, closed }) => ({
    closed: Boolean(closed),
    pts: d.map(([gx, gy]) => toPx(left + gx * scale, top - gy * scale)),
  }));

  // Circuit traces branching off the glyph.
  const rand = seeded(seed);
  ctx.strokeStyle = glow;
  ctx.fillStyle = glow;
  ctx.shadowColor = glow;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 20; i += 1) {
    const line = strokes[Math.floor(rand() * strokes.length)].pts;
    const seg = Math.floor(rand() * (line.length - 1));
    const t = 0.1 + rand() * 0.8;
    const [ax, ay] = line[seg];
    const [bx, by] = line[seg + 1];
    let x = ax + (bx - ax) * t;
    let y = ay + (by - ay) * t;
    const dir = rand() < 0.5 ? -1 : 1;
    const vdir = rand() < 0.5 ? -1 : 1;
    const run = (0.1 + rand() * 0.3) * PX_PER_UNIT;
    const bend = (0.05 + rand() * 0.16) * PX_PER_UNIT;

    ctx.globalAlpha = 0.45 + rand() * 0.35;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 0.013 * PX_PER_UNIT;
    ctx.beginPath();
    ctx.moveTo(x, y);
    x += dir * run;
    ctx.lineTo(x, y);
    x += dir * bend;
    y += vdir * bend;
    ctx.lineTo(x, y);
    if (rand() < 0.55) {
      x += dir * run * 0.6;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 0.022 * PX_PER_UNIT, 0, Math.PI * 2);
    ctx.fill();
  }

  // The glyph itself: a wide glow pass, then a hot core.
  const strokeGlyph = () =>
    strokes.forEach(({ pts, closed }) => {
      ctx.beginPath();
      pts.forEach(([u, v], i) => (i ? ctx.lineTo(u, v) : ctx.moveTo(u, v)));
      if (closed) ctx.closePath();
      ctx.stroke();
    });
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 10;
  ctx.globalAlpha = 1;
  ctx.strokeStyle = glow;
  ctx.shadowColor = glow;
  ctx.lineWidth = 0.1 * PX_PER_UNIT;
  ctx.shadowBlur = 34;
  strokeGlyph();
  strokeGlyph();
  ctx.strokeStyle = '#ffffff';
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 0.034 * PX_PER_UNIT;
  ctx.shadowBlur = 10;
  strokeGlyph();
  ctx.restore();
}

function radialTexture(inner = 1) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, `rgba(255,255,255,${inner})`);
  grd.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function CrystalShard({ apiRef, activeRef, slides }) {
  const mountRef = useRef(null);
  const slidesRef = useRef(slides);
  slidesRef.current = slides;

  useEffect(() => {
    const mount = mountRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const envTex = pmrem.fromScene(room, 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
    camera.position.set(0, 0, 8.4);

    // --- Stone -------------------------------------------------------------
    const shape = new THREE.Shape();
    OUTLINE.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.44,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.05,
      bevelSegments: 6,
      curveSegments: 1,
    });
    geometry.translate(0, 0, -0.22);

    const glyphCanvas = document.createElement('canvas');
    glyphCanvas.width = TEX_W;
    glyphCanvas.height = TEX_H;
    const glyphCtx = glyphCanvas.getContext('2d');
    const glyphTex = new THREE.CanvasTexture(glyphCanvas);
    glyphTex.colorSpace = THREE.SRGBColorSpace;
    glyphTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    // Cap UVs are raw shape coordinates, so map the shape's bounds onto 0..1.
    glyphTex.repeat.set(1 / SPAN_X, 1 / SPAN_Y);
    glyphTex.offset.set(-MIN_X / SPAN_X, -MIN_Y / SPAN_Y);

    const obsidian = {
      color: new THREE.Color('#0c0912'),
      metalness: 0.25,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      iridescence: 0.3,
      iridescenceIOR: 1.35,
      envMapIntensity: 1.15,
    };
    const capMaterial = new THREE.MeshPhysicalMaterial({
      ...obsidian,
      emissive: new THREE.Color('#ffffff'),
      emissiveMap: glyphTex,
      emissiveIntensity: 1.7,
    });
    const sideMaterial = new THREE.MeshPhysicalMaterial({ ...obsidian, roughness: 0.26 });
    const stone = new THREE.Mesh(geometry, [capMaterial, sideMaterial]);

    const group = new THREE.Group();
    group.add(stone);
    scene.add(group);

    // Soft aura behind the stone.
    const auraTex = radialTexture(0.9);
    const aura = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 5.6),
      new THREE.MeshBasicMaterial({
        map: auraTex,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    aura.position.set(0, 0.1, -1.1);
    scene.add(aura);

    // Rising sparks.
    const SPARKS = 90;
    const sparkPos = new Float32Array(SPARKS * 3);
    const sparkSpeed = new Float32Array(SPARKS);
    for (let i = 0; i < SPARKS; i += 1) {
      sparkPos[i * 3] = (Math.random() - 0.5) * 3.6;
      sparkPos[i * 3 + 1] = (Math.random() - 0.5) * 4.2;
      sparkPos[i * 3 + 2] = (Math.random() - 0.5) * 1.8;
      sparkSpeed[i] = 0.08 + Math.random() * 0.22;
    }
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparkTex = radialTexture(1);
    const sparks = new THREE.Points(
      sparkGeo,
      new THREE.PointsMaterial({
        size: 0.06,
        map: sparkTex,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    scene.add(sparks);

    // --- Lights --------------------------------------------------------------
    const rimLeft = new THREE.DirectionalLight('#ffffff', 5);
    rimLeft.position.set(-4, 3, -3);
    const rimRight = new THREE.DirectionalLight('#ffffff', 2.2);
    rimRight.position.set(4.5, -1.5, -2);
    const key = new THREE.DirectionalLight('#ffffff', 0.7);
    key.position.set(3, 5, 6);
    scene.add(rimLeft, rimRight, key);

    const setSlide = (index) => {
      const slide = slidesRef.current[index] ?? slidesRef.current[0];
      paintGlyph(glyphCtx, slide, 17 + index * 101);
      glyphTex.needsUpdate = true;
      const glow = new THREE.Color(slide.glow);
      rimLeft.color.copy(glow);
      rimRight.color.copy(glow);
      aura.material.color.copy(glow);
      sparks.material.color.copy(glow);
    };
    setSlide(activeRef?.current ?? 0);

    // --- Sizing --------------------------------------------------------------
    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // Keep the stone inside ~62% of the width on tall, narrow canvases.
      const fitWidth = 1.9 / 0.62 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
      camera.position.z = Math.max(8.4, fitWidth);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    // --- Loop ----------------------------------------------------------------
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let raf = 0;
    let running = false;
    let last = 0;
    let elapsed = 0;

    const frame = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;
      const t = reduced ? 0 : elapsed;
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;

      group.rotation.y = BASE_ROT_Y + Math.sin(t * 0.45) * 0.2 + pointer.x * 0.35;
      group.rotation.x = Math.sin(t * 0.3) * 0.05 - pointer.y * 0.16;
      group.rotation.z = -0.14 + Math.sin(t * 0.37) * 0.03;
      group.position.y = BASE_Y + Math.sin(t * 0.9) * 0.06;
      aura.position.y = group.position.y + 0.1;

      if (!reduced) {
        const pos = sparkGeo.attributes.position;
        for (let i = 0; i < SPARKS; i += 1) {
          let y = pos.getY(i) + sparkSpeed[i] * dt;
          if (y > 2.2) y = -2.2;
          pos.setY(i, y);
        }
        pos.needsUpdate = true;
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    io.observe(mount);

    apiRef.current = {
      setSlide,
      setPointer: (x, y) => {
        pointer.tx = x;
        pointer.ty = y;
      },
    };

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      apiRef.current = null;
      geometry.dispose();
      capMaterial.dispose();
      sideMaterial.dispose();
      glyphTex.dispose();
      aura.geometry.dispose();
      aura.material.dispose();
      auraTex.dispose();
      sparkGeo.dispose();
      sparks.material.dispose();
      sparkTex.dispose();
      envTex.dispose();
      pmrem.dispose();
      room.dispose?.();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [apiRef, activeRef]);

  return <div ref={mountRef} className="crystal-shard" />;
}
